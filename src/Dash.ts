import { TPackTypeId } from './Common/TPackTypeId'
import { FileSystem } from './FileSystem/FileSystem'
import { dirname, join, resolve } from 'path-browserify'
import { ProjectConfig } from 'mc-project-core'

export interface IDashOptions {
	/**
	 * mode: Either 'development' or 'production'
	 */
	mode: 'development' | 'production'
	/**
	 * A path that points to the config file for the current project
	 */
	config: string
	/**
	 * Output path
	 */
	output: string
	/**
	 * A record mapping compiler plugin IDs to their respective paths
	 */
	plugins: Record<string, string>
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
}
