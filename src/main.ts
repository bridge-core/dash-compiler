import { DenoFileSystem } from './FileSystem/Deno.ts'
import { Dash } from './Dash.ts'
import { parse } from 'flags'

export { Dash } from './Dash.ts'
export { FileSystem } from './FileSystem/FileSystem.ts'

if (import.meta.main && typeof Deno !== 'undefined') {
	const fileSystem = new DenoFileSystem(Deno.cwd())

	const dash = new Dash(fileSystem, {
		config: 'config.json',
	})

	const flags = parse(Deno.args)

	if (flags.watch) {
		dash.watch()
	} else {
		dash.build()
	}
}
