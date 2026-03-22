// @vitest-environment node

import { afterEach, describe, expect, it, vi } from 'vitest'
import { createSessionToken, parseSessionToken } from '../../../server/utils/auth-session'
import type { AuthSessionPayload } from '../../../server/utils/auth-session'

describe('auth-session token', () => {
  const secret = 'test-session-secret'
  const oneWeekMs = 7 * 24 * 60 * 60 * 1000

  function createValidPayload(now: number): AuthSessionPayload {
    return {
      username: 'john.doe',
      issuedAt: now,
      expiresAt: now + 60_000
    }
  }

  afterEach(() => {
    vi.useRealTimers()
  })

  it('creates and parses a valid session token', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-18T10:00:00.000Z'))

    const now = Date.now()
    const payload = createValidPayload(now)
    const token = createSessionToken(payload, secret)

    expect(parseSessionToken(token, secret)).toEqual(payload)
  })

  it('rejects a token signed with another secret', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-18T10:00:00.000Z'))

    const token = createSessionToken(createValidPayload(Date.now()), 'wrong-secret')

    expect(parseSessionToken(token, secret)).toBeNull()
  })

  it('rejects a tampered token payload', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-18T10:00:00.000Z'))

    const token = createSessionToken(createValidPayload(Date.now()), secret)
    const [payload, signature] = token.split('.')
    const tamperedToken = `${payload}x.${signature}`

    expect(parseSessionToken(tamperedToken, secret)).toBeNull()
  })

  it('rejects malformed token structure', () => {
    expect(parseSessionToken('malformed-token', secret)).toBeNull()
  })

  it('rejects token with extra segments', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-18T10:00:00.000Z'))

    const token = createSessionToken(createValidPayload(Date.now()), secret)

    expect(parseSessionToken(`${token}.extra`, secret)).toBeNull()
  })

  it('rejects an expired token', () => {
    vi.useFakeTimers()
    const now = new Date('2026-03-18T10:00:00.000Z')
    vi.setSystemTime(now)

    const token = createSessionToken(
      {
        username: 'john.doe',
        issuedAt: now.getTime(),
        expiresAt: now.getTime() + 1_000
      },
      secret
    )

    vi.setSystemTime(new Date(now.getTime() + 1_000))

    expect(parseSessionToken(token, secret)).toBeNull()
  })

  it('accepts token before expiration threshold', () => {
    vi.useFakeTimers()
    const now = new Date('2026-03-18T10:00:00.000Z')
    vi.setSystemTime(now)

    const token = createSessionToken(
      {
        username: 'john.doe',
        issuedAt: now.getTime(),
        expiresAt: now.getTime() + 1_000
      },
      secret
    )

    vi.setSystemTime(new Date(now.getTime() + 999))

    expect(parseSessionToken(token, secret)).not.toBeNull()
  })

  it('rejects a token older than 7 days from original issue time', () => {
    vi.useFakeTimers()
    const now = new Date('2026-03-18T10:00:00.000Z')
    vi.setSystemTime(now)

    const token = createSessionToken(
      {
        username: 'john.doe',
        issuedAt: now.getTime() - oneWeekMs - 1,
        expiresAt: now.getTime() + 60_000
      },
      secret
    )

    expect(parseSessionToken(token, secret, oneWeekMs)).toBeNull()
  })

  it('accepts a token exactly on absolute age boundary', () => {
    vi.useFakeTimers()
    const now = new Date('2026-03-18T10:00:00.000Z')
    vi.setSystemTime(now)

    const token = createSessionToken(
      {
        username: 'john.doe',
        issuedAt: now.getTime() - oneWeekMs,
        expiresAt: Date.now() + 60_000
      },
      secret
    )

    expect(parseSessionToken(token, secret, oneWeekMs)).not.toBeNull()
  })

  it('does not enforce absolute age when maxAbsoluteAgeMs is 0', () => {
    vi.useFakeTimers()
    const now = new Date('2026-03-18T10:00:00.000Z')
    vi.setSystemTime(now)

    const token = createSessionToken(
      {
        username: 'john.doe',
        issuedAt: now.getTime() - oneWeekMs - 10_000,
        expiresAt: now.getTime() + 60_000
      },
      secret
    )

    expect(parseSessionToken(token, secret)).not.toBeNull()
  })

  it('rejects payload with empty username', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-18T10:00:00.000Z'))

    const token = createSessionToken({ ...createValidPayload(Date.now()), username: '' }, secret)

    expect(parseSessionToken(token, secret)).toBeNull()
  })

  it('rejects payload with invalid timestamp types', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-18T10:00:00.000Z'))

    const token = createSessionToken(
      {
        username: 'john.doe',
        issuedAt: 'not-a-number',
        expiresAt: 'not-a-number'
      } as unknown as AuthSessionPayload,
      secret
    )

    expect(parseSessionToken(token, secret)).toBeNull()
  })

  it('rejects payload where issuedAt is after expiresAt', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-18T10:00:00.000Z'))

    const now = Date.now()
    const token = createSessionToken(
      {
        username: 'john.doe',
        issuedAt: now + 10_000,
        expiresAt: now + 1_000
      },
      secret
    )

    expect(parseSessionToken(token, secret)).toBeNull()
  })
})
