import 'dotenv/config'
import { existsSync } from 'node:fs'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)

function normalizeDatabaseUrlForLocalVitestRuns(): void {
  if (!process.env.VITEST) {
    return
  }

  if (process.env.CI === 'true') {
    return
  }

  if (existsSync('/.dockerenv')) {
    return
  }

  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) {
    return
  }

  let parsedUrl: URL
  try {
    parsedUrl = new URL(databaseUrl)
  } catch {
    return
  }

  const isPostgresProtocol = parsedUrl.protocol === 'postgres:' || parsedUrl.protocol === 'postgresql:'
  if (!isPostgresProtocol || parsedUrl.hostname !== 'db') {
    return
  }

  parsedUrl.hostname = '127.0.0.1'
  process.env.DATABASE_URL = parsedUrl.toString()
}

function patchPgPoolExportForVitestInterop(): void {
  let moduleId: string
  try {
    moduleId = require.resolve('pg-pool')
  } catch {
    return
  }

  try {
    const loadedModule = require(moduleId) as unknown
    if (typeof loadedModule === 'function') {
      return
    }

    if (
      typeof loadedModule === 'object' &&
      loadedModule !== null &&
      'default' in loadedModule &&
      typeof (loadedModule as { default?: unknown }).default === 'function'
    ) {
      const cachedModule = require.cache[moduleId]
      if (cachedModule) {
        cachedModule.exports = (loadedModule as { default: unknown }).default
      }
    }
  } catch {
    // This is an optional compatibility workaround for pg-pool module export shape + comfortable 0-config testing
    // If this fails, do not crash Vitest setup here; let tests continue with the default export behavior.
  }
}

normalizeDatabaseUrlForLocalVitestRuns()
patchPgPoolExportForVitestInterop()
