import json5 from 'json5'
import { TCompilerPluginFactory } from '../../TCompilerPluginFactory'
import { Command } from './Command'
import { transformCommands } from './transformCommands'
import { setObjectAt } from 'bridge-common-utils'

export const CustomCommandsPlugin: TCompilerPluginFactory<{
	include: Record<string, string[]>
	v1CompatMode?: boolean
}> = ({
	projectConfig,
	console,
	fileType: fileTypeLib,
	requestJsonData,
	options,
}) => {
	const resolve = (packId: string, path: string) =>
		projectConfig.resolvePackPath(<any>packId, path)

	const isCommand = (filePath: string | null) =>
		filePath && fileTypeLib.getId(filePath) === 'customCommand'
	const isMcfunction = (filePath: string | null) =>
		filePath && fileTypeLib.getId(filePath) === 'function'

	const loadCommandsFor = (filePath: string) =>
		Object.entries(options.include).find(
			([fileType]) => fileTypeLib.getId(filePath) === fileType
		)?.[1]
	const withSlashPrefix = (filePath: string) =>
		fileTypeLib.get(filePath)?.meta?.commandsUseSlash ?? false

	return {
		async buildStart() {
			// Load default command locations and merge them with user defined locations
			options.include = Object.assign(
				await requestJsonData(
					'data/packages/minecraftBedrock/location/validCommand.json'
				),
				options.include
			)
		},
		transformPath(filePath) {
			if (isCommand(filePath) && options.buildType !== 'fileRequest')
				return null
		},
		async read(filePath, fileHandle) {
			if (!fileHandle) return

			if (isCommand(filePath) && filePath.endsWith('.js')) {
				const file = await fileHandle.getFile()
				return await file.text()
			} else if (isMcfunction(filePath)) {
				const file = await fileHandle.getFile()
				return await file.text()
			} else if (loadCommandsFor(filePath) && fileHandle) {
				const file = await fileHandle.getFile()
				try {
					return json5.parse(await file.text())
				} catch (err) {
					console.error(err)
				}
			}
		},
		async load(filePath, fileContent) {
			if (isCommand(filePath)) {
				const command = new Command(
					console,
					fileContent,
					options.mode,
					options.v1CompatMode ?? false
				)

				await command.load()
				return command
			}
		},
		async registerAliases(filePath, fileContent) {
			if (isCommand(filePath)) return [`command#${fileContent.name}`]
		},
		async require(filePath) {
			if (loadCommandsFor(filePath) || isMcfunction(filePath)) {
				// Register custom commands as JSON/mcfunction file dependencies
				return [
					resolve('behaviorPack', 'commands/**/*.[jt]s'),
					resolve('behaviorPack', 'commands/*.[jt]s'),
				]
			}
		},
		async transform(filePath, fileContent, dependencies = {}) {
			const includePaths = loadCommandsFor(filePath)

			if (includePaths && includePaths.length > 0) {
				const hasSlashPrefix = withSlashPrefix(filePath)

				// For every command location
				includePaths.forEach((includePath) =>
					// Search it inside of the JSON & transform it if it exists
					setObjectAt<string | string[]>(
						includePath,
						fileContent,
						(commands) => {
							if (!commands) return commands

							commands = Array.isArray(commands)
								? commands
								: [commands]

							/**
							 * Filter out invalid commands as those were commonly
							 * accidentally created with bridge.'s tree editor
							 *
							 * e.g. [{ '/say Hi': {} }]
							 */
							const filteredCommands = []
							for (const command of commands) {
								if (typeof command === 'string') {
									filteredCommands.push(command)
									continue
								}

								// Produce a helpful warning to inform user about invalid input
								console.error(
									`The file "${filePath}" contains invalid commands. Expected type "string" within array but got type "${typeof command}"`
								)
							}

							return transformCommands(
								filteredCommands.map((command) =>
									!hasSlashPrefix && !command.startsWith('/')
										? `/${command}`
										: command
								),
								dependencies,
								false
							).map((command) =>
								hasSlashPrefix ? command : command.slice(1)
							)
						}
					)
				)
			} else if (isMcfunction(filePath)) {
				const commands = (<string>fileContent)
					.split('\n')
					.map((command) => command.trim())
					.filter(
						(command) => command !== '' && !command.startsWith('#')
					)
					.map((command) => <`/${string}`>`/${command}`)

				return transformCommands(commands, dependencies, true)
					.map((command) =>
						command.startsWith('/') ? command.slice(1) : command
					)
					.join('\n')
			}
		},
		finalizeBuild(filePath, fileContent) {
			// Necessary to make auto-completions work for TypeScript components
			if (isCommand(filePath) && fileContent) {
				return (<Command>fileContent).toString()
			}
			// Make sure JSON files are transformed back into a format that we can write to disk
			else if (
				loadCommandsFor(filePath) &&
				typeof fileContent !== 'string'
			)
				return JSON.stringify(fileContent, null, '\t')
		},
	}
}
