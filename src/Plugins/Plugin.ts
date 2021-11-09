import { TCompilerPlugin } from './TCompilerPlugin'

export class Plugin {
	constructor(protected plugin: Partial<TCompilerPlugin>) {}

	/**
	 * Methods for running the various plugin hooks
	 */
	runBuildStartHook() {
		return this.plugin.buildStart?.()
	}
	runIncludeHook() {
		return this.plugin.include?.()
	}
	runTransformPathHook(filePath: string | null) {
		return this.plugin.transformPath?.(filePath)
	}
	runReadHook(filePath: string) {
		return this.plugin.read?.(filePath)
	}
	runLoadHook(filePath: string, fileContent: any) {
		return this.plugin.load?.(filePath, fileContent)
	}
	runRegisterAliasesHook(filePath: string, fileContent: any) {
		return this.plugin.registerAliases?.(filePath, fileContent)
	}
	runRequireHook(filePath: string, fileContent: any) {
		return this.plugin.require?.(filePath, fileContent)
	}
	runTransformHook(
		filePath: string,
		fileContent: any,
		dependencies?: Record<string, any>
	) {
		return this.plugin.transform?.(filePath, fileContent, dependencies)
	}
	runFinalizeBuildHook(filePath: string, fileContent: any) {
		return this.plugin.finalizeBuild?.(filePath, fileContent)
	}
	runBuildEndHook() {
		return this.plugin.buildEnd?.()
	}
}
