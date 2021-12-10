export abstract class FileSystem {
	abstract iterateDirectory(
		path: string,
		callback: (relativePath: string) => Promise<void> | void
	): Promise<void>

	abstract readFile(path: string): Promise<File>
	abstract writeFile(
		path: string,
		content: string | Uint8Array
	): Promise<void>
	abstract unlink(path: string): Promise<void>
	abstract mkdir(path: string): Promise<void>

	abstract allFiles(path: string): Promise<string[]>
	abstract readdir(path: string): Promise<IDirEntry[]>

	async writeJson(
		path: string,
		content: any,
		beautify = true
	): Promise<void> {
		await this.writeFile(
			path,
			JSON.stringify(content, null, beautify ? '\t' : 0)
		)
	}
	async readJson(path: string): Promise<any> {
		return JSON.parse(await this.readFile(path).then((file) => file.text()))
	}

	watchDirectory(
		path: string,
		onChange: (filePath: string, changeType: unknown) => void
	) {
		console.warn(
			'Watching a directory for changes is not supported on this platform!'
		)
	}
}

interface IDirEntry {
	name: string
	kind: 'file' | 'directory'
}
