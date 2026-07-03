import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

const SESSION_COOKIE = "iv_session";

const PROTECTED = [
  "/dashboard",
  "/portfolio",
  "/stocks",
  "/etfs",
  "/news",
  "/watchlists",
  "/alerts",
  "/settings",
];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const needsAuth = PROTECTED.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  const isAuthPage = pathname === "/login" || pathname === "/signup";

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  let userId: string | null = null;
  if (token && process.env.AUTH_SECRET) {
    try {
      const { payload } = await jwtVerify(token, new TextEncoder().encode(process.env.AUTH_SECRET));
      userId = (payload.sub as string) ?? null;
    } catch {
      userId = null;
    }
  }

  if (needsAuth && !userId) {
    const url = new URL("/login", req.url);
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }
  if (isAuthPage && userId) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|icons|manifest).*)"],
};
