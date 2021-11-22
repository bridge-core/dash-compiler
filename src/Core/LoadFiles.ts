import type { Dash } from '../Dash'
import { IncludedFiles } from './IncludedFiles'

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

		// Remove all files that don't need further processing
		// (Files which only needed to be copied over)
		this.dash.includedFiles.setFiltered((file) => !file.isDone)

		for (const file of this.dash.includedFiles.all()) {
			const [readData, aliases] = await Promise.all([
				this.dash.plugins.runLoadHooks(file.filePath, file.data),
				this.dash.plugins.runRegisterAliasesHooks(
					file.filePath,
					file.data
				),
			])

			file.setReadData(readData ?? file.data)
			file.setAliases(aliases)
		}
	}
}
