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
			fileName: format => `dash-compiler.${format}.js`,
		},
		rollupOptions: {
			external: [
				'json5',
				'pathe',
				'@bridge-editor/mc-project-core',
				'@bridge-editor/molang',
				'@bridge-editor/js-runtime',
				'@bridge-editor/common-utils',
				'fs',
				'is-glob',
				'@swc/wasm-web',
				'micromatch',
			],
		},
	},
})
