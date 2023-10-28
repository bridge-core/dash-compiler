import type { Dash } from '../Dash'
import { DashFile } from './DashFile'

export class LoadFiles {
	public copyFilePromises: Promise<void>[] = []
	constructor(protected dash: Dash<any>) {}

	async run(files: DashFile[], writeFiles = true) {
		this.copyFilePromises = []

		let promises = []

		for (const file of files) {
			// Only iterate over files that need further processing
			// (Ignore files which only needed to be copied over)
			if (file.isDone) continue

			promises.push(this.loadFile(file, writeFiles))
		}

		await Promise.allSettled(promises)

		// All aliases need to be defined before requiring files
		// That's why we need to loop over all files again
		await Promise.allSettled(
			files.map(async file => {
				const requiredFiles = await this.dash.plugins.runRequireHooks(file)
				file.setRequiredFiles(requiredFiles)
			})
		)
	}

	async loadFile(file: DashFile, writeFiles = true) {
		const [_, outputPath] = await Promise.all([
			this.dash.plugins.runIgnoreHooks(file),
			this.dash.plugins.runTransformPathHooks(file),
		])

		const readData = await this.dash.plugins.runReadHooks(file)

		file.setOutputPath(outputPath)
		file.setReadData(readData)

		file.processAfterLoad(writeFiles, this.copyFilePromises)

		// If file is already done processing (no file read hook defined),
		// we can skip the rest of the compiler pipeline for this file
		if (file.isDone || outputPath === null) return

		file.setReadData((await this.dash.plugins.runLoadHooks(file)) ?? file.data)

		const aliases = await this.dash.plugins.runRegisterAliasesHooks(file)

		file.setAliases(aliases)
	}

	async awaitAllFilesCopied() {
		if (this.copyFilePromises.length === 0) return

		await Promise.allSettled(this.copyFilePromises)
		this.copyFilePromises = []
	}
}
