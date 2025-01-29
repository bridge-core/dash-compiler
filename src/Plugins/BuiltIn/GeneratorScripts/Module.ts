import { dirname, join } from 'pathe'
import type { FileSystem } from '../../../FileSystem/FileSystem'
import type { Console } from '../../../Common/Console'
// @ts-expect-error
import { Collection } from '@bridge-interal/collection'

declare const __fileSystem: FileSystem
declare const console: Console
declare const __omitUsedTemplates: Set<string>
declare const __baseDirectory: string

export interface IModuleOpts {
	generatorPath: string
	omitUsedTemplates: Set<string>
	fileSystem: FileSystem
	console: Console
}

interface IUseTemplateOptions {
	omitTemplate?: boolean
}

export function useTemplate(filePath: string, { omitTemplate = true }: IUseTemplateOptions = {}) {
	const templatePath = join(__baseDirectory, filePath)
	if (omitTemplate) __omitUsedTemplates.add(templatePath)

	// TODO(@solvedDev): Pipe file through compileFile API
	if (filePath.endsWith('.json')) return __fileSystem.readJson(templatePath)
	else return __fileSystem.readFile(templatePath).then(file => file.text())
}

export function createCollection() {
	return new Collection(console)
}
