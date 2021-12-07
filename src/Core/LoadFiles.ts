import type { Dash } from '../Dash'

export class LoadFiles {
	constructor(protected dash: Dash) {}

	async run() {
		for (const file of this.dash.includedFiles.all()) {
			const [outputPath, readData] = await Promise.all([
				this.dash.plugins.runTransformPathHooks(file.filePath),
				this.dash.plugins.runReadHooks(file.filePath, file.fileHandle),
			])

			file.setOutputPath(outputPath)
			file.setReadData(readData)

			await file.processAfterLoad()
		}

		// Now, only iterate over files that need further processing
		// (Files which only needed to be copied over)
		for (const file of this.dash.includedFiles.filtered(
			(file) => !file.isDone
		)) {
			file.setReadData(
				(await this.dash.plugins.runLoadHooks(
					file.filePath,
					file.data
				)) ?? file.data
			)

			const [aliases, requiredFiles] = await Promise.all([
				this.dash.plugins.runRegisterAliasesHooks(
					file.filePath,
					file.data
				),
				this.dash.plugins.runRequireHooks(file.filePath, file.data),
			])

			file.setAliases(aliases)
			file.setRequiredFiles(requiredFiles)
		}
	}
}
