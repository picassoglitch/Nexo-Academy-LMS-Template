import { getAPIUrl } from '@services/config/config';
import { RequestBodyWithAuthHeader, getResponseMetadata } from '@services/utils/ts/requests';

export async function getProducts(orgId: number, access_token: string) {
  const result = await fetch(
    `${getAPIUrl()}payments/${orgId}/products`,
    RequestBodyWithAuthHeader('GET', null, null, access_token)
  );
  const res = await getResponseMetadata(result);
  return res;
}

export async function createProduct(orgId: number, data: any, access_token: string) {
  const result = await fetch(
    `${getAPIUrl()}payments/${orgId}/products`,
    RequestBodyWithAuthHeader('POST', data, null, access_token)
  );
  const res = await getResponseMetadata(result);
  return res;
}

export async function updateProduct(orgId: number, productId: string, data: any, access_token: string) {
  const result = await fetch(
    `${getAPIUrl()}payments/${orgId}/products/${productId}`,
    RequestBodyWithAuthHeader('PUT', data, null, access_token)
  );
  const res = await getResponseMetadata(result);
  return res;
}

export async function archiveProduct(orgId: number, productId: string, access_token: string) {
  const result = await fetch(
    `${getAPIUrl()}payments/${orgId}/products/${productId}`,
    RequestBodyWithAuthHeader('DELETE', null, null, access_token)
  );
  const res = await getResponseMetadata(result);
  return res;
}

export async function getProductDetails(orgId: number, productId: string, access_token: string) {
  const result = await fetch(
    `${getAPIUrl()}payments/${orgId}/products/${productId}`,
    RequestBodyWithAuthHeader('GET', null, null, access_token)
  );
  const res = await getResponseMetadata(result);
  return res;
}

export async function linkCourseToProduct(orgId: number, productId: string, courseId: string, access_token: string) {
  const result = await fetch(
    `${getAPIUrl()}payments/${orgId}/products/${productId}/courses/${courseId}`,
    RequestBodyWithAuthHeader('POST', null, null, access_token)
  );
  const res = await getResponseMetadata(result);
  return res;
}

export async function unlinkCourseFromProduct(orgId: number, productId: string, courseId: string, access_token: string) {
  const result = await fetch(
    `${getAPIUrl()}payments/${orgId}/products/${productId}/courses/${courseId}`,
    RequestBodyWithAuthHeader('DELETE', null, null, access_token)
  );
  const res = await getResponseMetadata(result);
  return res;
}

export async function getCoursesLinkedToProduct(orgId: number, productId: string, access_token: string) {
  const result = await fetch(
    `${getAPIUrl()}payments/${orgId}/products/${productId}/courses`,
    RequestBodyWithAuthHeader('GET', null, null, access_token)
  );
  const res = await getResponseMetadata(result);
  return res;
}

export async function getProductsByCourse(orgId: number, courseId: string, access_token: string) {
  const result = await fetch(
    `${getAPIUrl()}payments/${orgId}/courses/${courseId}/products`,
    RequestBodyWithAuthHeader('GET', null, null, access_token)
  );
  const res = await getResponseMetadata(result);
  return res;
}

export async function getStripeProductCheckoutSession(orgId: number, productId: number, redirect_uri: string, access_token: string) {
  const result = await fetch(
    `${getAPIUrl()}payments/${orgId}/stripe/checkout/product/${productId}?redirect_uri=${encodeURIComponent(redirect_uri)}`,
    RequestBodyWithAuthHeader('POST', null, null, access_token)
  );
  const res = await getResponseMetadata(result);
  return res;
}

export async function verifyStripeCheckoutSession(
  orgId: number,
  session_id: string | null,
  access_token: string,
  payment_user_id?: number | null
) {
  const url = new URL(`${getAPIUrl()}payments/${orgId}/stripe/checkout/session/verify`)
  if (session_id) url.searchParams.set('session_id', session_id)
  if (payment_user_id != null) url.searchParams.set('payment_user_id', String(payment_user_id))

  const result = await fetch(
    url.toString(),
    RequestBodyWithAuthHeader('GET', null, null, access_token)
  )
  const res = await getResponseMetadata(result)
  return res
}

