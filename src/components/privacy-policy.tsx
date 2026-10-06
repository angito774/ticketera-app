export function PrivacyPolicy() {
  return (
    <article className="mx-auto w-full max-w-3xl text-foreground">
      <h1 className="text-3xl font-bold tracking-tight">Política de privacidad</h1>
      <p className="mt-3 text-muted-foreground">
        Esta política explica cómo tratamos tu correo electrónico cuando te suscribes a las novedades de Ticketera.
      </p>

      <section className="mt-8">
        <h2 className="text-xl font-semibold">Qué dato recogemos</h2>
        <p className="mt-2 text-muted-foreground">
          Solo recogemos tu correo electrónico. No pedimos ni guardamos otros datos al suscribirte.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-xl font-semibold">Para qué lo usamos</h2>
        <p className="mt-2 text-muted-foreground">
          Usamos tu correo para enviarte novedades de eventos por correo electrónico.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-xl font-semibold">Con quién lo compartimos</h2>
        <p className="mt-2 text-muted-foreground">No compartimos tu correo electrónico con terceros.</p>
      </section>

      <section className="mt-8">
        <h2 className="text-xl font-semibold">Cómo darte de baja</h2>
        <p className="mt-2 text-muted-foreground">
          Por ahora no hay un mecanismo para darte de baja de las novedades.
        </p>
      </section>
    </article>
  );
}
