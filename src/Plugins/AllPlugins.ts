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
	}

	async runBuildEndHooks() {
		for (const plugin of this.plugins) {
			await plugin.runBuildEndHook()
		}
	}
}
