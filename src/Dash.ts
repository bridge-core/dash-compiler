import { FileSystem } from './FileSystem/FileSystem'
import { DashProjectConfig } from './DashProjectConfig'
import { dirname } from 'path-browserify'
import { AllPlugins } from './Plugins/AllPlugins'
import { IncludedFiles } from './Core/IncludedFiles'
import { LoadFiles } from './Core/LoadFiles'
import { ResolveFileOrder } from './Core/ResolveFileOrder'
import { FileTransformer } from './Core/TransformFiles'
import { PackType } from 'mc-project-core'

export interface IDashOptions {
	/**
	 * mode: Either 'development' or 'production'
	 */
	mode?: 'development' | 'production'
	/**
	 * A path that points to the config file for the current project
	 */
	config: string

	/**
	 * An environment for the plugins to execute in
	 */
	pluginEnvironment?: any

	packType?: PackType<any>
}

export class Dash {
	public readonly projectConfig: DashProjectConfig
	public readonly projectRoot: string
	public readonly plugins = new AllPlugins(this)
	public includedFiles = new IncludedFiles(this)
	public loadFiles = new LoadFiles(this)
	public fileOrderResolver = new ResolveFileOrder(this)
	public fileTransformer = new FileTransformer(this)

	// TODO(@solvedDev): Add support for multiple output directories
	// (e.g. compiling a RP to Minecraft Bedrock and Java)
	constructor(
		public readonly fileSystem: FileSystem,
		public readonly outputFileSystem: FileSystem = fileSystem,
		protected options: IDashOptions = {
			mode: 'development',
			config: 'config.json',
		}
	) {
		this.projectRoot = dirname(options.config)
		this.projectConfig = new DashProjectConfig(fileSystem, options.config)
	}

	getMode() {
		return this.options.mode
	}

	async setup() {
		await this.projectConfig.setup()
		await this.plugins.loadPlugins(this.options.pluginEnvironment)
	}

	/**
	 * Omitting the "compiler" property from the project config
	 * or setting it to false will disable the compiler.
	 */
	get isCompilerActivated() {
		return (
			!!this.projectConfig.get().compiler ||
			!Array.isArray(this.projectConfig.get().compiler?.plugins)
		)
	}

	async build() {
		console.log('Starting compilation...')
		if (!this.isCompilerActivated) return

		const startTime = Date.now()

		await this.plugins.runBuildStartHooks()

		await this.includedFiles.loadAll()
		await this.loadFiles.run()

		const resolvedFileOrder = this.fileOrderResolver.run()
		console.log(resolvedFileOrder)
		// await this.fileTransformer.run(resolvedFileOrder)

		await this.plugins.runBuildEndHooks()

		console.log(
			`Dash compiled ${this.includedFiles.all().length} files in ${
				Date.now() - startTime
			}ms!`
		)

		// TODO(@solvedDev): Packaging scripts to e.g. export as .mcaddon
	}

	/**
	 * Virtual files are files created by compiler plugins.
	 * Updating them is much simpler than update normal files so we have this dedicated method for them.
	 * @param filePaths
	 */
	async compileVirtualFiles(filePaths: string[]) {
		// TODO
	}

	async updateFiles(filePaths: string[]) {
		// Update files in output
	}

	async unlink(path: string) {
		// TODO: Remove file or folder from output
	}

	async rename(oldPath: string, newPath: string) {
		// TODO: Rename file or folder in output
	}

	watch() {
		// this.fileSystem.watchDirectory()
	}
}
