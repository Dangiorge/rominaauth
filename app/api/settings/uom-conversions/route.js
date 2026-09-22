// path: app/api/settings/uom-conversions/route.js

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
  const conversions = await prisma.uomConversion.findMany({
    include: {
      fromUom: { select: { code: true } },
      toUom: { select: { code: true } },
    },
    orderBy: { id: "asc" },
  });
  const mapped = conversions.map((c) => ({
    ...c,
    from_uom: c.fromUom,
    to_uom: c.toUom,
  }));
  return NextResponse.json({ conversions: mapped });
}

export async function POST(req) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.roleName !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await req.json();
  if (!body.from_uom_id || !body.to_uom_id || !body.conversion_factor) {
    return NextResponse.json(
      { error: "From unit, to unit, and factor are required." },
      { status: 400 },
    );
  }
  if (body.from_uom_id === body.to_uom_id) {
    return NextResponse.json(
      { error: "From and to units must be different." },
      { status: 400 },
    );
  }
  if (Number(body.conversion_factor) <= 0) {
    return NextResponse.json(
      { error: "Conversion factor must be positive." },
      { status: 400 },
    );
  }

  const existing = await prisma.uomConversion.findFirst({
    where: { from_uom_id: body.from_uom_id, to_uom_id: body.to_uom_id },
  });
  if (existing)
    return NextResponse.json(
      { error: "This conversion already exists." },
      { status: 409 },
    );

  const conversion = await prisma.uomConversion.create({
    data: {
      from_uom_id: body.from_uom_id,
      to_uom_id: body.to_uom_id,
      conversion_factor: body.conversion_factor,
    },
  });

  await logAudit({
    actorId: session.user.id,
    actorEmail: session.user.email,
    action: "uom_conversion.create",
    entityType: "uom_conversion",
    entityId: conversion.id,
    afterData: conversion,
  });
  return NextResponse.json({ conversion });
}
