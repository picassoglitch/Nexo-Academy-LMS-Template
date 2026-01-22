'use client'

import React from 'react'
import { useOrg } from '@components/Contexts/OrgContext'
import { getOrgFaviconMediaDirectory } from '@services/media/media'

function emojiToFaviconDataUrl(emoji: string) {
  const safe = (emoji || '').trim()
  if (!safe) return null
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><text x="50%" y="52%" dominant-baseline="middle" text-anchor="middle" font-size="52">${safe}</text></svg>`
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}

export default function OrgBrowserBranding() {
  const org = useOrg() as any

  React.useEffect(() => {
    if (typeof document === 'undefined') return

    const general = org?.config?.config?.general || {}

    const tabTitle = (general.tab_title || '').trim()
    if (tabTitle) {
      document.title = tabTitle
    } else if (org?.name) {
      // Reasonable default if not configured
      document.title = String(org.name)
    }

    const faviconUrl = (general.favicon_url || '').trim()
    const faviconEmoji = (general.favicon_emoji || '').trim()
    const faviconImage = (general.favicon_image || '').trim()
    const href =
      faviconUrl ||
      (faviconImage && org?.org_uuid
        ? getOrgFaviconMediaDirectory(org.org_uuid, faviconImage)
        : null) ||
      emojiToFaviconDataUrl(faviconEmoji)
    if (!href) return

    const links = Array.from(document.querySelectorAll<HTMLLinkElement>('link[rel~=\"icon\"]'))
    const link = links[0] || (() => {
      const el = document.createElement('link')
      el.rel = 'icon'
      document.head.appendChild(el)
      return el
    })()

    link.href = href
  }, [
    org?.id,
    org?.name,
    org?.org_uuid,
    org?.config?.config?.general?.tab_title,
    org?.config?.config?.general?.favicon_url,
    org?.config?.config?.general?.favicon_image,
    org?.config?.config?.general?.favicon_emoji,
  ])

  return null
}

