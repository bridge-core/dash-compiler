import { Console } from './Console'

export class DefaultConsole extends Console {
	constructor(verboseLogs?: boolean) {
		super(verboseLogs)
	}

	log(...args: any[]): void {
		console.log(...args)
	}
	error(...args: any[]): void {
		console.error(...args)
	}
	warn(...args: any[]): void {
		console.warn(...args)
	}
	info(...args: any[]): void {
		console.info(...args)
	}
}
