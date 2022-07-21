import { TCompilerPluginFactory } from '../TCompilerPluginFactory'

export const GeneratorScriptsPlugin: TCompilerPluginFactory<{}> = ({
	fileType,
	console,
	jsRuntime,
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
				const module = await jsRuntime
					.run(
						filePath,
						{
							console,
						},
						fileContent
					)
					.catch((err) => {
						console.error(
							`Failed to execute generator script "${filePath}": ${err}`
						)
						return null
					})
				if (!module) return null
				if (!module.__default__) {
					console.error(
						`Expected generator script "${filePath}" to provide file content as default export!`
					)
					return null
				}

				return module.__default__
			}
		},

		finalizeBuild(filePath, fileContent) {
			if (isGeneratorScript(filePath)) {
				if (fileContent === null) return null

				return typeof fileContent === 'object'
					? JSON.stringify(fileContent)
					: fileContent
			}
		},
	}
}
