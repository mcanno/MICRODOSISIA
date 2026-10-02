# Estructura de un estudio en el drive de SECOT

Instrucciones para publicar la documentación de una microdosis: los ficheros
residen en **OneDrive/SharePoint de la organización** y la aplicación solo
guarda el enlace a la página `index.html` que los agrupa.

Se repite el mismo proceso en cada estudio (≈10 minutos).

---

## 1 · Crear la carpeta del estudio

En el drive de SECOT:

```
📁 Estudio <nombre del tema>/
├── 📁 fuentes/
├── 📁 informes/          ← informes y presentaciones
└── 📁 conclusiones/
```

Suelta dentro de cada subcarpeta los ficheros que correspondan (PDF, Word,
PowerPoint, audios, vídeos…). No hace falta ningún formato especial: lo que
abra el navegador se verá en línea y lo demás se descargará.

## 2 · Compartir la carpeta

Selecciona la carpeta del estudio → **Compartir** → **Copiar vínculo** y
elige el permiso:

| Permiso | Quién podrá abrirlo |
| --- | --- |
| **Personas de la organización con el enlace** | Solo quien tenga cuenta Microsoft de SECOT (se pedirá login) |
| **Cualquiera con el enlace** | Cualquiera, dentro o fuera |

> ⚠️ Si eliges el primero, **los asesores sin cuenta Microsoft no podrán ver
> el estudio**. Si vas a compartir el enlace fuera de SECOT, usa el segundo.

Guarda el enlace: lo necesitas en el paso 4.

## 3 · Copiar la plantilla

Copia [`plantilla-archivo/index.html`](../plantilla-archivo/index.html) y
pégalo en la carpeta del estudio (o en tu equipo para rellenarlo primero).

## 4 · Rellenar la plantilla

Ábrela con el Bloc de notas (o cualquier editor de texto) y busca **`PEGA-AQUI`**
(`Ctrl+F`). Hay que tocar solo esto:

1. **Cabecera**: título del estudio, autor y fecha.
2. **Los tres botones** *Abrir carpeta ↗*: uno por sección
   (*Fuentes*, *Informes y presentaciones*, *Conclusiones*) → pega el enlace
   de **cada subcarpeta** (paso 2).
3. *(Opcional)* **Enlaces sueltos** a documentos destacados: copia una línea
   `<li>…</li>` y cambia el texto y el enlace. Para obtener el enlace de un
   fichero: en OneDrive/SharePoint, fichero → **Compartir → Copiar vínculo**.

Guarda como **`index.html`** (tipo de archivo: *Todos los archivos*, para que
no te quede `index.html.txt`).

## 5 · Subir el `index.html`

Súbelo a **la misma carpeta del estudio** (arrastrar en el explorador o
*Subir → Archivos* desde el navegador).

## 6 · Probar antes de publicarlo

1. Haz clic en `index.html` desde OneDrive/SharePoint → debe **verse la
   página** con las tres secciones.
2. Comprueba que los tres botones abren sus carpetas.
3. Abre el enlace del `index.html` en una **ventana de incógnito**
   (`Ctrl+Shift+N`) → confirma que entra quien no tenga tu sesión (o que pide
   login, según el permiso del paso 2).

## 7 · Pegar el enlace en la microdosis

1. Entra en MICRODOSISIA como **superusuario** → **Admin**.
2. En la microdosis correspondiente, campo **Enlace de documentación** →
   pega el enlace al `index.html` → **Guardar enlace**.
   - Si la microdosis todavía no está *realizada*, el mismo campo aparece al
     pasarla a **realizada** (allí es obligatorio).
3. Aviso verde *«Enlace de documentación guardado.»*

## 8 · Comprobación final

En **Microdosisia**, la microdosis en estado *Realizada* muestra el botón
**Ver documentación ↗** → debe abrirse tu página y, desde ella, los ficheros.

---

## Problemas típicos

| Problema | Causa y solución |
| --- | --- |
| Al abrir `index.html` se **descarga** en vez de verse | Ese drive no ejecuta HTML desde su visor. Prueba a abrirlo con **Abrir en el navegador** desde la app de OneDrive; si insiste, copia el HTML dentro de otra carpeta/sitio y vuelve a probar |
| **Pide login de Microsoft** a los destinatarios | La carpeta está compartida solo para la organización → cámbialo a *Cualquiera con el enlace* |
| El HTML se ve pero **los enlaces no abren** | Son enlaces de sesión: comparte cada carpeta/fichero con permiso de lectura y vuelve a copiar el vínculo |
| El HTML muestra los enlaces **de otro estudio** | Se copió una plantilla ya rellena: busca `PEGA-AQUI` otra vez y reemplaza los tres enlaces |
| Cambié un fichero y **no se nota** | No hay nada que actualizar: los enlaces apuntan a la carpeta, así que el contenido nuevo se ve al recargar |
| El botón **Ver documentación** lleva a un enlace viejo | Corrígelo en **Admin → Enlace de documentación → Guardar enlace** |

---

Relacionado: [`manual-usuario.md`](manual-usuario.md) (§6, panel de gestión) ·
[`verificacion-manual.md`](verificacion-manual.md) ·
[`pendientes.md`](pendientes.md)
