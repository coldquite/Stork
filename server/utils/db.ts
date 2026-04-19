import { createRequire } from 'node:module'
import { PrismaClient } from '~~/prisma/generated/client/client'

function resolveDatabaseUrl(): string {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl || databaseUrl.trim().length === 0) {
    throw new Error('Missing DATABASE_URL environment variable')
  }

  let parsedUrl: URL
  try {
    parsedUrl = new URL(databaseUrl)
  } catch {
    throw new Error('DATABASE_URL is not a valid URL')
  }

  const isPostgresProtocol = parsedUrl.protocol === 'postgres:' || parsedUrl.protocol === 'postgresql:'
  if (isPostgresProtocol && parsedUrl.password.length === 0) {
    throw new Error(
      'DATABASE_URL contains an empty password. Set POSTGRES_PASSWORD and ensure special characters are URL-encoded.'
    )
  }

  return databaseUrl
}

const prismaClientSingleton = () => {
  // Loaded lazily so that neither the adapter's CJS require nor the DATABASE_URL
  // check run at module load time. This matters for the @nuxt/content prerender
  // pass, which loads the full server bundle to render content routes but never
  // hits Prisma-using endpoints — and would otherwise fail on module init.
  const require = createRequire(import.meta.url)
  const { PrismaPg } = require('@prisma/adapter-pg') as typeof import('@prisma/adapter-pg')
  const pool = new PrismaPg({ connectionString: resolveDatabaseUrl() })
  return new PrismaClient({ adapter: pool })
}

type PrismaClientSingleton = ReturnType<typeof prismaClientSingleton>

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClientSingleton | undefined
}

let resolvedPrisma: PrismaClientSingleton | undefined

function getPrisma(): PrismaClientSingleton {
  if (resolvedPrisma) return resolvedPrisma
  if (globalForPrisma.prisma) return (resolvedPrisma = globalForPrisma.prisma)
  resolvedPrisma = prismaClientSingleton()
  if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = resolvedPrisma
  return resolvedPrisma
}

export const prisma = new Proxy({} as PrismaClientSingleton, {
  get(_target, prop) {
    return Reflect.get(getPrisma() as object, prop)
  }
}) as PrismaClientSingleton
