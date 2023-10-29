import { FileSystem } from './FileSystem/FileSystem'
import { DashProjectConfig } from './DashProjectConfig'
import { basename, dirname, join } from 'path-browserify'
import { AllPlugins } from './Plugins/AllPlugins'
import { IncludedFiles } from './Core/IncludedFiles'
import { LoadFiles } from './Core/LoadFiles'
import { ResolveFileOrder } from './Core/ResolveFileOrder'
import { FileTransformer } from './Core/TransformFiles'
import { FileType, PackType } from 'mc-project-core'
import { DashFile } from './Core/DashFile'
import { Progress } from './Core/Progress'
import { Console } from './Common/Console'
import { DefaultConsole } from './Common/DefaultConsole'
import { JsRuntime } from './Common/JsRuntime'
import { MoLang, expressions } from 'molang'
import { initRuntimes as initBridgeJsRuntimes } from 'bridge-js-runtime'
import initSwc from '@swc/wasm-web'

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
	 * A console to use for logging
	 */
	console?: Console

	/**
	 * An environment for the plugins to execute in
	 */
	pluginEnvironment?: any

	/**
	 * Whether to enable verbose logging
	 */
	verbose?: boolean

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
	public buildType = 'fullBuild'
	public readonly console: Console
	public jsRuntime: JsRuntime

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
		this.console = options.console ?? new DefaultConsole(options.verbose)
		this.jsRuntime = new JsRuntime(this.fileSystem, [
			['@molang/expressions', expressions],
			['@molang/core', { MoLang }],
			[
				'molang',
				{
					MoLang,
					...expressions,
				},
			],
			['@bridge/compiler', { mode: options.mode }],
		])

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
		try {
			await this.projectConfig.setup()
		} catch (err) {
			this.console.error('Failed to load project config: ' + err)
		}

		this.fileType?.setProjectConfig(this.projectConfig)
		this.packType?.setProjectConfig(this.projectConfig)

		await this.fileType?.setup(setupArg)
		await this.packType?.setup(setupArg)

		await this.plugins.loadPlugins(this.options.pluginEnvironment)
	}

	async reload() {
		try {
			await this.projectConfig.refreshConfig()
		} catch {}

		await this.plugins.loadPlugins(this.options.pluginEnvironment)
	}

	/**
	 * Omitting the "compiler" property from the project config
	 * or setting it to false will disable the compiler.
	 */
	get isCompilerActivated() {
		const config = this.projectConfig.get()

		return config.compiler !== undefined && Array.isArray(config.compiler.plugins)
	}

	async build() {
		this.console.log('Starting compilation...')
		if (!this.isCompilerActivated) return

		// Clear module cache
		this.jsRuntime.clearCache()

		this.buildType = 'fullBuild'
		this.includedFiles.removeAll()

		const startTime = Date.now()
		this.progress.setTotal(7)

		this.console.time('[HOOK] Build start')
		await this.plugins.runBuildStartHooks()
		this.console.timeEnd('[HOOK] Build start')
		this.progress.advance()

		await this.includedFiles.loadAll()
		this.progress.advance()

		await this.compileIncludedFiles()

		this.console.time('[HOOK] Build end')
		await this.plugins.runBuildEndHooks()
		this.console.timeEnd('[HOOK] Build end')
		this.progress.advance()

		if (this.getMode() === 'development') await this.saveDashFile()
		this.includedFiles.resetAll()

		this.progress.advance()

		this.console.log(
			`Dash compiled ${this.includedFiles.all().length} files in ${Date.now() - startTime}ms!`
		)

		// TODO(@solvedDev): Packaging scripts to e.g. export as .mcaddon
	}

	async updateFiles(filePaths: string[], saveDashFile = true) {
		if (!this.isCompilerActivated || filePaths.length === 0) return
		this.buildType = 'hotUpdate'

		// Clear module cache
		this.jsRuntime.clearCache()

		this.progress.setTotal(8)

		// Update files in output
		this.console.log(`Dash is starting to update ${filePaths.length} files...`)

		await this.includedFiles.load(this.dashFilePath)
		await this.plugins.runBuildStartHooks()

		const files: DashFile[] = []
		for (const filePath of filePaths) {
			let file = this.includedFiles.get(filePath)
			if (!file) {
				;[file] = await this.includedFiles.add([filePath])
			}

			files.push(file)
		}
		this.progress.advance() // 1

		const oldDeps: Set<string>[] = []
		for (const file of files) {
			oldDeps.push(new Set([...file.requiredFiles]))
		}

		this.progress.advance() // 2

		// Load files and files that are required by these files
		await this.loadFiles.run(files)

		this.progress.advance() // 3

		for (let i = 0; i < files.length; i++) {
			const file = files[i]
			const newDeps = [...file.requiredFiles].filter(dep => !oldDeps[i].has(dep))

			newDeps.forEach(dep =>
				this.includedFiles.query(dep).forEach(depFile => depFile.addUpdateFile(file))
			)

			const removedDeps = [...oldDeps[i]].filter(dep => !file.requiredFiles.has(dep))

			removedDeps.forEach(dep =>
				this.includedFiles.query(dep).forEach(depFile => depFile.removeUpdateFile(file))
			)
		}

		this.progress.advance() // 4

		const filesToLoad = new Set(files.map(file => [...file.filesToLoadForHotUpdate()]).flat())
		this.console.log(`Dash is loading ${filesToLoad.size} files...`)
		await this.loadFiles.run([...filesToLoad.values()].filter(currFile => !files.includes(currFile)))

		this.progress.advance() // 5

		const filesToTransform = new Set(files.map(file => [...file.getHotUpdateChain()]).flat())

		for (const file of filesToLoad) {
			if (file.isDone) continue

			file.data = (await this.plugins.runTransformHooks(file)) ?? file.data

			if (!filesToTransform.has(file)) file.isDone = true
		}

		this.progress.advance() // 6

		this.console.log(`Dash is compiling ${filesToTransform.size} files...`)

		// We need to run the whole transformation pipeline
		await this.fileTransformer.run(filesToTransform, true)

		// Await that all files have been copied over
		await this.loadFiles.awaitAllFilesCopied()

		this.progress.advance() // 7

		await this.plugins.runBuildEndHooks()

		if (saveDashFile) await this.saveDashFile()
		this.includedFiles.resetAll()
		this.console.log(`Dash finished updating ${filesToTransform.size} files!`)

		this.progress.advance() // 8
	}
	async compileFile(filePath: string, fileData: Uint8Array): Promise<[string[], any]> {
		if (!this.isCompilerActivated) return [[], fileData]
		this.buildType = 'fileRequest'

		// Clear module cache
		this.jsRuntime.clearCache()

		this.progress.setTotal(7)

		await this.plugins.runBuildStartHooks()
		await this.includedFiles.load(this.dashFilePath)

		let file = this.includedFiles.get(filePath)
		if (!file) {
			;[file] = await this.includedFiles.add([filePath])
		}

		// Update file handle to use provided fileData
		file.setFileHandle({
			getFile: async () => new File([fileData], basename(filePath)),
		})

		// Load files and files that are required by this file
		await this.loadFiles.loadFile(file, false)

		this.progress.advance() // 1

		// Get files we need to load to transform this file
		const filesToLoad = file.filesToLoadForHotUpdate()
		// Load all file dependencies
		await this.loadFiles.run(
			[...filesToLoad.values()].filter(currFile => file !== currFile),
			false
		)

		this.progress.advance() // 2

		// Transform all file dependencies
		for (const file of filesToLoad) {
			if (file.isDone) continue

			file.data = (await this.plugins.runTransformHooks(file)) ?? file.data
		}

		this.progress.advance() // 3

		// Transform original file data
		const transformedData = await this.fileTransformer.transformFile(file, true, true)

		this.progress.advance() // 4

		// Reset includedFiles data
		await this.includedFiles.load(this.dashFilePath)

		this.progress.advance() // 5

		await this.plugins.runBuildEndHooks()

		return [[...filesToLoad].map(file => file.filePath), transformedData]
	}

	async unlinkMultiple(paths: string[], saveDashFile = true, onlyChangeOutput = false) {
		if (!this.isCompilerActivated || paths.length === 0) return

		const errors: Error[] = []

		for (const path of paths) {
			await this.unlink(path, false, onlyChangeOutput).catch(err => errors.push(err))
		}

		if (errors.length > 0) {
			throw errors[0]
		}

		if (saveDashFile) await this.saveDashFile()
	}

	async unlink(path: string, updateDashFile = true, onlyChangeOutput = false) {
		if (!this.isCompilerActivated) return

		const outputPath = await this.getCompilerOutputPath(path)
		if (!outputPath || outputPath === path) return

		if (!onlyChangeOutput) {
			await this.plugins.runBeforeFileUnlinked(path)
			this.includedFiles.remove(path)
		}

		await this.outputFileSystem.unlink(outputPath)

		if (updateDashFile) await this.saveDashFile()
	}

	async rename(oldPath: string, newPath: string) {
		if (!this.isCompilerActivated) return

		await this.unlink(oldPath, false)
		await this.updateFiles([newPath], false)

		await this.saveDashFile()
	}
	async getCompilerOutputPath(filePath: string) {
		if (!this.isCompilerActivated) return

		const includedFile: DashFile = this.includedFiles.get(filePath) ?? new DashFile(this, filePath)
		if (includedFile && includedFile.outputPath !== filePath)
			return includedFile.outputPath ?? undefined

		const outputPath = await this.plugins.runTransformPathHooks(includedFile)
		if (!outputPath) return

		return outputPath
	}
	async getFileMetadata(filePath: string) {
		if (!this.isCompilerActivated) return

		const includedFile = this.includedFiles.get(filePath)
		if (includedFile) return includedFile.getAllMetadata()

		return null
	}

	async getFileDependencies(filePath: string) {
		if (!this.isCompilerActivated) return []

		await this.includedFiles.load(this.dashFilePath)

		const file = this.includedFiles.get(filePath)
		if (!file) return []

		return <string[]>(
			[...file.filesToLoadForHotUpdate()]
				.map(file => (file.isVirtual ? file.outputPath : file.filePath))
				.filter(currFilePath => currFilePath !== null && currFilePath !== filePath)
		)
	}

	// Save compiler data
	protected async saveDashFile() {
		await this.includedFiles.save(this.dashFilePath)
	}

	protected async compileIncludedFiles(files: DashFile[] = this.includedFiles.all()) {
		this.console.time('Loading files...')
		await this.loadFiles.run(files)
		this.console.timeEnd('Loading files...')
		this.progress.advance()

		this.console.time('Resolving file order...')
		const resolvedFileOrder = this.fileOrderResolver.run(files)
		this.console.timeEnd('Resolving file order...')
		this.progress.advance()

		// this.console.log(resolvedFileOrder)
		this.console.time('Transforming files...')
		await this.fileTransformer.run(resolvedFileOrder)
		this.console.timeEnd('Transforming files...')
		this.progress.advance()

		await this.loadFiles.awaitAllFilesCopied()
	}

	/**
	 * Virtual files are files created by compiler plugins.
	 * Updating them is much simpler than update normal files so we have this dedicated method for them.
	 * @param filePaths
	 */
	async compileAdditionalFiles(filePaths: string[], virtual = true) {
		const virtualFiles = await this.includedFiles.add(filePaths, virtual)
		this.progress.addToTotal(3)

		virtualFiles.forEach(virtual => virtual.reset())
		await this.compileIncludedFiles(virtualFiles)
	}
}

export function initRuntimes(wasmLocation: string) {
	initBridgeJsRuntimes(wasmLocation)

	initSwc(wasmLocation)
}
