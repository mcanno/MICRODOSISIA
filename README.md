# MICRODOSISIA

Sitio web para que los asesores de **SECOT** ([secot.org](https://secot.org)) propongan,
voten y consulten microaprendizajes de IA («microdosis»).

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

- **Astro 5** (SSR, adaptador Node) + TypeScript + CSS propio
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
consola.

### Correo del enlace de acceso

`EMAIL_TRANSPORT` (en `.env`) decide cómo se envía:

| Valor | Comportamiento |
| --- | --- |
| `log` (por defecto) | No envía nada. **En localhost el enlace se muestra en la propia página**; fuera de localhost se rechaza para no perder enlaces. |
| `resend` | Envío real vía [Resend](https://resend.com): requiere `RESEND_API_KEY` y `EMAIL_FROM`. |

## Comandos

| Comando | Para qué |
| --- | --- |
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Compila a `dist/` |
| `npm run preview` | Sirve el build |
| `npx tsc --noEmit` | Comprueba los archivos `.ts` |
| `npm run typecheck` | `astro check` (también `.astro`) |
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
│   ├── mailer.ts          envío del correo (log local / resend)
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

El build es SSR (`@astrojs/node`, modo `standalone`): necesita un host con
Node. GitHub Pages **no** sirve SSR — publica el código en GitHub y despliega
en Vercel, Netlify, Railway o similar (cambiando solo el adaptador de Astro si
hace falta).
