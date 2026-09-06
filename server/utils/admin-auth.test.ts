import { describe, expect, it } from 'vitest'
import { hashPassword, verifyPassword } from './admin-auth'

describe('admin password security', () => {
  it('hashes passwords with a unique salt and verifies the correct value', async () => {
    const first = await hashPassword('mat-khau-an-toan')
    const second = await hashPassword('mat-khau-an-toan')
    expect(first).toMatch(/^scrypt:[a-f0-9]{32}:[a-f0-9]{128}$/)
    expect(second).not.toBe(first)
    await expect(verifyPassword('mat-khau-an-toan', first)).resolves.toBe(true)
  })

  it('rejects incorrect passwords and malformed hashes', async () => {
    const stored = await hashPassword('mat-khau-dung')
    await expect(verifyPassword('mat-khau-sai', stored)).resolves.toBe(false)
    await expect(verifyPassword('anything', 'bcrypt:not-supported')).resolves.toBe(false)
    await expect(verifyPassword('anything', '')).resolves.toBe(false)
  })
})
