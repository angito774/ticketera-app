import type { Metadata } from "next";

import { AuthPanel } from "@/modules/account/components/auth-panel";

export const metadata: Metadata = {
  title: "Ingresar · Ticketera",
};

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { mode, next } = await searchParams;

  return (
    <AuthPanel
      initialMode={mode === "register" ? "register" : "login"}
      next={typeof next === "string" ? next : null}
    />
  );
}
