import type { DashFile } from '../Core/DashFile'
import type { Dash } from '../Dash'
import { Plugin } from './Plugin'

export class AllPlugins {
	protected plugins: Plugin[] = []

	constructor(protected dash: Dash) {}

	loadPlugins(plugins: Record<string, string>) {
		const compilerPlugins =
			this.dash.projectConfig.get().compiler?.plugins ?? []

		/**
		 * Map of plugin path and corresponding plugin opts
		 */
		const pluginOptsMap: Record<string, any> = {}
		for (const pluginName in plugins) {
			const currentPlugin = compilerPlugins.find((p) =>
				typeof p === 'string' ? p === pluginName : p[0] === pluginName
			)

			if (currentPlugin)
				pluginOptsMap[plugins[pluginName]] =
					typeof currentPlugin === 'string' ? {} : currentPlugin[1]
		}

		// TODO: Load plugins from disk and add them to Plugin[] list
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