import { headers } from "next/headers";
import { redirect } from "next/navigation";

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
 * Production CMS authentication is provided by Cloudflare Access.
 * OpenAI preview headers remain supported for local/project previews.
 * There is deliberately no second Rascals password/session gate here: Access
 * is the single authentication boundary for /admin and protected admin APIs.
 */
export async function getChatGPTUser(): Promise<ChatGPTUser | null> {
  return externalIdentityFromHeaders(await headers());
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

export async function requireChatGPTUser(_returnTo: string): Promise<ChatGPTUser> {
  const user = await getChatGPTUser();
  if (user) return user;

  // In production, Cloudflare Access intercepts unauthenticated requests before
  // they reach the Worker. This fallback is only for environments without Access
  // and must never redirect into another authentication loop.
  redirect("/?admin_access=required");
}

export function chatGPTSignInPath(returnTo: string): string {
  return safeRelativeReturnPath(returnTo);
}

export function chatGPTSignOutPath(returnTo = "/"): string {
  return safeRelativeReturnPath(returnTo);
}

function safeRelativeReturnPath(value: string): string {
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
