import { join } from 'pathe'
import json5 from 'json5'

export interface IDirEntry {
	name: string
	kind: 'file' | 'directory'
}
export abstract class FileSystem {
	abstract readFile(path: string): Promise<File>
	abstract writeFile(path: string, content: string | Uint8Array): Promise<void>
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
	async directoryHasAnyFile(path: string) {
		const entries = await this.readdir(path).catch(() => [])
		return entries.length > 0
	}

	async copyFile(from: string, to: string, outputFs = this) {
		const file = await this.readFile(from)
		await outputFs.writeFile(to, new Uint8Array(await file.arrayBuffer()))
	}
	async writeJson(path: string, content: any, beautify = true): Promise<void> {
		await this.writeFile(path, JSON.stringify(content, null, beautify ? '\t' : 0))
	}
	async readJson(path: string): Promise<any> {
		const file = await this.readFile(path)
		try {
			return await json5.parse(await file.text())
		} catch {
			throw new Error(`Invalid JSON: ${path}`)
		}
	}
	abstract lastModified(filePath: string): Promise<number>

	watchDirectory(path: string, onChange: (filePath: string, changeType: unknown) => void) {
		console.warn('Watching a directory for changes is not supported on this platform!')
	}
}
