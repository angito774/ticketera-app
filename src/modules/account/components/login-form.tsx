"use client";

import { useState, type FormEvent } from "react";

import { FIELD_INPUT_CLASSES, FormField, fieldA11yProps } from "@/components/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GoogleSignIn } from "@/modules/account/components/google-sign-in";
import { PasswordInput } from "@/modules/account/components/password-input";
import { getLoginErrors, type LoginValues } from "@/modules/account/schemas/auth.schema";
import { authenticate, DEMO_ACCOUNT, type User } from "@/modules/account/services/auth.service";
import { useSessionStore } from "@/modules/account/store/session.store";

interface LoginFormProps {
  onSuccess: (user: User) => void;
  onSwitchToRegister: () => void;
}

const FIELD_ORDER: (keyof LoginValues)[] = ["email", "password"];
const fieldId = (field: keyof LoginValues) => `login-${field}`;

export function LoginForm({ onSuccess, onSwitchToRegister }: LoginFormProps) {
  const registeredUsers = useSessionStore((state) => state.registeredUsers);
  const signIn = useSessionStore((state) => state.signIn);
  const [values, setValues] = useState<LoginValues>({ email: "", password: "" });
  const [errors, setErrors] = useState<Partial<Record<keyof LoginValues, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);

  const change = (patch: Partial<LoginValues>) => {
    setValues((current) => ({ ...current, ...patch }));
    setFormError(null);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors = getLoginErrors(values);
    setErrors(nextErrors);
    const firstInvalid = FIELD_ORDER.find((field) => nextErrors[field]);
    if (firstInvalid) {
      document.getElementById(fieldId(firstInvalid))?.focus();
      return;
    }

    const result = authenticate(values.email, values.password, registeredUsers);
    if (!result.ok) {
      setFormError(result.error);
      return;
    }
    signIn(result.user);
    onSuccess(result.user);
  };

  return (
    <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <h1 className="text-2xl font-bold tracking-tight lg:text-3xl">Hola de nuevo</h1>
        <p className="text-muted-foreground">Ingresa para ver tus entradas y comprar más rápido.</p>
      </div>

      <GoogleSignIn onSuccess={onSuccess} />

      {formError && (
        <p role="alert" className="rounded-xl bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">
          {formError}
        </p>
      )}

      <FormField id={fieldId("email")} label="Correo electrónico" error={errors.email}>
        <Input
          {...fieldA11yProps(fieldId("email"), errors.email)}
          type="email"
          autoComplete="email"
          placeholder="tu@email.com"
          value={values.email}
          onChange={(event) => change({ email: event.target.value })}
          className={FIELD_INPUT_CLASSES}
        />
      </FormField>
      <FormField
        id={fieldId("password")}
        label="Contraseña"
        error={errors.password}
        labelAside={
          <a href="#" className="text-[0.8125rem] font-medium text-primary underline-offset-4 hover:underline">
            ¿Olvidaste tu contraseña?
          </a>
        }
      >
        <PasswordInput
          {...fieldA11yProps(fieldId("password"), errors.password)}
          autoComplete="current-password"
          value={values.password}
          onChange={(event) => change({ password: event.target.value })}
        />
      </FormField>

      <Button type="submit" className="h-12 rounded-xl text-base font-semibold">
        Iniciar sesión
      </Button>

      <p className="rounded-xl bg-muted px-4 py-3 text-[0.8125rem] text-muted-foreground">
        Cuenta de prueba: <strong className="font-semibold text-foreground">{DEMO_ACCOUNT.user.email}</strong> /{" "}
        <strong className="font-semibold text-foreground">{DEMO_ACCOUNT.password}</strong>
      </p>

      <p className="text-center text-sm text-muted-foreground">
        ¿No tienes cuenta?{" "}
        <button
          type="button"
          onClick={onSwitchToRegister}
          className="cursor-pointer font-semibold text-primary underline-offset-4 hover:underline"
        >
          Crea una gratis
        </button>
      </p>
    </form>
  );
}
