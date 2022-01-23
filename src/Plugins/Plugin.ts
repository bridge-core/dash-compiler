import { TCompilerPlugin } from './TCompilerPlugin'

export class Plugin {
	constructor(
		public readonly pluginId: string,
		protected plugin: Partial<TCompilerPlugin>
	) {}

	/**
	 * Methods for running the various plugin hooks
	 */
	runBuildStartHook() {
		try {
			return this.plugin.buildStart?.()
		} catch (err) {
			console.error(
				`The plugin "${this.pluginId}" threw an error while running the "buildStart" hook:`,
				err
			)
		}
	}
	runIncludeHook() {
		try {
			return this.plugin.include?.()
		} catch (err) {
			console.error(
				`The plugin "${this.pluginId}" threw an error while running the "include" hook:`,
				err
			)
		}
	}
	runTransformPathHook(filePath: string | null) {
		try {
			return this.plugin.transformPath?.(filePath)
		} catch (err) {
			console.error(
				`The plugin "${this.pluginId}" threw an error while running the "transformPath" hook for "${filePath}":`,
				err
			)
		}
	}
	runReadHook(
		filePath: string,
		fileHandle?: { getFile(): Promise<File> | File }
	) {
		try {
			return this.plugin.read?.(filePath, fileHandle)
		} catch (err) {
			console.error(
				`The plugin "${this.pluginId}" threw an error while running the "read" hook for "${filePath}":`,
				err
			)
		}
	}
	runLoadHook(filePath: string, fileContent: any) {
		try {
			return this.plugin.load?.(filePath, fileContent)
		} catch (err) {
			console.error(
				`The plugin "${this.pluginId}" threw an error while running the "load" hook for "${filePath}":`,
				err
			)
		}
	}
	runRegisterAliasesHook(filePath: string, fileContent: any) {
		try {
			return this.plugin.registerAliases?.(filePath, fileContent)
		} catch (err) {
			console.error(
				`The plugin "${this.pluginId}" threw an error while running the "registerAliases" hook for "${filePath}":`,
				err
			)
		}
	}
	runRequireHook(filePath: string, fileContent: any) {
		try {
			return this.plugin.require?.(filePath, fileContent)
		} catch (err) {
			console.error(
				`The plugin "${this.pluginId}" threw an error while running the "require" hook for "${filePath}":`,
				err
			)
		}
	}
	runTransformHook(
		filePath: string,
		fileContent: any,
		dependencies?: Record<string, any>
	) {
		try {
			return this.plugin.transform?.(filePath, fileContent, dependencies)
		} catch (err) {
			console.error(
				`The plugin "${this.pluginId}" threw an error while running the "transform" hook for "${filePath}":`,
				err
			)
		}
	}
	runFinalizeBuildHook(filePath: string, fileContent: any) {
		try {
			return this.plugin.finalizeBuild?.(filePath, fileContent)
		} catch (err) {
			console.error(
				`The plugin "${this.pluginId}" threw an error while running the "finalizeBuild" hook for "${filePath}":`,
				err
			)
		}
	}
	runBuildEndHook() {
		try {
			return this.plugin.buildEnd?.()
		} catch (err) {
			console.error(
				`The plugin "${this.pluginId}" threw an error while running the "buildEnd" hook:`,
				err
			)
		}
	}
}
