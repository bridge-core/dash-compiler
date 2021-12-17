import { join } from 'path-browserify'
import type { Dash } from '../Dash'
import { DashFile } from './DashFile'

export class IncludedFiles {
	protected files: DashFile[] = []
	protected aliases = new Map<string, DashFile>()

	constructor(protected dash: Dash<any>) {}

	all() {
		return this.files
	}
	filtered(cb: (file: DashFile) => boolean) {
		return this.files.filter((file) => cb(file))
	}
	setFiltered(cb: (file: DashFile) => boolean) {
		this.files = this.filtered(cb)
	}
	get(fileId: string) {
		return (
			this.aliases.get(fileId) ??
			this.files.find((file) => file.filePath === fileId)
		)
	}
	addAlias(alias: string, DashFile: DashFile) {
		this.aliases.set(alias, DashFile)
	}

	async loadAll() {
		const allFiles = new Set<string>()

		const packPaths = this.dash.projectConfig.getAvailablePackPaths()
		for (const packPath of packPaths) {
			const files = await this.dash.fileSystem.allFiles(packPath)

			for (const file of files) allFiles.add(file)
		}

		const includeFiles = await this.dash.plugins.runIncludeHooks()
		for (const file of includeFiles) allFiles.add(file)

		this.files = Array.from(allFiles).map(
			(filePath) => new DashFile(this.dash, filePath)
		)
	}
}
