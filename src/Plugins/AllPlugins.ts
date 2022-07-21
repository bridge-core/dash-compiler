import { join } from 'path-browserify'
import type { DashFile, IFileHandle } from '../Core/DashFile'
import type { Dash } from '../Dash'
import { Plugin } from './Plugin'
import { TCompilerPluginFactory } from './TCompilerPluginFactory'
import { SimpleRewrite } from './BuiltIn/SimpleRewrite'
import { MoLangPlugin } from './BuiltIn/MoLang'
import { EntityIdentifierAlias } from './BuiltIn/EntityIdentifier'
import {
	CustomBlockComponentPlugin,
	CustomEntityComponentPlugin,
	CustomItemComponentPlugin,
} from './BuiltIn/Components/Plugins'
import { CustomCommandsPlugin } from './BuiltIn/Commands/Plugin'
import { TypeScriptPlugin } from './BuiltIn/TypeScript'
import { RewriteForPackaging } from './BuiltIn/RewriteForPackaging'
import { ContentsFilePlugin } from './BuiltIn/ContentsFile'
import { FormatVersionCorrection } from './BuiltIn/FormatVersionCorrection'
import { GeneratorScriptsPlugin } from './BuiltIn/GeneratorScripts'
import { JsRuntime } from '../Common/JsRuntime'

const builtInPlugins: Record<string, TCompilerPluginFactory<any>> = {
	simpleRewrite: SimpleRewrite,
	rewriteForPackaging: RewriteForPackaging,
	moLang: MoLangPlugin,
	entityIdentifierAlias: EntityIdentifierAlias,
	customEntityComponents: CustomEntityComponentPlugin,
	customItemComponents: CustomItemComponentPlugin,
	customBlockComponents: CustomBlockComponentPlugin,
	customCommands: CustomCommandsPlugin,
	typeScript: TypeScriptPlugin,
	contentsFile: ContentsFilePlugin,
	formatVersionCorrection: FormatVersionCorrection,
	generatorScripts: GeneratorScriptsPlugin,
}

export class AllPlugins {
	protected plugins: Plugin[] = []
	protected pluginRuntime: JsRuntime

	constructor(protected dash: Dash<any>) {
		this.pluginRuntime = new JsRuntime(this.dash.fileSystem)
	}

	async loadPlugins(scriptEnv: any = {}) {
		this.plugins = []
		// Clear module cache
		this.pluginRuntime.clearCache()

		// Loading all available extensions
		const extensions = [
			...(
				await this.dash.fileSystem
					.readdir(join(this.dash.projectRoot, '.bridge/extensions'))
					.catch(() => [])
			).map((entry) =>
				entry.kind === 'directory'
					? join(
							this.dash.projectRoot,
							'.bridge/extensions',
							entry.name
					  )
					: undefined
			),
			...(
				await this.dash.fileSystem.readdir('extensions').catch(() => [])
			).map((entry) =>
				entry.kind === 'directory'
					? join('extensions', entry.name)
					: undefined
			),
		]

		const plugins: Record<string, string> = {}
		// Read extension manifests to extract compiler plugins
		for (const extension of extensions) {
			if (!extension) continue

			let manifest: any
			try {
				manifest = await this.dash.fileSystem.readJson(
					join(extension, 'manifest.json')
				)
			} catch {
				continue
			}

			if (!manifest?.compiler?.plugins) continue

			for (const pluginId in manifest.compiler.plugins) {
				plugins[pluginId] = join(
					extension,
					manifest.compiler.plugins[pluginId]
				)
			}
		}

		const usedPlugins: (string | [string, any])[] =
			(await this.getCompilerOptions()).plugins ?? []
		for (const usedPlugin of usedPlugins) {
			const pluginId =
				typeof usedPlugin === 'string' ? usedPlugin : usedPlugin[0]
			const pluginOpts =
				typeof usedPlugin === 'string' ? {} : usedPlugin[1]

			if (plugins[pluginId]) {
				const module = await this.pluginRuntime
					.run(plugins[pluginId], {
						console: this.dash.console,
						...scriptEnv,
					})
					.catch((err) => {
						this.dash.console.error(
							`Failed to execute plugin ${pluginId}: ${err}`
						)
						return null
					})
				if (!module) continue

				if (typeof module.__default__ === 'function')
					this.plugins.push(
						new Plugin(
							this.dash,
							pluginId,
							module.__default__(
								await this.getPluginContext(
									pluginId,
									pluginOpts
								)
							)
						)
					)
				else
					this.dash.console.error(
						`Plugin ${pluginId} is invalid: It does not provide a function as a default export.`
					)
			} else if (builtInPlugins[pluginId]) {
				this.plugins.push(
					new Plugin(
						this.dash,
						pluginId,
						builtInPlugins[pluginId](
							await this.getPluginContext(pluginId, pluginOpts)
						)
					)
				)
			} else {
				this.dash.console.error(`Unknown compiler plugin: ${pluginId}`)
			}
		}
	}

	async getCompilerOptions(): Promise<any> {
		const compilerConfigPath = await this.dash.getCompilerConfigPath()
		if (!compilerConfigPath)
			return this.dash.projectConfig.get().compiler ?? {}

		return await this.dash.fileSystem.readJson(compilerConfigPath)
	}

	/**
	 * Returns the execution environment for a specific plugin
	 * @param pluginId The plugin ID to get the context for
	 * @returns The plugin context
	 */
	protected async getPluginContext(pluginId: string, pluginOpts: any = {}) {
		const dash = this.dash

		return {
			options: {
				get mode() {
					return dash.getMode()
				},
				get buildType() {
					return dash.buildType
				},
				...pluginOpts,
			},
			jsRuntime: this.dash.jsRuntime,
			console: this.dash.console,
			fileSystem: this.dash.fileSystem,
			outputFileSystem: this.dash.outputFileSystem,
			projectConfig: this.dash.projectConfig,
			projectRoot: this.dash.projectRoot,
			packType: this.dash.packType,
			fileType: this.dash.fileType,
			targetVersion: this.dash.projectConfig.get().targetVersion,
			requestJsonData: this.dash.requestJsonData,
			getAliases: (filePath: string) => [
				...(this.dash.includedFiles.get(filePath)?.aliases ?? []),
			],
			/**
			 * TODO: Deprecate in favor of a broader API that is not specific to Minecraft Bedrock
			 */
			hasComMojangDirectory:
				this.dash.fileSystem !== this.dash.outputFileSystem,
			compileFiles: (filePaths: string[]) =>
				this.dash.compileVirtualFiles(filePaths),
		}
	}

	async runBuildStartHooks() {
		for (const plugin of this.plugins) {
			await plugin.runBuildStartHook()
		}
	}
	async runIncludeHooks() {
		let includeFiles = []

		for (const plugin of this.plugins) {
			const filesToInclude = await plugin.runIncludeHook()

			if (Array.isArray(filesToInclude))
				includeFiles.push(...filesToInclude)
		}

		return includeFiles
	}
	async runTransformPathHooks(filePath: string) {
		let currentFilePath: string | null = filePath
		for (const plugin of this.plugins) {
			const newPath: string | undefined | null =
				await plugin.runTransformPathHook(currentFilePath)

			if (newPath === null) return null
			else if (newPath !== undefined) currentFilePath = newPath
		}

		return currentFilePath
	}
	async runReadHooks(filePath: string, fileHandle?: IFileHandle) {
		for (const plugin of this.plugins) {
			const data = await plugin.runReadHook(filePath, fileHandle)

			if (data !== null && data !== undefined) return data
		}
	}
	async runLoadHooks(filePath: string, readData: any) {
		let data: any = readData
		for (const plugin of this.plugins) {
			const tmp = await plugin.runLoadHook(filePath, data)
			if (tmp === undefined) continue

			data = tmp
		}
		return data
	}
	async runRegisterAliasesHooks(filePath: string, data: any) {
		const aliases = new Set<string>()

		for (const plugin of this.plugins) {
			const tmp = await plugin.runRegisterAliasesHook(filePath, data)

			if (tmp === undefined || tmp === null) continue

			if (Array.isArray(tmp)) tmp.forEach((alias) => aliases.add(alias))
			else aliases.add(tmp)
		}

		return aliases
	}
	async runRequireHooks(filePath: string, data: any) {
		const requiredFiles = new Set<string>()

		for (const plugin of this.plugins) {
			const tmp = await plugin.runRequireHook(filePath, data)

			if (tmp === undefined || tmp === null) continue

			if (Array.isArray(tmp))
				tmp.forEach((file) => requiredFiles.add(file))
			else requiredFiles.add(tmp)
		}

		return requiredFiles
	}
	async runTransformHooks(file: DashFile) {
		const dependencies = Object.fromEntries(
			[...file.requiredFiles]
				.map((query) => this.dash.includedFiles.query(query))
				.flat()
				.map((file) => [
					[file.filePath, file.data],
					...[...file.aliases].map((alias) => [alias, file.data]),
				])
				.flat()
		)

		let transformedData = file.data

		for (const plugin of this.plugins) {
			const tmpData = await plugin.runTransformHook(
				file.filePath,
				transformedData,
				dependencies
			)
			if (tmpData === undefined) continue

			transformedData = tmpData
		}

		return transformedData
	}
	async runFinalizeBuildHooks(file: DashFile) {
		for (const plugin of this.plugins) {
			const finalizedData = await plugin.runFinalizeBuildHook(
				file.filePath,
				file.data
			)

			if (finalizedData !== undefined) return finalizedData
		}
	}

	async runBuildEndHooks() {
		for (const plugin of this.plugins) {
			await plugin.runBuildEndHook()
		}
	}
}
