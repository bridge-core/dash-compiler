import { TCompilerPluginFactory } from '../TCompilerPluginFactory'

export const FormatVersionCorrection: TCompilerPluginFactory = ({
	fileType
}) => {
	return {
		transform(filePath, fileContent) {
			// Get file type for file
			const currentFileType = fileType.get(filePath)
			// Get format version map, if non, skip
			const formatVersionMap = currentFileType?.formatVersionMap
			if (!formatVersionMap) return

			// Change format version
			const formatVersion: string | undefined = fileContent?.format_version
			if (formatVersion && formatVersionMap[formatVersion])
				fileContent.format_version = formatVersionMap[formatVersion]
			return fileContent
		}
	}
}
