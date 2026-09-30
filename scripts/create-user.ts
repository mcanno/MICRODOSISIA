import { loadEnv } from "./env";

loadEnv();

const [email, name, password, role] = process.argv.slice(2);

if (!email || !name || !password) {
  console.error("Uso: npm run user:create -- <email> <nombre> <contraseña> [member|superuser]");
  process.exit(1);
}
if (role && role !== "member" && role !== "superuser") {
  console.error(`Rol desconocido: "${role}". Usa "member" o "superuser".`);
  process.exit(1);
}

const { createUser, findUserByEmail } = await import("../src/lib/db/queries");
const { hashPassword } = await import("../src/lib/password");

const existing = await findUserByEmail(email);
if (existing) {
  console.error(`Ya existe un usuario con el email ${email}.`);
  process.exit(1);
}

const passwordHash = await hashPassword(password);
const user = await createUser({
  email,
  name,
  passwordHash,
  role: (role as "member" | "superuser") ?? "member",
});

console.log(`Usuario creado: ${user.email} (${user.role}) · id ${user.id}`);
process.exit(0);
