import { TCompilerPluginFactory } from '../../TCompilerPluginFactory'
import * as esbuild from 'esbuild-wasm'
import esbuildWasmUrl from './esbuild.wasm?url'
import { join } from 'pathe'

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

export const EsbuildTypeScriptPlugin: TCompilerPluginFactory<{
    inlineSourceMap?: boolean
}> = ({ options, projectRoot, fileSystem, projectConfig }) => {
    return {
        async buildStart() {
            console.log('Esbuild Typescript plugin build start!')

            await initialize()

            const scriptsPath = projectConfig.resolvePackPath('behaviorPack', 'scripts')

            console.log(scriptsPath)

            console.log(await fileSystem.readdir(join(projectRoot, scriptsPath)))

            const result = await esbuild.build({
                bundle: true,
                packages: 'bundle',
                entryPoints: ['test.ts'],
                outfile: 'main.js',
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
            })

            console.log(result)

            console.log(new TextDecoder().decode(result.outputFiles[0].contents))
        },

        // ignore(filePath) {
        //     return !filePath.endsWith('.ts')
        // },

        // async transformPath(filePath) {
        //     if (!filePath?.endsWith('.ts')) return

        //     if (filePath?.endsWith('.d.ts')) return null

        //     return `${filePath.slice(0, -3)}.js`
        // },
        // async read(filePath, fileHandle) {
        //     if (!filePath.endsWith('.ts') || !fileHandle) return

        //     const file = await fileHandle.getFile()
        //     return await file?.text()
        // },
        // async load(filePath, fileContent) {
        //     if (!filePath.endsWith('.ts') || fileContent === null || typeof fileContent !== 'string') return

        //     await loadedWasm

        //     return transformSync(fileContent, {
        //         filename: basename(filePath),

        //         sourceMaps: options?.inlineSourceMap ? 'inline' : undefined,

        //         jsc: {
        //             parser: {
        //                 syntax: 'typescript',
        //             },
        //             preserveAllComments: false,
        //             target: 'es2020',
        //             transform: {
        //                 useDefineForClassFields: false,
        //             },
        //         },
        //     }).code
        // },
        // finalizeBuild(filePath, fileContent) {
        //     /**
        //      * We can only finalize the build if the fileContent type didn't change.
        //      * This is necessary because e.g. custom component files need their own
        //      * logic to be transformed from the Component instance back to a transpiled string
        //      */
        //     if (filePath.endsWith('.ts') && typeof fileContent === 'string') return fileContent
        // },
    }
}
