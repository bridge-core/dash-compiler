import { ProjectConfig } from '@bridge-editor/mc-project-core'
import { FileSystem } from './FileSystem/FileSystem'
import { dirname } from 'pathe'

export class DashProjectConfig extends ProjectConfig {
	constructor(protected fileSystem: FileSystem, protected configPath: string) {
		super(dirname(configPath))
	}

	readConfig() {
		return this.fileSystem.readJson(this.configPath)
	}
	writeConfig(configJson: any) {
		return this.fileSystem.writeJson(this.configPath, configJson)
	}
}
