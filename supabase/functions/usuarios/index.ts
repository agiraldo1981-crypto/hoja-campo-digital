// Función «usuarios» de la Hoja de Campo Digital (Supabase Edge Function).
// Permite que un administrador, desde la app, liste usuarios, los cree, les cambie
// la contraseña, les dé o quite permisos de administrador y los quite.
// La clave secreta la pone Supabase dentro de la función: nunca sale del servidor.
import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

function secretKey(): string {
  const legacy = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (legacy) return legacy;
  try {
    const keys = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") ?? "{}");
    return keys.default ?? Object.values(keys)[0] ?? "";
  } catch { return ""; }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, secretKey(), {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // ¿Quién llama? Solo administradores.
    const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
    const { data: quien, error: errQuien } = await admin.auth.getUser(token);
    if (errQuien || !quien?.user) return json({ error: "Sesión no válida. Vuelve a entrar en la app." }, 401);
    const yo = quien.user.id;
    const { data: miPerfil } = await admin.from("perfiles").select("es_admin").eq("user_id", yo).maybeSingle();
    if (!miPerfil?.es_admin) return json({ error: "Solo los administradores pueden gestionar usuarios." }, 403);

    const body = await req.json().catch(() => ({}));

    if (body.accion === "listar") {
      const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
      if (error) throw error;
      const { data: perfiles } = await admin.from("perfiles").select("user_id,nombre,es_admin");
      const p = new Map((perfiles ?? []).map((x) => [x.user_id, x]));
      return json({
        usuarios: data.users.map((u) => ({
          id: u.id, email: u.email, nombre: p.get(u.id)?.nombre ?? u.email,
          es_admin: !!p.get(u.id)?.es_admin, ultimo_acceso: u.last_sign_in_at, yo: u.id === yo,
          bloqueado: !!u.banned_until && new Date(u.banned_until) > new Date(),
        })).sort((a, b) => String(a.nombre).localeCompare(String(b.nombre))),
      });
    }

    if (body.accion === "crear") {
      const email = String(body.email ?? "").trim().toLowerCase();
      const nombre = String(body.nombre ?? "").trim();
      const password = String(body.password ?? "");
      if (!email || !nombre) return json({ error: "Falta el nombre o el correo." }, 400);
      if (password.length < 8) return json({ error: "La contraseña debe tener al menos 8 caracteres." }, 400);
      const { data, error } = await admin.auth.admin.createUser({
        email, password, email_confirm: true, user_metadata: { nombre },
      });
      if (error) return json({ error: /already/i.test(error.message) ? "Ya existe un usuario con ese correo." : error.message }, 400);
      // El perfil lo crea el trigger crear_perfil; aquí se asegura el nombre y el permiso.
      await admin.from("perfiles").upsert({ user_id: data.user.id, nombre, es_admin: !!body.es_admin });
      return json({ ok: true });
    }

    if (body.accion === "contrasena") {
      const password = String(body.password ?? "");
      if (password.length < 8) return json({ error: "La contraseña debe tener al menos 8 caracteres." }, 400);
      const { error } = await admin.auth.admin.updateUserById(String(body.user_id), { password });
      if (error) throw error;
      return json({ ok: true });
    }

    if (body.accion === "admin") {
      if (body.user_id === yo && !body.es_admin) return json({ error: "No puedes quitarte a ti mismo el permiso de administrador." }, 400);
      const { error } = await admin.from("perfiles").update({ es_admin: !!body.es_admin }).eq("user_id", String(body.user_id));
      if (error) throw error;
      return json({ ok: true });
    }

    if (body.accion === "quitar") {
      const id = String(body.user_id);
      if (id === yo) return json({ error: "No puedes quitarte a ti mismo." }, 400);
      // Si tiene registros no se borra (se perderían sus caracterizaciones): se le quita el acceso.
      const { count, error: errCount } = await admin.from("registros").select("id", { count: "exact", head: true }).eq("user_id", id);
      if (errCount) throw errCount;
      if (count && count > 0) {
        const { error } = await admin.auth.admin.updateUserById(id, { ban_duration: "876000h" });
        if (error) throw error;
        await admin.from("perfiles").update({ es_admin: false }).eq("user_id", id);
        return json({ ok: true, bloqueado: true, registros: count });
      }
      const { error } = await admin.auth.admin.deleteUser(id);
      if (error) throw error;
      return json({ ok: true, borrado: true });
    }

    if (body.accion === "devolver") {
      const { error } = await admin.auth.admin.updateUserById(String(body.user_id), { ban_duration: "none" });
      if (error) throw error;
      return json({ ok: true });
    }

    return json({ error: "Acción desconocida." }, 400);
  } catch (e) {
    return json({ error: (e as Error)?.message ?? "Error" }, 500);
  }
});
