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
 * Returns the authenticated CMS user.
 *
 * Production authentication is provided by Cloudflare Access. We still keep
 * support for the original OpenAI preview headers so local/project previews
 * continue to work while the live site uses Cloudflare Access.
 */
export async function getChatGPTUser(): Promise<ChatGPTUser | null> {
  const requestHeaders = await headers();

  const cloudflareEmail = requestHeaders.get(CF_EMAIL_HEADER);
  const cloudflareJwt = requestHeaders.get(CF_JWT_HEADER);
  if (cloudflareEmail && cloudflareJwt) {
    return {
      userId: cloudflareEmail,
      displayName: cloudflareEmail.split("@")[0] || cloudflareEmail,
      email: cloudflareEmail,
      fullName: null,
    };
  }

  const userId = requestHeaders.get(OAI_USER_ID_HEADER);
  const email = requestHeaders.get(OAI_USER_EMAIL_HEADER);
  if (!userId || !email) return null;

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

export async function requireChatGPTUser(
  _returnTo: string,
): Promise<ChatGPTUser> {
  const user = await getChatGPTUser();
  if (user) return user;

  // On production Cloudflare Access should intercept unauthenticated requests
  // before they reach the Worker. This fallback prevents the old
  // /signin-with-chatgpt redirect from hijacking the live admin routes.
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

  let url: URL;
  try {
    url = new URL(value, "https://app.local");
  } catch {
    return "/";
  }
  if (url.origin !== "https://app.local") return "/";
  return `${url.pathname}${url.search}${url.hash}`;
}

function safeDecodeURIComponent(value: string): string | null {
  try {
    return decodeURIComponent(value);
  } catch {
    return null;
  }
}
