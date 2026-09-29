import { buildDecorativeQr } from "@/lib/decorative-qr";
import { cn } from "@/lib/utils";

interface DecorativeQrProps {
  seed: number;
  className?: string;
}

const SIZE = 21;

/** Patrón visual con forma de QR. No es un código real: se oculta a tecnologías de asistencia. */
export function DecorativeQr({ seed, className }: DecorativeQrProps) {
  const cells = buildDecorativeQr(seed, SIZE);

  return (
    <svg
      viewBox={`-1 -1 ${SIZE + 2} ${SIZE + 2}`}
      aria-hidden="true"
      shapeRendering="crispEdges"
      className={cn("rounded-xl bg-white", className)}
    >
      {cells.map((isDark, index) =>
        isDark ? (
          <rect
            key={index}
            x={index % SIZE}
            y={Math.floor(index / SIZE)}
            width={1}
            height={1}
            className="fill-foreground"
          />
        ) : null
      )}
    </svg>
  );
}
