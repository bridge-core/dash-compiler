import type { Dash } from '../Dash'
import { DashFile } from './DashFile'

export class LoadFiles {
	constructor(protected dash: Dash<any>) {}

	async run(files: DashFile[], writeFiles = true) {
		let promises = []

		for (const file of files) {
			// Only iterate over files that need further processing
			// (Ignore files which only needed to be copied over)
			if (file.isDone) continue

			promises.push(
				this.loadFile(file, writeFiles).then(() => {
					if (file.isDone) return
					return this.loadRequiredFiles(file)
				})
			)
		}

		await Promise.allSettled(promises)
	}

	async loadFile(file: DashFile, writeFiles = true) {
		const [outputPath, readData] = await Promise.all([
			this.dash.plugins.runTransformPathHooks(file.filePath),
			this.dash.plugins.runReadHooks(file.filePath, file.fileHandle),
		])

		file.setOutputPath(outputPath)
		file.setReadData(readData)

		await file.processAfterLoad(writeFiles)

		// If file is already done processing (no file read hook defined),
		// we can skip the rest of the compiler pipeline for this file
		if (file.isDone) return

		file.setReadData(
			(await this.dash.plugins.runLoadHooks(file.filePath, file.data)) ??
				file.data
		)

		const aliases = await this.dash.plugins.runRegisterAliasesHooks(
			file.filePath,
			file.data
		)

		file.setAliases(aliases)
	}

	async loadRequiredFiles(file: DashFile) {
		const requiredFiles = await this.dash.plugins.runRequireHooks(
			file.filePath,
			file.data
		)

		file.setRequiredFiles(requiredFiles)
	}
}
