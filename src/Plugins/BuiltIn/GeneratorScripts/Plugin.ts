import { TCompilerPluginFactory } from '../../TCompilerPluginFactory'
import { Collection } from './Collection'
import { createModule } from './Module'

export const GeneratorScriptsPlugin: TCompilerPluginFactory<{
	ignoredFileTypes?: string[]
}> = ({
	options,
	fileType,
	console,
	jsRuntime,
	fileSystem,
	compileFiles,
	getFileMetadata,
	unlinkOutputFiles,
	addFileDependencies,
}) => {
	const ignoredFileTypes = new Set([
		'gameTest',
		'customCommand',
		'customComponent',
		'molangAstScript',
		...(options.ignoredFileTypes ?? []),
	])
	const getFileType = (filePath: string) => fileType.getId(filePath)
	const getFileContentType = (filePath: string) => {
		const def = fileType.get(filePath, undefined, false)
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
	const transformPath = (filePath: string) =>
		filePath.replace(/\.(js|ts)$/, getScriptExtension(filePath))

	const omitUsedTemplates = new Set<string>()
	const fileCollection = new Collection(console)
	const filesToUpdate = new Set<string>()
	const usedTemplateMap = new Map<string, Set<string>>()

	return {
		buildStart() {
			fileCollection.clear()
			omitUsedTemplates.clear()
			filesToUpdate.clear()
			usedTemplateMap.clear()
		},
		transformPath(filePath) {
			if (filePath && isGeneratorScript(filePath))
				// Replace .js/.ts with getFileContentType(filePath)
				return transformPath(filePath)
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
			const currentTemplates = new Set<string>()
			jsRuntime.registerModule(
				'@bridge/generate',
				createModule({
					generatorPath: filePath,
					fileSystem,
					omitUsedTemplates: currentTemplates,
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

				const fileMetadata = getFileMetadata(filePath)

				// These files were unlinked previously but are no longer being used as templates...
				const previouslyUnlinkedFiles = (
					fileMetadata.get('unlinkedFiles') ?? []
				).filter((filePath: string) => !currentTemplates.has(filePath))
				// ...so we should compile them again
				previouslyUnlinkedFiles.forEach((file: string) =>
					filesToUpdate.add(file)
				)

				// Save template files we unlink
				fileMetadata.set('unlinkedFiles', [...currentTemplates])
				// Collect all previously generated files
				const generatedFiles = fileMetadata.get('generatedFiles') ?? []
				// Unlink templates and previously generated files
				await unlinkOutputFiles([
					...generatedFiles,
					...currentTemplates,
				])

				usedTemplateMap.set(filePath, currentTemplates)

				return module.__default__
			}
		},
		require(filePath) {
			const usedTemplates = usedTemplateMap.get(filePath)
			if (usedTemplates) return [...usedTemplates]
		},

		finalizeBuild(filePath, fileContent) {
			// 1. Handle generated virtual files
			if (fileCollection.get(filePath)) {
				if (
					filePath.endsWith('.json') &&
					typeof fileContent !== 'string'
				)
					return JSON.stringify(fileContent, null, '\t')
				return fileContent
			}

			// 2. Omit unused template
			if (omitUsedTemplates.has(filePath)) return null

			// 3. Handle transformed generator script
			if (isGeneratorScript(filePath)) {
				if (fileContent === null) return null

				const fileMetadata = getFileMetadata(filePath)

				if (fileContent instanceof Collection) {
					fileCollection.addFrom(fileContent)
					// Cache the files this generator script generated
					fileMetadata.set(
						'generatedFiles',
						fileContent.getAll().map(([filePath]) => filePath)
					)

					return null
				}

				// This file only transformed itself so we save the transformed path as a generated file
				fileMetadata.set('generatedFiles', [transformPath(filePath)])

				return typeof fileContent === 'object'
					? JSON.stringify(fileContent)
					: fileContent
			}
		},
		async buildEnd() {
			jsRuntime.deleteModule('@bridge/generate')

			if (filesToUpdate.size > 0)
				await compileFiles(
					[...filesToUpdate].filter(
						(filePath) => !fileCollection.has(filePath)
					),
					false
				)
			if (fileCollection.hasFiles)
				await compileFiles(
					fileCollection.getAll().map(([filePath]) => filePath)
				)
		},

		async beforeFileUnlinked(filePath) {
			if (isGeneratorScript(filePath)) {
				const fileMetadata = getFileMetadata(filePath)
				const unlinkedFiles = fileMetadata.get('unlinkedFiles') ?? []
				const generatedFiles = fileMetadata.get('generatedFiles') ?? []

				await unlinkOutputFiles(generatedFiles)
				await compileFiles(unlinkedFiles)
			}
		},
	}
}
