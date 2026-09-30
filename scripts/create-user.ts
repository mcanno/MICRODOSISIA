import { loadEnv } from "./env";

loadEnv();

const [email, name, role] = process.argv.slice(2);

if (!email || !name) {
  console.error("Uso: npm run user:create -- <email> <nombre> [member|superuser]");
  console.error("Crea una cuenta; esa persona entrará con el enlace enviado a su correo.");
  process.exit(1);
}
if (role && role !== "member" && role !== "superuser") {
  console.error(`Rol desconocido: "${role}". Usa "member" o "superuser".`);
  process.exit(1);
}

const { createUser, findUserByEmail } = await import("../src/lib/db/queries");
const { isSecotEmail } = await import("../src/lib/magic");

if (!isSecotEmail(email)) {
  console.error(`Solo se permite el dominio secot.org (recibido: ${email}).`);
  process.exit(1);
}

const existing = await findUserByEmail(email);
if (existing) {
  console.error(`Ya existe un usuario con el email ${email}.`);
  process.exit(1);
}

const user = await createUser({
  email,
  name,
  role: (role as "member" | "superuser" | undefined) ?? "member",
});

console.log(`Usuario creado: ${user.email} (${user.role}) · id ${user.id}`);
console.log(`Esa persona entra desde /login pidiendo el enlace para ${user.email}.`);
process.exit(0);
