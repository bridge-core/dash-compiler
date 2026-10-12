import isGlob from 'is-glob'
import { join, matchesGlob } from 'pathe'
import { FileSystem } from '../../../main'

export async function findScriptFiles(path: string, fileSystem: FileSystem): Promise<string[]> {
    const entries = await fileSystem.readdir(path)

    let files: string[] = []

    for (const entry of entries) {
        if (entry.kind === 'file') {
            if (!entry.name.endsWith('.js') && !entry.name.endsWith('.ts')) continue

            files.push(join(path, entry.name))
        } else {
            const subFiles = await findScriptFiles(join(path, entry.name), fileSystem)
            files = files.concat(subFiles)
        }
    }

    return files
}

function normalizeRelativePath(path: string) {
    return path.replace(/^\.\//, '').replace(/^\//, '')
}

export async function expandEntryPoints(entrySpecs: string[], scriptsPath: string, fileSystem: FileSystem) {
    const scriptFiles = await findScriptFiles(scriptsPath, fileSystem)
    const relativeFiles = scriptFiles
        .map(filePath => filePath.substring(scriptsPath.length + 1))
        .sort((a, b) => a.localeCompare(b))

    const expanded = new Set<string>()

    for (const specRaw of entrySpecs) {
        const spec = normalizeRelativePath(specRaw)

        if (isGlob(spec)) {
            const matches = relativeFiles.filter(filePath => matchesGlob(filePath, spec))
            if (matches.length === 0) {
                console.warn(`[EsbuildTypescript] entryPoints glob matched no files: ${specRaw}`)
            }

            for (const filePath of matches) {
                expanded.add(filePath)
            }
            continue
        }

        expanded.add(spec)
    }

    return [...expanded]
}