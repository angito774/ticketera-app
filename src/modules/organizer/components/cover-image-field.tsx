"use client";

import { useRef, useState, type DragEvent } from "react";
import { ImagePlus, X } from "lucide-react";

import { cn } from "@/lib/utils";

interface CoverImageFieldProps {
  value: string | null;
  onChange: (url: string | null) => void;
}

const ACCEPTED = ["image/jpeg", "image/png"];

/**
 * Imagen de portada con vista previa local (`URL.createObjectURL`). La imagen no se
 * sube a ningún lado: es solo UI.
 */
export function CoverImageField({ value, onChange }: CoverImageFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Libera la URL local anterior al reemplazarla o quitarla.
  const releasePrevious = () => {
    if (value?.startsWith("blob:")) URL.revokeObjectURL(value);
  };

  const pick = (file: File | undefined) => {
    if (!file) return;
    if (!ACCEPTED.includes(file.type)) {
      setError("Usa una imagen JPG o PNG.");
      return;
    }
    setError(null);
    releasePrevious();
    onChange(URL.createObjectURL(file));
  };

  const handleDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setIsDragging(false);
    pick(event.dataTransfer.files[0]);
  };

  if (value) {
    return (
      <div className="relative overflow-hidden rounded-2xl border">
        {/* Vista previa de un blob local: next/image no aplica. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={value} alt="Vista previa de la portada" className="aspect-video w-full object-cover" />
        <button
          type="button"
          onClick={() => {
            releasePrevious();
            onChange(null);
            if (inputRef.current) inputRef.current.value = "";
          }}
          className="absolute top-3 right-3 flex h-9 cursor-pointer items-center gap-1.5 rounded-lg bg-background/90 px-3 text-sm font-semibold shadow-sm outline-none hover:bg-background focus-visible:ring-3 focus-visible:ring-ring"
        >
          <X className="size-4" aria-hidden="true" />
          Quitar imagen
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      <label
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={cn(
          "flex cursor-pointer flex-col items-center gap-2 rounded-2xl border-[1.5px] border-dashed px-6 py-10 text-center transition-colors has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring",
          isDragging ? "border-primary bg-accent" : "hover:bg-muted/60"
        )}
      >
        <span className="flex size-12 items-center justify-center rounded-2xl bg-accent text-primary">
          <ImagePlus className="size-6" aria-hidden="true" />
        </span>
        <span className="font-semibold">
          <span className="hidden sm:inline">Arrastra una imagen o haz clic para subirla</span>
          <span className="sm:hidden">Subir imagen</span>
        </span>
        <span className="text-[0.8125rem] text-muted-foreground">JPG o PNG, horizontal (16:9)</span>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED.join(",")}
          aria-describedby={error ? "cover-image-error" : undefined}
          onChange={(event) => pick(event.target.files?.[0])}
          className="sr-only"
        />
      </label>
      {error && (
        <p id="cover-image-error" role="alert" className="text-[0.8125rem] text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
