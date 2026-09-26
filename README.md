# next-js-template

Template base para arrancar proyectos con **Next.js 16 (App Router)**, con una estructura modular por dominio, buenas prácticas definidas y un flujo de trabajo **Spec Driven Development (SDD)** con agentes de Claude Code listos para usar.

No está atado a ningún sector de negocio: es un punto de partida de desarrollo.

## Stack

| Área | Librería |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) + React 19 |
| Lenguaje | TypeScript |
| Estilos / UI | Tailwind CSS v4 + shadcn/ui (`base-nova`, iconos `lucide`) |
| Data fetching | TanStack Query + axios |
| Tablas | TanStack Table |
| Validación | Zod |
| Estado global | Zustand |
| Testing | Vitest + Testing Library (jsdom) |
| Lint | ESLint (`next/core-web-vitals` + `next/typescript`) |

## Requisitos

- Node.js 24
- npm

## Inicio rápido

```bash
npm install
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000).

## Scripts

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Build de producción (incluye chequeo de TypeScript) |
| `npm run start` | Sirve el build de producción |
| `npm run lint` | ESLint |
| `npm run test` | Tests unitarios (una pasada) |
| `npm run test:watch` | Tests en modo watch |

Agregar un componente de shadcn/ui: `npx shadcn@latest add <componente>`.

## Estructura

El código se organiza **por módulo de dominio**. `src/app/` solo contiene rutas que componen lo que exportan los módulos.

```
src/
  app/                  # rutas (App Router): page.tsx, layout.tsx...
  modules/<domain>/     # components/ hooks/ services/ schemas/ store/ types/
  components/ui/        # componentes shadcn/ui
  components/providers/ # providers globales (ej. TanStack Query)
  hooks/                # hooks compartidos entre módulos
  lib/                  # utilidades compartidas
```

Las reglas completas de estructura, naming, buenas prácticas (SOLID, DRY, KISS, YAGNI) y testing están en **[`docs/SETUP.md`](docs/SETUP.md)**.

## Flujo de trabajo: SDD con agentes

El proyecto incluye 4 agentes de Claude Code en `.claude/agents/`:

| Agente | Rol |
|---|---|
| `orchestrator` | Decide si la tarea va en **modo build** (cambio chico y claro) o por **SDD**. Divide el trabajo en planes alcanzables, lanza tareas en paralelo sin conflictos y maneja el loop de review (máx. 3 rondas). |
| `spec` | Escribe la spec en `docs/specs/<domain>/<feature>.md`: criterios de aceptación, contratos, qué se reusa y plan de tareas. |
| `developer` | Implementa una tarea tocando solo sus archivos asignados. |
| `reviewer` | Valida contra la spec y `docs/SETUP.md`, corre lint/tests/build y aprueba o pide cambios. |

**Una spec solo se implementa después de que un humano la aprueba.** Es un paso bloqueante.

Para usarlo, inicia Claude Code con el orquestador como agente principal:

```bash
claude --agent orchestrator
```

## Skills recomendadas

Estas skills complementan el template para trabajar con Claude Code de forma óptima.

| Skill | Para qué sirve en este template | Instalación |
|---|---|---|
| **superpowers** | Flujos de proceso: brainstorming antes de construir, planes de implementación, TDD, debugging sistemático y verificación antes de dar algo por terminado. Encaja con el enfoque SDD. | `/plugin install superpowers@claude-plugins-official` |
| **ponytail** | Empuja a la solución más simple que funcione: stdlib y features nativas antes que dependencias, nada de abstracciones especulativas. Es la aplicación práctica de KISS y YAGNI. Incluye `ponytail-review` y `ponytail-audit` para detectar sobre-ingeniería. | `npx skills add dietrichgebert/ponytail` |
| **ui-ux-pro-max** | Criterio de diseño UI/UX: estilos, paletas, tipografías, guías de UX y accesibilidad, con soporte para shadcn/ui + Tailwind. | `npx skills add nextlevelbuilder/ui-ux-pro-max-skill` |
| **frontend-design** | Dirección visual con intención (tipografía, composición, identidad) para que las pantallas no se vean como un template genérico. | `npx skills add anthropics/skills` |
| **vercel-labs** (`vercel-react-best-practices`, `web-design-guidelines`) | Buenas prácticas de rendimiento en React/Next.js de Vercel y revisión de UI contra las Web Interface Guidelines. | `npx skills add vercel-labs/agent-skills` |
| **caveman** | Servidor MCP que comprime salidas grandes (logs, JSON, resultados de herramientas) antes de que entren al contexto, para que las sesiones largas rindan más. | Servidor MCP: `claude mcp add caveman -- <ruta a caveman-mcp>` |

> Al ejecutar `npx skills add <repo>` puedes elegir qué skills del repositorio instalar.

## Documentación

- [`docs/SETUP.md`](docs/SETUP.md): estructura de carpetas, buenas prácticas y metodología SDD.
- [`CLAUDE.md`](CLAUDE.md): contexto del proyecto para Claude Code.
- [`AGENTS.md`](AGENTS.md): esta versión de Next.js tiene cambios importantes; la documentación oficial está en `node_modules/next/dist/docs/`.
