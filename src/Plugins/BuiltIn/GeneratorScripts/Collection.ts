import { Console } from '../../../Common/Console'

export class Collection {
	protected files = new Map<string, any>()
	constructor(protected console: Console) {}

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
		if (this.files.has(filePath)) {
			this.console.warn(
				`Omitting file "${filePath}" from collection because it would overwrite a previously generated file!`
			)
			return
		}
		this.files.set(filePath, fileContent)
	}
	addFrom(collection: Collection) {
		for (const [filePath, fileContent] of collection.getAll()) {
			this.add(filePath, fileContent)
		}
	}
}