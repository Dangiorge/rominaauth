// path: app/api/system/departments/[departmentId]/route.js

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { logAudit } from "@/lib/audit";

export async function PUT(req, { params }) {
  const { departmentId } = await params;
  const session = await getServerSession(authOptions);
  if (!session || session.user.roleName !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await req.json();
  const { data: before } = await supabaseAdmin
    .from("departments")
    .select("*")
    .eq("id", departmentId)
    .single();
  if (!before)
    return NextResponse.json(
      { error: "Department not found." },
      { status: 404 },
    );

  const { data, error } = await supabaseAdmin
    .from("departments")
    .update({ name: body.name, code: body.code, is_active: body.is_active })
    .eq("id", departmentId)
    .select()
    .single();

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  await logAudit({
    actorId: session.user.id,
    actorEmail: session.user.email,
    action: "department.update",
    entityType: "department",
    entityId: departmentId,
    beforeData: before,
    afterData: data,
  });
  return NextResponse.json({ department: data });
}

export async function DELETE(req, { params }) {
  const { departmentId } = await params;
  const session = await getServerSession(authOptions);
  if (!session || session.user.roleName !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { count } = await supabaseAdmin
    .from("users")
    .select("id", { count: "exact", head: true })
    .eq("department_id", departmentId)
    .is("deleted_at", null);

  if (count > 0) {
    return NextResponse.json(
      { error: `Cannot delete: ${count} user(s) belong to this department.` },
      { status: 409 },
    );
  }

  const { error } = await supabaseAdmin
    .from("departments")
    .delete()
    .eq("id", departmentId);
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  await logAudit({
    actorId: session.user.id,
    actorEmail: session.user.email,
    action: "department.delete",
    entityType: "department",
    entityId: departmentId,
  });
  return NextResponse.json({ success: true });
}
