import { TCompilerPluginFactory } from '../../TCompilerPluginFactory'
import * as esbuild from 'esbuild-wasm'
import esbuildWasmUrl from './esbuild.wasm?url'
import { dirname, extname, join, resolve, normalize, matchesGlob } from 'pathe'
import json5 from 'json5'
import isGlob from 'is-glob'
import { expandEntryPoints, findScriptFiles } from './entryPoints'
import { createNodeModuleResolver } from './nodeModuleResolver'

let esbuildInitialized = false
async function initialize() {
    if (esbuildInitialized) return

    esbuildInitialized = true

    if (typeof globalThis.location === 'undefined') {
        ;(globalThis as any).location = { href: undefined }
    }

    await esbuild.initialize({
        wasmURL: esbuildWasmUrl,
        worker: false,
    })
}

function ignore(projectConfig: any, filePath: string) {
    const scriptsPath = projectConfig.resolvePackPath('behaviorPack', 'scripts')
    if (!filePath.startsWith(scriptsPath)) return true
    return !filePath.endsWith('.ts') && !filePath.endsWith('.js')
}

export const EsbuildTypeScriptPlugin: TCompilerPluginFactory<{
    bundle?: boolean
    entryFile?: string
    entryPoints?: string[]
    outFile?: string
    outDir?: string
    splitting?: boolean
    externals?: string[]
    sourcemap?: boolean | 'linked' | 'external' | 'inline' | 'both'
    sourceRoot?: string
    useBPAsSourceRoot?: boolean,
    dropLabels?: string[]
    define?: { [key: string]: string }
}> = ({ options, fileSystem, projectConfig, projectRoot, getOutputPath }) => {
    const nodeModuleResolver = createNodeModuleResolver({
        fileSystem,
        projectRoot,
    })

    function normalizeSpecifier(path: string) {
        return path.replace(/^\.\//, '').replace(/^\//, '')
    }

    // Handler to resolve all import patterns for a path ie "bridge-core/*" to include "bridge-core/some/deep/file" and "bridge-core/index.ts"
    function matchesExternalPattern(path: string, pattern: string) {
        if (pattern.endsWith('/*')) {
            const folderPrefix = pattern.substring(0, pattern.length - 1)
            return path.startsWith(folderPrefix)
        }
        if (!isGlob(pattern)) return pattern === path
        return matchesGlob(path, pattern)
    }

    // Helper to check if the import path is an external module.
    function isExternal(path: string) {
        const normalizedPath = normalize(path)

        return externals.some(pattern => {
            const normalizedPattern = normalizeSpecifier(pattern)
            return matchesExternalPattern(normalizedPath, normalizedPattern)
        })
    }

    // MC Modules which should not be bundled + user-defined externals
    const externals = [
        '@minecraft/server',
        '@minecraft/server-ui',
        '@minecraft/server-graphics',
        '@minecraft/server-editor',
        '@minecraft/server-net',
        '@minecraft/server-admin',
        '@minecraft/debug-utilities',
        '@minecraft/diagnostics',
        '@minecraft/server-gametest',
        '@minecraft/common',
        '@minecraft/vanilla-data',
        ...(options.externals ?? [])
    ]

    const useBundle = options.bundle ?? true
    const entryFile = options.entryFile ?? 'main.ts'

    const scriptsPath = projectConfig.resolvePackPath('behaviorPack', 'scripts')

    let buildResult: Record<string, string> = {}
    let virtualOutputResult: Record<string, string> = {}
    let virtualOutputFiles = new Set<string>()
    let sourceMapResult: Record<string, string> = {}
    let sourceMapVirtualFiles = new Set<string>()

    // Because files get put into the virtual file system their paths get prefixed with virtual:. We forcefully strip this out to return to actual paths
    function cleanupSourceMapSources(sourceMapText: string) {
        return sourceMapText.replace(/"virtual:/g, '"')
    }

    return {
        async buildStart() {
            buildResult = {}
            virtualOutputResult = {}
            virtualOutputFiles = new Set()
            sourceMapResult = {}
            sourceMapVirtualFiles = new Set()

            await initialize()

            let entryPoints = options.entryPoints ?? [entryFile]

            if (useBundle) {
                // Support glob pattern for defining entry points in our custom loader
                entryPoints = await expandEntryPoints(entryPoints, scriptsPath, fileSystem)
            }

            // If not bundling, we need to include all script files as entry points so they get transformed and can be imported virtually
            if (!useBundle) {
                const scriptFiles = await findScriptFiles(scriptsPath, fileSystem)
                entryPoints = scriptFiles.map(filePath => filePath.substring(scriptsPath.length + 1))
            }

            let outFile = entryFile
            let outDir = options.outDir ? options.outDir : undefined
            if (outFile.endsWith('.ts')) outFile = outFile.substring(0, outFile.length - 3) + '.js'

            let useOutDir = false
            if (options.outDir) {
                useOutDir = true
            }

            // If splitting is enabled, we have to use outDir because esbuild doesn't support splitting with a single outfile
            const useSplitting = useBundle && (options.splitting ?? entryPoints.length > 1)
            if (useSplitting) {
                useOutDir = true
                outDir = outDir ?? '/'
            }

            let tsconfig = undefined
            try {
                const file = await fileSystem.readFile(join(projectRoot, 'tsconfig.json'))
                const text = await file.text()
                tsconfig = json5.parse(text)
            } catch {
                console.warn('[EsbuildTypescript] Could not locate tsconfig!')
            }

            const result = await esbuild.build({
                packages: 'bundle',
                bundle: useBundle,
                external: useBundle ? externals : undefined,
                entryPoints: entryPoints,
                outfile: useOutDir ? undefined : outFile,
                outdir: useOutDir ? outDir : undefined,
                splitting: useSplitting,
                write: false,
                target: 'es2023',
                sourcemap: options.sourcemap ?? false,
                sourceRoot: options.useBPAsSourceRoot ? resolve(scriptsPath) : options.sourceRoot ?? undefined,
                dropLabels: options.dropLabels ? options.dropLabels : undefined,
                define: options.define ? options.define : undefined,
                logOverride: {
                    'missing-source-map': 'silent', //TODO: Handle node_modules source maps files correctly
                },
                plugins: [
                    {
                        name: 'virtual-files',
                        setup(build) {
                            build.onResolve({ filter: /.*/ }, async args => {
                                if (args.namespace && args.namespace !== 'virtual' && args.namespace !== 'node-modules') return undefined
                                if (isExternal(args.path)) return { path: args.path, external: true }

                                //Resolve node modules
                                if (args.namespace === 'node-modules' && (args.path.startsWith('./') || args.path.startsWith('../'))) {
                                    const resolvedInModule = await nodeModuleResolver.resolveRelative(args.importer, args.path)
                                    if (resolvedInModule) {
                                        return {
                                            path: resolvedInModule,
                                            namespace: 'node-modules',
                                        }
                                    }
                                }

                                if (!args.path.startsWith('./') && !args.path.startsWith('../') && !args.path.startsWith('/')) {
                                    const resolvedPackageFile = await nodeModuleResolver.resolveBare(args.path)
                                    if (resolvedPackageFile) {
                                        return {
                                            path: resolvedPackageFile,
                                            namespace: 'node-modules',
                                        }
                                    }
                                }

                                let baseDir = scriptsPath
                                if (args.importer && (args.path.startsWith('./') || args.path.startsWith('../'))) {
                                    baseDir = dirname(join(scriptsPath, args.importer))
                                }

                                let candidates = [args.path]
                                if (!/\.[jt]s$/.test(args.path)) {
                                    candidates = [
                                        args.path + '.ts',
                                        args.path + '.js',
                                    ]
                                }

                                for (const candidate of candidates) {
                                    const fullPath = join(baseDir, candidate)
                                    try {
                                        await fileSystem.readFile(fullPath)
                                        const relPath = fullPath.startsWith(scriptsPath)
                                            ? fullPath.substring(scriptsPath.length + 1)
                                            : candidate

                                        if (isExternal(relPath)) {
                                            return {
                                                path: args.path,
                                                external: true,
                                            }
                                        }

                                        return {
                                            path: relPath,
                                            namespace: 'virtual',
                                        }
                                    } catch {}
                                }

                                // Bare specifiers that are not marked external will fall back to package resolution.
                                if (!args.path.startsWith('./') && !args.path.startsWith('../') && !args.path.startsWith('/')) {
                                    console.warn(
                                        `[EsbuildTypescript] Unresolved bare import "${args.path}" from "${args.importer || '<entry>'}". Falling back to esbuild package resolution.`
                                    )
                                }

                                return undefined
                            })

                            build.onLoad({ filter: /.*/, namespace: 'virtual' }, async args => {
                                const fullPath = join(scriptsPath, args.path)
                                return {
                                    contents: await (await fileSystem.readFile(fullPath)).text(),
                                    loader: extname(args.path) === '.js' ? 'js' : 'ts',
                                    resolveDir: dirname(fullPath),
                                }
                            })

                            build.onLoad({ filter: /.*/, namespace: 'node-modules' }, async args => {
                                return {
                                    contents: await nodeModuleResolver.readText(args.path),
                                    loader: nodeModuleResolver.loaderFor(args.path),
                                    resolveDir: dirname(args.path),
                                }
                            })
                        },
                    },
                ],
                tsconfigRaw: tsconfig,
                platform: 'neutral',
            })

            for (const file of result.outputFiles ?? []) {
                const relativeOutputPath = file.path.startsWith('/') ? file.path.substring(1) : file.path
                const virtualOutputPath = join(scriptsPath, relativeOutputPath)

                virtualOutputFiles.add(virtualOutputPath)

                if (file.path.endsWith('.map')) {
                    const virtualMapPath = virtualOutputPath

                    sourceMapVirtualFiles.add(virtualMapPath)
                    sourceMapResult[virtualMapPath] = cleanupSourceMapSources(file.text)
                    virtualOutputResult[virtualMapPath] = cleanupSourceMapSources(file.text)
                    continue
                }

                buildResult[file.path] = file.text
                virtualOutputResult[virtualOutputPath] = file.text
            }
        },

        include() {
            const virtualFiles = [...virtualOutputFiles].map(filePath => [filePath, { isVirtual: true }] as [string, { isVirtual: boolean }])
            return virtualFiles
        },

        ignore(filePath) {
            if (virtualOutputFiles.has(filePath)) return false
            return ignore(projectConfig, filePath)
        },

        async transformPath(filePath) {
            if (typeof filePath !== 'string') return filePath

            if (virtualOutputFiles.has(filePath) && !filePath.endsWith('.map')) {
                return filePath
            }

            if (sourceMapVirtualFiles.has(filePath)) {
                const sourceJsPath = filePath.endsWith('.map') ? filePath.substring(0, filePath.length - 4) : filePath
                const outputJsPath = await getOutputPath(sourceJsPath)
                const outputPath = outputJsPath ? `${outputJsPath}.map` : filePath
                return outputPath
            }

            if (ignore(projectConfig, filePath)) return filePath

            let resolvedFilePath = filePath.substring(scriptsPath.length)
            if (resolvedFilePath.endsWith('.ts')) resolvedFilePath = resolvedFilePath.substring(0, resolvedFilePath.length - 3) + '.js'

            if (buildResult[resolvedFilePath] === undefined) {
                if (filePath.endsWith('.ts')) return null
                return filePath
            }

            if (filePath.endsWith('.ts')) return filePath.substring(0, filePath.length - 3) + '.js'

            return filePath
        },

        async read(filePath, fileContent) {
            if (virtualOutputFiles.has(filePath)) {
                return virtualOutputResult[filePath]
            }

            if (!fileContent) return

            const file = await fileContent.getFile()

            if (!file) return

            return await file.text()
        },

        load(filePath, fileContent) {
            return fileContent
        },

        transform(filePath, fileContent) {
            if (virtualOutputFiles.has(filePath)) {
                return virtualOutputResult[filePath]
            }

            let resolvedFilePath = filePath.substring(scriptsPath.length)
            if (resolvedFilePath.endsWith('.ts')) resolvedFilePath = resolvedFilePath.substring(0, resolvedFilePath.length - 3) + '.js'

            // If not in buildResult (e.g. a .js virtual file from another plugin), leave content untouched.
            const built = buildResult[resolvedFilePath]
            return built !== undefined ? built : fileContent
        },
    }
}
