// path: app/api/system/users/[userId]/route.js

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { validateUserPayload, validatePassword } from "@/lib/validation";
import { canRemoveUser } from "@/lib/guards";
import { logAudit } from "@/lib/audit";
import bcrypt from "bcryptjs";

export async function GET(req, { params }) {
  const { userId } = await params;
  const session = await getServerSession(authOptions);
  if (!session || session.user.roleName !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { data, error } = await supabaseAdmin
    .from("users")
    .select(
      `
      id, email, full_name, phone, employee_id, address, city, country,
      date_of_birth, gender, department, job_title, hire_date, avatar_url,
      status, is_active, must_change_password, last_login_at, created_at, updated_at,
      role_id, roles ( id, name )
    `,
    )
    .eq("id", userId)
    .single();
  if (error || !data)
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  return NextResponse.json({ user: { ...data, role_name: data.roles?.name } });
}

export async function PUT(req, { params }) {
  const { userId } = await params;
  const session = await getServerSession(authOptions);
  if (!session || session.user.roleName !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await req.json();
  const { valid, errors } = validateUserPayload(body, { isUpdate: true });
  if (!valid)
    return NextResponse.json({ error: errors.join(" ") }, { status: 400 });

  const { data: before } = await supabaseAdmin
    .from("users")
    .select("*")
    .eq("id", userId)
    .single();
  if (!before)
    return NextResponse.json({ error: "User not found." }, { status: 404 });

  if (body.email && body.email !== before.email) {
    const { data: dup } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("email", body.email)
      .neq("id", userId)
      .maybeSingle();
    if (dup)
      return NextResponse.json(
        { error: "Another user already uses this email." },
        { status: 409 },
      );
  }

  const isDeactivating = body.is_active === false && before.is_active === true;
  const isRoleChange = body.role_id && body.role_id !== before.role_id;
  if (isDeactivating || isRoleChange) {
    const guard = await canRemoveUser(userId, session.user.id);
    if (!guard.allowed)
      return NextResponse.json({ error: guard.reason }, { status: 409 });
  }

  const updatePayload = {
    ...("email" in body && { email: body.email }),
    ...("full_name" in body && { full_name: body.full_name }),
    ...("phone" in body && { phone: body.phone }),
    ...("employee_id" in body && { employee_id: body.employee_id }),
    ...("address" in body && { address: body.address }),
    ...("city" in body && { city: body.city }),
    ...("country" in body && { country: body.country }),
    ...("date_of_birth" in body && { date_of_birth: body.date_of_birth }),
    ...("gender" in body && { gender: body.gender }),
    ...("department" in body && { department: body.department }),
    ...("job_title" in body && { job_title: body.job_title }),
    ...("hire_date" in body && { hire_date: body.hire_date }),
    ...("role_id" in body && { role_id: body.role_id }),
    ...("is_active" in body && {
      is_active: body.is_active,
      status: body.is_active ? "active" : "suspended",
    }),
    updated_by: session.user.id,
    updated_at: new Date().toISOString(),
  };

  if (body.new_password) {
    const pw = validatePassword(body.new_password);
    if (!pw.valid)
      return NextResponse.json({ error: pw.errors.join(" ") }, { status: 400 });
    updatePayload.password_hash = await bcrypt.hash(body.new_password, 10);
    updatePayload.must_change_password = true;
  }

  const { data, error } = await supabaseAdmin
    .from("users")
    .update(updatePayload)
    .eq("id", userId)
    .select("id, email, full_name")
    .single();
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  await logAudit({
    actorId: session.user.id,
    actorEmail: session.user.email,
    action: "user.update",
    entityType: "user",
    entityId: userId,
    beforeData: before,
    afterData: updatePayload,
  });
  return NextResponse.json({ user: data });
}

export async function DELETE(req, { params }) {
  const { userId } = await params;
  const session = await getServerSession(authOptions);
  if (!session || session.user.roleName !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { searchParams } = new URL(req.url);
  const hard = searchParams.get("hard") === "true";

  const guard = await canRemoveUser(userId, session.user.id);
  if (!guard.allowed)
    return NextResponse.json({ error: guard.reason }, { status: 409 });

  if (hard) {
    const { error } = await supabaseAdmin
      .from("users")
      .delete()
      .eq("id", userId);
    if (error)
      return NextResponse.json({ error: error.message }, { status: 500 });
  } else {
    const { error } = await supabaseAdmin
      .from("users")
      .update({
        deleted_at: new Date().toISOString(),
        is_active: false,
        status: "archived",
      })
      .eq("id", userId);
    if (error)
      return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await logAudit({
    actorId: session.user.id,
    actorEmail: session.user.email,
    action: hard ? "user.hard_delete" : "user.soft_delete",
    entityType: "user",
    entityId: userId,
  });
  return NextResponse.json({ success: true });
}
