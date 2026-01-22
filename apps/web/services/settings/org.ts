import { getAPIUrl } from '@services/config/config'
import {
  errorHandling,
  RequestBodyWithAuthHeader,
  RequestBodyFormWithAuthHeader,
} from '@services/utils/ts/requests'

/*
 This file includes only POST, PUT, DELETE requests
 GET requests are called from the frontend using SWR (https://swr.vercel.app/)
*/

export async function updateOrganization(
  org_id: string,
  data: any,
  access_token: string
) {
  const result: any = await fetch(
    `${getAPIUrl()}orgs/` + org_id,
    RequestBodyWithAuthHeader('PUT', data, null, access_token)
  )
  const res = await errorHandling(result)
  return res
}

export async function updateOrganizationConfig(
  org_id: string,
  config: any,
  access_token: string
) {
  const result: any = await fetch(
    `${getAPIUrl()}orgs/${org_id}/config`,
    RequestBodyWithAuthHeader('PUT', config, null, access_token)
  )
  const res = await errorHandling(result)
  return res
}

export async function uploadOrganizationLogo(
  org_id: string,
  logo_file: any,
  access_token: string
) {
  // Send file thumbnail as form data
  const formData = new FormData()
  formData.append('logo_file', logo_file)
  const result: any = await fetch(
    `${getAPIUrl()}orgs/` + org_id + '/logo',
    RequestBodyFormWithAuthHeader('PUT', formData, null, access_token)
  )
  const res = await errorHandling(result)
  return res
}

export async function uploadOrganizationThumbnail(
  org_id: string,
  thumbnail_file: any,
  access_token: string
) {
  // Send file thumbnail as form data
  const formData = new FormData()
  formData.append('thumbnail_file', thumbnail_file)
  const result: any = await fetch(
    `${getAPIUrl()}orgs/` + org_id + '/thumbnail',
    RequestBodyFormWithAuthHeader('PUT', formData, null, access_token)
  )
  const res = await errorHandling(result)
  return res
}

export async function uploadOrganizationFavicon(
  org_id: string,
  favicon_file: any,
  access_token: string
) {
  const formData = new FormData()
  formData.append('favicon_file', favicon_file)
  const result: any = await fetch(
    `${getAPIUrl()}orgs/` + org_id + '/favicon',
    RequestBodyFormWithAuthHeader('PUT', formData, null, access_token)
  )
  const res = await errorHandling(result)
  return res
}

export const uploadOrganizationPreview = async (orgId: string, file: File, access_token: string) => {
  const formData = new FormData();
  formData.append('preview_file', file);

  const result: any = await fetch(
    `${getAPIUrl()}orgs/` + orgId + '/preview',
    RequestBodyFormWithAuthHeader('PUT', formData, null, access_token)
  )
  const res = await errorHandling(result)
  return res
};
