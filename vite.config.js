import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
	test: {
		includeSource: ['src/**/*.test.ts'],
	},
	define: {
		'import.meta.vitest': 'undefined',
	},
	build: {
		lib: {
			entry: resolve(__dirname, 'src/main.ts'),
			name: 'DashCompiler',
			fileName: (format) => `dash-compiler.${format}.js`,
		},
		rollupOptions: {
			external: [
				'json5',
				'path-browserify',
				'mc-project-core',
				'molang',
				'fs',
				'bridge-common-utils',
				'is-glob',
				'bridge-js-runtime',
				'@swc/wasm-web',
				'micromatch',
			],
		},
	},
})
