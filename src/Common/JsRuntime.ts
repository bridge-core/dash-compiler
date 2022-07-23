import { Runtime } from 'bridge-js-runtime'
import { FileSystem } from '../FileSystem/FileSystem'

export class JsRuntime extends Runtime {
	constructor(protected fs: FileSystem, modules?: [string, any][]) {
		super(modules)
	}
	protected readFile(filePath: string) {
		return this.fs.readFile(filePath).then((file) => file.text())
	}

	deleteModule(moduleName: string) {
		this.baseModules.delete(moduleName)
	}
}
