import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { makers, useDb } from '~~/server/database'

const bodySchema = z.object({
  verification: z.enum(['unverified', 'pending', 'verified', 'rejected']),
})

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = getRouterParam(event, 'id')!
  const body = await readValidatedBody(event, bodySchema.parse)
  const db = useDb()

  const [updated] = await db
    .update(makers)
    .set({
      verification: body.verification,
      verifiedAt: body.verification === 'verified' ? new Date() : null,
    })
    .where(eq(makers.id, id))
    .returning({ id: makers.id, verification: makers.verification })

  if (!updated) throw createError({ statusCode: 404, statusMessage: 'Shop not found.' })

  return updated
})
