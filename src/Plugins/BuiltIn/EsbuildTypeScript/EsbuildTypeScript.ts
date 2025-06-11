import { TCompilerPluginFactory } from '../../TCompilerPluginFactory'
import * as esbuild from 'esbuild-wasm'
import esbuildWasmUrl from './esbuild.wasm?url'
import { join, resolve } from 'pathe'
import { FileSystem } from '../../../main'

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

    console.log(`Initialized esbuild-wasm!`)
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
}> = ({ options, fileSystem, projectConfig }) => {
    let bundle = options.bundle ?? false
    let entryFile = options.entryFile ?? 'main.ts'

    const scriptsPath = projectConfig.resolvePackPath('behaviorPack', 'scripts')

    let buildResult: Record<string, string> = {}

    return {
        async buildStart() {
            console.log('Esbuild Typescript plugin build start!')

            buildResult = {}

            await initialize()

            let entryPoints = [entryFile]

            if (!options.bundle) {
                const scriptFiles = await findScriptFiles(scriptsPath, fileSystem)

                entryPoints = scriptFiles.map(filePath => filePath.substring(scriptsPath.length + 1))
            }

            let outFile = entryFile
            if (outFile.endsWith('.ts')) outFile = outFile.substring(0, outFile.length - 3) + '.js'

            const result = await esbuild.build({
                packages: 'bundle',
                bundle: bundle,
                external: bundle ? ['@minecraft/server', '@minecraft/server-ui', '@minecraft/vanilla-data', '@minecraft/server-gametest'] : undefined,
                entryPoints: entryPoints,
                outfile: bundle ? outFile : undefined,
                outdir: bundle ? undefined : '/',
                write: false,
                plugins: [
                    {
                        name: 'virtual-files',
                        setup(build) {
                            build.onResolve({ filter: /\.ts$/ }, args => ({
                                path: args.path,
                                namespace: 'virtual',
                            }))

                            build.onLoad({ filter: /\.ts$/, namespace: 'virtual' }, async args => ({
                                contents: await (await fileSystem.readFile(join(scriptsPath, args.path))).text(),
                                loader: 'ts',
                            }))
                        },
                    },
                ],
                tsconfigRaw: {
                    compilerOptions: {
                        module: 'esnext',
                        target: 'esnext',
                    },
                },
            })

            for (const file of result.outputFiles) {
                buildResult[file.path] = file.text
            }

            console.log(buildResult)
        },

        ignore(filePath) {
            return ignore(projectConfig, filePath)
        },

        async transformPath(filePath) {
            if (typeof filePath !== 'string') return filePath

            if (ignore(projectConfig, filePath)) return filePath

            let resolvedFilePath = filePath.substring(scriptsPath.length)
            if (resolvedFilePath.endsWith('.ts')) resolvedFilePath = resolvedFilePath.substring(0, resolvedFilePath.length - 3) + '.js'

            console.log(resolvedFilePath)

            if (buildResult[resolvedFilePath] === undefined) {
                console.log(`Skipping ${filePath} because it is no in the build result!`)

                return null
            }

            if (filePath.endsWith('.ts')) {
                console.log(`Transforming ${filePath} to js ${filePath.substring(0, filePath.length - 3) + '.js'}`)

                return filePath.substring(0, filePath.length - 3) + '.js'
            }

            console.log(`Filepath ${filePath} is good!`)

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
            console.log(`Transforming ${filePath}`)

            let resolvedFilePath = filePath.substring(scriptsPath.length)
            if (resolvedFilePath.endsWith('.ts')) resolvedFilePath = resolvedFilePath.substring(0, resolvedFilePath.length - 3) + '.js'

            return buildResult[resolvedFilePath]
        },
    }
}
