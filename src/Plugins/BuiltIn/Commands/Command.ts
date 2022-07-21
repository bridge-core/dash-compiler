import { transformCommands } from './transformCommands'
import { v1Compat } from './v1Compat'
import { tokenizeCommand } from 'bridge-common-utils'
import { castType } from 'bridge-common-utils'
import { Console } from '../../../Common/Console'
import { Runtime } from 'bridge-js-runtime'
export type TTemplate = (commandArgs: unknown[], opts: any) => string | string[]

export class Command {
	protected _name?: string
	protected schema?: any
	protected template?: TTemplate

	constructor(
		protected console: Console,
		protected commandSrc: string,
		protected mode: 'development' | 'production',
		protected v1Compat: boolean
	) {}

	get name() {
		return this._name ?? 'unknown'
	}

	async load(
		jsRuntime: Runtime,
		filePath: string,
		type?: 'client' | 'server'
	) {
		const v1CompatModule = { command: null }
		const module = await jsRuntime
			.run(filePath, {
				console: this.console,
				defineCommand: (x: any) => x,
				Bridge: this.v1Compat ? v1Compat(v1CompatModule) : undefined,
			})
			.catch((err) => {
				this.console.error(
					`Failed to execute command ${this.name}: ${err}`
				)
				return null
			})
		// Command execution failed
		if (!module) return null
		// Ensure that command file exports function
		if (typeof module.__default__ !== 'function') {
			if (v1CompatModule.command) {
				module.__default__ = v1CompatModule.command
			} else {
				this.console.error(
					`Component ${filePath} is not a valid component. Expected a function as the default export.`
				)
				return false
			}
		}

		const name = (name: string) => (this._name = name)
		let schema: Function = (schema: any) => (this.schema = schema)
		let template: Function = () => {}

		if (!type || type === 'server') {
			schema = () => {}
			template = (func: TTemplate) => {
				this.template = (commandArgs: unknown[], opts: any) => {
					try {
						return func(commandArgs, opts)
					} catch (err) {
						this.console.error(err)
						return []
					}
				}
			}
		}

		await module.__default__({
			name,
			schema,
			template,
		})
	}

	process(
		command: string,
		dependencies: Record<string, Command>,
		nestingDepth: number
	) {
		if (command.startsWith('/')) command = command.slice(1)

		const [commandName, ...args] = tokenizeCommand(command).tokens.map(
			({ word }) => word
		)

		const commands = this.template?.(
			args.map((arg) => castType(arg)),
			{
				compilerMode: this.mode,
				commandNestingDepth: nestingDepth,
				compileCommands: (customCommands: string[]) => {
					return transformCommands(
						customCommands.map((command) =>
							command.startsWith('/') ? command : `/${command}`
						),
						dependencies,
						false,
						nestingDepth + 1
					).map((command) =>
						command.startsWith('/') ? command.slice(1) : command
					)
				},
			}
		)
		let processedCommands: string[] = []
		if (typeof commands === 'string')
			processedCommands = commands.split('\n')
		else if (Array.isArray(commands))
			processedCommands = commands.filter(
				(command) => typeof command === 'string'
			)
		else {
			const errrorMsg = `Failed to process command ${
				this._name
			}; Invalid command template return type: Expected string[] or string, received ${typeof commands}`
			this.console.error(errrorMsg)
			processedCommands.push(`# ${errrorMsg}`)
		}

		return processedCommands.map((command) =>
			command.startsWith('/') || command.startsWith('#')
				? command
				: `/${command}`
		)
	}

	getSchema() {
		if (!this.schema) return [{ commandName: this.name }]
		else if (Array.isArray(this.schema)) {
			if (this.schema.length === 0) return [{ commandName: this.name }]

			return this.schema.map((schema) => ({
				commandName: this.name,
				...schema,
			}))
		}

		// If commandName is not set on the schema, set it to the current name of the command.
		if (!this.schema.commandName) this.schema.commandName = this.name

		return [this.schema]
	}

	/**
	 * Returns the command src as a string.
	 */
	toString() {
		return this.commandSrc
	}
}
