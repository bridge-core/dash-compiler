import { TPackTypeId } from 'mc-project-core'
import { TCompilerPluginFactory } from '../TCompilerPluginFactory'

export const ContentsFilePlugin: TCompilerPluginFactory = ({
	projectConfig,
	packType,
	options,
}) => {
	const packs = Object.keys(projectConfig.getAvailablePacks())
	const packContents: Record<string, string[]> = Object.fromEntries(
		packs.map((packId) => [packId, []])
	)
	const isContentsFile = (filePath: string) => {
		const packId = packType.getId(filePath)
		if (packId === 'unknown') return
		return [packId, projectConfig.resolvePackPath(packId, 'contents.json')]
	}

	if (options.buildType !== 'fullBuild') return {}

	return {
		include() {
			return packs.map((id) => [
				projectConfig.resolvePackPath(<TPackTypeId>id, 'contents.json'),
				{ isVirtual: true },
			])
		},
		read(filePath) {
			const details = isContentsFile(filePath)
			if (!details) return
			const [packId, contentsPath] = details
			if (filePath === contentsPath) return

			return packContents[packId]
		},
		transformPath(filePath) {
			if (!filePath) return

			const packId = packType.getId(filePath)
			if (packId === 'unknown') return
			packContents[packId].push(filePath)

			return undefined
		},
		finalizeBuild(filePath) {
			const details = isContentsFile(filePath)
			if (!details) return
			const [packId, contentsPath] = details
			if (filePath === contentsPath) return

			return JSON.stringify(packContents[packId])
		},
	}
}
