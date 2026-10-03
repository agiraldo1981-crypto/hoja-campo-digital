# Hoja de Campo Digital

App web móvil (PWA) para las caracterizaciones de residuos de Fundació Privada Trinijove (expediente ARC-2027-6).

- Se publica con GitHub Pages desde la rama `main`.
- Los datos y las fotos están en Supabase (`config.js` tiene la URL y la clave pública).
- La app guarda primero en el móvil y sube a Supabase cuando hay conexión.
- Usuarios: se crean en Supabase → Authentication → Users → Add user. El primero es el administrador y ve todos los registros; los demás solo ven los suyos.
- Base de datos: `supabase/schema.sql`, que se ejecuta una vez en el SQL Editor de Supabase.
- Todo el contexto del proyecto y lo que queda pendiente está en `TRASPASO.md`.
