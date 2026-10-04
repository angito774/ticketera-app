"use client";

import { useState } from "react";
import Image from "next/image";
import { ImageIcon } from "lucide-react";

import { FieldError, FIELD_INPUT_CLASSES, fieldA11yProps } from "@/components/form-field";
import { Input } from "@/components/ui/input";
import { ALLOWED_IMAGE_HOSTS, isAllowedImageUrl } from "@/lib/image-hosts";
import { cn } from "@/lib/utils";

interface CoverImageFieldProps {
  value: string;
  onChange: (url: string) => void;
  error?: string;
  disabled?: boolean;
  id: string;
}

function CoverPreview({ src }: { src: string }) {
  const [failed, setFailed] = useState(false);

  return (
    <div className="relative flex aspect-video items-center justify-center overflow-hidden rounded-2xl border bg-accent text-primary">
      {failed ? (
        <span className="flex flex-col items-center gap-2 px-4 text-center text-sm text-muted-foreground">
          <ImageIcon className="size-6" aria-hidden="true" />
          No se pudo cargar la imagen
        </span>
      ) : (
        <Image
          src={src}
          alt=""
          fill
          sizes="(min-width: 1024px) 480px, 100vw"
          onError={() => setFailed(true)}
          className="object-cover"
        />
      )}
    </div>
  );
}

/** Imagen de portada por enlace https (opcional) con vista previa; no sube archivos. */
export function CoverImageField({ value, onChange, error, disabled, id }: CoverImageFieldProps) {
  const src = value.trim();
  const helpId = `${id}-help`;
  const a11y = fieldA11yProps(id, error);

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className={cn("text-sm font-medium", error && "text-destructive")}>
        Imagen de portada (URL)
      </label>
      <Input
        {...a11y}
        aria-describedby={error ? `${helpId} ${id}-error` : helpId}
        type="url"
        inputMode="url"
        placeholder="https://"
        disabled={disabled}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={FIELD_INPUT_CLASSES}
      />
      <p id={helpId} className="text-[0.8125rem] text-muted-foreground">
        Pega el enlace de una imagen https de un dominio permitido ({ALLOWED_IMAGE_HOSTS.join(", ")}); es opcional
      </p>
      {error && <FieldError id={id}>{error}</FieldError>}
      {isAllowedImageUrl(src) && <CoverPreview key={src} src={src} />}
    </div>
  );
}
