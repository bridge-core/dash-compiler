import { TCompilerPlugin } from './TCompilerPlugin'
import { FileSystem } from '../FileSystem/FileSystem'
import { DashProjectConfig } from '../DashProjectConfig'
import { FileType, PackType } from 'mc-project-core'
import { Console } from '../Common/Console'

export type TCompilerPluginFactory<T = void> = (context: {
	options: T & {
		mode: 'development' | 'production'
		buildType: 'fileRequest' | 'fullBuild' | 'hotUpdate'
	}
	console: Console
	fileSystem: FileSystem
	outputFileSystem: FileSystem
	projectConfig: DashProjectConfig
	packType: PackType<any>
	fileType: FileType<any>
	projectRoot: string
	hasComMojangDirectory: boolean
	compileFiles: (files: string[]) => Promise<void>
	getAliases: (filePath: string) => string[]
	targetVersion?: string
	requestJsonData: <T = any>(dataPath: string) => Promise<T>
}) => Partial<TCompilerPlugin>
