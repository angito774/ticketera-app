import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import type { NextFetchEvent, NextRequest } from "next/server";

// Solo exige sesión; el permiso concreto (rol) se valida en servidor con `requirePermission`.
const isPrivateRoute = createRouteMatcher([
  "/admin(.*)",
  "/organizer(.*)",
  "/events/:id/checkout(.*)",
  "/events/:id/confirmation(.*)",
  "/my-tickets(.*)",
]);

const clerk = clerkMiddleware(async (auth, req) => {
  if (isPrivateRoute(req)) await auth.protect();
});

/**
 * Detrás de CloudFront el origen recibe HTTP aunque el visitante use HTTPS, y CloudFront no permite añadir
 * `x-forwarded-proto`. Con `ASSUME_HTTPS=true` (solo en AWS) se declara aquí para que Clerk genere
 * redirecciones con https://. Es seguro porque el tráfico HTTP del visitante se redirige a HTTPS en CloudFront.
 */
export default function proxy(req: NextRequest, event: NextFetchEvent) {
  if (process.env.ASSUME_HTTPS === "true") req.headers.set("x-forwarded-proto", "https");
  return clerk(req, event);
}

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
    "/__clerk/:path*",
  ],
};
