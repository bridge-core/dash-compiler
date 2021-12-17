import { join } from 'path-browserify'

export interface IDirEntry {
	name: string
	kind: 'file' | 'directory'
}
export abstract class FileSystem {
	abstract readFile(path: string): Promise<File>
	abstract writeFile(
		path: string,
		content: string | Uint8Array
	): Promise<void>
	abstract unlink(path: string): Promise<void>

	abstract readdir(path: string): Promise<IDirEntry[]>
	abstract mkdir(path: string): Promise<void>
	async allFiles(path: string) {
		const files: string[] = []
		const entries = await this.readdir(path)

		for (const { name, kind } of entries) {
			if (kind === 'directory') {
				files.push(...(await this.allFiles(join(path, name))))
			} else if (kind === 'file') {
				files.push(join(path, name))
			}
		}

		return files
	}

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
	abstract lastModified(filePath: string): Promise<number>

	watchDirectory(
		path: string,
		onChange: (filePath: string, changeType: unknown) => void
	) {
		console.warn(
			'Watching a directory for changes is not supported on this platform!'
		)
	}
}
