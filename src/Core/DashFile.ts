import { Dash } from '../Dash'
import type { THookType } from '../Plugins/AllPlugins'
import type { Plugin } from '../Plugins/Plugin'

export interface IFileHandle {
	getFile: () => Promise<File | null> | File | null
}
export class DashFile {
	public outputPath: string | null
	public isDone = false
	public data: any
	public fileHandle?: IFileHandle
	public requiredFiles = new Set<string>()
	public aliases = new Set<string>()
	// public lastModified: number = 0
	protected updateFiles = new Set<DashFile>()
	protected metadata = new Map<string, any>()
	protected ignoredByPlugins = new Set<string>()
	protected _myImplementedHooks: Map<THookType, Plugin[]> | null = null
	protected _cachedFile: Promise<File | null> | null = null

	constructor(
		protected dash: Dash<any>,
		public readonly filePath: string,
		public readonly isVirtual = false
	) {
		this.outputPath = filePath

		if (!this.isVirtual) this.setDefaultFileHandle()
	}

	isIgnoredBy(pluginId: string) {
		return this.ignoredByPlugins.has(pluginId)
	}
	addIgnoredPlugin(pluginId: string) {
		this.ignoredByPlugins.add(pluginId)
	}
	createImplementedHooksMap() {
		this._myImplementedHooks = new Map<THookType, Plugin[]>()

		for (const [
			hookType,
			plugins,
		] of this.dash.plugins.getImplementedHooks()) {
			const availablePlugins = plugins.filter(
				(plugin) => !this.isIgnoredBy(plugin.pluginId)
			)
			this._myImplementedHooks.set(hookType, availablePlugins)
		}

		const readHooks = this.myImplementedHooks.get('read') ?? []
		const hasReadHooks = readHooks.length > 0

		if (hasReadHooks) {
			this._cachedFile = this.dash.fileSystem
				.readFile(this.filePath)
				.catch(() => null)
		}
	}
	get myImplementedHooks() {
		if (this._myImplementedHooks) return this._myImplementedHooks

		throw new Error(
			`Tried to access implemented hooks before they were created`
		)
	}

	setFileHandle(fileHandle: IFileHandle) {
		this.fileHandle = fileHandle
	}
	setDefaultFileHandle() {
		this.setFileHandle({
			getFile: () => this._cachedFile,
		})
	}

	setOutputPath(outputPath: string | null) {
		this.outputPath = outputPath
	}
	setReadData(data: any) {
		this.data = data
	}
	setAliases(aliases: Set<string>) {
		for (const alias of aliases)
			this.dash.includedFiles.addAlias(alias, this)

		this.aliases = aliases
	}
	setRequiredFiles(requiredFiles: Set<string>) {
		this.requiredFiles = requiredFiles
	}
	addRequiredFile(filePath: string) {
		this.requiredFiles.add(filePath)
	}
	setUpdateFiles(files: string[]) {
		this.updateFiles = new Set<DashFile>(
			<DashFile[]>(
				files
					.map((filePath) => this.dash.includedFiles.get(filePath))
					.filter((file) => file !== undefined)
			)
		)
	}
	addUpdateFile(file: DashFile) {
		this.updateFiles.add(file)
	}
	removeUpdateFile(file: DashFile) {
		this.updateFiles.delete(file)
	}

	setMetadata(from?: IMetadata) {
		if (typeof from === 'object')
			this.metadata = new Map(Object.entries(from))
	}
	addMetadata(key: string, value: any) {
		this.metadata.set(key, value)
	}
	deleteMetadata(key: string) {
		this.metadata.delete(key)
	}
	getMetadata(key: string) {
		return this.metadata.get(key)
	}
	getAllMetadata() {
		return Object.fromEntries(this.metadata.entries())
	}

	getHotUpdateChain() {
		const chain = new Set<DashFile>([this])

		for (const updateFile of this.updateFiles) {
			updateFile.getHotUpdateChain().forEach((file) => {
				chain.add(file)
			})
		}

		return chain
	}
	filesToLoadForHotUpdate(
		visited = new Set<DashFile>(),
		didFileChange = true
	) {
		const chain = new Set<DashFile>()

		if (visited.has(this)) return chain
		visited.add(this)

		for (const depFileId of this.requiredFiles) {
			const depFiles = this.dash.includedFiles.query(depFileId)

			for (const depFile of depFiles) {
				depFile
					.filesToLoadForHotUpdate(visited, false)
					.forEach((file) => {
						chain.add(file)
					})
			}
		}

		chain.add(this)

		if (didFileChange) {
			for (const updateFile of this.updateFiles) {
				updateFile
					.filesToLoadForHotUpdate(visited, true)
					.forEach((file) => {
						chain.add(file)
					})
			}
		}

		return chain
	}

	processAfterLoad(writeFiles: boolean, copyFilePromises: Promise<void>[]) {
		// Nothing to load -> Nothing more to do in the next compile steps
		if (this.data === null || this.data === undefined) {
			this.isDone = true

			// If the outputPath was set, we need to copy the file over to the output though
			if (
				this.filePath !== this.outputPath &&
				this.outputPath !== null &&
				!this.isVirtual &&
				writeFiles
			) {
				copyFilePromises.push(
					this.dash.fileSystem.copyFile(
						this.filePath,
						this.outputPath,
						this.dash.outputFileSystem
					)
				)
			}
		}
	}

	serialize() {
		return {
			isVirtual: this.isVirtual,
			filePath: this.filePath,
			// lastModified: this.lastModified,
			aliases: [...this.aliases],
			requiredFiles: [...this.requiredFiles],
			updateFiles: [...this.updateFiles].map((file) => file.filePath),
			metadata:
				this.metadata.size > 0
					? Object.fromEntries(this.metadata.entries())
					: undefined,
		}
	}
	reset() {
		this.isDone = false
		this.data = null
		this._myImplementedHooks = null
		this._cachedFile = null
		if (!this.isVirtual) this.setDefaultFileHandle()
	}
}

export interface ISerializedDashFile {
	isVirtual: boolean
	filePath: string
	// lastModified: number
	aliases: string[]
	requiredFiles: string[]
	updateFiles: string[]
	metadata?: IMetadata
}

export interface IMetadata {
	generatedFiles?: string[]
	[key: string]: any
}
