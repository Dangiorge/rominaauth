// path: middleware.js

import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(req) {
  const { pathname } = req.nextUrl;
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  const isAuthPage = pathname === "/login";
  const isForcePasswordPage = pathname === "/force-password-change";
  const isPublicAuthFlow =
    pathname === "/forgot-password" ||
    pathname === "/reset-password" ||
    pathname === "/verify-email";
  const isPublic = pathname === "/" || isAuthPage || isPublicAuthFlow;

  // Not logged in, trying to reach a protected route -> send to login
  if (!token && !isPublic) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // Already logged in, trying to reach the login page -> send to dashboard
  if (token && isAuthPage) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  // Logged in but must change password -> force them there before anything else
  if (token && token.mustChangePassword && !isForcePasswordPage) {
    return NextResponse.redirect(new URL("/force-password-change", req.url));
  }

  // Every authenticated user can always reach their own profile, regardless of path permissions
  if (token && pathname === "/account/profile") {
    return NextResponse.next();
  }

  // Path-based permission check for everything else in the protected area
  if (token && !isPublic && !isForcePasswordPage) {
    if (token.roleName === "super_admin") {
      return NextResponse.next();
    }

    const permissions = token.permissions || [];
    const allowed = permissions.some(
      (p) =>
        p.can_view &&
        (pathname === p.path || pathname.startsWith(p.path + "/")),
    );

    if (!allowed) {
      return NextResponse.redirect(new URL("/unauthorized", req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
