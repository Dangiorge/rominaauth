// path: app/api/system/branches/[branchId]/route.js

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { logAudit } from "@/lib/audit";

// path: app/api/system/branches/[branchId]/route.js (replace the PUT function)

export async function PUT(req, { params }) {
  const { branchId } = await params;
  const session = await getServerSession(authOptions);
  if (!session || session.user.roleName !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await req.json();
  const { data: before } = await supabaseAdmin
    .from("branches")
    .select("*")
    .eq("id", branchId)
    .single();
  if (!before)
    return NextResponse.json({ error: "Branch not found." }, { status: 404 });

  const { data, error } = await supabaseAdmin
    .from("branches")
    .update({
      name: body.name,
      code: body.code,
      city: body.city,
      brand_id: body.brand_id,
      is_active: body.is_active,
      email: body.email || null,
      phone: body.phone || null,
      address_line1: body.address_line1 || null,
      address_line2: body.address_line2 || null,
      region: body.region || null,
      country: body.country || null,
      postal_code: body.postal_code || null,
      manager_name: body.manager_name || null,
      latitude: body.latitude || null,
      longitude: body.longitude || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", branchId)
    .select()
    .single();

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  await logAudit({
    actorId: session.user.id,
    actorEmail: session.user.email,
    action: "branch.update",
    entityType: "branch",
    entityId: branchId,
    beforeData: before,
    afterData: data,
  });
  return NextResponse.json({ branch: data });
}

export async function DELETE(req, { params }) {
  const { branchId } = await params;
  const session = await getServerSession(authOptions);
  if (!session || session.user.roleName !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { count } = await supabaseAdmin
    .from("user_branches")
    .select("user_id", { count: "exact", head: true })
    .eq("branch_id", branchId);

  if (count > 0) {
    return NextResponse.json(
      {
        error: `Cannot delete: ${count} user(s) are scoped to this branch. Reassign them first.`,
      },
      { status: 409 },
    );
  }

  const { error } = await supabaseAdmin
    .from("branches")
    .delete()
    .eq("id", branchId);
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  await logAudit({
    actorId: session.user.id,
    actorEmail: session.user.email,
    action: "branch.delete",
    entityType: "branch",
    entityId: branchId,
  });
  return NextResponse.json({ success: true });
}
