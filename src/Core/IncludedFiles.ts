import { isMatch } from 'bridge-common-utils'
import isGlob from 'is-glob'
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
	query(query: string) {
		if (isGlob(query)) return this.queryGlob(query)

		const aliasedFile = this.aliases.get(query)
		if (aliasedFile) return [aliasedFile]

		const file = this.files.get(query)
		if (file) return [file]

		return []
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
			const files = await this.dash.fileSystem
				.allFiles(packPath)
				.catch((err) => {
					this.dash.console.warn(err)
					return []
				})

			for (const file of files) allFiles.add(file)
		}

		const includeFiles = await this.dash.plugins.runIncludeHooks()

		for (const includedFile of includeFiles) {
			if (typeof includedFile === 'string') allFiles.add(includedFile)
			else this.addOne(includedFile[0], includedFile[1].isVirtual)
		}

		this.add([...allFiles])
	}
	addOne(filePath: string, isVirtual = false) {
		const file = new DashFile(this.dash, filePath, isVirtual)
		this.files.set(filePath, file)
		return file
	}
	add(filePaths: string[], isVirtual = false) {
		let files: DashFile[] = []

		for (const filePath of filePaths) {
			const file = this.files.get(filePath)
			if (file) {
				files.push(file)
				continue
			}

			files.push(new DashFile(this.dash, filePath, isVirtual))
			this.files.set(filePath, files[files.length - 1])
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
		await this.dash.fileSystem.writeJson(
			filePath,
			this.all().map((file) => file.serialize())
		)
	}
	async load(filePath: string) {
		this.removeAll()

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
			file.setMetadata(sFile.metadata)
			files.push(file)

			for (const alias of sFile.aliases) {
				this.aliases.set(alias, file)
			}
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
		}
	}
	removeAll() {
		this.files = new Map()
		this.aliases = new Map()
		this.queryCache = new Map()
	}
}
