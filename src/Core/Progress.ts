export class Progress {
	protected current = 0
	protected onChangeCbs = new Set<(progress: Progress) => void>()

	constructor(protected total = 1) {}

	get percentage() {
		return this.current / this.total
	}

	onChange(cb: (progress: Progress) => void) {
		this.onChangeCbs.add(cb)

		return {
			dispose: () => this.onChangeCbs.delete(cb),
		}
	}

	setTotal(total: number) {
		this.total = total
		this.current = 0
		this.onChangeCbs.forEach((cb) => cb(this))
	}
	updateCurrent(current: number) {
		this.current = current
		this.onChangeCbs.forEach((cb) => cb(this))
	}
	advance() {
		this.current++
		this.onChangeCbs.forEach((cb) => cb(this))
	}
	addToTotal(amount: number) {
		this.total += amount
		this.onChangeCbs.forEach((cb) => cb(this))
	}
}
