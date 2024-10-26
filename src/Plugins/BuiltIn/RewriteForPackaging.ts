import { relative, join } from 'pathe'
import { TCompilerPluginFactory } from '../TCompilerPluginFactory'

export const RewriteForPackaging: TCompilerPluginFactory<{
	format?: 'mcaddon' | 'mcworld' | 'mctemplate'
	packName?: string
}> = ({
	options,
	outputFileSystem,
	projectRoot,
	packType,
	fileType,
	console,
}) => {
	if (!options.packName) options.packName = 'bridge project'

	/**
	 * Only get the file name and relevant folders
	 *
	 * @example BP/entities/entity.json -> entities/entity.json
	 * @example RP/blocks/block.json -> blocks/block.json
	 * @example behavPack/entities/entity.json -> entities/entity.json
	 * @example ../../BP/manifest.json -> manifest.json
	 */
	const relevantFilePath = (path: string) =>
		path
			.split(/\\|\//g)
			.filter((part) => part !== '..' && part !== '.')
			.slice(1)
			.join('/')

	const rewriteForMcaddon = (filePath: string) => {
		// Get pack type of file
		const packId = packType.getId(filePath)

		// Get file path relative to the project root
		const relativePath = relative(projectRoot, filePath)

		if (
			packId === 'behaviorPack' ||
			packId === 'resourcePack' ||
			packId === 'skinPack'
		)
			return join(
				projectRoot,
				'builds/dist',
				packId,
				relevantFilePath(relativePath)
			)
	}

	const rewriteForMctemplate = (filePath: string) => {
		// Get pack type of file
		const packId = packType.getId(filePath)

		// Get file path relative to the project root
		const relativePath = relative(projectRoot, filePath)

		if (packId === 'worldTemplate')
			return join(
				projectRoot,
				'builds/dist',
				relevantFilePath(relativePath)
			)
		else if (packId === 'behaviorPack' || packId === 'resourcePack') {
			return join(
				projectRoot,
				'builds/dist',
				packId === 'behaviorPack' ? 'behavior_packs' : 'resource_packs',
				options.packName!,
				relevantFilePath(relativePath)
			)
		}
	}
	const rewriteForMcworld = (filePath: string) => {
		const fileId = fileType.getId(filePath)

		// Only difference between .mcworld and .mctemplate is that we need to omit the world manifest
		if (fileId === 'worldManifest') return null
		return rewriteForMctemplate(filePath)
	}

	return {
		async buildStart() {
			await outputFileSystem
				.unlink(`${projectRoot}/builds/dist`)
				.catch(() => {})
		},
		transformPath(filePath) {
			if (!filePath) return

			switch (options.format) {
				case 'mcaddon':
					return rewriteForMcaddon(filePath)
				case 'mcworld':
					return rewriteForMcworld(filePath)
				case 'mctemplate':
					return rewriteForMctemplate(filePath)
				default:
					console.error(`Unknown packaging format: ${options.format}`)
			}
		},
	}
}
