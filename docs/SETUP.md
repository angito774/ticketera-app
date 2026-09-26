# SETUP.md

Reglas de estructura de carpetas, buenas prácticas de desarrollo y metodología de trabajo para este proyecto (Next.js App Router + TypeScript + shadcn/ui + TanStack Query/Table + Zod + Zustand).

---

## 1. Estructura de carpetas

### Reglas

- **Modular por dominio**: todo el código específico de un dominio de negocio (ej. `users`, `orders`, `products`) vive en su propia carpeta bajo `src/modules/<domain>/`. No se mezcla código de un dominio dentro de otro.
- **Nombres en inglés**: carpetas, archivos, componentes, funciones, variables y tipos se nombran en inglés, sin importar el idioma de la conversación o del negocio.
- **Naming de archivos**: `kebab-case` para todos los archivos (`user-card.tsx`, `use-users.ts`, `users.service.ts`), siguiendo la convención que ya usa shadcn/ui en este repo (`src/components/ui/button.tsx`).
- **Naming de identificadores TS**:
  - Componentes y tipos/interfaces → `PascalCase` (`UserCard`, `UserDTO`).
  - Funciones, variables, hooks → `camelCase`, hooks siempre prefijados con `use` (`useUsers`).
  - Constantes globales → `UPPER_SNAKE_CASE`.
- **Sufijos por capa** dentro de cada módulo:
  - `*.service.ts` — llamadas a API / lógica de acceso a datos (usa `axios`).
  - `*.schema.ts` — esquemas de validación (`zod`).
  - `*.store.ts` — estado global del módulo (`zustand`).
  - `*.types.ts` — tipos e interfaces del dominio.
  - `use-*.ts` — hooks (incluye los que envuelven `@tanstack/react-query`).
  - `*.test.ts` / `*.test.tsx` — tests unitarios, co-ubicados junto al archivo que prueban (ver sección 3).
- **App Router (`src/app/`)**: las carpetas de `src/app/` son solo rutas. Un `page.tsx`/`layout.tsx` compone UI e importa lo que necesita desde `src/modules/<domain>/`, pero no contiene lógica de negocio ni definiciones de componentes reutilizables. Se pueden usar route groups (`(group)`) para organizar rutas sin afectar la URL.
- **Código compartido entre dominios** (no específico de un módulo) va en la raíz de `src/`, no dentro de `modules/`:
  - `src/components/ui/` — primitivos de shadcn/ui.
  - `src/components/` — componentes compartidos entre módulos (ej. `providers/`).
  - `src/hooks/` — hooks compartidos entre módulos.
  - `src/lib/` — utilidades genéricas (ej. `utils.ts` con `cn()`).
- Antes de crear una carpeta o archivo nuevo, confirmar que no exista ya algo equivalente (ver sección 2).

### Ejemplo

```
src/
  app/
    (dashboard)/
      users/
        page.tsx              # solo compone: importa desde modules/users
        loading.tsx
      orders/
        page.tsx
    layout.tsx
    globals.css
  modules/
    users/
      components/
        user-card.tsx
        user-card.test.tsx
      hooks/
        use-users.ts
        use-users.test.ts
      services/
        users.service.ts
        users.service.test.ts
      schemas/
        user.schema.ts
      store/
        users.store.ts
      types/
        user.types.ts
    orders/
      components/
      hooks/
      services/
      schemas/
      store/
      types/
  components/
    ui/
      button.tsx               # shadcn/ui
    providers/
      query-provider.tsx       # compartido, no pertenece a un dominio
  hooks/
  lib/
    utils.ts
```

---

## 2. Buenas prácticas

Aplicar **SOLID, DRY, KISS y YAGNI** en todo momento y en toda capa: componentes (incluidos los de shadcn/ui), funciones, hooks y services. No son reglas solo para "código de lógica"; también rigen composición de componentes y estructura de módulos.

- **SOLID**: cada componente/hook/service tiene una responsabilidad única; se depende de abstracciones (tipos/interfaces, props) en vez de implementaciones concretas cuando eso facilita reemplazar o testear una pieza.
- **DRY**: no duplicar lógica ni UI entre módulos; si dos módulos necesitan lo mismo, se extrae a lo compartido (`src/components/`, `src/hooks/`, `src/lib/`).
- **KISS**: la solución más simple que cumple el requisito. No se agregan capas de abstracción, configuración o flexibilidad que el caso actual no pide.
- **YAGNI**: no se construye para necesidades hipotéticas futuras; se implementa lo que la spec (sección 3) pide ahora.

### Antes de crear un componente

1. **Revisar si ya existe en shadcn/ui** (registro de shadcn) antes de escribirlo a mano. Si existe, se agrega con `npx shadcn@latest add <component>`.
2. Si no existe en shadcn/ui, se crea a mano **pensando en que sea reutilizable**: recibe datos por props, no depende de un módulo específico si va a vivir en `src/components/ui/` o `src/components/`, y sigue las convenciones de los componentes shadcn ya presentes.
3. Si el componente es específico de un dominio y no tiene sentido reutilizarlo fuera de él, vive dentro de `src/modules/<domain>/components/`.

### Antes de crear cualquier función, hook o service

- Buscar en el codebase si ya existe uno que resuelva (o casi resuelva) la misma necesidad, tanto en el módulo actual como en lo compartido (`src/lib/`, `src/hooks/`). Si existe algo parecido, se extiende o generaliza en vez de duplicar.
- Solo se crea algo nuevo cuando la búsqueda confirma que no hay nada reutilizable.

---

## 3. Metodología: SDD (Spec Driven Development)

El desarrollo de features sigue **Spec Driven Development**: no se escribe código de implementación sin una spec aprobada primero. El trabajo se organiza en 4 agentes con responsabilidades separadas:

1. **Orquestador** — recibe el pedido/feature, coordina el flujo de trabajo entre los demás agentes y da seguimiento al estado de la tarea de principio a fin.
2. **Spec** — redacta la especificación de la feature (requisitos, criterios de aceptación, contratos de datos/API, qué módulo(s) toca) *antes* de que se escriba cualquier código.
3. **Developer** — implementa siguiendo la spec al pie de la letra, aplicando la estructura de carpetas (sección 1) y las buenas prácticas (sección 2).
4. **Reviewer** — revisa el código resultante contra la spec y contra las buenas prácticas de la sección 2 (incluye verificar que no se haya duplicado un componente/hook/service existente) antes de aprobar.

Orden de trabajo: **Orquestador → Spec → aprobación humana → Developer → Reviewer**, y el Reviewer reporta de vuelta al Orquestador para cerrar la tarea.

**Aprobación humana (bloqueante)**: toda spec nace en estado `draft`. No se puede empezar a implementar hasta que un humano la apruebe explícitamente; el orquestador registra la aprobación en la spec (`Estado: approved`, `Aprobado por`). Ningún agente puede aprobar una spec. Si la spec cambia después de aprobada, vuelve a `draft` y necesita una nueva aprobación.

### Unit testing

Se incluyen tests unitarios con **Vitest**, co-ubicados junto al archivo que prueban (`user-card.tsx` + `user-card.test.tsx` en la misma carpeta).

Requieren unit tests las secciones con lógica de negocio o lógica pura:

- `*.service.ts` (llamadas y transformación de datos)
- `use-*.ts` con lógica (no solo un wrapper trivial de `useQuery`/`useMutation`)
- `*.store.ts` (zustand)
- `*.schema.ts` (validaciones zod)
- utilidades en `src/lib/`

Los componentes puramente presentacionales (sin lógica de negocio) no requieren unit test por defecto.

Comandos: `npm run test` (una pasada) y `npm run test:watch`.

### Agentes

Los 4 agentes están definidos en `.claude/agents/` (`orchestrator`, `spec`, `developer`, `reviewer`). El orquestador decide primero si la tarea necesita SDD o puede ir en modo build directo. Las specs se guardan en `docs/specs/<domain>/<feature>.md`. Para que el orquestador pueda despachar a los demás agentes (y lanzarlos en paralelo), se ejecuta como hilo principal: `claude --agent orchestrator`.
