import { Dash } from '../Dash'
import { DashFile } from './DashFile'

export class ResolveFileOrder {
	constructor(protected dash: Dash<any>) {}

	run() {
		// TODO(@solvedDev): Store hot update chains in separate sets. This could enable some significant speed boosts in the future
		const resolved = new Set<DashFile>()

		for (const file of this.dash.includedFiles.all()) {
			if (file.isDone || resolved.has(file)) continue

			this.resolve(file, resolved, new Set<DashFile>())
		}

		return resolved
	}

	protected resolve(
		file: DashFile,
		resolved: Set<DashFile>,
		unresolved: Set<DashFile>
	) {
		const files = this.dash.includedFiles
		unresolved.add(file)

		for (const depFileId of file.requiredFiles) {
			const depFile = files.get(depFileId)
			if (!depFile)
				throw new Error(
					`Undefined file dependency: "${file.filePath}" requires "${depFileId}"`
				)

			if (!resolved.has(depFile)) {
				if (unresolved.has(depFile))
					throw new Error('Circular dependency detected!')
				this.resolve(depFile, resolved, unresolved)
			}
		}

		resolved.add(file)
		unresolved.delete(file)
	}
}
