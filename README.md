# MICRODOSISIA

Sitio web para que los asesores de **SECOT** ([secot.org](https://secot.org)) propongan,
voten y consulten microaprendizajes de IA («microdosis»).

📖 **Manual de usuario para los asesores:** [`docs/manual-usuario.md`](docs/manual-usuario.md)

## Flujo

1. El usuario se identifica con su **correo @secot.org**: pide un *enlace de
   acceso* y lo recibe por correo (enlace de un solo uso, caduca en 15 min;
   no hay contraseñas). Solo entra quien un superusuario ha dado de alta.
2. Elige **añadir un tema** (título + descripción) o **votar un tema** abierto.
3. Cualquiera consulta la **microdosisia**: lo ya preparado.
4. Un **superusuario** da de alta/baja asesores en `/admin`, y pasa cada
   microdosis por el ciclo `propuesta → en estudio → realizada`, adjuntando el
   enlace de documentación (documentos, audios, vídeos) al marcarla como
   realizada.

## Stack

- **Astro 7** (SSR, adaptador Node en local y `@astrojs/vercel` en producción)
  + TypeScript + CSS propio
- Acceso por **enlace mágico** (`src/lib/magic.ts` + `src/lib/mailer.ts`) y
  sesión JWT en cookie firmada con `@auth/core`
- **Neon (Postgres)** con **Drizzle ORM**
- Astro actions para todas las mutaciones, con validación Zod

## Puesta en marcha

Requisitos: Node ≥ 22.20 y una base de datos Neon.

```bash
npm install
cp .env.example .env      # y rellena DATABASE_URL y AUTH_SECRET
npm run db:generate       # genera la migración desde el esquema
npm run db:migrate        # la aplica a la base de datos
npm run db:guard          # trigger que bloquea transiciones inválidas en la BD
npm run user:create -- ana@secot.org "Ana Pérez" superuser
npm run dev               # http://localhost:4321
```

`user:create` no pide contraseña: esa persona entra con el enlace que se le
envía a su correo. Acepta el rol opcional `member` (por defecto) o `superuser`;
desde `/admin` un superusuario puede dar de alta y dar de baja sin usar la
consola. Para cambiar el rol de una cuenta ya existente (la UI no lo permite):
`npm run user:role -- correo@secot.org superuser`.

### Correo del enlace de acceso

`EMAIL_TRANSPORT` (en `.env`) decide cómo se envía:

| Valor | Comportamiento |
| --- | --- |
| `log` (por defecto) | No envía nada. **En localhost el enlace se muestra en la propia página**; fuera de localhost se rechaza para no perder enlaces. |
| `smtp` | Envío real por SMTP (nodemailer). secot.org usa Microsoft 365: `SMTP_HOST=smtp.office365.com`, `SMTP_PORT=587`, `SMTP_USER` y `SMTP_PASS` = el buzón (contraseña de aplicación si hay MFA), `EMAIL_FROM` = ese mismo buzón. `SMTP_CA_FILE` (opcional) añade una raíz de confianza extra, para máquinas cuyo antivirus intercepte el SMTP. |
| `resend` | Envío real vía [Resend](https://resend.com): requiere `RESEND_API_KEY` y `EMAIL_FROM`. |

## Comandos

| Comando | Para qué |
| --- | --- |
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Compila a `dist/` |
| `npm run preview` | Sirve el build |
| `npx tsc --noEmit` | Comprueba los archivos `.ts` |
| `npm run typecheck` | `astro check` (también `.astro`) |
| `npm run user:create -- <correo> <nombre> [rol]` | Da de alta una cuenta (sin contraseña) |
| `npm run user:role -- <correo> <rol>` | Cambia el rol de una cuenta existente |
| `npm run db:generate` | Genera migración a partir del esquema |
| `npm run db:migrate` | Aplica migraciones pendientes |
| `npm run db:studio` | Consola Drizzle para inspeccionar datos |
| `npm run db:guard` | Instala el trigger de transiciones en Postgres |
| `npm run user:create -- …` | Crea un usuario sin contraseña (alta inicial) |

## Estructura

```text
src/
├── actions/index.ts      todas las mutaciones (añadir, votar, transicionar,
│                          dar de alta/bajar usuarios) — accept: "form"
├── components/Layout.astro
├── lib/
│   ├── magic.ts           enlace de acceso: emisión, consumo, dominio SECOT
│   ├── mailer.ts          envío del correo (log local / smtp M365 / resend)
│   ├── auth.ts            emisión de la cookie de sesión (JWT)
│   ├── session.ts         lectura de la cookie de sesión
│   ├── http.ts            origen/protocolo de la petición (proxy)
│   ├── states.ts          máquina de estados (única fuente de verdad)
│   └── db/                esquema Drizzle, cliente y consultas
├── middleware.ts          sesión + control de rutas y roles
├── pages/                 login, add, vote, microdosisia, admin,
│                          api/login, api/magic, api/logout
└── styles/global.css
scripts/                  creación de usuarios y guard de base de datos
```

## Despliegue

El build es SSR, así que necesita un host con Node. **Vercel** ya está
preparado en el repo:

1. **Importa el repositorio** en Vercel (`vercel.com/new` →
   `github.com/mcanno/MICRODOSISIA`). Vercel define `VERCEL=1` al compilar y
   `astro.config.mjs` elige entonces `@astrojs/vercel` (runtime `nodejs22.x`,
   `maxDuration: 30`); en local sigues con `@astrojs/node` para `dev` y
   `preview`.
2. **Variables de entorno** del proyecto (mismos nombres que `.env`):

   | Variable | Valor |
   | --- | --- |
   | `DATABASE_URL` | cadena de conexión de Neon (producción) |
   | `AUTH_SECRET` | secreto **nuevo**: `openssl rand -base64 32` |
   | `PUBLIC_SITE_URL` | `https://microdosis-ia.vercel.app` |
   | `EMAIL_TRANSPORT` | `smtp` |
   | `SMTP_HOST` / `SMTP_PORT` | `smtp.office365.com` / `587` |
   | `SMTP_USER` / `SMTP_PASS` | el buzón y su contraseña (de aplicación si hay MFA) |
   | `EMAIL_FROM` | `MICRODOSISIA <buzón>` |
   | `SMTP_CA_FILE` | **no se define** — el de Avast solo existe en tu máquina |

3. **Base de datos de producción**: `npm run db:migrate` y `npm run db:guard`
   con el `DATABASE_URL` de producción, y alta del primer superusuario con
   `npm run user:create`.
4. **Hostname permitido**: `astro.config.mjs` acepta `localhost`,
   `microdosis-ia.vercel.app` y el de `PUBLIC_SITE_URL`. Si el proyecto se llama
   distinto o añadís un dominio propio, hay que meterlo en `hosts` **antes** de
   desplegar: sin esa entrada **todos los formularios responden 403**.

Vercel solo bloquea el puerto 25 de salida, así que el SMTP por el 587 funciona
desde sus funciones. GitHub Pages **no** sirve SSR; Netlify, Railway o un VPS
también valen cambiando el adaptador.
