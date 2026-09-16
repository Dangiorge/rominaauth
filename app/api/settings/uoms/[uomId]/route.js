// path: app/api/settings/uoms/[uomId]/route.js

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { canDeleteUom } from "@/lib/itemGuards";
import { logAudit } from "@/lib/audit";

export async function DELETE(req, { params }) {
  const { uomId } = await params;
  const session = await getServerSession(authOptions);
  if (!session || session.user.roleName !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const guard = await canDeleteUom(uomId);
  if (!guard.allowed)
    return NextResponse.json({ error: guard.reason }, { status: 409 });

  const { error } = await supabaseAdmin.from("uoms").delete().eq("id", uomId);
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  await logAudit({
    actorId: session.user.id,
    actorEmail: session.user.email,
    action: "uom.delete",
    entityType: "uom",
    entityId: uomId,
  });
  return NextResponse.json({ success: true });
}
