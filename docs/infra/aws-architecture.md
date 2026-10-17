# Arquitectura AWS (demo de bajo costo)

> Estado: **desplegado** en la cuenta `131540503098`, región **us-east-2**. Diagrama con logos: artifact "Arquitectura AWS de Ticketera" (algunos detalles del artifact son del diseño inicial; este documento refleja lo creado).

Entorno de **demo**: credenciales sandbox (Stripe en modo test, Clerk en instancia de desarrollo), sin correos, sin dominio y con **100 USD de crédito** como único presupuesto (objetivo: 3 meses, ~33 USD/mes).

URL pública: `https://d25j7fz3j5s6d3.cloudfront.net`

## 1. Restricciones de la cuenta

La cuenta pertenece a una AWS Organization con políticas (SCP) que limitan lo que se puede crear:

- EC2, RDS, ECR, Systems Manager, Lambda, ECS y Secrets Manager **solo funcionan en us-east-2**; en us-east-1 y otras regiones están denegados.
- **No se puede crear el proveedor OIDC de GitHub** (`iam:CreateOpenIDConnectProvider` denegado). GitHub Actions usa por eso un usuario IAM dedicado con clave de acceso.
- App Runner, Amplify y DynamoDB están denegados.

## 2. Recursos creados

| Servicio | Recurso | Detalle |
|---|---|---|
| Budgets | `ticketera-credito-100`, `ticketera-mensual-35` | 100 USD trimestral (avisos 50 % y 80 %) y 35 USD mensual. |
| VPC | VPC por defecto de us-east-2 (`vpc-0ea9dbd46bc86abf1`) | Subredes públicas; sin NAT ni VPC endpoints. |
| Security groups | `ticketera-app` (`sg-0fc02fd7f42c6e198`) | 3000 solo desde la prefix list de CloudFront. Sin puerto 22. |
| | `ticketera-db` (`sg-0aa968464692c0d69`) | 5432 solo desde `ticketera-app`. |
| EC2 | `ticketera-app` (`i-082459b4e74ceb9a2`) | t3.micro (1 GB), AL2023, gp3 20 GB cifrado, IP elástica `13.184.6.215`, Docker, 1 GB de swap, IMDSv2 obligatorio. |
| RDS | `ticketera-db` | PostgreSQL 16.15, `db.t4g.micro`, 20 GB, cifrada, una zona, sin IP pública, backup de 1 día. |
| CloudFront | `E3MKE2AU9FILKL` | HTTPS sin dominio. Origen: EC2 por HTTP :3000. Sin caché por defecto; caché solo para `/_next/static/*`. HTTP del visitante se redirige a HTTPS. |
| ECR | `ticketera` | Escaneo al subir; conserva las últimas 5 imágenes. |
| Systems Manager | Parameter Store `/ticketera/*` | Secretos como `SecureString`; Run Command para desplegar. |
| CloudWatch | Log group `/ticketera/app` (7 días), alarma `ticketera-ec2-cpu-alta` | |
| IAM | Rol/perfil `ticketera-ec2`; usuario `ticketera-github-ci` | El rol de la EC2 lee `/ticketera` y `/ticketera/*`, baja imágenes de ECR y escribe logs. El usuario de CI solo sube a ECR y envía Run Command a esa instancia. |

## 3. Flujo

1. Usuario → CloudFront (HTTPS) → EC2 :3000 (HTTP, solo desde IPs de CloudFront).
2. EC2 → RDS :5432 (SSL con el certificado global de RDS incluido en la imagen).
3. Webhooks de Stripe y Clerk entran por la misma URL de CloudFront.
4. La EC2 llama directo a Stripe y Clerk por el Internet Gateway (sin NAT).
5. La EC2 descarga imágenes de ECR, lee Parameter Store, recibe Run Command y envía logs a CloudWatch.

## 4. CI/CD (`.github/workflows/deploy.yml`)

- **Pull requests a `main`**: lint, `next typegen`, `tsc`, tests.
- **Push a `main`**: lo anterior y, si pasa, construye dos imágenes (`runner` y `migrate`), las sube a ECR con el SHA como tag, y envía por SSM Run Command el script `scripts/deploy-ec2.sh`. El push que solo toca `docs/` o archivos `.md` no dispara el workflow.
- **`scripts/deploy-ec2.sh`** (en la EC2): login en ECR → pull → genera `/opt/ticketera/.env` desde Parameter Store (modo 600, sin `DB_PASSWORD`) → corre `drizzle-kit migrate` → reinicia el contenedor `ticketera` (700 MB de límite, logs a CloudWatch) → espera `/api/health` → si falla, muestra logs y hace rollback a la imagen anterior.
- El workflow termina verificando `https://d25j7fz3j5s6d3.cloudfront.net/api/health`.

GitHub guarda: secretos `AWS_ACCESS_KEY_ID` y `AWS_SECRET_ACCESS_KEY` (usuario `ticketera-github-ci`); variables `AWS_REGION`, `ECR_REPOSITORY`, `INSTANCE_ID`, `APP_URL` y las `NEXT_PUBLIC_*` (se incrustan al construir la imagen). Las claves secretas de Stripe, Clerk y la base viven solo en Parameter Store.

## 5. Cambios hechos en el código

- `src/db/index.ts`: de `drizzle-orm/neon-http` a `drizzle-orm/node-postgres` con un `Pool` (máx. 5).
- `src/db/atomic.ts`: `runAtomic` ejecuta sentencias en una transacción. Sustituye a `db.batch`, exclusivo de neon-http, en reservas, escritura de eventos, reembolsos y liquidaciones.
- `next.config.ts`: `output: "standalone"`.
- `Dockerfile` (targets `runner` y `migrate`), `.dockerignore`, `.gitattributes`.
- `src/app/api/health/route.ts`.
- `src/proxy.ts`: con `ASSUME_HTTPS=true` fija `x-forwarded-proto: https` para que Clerk redirija a `https://`.

## 6. Pendientes

- **Webhooks**: crear los endpoints en Stripe (`/api/webhooks/stripe`, `/api/webhooks/stripe/connect`) y en Clerk (`/api/webhooks/clerk`) con la URL de CloudFront, y guardar sus secretos:
  `aws ssm put-parameter --profile ticketera --region us-east-2 --name /ticketera/STRIPE_WEBHOOK_SECRET --type SecureString --value "whsec_..." --overwrite`
  (igual con `STRIPE_CONNECT_WEBHOOK_SECRET` y `CLERK_WEBHOOK_SIGNING_SECRET`). Luego redeplegar para que la app lea los valores.
- **`SUPER_ADMIN_EMAIL`**: no está cargado; sin él nadie recibe el rol de super admin al iniciar sesión.
- **Clerk**: añadir la URL de CloudFront a las URLs permitidas de la instancia de desarrollo si el login lo pide.
- **Datos**: la base RDS está vacía salvo el esquema; `npm run db:seed` no se ha corrido allí.
- **Correo**: desactivado (sin `RESEND_API_KEY`).

## 7. Lecciones del primer despliegue

- `GetParametersByPath` evalúa el recurso `parameter/ticketera` (sin `/*`); la política debe permitir ambos.
- Las variables de GitHub cargadas por pipe desde PowerShell llevan un BOM invisible. Usar siempre `gh variable set NAME --body "valor"`.
- CloudFront descarta en silencio el header personalizado `X-Forwarded-Proto` del origen, y una CloudFront Function que lo añada provoca 502 ("disallowed header"). La solución es `ASSUME_HTTPS=true` (parámetro `/ticketera/ASSUME_HTTPS`), que `src/proxy.ts` usa para declarar `x-forwarded-proto: https` antes de pasar por Clerk.
- Tras cambiar la configuración de CloudFront, el sitio puede dar 502 unos minutos hasta que llega a todos los bordes.
- `PageProps`, `LayoutProps` y `RouteContext` los genera Next: en CI hay que correr `next typegen` antes de `tsc`.
- `pg` trata `sslmode=require` como `verify-full`, por eso la imagen incluye el bundle de certificados de RDS (`NODE_EXTRA_CA_CERTS`).

## 8. Costo

Cifras de lista de precios de us-east-2, **sin verificar en AWS Pricing Calculator**. El plan gratuito de la cuenta puede cubrir parte de EC2 y RDS.

| Concepto | USD/mes aprox. |
|---|---|
| EC2 `t3.micro` + gp3 20 GB | ~9 |
| IPv4 pública (IP elástica) | ~4 |
| RDS `db.t4g.micro` + 20 GB | ~14 |
| CloudFront, CloudWatch, ECR, SSM, IAM, Budgets | 0–2 |
| **Total encendido** | **~27–29** |

Con 100 USD alcanza para unos 3.5 meses. Para estirarlo: detener la EC2 fuera de las demos (el disco, la IP y RDS siguen cobrando) o volver a Neon y borrar RDS (~14 USD/mes menos, requiere revertir el driver). La instancia tiene 913 MB de RAM; si los PDFs la saturan, subir a `t3.small` (+8 USD/mes).

## 9. Desmontar todo

Eliminar en este orden: distribución de CloudFront (deshabilitar primero), función `ticketera-forward-proto`, EC2 e IP elástica, RDS (sin snapshot final), repositorio ECR, parámetros `/ticketera/*`, log group, alarma, security groups, rol/perfil `ticketera-ec2`, usuario `ticketera-github-ci` (y su clave), y los presupuestos.
