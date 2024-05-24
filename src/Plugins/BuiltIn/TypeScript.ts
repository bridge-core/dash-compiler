import { transformSync } from '@swc/wasm-web'
import { loadedWasm } from '@bridge-editor/js-runtime'
import { basename } from 'path-browserify'
import { TCompilerPluginFactory } from '../TCompilerPluginFactory'

export const TypeScriptPlugin: TCompilerPluginFactory<{
	inlineSourceMap?: boolean
}> = ({ options }) => {
	return {
		ignore(filePath) {
			return !filePath.endsWith('.ts')
		},

		async transformPath(filePath) {
			if (!filePath?.endsWith('.ts')) return

			if (filePath?.endsWith('.d.ts')) return null

			return `${filePath.slice(0, -3)}.js`
		},
		async read(filePath, fileHandle) {
			if (!filePath.endsWith('.ts') || !fileHandle) return

			const file = await fileHandle.getFile()
			return await file?.text()
		},
		async load(filePath, fileContent) {
			if (!filePath.endsWith('.ts') || fileContent === null || typeof fileContent !== 'string') return

			await loadedWasm

			return transformSync(fileContent, {
				filename: basename(filePath),

				sourceMaps: options?.inlineSourceMap ? 'inline' : undefined,

				jsc: {
					parser: {
						syntax: 'typescript',
						preserveAllComments: false,
						topLevelAwait: true,
					},
					target: 'es2020',
				},
			}).code
		},
		finalizeBuild(filePath, fileContent) {
			/**
			 * We can only finalize the build if the fileContent type didn't change.
			 * This is necessary because e.g. custom component files need their own
			 * logic to be transformed from the Component instance back to a transpiled string
			 */
			if (filePath.endsWith('.ts') && typeof fileContent === 'string') return fileContent
		},
	}
}
