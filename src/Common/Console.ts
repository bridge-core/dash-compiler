export abstract class Console {
	protected _timers = new Map<string, number>()

	constructor(protected verboseLogs: boolean = false) {}

	abstract log(...args: any[]): void
	abstract error(...args: any[]): void
	abstract warn(...args: any[]): void
	abstract info(...args: any[]): void

	time(timerName: string) {
		if (!this.verboseLogs) return

		if (this._timers.has(timerName)) {
			this.warn(`Timer "${timerName}" already exists.`)
			return
		} else {
			this._timers.set(timerName, Date.now())
		}
	}
	timeEnd(timerName: string) {
		if (!this.verboseLogs) return

		const time = this._timers.get(timerName)

		if (!time) {
			this.warn(`Timer "${timerName}" does not exist.`)
			return
		} else {
			this._timers.delete(timerName)
			this.log(`${timerName}: ${Date.now() - time}ms`)
		}
	}
}
