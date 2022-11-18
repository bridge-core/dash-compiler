import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
	build: {
		emptyOutDir: false,
		lib: {
			formats: ['es'],
			entry: resolve(__dirname, 'src/main.ts'),
			name: 'DashCompiler',
			fileName: (format) => `dash-compiler.bundled.${format}.js`,
		},
	},
})
