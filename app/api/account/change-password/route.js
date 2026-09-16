// path: app/api/account/change-password/route.js

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { validatePassword } from "@/lib/validation";
import { logAudit } from "@/lib/audit";
import bcrypt from "bcryptjs";

export async function POST(req) {
  const session = await getServerSession(authOptions);
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { newPassword } = await req.json();
  const { valid, errors } = validatePassword(newPassword);
  if (!valid)
    return NextResponse.json({ error: errors.join(" ") }, { status: 400 });

  const password_hash = await bcrypt.hash(newPassword, 10);

  const { error } = await supabaseAdmin
    .from("users")
    .update({
      password_hash,
      must_change_password: false,
      updated_at: new Date().toISOString(),
    })
    .eq("id", session.user.id);

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  await logAudit({
    actorId: session.user.id,
    actorEmail: session.user.email,
    action: "user.password_self_change",
    entityType: "user",
    entityId: session.user.id,
  });

  return NextResponse.json({ success: true });
}
