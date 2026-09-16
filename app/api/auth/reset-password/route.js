// path: app/api/auth/reset-password/route.js

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { consumeAuthToken } from "@/lib/tokens";
import { validatePassword } from "@/lib/validation";
import { logAudit } from "@/lib/audit";
import bcrypt from "bcryptjs";

export async function POST(req) {
  const { token, newPassword } = await req.json();
  if (!token || !newPassword)
    return NextResponse.json(
      { error: "Token and new password are required." },
      { status: 400 },
    );

  const { valid, errors } = validatePassword(newPassword);
  if (!valid)
    return NextResponse.json({ error: errors.join(" ") }, { status: 400 });

  let userId;
  try {
    userId = await consumeAuthToken(token, "password_reset");
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }

  const password_hash = await bcrypt.hash(newPassword, 10);

  const { error } = await supabaseAdmin
    .from("users")
    .update({
      password_hash,
      must_change_password: false,
      failed_login_attempts: 0,
      locked_until: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  await logAudit({
    actorId: userId,
    action: "user.password_reset_via_email",
    entityType: "user",
    entityId: userId,
  });

  return NextResponse.json({ success: true });
}
