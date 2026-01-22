import { getUriWithOrg } from '@services/config/config'

export const RequestBody = (method: string, data: any, next: any) => {
  let HeadersConfig = new Headers({ 'Content-Type': 'application/json' })
  let options: any = {
    method: method,
    headers: HeadersConfig,
    redirect: 'follow',
    credentials: 'include',
    // Next.js
    next: next,
  }
  if (data) {
    options.body = JSON.stringify(data)
  }
  return options
}

export const RequestBodyWithAuthHeader = (
  method: string,
  data: any,
  next: any,
  token?: string
) => {
  let HeadersConfig = new Headers(
    token
      ? { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
      : { 'Content-Type': 'application/json' }
  )
  let options: any = {
    method: method,
    headers: HeadersConfig,
    redirect: 'follow',
    credentials: 'include',
    body: (method === 'POST' || method === 'PUT' || method === 'DELETE') && data !== null ? JSON.stringify(data) : null,
    // Next.js
    next: next,
  }
  return options
}

export const RequestBodyForm = (method: string, data: any, next: any) => {
  let HeadersConfig = new Headers({})
  let options: any = {
    method: method,
    headers: HeadersConfig,
    redirect: 'follow',
    credentials: 'include',
    body: (method === 'POST' || method === 'PUT') ? JSON.stringify(data) : null,
    // Next.js
    next: next,
  }
  return options
}

export const RequestBodyFormWithAuthHeader = (
  method: string,
  data: any,
  next: any,
  access_token: string
) => {
  let HeadersConfig = new Headers({
    Authorization: `Bearer ${access_token}`,
  })
  let options: any = {
    method: method,
    headers: HeadersConfig,
    redirect: 'follow',
    credentials: 'include',
    body: data,
    // Next.js
    next: next,
  }
  return options
}

export const swrFetcher = async (url: string, token?: string) => {
  // Create the request options
  let HeadersConfig = new Headers(
    token
      ? { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
      : { 'Content-Type': 'application/json' }
  )
  let options: any = {
    method: 'GET',
    headers: HeadersConfig,
    redirect: 'follow',
    credentials: 'include',
  }

  try {
    // Fetch the data
    const request = await fetch(url, options)
    let res = await errorHandling(request)

    // Return the data
    return res
  } catch (error: any) {
    throw error
  }
}

export const errorHandling = async (res: any) => {
  if (!res.ok) {
    let detail = ''
    try {
      const ct = (res.headers?.get?.('content-type') || '') as string
      if (ct.includes('application/json')) {
        const json = await res.json()
        detail =
          (json && (json.detail || json.message)) ? String(json.detail || json.message) : JSON.stringify(json)
      } else {
        detail = await res.text()
      }
    } catch {
      // ignore parse errors
    }

    const message = detail
      ? `${res.status} ${res.statusText}: ${detail}`
      : `${res.status} ${res.statusText}`
    const error: any = new Error(message)
    error.status = res.status
    error.detail = detail
    throw error
  }
  return res.json()
}

type CustomResponseTyping = {
  success: boolean
  data: any
  status: number
  HTTPmessage: string
}

export const getResponseMetadata = async (
  fetch_result: any
): Promise<CustomResponseTyping> => {
  const json = await fetch_result.json()
  if (fetch_result.status === 200) {
    return {
      success: true,
      data: json,
      status: fetch_result.status,
      HTTPmessage: fetch_result.statusText,
    }
  } else {
    return {
      success: false,
      data: json,
      status: fetch_result.status,
      HTTPmessage: fetch_result.statusText,
    }
  }
}

export const revalidateTags = async (tags: string[], orgslug: string) => {
  const url = getUriWithOrg(orgslug, '')
  tags.forEach((tag) => {
    fetch(`${url}/api/revalidate?tag=${tag}`)
  })
}
