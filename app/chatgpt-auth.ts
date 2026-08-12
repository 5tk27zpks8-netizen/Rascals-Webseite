import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getAdminSessionIdentity, safeAdminReturnTo } from "./lib/admin-auth";

export type ChatGPTUser = {
  userId: string;
  displayName: string;
  email: string;
  fullName: string | null;
};

const CF_EMAIL_HEADER = "cf-access-authenticated-user-email";
const CF_JWT_HEADER = "cf-access-jwt-assertion";
const OAI_USER_ID_HEADER = "oai-authenticated-user-id";
const OAI_USER_EMAIL_HEADER = "oai-authenticated-user-email";
const OAI_USER_FULL_NAME_HEADER = "oai-authenticated-user-full-name";
const OAI_USER_FULL_NAME_ENCODING_HEADER = "oai-authenticated-user-full-name-encoding";
const PERCENT_ENCODED_UTF8 = "percent-encoded-utf-8";

/**
 * CMS authentication is intentionally first-party now: only a valid Rascals
 * admin session cookie grants access. Cloudflare/OpenAI identity headers are
 * kept exclusively as a trusted bootstrap/reset signal on the login screen;
 * they can no longer bypass the password screen and open /admin directly.
 */
export async function getChatGPTUser(): Promise<ChatGPTUser | null> {
  const requestHeaders = await headers();
  return getAdminSessionIdentity(requestHeaders);
}

export async function getExternalIdentity(): Promise<ChatGPTUser | null> {
  return externalIdentityFromHeaders(await headers());
}

export function externalIdentityFromHeaders(requestHeaders: Headers): ChatGPTUser | null {
  const cloudflareEmail = requestHeaders.get(CF_EMAIL_HEADER);
  const cloudflareJwt = requestHeaders.get(CF_JWT_HEADER);
  if (cloudflareEmail && cloudflareJwt) {
    const email = cloudflareEmail.trim().toLowerCase();
    return {
      userId: email,
      displayName: email.split("@")[0] || email,
      email,
      fullName: null,
    };
  }

  const userId = requestHeaders.get(OAI_USER_ID_HEADER);
  const emailHeader = requestHeaders.get(OAI_USER_EMAIL_HEADER);
  if (!userId || !emailHeader) return null;
  const email = emailHeader.trim().toLowerCase();
  const encodedFullName = requestHeaders.get(OAI_USER_FULL_NAME_HEADER);
  const fullName =
    encodedFullName &&
    requestHeaders.get(OAI_USER_FULL_NAME_ENCODING_HEADER) === PERCENT_ENCODED_UTF8
      ? safeDecodeURIComponent(encodedFullName)
      : null;

  return {
    userId,
    displayName: fullName ?? email,
    email,
    fullName,
  };
}

export async function requireChatGPTUser(returnTo: string): Promise<ChatGPTUser> {
  const user = await getChatGPTUser();
  if (user) return user;
  redirect(chatGPTSignInPath(returnTo));
}

export function chatGPTSignInPath(returnTo: string): string {
  const safe = safeAdminReturnTo(returnTo, "/admin");
  return `/admin/login?return_to=${encodeURIComponent(safe)}`;
}

export function chatGPTSignOutPath(returnTo = "/"): string {
  const safe = safePublicReturnTo(returnTo);
  return `/admin/logout?return_to=${encodeURIComponent(safe)}`;
}

function safePublicReturnTo(value: string): string {
  if (!value.startsWith("/") || value.startsWith("//")) return "/";
  try {
    const url = new URL(value, "https://app.local");
    if (url.origin !== "https://app.local") return "/";
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return "/";
  }
}

function safeDecodeURIComponent(value: string): string | null {
  try {
    return decodeURIComponent(value);
  } catch {
    return null;
  }
}
