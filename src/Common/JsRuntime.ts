import { Runtime } from 'bridge-js-runtime'
import { FileSystem } from '../FileSystem/FileSystem'

export class JsRuntime extends Runtime {
	constructor(protected fs: FileSystem, modules?: [string, any][]) {
		super(modules)
	}
	readFile(filePath: string) {
		return this.fs.readFile(filePath)
	}

	deleteModule(moduleName: string) {
		this.baseModules.delete(moduleName)
	}
}
