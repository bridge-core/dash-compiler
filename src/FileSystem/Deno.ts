import { FileSystem } from './FileSystem.ts'
import { basename, join } from 'path'

export class DenoFileSystem extends FileSystem {
	constructor(protected basePath: string) {
		super()
	}

	async readFile(path: string) {
		return new File([await Deno.readFile(path)], basename(path))
	}
	async writeFile(path: string, content: string | Uint8Array) {
		if (typeof content === 'string') await Deno.writeTextFile(path, content)
		else await Deno.writeFile(path, content)
	}
	unlink(path: string) {
		return Deno.remove(path, { recursive: true })
	}
	mkdir(path: string) {
		return Deno.mkdir(path, { recursive: true })
	}

	async iterateDirectory(
		path: string,
		callback: (relativePath: string) => Promise<void> | void,
		relativePath = ''
	) {
		const entries = Deno.readDir(path)

		for await (const entry of entries) {
			const relPath =
				relativePath === ''
					? entry.name
					: join(relativePath, entry.name)
			const fullPath = join(path, entry.name)

			if (entry.isDirectory) {
				await this.iterateDirectory(fullPath, callback)
			} else if (entry.isFile) {
				await callback(relPath)
			} else {
				console.warn(`Ignoring symlink @ ${fullPath}`)
			}
		}
	}
}
