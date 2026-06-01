import { TCompilerPluginFactory } from '../../TCompilerPluginFactory'
import * as esbuild from 'esbuild-wasm'
import esbuildWasmUrl from './esbuild.wasm?url'
import { dirname, extname, join } from 'pathe'
import { FileSystem } from '../../../main'
import json5 from 'json5'

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

    console.log(`[EsbuildTypescript] Initialized esbuild-wasm!`)
}

async function findScriptFiles(path: string, fileSystem: FileSystem): Promise<string[]> {
    const entries = await fileSystem.readdir(path)

    let files: string[] = []

    for (const entry of entries) {
        if (entry.kind === 'file') {
            if (!entry.name.endsWith('.js') && !entry.name.endsWith('.ts')) continue

            files.push(join(path, entry.name))
        } else {
            const subFiles = await findScriptFiles(join(path, entry.name), fileSystem)

            files = files.concat(subFiles)
        }
    }

    return files
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
    outfile?: string
    outdir?: string
    externals?: string[]
}> = ({ options, fileSystem, projectConfig, projectRoot, getOutputPath }) => {
    function isExternal(path: string) {
        return externals.some(pattern => {
            if (!pattern.includes('*')) return pattern === path
            const regex = new RegExp(
                '^' + pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*') + '$'
            )
            return regex.test(path)
        })
    }

    const externals = [
        '@minecraft/server',
        '@minecraft/server-ui',
        '@minecraft/vanilla-data',
        '@minecraft/server-gametest',
        '@minecraft/common',
        ...(options.externals ?? [])
    ];

    let useBundle = options.bundle ?? true
    let entryFile = options.entryFile ?? 'main.ts'


    const scriptsPath = projectConfig.resolvePackPath('behaviorPack', 'scripts')

    let buildResult: Record<string, string> = {}
    let sourceMapResult: Record<string, string> = {}
    let sourceMapVirtualFiles = new Set<string>()

    function cleanupSourceMapSources(sourceMapText: string) {
        return sourceMapText.replace(/"virtual:/g, '"')
    }

    return {
        async buildStart() {
            buildResult = {}
            sourceMapResult = {}
            sourceMapVirtualFiles = new Set()

            await initialize()

            let entryPoints = options.entryPoints ?? [entryFile]

            if (!useBundle) {
                const scriptFiles = await findScriptFiles(scriptsPath, fileSystem)
                entryPoints = scriptFiles.map(filePath => filePath.substring(scriptsPath.length + 1))
            }

            let outFile = entryFile
            if (outFile.endsWith('.ts')) outFile = outFile.substring(0, outFile.length - 3) + '.js'

            let tsconfig = undefined
            try {
                const file = await fileSystem.readFile(join(projectRoot, 'tsconfig.json'))
                const text = await file.text()
                tsconfig = json5.parse(text)
                console.log('[EsbuildTypescript] Located tsconfig!')
            } catch {
                console.warn('[EsbuildTypescript] Could not locate tsconfig!')
            }

            const result = await esbuild.build({
                packages: 'bundle',
                bundle: useBundle,
                external: useBundle ? externals : undefined,
                entryPoints: entryPoints,
                outfile: useBundle ? outFile : undefined,
                outdir: useBundle ? undefined : '.',
                write: false,
                sourcemap: true,
                plugins: [
                    {
                        name: 'virtual-files',
                        setup(build) {
                            build.onResolve({ filter: /.*/ }, async args => {
                                if (args.namespace && args.namespace !== 'virtual') return undefined;
                                if (isExternal(args.path)) return { path: args.path, external: true };
                                let baseDir = scriptsPath;
                                if (args.importer && (args.path.startsWith('./') || args.path.startsWith('../'))) {
                                    baseDir = dirname(join(scriptsPath, args.importer));
                                }
                                let candidates = [args.path];
                                if (!/\.[jt]s$/.test(args.path)) {
                                    candidates = [
                                        args.path + '.ts',
                                        args.path + '.js',
                                    ];
                                }
                                for (const candidate of candidates) {
                                    const fullPath = join(baseDir, candidate);
                                    try {
                                        await fileSystem.readFile(fullPath);
                                        const relPath = fullPath.startsWith(scriptsPath) ? fullPath.substring(scriptsPath.length + 1) : candidate;
                                        return {
                                            path: relPath,
                                            namespace: 'virtual',
                                        };
                                    } catch {}
                                }

                                // Bare specifiers that are not marked external will fall back to esbuild's
                                // package resolution.
                                if (!args.path.startsWith('./') && !args.path.startsWith('../') && !args.path.startsWith('/')) {
                                    console.warn(
                                        `[EsbuildTypescript] Unresolved bare import "${args.path}" from "${args.importer || '<entry>'}". Falling back to esbuild package resolution.`
                                    )
                                }

                                return undefined;
                            });
                            build.onLoad({ filter: /.*/, namespace: 'virtual' }, async args => {
                                const fullPath = join(scriptsPath, args.path);
                                return {
                                    contents: await (await fileSystem.readFile(fullPath)).text(),
                                    loader: extname(args.path) === '.js' ? 'js' : 'ts',
                                    resolveDir: dirname(fullPath),
                                };
                            });
                        },
                    },
                ],
                tsconfigRaw: tsconfig,
                platform: 'neutral',
            })

            for (const file of result.outputFiles) {
                if (file.path.endsWith('.map')) {
                    const relativeOutputPath = file.path.startsWith('/') ? file.path.substring(1) : file.path
                    const virtualMapPath = join(scriptsPath, relativeOutputPath)

                    sourceMapVirtualFiles.add(virtualMapPath)
                    sourceMapResult[virtualMapPath] = cleanupSourceMapSources(file.text)
                    continue
                }
                buildResult[file.path] = file.text
            }
        },

        include() {
            const virtualFiles = [...sourceMapVirtualFiles].map(filePath => [filePath, { isVirtual: true }] as [string, { isVirtual: boolean }])
            return virtualFiles
        },

        ignore(filePath) {
            if (sourceMapVirtualFiles.has(filePath)) return false
            return ignore(projectConfig, filePath)
        },

        async transformPath(filePath) {
            if (typeof filePath !== 'string') return filePath

            if (sourceMapVirtualFiles.has(filePath)) {
                const sourceJsPath = filePath.endsWith('.map') ? filePath.substring(0, filePath.length - 4) : filePath
                const outputJsPath = await getOutputPath(sourceJsPath)
                const outputPath = outputJsPath ? `${outputJsPath}.map` : filePath
                return outputPath
            }

            if (ignore(projectConfig, filePath)) return filePath

            let resolvedFilePath = filePath.substring(scriptsPath.length)
            if (resolvedFilePath.endsWith('.ts')) resolvedFilePath = resolvedFilePath.substring(0, resolvedFilePath.length - 3) + '.js'

            if (buildResult[resolvedFilePath] === undefined) return null

            if (filePath.endsWith('.ts')) return filePath.substring(0, filePath.length - 3) + '.js'

            return filePath
        },

        async read(filePath, fileContent) {
            if (sourceMapVirtualFiles.has(filePath)) {
                return sourceMapResult[filePath]
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
            if (sourceMapVirtualFiles.has(filePath)) {
                return sourceMapResult[filePath]
            }

            let resolvedFilePath = filePath.substring(scriptsPath.length)
            if (resolvedFilePath.endsWith('.ts')) resolvedFilePath = resolvedFilePath.substring(0, resolvedFilePath.length - 3) + '.js'

            return buildResult[resolvedFilePath]
        },
    }
}
