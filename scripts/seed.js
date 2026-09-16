// path: scripts/seed.js

require("dotenv").config({ path: ".env.local" });
const { createClient } = require("@supabase/supabase-js");
const bcrypt = require("bcryptjs");

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

const ADMIN_EMAIL = "admin@romina.com";
const ADMIN_PASSWORD = "admin123";
const ADMIN_NAME = "Super Admin";

async function seed() {
  console.log("Ensuring super_admin role exists...");
  const { data: role, error: roleError } = await supabase
    .from("roles")
    .upsert(
      { name: "super_admin", description: "Full system access" },
      { onConflict: "name" },
    )
    .select()
    .single();

  if (roleError) {
    console.error("❌ Role seed failed:", roleError.message);
    process.exit(1);
  }
  console.log("super_admin role id:", role.id);

  console.log("Hashing password...");
  const password_hash = await bcrypt.hash(ADMIN_PASSWORD, 10);

  console.log("Creating/updating admin user...");
  const { data: user, error: userError } = await supabase
    .from("users")
    .upsert(
      {
        email: ADMIN_EMAIL,
        password_hash,
        full_name: ADMIN_NAME,
        role_id: role.id,
        is_active: true,
      },
      { onConflict: "email" },
    )
    .select("id, email")
    .single();

  if (userError) {
    console.error("❌ User seed failed:", userError.message);
    process.exit(1);
  }

  console.log("\n✅ Seed complete!");
  console.log("User:", user);
  console.log("Login with:");
  console.log("  Email:   ", ADMIN_EMAIL);
  console.log("  Password:", ADMIN_PASSWORD);
}

seed();
