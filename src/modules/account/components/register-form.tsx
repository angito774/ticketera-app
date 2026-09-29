"use client";

import { useState, type FormEvent } from "react";

import { FIELD_INPUT_CLASSES, FormField, fieldA11yProps } from "@/components/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GoogleSignIn } from "@/modules/account/components/google-sign-in";
import { PasswordInput } from "@/modules/account/components/password-input";
import { getRegisterErrors, type RegisterValues } from "@/modules/account/schemas/auth.schema";
import { register, type User } from "@/modules/account/services/auth.service";
import { useSessionStore } from "@/modules/account/store/session.store";

interface RegisterFormProps {
  onSuccess: (user: User) => void;
  onSwitchToLogin: () => void;
}

const FIELD_ORDER: (keyof RegisterValues)[] = ["fullName", "email", "password", "acceptedTerms"];
const fieldId = (field: keyof RegisterValues) => `register-${field}`;

export function RegisterForm({ onSuccess, onSwitchToLogin }: RegisterFormProps) {
  const registeredUsers = useSessionStore((state) => state.registeredUsers);
  const signUp = useSessionStore((state) => state.signUp);
  const [values, setValues] = useState<RegisterValues>({
    fullName: "",
    email: "",
    password: "",
    acceptedTerms: false,
  });
  const [errors, setErrors] = useState<Partial<Record<keyof RegisterValues, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);

  const change = (patch: Partial<RegisterValues>) => {
    setValues((current) => ({ ...current, ...patch }));
    setFormError(null);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors = getRegisterErrors(values);
    setErrors(nextErrors);
    const firstInvalid = FIELD_ORDER.find((field) => nextErrors[field]);
    if (firstInvalid) {
      document.getElementById(fieldId(firstInvalid))?.focus();
      return;
    }

    const result = register(values, registeredUsers);
    if (!result.ok) {
      setFormError(result.error);
      return;
    }
    signUp(result.user);
    onSuccess(result.user);
  };

  return (
    <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <h1 className="text-2xl font-bold tracking-tight lg:text-3xl">Crea tu cuenta</h1>
        <p className="text-muted-foreground">Guarda tus entradas y recibe novedades de tus eventos.</p>
      </div>

      <GoogleSignIn onSuccess={onSuccess} />

      {formError && (
        <p role="alert" className="rounded-xl bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">
          {formError}
        </p>
      )}

      <FormField id={fieldId("fullName")} label="Nombre completo" error={errors.fullName}>
        <Input
          {...fieldA11yProps(fieldId("fullName"), errors.fullName)}
          type="text"
          autoComplete="name"
          placeholder="Tu nombre y apellido"
          value={values.fullName}
          onChange={(event) => change({ fullName: event.target.value })}
          className={FIELD_INPUT_CLASSES}
        />
      </FormField>
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
      <FormField id={fieldId("password")} label="Contraseña" error={errors.password}>
        <PasswordInput
          {...fieldA11yProps(fieldId("password"), errors.password)}
          autoComplete="new-password"
          placeholder="Mínimo 8 caracteres, con letras y números"
          value={values.password}
          onChange={(event) => change({ password: event.target.value })}
        />
      </FormField>

      <div className="flex flex-col gap-1.5">
        <label className="flex cursor-pointer items-start gap-3 text-sm leading-relaxed">
          <input
            {...fieldA11yProps(fieldId("acceptedTerms"), errors.acceptedTerms)}
            type="checkbox"
            checked={values.acceptedTerms}
            onChange={(event) => change({ acceptedTerms: event.target.checked })}
            className="mt-0.5 size-5 shrink-0 cursor-pointer rounded accent-primary"
          />
          <span>
            Acepto los{" "}
            <a href="#" className="font-medium text-primary underline-offset-4 hover:underline">
              Términos y condiciones
            </a>
          </span>
        </label>
        {errors.acceptedTerms && (
          <p id={`${fieldId("acceptedTerms")}-error`} className="pl-8 text-[0.8125rem] text-destructive">
            {errors.acceptedTerms}
          </p>
        )}
      </div>

      <Button type="submit" className="h-12 rounded-xl text-base font-semibold">
        Crear cuenta
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        ¿Ya tienes cuenta?{" "}
        <button
          type="button"
          onClick={onSwitchToLogin}
          className="cursor-pointer font-semibold text-primary underline-offset-4 hover:underline"
        >
          Inicia sesión
        </button>
      </p>
    </form>
  );
}
