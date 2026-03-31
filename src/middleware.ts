import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const CANONICAL_HOST = "claudenote.jp";

function checkBasicAuth(request: NextRequest): NextResponse | null {
  const authHeader = request.headers.get("authorization");

  if (!authHeader || !authHeader.startsWith("Basic ")) {
    return new NextResponse("Authentication required", {
      status: 401,
      headers: { "WWW-Authenticate": 'Basic realm="Admin"' },
    });
  }

  const base64Credentials = authHeader.split(" ")[1];
  const credentials = atob(base64Credentials);
  const [username, password] = credentials.split(":");

  const validUsername = process.env.ADMIN_USERNAME;
  const validPassword = process.env.ADMIN_PASSWORD;

  if (!validUsername || !validPassword) {
    return new NextResponse("Server configuration error", { status: 500 });
  }

  if (username !== validUsername || password !== validPassword) {
    return new NextResponse("Invalid credentials", {
      status: 401,
      headers: { "WWW-Authenticate": 'Basic realm="Admin"' },
    });
  }

  return null;
}

export function middleware(request: NextRequest) {
  const host = request.headers.get("host") ?? "";

  if (
    host !== CANONICAL_HOST &&
    host !== `www.${CANONICAL_HOST}` &&
    !host.startsWith("localhost")
  ) {
    const url = new URL(request.url);
    url.host = CANONICAL_HOST;
    url.port = "";
    url.protocol = "https:";
    return NextResponse.redirect(url, 301);
  }

  const pathname = request.nextUrl.pathname;
  if (pathname.startsWith("/admin")) {
    const authResponse = checkBasicAuth(request);
    if (authResponse) return authResponse;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
