import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import * as schema from './schema'

type Db = ReturnType<typeof create>

function create(connectionString: string) {
  return drizzle(neon(connectionString), { schema, casing: 'snake_case' })
}

let cached: Db | null = null

/**
 * Neon over HTTP rather than a pooled TCP connection: each query is a single
 * fetch, which is what you want on a serverless host where a long-lived pool
 * would leak connections between invocations.
 *
 * The trade-off is no interactive transactions. Where several writes must land
 * together (checkout, quote acceptance) we use `db.batch([...])`, which Neon
 * runs inside one server-side transaction. That requires every statement to be
 * known upfront, so those call sites generate their own UUIDs instead of
 * reading back a generated id.
 */
export function useDb(): Db {
  if (cached) return cached

  const connectionString = process.env.DATABASE_URL || useRuntimeConfig().databaseUrl

  if (!connectionString) {
    throw createError({
      statusCode: 500,
      statusMessage:
        'DATABASE_URL is not set. Copy .env.example to .env and paste your Neon connection string.',
    })
  }

  cached = create(connectionString)
  return cached
}

export { schema }
export * from './schema'
