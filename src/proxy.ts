import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isProtectedRoute = createRouteMatcher(["/studio(.*)"]);

const clerkHandler = clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) {
    await auth.protect();
  }
});

export async function proxy(request: NextRequest, event: any) {
  try {
    return await (clerkHandler as any)(request, event);
  } catch (err) {
    console.error("Clerk proxy edge warning:", err);
    return NextResponse.next();
  }
}

export default proxy;

export const config = {
  matcher: [
    "/studio/:path*",
    "/(api|trpc)(.*)",
  ],
};
