import { FileSystem, IDirEntry } from '../FileSystem/FileSystem'
import { promises as fs, existsSync } from 'fs'
import { basename, dirname, join } from 'path-browserify'
import { Dash } from '../Dash'
import { PackType } from 'mc-project-core'

export class NodeFileSystem extends FileSystem {
	constructor() {
		super()
	}

	async readFile(path: string): Promise<File> {
		const file = await fs.readFile(path, 'utf8')

		return new File([file], basename(path))
	}
	async writeFile(path: string, content: string | Uint8Array): Promise<void> {
		await fs.mkdir(dirname(path), { recursive: true })
		return fs.writeFile(path, content)
	}
	async unlink(path: string): Promise<void> {
		if ((await fs.stat(path)).isDirectory()) await fs.rmdir(path)
		else await fs.unlink(path)
	}
	async readdir(path: string): Promise<IDirEntry[]> {
		if (!existsSync(path))
			throw new Error(`Directory ${path} does not exist`)

		let entries = await fs
			.readdir(path, {
				withFileTypes: true,
			})
			.catch(() => [])

		return entries.map((entry) => ({
			name: entry.name,
			kind: entry.isDirectory() ? 'directory' : 'file',
		}))
	}
	async mkdir(path: string): Promise<void> {
		await fs.mkdir(path, { recursive: true })
	}
}

if (require.main === module) {
	const fs = new NodeFileSystem()
	class PackTypeImpl extends PackType<void> {
		async setup() {
			this.packTypes = await fetch(
				'https://raw.githubusercontent.com/bridge-core/editor-packages/main/packages/minecraftBedrock/packDefinitions.json'
			).then((resp) => resp.json())
		}
	}
	const dash = new Dash<void>(fs, undefined, {
		config: join(process.cwd(), 'config.json'),
		packType: new PackTypeImpl(undefined),
	})

	dash.setup().then(() => {
		dash.build()
	})
}
