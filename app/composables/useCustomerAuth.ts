export type CustomerAccount = {
  id: number
  name: string
  phone: string
  email: string
  loyaltyPoints: number
  totalSpent: number
}

export function useCustomerAuth() {
  const customer = useState<CustomerAccount | null>('customer-account', () => null)
  const loaded = useState('customer-account-loaded', () => false)

  async function load() {
    if (loaded.value) return customer.value
    const response = await $fetch<{ data: CustomerAccount | null }>('/api/customer-auth/me')
    customer.value = response.data
    loaded.value = true
    return customer.value
  }

  async function logout() {
    await $fetch('/api/customer-auth/logout', { method: 'POST' })
    customer.value = null
    loaded.value = true
  }

  return { customer, loaded, load, logout }
}
