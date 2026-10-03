import { clerkMiddleware } from "@clerk/nextjs/server";

export default clerkMiddleware();

export const config = {
  matcher: ["/", "/api/:path*", "/sign-in/:path*", "/security/:path*", "/__clerk/:path*"],
};
