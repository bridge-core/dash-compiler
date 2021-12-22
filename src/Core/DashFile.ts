import { Dash } from '../Dash'
import isGlob from 'is-glob'

export interface IFileHandle {
	getFile: () => Promise<File> | File
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

	constructor(
		protected dash: Dash<any>,
		public readonly filePath: string,
		public readonly isVirtual = false
	) {
		this.outputPath = filePath

		if (!this.isVirtual) this.setDefaultFileHandle()
	}

	setFileHandle(fileHandle: IFileHandle) {
		this.fileHandle = fileHandle
	}
	setDefaultFileHandle() {
		this.setFileHandle({
			getFile: () => this.dash.fileSystem.readFile(this.filePath),
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

	getHotUpdateChain() {
		const chain = new Set<DashFile>([this])

		for (const updateFile of this.updateFiles) {
			updateFile.getHotUpdateChain().forEach((file) => {
				if (!file.isVirtual) chain.add(file)
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
						if (!file.isVirtual) chain.add(file)
					})
			}
		}

		chain.add(this)

		if (didFileChange) {
			for (const updateFile of this.updateFiles) {
				updateFile
					.filesToLoadForHotUpdate(visited, true)
					.forEach((file) => {
						if (!file.isVirtual) chain.add(file)
					})
			}
		}

		return chain
	}

	async processAfterLoad(writeFiles: boolean) {
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
				const file = await this.dash.fileSystem.readFile(this.filePath)
				await this.dash.outputFileSystem.writeFile(
					this.outputPath,
					new Uint8Array(await file.arrayBuffer())
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
		}
	}
	reset() {
		this.isDone = false
		this.data = null
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
}
