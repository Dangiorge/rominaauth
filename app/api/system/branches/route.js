// path: app/api/system/branches/route.js

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.roleName !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const branches = await prisma.branch.findMany({
    include: {
      brand: {
        select: {
          id: true,
          name: true,
          company_id: true,
          company: { select: { id: true, name: true } },
        },
      },
    },
    orderBy: { name: "asc" },
  });
  return NextResponse.json({ branches });
}

export async function POST(req) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.roleName !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await req.json();
  if (!body.name || !body.code || !body.brand_id) {
    return NextResponse.json(
      { error: "Name, code, and brand are required." },
      { status: 400 },
    );
  }
  const existing = await prisma.branch.findUnique({
    where: { code: body.code },
  });
  if (existing)
    return NextResponse.json(
      { error: "A branch with this code already exists." },
      { status: 409 },
    );

  const branch = await prisma.branch.create({
    data: {
      name: body.name,
      code: body.code,
      city: body.city || null,
      brand_id: body.brand_id,
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
    },
  });

  await logAudit({
    actorId: session.user.id,
    actorEmail: session.user.email,
    action: "branch.create",
    entityType: "branch",
    entityId: branch.id,
    afterData: branch,
  });
  return NextResponse.json({ branch });
}
