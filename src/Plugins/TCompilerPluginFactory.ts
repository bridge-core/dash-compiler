import { TCompilerPlugin } from './TCompilerPlugin'
import { FileSystem } from '../FileSystem/FileSystem'
import { DashProjectConfig } from '../DashProjectConfig'
import { FileType, PackType } from 'mc-project-core'
import { Console } from '../Common/Console'
import { JsRuntime } from '../Common/JsRuntime'

export type TCompilerPluginFactory<T = void> = (context: {
	options: T & {
		mode: 'development' | 'production'
		buildType: 'fileRequest' | 'fullBuild' | 'hotUpdate'
	}
	jsRuntime: JsRuntime
	console: Console
	fileSystem: FileSystem
	outputFileSystem: FileSystem
	projectConfig: DashProjectConfig
	packType: PackType<any>
	fileType: FileType<any>
	projectRoot: string
	hasComMojangDirectory: boolean
	compileFiles: (files: string[], virtual?: boolean) => Promise<void>
	getAliases: (filePath: string) => string[]
	targetVersion?: string
	requestJsonData: <T = any>(dataPath: string) => Promise<T>
	getFileMetadata: (filePath: string) => IFileMetadata
	getOutputPath: (filePath: string) => Promise<string | undefined>
	unlinkOutputFiles: (filePaths: string[]) => Promise<void>
	addFileDependencies: (
		filePath: string,
		filePaths: string[],
		clearPrevious?: boolean
	) => void
}) => Partial<TCompilerPlugin>

interface IFileMetadata {
	get: (key: string) => any
	set: (key: string, value: any) => void
	delete: (key: string) => void
}
