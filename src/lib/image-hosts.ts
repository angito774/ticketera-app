/** Única fuente de verdad de hosts de imagen: la consumen next.config.ts y la validación de portadas. Sin imports (next.config.ts lo carga). */
export const ALLOWED_IMAGE_HOSTS: readonly string[] = ["images.unsplash.com"];

export function isAllowedImageUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return (
      parsed.protocol === "https:" &&
      ALLOWED_IMAGE_HOSTS.includes(parsed.hostname) &&
      parsed.port === "" &&
      !parsed.username &&
      !parsed.password
    );
  } catch {
    return false;
  }
}
