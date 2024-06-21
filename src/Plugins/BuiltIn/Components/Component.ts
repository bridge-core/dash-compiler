import { compare } from 'compare-versions'
import { ProjectConfig } from '@bridge-editor/mc-project-core'
import { v1Compat } from './v1Compat'
import { deepMerge, hashString } from '@bridge-editor/common-utils'
import { Console } from '../../../Common/Console'
import { join } from 'path-browserify'
import { Runtime } from '@bridge-editor/js-runtime'

export type TTemplate = (componentArgs: any, opts: any) => any

export class Component {
	protected _name?: string
	protected schema?: any
	protected template?: TTemplate
	protected animations: [any, string | false | undefined][] = []
	protected animationControllers: [any, string | false | undefined][] = []
	protected createOnPlayer: [string, any, any][] = []
	protected dialogueScenes: Record<string, any[]> = {}
	protected serverFiles: [string, any][] = []
	protected clientFiles: Record<string, any> = {}
	protected projectConfig?: ProjectConfig
	protected lifecycleHookCount = {
		activated: 0,
		deactivated: 0,
	}

	constructor(
		protected console: Console,
		protected fileType: string,
		protected componentSrc: string,
		protected mode: 'production' | 'development',
		protected v1Compat: boolean,
		protected targetVersion?: string
	) {}

	setProjectConfig(projectConfig: ProjectConfig) {
		this.projectConfig = projectConfig
	}

	//#region Getters
	get name() {
		return this._name
	}
	//#endregion

	async load(
		jsRuntime: Runtime,
		filePath: string,
		type?: 'server' | 'client'
	) {
		let v1CompatModule = { component: null }
		const module = await jsRuntime
			.run(filePath, {
				defineComponent: (x: any) => x,
				console: this.console,
				Bridge: this.v1Compat
					? v1Compat(v1CompatModule, this.fileType)
					: undefined,
			})
			.catch((err) => {
				this.console.error(
					`Failed to execute component "${filePath}": ${err}`
				)
				return null
			})
		// Component execution failed
		if (!module) return false
		// Ensure that component file exports function
		if (typeof module.__default__ !== 'function') {
			if (v1CompatModule.component) {
				module.__default__ = v1CompatModule.component
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
				this.template = (componentArgs: any, opts: any) => {
					try {
						func(componentArgs, opts)
					} catch (err) {
						this.console.log(func.toString())
						this.console.error(err)
					}
				}
			}
		}

		await module.__default__({
			name,
			schema,
			template,
		})
		return true
	}
	reset() {
		/**
		 * Clear previous animation (controllers)
		 *
		 * **Items:**
		 * In order to make the player.animation() and player.animationController() calls work,
		 * we should not clear the arrays here
		 */
		if (this.fileType !== 'item') {
			this.animations = []
			this.animationControllers = []
		}

		// Clear other files
		this.clientFiles = {}
		this.serverFiles = []
	}

	getSchema() {
		return this.schema
	}
	toString() {
		return this.componentSrc
	}

	create(
		fileContent: any,
		template: any,
		location = `minecraft:${this.fileType}`,
		operation?: (
			deepMerge: (oldData: any, newData: any) => any,
			oldData: any,
			newData: any
		) => any
	) {
		const keys = location.split('/')
		const lastKey = keys.pop()!

		const current = this.getObjAtLocation(fileContent, [...keys])

		current[lastKey] = (
			operation
				? (oldData: any, newData: any) =>
						operation(deepMerge, oldData, newData)
				: deepMerge
		)(current[lastKey] ?? {}, template ?? {})
	}
	protected getObjAtLocation(fileContent: any, location: string[]) {
		let current: any = fileContent

		while (location.length > 0) {
			const key = location.shift()!

			if (current[key] === undefined) {
				if (current[Number(key)] !== undefined) {
					current = current[Number(key)]
				} else {
					current[key] = {}
					current = current[key]
				}
			} else {
				current = current[key]
			}
		}

		return current
	}

	async processTemplates(
		fileContent: any,
		componentArgs: any,
		location: string
	) {
		if (typeof this.template !== 'function') return

		// Try getting file identifier
		const identifier: string =
			fileContent[`minecraft:${this.fileType}`]?.description
				?.identifier ?? 'bridge:no_identifier'
		// Used to compose the animation (controller) short name so the user knows how to reference their animation (controller)
		const fileName = await hashString(`${this.name}/${identifier}`)

		const projectNamespace =
			this.projectConfig?.get()?.namespace ?? 'bridge'
		let folderNamespace: string
		if (projectNamespace.includes('_')) {
			const studioname = projectNamespace.split('_')[0]
			const packname = projectNamespace.split('_').slice(1).join('_')
			folderNamespace = `${studioname}/${packname}`
		} else {
			folderNamespace = 'bridge'
		}

		// Setup animation/animationController helper
		const animation = (animation: any, molangCondition?: string) => {
			this.animations.push([animation, molangCondition])
			return this.getShortAnimName(
				'a',
				fileName,
				this.animations.length - 1
			)
		}

		const animationController = (
			animationController: any,
			molangCondition?: string
		) => {
			this.animationControllers.push([
				animationController,
				molangCondition,
			])
			return this.getShortAnimName(
				'ac',
				fileName,
				this.animationControllers.length - 1
			)
		}

		const lootTable = (lootTableDef: any) => {
			//TODO In the marketplace add-ons need to be follow the format of loot_tables/<studio name>/<pack name>/<trade table name>.json
			const lootId = `loot_tables/${folderNamespace}/${this.getShortAnimName(
				'lt',
				fileName,
				this.serverFiles.length
			)}.json`
			this.serverFiles.push([lootId, lootTableDef])

			return lootId
		}
		const tradeTable = (tradeTableDef: any) => {
			//TODO In the marketplace add-ons need to be follow the format of trading/<studio name>/<pack name>/<trade table name>.json
			const tradeId = `trading/${folderNamespace}/${this.getShortAnimName(
				'tt',
				fileName,
				this.serverFiles.length
			)}.json`
			this.serverFiles.push([tradeId, tradeTableDef])

			return tradeId
		}
		const recipe = (recipeDef: any) => {
			this.serverFiles.push([
				`recipes/${folderNamespace}/${this.getShortAnimName(
					'recipe',
					fileName,
					this.serverFiles.length
				)}.json`,
				recipeDef,
			])
		}
		const spawnRule = (spawnRuleDef: any) => {
			this.serverFiles.push([
				`spawn_rules/${folderNamespace}/${this.getShortAnimName(
					'sr',
					fileName,
					this.serverFiles.length
				)}.json`,
				spawnRuleDef,
			])
		}

		const permutationEventName = (
			await hashString(`${this.name}/${location}`)
		).slice(0, 16)
		const onActivated = (eventResponse: any) =>
			this.registerLifecycleHook(
				fileContent,
				location,
				eventResponse,
				permutationEventName,
				'activated'
			)
		const onDeactivated = (eventResponse: any) =>
			this.registerLifecycleHook(
				fileContent,
				location,
				eventResponse,
				permutationEventName,
				'deactivated'
			)

		// Execute template function with context for current fileType
		if (this.fileType === 'entity') {
			this.template(componentArgs ?? {}, {
				// @deprecated remove with next major version
				mode: this.mode,
				compilerMode: this.mode,
				sourceEntity: () => JSON.parse(JSON.stringify(fileContent)),
				create: (template: any, location?: string, operation?: any) =>
					this.create(fileContent, template, location, operation),
				location,
				identifier,
				projectNamespace,
				animationController,
				animation,
				lootTable,
				tradeTable,
				spawnRule,
				dialogueScene:
					!this.targetVersion ||
					compare(this.targetVersion, '1.17.10', '>=')
						? (scene: any, openDialogue = true) => {
								if (!this.dialogueScenes[fileName])
									this.dialogueScenes[fileName] = []
								this.dialogueScenes[fileName].push(scene)

								if (scene.scene_tag && openDialogue)
									onActivated({
										run_command: {
											command: [
												`/dialogue open @s @p ${scene.scene_tag}`,
											],
										},
									})
						  }
						: undefined,
				onActivated,
				onDeactivated,
				client: {
					create: (clientEntity: any, formatVersion = '1.10.0') => {
						this.clientFiles[
							`entity/${folderNamespace}/${fileName}.json`
						] = {
							format_version: formatVersion,
							'minecraft:client_entity': Object.assign(
								{
									description: {
										identifier,
									},
								},
								clientEntity
							),
						}
					},
				},
			})
		} else if (this.fileType === 'item') {
			this.template(componentArgs ?? {}, {
				// @deprecated remove with next major version
				mode: this.mode,
				compilerMode: this.mode,
				sourceItem: () => JSON.parse(JSON.stringify(fileContent)),
				create: (template: any, location?: string, operation?: any) =>
					this.create(fileContent, template, location, operation),
				location,
				identifier,
				projectNamespace,
				lootTable,
				recipe,
				player: {
					animationController,
					animation,
					create: (
						template: any,
						location?: string,
						operation?: any
					) => {
						this.createOnPlayer.push([
							location ?? `minecraft:entity`,
							template,
							operation,
						])
					},
				},
			})
		} else if (this.fileType === 'block') {
			this.template(componentArgs ?? {}, {
				// @deprecated remove with next major version
				mode: this.mode,
				compilerMode: this.mode,
				sourceBlock: () => JSON.parse(JSON.stringify(fileContent)),
				create: (template: any, location?: string, operation?: any) =>
					this.create(fileContent, template, location, operation),
				lootTable,
				recipe,
				location,
				identifier,
				projectNamespace,
			})
		}
	}

	async processAdditionalFiles(
		filePath: string,
		fileContent: any,
		isPlayerFile = false
	) {
		const bpRoot =
			this.projectConfig?.getRelativePackRoot('behaviorPack') ?? 'BP'
		const rpRoot = this.projectConfig?.getRelativePackRoot('resourcePack')
		// Try getting file identifier
		const identifier = isPlayerFile
			? 'minecraft:player'
			: fileContent[`minecraft:${this.fileType}`]?.description
					?.identifier ?? 'bridge:no_identifier'

		const projectNamespace =
			this.projectConfig?.get()?.namespace ?? 'bridge'
		let folderNamespace: string
		if (projectNamespace.includes('_')) {
			const studioname = projectNamespace.split('_')[0]
			const packname = projectNamespace.split('_').slice(1).join('_')
			folderNamespace = `${studioname}/${packname}`
		} else {
			folderNamespace = 'bridge'
		}

		const fileName = (await hashString(`${this.name}/${identifier}`)).slice(
			0,
			25
		)
		const animFileName = `${bpRoot}/animations/${folderNamespace}/${fileName}.json`
		const animControllerFileName = `${bpRoot}/animation_controllers/${folderNamespace}/${fileName}.json`

		if (identifier === 'minecraft:player') {
			this.createOnPlayer.forEach(([location, template, operation]) => {
				this.create(fileContent, template, location, operation)
			})
		}

		// No rpRoot means that we cannot generate client files
		if (!rpRoot) {
			this.clientFiles = {}
			this.console.error(
				`[${this.name}] Dash was unable to load the root of your resource pack and therefore cannot generate client files for this component.`
			)
		}

		let anims = {}
		// Only create animations if we are not an item or we're a player file
		if (this.fileType !== 'item' || identifier === 'minecraft:player') {
			// Create animations
			anims = {
				[animFileName]: {
					baseFile: filePath,
					fileContent: this.createAnimations(fileName, fileContent),
				},
				[animControllerFileName]: {
					baseFile: filePath,
					fileContent: this.createAnimationControllers(
						fileName,
						fileContent
					),
				},
			}
		}

		return {
			...anims,
			[join(bpRoot, `dialogue/${folderNamespace}/${fileName}.json`)]:
				this.dialogueScenes[fileName] &&
				this.dialogueScenes[fileName].length > 0
					? {
							baseFile: filePath,
							fileContent: JSON.stringify(
								{
									format_version: this.targetVersion,
									'minecraft:npc_dialogue': {
										scenes: this.dialogueScenes[fileName],
									},
								},
								null,
								'\t'
							),
					  }
					: undefined,
			...Object.fromEntries(
				this.serverFiles.map(([currFilePath, fileDef]) => [
					join(bpRoot, currFilePath),
					{
						baseFile: filePath,
						fileContent: JSON.stringify(fileDef, null, '\t'),
					},
				])
			),
			...Object.fromEntries(
				Object.entries(this.clientFiles).map(
					([currFilePath, jsonContent]) => [
						join(rpRoot!, currFilePath),
						{
							baseFile: filePath,
							fileContent: JSON.stringify(
								jsonContent,
								null,
								'\t'
							),
						},
					]
				)
			),
		}
	}

	protected createAnimations(fileName: string, fileContent: any) {
		if (this.animations.length === 0) return

		const projectNamespace =
			this.projectConfig?.get()?.namespace ?? 'bridge'

		let id = 0
		const animations: any = { format_version: '1.10.0', animations: {} }

		for (const [anim, condition] of this.animations) {
			if (!anim) {
				id++
				continue
			}

			// Create unique animId
			const animId = this.getAnimName(
				'animation',
				projectNamespace,
				fileName,
				id
			)
			// Create shorter reference to animId that's unique per entity
			const shortAnimId = this.getShortAnimName('a', fileName, id)

			// Save animation to animations object
			animations.animations[animId] = anim

			// Register animation on entity
			this.create(
				fileContent,
				{
					animations: {
						[shortAnimId]: animId,
					},
				},
				'minecraft:entity/description'
			)

			// Users can set the condition to false to skip running the animation automatically
			if (condition !== false)
				// Register animation on entity
				this.create(
					fileContent,
					{
						scripts: {
							animate: [
								!condition
									? shortAnimId
									: { [shortAnimId]: condition },
							],
						},
					},
					'minecraft:entity/description'
				)

			id++
		}

		return JSON.stringify(animations, null, '\t')
	}
	protected createAnimationControllers(fileName: string, fileContent: any) {
		if (this.animationControllers.length === 0) return

		const projectNamespace =
			this.projectConfig?.get()?.namespace ?? 'bridge'

		let id = 0
		const animationControllers: any = {
			format_version: '1.10.0',
			animation_controllers: {},
		}

		for (const [anim, condition] of this.animationControllers) {
			if (!anim) {
				id++
				continue
			}

			// Create unique animId
			const animId = this.getAnimName(
				'controller.animation',
				projectNamespace,
				fileName,
				id
			)
			// Create shorter reference to animId that's unique per entity
			const shortAnimId = this.getShortAnimName('ac', fileName, id)

			// Save animation controller to animationControllers object
			animationControllers.animation_controllers[animId] = anim

			// Register animation controller on entity
			this.create(
				fileContent,
				{
					animations: {
						[shortAnimId]: animId,
					},
				},
				'minecraft:entity/description'
			)

			// Users can set the condition to false to skip running the animation controller automatically
			if (condition !== false)
				// Register animation on entity
				this.create(
					fileContent,
					{
						scripts: {
							animate: [
								!condition
									? shortAnimId
									: { [shortAnimId]: condition },
							],
						},
					},
					'minecraft:entity/description'
				)

			id++
		}

		return JSON.stringify(animationControllers, null, '\t')
	}

	protected getAnimName(
		prefix: string,
		namespace: string,
		fileName: string,
		id: number
	) {
		return `${prefix}.${namespace}_${fileName}_${id}`
	}
	protected getShortAnimName(category: string, fileName: string, id: number) {
		return `${fileName.slice(0, 16) ?? 'bridge_auto'}_${category}_${id}`
	}

	/**
	 * Component lifecycle logic
	 */
	protected registerLifecycleHook(
		fileContent: any,
		location: string,
		eventResponse: any,
		permutationEventName: string,
		type: 'activated' | 'deactivated'
	) {
		if (!fileContent[`minecraft:${this.fileType}`].events)
			fileContent[`minecraft:${this.fileType}`].events = {}
		const entityEvents = fileContent[`minecraft:${this.fileType}`].events

		if (
			type === 'activated' &&
			location === `minecraft:${this.fileType}/components`
		) {
			if (!entityEvents['minecraft:entity_spawned'])
				entityEvents['minecraft:entity_spawned'] = {}

			this.addEventReponse(
				entityEvents['minecraft:entity_spawned'],
				eventResponse
			)
		} else if (
			this.fileType === 'entity' &&
			location.startsWith(`minecraft:${this.fileType}/component_groups/`)
		) {
			const componentGroupName = location.split('/').pop()!
			const eventsWithReferences = this.findComponentGroupReferences(
				entityEvents,
				type === 'activated' ? 'add' : 'remove',
				componentGroupName
			)

			eventsWithReferences.forEach((eventWithReference) =>
				this.addEventReponse(eventWithReference, eventResponse)
			)
		} else if (
			location.startsWith(`minecraft:${this.fileType}/permutations/`)
		) {
			const keys = location.split('/')
			if (keys.pop() !== 'components')
				throw new Error(
					'Invalid component location inside of permutation'
				)

			const permutation = this.getObjAtLocation(fileContent, [...keys])
			const eventName = `bridge:${permutationEventName}_${type}_${
				type === 'activated'
					? this.lifecycleHookCount.activated++
					: this.lifecycleHookCount.deactivated++
			}`

			if (permutation.condition)
				this.animationControllers.push([
					{
						states: {
							default: {
								on_entry: [`@s ${eventName}`],
							},
						},
					},
					type === 'activated'
						? permutation.condition
						: `!(${permutation.condition})`,
				])

			entityEvents[eventName] = eventResponse
		}
	}
	/**
	 * Merge two events together
	 *
	 * @param event Base event
	 * @param eventResponse New event response
	 */
	protected addEventReponse(event: any, eventResponse: any) {
		if (Array.isArray(event.sequence)) {
			event.sequence.push(eventResponse)
		} else if (Object.keys(event).length === 0) {
			Object.assign(event, eventResponse)
		} else {
			let oldEvent = Object.assign({}, event, { filters: undefined })
			for (const key in event) {
				if (key !== 'filters') event[key] = undefined
			}

			event.sequence = [oldEvent, eventResponse]
		}
	}
	/**
	 * Find all references to a component group inside of the events
	 *
	 * @returns An array of event objects which have references to the component group
	 */
	protected findComponentGroupReferences(
		events: any,
		type: 'add' | 'remove',
		componentGroupName: string
	) {
		let eventsWithComponentGroups: any[] = []

		for (const eventName in events) {
			const event = events[eventName]

			if (Array.isArray(event.sequence))
				eventsWithComponentGroups.push(
					...this.findComponentGroupReferences(
						event.sequence,
						type,
						componentGroupName
					)
				)
			else if (Array.isArray(event.randomize))
				eventsWithComponentGroups.push(
					...this.findComponentGroupReferences(
						event.randomize,
						type,
						componentGroupName
					)
				)
			else {
				const componentGroups = event[type]?.component_groups ?? []
				if (componentGroups.includes(componentGroupName))
					eventsWithComponentGroups.push(event)
			}
		}

		return eventsWithComponentGroups
	}
}
