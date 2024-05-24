import { CustomMolang, IExpression, Molang, expressions } from '@bridge-editor/molang'
import { setObjectAt } from '@bridge-editor/common-utils'
import json5 from 'json5'
import { TCompilerPluginFactory } from '../TCompilerPluginFactory'

export const MolangPlugin: TCompilerPluginFactory<{
	include: Record<string, string[]>
}> = async ({
	fileType,
	projectConfig,
	requestJsonData,
	options,
	console,
	jsRuntime,
}) => {
	const resolve = (packId: string, path: string) =>
		projectConfig.resolvePackPath(<any>packId, path)

	// Custom Molang parser from https://github.com/bridge-core/molang
	const customMolang = new CustomMolang({})

	const molangDirPaths = [
		projectConfig.resolvePackPath('behaviorPack', 'molang'),
		projectConfig.resolvePackPath('resourcePack', 'molang'),
	]
	const isMolangFile = (filePath: string | null) =>
		filePath &&
		molangDirPaths.some((path) => filePath.startsWith(`${path}/`)) &&
		filePath.endsWith('.molang')
	const molangScriptPath = projectConfig.resolvePackPath(
		'behaviorPack',
		'scripts/molang'
	)
	const isMolangScript = (filePath: string | null) =>
		filePath?.startsWith(`${molangScriptPath}/`)

	// Caching the result of the function has a huge performance impact because the fileType.getId function is expensive
	const cachedPaths = new Map<string, string[] | undefined>()
	const loadMolangFrom = (filePath: string) => {
		if (cachedPaths.has(filePath)) return cachedPaths.get(filePath)

		const molangLocs = options.include[fileType.getId(filePath)]
		cachedPaths.set(filePath, molangLocs)
		return molangLocs
	}

	let astTransformers: ((expr: IExpression) => IExpression | undefined)[] = []

	return {
		async buildStart() {
			// Load default Molang locations and merge them with user defined locations
			options.include = Object.assign(
				await requestJsonData(
					'data/packages/minecraftBedrock/location/validMolang.json'
				),
				options.include
			)
			cachedPaths.clear()
		},
		ignore(filePath) {
			return (
				!isMolangFile(filePath) &&
				!isMolangScript(filePath) &&
				!loadMolangFrom(filePath)
			)
		},
		transformPath(filePath) {
			// Molang files & Molang scripts should get omitted from output
			if (isMolangFile(filePath) || isMolangScript(filePath)) return null
		},
		async read(filePath, fileHandle) {
			if (
				(isMolangFile(filePath) || isMolangScript(filePath)) &&
				fileHandle
			) {
				// Load Molang files as text
				const file = await fileHandle.getFile()
				return await file?.text()
			} else if (
				loadMolangFrom(filePath) &&
				filePath.endsWith('.json') &&
				fileHandle
			) {
				// Currently, Molang in function files is not supported so we can only load JSON files
				const file = await fileHandle.getFile()
				if (!file) return

				try {
					return json5.parse(await file.text())
				} catch (err) {
					if (options.buildType !== 'fileRequest')
						console.error(`Error within file "${filePath}": ${err}`)
					return {
						__error__: `Failed to load original file: ${err}`,
					}
				}
			}
		},
		async load(filePath, fileContent) {
			if (isMolangFile(filePath) && fileContent) {
				// Load the custom Molang functions
				customMolang.parse(fileContent)
			} else if (isMolangScript(filePath)) {
				const module = await jsRuntime
					.run(filePath, { console }, fileContent)
					.catch((err) => {
						console.error(
							`Failed to execute Molang AST script "${filePath}": ${err}`
						)
						return null
					})
				// AST script execution failed
				if (!module) return null

				if (typeof module.__default__ === 'function')
					astTransformers.push(<any>module.__default__)
			}
		},
		async require(filePath) {
			if (loadMolangFrom(filePath)) {
				// Register molang files & molang scripts as JSON file dependencies
				return [
					resolve('behaviorPack', 'scripts/molang/**/*.[jt]s'),
					resolve('behaviorPack', 'molang/**/*.molang'),
					resolve('resourcePack', 'molang/**/*.molang'),
				]
			}
		},

		async transform(filePath, fileContent) {
			const includePaths = loadMolangFrom(filePath)

			if (includePaths && includePaths.length > 0) {
				// For every Molang location
				includePaths.forEach((includePath) =>
					// Search it inside of the JSON & transform it if it exists
					setObjectAt<string>(includePath, fileContent, (molang) => {
						if (typeof molang !== 'string') return molang
						// We don't want to transform entity events & slash commands inside of animations/animation controllers
						if (molang[0] === '/' || molang[0] === '@')
							return molang

						if (astTransformers.length > 0) {
							let ast: IExpression | null = null

							try {
								ast = customMolang.parse(molang)
							} catch (err) {
								if (options.buildType !== 'fileRequest')
									console.error(
										`Error within file "${filePath}"; script "${molang}": ${err}`
									)
							}

							if (ast) {
								for (const transformer of astTransformers) {
									ast = ast.walk(transformer)
								}

								molang = ast.toString()
							}
						}

						try {
							return customMolang.transform(molang)
						} catch (err) {
							if (options.buildType !== 'fileRequest')
								console.error(
									`Error within file "${filePath}"; script "${molang}": ${err}`
								)

							return molang
						}
					})
				)
			}
		},

		finalizeBuild(filePath, fileContent) {
			// Make sure JSON files are transformed back into a format that we can write to disk
			if (loadMolangFrom(filePath) && typeof fileContent !== 'string')
				return JSON.stringify(fileContent, null, '\t')
		},

		buildEnd() {
			astTransformers = []
		},
	}
}
