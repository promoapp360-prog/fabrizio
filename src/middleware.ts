import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";
// Primo filtro: /admin richiede una sessione valida. I permessi per sezione sono
// verificati di nuovo in ogni pagina/route server (requirePermission).
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-vecciari-pathname", pathname);
  const next = () => NextResponse.next({ request: { headers: requestHeaders } });
  if (!pathname.startsWith("/admin") && !pathname.startsWith("/api/admin/")) return next();
  if (pathname === "/admin/login") return next();
  const token = req.cookies.get("vc_session")?.value;
  try {
    if (!token) throw 0;
    await jwtVerify(token, new TextEncoder().encode(process.env.AUTH_SECRET));
    return next();
  } catch {
    if (pathname.startsWith("/api/")) return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
    const url = req.nextUrl.clone(); url.pathname = "/admin/login"; url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }
}
export const config = { matcher: ["/((?!api|_next|brand|fonts|favicon|icon-|manifest).*)", "/api/admin/:path*"] };
