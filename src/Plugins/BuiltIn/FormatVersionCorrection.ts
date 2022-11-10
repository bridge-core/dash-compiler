import { TCompilerPluginFactory } from '../TCompilerPluginFactory'
import json5 from 'json5'

export const FormatVersionCorrection: TCompilerPluginFactory = ({
	fileType,
}) => {
	// Get file types that need transforming
	const toTransform = new Set<string>()
	for (const ft of fileType.all) {
		if (ft.formatVersionMap) toTransform.add(ft.id)
	}

	// Cache for file types
	const needsTransformationCache = new Map<string, boolean>()
	const needsTransformation = (filePath: string) => {
		if (!filePath) return

		let needsTransform = needsTransformationCache.get(filePath)
		if (needsTransform) return needsTransform

		needsTransform = toTransform.has(fileType.getId(filePath))
		needsTransformationCache.set(filePath, needsTransform)
		return needsTransform
	}

	return {
		ignore(filePath) {
			return !needsTransformation(filePath)
		},
		async read(filePath, fileHandle) {
			if (!fileHandle) return

			if (needsTransformation(filePath)) {
				const file = await fileHandle.getFile()
				if (!file) return

				try {
					return json5.parse(await file.text())
				} catch (err) {
					console.error(err)
				}
			}
		},
		load(filePath, fileContent) {
			if (needsTransformation(filePath)) return fileContent
		},
		transform(filePath, fileContent) {
			if (needsTransformation(filePath)) {
				// Get file type for file
				const currentFileType = fileType.get(filePath)
				// Get format version map
				const formatVersionMap = currentFileType?.formatVersionMap
				if (!formatVersionMap) return

				// Change format version
				const formatVersion: string | undefined =
					fileContent?.format_version
				if (formatVersion && formatVersionMap[formatVersion])
					fileContent.format_version = formatVersionMap[formatVersion]
				return fileContent
			}
		},
		finalizeBuild(filePath, fileContent) {
			if (needsTransformation(filePath))
				return JSON.stringify(fileContent)
		},
	}
}
