/**
 * Exercises the webhook signature verifier against the cases that matter.
 *
 *   pnpm exec tsx scripts/verify-paymongo-signature.mts
 *
 * Pure function, no network and no keys — this is the one part of the PayMongo
 * integration that can be proven correct offline, and it is also the part where
 * a mistake lets anyone mark any order paid.
 */
import { createHmac } from 'node:crypto'
import { verifyWebhookSignature } from '../server/utils/paymongo'

const SECRET = 'whsk_test_abc123'
const body = JSON.stringify({ data: { id: 'evt_1', attributes: { type: 'checkout_session.payment.paid' } } })

const sign = (payload: string, timestamp: number, secret = SECRET) =>
  createHmac('sha256', secret).update(`${timestamp}.${payload}`).digest('hex')

const now = Math.floor(Date.now() / 1000)

const cases: { name: string; header: string | undefined; body?: string; expect: boolean }[] = [
  {
    name: 'valid test-mode signature (te)',
    header: `t=${now},te=${sign(body, now)},li=`,
    expect: true,
  },
  {
    name: 'valid live-mode signature (li)',
    header: `t=${now},te=,li=${sign(body, now)}`,
    expect: true,
  },
  {
    name: 'tampered body — amount swapped after signing',
    header: `t=${now},te=${sign(body, now)}`,
    body: body.replace('evt_1', 'evt_2'),
    expect: false,
  },
  {
    name: 'signature from the wrong secret',
    header: `t=${now},te=${sign(body, now, 'whsk_test_attacker')}`,
    expect: false,
  },
  {
    name: 'replay — timestamp 10 minutes old',
    header: `t=${now - 600},te=${sign(body, now - 600)}`,
    expect: false,
  },
  {
    name: 'timestamp in the future beyond tolerance',
    header: `t=${now + 600},te=${sign(body, now + 600)}`,
    expect: false,
  },
  { name: 'missing header entirely', header: undefined, expect: false },
  { name: 'header with no signature component', header: `t=${now}`, expect: false },
  { name: 'empty signature value', header: `t=${now},te=`, expect: false },
  { name: 'garbage header', header: 'not-a-signature', expect: false },
  {
    name: 'truncated signature (length mismatch)',
    header: `t=${now},te=${sign(body, now).slice(0, 20)}`,
    expect: false,
  },
]

let failures = 0

for (const testCase of cases) {
  const actual = verifyWebhookSignature({
    rawBody: testCase.body ?? body,
    signatureHeader: testCase.header,
    webhookSecret: SECRET,
  })

  const ok = actual === testCase.expect
  if (!ok) failures++
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${testCase.name}  (expected ${testCase.expect}, got ${actual})`)
}

// A missing secret must never verify, whatever the header says.
const noSecret = verifyWebhookSignature({
  rawBody: body,
  signatureHeader: `t=${now},te=${sign(body, now)}`,
  webhookSecret: '',
})
if (noSecret) failures++
console.log(`  ${noSecret ? 'FAIL' : 'PASS'}  empty webhook secret rejects everything`)

console.log(failures ? `\n  ${failures} failing case(s)\n` : '\n  All signature cases pass.\n')
process.exit(failures ? 1 : 0)
