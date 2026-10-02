# Pendientes

Cosas abiertas a día 01/10/2026, tras dejar la app en producción
(<https://microdosis-ia.vercel.app>).

## Estado a 02/10/2026 (retomar aquí)

- ✅ Pestaña **Ayuda** desplegada (`/ayuda`, commit `7591a2a`): sirve
  `docs/manual-usuario.md` y `docs/estructura-drive.md` en HTML + descarga de
  la plantilla. Cambiar el manual = editar el `.md` y hacer `git push`.
- ✅ Cuentas y microdosis de prueba borradas (02/10, por Manuel).
- ⏳ Falta: revisión manual de la app y del manual en producción
  (siguiente punto).

## Decisiones

- [ ] **Plan de Vercel.** Hobby (gratis) funciona hoy; valorar Pro si sube el
  uso. El nombre del proyecto es `microdosis-ia` — **no renombrarlo sin
  añadir el hostname nuevo a `hosts` en `astro.config.mjs`** (si no, los
  formularios responden 403).

## Seguridad / operación

- [ ] **Rotar la contraseña SMTP** del buzón `manuelj.canno@secot.org` (pasó
  por una conversación) y actualizarla en `.env` y en las variables de Vercel.
- [ ] **Base de datos de producción.** Hoy producción usa la misma BD de
  pruebas de Neon. Si se separa: nueva BD → `npm run db:generate` +
  `npm run db:migrate` + `npm run db:guard` + `npm run user:create` con el
  superusuario real.
- [ ] `PUBLIC_SITE_URL` no pudo crearse en Vercel (la rechazó). No hace falta
  hoy: el hostname ya está en `allowedDomains`. Si algún día el código la usa,
  volver a intentarlo.

## Producto

- [ ] **Verificar el manual de usuario** → seguir
  [`verificacion-manual.md`](verificacion-manual.md) en producción.
- [ ] **Dominio propio** (`microdosisia.secot.org` o similar): añadir el
  dominio en Vercel, registrar el DNS y añadir el hostname a `hosts` en
  `astro.config.mjs` + redeploy.
