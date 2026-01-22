import { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime'
import { getDefaultOrg } from '@services/config/config'

const getOrgslugForAuth = (): string => {
  // Prefer cookie orgslug if present (works in both single/multi org modes)
  if (typeof document !== 'undefined') {
    const match = document.cookie.match(/(?:^|; )nexo_current_orgslug=([^;]+)/)
    if (match && match[1]) {
      try {
        return decodeURIComponent(match[1])
      } catch {
        return match[1]
      }
    }
  }
  return getDefaultOrg()
}

export const denyAccessToUser = (error: any, router: AppRouterInstance) => {
  const orgslug = getOrgslugForAuth()
  if (error.status === 401) {
    router.push(`/login?orgslug=${encodeURIComponent(orgslug)}`)
  }

  if (error.status === 403) {
    router.push(`/login?orgslug=${encodeURIComponent(orgslug)}`)
    // TODO : add a message to the user to tell him he is not allowed to access this page, route to /error
  }
}
