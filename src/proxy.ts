import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Solo exige sesión; el permiso concreto (rol) se valida en servidor con `requirePermission`.
const isPrivateRoute = createRouteMatcher(["/admin(.*)", "/organizer(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  if (isPrivateRoute(req)) await auth.protect();
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
    "/__clerk/:path*",
  ],
};
