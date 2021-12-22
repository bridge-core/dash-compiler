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
	public isFullBuild = false

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

	async reload() {
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

		this.isFullBuild = true
		this.includedFiles.removeAll()

		const startTime = Date.now()
		this.progress.setTotal(7)

		await this.plugins.runBuildStartHooks()
		this.progress.advance()

		await this.includedFiles.loadAll()
		this.progress.advance()

		await this.compileIncludedFiles()

		await this.plugins.runBuildEndHooks()
		this.progress.advance()

		if (this.getMode() === 'development') await this.saveDashFile()
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
		this.isFullBuild = false
		if (!this.isCompilerActivated) return

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

		const oldDeps: Set<string>[] = []
		for (const file of files) {
			oldDeps.push(new Set([...file.requiredFiles]))
		}

		// Load files and files that are required by this file
		await this.loadFiles.run(files)

		for (let i = 0; i < files.length; i++) {
			const file = files[i]
			const newDeps = [...file.requiredFiles].filter(
				(dep) => !oldDeps[i].has(dep)
			)

			newDeps.forEach((dep) =>
				this.includedFiles
					.query(dep)
					.forEach((depFile) => depFile.addUpdateFile(file))
			)

			const removedDeps = [...oldDeps[i]].filter(
				(dep) => !file.requiredFiles.has(dep)
			)

			removedDeps.forEach((dep) =>
				this.includedFiles
					.query(dep)
					.forEach((depFile) => depFile.removeUpdateFile(file))
			)
		}

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
			if (file.isDone) continue

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
		this.isFullBuild = false
		if (!this.isCompilerActivated) return [[], fileData]

		let file = this.includedFiles.get(filePath)
		if (!file) {
			;[file] = this.includedFiles.add([filePath])
		}

		// Update file handle to use provided fileData
		file.setFileHandle({
			getFile: async () => new File([fileData], basename(filePath)),
		})

		// Load files and files that are required by this file
		await this.loadFiles.loadFile(file)
		await this.loadFiles.loadRequiredFiles(file)

		// Get files we need to load to transform this file
		const filesToLoad = file.filesToLoadForHotUpdate()
		// Load all file dependencies
		await this.loadFiles.run(
			[...filesToLoad.values()].filter((currFile) => file !== currFile),
			false
		)

		// Transform all file dependencies
		for (const file of filesToLoad) {
			if (file.isDone) continue

			file.data =
				(await this.plugins.runTransformHooks(file)) ?? file.data
		}

		// Transform original file data
		const transformedData = await this.fileTransformer.transformFile(
			file,
			true,
			true
		)

		// Reset includedFiles data
		await this.includedFiles.load(this.dashFilePath)

		return [[...filesToLoad].map((file) => file.filePath), transformedData]
	}

	async unlink(path: string, updateDashFile = true) {
		if (!this.isCompilerActivated) return

		const outputPath = await this.plugins.runTransformPathHooks(path)
		if (!outputPath) return

		await this.outputFileSystem.unlink(outputPath)
		this.includedFiles.remove(path)

		if (updateDashFile) await this.saveDashFile()
	}

	async rename(oldPath: string, newPath: string) {
		if (!this.isCompilerActivated) return

		await this.unlink(oldPath, false)
		await this.updateFiles([newPath])

		await this.saveDashFile()
	}
	async getCompilerOutputPath(filePath: string) {
		if (!this.isCompilerActivated) return

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

	protected async compileIncludedFiles(
		files: DashFile[] = this.includedFiles.all()
	) {
		await this.loadFiles.run(files)
		this.progress.advance()

		const resolvedFileOrder = this.fileOrderResolver.run(files)
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
		this.progress.addToTotal(3)
		await this.compileIncludedFiles(
			this.includedFiles.filtered((file) => file.isVirtual)
		)
	}
}
