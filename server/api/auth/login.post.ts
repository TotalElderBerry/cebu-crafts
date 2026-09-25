import { eq, sql } from 'drizzle-orm'
import { z } from 'zod'
import { makers, useDb, users } from '~~/server/database'

const bodySchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
})

export default defineEventHandler(async (event) => {
  const body = await readValidatedBody(event, bodySchema.parse)
  const db = useDb()

  const [row] = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      role: users.role,
      avatarUrl: users.avatarUrl,
      passwordHash: users.passwordHash,
      makerId: makers.id,
    })
    .from(users)
    .leftJoin(makers, eq(makers.userId, users.id))
    .where(eq(sql`lower(${users.email})`, body.email))
    .limit(1)

  // Same message and roughly the same work for "no such user" and "wrong
  // password", so the response cannot be used to enumerate accounts.
  const valid = row ? await verifyPassword(row.passwordHash, body.password) : false

  if (!row || !valid) {
    throw createError({ statusCode: 401, statusMessage: 'Wrong email or password.' })
  }

  await setUserSession(event, {
    user: {
      id: row.id,
      email: row.email,
      name: row.name,
      role: row.role,
      makerId: row.makerId,
      avatarUrl: row.avatarUrl,
    },
    loggedInAt: Date.now(),
  })

  return { ok: true }
})
