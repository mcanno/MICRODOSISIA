# MICRODOSISIA

Sitio web para que los asesores de **SECOT** ([secot.org](https://secot.org)) propongan,
voten y consulten microaprendizajes de IA («microdosis»).

## Flujo

1. El usuario se identifica (email + contraseña).
2. Elige **añadir un tema** (título + descripción) o **votar un tema** abierto.
3. Cualquiera consulta la **microdosisia**: lo ya preparado.
4. Un **superusuario** pasa cada microdosis por el ciclo
   `propuesta → en estudio → realizada`, adjuntando el enlace de documentación
   (documentos, audios, vídeos) al marcarla como realizada.

## Stack

- **Astro 5** (SSR, adaptador Node) + TypeScript + CSS propio
- **Auth.js** (`@auth/core`) con proveedor Credentials y sesión JWT en cookie
- **Neon (Postgres)** con **Drizzle ORM**
- Astro actions para todas las mutaciones, con validación Zod

## Puesta en marcha

Requisitos: Node 20.3+ (ver `AGENTS.md` sobre Node 22) y una base de datos Neon.

```bash
npm install
cp .env.example .env      # y rellena DATABASE_URL y AUTH_SECRET
npm run db:generate       # genera la migración desde el esquema
npm run db:migrate        # la aplica a la base de datos
npm run db:guard          # trigger que bloquea transiciones inválidas en la BD
npm run user:create -- ana@secot.org "Ana Pérez" "contraseña-segura" superuser
npm run dev               # http://localhost:4321
```

`user:create` acepta el rol opcional `member` (por defecto) o `superuser`.

## Comandos

| Comando | Para qué |
| --- | --- |
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Compila a `dist/` |
| `npm run preview` | Sirve el build |
| `npx tsc --noEmit` | Comprueba los archivos `.ts` |
| `npm run typecheck` | `astro check` (también `.astro`; requiere Node ≥ 22.12) |
| `npm run db:generate` | Genera migración a partir del esquema |
| `npm run db:migrate` | Aplica migraciones pendientes |
| `npm run db:studio` | Consola Drizzle para inspeccionar datos |
| `npm run db:guard` | Instala el trigger de transiciones en Postgres |
| `npm run user:create -- …` | Crea un usuario (miembro o superusuario) |

## Estructura

```text
src/
├── actions/index.ts      todas las mutaciones (añadir, votar, transicionar)
├── components/Layout.astro
├── lib/
│   ├── auth.ts           configuración Auth.js + proveedor Credentials
│   ├── session.ts        lectura de la cookie de sesión
│   ├── states.ts         máquina de estados (única fuente de verdad)
│   ├── password.ts       hash/verificación con scrypt
│   └── db/               esquema Drizzle, cliente y consultas
├── middleware.ts         sesión + control de rutas y roles
├── pages/                login, add, vote, microdosisia, admin, api/
└── styles/global.css
scripts/                  creación de usuarios y guard de base de datos
```

## Despliegue

El build es SSR (`@astrojs/node`, modo `standalone`): necesita un host con
Node. GitHub Pages **no** sirve SSR — publica el código en GitHub y despliega
en Vercel, Netlify, Railway o similar (cambiando solo el adaptador de Astro si
hace falta).
