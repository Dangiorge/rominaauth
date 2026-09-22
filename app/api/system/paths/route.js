// path: app/api/system/paths/route.js

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { validatePathPayload } from "@/lib/validation";
import { logAudit } from "@/lib/audit";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.roleName !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const paths = await prisma.registeredPath.findMany({
    orderBy: [{ category: "asc" }, { label: "asc" }],
  });
  return NextResponse.json({ paths });
}

export async function POST(req) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.roleName !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { valid, errors } = validatePathPayload(body);
  if (!valid)
    return NextResponse.json({ error: errors.join(" ") }, { status: 400 });

  const existing = await prisma.registeredPath.findUnique({
    where: { path: body.path },
  });
  if (existing)
    return NextResponse.json(
      { error: "This path is already registered." },
      { status: 409 },
    );

  const path = await prisma.registeredPath.create({
    data: {
      path: body.path,
      label: body.label,
      icon: body.icon || null,
      category: body.category || null,
      module: body.module || null,
      parent_id: body.parent_id || null,
      is_sidebar_visible: body.is_sidebar_visible ?? true,
      is_active: true,
    },
  });

  await logAudit({
    actorId: session.user.id,
    actorEmail: session.user.email,
    action: "path.create",
    entityType: "path",
    entityId: path.id,
    afterData: path,
  });
  return NextResponse.json({ path });
}
