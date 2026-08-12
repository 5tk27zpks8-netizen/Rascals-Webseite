import { externalIdentityFromHeaders } from "../../../../chatgpt-auth";
import { canSetupPasswordForEmail, createAdminSession, safeAdminReturnTo, sessionCookie, setAdminPassword } from "../../../../lib/admin-auth";

function setupRedirect(error: string, returnTo: string) {
  const location = `/admin/login?error=${encodeURIComponent(error)}&reset=1&return_to=${encodeURIComponent(returnTo)}`;
  return new Response(null, { status: 303, headers: { location } });
}

export async function POST(request: Request) {
  const form = await request.formData();
  const returnTo = safeAdminReturnTo(form.get("return_to"), "/admin");
  const submittedEmail = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  const confirm = String(form.get("confirm") ?? "");
  const identity = externalIdentityFromHeaders(request.headers);

  if (!identity || identity.email.toLowerCase() !== submittedEmail || !(await canSetupPasswordForEmail(submittedEmail))) {
    return setupRedirect("forbidden", returnTo);
  }
  if (password.length < 12) return setupRedirect("password", returnTo);
  if (password !== confirm) return setupRedirect("mismatch", returnTo);

  try {
    await setAdminPassword(submittedEmail, password);
    const session = await createAdminSession(submittedEmail);
    return new Response(null, {
      status: 303,
      headers: {
        location: returnTo,
        "set-cookie": sessionCookie(session.token),
        "cache-control": "no-store",
      },
    });
  } catch {
    return setupRedirect("setup", returnTo);
  }
}
