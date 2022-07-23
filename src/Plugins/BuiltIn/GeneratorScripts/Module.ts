import { dirname, join } from 'path-browserify'
import { FileSystem } from '../../../FileSystem/FileSystem'
import { Console } from '../../../Common/Console'
import { Collection } from './Collection'

export interface IModuleOpts {
	generatorPath: string
	omitUsedTemplates: Set<string>
	fileSystem: FileSystem
	console: Console
}

export function createModule({
	generatorPath,
	omitUsedTemplates,
	fileSystem,
	console,
}: IModuleOpts) {
	return {
		useTemplate: (filePath: string, omitTemplate = true) => {
			if (omitTemplate)
				omitUsedTemplates.add(join(dirname(generatorPath), filePath))

			// TODO(@solvedDev): Pipe file through compileFile API
			if (filePath.endsWith('.json')) return fileSystem.readJson(filePath)
			else
				return fileSystem.readFile(filePath).then((file) => file.text())
		},
		createCollection: () => new Collection(console),
	}
}
