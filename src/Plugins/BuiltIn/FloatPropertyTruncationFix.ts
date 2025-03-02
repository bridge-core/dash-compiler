import { TCompilerPluginFactory } from '../TCompilerPluginFactory'

/*
Fixes the issue where stringified JSON will truncate floats which minecraft expects to be in entity float properties
*/
export const FloatPropertyTruncationFix: TCompilerPluginFactory = ({ fileType }) => {
	return {
		finalizeBuild(filePath, fileContent) {
			if (fileType?.getId(filePath) !== 'entity') return

			let path: string[] = []
			return JSON.stringify(
				fileContent,
				(key, value) => {
					if (key !== '') path.push(key)

					if (typeof value !== 'object') {
						path.pop()

						if (key === 'default' && typeof value === 'number' && path[path.length - 2] === 'properties') {
							let result = value.toString()

							return `$___dash___floatPropertyTruncationFix___THIS IS AUTO GENERATED AND I HATE IT___${result.includes('.') ? result : result + '.0'}`
						}

						if (typeof value === 'number' && path[path.length - 1] === 'range' && path[path.length - 3] === 'properties') {
							let result = value.toString()

							return `$___dash___floatPropertyTruncationFix___THIS IS AUTO GENERATED AND I HATE IT___${result.includes('.') ? result : result + '.0'}`
						}

						return value
					} else {
						return value
					}
				},
				'\t'
			).replaceAll(/"\$___dash___floatPropertyTruncationFix___THIS IS AUTO GENERATED AND I HATE IT___([0-9]|\.|-)+"/g, value => {
				return value.substring(80, value.length - 1)
			})
		},
	}
}
