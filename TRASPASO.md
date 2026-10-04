# Hoja de Campo Digital: documento de traspaso

Estado a 4 de octubre de 2026. Sirve para que cualquier persona, u otra cuenta de Claude, retome el proyecto sin perder contexto.

## Qué es

App web móvil (PWA, se instala desde el navegador) para las caracterizaciones de residuos de **Fundació Privada Trinijove**, expediente **ARC-2027-6** (Agència de Residus de Catalunya). Nació como demo de la mejora «Hoja de campo digital con validación en el momento» de la memoria técnica (apartado 5) y el 3/10/2026 pasó a ser una app real y gratuita.

Qué hace:
- Asistente de caracterización en 4 pasos: lote, tipo de muestra (FORM, F. Resto, R1–R4…), instalación, circuito, técnico, peso con tolerancia, desglose por materiales con las categorías de los protocolos ARC, fotos obligatorias (tique de báscula, escalímetro, cartel), fotos por material, incidencias y geolocalización.
- Genera el informe de caracterización con gráfico.
- Inicio de sesión por usuario. Cada técnico ve solo sus registros y el administrador ve todos.
- Funciona sin cobertura: guarda en el móvil y sincroniza con Supabase cuando hay conexión.
- Solo el administrador puede eliminar registros, junto con sus fotos.
- El administrador puede descargar una copia en Excel con todos los registros (hojas: Registros, Materiales, Incidencias, Fotos).
- Los registros cerrados se pueden editar; queda anotado quién y cuándo hizo la última edición.
- Las instalaciones y los técnicos son comunes para todos: el administrador los gestiona en Inicio → «Instalaciones y técnicos» (tabla `ajustes`).
- Cada foto lleva sellada la fecha, la hora y la ubicación del momento en que se añade a la app.
- Para cerrar un registro nuevo hace falta la ubicación; si el GPS falla se puede guardar sin ella, dejándolo claro.
- Búsqueda y filtros (fechas, instalación, técnico, estado) en «Registros».
- Informe en PDF con todas las fotos, generado en el propio móvil; funciona sin conexión con las fotos ya vistas en ese móvil.

## Dónde está cada cosa

| Pieza | Dónde | Cuenta actual |
|---|---|---|
| App publicada | https://agiraldo1981-crypto.github.io/hoja-campo-digital/ | GitHub de Alberto (personal) |
| Código | https://github.com/agiraldo1981-crypto/hoja-campo-digital (público) | GitHub de Alberto (personal) |
| Datos, fotos y usuarios | Supabase, proyecto `hoja-campo`, región Frankfurt, URL `https://avwtygqwvuinzqfuvgab.supabase.co` | Cuenta personal de Alberto |
| Demo original | https://claude.ai/artifact/QCSbsPJbz4v6KZ3x4jgZit | Claude de Alberto |

Coste actual: 0 € (GitHub Pages gratis, Supabase plan Free).

## Archivos del repositorio

- `index.html`: toda la app (estilos, lógica, sincronización).
- `config.js`: URL de Supabase y clave *publishable*, que es pública por diseño. **La clave secreta (`sb_secret_…`) no va nunca en el código ni se comparte.**
- `sw.js`: service worker que permite abrir la app sin conexión.
- `vendor/`: librerías incluidas (supabase-js 2.117.2, SheetJS 0.18.5 y jsPDF 4.2.1) para no depender de CDN.
- `supabase/schema.sql`: tablas, seguridad y bucket de fotos. Ya ejecutado.
- `supabase/02-borrar-registros.sql`: permiso de borrado para el administrador. Ya ejecutado; también está incluido en `schema.sql`.
- `supabase/functions/usuarios/index.ts`: función de Supabase para gestionar usuarios desde la app. La clave secreta solo existe dentro de Supabase.
- `supabase/03-ajustes.sql`: tabla `ajustes` con las instalaciones y los técnicos comunes. También incluido en `schema.sql`.
- `.github/workflows/mantener-supabase-activo.yml`: consulta Supabase lunes y jueves para que el plan gratuito no se pause.

## Cómo funciona por dentro

- **Tabla `registros`**: una fila por caracterización, con el registro completo en la columna `data` (jsonb).
- **Tabla `perfiles`**: nombre y si el usuario es administrador. **El primer usuario que se dio de alta es el administrador.**
- **Seguridad (RLS)**: cada técnico lee y edita solo lo suyo; el administrador lo ve todo y es el único que puede borrar.
- **Fotos**: bucket público `fotos` con nombres aleatorios. En el registro queda solo el enlace.
- **Sincronización**: la app guarda en `localStorage` y lleva una lista de registros pendientes. Al haber conexión sube las fotos, después el registro, y descarga lo que hay en el servidor.

## Tareas habituales

- **Dar de alta a un técnico**: en la app, Inicio → «Usuarios» (solo administradores). Desde ahí también se cambian contraseñas y se dan o quitan permisos de administrador. Usa la función de Supabase `usuarios` (`supabase/functions/usuarios/index.ts`), que se instala en Supabase → Edge Functions → Deploy a new function → Via Editor, con el nombre `usuarios`. Alternativa sin la función: Supabase → Authentication → Users → Add user, con «Auto Confirm User» marcado.
- **Cambiar una contraseña olvidada**: Supabase → SQL Editor:
  `update auth.users set encrypted_password = crypt('NuevaContraseña', gen_salt('bf')) where email = 'email@ejemplo.com';`
- **Ver los datos**: Supabase → Table Editor → `registros`. Fotos en Storage → `fotos`.
- **Actualizar la app en el móvil después de un cambio**: cerrarla y abrirla dos veces.
- **Si Supabase se pausa**: entrar en Supabase y pulsar «Restore project». No se pierde nada.

## Pendiente

1. **Pasar a cuentas de la empresa**, prevista hacia el 10/10/2026:
   - Supabase: crear una organización con la cuenta de empresa y, desde la cuenta personal, ir a Project Settings → General → Transfer project. Se conservan URL, claves y datos.
   - GitHub: crear una organización gratuita y, en el repositorio, ir a Settings → General → Transfer ownership. **Cambia la dirección de la app**, así que hay que reactivar Pages en la organización (Settings → Pages → Deploy from a branch → main → / (root)) y avisar a los técnicos de la nueva dirección.
   - Si cambia la URL o la clave de Supabase, actualizar `config.js` y el workflow `mantener-supabase-activo.yml`.
2. **Copia de seguridad automática semanal** al Google Drive de la empresa, con un Excel de registros y las fotos. Hasta entonces, usar el botón «Descargar copia (Excel)» cada semana. Ese Excel lleva las fotos como enlaces.
3. **Panel «Cumplimiento de plazos»**: en la demo tenía cifras de ejemplo, y en la versión real está oculto. Falta definir cómo calcularlo con datos reales.
4. **Espacio de fotos**: el plan gratuito da 1 GB, unas 3.000 fotos. Al acercarse, hay dos opciones: pasar a Supabase Pro (25 $/mes, 100 GB y copias diarias) o mover las fotos a Cloudflare R2 (capa gratuita).

## Decisiones tomadas

- PWA en lugar de apps de tienda, para evitar los 99 $/año de Apple y los 25 $ de Google.
- Supabase en lugar de Firebase, porque el almacenamiento de Firebase exige registrar una tarjeta.
- GitHub Pages en lugar de Cloudflare Pages, porque el repositorio es público y así hay una cuenta menos.
- Seguir en el plan gratuito durante el piloto; pasar a Pro cuando sea la herramienta oficial del expediente.

## Para retomarlo con otra cuenta de Claude

1. En la nueva cuenta, conectar GitHub (claude.ai → Settings → Connectors, o https://claude.ai/connect-github) con una cuenta que tenga acceso al repositorio.
2. Abrir una sesión de Claude Code sobre el repositorio y pedirle que lea este archivo (`TRASPASO.md`).
3. Para cambios en Supabase, Claude prepara el SQL y una persona lo ejecuta en el SQL Editor. Claude no necesita la clave secreta.
