import { join } from 'path-browserify'
import { run } from '../Common/runScript'
import type { DashFile } from '../Core/DashFile'
import type { Dash } from '../Dash'
import { Plugin } from './Plugin'
import { TCompilerPluginFactory } from './TCompilerFactory'
import { SimpleRewrite } from './BuiltIn/SimpleRewrite'

const builtInPlugins: TCompilerPluginFactory[] = [SimpleRewrite]

export class AllPlugins {
	protected plugins: Plugin[] = []

	constructor(protected dash: Dash<any>) {}

	async loadPlugins(scriptEnv: any = {}) {
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

		const compilerPlugins =
			this.dash.projectConfig.get().compiler?.plugins ?? []

		/**
		 * Map of plugin path and corresponding plugin opts
		 *
		 * TODO(@solvedDev): Refactor to warn users about missing plugin based on compiler config; the current warning actually warns when a plugin is unused!
		 */
		const pluginOptsMap: Record<string, any> = {}
		for (const pluginName in plugins) {
			const currentPlugin = compilerPlugins.find((p) =>
				typeof p === 'string' ? p === pluginName : p[0] === pluginName
			)

			if (currentPlugin)
				pluginOptsMap[plugins[pluginName]] =
					typeof currentPlugin === 'string' ? {} : currentPlugin[1]
			else console.warn(`Missing plugin with name ${pluginName}`)
		}

		// Execute plugins
		for (const pluginPath in pluginOptsMap) {
			// This ternary is a hacky way to load built-in plugins directly from source. Needs a rework, see L40
			const pluginSrc = await this.dash.fileSystem
				.readFile(pluginPath)
				.then((file) => file.text())

			const module: { exports?: TCompilerPluginFactory } = {}
			await run({
				async: true,
				script: pluginSrc,
				env: {
					require: undefined,
					module,
					...scriptEnv,
				},
			})

			if (typeof module.exports === 'function')
				this.plugins.push(
					new Plugin(
						module.exports(
							this.getPluginContext(pluginOptsMap[pluginPath])
						)
					)
				)
		}

		this.addBuiltInPlugins()

		console.log(this.plugins)
	}

	protected addBuiltInPlugins() {
		for (const plugin of builtInPlugins) {
			this.plugins.push(new Plugin(plugin(this.getPluginContext())))
		}
	}

	protected getPluginContext(pluginOpts: any = {}) {
		return {
			options: {
				mode: this.dash.getMode(),
				...pluginOpts,
			},
			fileSystem: this.dash.fileSystem,
			outputFileSystem: this.dash.outputFileSystem,
			projectConfig: this.dash.projectConfig,
			projectRoot: this.dash.projectRoot,
			packType: this.dash.packType,
			targetVersion: this.dash.projectConfig.get().targetVersion,
			getAliases: (filePath: string) => [
				...(this.dash.includedFiles.get(filePath)?.aliases ?? []),
			],
			/**
			 * TODO: Deprecated in favor of a broader API that is not specific to Minecraft Bedrock
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
			const newPath: string | undefined | null = <
				string | null | undefined
			>plugin.runTransformPathHook(currentFilePath)

			if (newPath === null) return null
			else if (newPath !== undefined) currentFilePath = newPath
		}

		return currentFilePath
	}
	async runReadHooks(
		filePath: string,
		fileHandle?: { getFile: () => Promise<File> | File }
	) {
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
			[...file.requiredFiles].map((fileId) => [
				fileId,
				this.dash.includedFiles.get(fileId),
			])
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

			if (finalizedData !== undefined && finalizedData !== null)
				return finalizedData
		}
	}

	async runBuildEndHooks() {
		for (const plugin of this.plugins) {
			await plugin.runBuildEndHook()
		}
	}
}
