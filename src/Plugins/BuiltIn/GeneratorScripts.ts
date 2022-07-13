import { run } from '../../Common/runScript'
import { TCompilerPluginFactory } from '../TCompilerPluginFactory'

export const GeneratorScriptsPlugin: TCompilerPluginFactory<{}> = ({
	fileType,
	console,
}) => {
	const getFileType = (filePath: string) => fileType.getId(filePath)
	const getFileContentType = (filePath: string) => {
		const def = fileType.get(filePath)
		if (!def) return 'raw'
		return def.type ?? 'json'
	}
	const isGeneratorScript = (filePath: string) =>
		getFileType(filePath) !== 'gameTest' &&
		(filePath.endsWith('.js') || filePath.endsWith('.ts'))
	const getScriptExtension = (filePath: string) => {
		const fileContentType = getFileContentType(filePath)
		if (fileContentType === 'json') return '.json'

		return fileType.get(filePath)?.detect?.fileExtensions?.[0] ?? '.txt'
	}

	return {
		transformPath(filePath) {
			if (filePath && isGeneratorScript(filePath))
				// Replace .js/.ts with getFileContentType(filePath)
				return filePath.replace(
					/\.(js|ts)$/,
					`.${getScriptExtension(filePath)}`
				)
		},

		read(filePath, fileHandle) {
			if (isGeneratorScript(filePath)) return fileHandle?.getFile()
		},
		async load(filePath, fileContent) {
			if (isGeneratorScript(filePath)) {
				const module = { exports: null }
				await run({
					env: {
						module,
					},
					console,
					async: true,
					script: fileContent,
				})

				return module.exports
			}
		},

		finalizeBuild(filePath, fileContent) {
			if (isGeneratorScript(filePath)) {
				return typeof fileContent === 'object'
					? JSON.stringify(fileContent)
					: fileContent
			}
		},
	}
}
