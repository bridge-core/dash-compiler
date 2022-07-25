import { join } from 'path-browserify'
import { Console } from '../../../Common/Console'

export class Collection {
	protected files = new Map<string, any>()
	constructor(protected console: Console, protected baseDir?: string) {}

	get hasFiles() {
		return this.files.size > 0
	}

	getAll() {
		return [...this.files.entries()]
	}

	get(filePath: string) {
		return this.files.get(filePath)
	}

	clear() {
		this.files.clear()
	}
	add(filePath: string, fileContent: any) {
		const resolvedPath = this.baseDir
			? join(this.baseDir, filePath)
			: filePath
		if (this.files.has(resolvedPath)) {
			this.console.warn(
				`Omitting file "${resolvedPath}" from collection because it would overwrite a previously generated file!`
			)
			return
		}
		this.files.set(resolvedPath, fileContent)
	}
	has(filePath: string) {
		return this.files.has(filePath)
	}
	addFrom(collection: Collection) {
		for (const [filePath, fileContent] of collection.getAll()) {
			this.add(filePath, fileContent)
		}
	}
}
