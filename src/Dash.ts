import { TPackTypeId } from './Common/TPackTypeId.ts'
import { FileSystem } from './FileSystem/FileSystem.ts'
import { dirname, join, resolve } from 'path'

export interface IDashOptions {
	/**
	 * A path that points to the config file for the current project
	 */
	config: string
}

export const defaultPackPaths = <const>{
	behaviorPack: './BP',
	resourcePack: './RP',
	skinPack: './SP',
	worldTemplate: './WT',
}

export class Dash {
	protected _projectConfig?: any
	constructor(
		protected fileSystem: FileSystem,
		protected options: IDashOptions
	) {}

	get projectConfig() {
		if (!this._projectConfig) {
			throw new Error(
				"Make sure to call 'Dash.loadProject()' before accessing the projectConfig"
			)
		}
		return this._projectConfig
	}

	async loadProject() {
		this._projectConfig = await this.fileSystem.readJson(
			this.options.config
		)
	}

	build() {}

	watch() {
		// this.fileSystem.watchDirectory()
	}

	getPackRoot(packId: TPackTypeId) {
		return this.projectConfig.packs?.[packId] ?? defaultPackPaths[packId]
	}
	resolvePackPath(packId?: TPackTypeId, filePath?: string) {
		const basePath = dirname(this.options.config)

		if (!filePath && !packId) return basePath
		else if (!packId && filePath) return join(basePath, filePath)
		else if (!filePath && packId)
			return resolve(basePath, `${this.getPackRoot(packId)}`)

		return resolve(basePath, `${this.getPackRoot(packId!)}/${filePath}`)
	}
	getAvailablePackPaths() {
		const paths: string[] = []

		for (const packId of Object.keys(this.projectConfig.packs ?? {})) {
			paths.push(this.resolvePackPath(<TPackTypeId>packId))
		}

		return paths
	}
}
