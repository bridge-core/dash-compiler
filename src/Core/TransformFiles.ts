import { isWritableData } from '../Common/isWritableData'
import { Dash } from '../Dash'
import type { DashFile } from './DashFile'

export class FileTransformer {
	constructor(protected dash: Dash<any>) {}

	async run(resolvedFileOrder: Set<DashFile>, skipTransform = false) {
		for (const file of resolvedFileOrder) {
			let writeData = await this.transformFile(file, true, skipTransform)

			if (
				writeData !== undefined &&
				writeData !== null &&
				file.outputPath
			) {
				await this.dash.outputFileSystem.writeFile(
					file.outputPath,
					writeData
				)
			}

			file.isDone = true
		}
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

		let writeData =
			(await this.dash.plugins.runFinalizeBuildHooks(file)) ?? file.data

		if (writeData !== undefined && writeData !== null) {
			if (!isWritableData(writeData)) {
				console.warn(
					`File "${
						file.filePath
					}" was not in a writable format: "${typeof writeData}". Trying to JSON.stringify(...) it...`,
					writeData
				)
				writeData = JSON.stringify(writeData)
			}
		}

		return writeData
	}
}
