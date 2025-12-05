import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { serverEnv } from "@/env/server";

const AUTH_PATH = "/login";
const DASHBOARD_PATH = "/app";

export async function middleware(request: NextRequest) {
  const token = await getToken({ req: request, secret: serverEnv.NEXTAUTH_SECRET });
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/api/auth")) {
    return NextResponse.next();
  }

  const isAuthRoute = pathname.startsWith(DASHBOARD_PATH);
  const isLoginRoute = pathname.startsWith(AUTH_PATH);

  if (isAuthRoute && !token) {
    const callbackUrl = pathname + request.nextUrl.search;
    const loginUrl = new URL(AUTH_PATH, request.url);
    if (callbackUrl) {
      loginUrl.searchParams.set("callbackUrl", callbackUrl);
    }
    return NextResponse.redirect(loginUrl);
  }

  if (isLoginRoute && token) {
    return NextResponse.redirect(new URL(DASHBOARD_PATH, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/app/:path*", "/login"],
};
