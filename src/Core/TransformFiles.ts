import { isWritableData } from '../Common/isWritableData'
import { Dash } from '../Dash'
import type { DashFile } from './DashFile'

export class FileTransformer {
	constructor(protected dash: Dash<any>) {}

	async run(resolvedFileOrder: Set<DashFile>, skipTransform = false) {
		const promises = []

		for (const file of resolvedFileOrder) {
			if (file.isDone) continue

			let writeData = await this.transformFile(file, true, skipTransform)

			if (
				writeData !== undefined &&
				writeData !== null &&
				file.outputPath !== null &&
				file.filePath !== file.outputPath
			) {
				promises.push(
					this.dash.outputFileSystem.writeFile(
						file.outputPath,
						writeData
					)
				)
			}
		}

		await Promise.allSettled(promises)
	}

	async transformFile(
		file: DashFile,
		runFinalizeHook = false,
		skipTransform = false
	) {
		if (!skipTransform) {
			file.data =
				(await this.dash.plugins.runTransformHooks(file)) ?? file.data
		}

		if (!runFinalizeHook) return file.data

		let writeData = await this.dash.plugins.runFinalizeBuildHooks(file)
		if (writeData === undefined) writeData = file.data

		if (writeData !== undefined && writeData !== null) {
			if (!isWritableData(writeData)) {
				this.dash.console.warn(
					`File "${
						file.filePath
					}" was not in a writable format: "${typeof writeData}". Trying to JSON.stringify(...) it...`,
					writeData
				)
				writeData = JSON.stringify(writeData)
			}
		}

		file.isDone = true

		return writeData
	}
}
