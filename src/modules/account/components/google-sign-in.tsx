"use client";

import { useRef, useState } from "react";
import { Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { getInitials, type User } from "@/modules/account/services/auth.service";
import {
  MOCK_GOOGLE_ACCOUNTS,
  signInWithGoogle,
  type GoogleAccount,
} from "@/modules/account/services/google-auth.service";
import { useSessionStore } from "@/modules/account/store/session.store";

interface GoogleSignInProps {
  onSuccess: (user: User) => void;
  className?: string;
}

/** Simula la latencia del flujo de Google. */
const MOCK_GOOGLE_DELAY_MS = 700;

/** Logo "G" de Google; sus colores son de marca (excepción a "solo tokens"). */
function GoogleLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" className={className}>
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}

/** "Continuar con Google" + selector de cuenta simulado (no se conecta con Google). */
export function GoogleSignIn({ onSuccess, className }: GoogleSignInProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const registeredUsers = useSessionStore((state) => state.registeredUsers);
  const signIn = useSessionStore((state) => state.signIn);
  const signUp = useSessionStore((state) => state.signUp);
  const [connectingEmail, setConnectingEmail] = useState<string | null>(null);

  const choose = (account: GoogleAccount) => {
    setConnectingEmail(account.email);
    setTimeout(() => {
      const { user, isNew } = signInWithGoogle(account, registeredUsers);
      if (isNew) signUp(user);
      else signIn(user);
      dialogRef.current?.close();
      setConnectingEmail(null);
      onSuccess(user);
    }, MOCK_GOOGLE_DELAY_MS);
  };

  return (
    <div className={cn("flex flex-col gap-5", className)}>
      <button
        type="button"
        onClick={() => dialogRef.current?.showModal()}
        className="flex h-12 w-full cursor-pointer items-center justify-center gap-3 rounded-xl border border-foreground/35 bg-background text-[0.9375rem] font-semibold text-foreground transition-colors outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring"
      >
        <GoogleLogo className="size-5" />
        Continuar con Google
      </button>

      <div className="flex items-center gap-3 text-[0.8125rem] text-muted-foreground">
        <span aria-hidden="true" className="h-px flex-1 bg-border" />
        o con tu correo
        <span aria-hidden="true" className="h-px flex-1 bg-border" />
      </div>

      <dialog
        ref={dialogRef}
        aria-labelledby="google-chooser-title"
        onCancel={(event) => {
          if (connectingEmail) event.preventDefault();
        }}
        className="m-auto w-[calc(100%-2rem)] max-w-sm rounded-3xl bg-background p-0 text-foreground shadow-2xl backdrop:bg-black/40"
      >
        <div className="flex flex-col gap-5 p-6">
          <div className="flex flex-col items-center gap-3 text-center">
            <GoogleLogo className="size-8" />
            <div className="flex flex-col gap-1">
              <h2 id="google-chooser-title" className="text-xl font-semibold">
                Elige una cuenta
              </h2>
              <p className="text-sm text-muted-foreground">para continuar a Ticketera</p>
            </div>
          </div>

          <ul className="flex flex-col divide-y rounded-2xl border">
            {MOCK_GOOGLE_ACCOUNTS.map((account) => {
              const isConnecting = connectingEmail === account.email;
              return (
                <li key={account.email}>
                  <button
                    type="button"
                    disabled={connectingEmail !== null}
                    onClick={() => choose(account)}
                    className="flex w-full cursor-pointer items-center gap-3 px-4 py-3 text-left transition-colors outline-none first:rounded-t-2xl last:rounded-b-2xl hover:bg-muted focus-visible:bg-muted focus-visible:ring-3 focus-visible:ring-ring focus-visible:ring-inset disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-semibold text-accent-foreground">
                      {getInitials(account.name)}
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate text-sm font-semibold">{account.name}</span>
                      <span className="truncate text-[0.8125rem] text-muted-foreground">{account.email}</span>
                    </span>
                    {isConnecting && <Loader2 className="size-4 animate-spin text-muted-foreground" aria-hidden="true" />}
                  </button>
                </li>
              );
            })}
          </ul>

          <p aria-live="polite" className="min-h-5 text-center text-sm font-medium text-primary">
            {connectingEmail ? "Conectando con Google…" : ""}
          </p>

          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">Simulación: no se conecta con Google.</p>
            <button
              type="button"
              disabled={connectingEmail !== null}
              onClick={() => dialogRef.current?.close()}
              className="h-10 cursor-pointer rounded-xl px-4 text-sm font-semibold text-primary transition-colors outline-none hover:bg-accent focus-visible:ring-3 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancelar
            </button>
          </div>
        </div>
      </dialog>
    </div>
  );
}
