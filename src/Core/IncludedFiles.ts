import { isMatch } from 'bridge-common-utils'
import type { Dash } from '../Dash'
import { DashFile, ISerializedDashFile } from './DashFile'

export class IncludedFiles {
	protected files = new Map<string, DashFile>()
	protected aliases = new Map<string, DashFile>()
	protected queryCache = new Map<string, DashFile[]>()

	constructor(protected dash: Dash<any>) {}

	all() {
		return [...this.files.values()]
	}
	filtered(cb: (file: DashFile) => boolean) {
		return this.all().filter((file) => cb(file))
	}
	get(fileId: string) {
		return this.aliases.get(fileId) ?? this.files.get(fileId)
	}
	addAlias(alias: string, DashFile: DashFile) {
		this.aliases.set(alias, DashFile)
	}
	queryGlob(glob: string) {
		if (this.queryCache.has(glob)) {
			return this.queryCache.get(glob)!
		}

		const files = this.filtered((file) => isMatch(file.filePath, glob))
		this.queryCache.set(glob, files)
		return files
	}

	async loadAll() {
		this.queryCache = new Map()
		const allFiles = new Set<string>()

		const packPaths = this.dash.projectConfig.getAvailablePackPaths()
		for (const packPath of packPaths) {
			const files = await this.dash.fileSystem.allFiles(packPath)

			for (const file of files) allFiles.add(file)
		}

		const includeFiles = await this.dash.plugins.runIncludeHooks()

		for (const filePath of includeFiles) {
			allFiles.add(filePath)
		}

		this.add([...allFiles])
	}
	add(filePaths: string[], isVirtual = false) {
		let files: DashFile[] = []

		for (const filePath of filePaths) {
			files.push(new DashFile(this.dash, filePath, isVirtual))
			this.files.set(filePath, files.at(-1)!)
		}

		return files
	}
	remove(filePath: string) {
		const file = this.files.get(filePath)
		if (!file) return

		this.files.delete(filePath)
		for (const alias of file.aliases) {
			this.aliases.delete(alias)
		}
	}

	async save(filePath: string) {
		this.dash.fileSystem.writeJson(
			filePath,
			this.all().map((file) => file.serialize())
		)
	}
	async load(filePath: string) {
		const sFiles: ISerializedDashFile[] =
			await this.dash.fileSystem.readJson(filePath)
		const files: DashFile[] = []

		for (const sFile of sFiles) {
			const file = new DashFile(
				this.dash,
				sFile.filePath,
				sFile.isVirtual
			)

			file.setAliases(new Set(sFile.aliases))
			file.setRequiredFiles(new Set(sFile.requiredFiles))
			files.push(file)
		}

		this.files = new Map(files.map((file) => [file.filePath, file]))

		for (let i = 0; i < files.length; i++) {
			const file = files[i]

			file.setUpdateFiles(sFiles[i].updateFiles)
		}
	}

	resetAll() {
		for (const file of this.all()) {
			file.reset()
			if (file.isVirtual) this.remove(file.filePath)
		}
	}
}
