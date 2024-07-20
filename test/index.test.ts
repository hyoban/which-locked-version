import fs from 'node:fs/promises'
import path from 'node:path'

import { expect, it } from 'vitest'

import { parseLockFile } from '../src'

const lockFiles = import.meta.glob('./fixtures/*.*', { query: '?raw', import: 'default' })

it('get version for this project', async () => {
  const lockfile = await fs.readFile(path.resolve(import.meta.dirname, '../pnpm-lock.yaml'), 'utf-8')
  const versionMap = parseLockFile(lockfile)
  expect(Array.from(versionMap['yaml']!)).toStrictEqual(['2.4.5'])
  expect(Array.from(versionMap['@antfu/ni']!)).toStrictEqual(['0.22.0'])
  expect(Array.from(versionMap['@typescript-eslint/utils']!)).toStrictEqual(['7.16.1', '8.0.0-alpha.44'])
})

it('get version for fixtures', async () => {
  for (const file of Object.keys(lockFiles)) {
    const fileContent = (await lockFiles[file]!()) as string
    const versionMap = parseLockFile(fileContent)
    expect(versionMap).toMatchSnapshot(file)
  }
})
