export type TCompilerPlugin = {
	/**
	 * Runs once before a build process starts
	 */
	buildStart(): Promise<void> | void
	/**
	 * Register files that should be loaded too
	 *
	 * Return a tuple like [['path/to/file', { isVirtual: true }]] for fully virtual files
	 */
	include(): Maybe<(string | [string, { isVirtual?: boolean }])[]>

	/**
	 * Ignore specific files from being treated further by this plugin
	 */
	ignore(filePath: string): Maybe<boolean>

	/**
	 * Transform file path
	 * - E.g. adjust file path to point to build folder
	 * - Return null to omit file from build output
	 */
	transformPath(filePath: string | null): Maybe<string>

	/**
	 * Read the file at `filePath` and return its content
	 * - Return null/undefined to just copy the file over
	 *
	 */
	read(
		filePath: string,
		fileHandle?: {
			/**
			 * @returns null if the file no longer exists
			 */
			getFile(): Promise<File | null> | File | null
		}
	): Promise<any> | any

	/**
	 * Load the fileContent and bring it into a usable form
	 */
	load(filePath: string, fileContent: any): Promise<any> | any

	/**
	 * Provide alternative lookups for a file
	 * - E.g. custom component names
	 */
	registerAliases(source: string, fileContent: any): Maybe<string[]>

	/**
	 * Register that a file depends on other files
	 */
	require(source: string, fileContent: any): Maybe<string[]>

	/**
	 * Transform a file's content
	 */
	transform(
		filePath: string,
		fileContent: any,
		dependencies?: Record<string, any>
	): Promise<any> | any

	/**
	 * Prepare data before it gets written to disk
	 *
	 * - Return null to omit file from output
	 */
	finalizeBuild(
		filePath: string,
		fileContent: any
	): Maybe<string | Uint8Array | ArrayBuffer | Blob>

	/**
	 * Runs once after a build process ended
	 */
	buildEnd(): Promise<void> | void

	/**
	 * Runs before dash unlinks a file
	 */
	beforeFileUnlinked(filePath: string): Promise<void> | void
}
