import { eq, sql } from 'drizzle-orm'
import { z } from 'zod'
import { useDb, users } from '~~/server/database'

const bodySchema = z.object({
  name: z.string().trim().min(2, 'Tell us your name.').max(80),
  email: z.string().trim().toLowerCase().email('That email does not look right.'),
  password: z.string().min(8, 'Use at least 8 characters.').max(200),
  phone: z
    .string()
    .trim()
    .regex(/^(09\d{9}|\+639\d{9})$/, 'Use a PH mobile number, e.g. 09171234567.')
    .optional()
    .or(z.literal('').transform(() => undefined)),
})

export default defineEventHandler(async (event) => {
  const body = await readValidatedBody(event, bodySchema.parse)
  const db = useDb()

  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(sql`lower(${users.email})`, body.email))
    .limit(1)

  if (existing) {
    throw createError({
      statusCode: 409,
      statusMessage: 'That email is already registered. Try signing in instead.',
    })
  }

  const [user] = await db
    .insert(users)
    .values({
      name: body.name,
      email: body.email,
      phone: body.phone,
      passwordHash: await hashPassword(body.password),
      role: 'buyer',
    })
    .returning()

  await setUserSession(event, {
    user: {
      id: user!.id,
      email: user!.email,
      name: user!.name,
      role: user!.role,
      makerId: null,
      avatarUrl: user!.avatarUrl,
    },
    loggedInAt: Date.now(),
  })

  return { ok: true }
})
