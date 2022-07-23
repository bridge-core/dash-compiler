import { TCompilerPluginFactory } from '../../TCompilerPluginFactory'
import { Collection } from './Collection'
import { createModule } from './Module'

export const GeneratorScriptsPlugin: TCompilerPluginFactory<{}> = ({
	fileType,
	console,
	jsRuntime,
	fileSystem,
	compileFiles,
}) => {
	const ignoredFileTypes = new Set([
		'gameTest',
		'customCommand',
		'customComponent',
	])
	const getFileType = (filePath: string) => fileType.getId(filePath)
	const getFileContentType = (filePath: string) => {
		const def = fileType.get(filePath)
		if (!def) return 'raw'
		return def.type ?? 'json'
	}
	const isGeneratorScript = (filePath: string) =>
		!ignoredFileTypes.has(getFileType(filePath)) &&
		(filePath.endsWith('.js') || filePath.endsWith('.ts'))
	const getScriptExtension = (filePath: string) => {
		const fileContentType = getFileContentType(filePath)
		if (fileContentType === 'json') return '.json'

		return fileType.get(filePath)?.detect?.fileExtensions?.[0] ?? '.txt'
	}

	const omitUsedTemplates = new Set<string>()
	const fileCollection = new Collection(console)

	return {
		buildStart() {
			fileCollection.clear()
			omitUsedTemplates.clear()
		},
		transformPath(filePath) {
			if (filePath && isGeneratorScript(filePath))
				// Replace .js/.ts with getFileContentType(filePath)
				return filePath.replace(
					/\.(js|ts)$/,
					getScriptExtension(filePath)
				)
		},

		async read(filePath, fileHandle) {
			if (isGeneratorScript(filePath) && fileHandle) {
				const file = await fileHandle.getFile()
				if (!file) return

				return file.text()
			}

			const fromCollection = fileCollection.get(filePath)
			if (fromCollection) return fromCollection
		},
		async load(filePath, fileContent) {
			jsRuntime.registerModule(
				'@bridge/generate',
				createModule({
					generatorPath: filePath,
					fileSystem,
					omitUsedTemplates,
					console,
				})
			)

			if (isGeneratorScript(filePath)) {
				if (!fileContent) return null

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

			if (fileCollection.get(filePath)) {
				if (
					filePath.endsWith('.json') &&
					typeof fileContent !== 'string'
				)
					return JSON.stringify(fileContent, null, '\t')
				return fileContent
			}
		},

		finalizeBuild(filePath, fileContent) {
			if (omitUsedTemplates.has(filePath)) return null

			if (isGeneratorScript(filePath)) {
				if (fileContent === null) return null

				if (fileContent instanceof Collection) {
					fileCollection.addFrom(fileContent)
					return null
				}

				return typeof fileContent === 'object'
					? JSON.stringify(fileContent)
					: fileContent
			}
		},
		async buildEnd() {
			jsRuntime.deleteModule('@bridge/generate')

			if (fileCollection.hasFiles)
				await compileFiles(
					fileCollection.getAll().map(([filePath]) => filePath)
				)
		},
	}
}
