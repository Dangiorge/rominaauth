// path: scripts/seed.js

require("dotenv").config({ path: ".env.local" });
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

const ADMIN_EMAIL = "admin@romina.com";
const ADMIN_PASSWORD = "admin123";
const ADMIN_NAME = "Super Admin";

async function seed() {
  console.log("Ensuring super_admin role exists...");
  const role = await prisma.role.upsert({
    where: { name: "super_admin" },
    update: { description: "Full system access", is_system: true },
    create: {
      name: "super_admin",
      description: "Full system access",
      is_system: true,
    },
  });
  console.log("super_admin role id:", role.id);

  console.log("Hashing password...");
  const password_hash = await bcrypt.hash(ADMIN_PASSWORD, 10);

  console.log("Creating/updating admin user...");
  const user = await prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    update: {
      password_hash,
      full_name: ADMIN_NAME,
      role_id: role.id,
      is_active: true,
    },
    create: {
      email: ADMIN_EMAIL,
      password_hash,
      full_name: ADMIN_NAME,
      role_id: role.id,
      is_active: true,
    },
  });

  console.log("\n✅ Seed complete!");
  console.log("User:", { id: user.id, email: user.email });
  console.log("Login with:", ADMIN_EMAIL, "/", ADMIN_PASSWORD);
}

seed()
  .catch((e) => {
    console.error("❌ Seed failed:", e.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
