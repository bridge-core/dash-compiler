import { TCompilerPlugin } from './TCompilerPlugin'
import { FileSystem } from '../FileSystem/FileSystem'
import { DashProjectConfig } from '../DashProjectConfig'

export type TCompilerPluginFactory<
	T = {
		mode: 'development' | 'production'
		// TODO: Remove or deprecate
		// isFileRequest: boolean
		// restartDevServer: boolean
		[key: string]: any
	}
> = (context: {
	options: T
	fileSystem: FileSystem
	outputFileSystem: FileSystem
	projectConfig: DashProjectConfig
	projectRoot: string
	hasComMojangDirectory: boolean
	compileFiles: (files: string[]) => Promise<void>
	getAliases: (filePath: string) => string[]
	targetVersion?: string
}) => Partial<TCompilerPlugin>
