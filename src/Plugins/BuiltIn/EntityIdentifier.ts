import { TCompilerPluginFactory } from '../TCompilerPluginFactory'

export const EntityIdentifierAlias: TCompilerPluginFactory = ({ fileType }) => {
	return {
		ignore(filePath) {
			return fileType?.getId(filePath) !== 'entity'
		},
		registerAliases(filePath, fileContent) {
			if (
				fileType?.getId(filePath) === 'entity' &&
				fileContent?.['minecraft:entity']?.description?.identifier
			)
				return [
					fileContent?.['minecraft:entity']?.description?.identifier,
				]
		},
	}
}
