// path: app/api/system/users/route.js

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { validateUserPayload } from "@/lib/validation";
import { logAudit } from "@/lib/audit";
import bcrypt from "bcryptjs";

export async function GET(req) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.roleName !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const includeDeleted = searchParams.get("includeDeleted") === "true";

  let query = supabaseAdmin
    .from("users")
    .select(
      `
      id, email, full_name, phone, employee_id, department, job_title,
      status, is_active, last_login_at, created_at, deleted_at,
      role_id, roles ( id, name )
    `,
    )
    .order("created_at", { ascending: false });

  if (!includeDeleted) query = query.is("deleted_at", null);

  const { data, error } = await query;
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  const users = data.map((u) => ({ ...u, role_name: u.roles?.name }));
  return NextResponse.json({ users });
}

export async function POST(req) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.roleName !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { valid, errors } = validateUserPayload(body);
  if (!valid)
    return NextResponse.json({ error: errors.join(" ") }, { status: 400 });

  // Enforce unique email explicitly (clearer error than a raw DB constraint failure)
  const { data: existing } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("email", body.email)
    .maybeSingle();

  if (existing) {
    return NextResponse.json(
      { error: "A user with this email already exists." },
      { status: 409 },
    );
  }

  const password_hash = await bcrypt.hash(body.password, 10);

  const { data, error } = await supabaseAdmin
    .from("users")
    .insert({
      email: body.email,
      password_hash,
      full_name: body.full_name,
      phone: body.phone || null,
      employee_id: body.employee_id || null,
      address: body.address || null,
      city: body.city || null,
      country: body.country || null,
      date_of_birth: body.date_of_birth || null,
      gender: body.gender || null,
      department: body.department || null,
      job_title: body.job_title || null,
      hire_date: body.hire_date || null,
      role_id: body.role_id,
      status: "active",
      is_active: true,
      must_change_password: body.must_change_password ?? true,
      created_by: session.user.id,
    })
    .select("id, email, full_name")
    .single();

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  await logAudit({
    actorId: session.user.id,
    actorEmail: session.user.email,
    action: "user.create",
    entityType: "user",
    entityId: data.id,
    afterData: { email: data.email, full_name: data.full_name },
  });

  return NextResponse.json({ user: data });
}
