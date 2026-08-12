import { ADMIN_SESSION_COOKIE, clearSessionCookie, destroyAdminSession, parseCookie } from "../../lib/admin-auth";

function safeReturnTo(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/";
  try {
    const url = new URL(value, "https://app.local");
    return url.origin === "https://app.local" ? `${url.pathname}${url.search}${url.hash}` : "/";
  } catch {
    return "/";
  }
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = parseCookie(request.headers.get("cookie"), ADMIN_SESSION_COOKIE);
  await destroyAdminSession(token);
  return new Response(null, {
    status: 303,
    headers: {
      location: safeReturnTo(url.searchParams.get("return_to")),
      "set-cookie": clearSessionCookie(),
      "cache-control": "no-store",
    },
  });
}
