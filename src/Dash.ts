import { FileSystem } from './FileSystem/FileSystem'
import { DashProjectConfig } from './DashProjectConfig'
import { dirname } from 'path-browserify'
import { AllPlugins } from './Plugins/AllPlugins'
import { IncludedFiles } from './Core/IncludedFiles'

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

export class Dash {
	public readonly projectConfig: DashProjectConfig
	public readonly projectRoot: string
	public readonly plugins = new AllPlugins()
	public includedFiles = new IncludedFiles(this)

	constructor(
		public readonly fileSystem: FileSystem,
		protected options: IDashOptions
	) {
		this.projectRoot = dirname(options.config)
		this.projectConfig = new DashProjectConfig(fileSystem, options.config)
	}

	async build() {
		await this.plugins.runBuildStartHooks()

		await this.includedFiles.loadAll()

		await this.plugins.runBuildEndHooks()
	}

	watch() {
		// this.fileSystem.watchDirectory()
	}
}
