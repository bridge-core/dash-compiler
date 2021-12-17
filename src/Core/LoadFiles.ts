import type { Dash } from '../Dash'

export class LoadFiles {
	constructor(protected dash: Dash<any>) {}

	async run() {
		for (const file of this.dash.includedFiles.all()) {
			// Only iterate over files that need further processing
			// (Ignore files which only needed to be copied over)
			if (file.isDone) continue

			const [outputPath, readData] = await Promise.all([
				this.dash.plugins.runTransformPathHooks(file.filePath),
				this.dash.plugins.runReadHooks(file.filePath, file.fileHandle),
			])

			file.setOutputPath(outputPath)
			file.setReadData(readData)

			await file.processAfterLoad()
		}

		for (const file of this.dash.includedFiles.all()) {
			if (file.isDone) continue

			file.setReadData(
				(await this.dash.plugins.runLoadHooks(
					file.filePath,
					file.data
				)) ?? file.data
			)

			const aliases = await this.dash.plugins.runRegisterAliasesHooks(
				file.filePath,
				file.data
			)

			file.setAliases(aliases)
		}

		for (const file of this.dash.includedFiles.all()) {
			if (file.isDone) continue

			const requiredFiles = await this.dash.plugins.runRequireHooks(
				file.filePath,
				file.data
			)

			file.setRequiredFiles(requiredFiles)
		}
	}
}
