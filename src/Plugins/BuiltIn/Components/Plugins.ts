import json5 from 'json5'
import { get, deepMerge } from 'bridge-common-utils'
import { TCompilerPluginFactory } from '../../TCompilerPluginFactory'
import { Component } from './Component'
import { findCustomComponents } from './findComponents'
import { join } from 'path-browserify'

interface IOpts {
	fileType: string
	getComponentObjects: (fileContent: any) => [string, any][]
}

export function createCustomComponentPlugin({
	fileType,
	getComponentObjects,
}: IOpts): TCompilerPluginFactory<{
	v1CompatMode?: boolean
}> {
	const usedComponents = new Map<string, [string, string][]>()
	let createAdditionalFiles: Record<
		string,
		{ baseFile: string; fileContent: any }
	> = {}

	return ({
		console,
		projectConfig,
		projectRoot,
		compileFiles,
		getAliases,
		options,
		targetVersion,
		fileType: fileTypeLib,
	}) => {
		const isPlayerFile = (
			filePath: string | null,
			getAliases: (file: string) => string[]
		) =>
			filePath &&
			fileType === 'item' &&
			fileTypeLib?.getId(filePath) === 'entity' &&
			getAliases(filePath).includes('minecraft:player')

		const isComponent = (filePath: string | null) =>
			options.v1CompatMode
				? filePath?.includes(`/components/`)
				: filePath &&
				  fileTypeLib?.getId(filePath) === `customComponent` &&
				  filePath.includes(`/${fileType}/`)
		const mayUseComponent = (filePath: string | null) =>
			filePath && fileTypeLib?.getId(filePath) === fileType

		return {
			buildStart() {
				usedComponents.clear()
				createAdditionalFiles = {}
			},
			transformPath(filePath) {
				if (
					isComponent(filePath) &&
					options.buildType !== 'fileRequest'
				)
					return null
			},
			async read(filePath, fileHandle) {
				// Even if the fileHandle being undefined has nothing to do with custom components,
				// we still just return "undefined" so we might as well keep the code simple
				if (!fileHandle)
					return createAdditionalFiles[filePath]
						? json5.parse(
								createAdditionalFiles[filePath].fileContent
						  )
						: undefined

				if (isComponent(filePath) && filePath.endsWith('.js')) {
					const file = await fileHandle.getFile()
					return await file?.text()
				} else if (
					mayUseComponent(filePath) ||
					isPlayerFile(filePath, getAliases)
				) {
					const file = await fileHandle.getFile()
					if (!file) return

					try {
						return json5.parse(await file.text())
					} catch (err) {
						if (options.buildType !== 'fileRequest')
							console.error(
								`Error within file "${filePath}": ${err}`
							)
						return {
							__error__: `Failed to load original file: ${err}`,
						}
					}
				}
			},
			async load(filePath, fileContent) {
				if (isComponent(filePath) && typeof fileContent === 'string') {
					const component = new Component(
						console,
						fileType,
						fileContent,
						options.mode,
						!!options.v1CompatMode,
						targetVersion
					)
					component.setProjectConfig(projectConfig)

					const loadedCorrectly = await component.load()
					return loadedCorrectly ? component : fileContent
				}
			},
			async registerAliases(filePath, fileContent) {
				if (isComponent(filePath)) {
					return [`${fileType}Component#${fileContent.name}`]
				}
			},
			async require(filePath, fileContent) {
				if (isPlayerFile(filePath, getAliases))
					return [
						`.${projectConfig.getRelativePackRoot(
							'behaviorPack'
						)}/components/item/**/*.[jt]s`,
						`.${projectConfig.getRelativePackRoot(
							'behaviorPack'
						)}/items/**/*.json`,
					]

				if (mayUseComponent(filePath)) {
					const components = findCustomComponents(
						getComponentObjects(fileContent)
					)

					usedComponents.set(filePath, components)
					return components.map(
						(component) => `${fileType}Component#${component[0]}`
					)
				} else if (createAdditionalFiles[filePath]) {
					return [createAdditionalFiles[filePath].baseFile]
				}
				// else if (filePath.startsWith('RP/entity/')) {
				// 	return ['BP/components/entity/**/*.js']
				// }
			},
			async transform(filePath, fileContent, dependencies = {}) {
				if (isPlayerFile(filePath, getAliases)) {
					// Get item components from the dependencies
					const itemComponents = <Component[]>Object.entries(
						dependencies
					)
						.filter(([depName]) =>
							depName.startsWith('itemComponent#')
						)
						.map(([_, component]) => component)

					for (const component of itemComponents) {
						if (!component) return

						createAdditionalFiles = deepMerge(
							createAdditionalFiles,
							await component.processAdditionalFiles(
								filePath,
								fileContent
							)
						)
					}
				} else if (mayUseComponent(filePath)) {
					const components = new Set<Component>()

					// Apply components
					for (const [componentName, location] of usedComponents.get(
						filePath
					) ?? []) {
						const component = <Component>(
							dependencies[
								`${fileType}Component#${componentName}`
							]
						)
						if (!component) continue

						const parentObj = get(
							fileContent,
							location.split('/'),
							{}
						)
						const componentArgs = parentObj[componentName]
						delete parentObj[componentName]

						await component.processTemplates(
							fileContent,
							componentArgs,
							location
						)
						components.add(component)
					}

					// Add virtual files created from components
					for (const component of components) {
						createAdditionalFiles = deepMerge(
							createAdditionalFiles,
							await component.processAdditionalFiles(
								filePath,
								fileContent
							)
						)
					}

					// Reset animation(s/ controllers)
					for (const component of components) {
						component.reset()
					}
				}
			},
			finalizeBuild(filePath, fileContent) {
				// Necessary to make auto-completions work for TypeScript components
				if (isComponent(filePath) && fileContent) {
					return (<Component>fileContent).toString()
				} else if (
					mayUseComponent(filePath) ||
					createAdditionalFiles[filePath]
				)
					return JSON.stringify(fileContent, null, '\t')
			},
			async buildEnd() {
				// TODO: Calling compileFiles within file request mode currently causes an error
				// inside of bridge. We should look into properly enabling support for this in the future
				if (options.buildType === 'fileRequest') return

				createAdditionalFiles = Object.fromEntries(
					Object.entries(createAdditionalFiles)
						.filter(
							([_, fileData]) =>
								fileData?.fileContent !== undefined
						)
						.map(([filePath, fileData]) => [
							join(projectRoot, filePath),
							fileData,
						])
				)
				const compilePaths = Object.keys(createAdditionalFiles)
				if (compilePaths.length > 0) await compileFiles(compilePaths)

				createAdditionalFiles = {}
			},
		}
	}
}

export const CustomEntityComponentPlugin = createCustomComponentPlugin({
	fileType: 'entity',
	getComponentObjects: (fileContent) => [
		[
			'minecraft:entity/components',
			fileContent?.['minecraft:entity']?.components ?? {},
		],
		...Object.entries(
			fileContent?.['minecraft:entity']?.component_groups ?? {}
		).map(
			([groupName, groupContent]) =>
				<[string, any]>[
					`minecraft:entity/component_groups/${groupName}`,
					groupContent,
				]
		),
		...(<any[]>fileContent?.['minecraft:entity']?.permutations ?? []).map(
			(permutation: any, index: number) =>
				<[string, any]>[
					`minecraft:entity/permutations/${index}/components`,
					permutation?.components ?? {},
				]
		),
	],
})

export const CustomItemComponentPlugin = createCustomComponentPlugin({
	fileType: 'item',
	getComponentObjects: (fileContent) => [
		[
			'minecraft:item/components',
			fileContent?.['minecraft:item']?.components ?? {},
		],
	],
})

export const CustomBlockComponentPlugin = createCustomComponentPlugin({
	fileType: 'block',
	getComponentObjects: (fileContent) => [
		[
			'minecraft:block/components',
			fileContent?.['minecraft:block']?.components ?? {},
		],
		...(<any[]>fileContent?.['minecraft:block']?.permutations ?? []).map(
			(permutation, index) =>
				<[string, any]>[
					`minecraft:block/permutations/${index}/components`,
					permutation.components ?? {},
				]
		),
	],
})
