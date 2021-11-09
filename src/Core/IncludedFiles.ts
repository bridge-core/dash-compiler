import { join } from 'path-browserify'
import type { Dash } from '../Dash'

export class IncludedFiles {
	protected files: string[] = []

	constructor(protected dash: Dash) {}

	all() {
		return this.files
	}
	filtered(cb: (filePath: string) => boolean) {
		return this.files.filter(cb)
	}

	async loadAll() {
		const allFiles = new Set<string>()

		const packPaths = this.dash.projectConfig.getAvailablePackPaths()
		for (const packPath of packPaths) {
			const files = await this.dash.fileSystem.allFiles(packPath)

			for (const file of files) allFiles.add(join(packPath, file))
		}

		const includeFiles = await this.dash.plugins.runIncludeHooks()
		for (const file of includeFiles) allFiles.add(file)

		this.files = Array.from(allFiles)
	}
}
