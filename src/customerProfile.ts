export interface CustomerProfile {
  email: string
  name: string
  phone: string
  postalCode: string
  addressLine1: string
  addressLine2: string
}

export const CUSTOMER_PROFILE_STORAGE_KEY = 'toyou-customer-profile-v1'

export const EMPTY_CUSTOMER_PROFILE: CustomerProfile = {
  email: '',
  name: '',
  phone: '',
  postalCode: '',
  addressLine1: '',
  addressLine2: '',
}

export function loadCustomerProfile(): CustomerProfile {
  if (typeof window === 'undefined') {
    return { ...EMPTY_CUSTOMER_PROFILE }
  }

  try {
    const stored = JSON.parse(window.localStorage.getItem(CUSTOMER_PROFILE_STORAGE_KEY) ?? '{}') as Partial<CustomerProfile>

    return {
      email: String(stored.email ?? '').trim(),
      name: String(stored.name ?? '').trim(),
      phone: String(stored.phone ?? '').trim(),
      postalCode: String(stored.postalCode ?? '').trim(),
      addressLine1: String(stored.addressLine1 ?? '').trim(),
      addressLine2: String(stored.addressLine2 ?? '').trim(),
    }
  } catch {
    return { ...EMPTY_CUSTOMER_PROFILE }
  }
}

export function saveCustomerProfile(profile: CustomerProfile) {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(CUSTOMER_PROFILE_STORAGE_KEY, JSON.stringify(profile))
}

export function clearCustomerProfile() {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.removeItem(CUSTOMER_PROFILE_STORAGE_KEY)
}

export function hasCompleteDeliveryProfile(profile: CustomerProfile) {
  return Boolean(
    profile.name.trim()
    && profile.phone.trim()
    && profile.postalCode.trim()
    && profile.addressLine1.trim(),
  )
}
