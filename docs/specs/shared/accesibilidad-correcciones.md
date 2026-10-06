# Accesibilidad: correcciones aplicadas

Oct 4, 2026 · @Nelson

Se corrigieron los 20 puntos de la revisión de accesibilidad; ESLint y tsc pasan y Vitest pasa 342 de 342 pruebas.

## Cambios por punto

| # | Punto | Archivos | Cambio |
| --- | --- | --- | --- |
| 1 | Idioma de la página | `src/app/layout.tsx` | `lang="en"` pasa a `lang="es"` |
| 2 | Texto "Close" en diálogos | `src/components/ui/dialog.tsx` | Traducido a "Cerrar" (cierre y pie) |
| 3 | Buscador sin foco visible | `event-search-bar.tsx` | Quitado `focus-visible:ring-0` |
| 4 | Iconos con nombre sin rol | `purchase-header.tsx` | `role="img"` en el check y el candado |
| 5 | Foco perdido al llegar al límite | `quantity-stepper.tsx`, `order-ticket-card.tsx`, `ticket-viewer.tsx` | `disabled` pasa a `aria-disabled` con control en el clic |
| 6 | Mapa de asientos con demasiadas paradas de Tab | `seat-map.tsx`, nuevo `services/seat-navigation.ts` | Una parada de Tab, flechas, Inicio y Fin; ocupadas anunciadas |
| 7 | Foco de zonas ilegible | `venue-map.tsx` | Halo blanco por debajo de la zona en foco de teclado |
| 8 | Etiquetas que no contienen el texto visible | `selected-seat-chips.tsx`, `event-sort-toggle.tsx` | Etiqueta empieza por el texto visible |
| 9 | Control de orden sin grupo | `event-sort-toggle.tsx` | `role="group"` con `aria-labelledby` |
| 10 | Editor sin resumen de errores ni estado | `event-editor.tsx` | Resumen con enlaces a campos, `role="status"` y `aria-busy` |
| 11 | Categorías ocultas en móvil | `header.tsx` | Fila de categorías desplazable bajo el logo |
| 12 | Carrusel sin nombre de región | `event-carousel.tsx`, `ui/carousel.tsx` | Región con título, "1 de N", textos en español |
| 13 | `alt` que repite el título | `hero.tsx`, `event-card.tsx`, `event-detail-hero.tsx`, `ticket-viewer.tsx` | `alt=""` en imágenes decorativas |
| 14 | `aria-controls` a un id inexistente | `checkout-summary.tsx` | Solo se pone cuando el panel está abierto |
| 15 | "Descargar PDF" que solo imprime | `confirmation-actions.tsx`, `ticket-viewer.tsx` | Renombrado a "Imprimir" |
| 16 | Suscripción sin formulario | `promo-banner.tsx` | Form, campo obligatorio y mensaje de estado honesto |
| 17 | "Continuar" deshabilitado como `span` | `purchase-summary.tsx` | `button disabled` con motivo enlazado |
| 18 | Enlaces `href="#"` | `footer.tsx`, `checkout-form.tsx` | Convertidos en texto (decisión del equipo) |
| 19 | Barra lateral sin nombre | `dashboard-shell.tsx` | `aria-label` a la barra lateral |
| 20 | Botón de cerrar de 32px | `dialog.tsx` | 44px, con espacio reservado en el encabezado |

## Decisiones tomadas

- **Mapa de asientos (6):** navegación con flechas y una sola parada de Tab, no una lista alternativa de asientos.
- **Suscripción (16):** no se simuló un alta exitosa; el mensaje dice que aún no hay servicio.
- **"Imprimir" (15):** se renombró el botón en lugar de generar un PDF real.
- **Enlaces del footer y del checkout (18):** convertidos en texto, como decidió el equipo.
- **Navegación de categorías en móvil (11):** fila duplicada bajo el logo, no menú desplegable.
- **Botón de cerrar (20):** 44px con espacio reservado en el encabezado, no en el panel, para no desalinear el pie de los diálogos.

## Pendientes y verificación

No se probó en navegador ni con lector de pantalla; todo se verificó con ESLint, tsc y pruebas.

- [ ] Recorrer la compra solo con teclado: mapa (6), contador (5) y "Continuar" (17)
- [ ] Lector de pantalla: controles de orden (8, 9), resumen de errores (10) y carrusel (12)
- [x] Revisar a ojo los diálogos con títulos largos y el botón de cerrar (20)
- [x] Medir el contraste de las etiquetas pequeñas del mapa (9 a 10px). Peor caso, con el degradado superior (mínimo AA 4.5): letras de fila 5.72 (`white/65`), nombre de zona agotada 4.75 sobre el rayado (`white/95`), precio agotado 8.66 sobre la píldora `brand-deep/80` (`white/75`). Calculado con composición alfa, no medido en pantalla; sin medir el número de asiento de 8px (`seat-map.tsx:244`). El texto de zonas atenuadas (`opacity-45`) queda fuera por ser estado inactivo
- [ ] Decidir la suscripción del banner (16) hasta que exista un servicio
- [ ] Decidir si "Imprimir" se queda o se genera un PDF real (15)
