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
	public lastModified: number = 0
	// TODO(@solvedDev): Test adding a file hash property that helps determining whether a file gets rewritten to disk
	// Could help with compilation speed of platforms with low file writing speeds (File System Access API)

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
		this.requiredFiles = new Set<string>(
			[...requiredFiles]
				.map((filePath) => {
					if (isGlob(filePath))
						return this.dash.includedFiles
							.queryGlob(filePath)
							.map((file) => file.filePath)
					return filePath
				})
				.flat()
		)
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
			lastModified: this.lastModified,
			aliases: [...this.aliases],
			requiredFiles: [...this.requiredFiles],
		}
	}
	reset() {
		this.isDone = false
		this.data = null
		this.setDefaultFileHandle()
	}
}
