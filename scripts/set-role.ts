import { loadEnv } from "./env";

loadEnv();

const [email, role] = process.argv.slice(2);

if (!email || !role) {
  console.error("Uso: npm run user:role -- <email> <member|superuser>");
  console.error("Cambia el rol de una cuenta ya dada de alta.");
  process.exit(1);
}
if (role !== "member" && role !== "superuser") {
  console.error(`Rol desconocido: "${role}". Usa "member" o "superuser".`);
  process.exit(1);
}

const { countSuperusers, findUserByEmail, setRole } = await import("../src/lib/db/queries");
const { isSecotEmail } = await import("../src/lib/magic");

if (!isSecotEmail(email)) {
  console.error(`Solo se permite el dominio secot.org (recibido: ${email}).`);
  process.exit(1);
}

const existing = await findUserByEmail(email);
if (!existing) {
  console.error(`No existe ningún usuario con el email ${email}. Dalo de alta primero.`);
  process.exit(1);
}
if (existing.role === role) {
  console.log(`${existing.email} ya era ${role}; nada que cambiar.`);
  process.exit(0);
}

// Same rule as the panel: never leave the site without an administrator.
if (existing.role === "superuser" && role === "member" && (await countSuperusers()) <= 1) {
  console.error("No se puede quitar el último superusuario: promueve a otra cuenta antes.");
  process.exit(1);
}

const user = await setRole(email, role);
console.log(`Rol actualizado: ${user?.email} → ${user?.role}`);
if (role === "superuser") {
  console.log("Esa persona ya ve «Gestión» en el menú y puede dar de alta y quitar usuarios.");
}
process.exit(0);
