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
    outfile?: string
    outdir?: string
    splitting?: boolean
}> = ({ options, fileSystem, projectConfig, projectRoot }) => {
    const externals = [
        '@minecraft/server',
        '@minecraft/server-ui',
        '@minecraft/vanilla-data',
        '@minecraft/server-gametest',
        '@minecraft/common',
    ];

    let useBundle = options.bundle ?? true
    let entryFile = options.entryFile ?? 'main.ts'
    if (options.splitting && options.outfile) {
        throw new Error("splitting requires outdir, not outfile");
    }

    const scriptsPath = projectConfig.resolvePackPath('behaviorPack', 'scripts')

    let buildResult: Record<string, string> = {}

    return {
        async buildStart() {
            buildResult = {}

            await initialize()

            let entryPoints = [entryFile]

            if (!useBundle) {
                const scriptFiles = await findScriptFiles(scriptsPath, fileSystem)

                entryPoints = scriptFiles.map(filePath => filePath.substring(scriptsPath.length + 1))
            }

            let outFile = entryFile
            if (outFile.endsWith('.ts')) outFile = outFile.substring(0, outFile.length - 3) + '.js'

            // Determine output options: only set outfile or outdir, never both
            let outfileOption = undefined;
            let outdirOption = undefined;
            if (options.splitting) {
                outdirOption = options.outdir ?? scriptsPath; // Use configured outdir or default to scriptsPath
            } else {
                outfileOption = options.outfile ?? (useBundle ? outFile : undefined); // Use configured outfile or default
            }

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
                outfile: outfileOption,
                outdir: outdirOption,
                write: false,
                splitting: options.splitting,
                sourcemap: true,
                plugins: [
                    {
                        name: 'virtual-files',
                        setup(build) {
                            build.onResolve({ filter: /.*/ }, async args => {
                                if (args.namespace && args.namespace !== 'virtual') return undefined;
                                if (externals.includes(args.path)) return undefined;
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
                buildResult[file.path] = file.text
            }
        },

        ignore(filePath) {
            return ignore(projectConfig, filePath)
        },

        async transformPath(filePath) {
            if (typeof filePath !== 'string') return filePath

            if (ignore(projectConfig, filePath)) return filePath

            let resolvedFilePath = filePath.substring(scriptsPath.length)
            if (resolvedFilePath.endsWith('.ts')) resolvedFilePath = resolvedFilePath.substring(0, resolvedFilePath.length - 3) + '.js'

            if (buildResult[resolvedFilePath] === undefined) return null

            if (filePath.endsWith('.ts')) return filePath.substring(0, filePath.length - 3) + '.js'

            return filePath
        },

        async read(filePath, fileContent) {
            if (!fileContent) return

            const file = await fileContent.getFile()

            if (!file) return

            return await file.text()
        },

        load(filePath, fileContent) {
            return fileContent
        },

        transform(filePath, fileContent) {
            let resolvedFilePath = filePath.substring(scriptsPath.length)
            if (resolvedFilePath.endsWith('.ts')) resolvedFilePath = resolvedFilePath.substring(0, resolvedFilePath.length - 3) + '.js'

            return buildResult[resolvedFilePath]
        },
    }
}
