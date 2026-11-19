import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { can, type Permission } from "@/lib/rbac";
/** Guardia per pagine admin: verifica permesso lato server. */
export async function guard(p: Permission) {
  const u = await getUser();
  if (!u) redirect("/admin/login");
  if (!can(u.role, p)) redirect(u.role === "KITCHEN" ? "/admin/cucina" : "/admin?denied=1");
  return u;
}
