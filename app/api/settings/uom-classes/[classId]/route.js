// path: app/api/settings/uom-classes/[classId]/route.js

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { canDeleteUomClass } from "@/lib/itemGuards";
import { logAudit } from "@/lib/audit";

export async function DELETE(req, { params }) {
  const { classId } = await params;
  const session = await getServerSession(authOptions);
  if (!session || session.user.roleName !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const guard = await canDeleteUomClass(classId);
  if (!guard.allowed)
    return NextResponse.json({ error: guard.reason }, { status: 409 });

  const { error } = await supabaseAdmin
    .from("uom_classes")
    .delete()
    .eq("id", classId);
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  await logAudit({
    actorId: session.user.id,
    actorEmail: session.user.email,
    action: "uom_class.delete",
    entityType: "uom_class",
    entityId: classId,
  });
  return NextResponse.json({ success: true });
}
