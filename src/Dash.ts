import { FileSystem } from './FileSystem/FileSystem'
import { DashProjectConfig } from './DashProjectConfig'
import { basename, dirname, join } from 'path-browserify'
import { AllPlugins } from './Plugins/AllPlugins'
import { IncludedFiles } from './Core/IncludedFiles'
import { LoadFiles } from './Core/LoadFiles'
import { ResolveFileOrder } from './Core/ResolveFileOrder'
import { FileTransformer } from './Core/TransformFiles'
import { FileType, PackType } from 'mc-project-core'
import type { DashFile } from './Core/DashFile'
import { Progress } from './Core/Progress'

export interface IDashOptions<TSetupArg = void> {
	/**
	 * mode: Either 'development' or 'production'
	 */
	mode?: 'development' | 'production'
	/**
	 * A path that points to the project config file
	 */
	config: string

	/**
	 * Dedicated compiler config file to use for the compilation
	 * Optional; defaults to loading from the project config
	 *
	 * @example "projects/myProject/.bridge/compiler/mcaddon.json"
	 */
	compilerConfig?: string

	/**
	 * An environment for the plugins to execute in
	 */
	pluginEnvironment?: any

	packType: PackType<TSetupArg>
	fileType: FileType<TSetupArg>

	requestJsonData: <T = any>(dataPath: string) => Promise<T>
}

export class Dash<TSetupArg = void> {
	public readonly outputFileSystem: FileSystem
	public readonly progress = new Progress()

	public readonly projectConfig: DashProjectConfig
	public readonly projectRoot: string
	public readonly plugins: AllPlugins = new AllPlugins(this)
	public packType: PackType<any>
	public fileType: FileType<any>
	public includedFiles: IncludedFiles = new IncludedFiles(this)
	public loadFiles: LoadFiles = new LoadFiles(this)
	public fileOrderResolver: ResolveFileOrder = new ResolveFileOrder(this)
	public fileTransformer: FileTransformer = new FileTransformer(this)

	// TODO(@solvedDev): Add support for multiple output directories
	// (e.g. compiling a RP to Minecraft Bedrock and Java)
	constructor(
		public readonly fileSystem: FileSystem,
		outputFileSystem: FileSystem | undefined,
		protected options: IDashOptions<TSetupArg>
	) {
		this.outputFileSystem = outputFileSystem ?? fileSystem
		this.projectRoot = dirname(options.config)
		this.projectConfig = new DashProjectConfig(fileSystem, options.config)

		this.packType = options.packType
		this.fileType = options.fileType
	}

	getMode() {
		return this.options.mode ?? 'development'
	}
	getCompilerConfigPath() {
		return this.options.compilerConfig
	}
	get requestJsonData() {
		return this.options.requestJsonData
	}

	protected get dashFilePath() {
		return join(this.projectRoot, `.bridge/.dash.${this.getMode()}.json`)
	}

	async setup(setupArg: TSetupArg) {
		await this.projectConfig.setup()

		this.fileType?.setProjectConfig(this.projectConfig)
		this.packType?.setProjectConfig(this.projectConfig)

		await this.fileType?.setup(setupArg)
		await this.packType?.setup(setupArg)

		await this.plugins.loadPlugins(this.options.pluginEnvironment)
	}

	async reloadPlugins() {
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
		this.progress.setTotal(7)

		await this.plugins.runBuildStartHooks()
		this.progress.advance()

		await this.includedFiles.loadAll()
		this.progress.advance()

		await this.compileIncludedFiles()

		await this.plugins.runBuildEndHooks()
		this.progress.advance()

		await this.saveDashFile()
		this.includedFiles.resetAll()

		this.progress.advance()

		console.log(
			`Dash compiled ${this.includedFiles.all().length} files in ${
				Date.now() - startTime
			}ms!`
		)

		// TODO(@solvedDev): Packaging scripts to e.g. export as .mcaddon
	}

	async updateFiles(filePaths: string[]) {
		// Update files in output
		console.log(`Dash is starting to update ${filePaths.length} files...`)

		await this.includedFiles.load(this.dashFilePath)
		await this.plugins.runBuildStartHooks()

		const files: DashFile[] = []
		for (const filePath of filePaths) {
			let file = this.includedFiles.get(filePath)
			if (!file) {
				;[file] = this.includedFiles.add([filePath])
			}

			files.push(file)
		}

		// Load files and files that are required by this file
		await this.loadFiles.run(files)

		const filesToLoad = new Set(
			files.map((file) => [...file.filesToLoadForHotUpdate()]).flat()
		)
		console.log(`Dash is loading ${filesToLoad.size} files...`)
		await this.loadFiles.run(
			[...filesToLoad.values()].filter(
				(currFile) => !files.includes(currFile)
			)
		)

		for (const file of filesToLoad) {
			file.data =
				(await this.plugins.runTransformHooks(file)) ?? file.data
		}

		const filesToTransform = new Set(
			files.map((file) => [...file.getHotUpdateChain()]).flat()
		)
		console.log(`Dash is compiling ${filesToTransform.size} files...`)

		// We need to run the whole transformation pipeline
		await this.fileTransformer.run(filesToTransform, true)

		await this.plugins.runBuildEndHooks()

		await this.saveDashFile()
		this.includedFiles.resetAll()
		console.log(`Dash finished updating ${filesToTransform.size} files!`)
	}
	async compileFile(
		filePath: string,
		fileData: Uint8Array
	): Promise<[string[], any]> {
		let file = this.includedFiles.get(filePath)
		if (!file) {
			;[file] = this.includedFiles.add([filePath])
		}

		// Update file handle to use provided fileData
		file.setFileHandle({
			getFile: () => new File([fileData], basename(filePath)),
		})

		// Load files and files that are required by this file
		await this.loadFiles.loadFile(file)
		await this.loadFiles.loadRequiredFiles(file)

		// Resolve all file dependencies
		const requiredFiles = new Set<DashFile>()
		this.fileOrderResolver.resolveSingle(file, requiredFiles)

		// Load all file dependencies
		for (const depFile of requiredFiles) {
			if (depFile === file) continue

			await this.loadFiles.loadFile(depFile)
		}

		// Run transform hook on file dependencies
		for (const depFile of requiredFiles) {
			if (depFile === file) continue
			await this.fileTransformer.transformFile(depFile)
		}

		// Transform original file data
		const transformedData = await this.fileTransformer.transformFile(
			file,
			true
		)

		// Reset includedFiles data
		this.includedFiles.resetAll()

		return [
			[...requiredFiles].map((file) => file.filePath),
			transformedData,
		]
	}

	async unlink(path: string, updateDashFile = true) {
		const outputPath = await this.plugins.runTransformPathHooks(path)
		if (!outputPath) return

		await this.outputFileSystem.unlink(outputPath)
		this.includedFiles.remove(path)

		if (updateDashFile) await this.saveDashFile()
	}

	async rename(oldPath: string, newPath: string) {
		await this.unlink(oldPath, false)
		await this.updateFiles([newPath])

		await this.saveDashFile()
	}
	async getCompilerOutputPath(filePath: string) {
		const outputPath = await this.plugins.runTransformPathHooks(filePath)
		if (!outputPath) return

		return outputPath
	}

	watch() {
		// this.fileSystem.watchDirectory()
	}

	// Save compiler data
	protected async saveDashFile() {
		await this.includedFiles.save(this.dashFilePath)
	}

	protected async compileIncludedFiles() {
		await this.loadFiles.run(this.includedFiles.all())
		this.progress.advance()

		const resolvedFileOrder = this.fileOrderResolver.run(
			this.includedFiles.all()
		)
		this.progress.advance()

		// console.log(resolvedFileOrder)
		await this.fileTransformer.run(resolvedFileOrder)
		this.progress.advance()
	}

	/**
	 * Virtual files are files created by compiler plugins.
	 * Updating them is much simpler than update normal files so we have this dedicated method for them.
	 * @param filePaths
	 */
	async compileVirtualFiles(filePaths: string[]) {
		this.includedFiles.add(filePaths, true)
		await this.compileIncludedFiles()
	}
}
