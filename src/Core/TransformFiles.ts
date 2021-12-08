import { isWritableData } from '../Common/isWritableData'
import { Dash } from '../Dash'
import type { DashFile } from './DashFile'

export class FileTransformer {
	constructor(protected dash: Dash) {}

	async run(resolvedFileOrder: Set<DashFile>) {
		for (const file of resolvedFileOrder) {
			const transformedData = await this.dash.plugins.runTransformHooks(
				file
			)
			file.data ??= transformedData

			let writeData =
				(await this.dash.plugins.runFinalizeBuildHooks(file)) ??
				transformedData

			if (writeData !== undefined && writeData !== undefined) {
				if (!isWritableData(writeData)) {
					console.warn(
						`File "${
							file.filePath
						}" was not in a writable format: "${typeof writeData}". Trying to JSON.stringify(...) it...`,
						writeData
					)
					writeData = JSON.stringify(writeData)
				}

				await this.dash.outputFileSystem.writeFile(
					file.filePath,
					writeData
				)
			}

			file.isDone = true
		}
	}
}
