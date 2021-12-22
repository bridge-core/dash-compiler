import { relative, join } from 'path-browserify'
import { TCompilerPluginFactory } from '../TCompilerPluginFactory'

export const SimpleRewrite: TCompilerPluginFactory = ({
	options,
	outputFileSystem,
	hasComMojangDirectory,
	projectConfig,
	projectRoot,
	packType,
}) => {
	if (!options.buildName)
		options.buildName = options.mode === 'development' ? 'dev' : 'dist'
	if (!options.packName) options.packName = 'Bridge'
	if (!(options.rewriteToComMojang ?? true)) hasComMojangDirectory = false

	const folders: Record<string, string> = {
		behaviorPack: 'development_behavior_packs',
		resourcePack: 'development_resource_packs',
		skinPack: 'skin_packs',
		worldTemplate: 'minecraftWorlds',
	}

	// Rewrite paths so files land in the correct comMojangFolder if comMojang folder is set
	const pathPrefix = (pack: string) =>
		hasComMojangDirectory && options.mode === 'development'
			? `${folders[pack]}`
			: `${projectRoot}/builds/${options.buildName}`
	const pathPrefixWithPack = (pack: string, suffix: string) =>
		`${pathPrefix(pack)}/${options.packName} ${suffix}`

	return {
		async buildStart() {
			if (options.mode === 'production' || options.restartDevServer) {
				if (hasComMojangDirectory) {
					for (const packId in folders) {
						const pack = packType.getFromId(<any>packId)
						if (!pack) continue

						await outputFileSystem
							.unlink(
								// @ts-ignore
								pathPrefixWithPack(packId, pack.defaultPackPath)
							)
							.catch(() => {})
					}
				} else {
					//Using "BP" is fine here because the path doesn't change based on the pack without a com.mojang folder
					await outputFileSystem
						.unlink(pathPrefix('BP'))
						.catch(() => {})
				}
			}
		},
		transformPath(filePath) {
			if (!filePath) return
			// Don't include gametests in production builds
			if (
				filePath.includes('BP/scripts/gametests/') &&
				options.mode === 'production'
			)
				return

			const pack = packType?.get(filePath)
			if (!pack) return

			const packRoot = projectConfig.getPackRoot(pack.id)
			const relPath = relative(join(projectRoot, packRoot), filePath)

			if (
				[
					'behaviorPack',
					'resourcePack',
					'skinPack',
					'worldTemplate',
				].includes(pack.id)
			)
				return join(
					// @ts-ignore
					pathPrefixWithPack(pack.id, pack.defaultPackPath),
					relPath
				)
		},
	}
}
