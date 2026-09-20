import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  select: vi.fn(), update: vi.fn(), insert: vi.fn(), session: vi.fn(),
  hash: vi.fn(), limit: vi.fn(), set: vi.fn(), where: vi.fn(),
}))
vi.mock('../../database/client', () => ({ useDatabase: () => mocks }))
vi.mock('../../utils/admin-auth', () => ({ hashPassword: mocks.hash }))
vi.mock('../../utils/public-rate-limit', () => ({ checkPublicRateLimit: vi.fn() }))
vi.mock('../../utils/customer-auth', () => ({
  createCustomerSession: mocks.session,
  normalizeCustomerPhone: (value: string) => value,
  validCustomerPhone: () => true,
}))

const profile = { id: 42, passwordHash: null, status: 'active', email: 'existing@example.test', loyaltyPoints: 185, totalSpent: '4200000.00' }

describe('direct registration for existing customer profiles', () => {
  beforeEach(() => {
    vi.stubGlobal('defineEventHandler', (handler: unknown) => handler)
    vi.stubGlobal('readBody', vi.fn().mockResolvedValue({ name: 'Khách kiểm thử', phone: '0900000042', password: 'TestPassword42' }))
    mocks.select.mockReturnValue({ from: () => ({ where: () => ({ limit: mocks.limit }) }) })
    mocks.limit.mockResolvedValue([profile])
    mocks.update.mockReturnValue({ set: mocks.set })
    mocks.set.mockReturnValue({ where: mocks.where })
    mocks.where.mockResolvedValue([{ affectedRows: 1 }])
    mocks.hash.mockResolvedValue('hashed-password')
    mocks.session.mockResolvedValue(undefined)
  })

  it('registers without an existing session and keeps the customer ID, points and spending', async () => {
    const { default: handler } = await import('./register.post')
    const event = {} as Parameters<typeof handler>[0]
    const result = await handler(event)
    expect(result.data).toMatchObject({ id: 42, loyaltyPoints: 185, totalSpent: 4200000, email: profile.email })
    expect(mocks.insert).not.toHaveBeenCalled()
    expect(mocks.set).toHaveBeenCalledWith(expect.objectContaining({ passwordHash: 'hashed-password', email: profile.email }))
    expect(mocks.set.mock.calls[0]![0]).not.toHaveProperty('loyaltyPoints')
    expect(mocks.session).toHaveBeenCalledWith(event, 42)
  })

  it('does not replace an existing password', async () => {
    mocks.limit.mockResolvedValue([{ ...profile, passwordHash: 'existing-hash' }])
    const { default: handler } = await import('./register.post')
    await expect(handler({} as Parameters<typeof handler>[0])).rejects.toMatchObject({ statusCode: 409 })
    expect(mocks.update).not.toHaveBeenCalled()
    expect(mocks.session).not.toHaveBeenCalled()
  })

  it('does not register a blocked customer', async () => {
    mocks.limit.mockResolvedValue([{ ...profile, status: 'blocked' }])
    const { default: handler } = await import('./register.post')
    await expect(handler({} as Parameters<typeof handler>[0])).rejects.toMatchObject({ statusCode: 403 })
    expect(mocks.update).not.toHaveBeenCalled()
  })

  it('does not sign in a request that lost a concurrent password update', async () => {
    mocks.where.mockResolvedValue([{ affectedRows: 0 }])
    const { default: handler } = await import('./register.post')
    await expect(handler({} as Parameters<typeof handler>[0])).rejects.toMatchObject({ statusCode: 409 })
    expect(mocks.session).not.toHaveBeenCalled()
  })
})
