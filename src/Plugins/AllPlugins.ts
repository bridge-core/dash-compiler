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
import { GeneratorScriptsPlugin } from './BuiltIn/GeneratorScripts/Plugin'
import { JsRuntime } from '../Common/JsRuntime'

const builtInPlugins: Record<string, TCompilerPluginFactory<any>> = {
	simpleRewrite: SimpleRewrite,
	rewriteForPackaging: RewriteForPackaging,
	moLang: MoLangPlugin,
	molang: MoLangPlugin,
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

const availableHooks = [
	'buildStart',
	'buildEnd',
	'include',

	'ignore',

	'transformPath',
	'read',
	'load',
	'registerAliases',
	'require',
	'transform',
	'finalizeBuild',

	'beforeFileUnlinked',
] as const
export type THookType = typeof availableHooks[number]

export class AllPlugins {
	protected pluginRuntime: JsRuntime
	protected implementedHooks = new Map<THookType, Plugin[]>()

	constructor(protected dash: Dash<any>) {
		this.pluginRuntime = new JsRuntime(this.dash.fileSystem)
	}

	pluginsFor(hook: THookType, file?: DashFile) {
		if (file) return file.myImplementedHooks.get(hook) ?? []
		return this.implementedHooks.get(hook) ?? []
	}
	getImplementedHooks() {
		return this.implementedHooks
	}

	async loadPlugins(scriptEnv: any = {}) {
		this.implementedHooks.clear()

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
					await this.addPlugin(
						pluginId,
						module.__default__,
						pluginOpts
					)
				else
					this.dash.console.error(
						`Plugin ${pluginId} is invalid: It does not provide a function as a default export.`
					)
			} else if (builtInPlugins[pluginId]) {
				await this.addPlugin(
					pluginId,
					builtInPlugins[pluginId],
					pluginOpts
				)
			} else {
				this.dash.console.error(`Unknown compiler plugin: ${pluginId}`)
			}
		}
	}

	async addPlugin(
		pluginId: string,
		pluginImpl: TCompilerPluginFactory<any>,
		pluginOpts: any
	) {
		const plugin = new Plugin(
			this.dash,
			pluginId,
			pluginImpl(await this.getPluginContext(pluginId, pluginOpts))
		)

		for (const hook of availableHooks) {
			if (plugin.implementsHook(hook)) {
				let hooks = this.implementedHooks.get(hook)
				if (!hooks) {
					hooks = []
					this.implementedHooks.set(hook, hooks)
				}

				hooks.push(plugin)
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
			getFileMetadata: (filePath: string) => {
				const file = this.dash.includedFiles.get(filePath)
				if (!file)
					throw new Error(
						`File ${filePath} to get metadata from not found`
					)

				return {
					get(key: string) {
						return file.getMetadata(key)
					},
					set(key: string, value: any) {
						file.addMetadata(key, value)
					},
					delete(key: string) {
						file.deleteMetadata(key)
					},
				}
			},
			addFileDependencies: (
				filePath: string,
				filePaths: string[],
				clearPrevious = false
			) => {
				const file = this.dash.includedFiles.get(filePath)

				if (!file)
					throw new Error(
						`File ${filePath} to add dependency to not found`
					)

				if (clearPrevious) file.setRequiredFiles(new Set(filePaths))
				else
					filePaths.forEach((filePath) =>
						file.addRequiredFile(filePath)
					)
			},
			getOutputPath: (filePath: string) => {
				return this.dash.getCompilerOutputPath(filePath)
			},
			unlinkOutputFiles: (filePaths: string[]) => {
				return this.dash.unlinkMultiple(filePaths, false, true)
			},

			/**
			 * TODO: Deprecate in favor of a broader API that is not specific to Minecraft Bedrock
			 */
			hasComMojangDirectory:
				this.dash.fileSystem !== this.dash.outputFileSystem,
			compileFiles: (filePaths: string[], virtual = true) =>
				this.dash.compileAdditionalFiles(filePaths, virtual),
		}
	}

	async runBuildStartHooks() {
		await Promise.all(
			this.pluginsFor('buildStart').map((plugin) =>
				plugin.runBuildStartHook()
			)
		)
	}
	async runIncludeHooks() {
		let includeFiles = []

		for (const plugin of this.pluginsFor('include')) {
			const filesToInclude = await plugin.runIncludeHook()

			if (Array.isArray(filesToInclude))
				includeFiles.push(...filesToInclude)
		}

		return includeFiles
	}
	async runIgnoreHooks(file: DashFile) {
		for (const plugin of this.pluginsFor('ignore')) {
			const ignore = await plugin.runIgnoreHook(file.filePath)

			if (ignore) file.addIgnoredPlugin(plugin.pluginId)
		}

		file.createImplementedHooksMap()
	}
	async runTransformPathHooks(file: DashFile) {
		let currentFilePath: string | null = file.filePath
		for (const plugin of this.pluginsFor('transformPath')) {
			const newPath: string | undefined | null =
				await plugin.runTransformPathHook(currentFilePath)

			if (newPath === null) return null
			else if (newPath !== undefined) currentFilePath = newPath
		}

		return currentFilePath
	}
	async runReadHooks(file: DashFile) {
		for (const plugin of this.pluginsFor('read', file)) {
			const data = await plugin.runReadHook(
				file.filePath,
				file.fileHandle
			)

			if (data !== null && data !== undefined) return data
		}
	}
	async runLoadHooks(file: DashFile) {
		let data: any = file.data
		for (const plugin of this.pluginsFor('load', file)) {
			const tmp = await plugin.runLoadHook(file.filePath, data)
			if (tmp === undefined) continue

			data = tmp
		}
		return data
	}
	async runRegisterAliasesHooks(file: DashFile) {
		const aliases = new Set<string>()

		for (const plugin of this.pluginsFor('registerAliases', file)) {
			const tmp = await plugin.runRegisterAliasesHook(
				file.filePath,
				file.data
			)

			if (tmp === undefined || tmp === null) continue

			if (Array.isArray(tmp)) tmp.forEach((alias) => aliases.add(alias))
			else aliases.add(tmp)
		}

		return aliases
	}
	async runRequireHooks(file: DashFile) {
		const requiredFiles = new Set<string>()

		for (const plugin of this.pluginsFor('require', file)) {
			const tmp = await plugin.runRequireHook(file.filePath, file.data)

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

		for (const plugin of this.pluginsFor('transform', file)) {
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
		for (const plugin of this.pluginsFor('finalizeBuild', file)) {
			const finalizedData = await plugin.runFinalizeBuildHook(
				file.filePath,
				file.data
			)

			if (finalizedData !== undefined) return finalizedData
		}
	}

	async runBuildEndHooks() {
		await Promise.allSettled(
			this.pluginsFor('buildEnd').map((plugin) =>
				plugin.runBuildEndHook()
			)
		)
	}

	async runBeforeFileUnlinked(filePath: string) {
		for (const plugin of this.pluginsFor('beforeFileUnlinked')) {
			await plugin.runBeforeFileUnlinked(filePath)
		}
	}
}
