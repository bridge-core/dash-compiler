import { IFileHandle } from '../Core/DashFile'
import { Dash } from '../Dash'
import { TCompilerPlugin } from './TCompilerPlugin'

export class Plugin {
	constructor(
		protected dash: Dash,
		public readonly pluginId: string,
		protected plugin: Partial<TCompilerPlugin>
	) {}

	/**
	 * Methods for running the various plugin hooks
	 */
	async runBuildStartHook() {
		try {
			return await this.plugin.buildStart?.()
		} catch (err) {
			this.dash.console.error(
				`The plugin "${this.pluginId}" threw an error while running the "buildStart" hook:`,
				err
			)
		}
	}
	async runIncludeHook() {
		try {
			return await this.plugin.include?.()
		} catch (err) {
			this.dash.console.error(
				`The plugin "${this.pluginId}" threw an error while running the "include" hook:`,
				err
			)
		}
	}
	async runTransformPathHook(filePath: string | null) {
		try {
			return await this.plugin.transformPath?.(filePath)
		} catch (err) {
			this.dash.console.error(
				`The plugin "${this.pluginId}" threw an error while running the "transformPath" hook for "${filePath}":`,
				err
			)
		}
	}
	async runReadHook(filePath: string, fileHandle?: IFileHandle) {
		try {
			return await this.plugin.read?.(filePath, fileHandle)
		} catch (err) {
			this.dash.console.error(
				`The plugin "${this.pluginId}" threw an error while running the "read" hook for "${filePath}":`,
				err
			)
		}
	}
	async runLoadHook(filePath: string, fileContent: any) {
		try {
			return await this.plugin.load?.(filePath, fileContent)
		} catch (err) {
			this.dash.console.error(
				`The plugin "${this.pluginId}" threw an error while running the "load" hook for "${filePath}":`,
				err
			)
		}
	}
	async runRegisterAliasesHook(filePath: string, fileContent: any) {
		try {
			return await this.plugin.registerAliases?.(filePath, fileContent)
		} catch (err) {
			this.dash.console.error(
				`The plugin "${this.pluginId}" threw an error while running the "registerAliases" hook for "${filePath}":`,
				err
			)
		}
	}
	async runRequireHook(filePath: string, fileContent: any) {
		try {
			return await this.plugin.require?.(filePath, fileContent)
		} catch (err) {
			this.dash.console.error(
				`The plugin "${this.pluginId}" threw an error while running the "require" hook for "${filePath}":`,
				err
			)
		}
	}
	async runTransformHook(
		filePath: string,
		fileContent: any,
		dependencies?: Record<string, any>
	) {
		try {
			return await this.plugin.transform?.(
				filePath,
				fileContent,
				dependencies
			)
		} catch (err) {
			this.dash.console.error(
				`The plugin "${this.pluginId}" threw an error while running the "transform" hook for "${filePath}":`,
				err
			)
		}
	}
	async runFinalizeBuildHook(filePath: string, fileContent: any) {
		try {
			return await this.plugin.finalizeBuild?.(filePath, fileContent)
		} catch (err) {
			this.dash.console.error(
				`The plugin "${this.pluginId}" threw an error while running the "finalizeBuild" hook for "${filePath}":`,
				err
			)
		}
	}
	async runBuildEndHook() {
		try {
			return await this.plugin.buildEnd?.()
		} catch (err) {
			this.dash.console.error(
				`The plugin "${this.pluginId}" threw an error while running the "buildEnd" hook:`,
				err
			)
		}
	}
}
