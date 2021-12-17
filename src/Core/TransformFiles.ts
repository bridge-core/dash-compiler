import { isWritableData } from '../Common/isWritableData'
import { Dash } from '../Dash'
import type { DashFile } from './DashFile'

export class FileTransformer {
	constructor(protected dash: Dash<any>) {}

	async run(resolvedFileOrder: Set<DashFile>) {
		for (const file of resolvedFileOrder) {
			const transformedData = await this.dash.plugins.runTransformHooks(
				file
			)
			file.data ??= transformedData

			let writeData =
				(await this.dash.plugins.runFinalizeBuildHooks(file)) ??
				transformedData

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

				if (file.outputPath)
					await this.dash.outputFileSystem.writeFile(
						file.outputPath,
						writeData
					)
			}

			file.isDone = true
		}
	}
}
