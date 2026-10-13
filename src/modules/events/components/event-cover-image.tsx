"use client"

import * as React from "react"
import Image from "next/image"
import { ImageOff } from "lucide-react"

import { cn } from "@/lib/utils"

interface EventCoverImageProps {
  src: string
  sizes: string
  className?: string
}

/** Portada decorativa que ocupa su contenedor `relative`; si la imagen falla muestra un fondo neutro en vez de un hueco roto. */
function EventCoverImage({ src, sizes, className }: EventCoverImageProps) {
  const [failedSrc, setFailedSrc] = React.useState<string | null>(null)
  const imageRef = React.useRef<HTMLImageElement>(null)

  // Si el error ocurre antes de hidratar, `onError` ya no se dispara: se comprueba al montar.
  React.useEffect(() => {
    const image = imageRef.current
    if (image?.complete && image.naturalWidth === 0) setFailedSrc(src)
  }, [src])

  if (failedSrc === src) {
    return (
      <div
        aria-hidden="true"
        className="absolute inset-0 flex items-center justify-center bg-muted text-muted-foreground"
      >
        <ImageOff className="size-8" />
      </div>
    )
  }

  return (
    <Image
      ref={imageRef}
      src={src}
      alt=""
      fill
      sizes={sizes}
      className={cn("object-cover", className)}
      onError={() => setFailedSrc(src)}
    />
  )
}

export { EventCoverImage }
export type { EventCoverImageProps }
