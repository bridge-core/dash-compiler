import { Dash } from '../Dash'

export class DashFile {
	public outputPath: string | null
	public isDone = false
	public data: any
	public readonly fileHandle: { getFile: () => Promise<File> | File }
	public aliases = new Set<string>()
	public requiredFiles = new Set<string>()

	constructor(protected dash: Dash, public readonly filePath: string) {
		this.outputPath = filePath

		this.fileHandle = {
			getFile: () => this.dash.fileSystem.readFile(filePath),
		}
	}

	setOutputPath(outputPath: string | null) {
		this.outputPath = outputPath
	}
	setReadData(data: any) {
		this.data = data
	}
	setAliases(aliases: Set<string>) {
		this.aliases = aliases
	}
	setRequiredFiles(requiredFiles: Set<string>) {
		this.requiredFiles = requiredFiles
	}

	async processAfterLoad() {
		// Nothing to load -> Nothing more to do in the next compile steps
		if (this.data === null || this.data === undefined) {
			this.isDone = true

			// If the outputPath was set, we need to copy the file over to the output though
			if (this.filePath !== this.outputPath && this.outputPath !== null) {
				const file = await this.dash.fileSystem.readFile(this.filePath)
				await this.dash.outputFileSystem.writeFile(
					this.outputPath,
					new Uint8Array(await file.arrayBuffer())
				)
			}
		}
	}
}
