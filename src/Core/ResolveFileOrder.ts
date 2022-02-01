import { Dash } from '../Dash'
import { DashFile } from './DashFile'

export class ResolveFileOrder {
	constructor(protected dash: Dash<any>) {}

	run(files: DashFile[]) {
		// TODO(@solvedDev): Store hot update chains in separate sets. This could enable some significant speed boosts in the future
		const resolved = new Set<DashFile>()

		for (const file of files) {
			if (file.isDone || resolved.has(file)) continue

			this.resolveSingle(file, resolved)
		}

		return resolved
	}

	resolveSingle(
		file: DashFile,
		resolved: Set<DashFile>,
		unresolved = new Set<DashFile>()
	) {
		const files = this.dash.includedFiles
		unresolved.add(file)

		for (const depFileId of file.requiredFiles) {
			const depFiles = files.query(depFileId)

			for (const depFile of depFiles) {
				if (!depFile) {
					this.dash.console.error(
						`Undefined file dependency: "${file.filePath}" requires "${depFileId}"`
					)
					continue
				}

				depFile.addUpdateFile(file)

				if (!resolved.has(depFile)) {
					if (unresolved.has(depFile)) {
						this.dash.console.error(
							`Circular dependency detected: ${depFile.filePath} is required by ${file.filePath} but also depends on this file.`
						)
						continue
					}

					this.resolveSingle(depFile, resolved, unresolved)
				}
			}
		}

		resolved.add(file)
		unresolved.delete(file)
	}
}
