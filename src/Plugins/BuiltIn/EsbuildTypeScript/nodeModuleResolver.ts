import * as esbuild from 'esbuild-wasm'
import json5 from 'json5'
import { dirname, extname, join } from 'pathe'
import { FileSystem } from '../../../main'

export function createNodeModuleResolver({
    fileSystem,
    projectRoot,
}: {
    fileSystem: FileSystem
    projectRoot: string
}) {
    const nodeModulesPath = join(projectRoot, 'node_modules')

    const readText = async (path: string) => {
        const file = await fileSystem.readFile(path)
        return file.text()
    }

    const fileExists = async (path: string) => {
        try {
            await fileSystem.readFile(path)
            return true
        } catch {
            return false
        }
    }

    const dirExists = async (path: string) => {
        try {
            await fileSystem.readdir(path)
            return true
        } catch {
            return false
        }
    }

    const resolveFilePath = async (basePath: string) => {
        const extension = extname(basePath)
        const candidates = extension
            ? [basePath]
            : [
                  `${basePath}.ts`,
                  `${basePath}.js`,
                  `${basePath}.mjs`,
                  `${basePath}.cjs`,
                  `${basePath}.json`,
                  join(basePath, 'index.ts'),
                  join(basePath, 'index.js'),
                  join(basePath, 'index.mjs'),
                  join(basePath, 'index.cjs'),
                  join(basePath, 'index.json'),
              ]

        for (const candidate of candidates) {
            if (await fileExists(candidate)) return candidate
        }

        return undefined
    }

    const pickExportsTarget = (exportsField: any, subpathKey: string): string | undefined => {
        if (!exportsField) return undefined

        if (typeof exportsField === 'string') {
            return subpathKey === '.' ? exportsField : undefined
        }

        if (typeof exportsField !== 'object') return undefined

        const entry = exportsField[subpathKey]
        const pickCondition = (value: any): string | undefined => {
            if (!value) return undefined
            if (typeof value === 'string') return value
            if (typeof value !== 'object') return undefined

            return value.import ?? value.default ?? value.require
        }

        if (entry !== undefined) return pickCondition(entry)

        if (subpathKey === '.') {
            return pickCondition(exportsField)
        }

        return undefined
    }

    const parsePackageSpecifier = (specifier: string) => {
        const isScoped = specifier.startsWith('@')
        const parts = specifier.split('/')

        if (isScoped && parts.length >= 2) {
            const packageName = `${parts[0]}/${parts[1]}`
            const subpath = parts.slice(2).join('/')
            return { packageName, subpath }
        }

        const packageName = parts[0]
        const subpath = parts.slice(1).join('/')
        return { packageName, subpath }
    }

    const resolveBare = async (specifier: string) => {
        const { packageName, subpath } = parsePackageSpecifier(specifier)
        const packageDir = join(nodeModulesPath, packageName)

        if (!(await dirExists(packageDir))) return undefined

        const packageJsonPath = join(packageDir, 'package.json')
        let packageJson: any = undefined
        if (await fileExists(packageJsonPath)) {
            try {
                packageJson = json5.parse(await readText(packageJsonPath))
            } catch {
                packageJson = undefined
            }
        }

        const subpathKey = subpath ? `./${subpath}` : '.'

        const exportsTarget = pickExportsTarget(packageJson?.exports, subpathKey)
        if (exportsTarget) {
            const resolved = await resolveFilePath(join(packageDir, exportsTarget))
            if (resolved) return resolved
        }

        if (subpath) {
            const resolvedSubpath = await resolveFilePath(join(packageDir, subpath))
            if (resolvedSubpath) return resolvedSubpath
        }

        if (!subpath) {
            const mainLike = packageJson?.module ?? packageJson?.main ?? 'index.js'
            const resolvedMain = await resolveFilePath(join(packageDir, mainLike))
            if (resolvedMain) return resolvedMain
        }

        return undefined
    }

    const resolveRelative = async (importer: string | undefined, requestPath: string) => {
        const importerDir = importer ? dirname(importer) : nodeModulesPath
        return resolveFilePath(join(importerDir, requestPath))
    }

    const loaderFor = (path: string): esbuild.Loader => {
        const extension = extname(path)
        if (extension === '.json') return 'json'
        if (extension === '.js' || extension === '.mjs' || extension === '.cjs') return 'js'
        return 'ts'
    }

    return {
        resolveBare,
        resolveRelative,
        readText,
        loaderFor,
    }
}