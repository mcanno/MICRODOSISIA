# Verificación del manual de usuario

Comprueba que cada apartado de [`manual-usuario.md`](manual-usuario.md)
corresponde con lo que la aplicación hace de verdad.

- **Entorno principal:** <https://microdosis-ia.vercel.app> (producción).
  Extra opcional: local con `npm run preview` → <http://localhost:4321>.
- **Sesión necesaria:** dos cuentas, una **superusuario** y otra **asesor**.
- Marca cada casilla ✅ / ❌ y anota la fecha y cualquier diferencia.

---

## 1 · Entrada (manual §1)

- [ ] `/login` solo pide el correo y un botón **Enviar enlace de acceso** — no
      hay campo de contraseña en ningún momento.
- [ ] Correo personal (p. ej. `prueba@gmail.com`) → *«Solo se permite entrar
      con un correo @secot.org.»*
- [ ] Correo `@secot.org` no dado de alta → *«Ese correo no está dado de
      alta…»*
- [ ] Correo dado de alta → *«Si ese correo está en la lista…»* y **sin** el
      enlace visible en la página.
- [ ] El correo llega con asunto *«Tu enlace de acceso a MICRODOSISIA»*.
- [ ] Abrir el enlace → dentro de la aplicación.
- [ ] Reabrir **el mismo** enlace → *«El enlace no es válido, ya se ha usado o
      ha caducado…»*
- [ ] Pedir dos enlaces seguidos → el segundo no genera correo (hay 1 minuto
      de espera).
- [ ] Botón **Salir** → vuelve a pedir la entrada.
- [ ] Sesión recordada: cerrar la pestaña y volver a entrar sin pedir enlace.

## 2 · Inicio (manual §2)

- [ ] Tres tarjetas para todos: *1 · Añadir un tema*, *2 · Votar un tema*,
      *3 · Consultar la microdosisia*.
- [ ] Cuarta tarjeta *Gestión · Estados* **solo** con rol superusuario.
- [ ] Menú: **Inicio · Añadir tema · Votar temas · Microdosisia** (+ **Admin**
      si es superusuario); nombre y rol arriba a la derecha.
- [ ] Se ve bien en pantalla estrecha (móvil): menú y tarjetas utilizables.

## 3 · Proponer un tema (manual §3)

- [ ] Título de menos de 8 caracteres → *«El título necesita al menos 8
      caracteres»*.
- [ ] Descripción de menos de 20 caracteres → *«Describe el contenido en al
      menos 20 caracteres»*.
- [ ] Formulario válido → *«Tema propuesto. Ya está en la lista abierta para
      votación.»* y el tema aparece en **Votar temas**.

## 4 · Votar (manual §4)

- [ ] Los temas de la lista llevan la etiqueta **Propuesta** y el recuento
      `👍 n votos`.
- [ ] **Votar** → *«Tu voto está contabilizado»* y el contador sube.
- [ ] **Quitar mi voto** → el contador baja.
- [ ] Un solo voto por persona y tema (volver a votar no duplica).

## 5 · La microdosisia (manual §5)

- [ ] Tres secciones con su contador: **Realizada**, **En estudio**,
      **Propuesta**.
- [ ] Las realizadas tienen **Ver documentación ↗** y se abren en pestaña
      nueva.
- [ ] Sección vacía → *«No hay microdosis en «…»»*.

## 6 · Panel de gestión (manual §6, superusuario)

- [ ] Con rol **asesor**: no aparece **Admin** y `/admin` redirige al inicio.
- [ ] Con rol **superusuario**: **Admin** → sección **Personas con acceso**.
- [ ] Pasar una propuesta a **en estudio**.
- [ ] Pasar a **realizada sin el enlace** → no lo permite (obligatorio).
- [ ] Pasar a **realizada con enlace válido** → queda como **Realizada**.
- [ ] **Dar de alta** a una persona nueva → *«Alta realizada…»*.
- [ ] Esa persona entra después con su propio correo y enlace.
- [ ] **Quitar** a alguien → deja de poder entrar; a ti mismo no te deja
      quitarte; no se puede dejar el sistema sin superusuario.

## 7 · Errores frecuentes (manual §7)

- [ ] Recorrer la tabla y comprobar que **cada mensaje** aparece literalmente
      así en la aplicación (son los textos reales de los errores).

## 8 · Roles al vivo (añadido tras el cambio del 01/10/2026)

- [ ] `npm run user:role -- correo@secot.org superuser` → la persona ve
      **Admin** **sin volver a entrar**.
- [ ] `npm run user:role -- correo@secot.org member` → **Admin** desaparece en
      el mismo momento.
- [ ] Borrar una cuenta → su sesión deja de servir de inmediato.

---

## Resultados

| Fecha | Entorno | Resultado | Notas |
| --- | --- | --- | --- |
| | | | |
