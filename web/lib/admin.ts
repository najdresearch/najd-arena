import { auth } from "@/auth";

export async function requireAdmin() {
  const session = await auth();
  const allowed = new Set((process.env.NAJD_ADMIN_EMAILS ?? "").split(",").map(v => v.trim()).filter(Boolean));
  if (!session?.user?.email || !allowed.has(session.user.email)) return null;
  return session.user;
}
