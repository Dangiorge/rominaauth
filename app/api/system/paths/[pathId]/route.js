import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { validatePathPayload } from "@/lib/validation";
import { canDeletePath } from "@/lib/guards";
import { logAudit } from "@/lib/audit";

export async function PUT(req, { params }) {
  const { pathId } = await params;

  const session = await getServerSession(authOptions);
  if (!session || session.user.roleName !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { valid, errors } = validatePathPayload(body);
  if (!valid)
    return NextResponse.json({ error: errors.join(" ") }, { status: 400 });

  try {
    const before = await prisma.registeredPath.findUnique({
      where: { id: pathId },
    });
    if (!before)
      return NextResponse.json({ error: "Path not found." }, { status: 404 });

    const data = await prisma.registeredPath.update({
      where: { id: pathId },
      data: {
        path: body.path,
        label: body.label,
        icon: body.icon || null,
        category: body.category || null,
        module: body.module || null,
        parent_id: body.parent_id || null,
        is_sidebar_visible: body.is_sidebar_visible ?? true,
        is_active: body.is_active ?? true,
        updated_at: new Date(),
      },
    });

    await logAudit({
      actorId: session.user.id,
      actorEmail: session.user.email,
      action: "path.update",
      entityType: "path",
      entityId: pathId,
      beforeData: before,
      afterData: data,
    });

    return NextResponse.json({ path: data });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  const { pathId } = await params;

  const session = await getServerSession(authOptions);
  if (!session || session.user.roleName !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const guard = await canDeletePath(pathId);
    if (!guard.allowed)
      return NextResponse.json({ error: guard.reason }, { status: 409 });

    await prisma.registeredPath.delete({
      where: { id: pathId },
    });

    await logAudit({
      actorId: session.user.id,
      actorEmail: session.user.email,
      action: "path.delete",
      entityType: "path",
      entityId: pathId,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
