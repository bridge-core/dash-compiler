import { isMatch } from '@bridge-editor/common-utils'
import { TCompilerPluginFactory } from '../TCompilerPluginFactory'

/**
 * @example
 * jsonStringifyWithFloatFix(fileContent, [
 * 		{
 * 			pathGlob: 'minecraft:entity/description/properties/*╱value',
 * 			apply(path, traversedObjects) {
 * 				if (traversedObjects.length === 0) return false
 *
 * 				if (traversedObjects[traversedObjects.length - 1].type !== 'float') return false
 *
 * 				return true
 * 			},
 * 		},
 * 		{
 * 			pathGlob: 'minecraft:entity/description/properties/*╱range/*',
 * 			apply(path, traversedObjects) {
 * 				if (traversedObjects.length < 2) return false
 *
 * 				if (traversedObjects[traversedObjects.length - 2].type !== 'float') return false
 *
 * 				return true
 * 			},
 * 		},
 * ])
 * @param json The JSON object that will be stringified
 * @param matches A list of objects describing where the float fix should be applied. pathGlob is a glob matcher string of the path traversed inside the JSON object. Traversed objects is a list of parent objects in the order that the replacer has traversed down.
 * @param spacing The spacing to use. Pass null for minimal whitespace
 * @returns The stringified JSON
 */
export function jsonStringifyWithFloatFix(json: Object, matches: { pathGlob: string; apply?: (path: string, traversedObjects: any[]) => boolean }[], spacing: any = '\t') {
	let traversedKeys: string[] = []
	let traversedObjects: any[] = []
	return JSON.stringify(
		json,
		function (key, value) {
			if (key !== '') {
				traversedKeys.push(key)
				traversedObjects.push(this)
			}

			if (typeof value !== 'object') {
				const path = traversedKeys.join('/')
				const matcherTraversedObjects = [...traversedObjects]

				console.log(path)

				traversedKeys.pop()
				traversedObjects.pop()

				if (typeof value === 'number') {
					for (const matcher of matches) {
						console.log(path, matcher.pathGlob, isMatch(path, matcher.pathGlob))

						if (isMatch(path, matcher.pathGlob) && (!matcher.apply || matcher.apply(path, matcherTraversedObjects))) {
							let result = value.toString()

							return `$___dash___floatPropertyTruncationFix___THIS IS AUTO GENERATED AND I HATE IT___${result.includes('.') ? result : result + '.0'}`
						}
					}
				}

				return value
			} else {
				return value
			}
		},
		spacing
	).replaceAll(/"\$___dash___floatPropertyTruncationFix___THIS IS AUTO GENERATED AND I HATE IT___([0-9]|\.|-)+"/g, value => {
		return value.substring(80, value.length - 1)
	})
}

/*
Fixes the issue where stringified JSON will truncate floats which minecraft expects to be in entity float properties
*/
export const FloatPropertyTruncationFix: TCompilerPluginFactory = ({ fileType }) => {
	return {
		finalizeBuild(filePath, fileContent) {
			if (fileType?.getId(filePath) !== 'entity') return

			if (!filePath.endsWith('player.json')) return fileContent

			if (typeof fileContent === 'string') return fileContent

			return jsonStringifyWithFloatFix(fileContent, [
				{
					pathGlob: 'minecraft:entity/description/properties/*/value',
					apply(path, traversedObjects) {
						if (traversedObjects.length === 0) return false

						if (traversedObjects[traversedObjects.length - 1].type !== 'float') return false

						return true
					},
				},
				{
					pathGlob: 'minecraft:entity/description/properties/*/range/*',
					apply(path, traversedObjects) {
						if (traversedObjects.length < 2) return false

						if (traversedObjects[traversedObjects.length - 2].type !== 'float') return false

						return true
					},
				},
			])
		},
	}
}
