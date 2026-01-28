import { getAPIUrl } from '@services/config/config'
import { RequestBodyWithAuthHeader, getResponseMetadata } from '@services/utils/ts/requests'

export type AffiliateProgram = {
  enabled: boolean
  attribution_window_days: number
  attribution_model: 'last_click' | 'first_click'
  subscription_first_cycles: number
  subscription_first_rate: number
  subscription_recurring_rate: number
  one_time_rate: number
}

export async function getAffiliateProgram(orgId: number, access_token?: string) {
  const result = await fetch(
    `${getAPIUrl()}affiliates/${orgId}/program`,
    RequestBodyWithAuthHeader('GET', null, null, access_token)
  )
  return getResponseMetadata(result)
}

export async function updateAffiliateProgram(orgId: number, data: Partial<AffiliateProgram>, access_token: string) {
  const result = await fetch(
    `${getAPIUrl()}affiliates/${orgId}/program`,
    RequestBodyWithAuthHeader('PUT', data, null, access_token)
  )
  return getResponseMetadata(result)
}

export async function getAffiliateAdminStats(orgId: number, access_token: string) {
  const result = await fetch(
    `${getAPIUrl()}affiliates/${orgId}/stats`,
    RequestBodyWithAuthHeader('GET', null, null, access_token)
  )
  return getResponseMetadata(result)
}

export async function createAffiliate(
  orgId: number,
  data: { name: string; email: string; user_id?: number | null },
  access_token: string
) {
  const result = await fetch(
    `${getAPIUrl()}affiliates/${orgId}/affiliates`,
    RequestBodyWithAuthHeader('POST', data, null, access_token)
  )
  return getResponseMetadata(result)
}

export async function generateAffiliateCode(orgId: number, affiliateId: number, access_token: string) {
  const result = await fetch(
    `${getAPIUrl()}affiliates/${orgId}/affiliates/${affiliateId}/codes`,
    RequestBodyWithAuthHeader('POST', null, null, access_token)
  )
  return getResponseMetadata(result)
}

