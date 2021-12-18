export interface IScriptContext {
	script: string
	env: Record<string, unknown>
	async?: boolean
	modules?: Record<string, unknown>
}

export function run(context: IScriptContext) {
	if (context.async)
		return createRunner(context)(...Object.values(context.env)).catch(
			(err: any) => {
				console.error(context.script)
				throw new Error(`Error within script: ${err}`)
			}
		)

	try {
		return createRunner(context)(...Object.values(context.env))
	} catch (err) {
		console.error(context.script)
		throw new Error(`Error within script: ${err}`)
	}
}

export function createRunner({
	script,
	env,
	modules,
	async = false,
}: IScriptContext) {
	let transformedScript = transformScript(script)

	// Helper which allows for quickly setting up importable modules
	if (modules) {
		if (!async)
			throw new Error(
				`Cannot use script modules without making script async!`
			)
		const currRequire = env.require

		env.require = async (moduleName: string) => {
			if (modules[moduleName]) return modules[moduleName]

			if (typeof currRequire === 'function')
				return await currRequire?.(moduleName)
		}
	}

	try {
		if (async)
			return new Function(
				...Object.keys(env),
				`return (async () => {\n${transformedScript}\n})()`
			)
		return new Function(...Object.keys(env), transformedScript)
	} catch (err) {
		console.error(script)
		throw new Error(`Error within script: ${err}`)
	}
}

export function transformScript(script: string) {
	return (
		script
			.replace(/export default /g, 'module.exports = ')
			// TODO: Support named exports
			// .replace(/export (var|const|let|function|class) /g, (substr) => {
			// 	return substr
			// })
			.replace(
				/import\s+(\* as [a-z][a-z0-9]*|[a-z][a-z0-9]+|{[a-z\s][a-z0-9,\s]*})\s+from\s+["'](.+)["']/gi,
				(_, imports, moduleName) => {
					if (imports.startsWith(`* as `))
						imports = imports.replace('* as ', '')
					return `const ${imports} = await require('${moduleName}')`
				}
			)
	)
}
