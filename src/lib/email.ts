import { Resend } from "resend";

const DEFAULT_FROM = "Ticketera <onboarding@resend.dev>";

/**
 * Envía un correo con Resend. Nunca lanza: devuelve false sin `RESEND_API_KEY` o si el envío falla.
 * Solo se registra un código/nombre del error, nunca el contenido ni el destinatario.
 */
export async function sendEmail(input: { to: string; subject: string; html: string }): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return false;
  try {
    const { error } = await new Resend(apiKey).emails.send({
      from: process.env.EMAIL_FROM || DEFAULT_FROM,
      to: input.to,
      subject: input.subject,
      html: input.html,
    });
    if (error) {
      console.error("email.send_failed", { code: error.name ?? "unknown" });
      return false;
    }
    return true;
  } catch (error) {
    const name = error instanceof Error ? error.name : "unknown";
    console.error("email.send_failed", { code: name });
    return false;
  }
}
