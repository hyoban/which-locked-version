import { EOL } from 'node:os'

import { parse } from 'yaml'

export type PackageVersionMap = Record<string, Set<string>>

export function parseLockFile(content: string): PackageVersionMap {
  const parsed = safeJsonParse(content)
  if (!parsed) {
    if (
      content.startsWith(`# THIS IS AN AUTOGENERATED FILE. DO NOT EDIT THIS FILE DIRECTLY.${EOL}# yarn lockfile v1`)
    ) {
      return parseYarnLockFileV1(content)
    }

    return parsePnpmLockFile(parse(content))
  }
  return parseNpmLockFile(parsed)
}

function safeJsonParse(text: string): false | object {
  try {
    return JSON.parse(text)
  }
  catch {
    return false
  }
}

function parseNpmLockFile(parsed: any): PackageVersionMap {
  const { packages } = parsed
  return countPackageVersions(
    Object.entries(packages)
      .map(([key, value]) => {
        const packageName = key.split('node_modules/').at(-1)!
        const { version } = value as any
        return { packageName, version }
      })
      .filter(i => i.packageName !== ''),
  )
}

function parsePnpmLockFile(parsed: any): PackageVersionMap {
  const packages = Object.keys(parsed.packages)
  const packagesWithVersion = countPackageVersions(
    packages.map(i => extractPackageNameAndVersion(i, `pnpm${parsed.lockfileVersion}` as any)),
  )
  return packagesWithVersion
}

function parseYarnLockFileV1(content: string): PackageVersionMap {
  const lines = content.match(/^".+":\n {2}version "(\S+)"$/gm)
  if (!lines)
    return {}

  const packages = lines.flatMap((i) => {
    const [packageNameWithSpecifier, version] = i.split('\n')
    const { packageName } = extractPackageNameAndVersion(
      packageNameWithSpecifier!
        .slice(0, -1)
        .split(',')
        .map(i => i.trim().slice(1, -1))
        .at(0)!,
      'yarn1',
    )
    return { packageName, version: version!.slice(11, -1) }
  })

  return countPackageVersions(packages)
}

function extractPackageNameAndVersion(
  text: string,
  lockeFileVersion: 'yarn1' | 'pnpm5.4' | 'pnpm6.0' | 'pnpm9.0',
): {
    packageName: string
    version: string
  } {
  switch (lockeFileVersion) {
    case 'yarn1':
    case 'pnpm9.0': {
      // @aashutoshrathi/word-wrap@1.2.6
      // spilt by last @
      const index = text.lastIndexOf('@')
      const packageName = text.slice(0, index)
      const version = text.slice(index + 1)
      return { packageName, version }
    }
    case 'pnpm6.0': {
      // /viem@2.1.1(typescript@5.3.3)(zod@3.22.4):
      const index = text.indexOf('(')
      const packageWithVersion = text.slice(1, index)
      const atIndex = packageWithVersion.lastIndexOf('@')
      const packageName = packageWithVersion.slice(0, atIndex)
      const version = packageWithVersion.slice(atIndex + 1)
      return { packageName, version }
    }
    case 'pnpm5.4': {
      // /@babel/helper-create-class-features-plugin/7.18.9_@babel+core@7.18.13
      const index = text.lastIndexOf('/')
      const packageName = text.slice(1, index)
      const version = text
        .slice(index + 1)
        .split('_')
        .at(0)!
      return { packageName, version }
    }
  }
}

function countPackageVersions(
  versions: Array<{ packageName: string, version: string }>,
): PackageVersionMap {
  return versions.reduce((acc, { packageName, version }) => {
    if (acc[packageName]) {
      acc[packageName].add(version)
    }
    else {
      acc[packageName] = new Set([version])
    }
    return acc
  }, {} as Record<string, Set<string>>)
}
