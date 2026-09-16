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

  try {
    const data = await prisma.brand.findMany({
      orderBy: { name: "asc" },
      include: {
        companies: {
          select: {
            id: true,
            name: true,
            primary_color: true,
            secondary_color: true,
            accent_color: true,
            logo_url: true,
          },
        },
      },
    });

    return NextResponse.json({ brands: data });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.roleName !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  if (!body.name || !body.slug || !body.company_id) {
    return NextResponse.json(
      { error: "Name, slug, and company are required." },
      { status: 400 },
    );
  }

  try {
    const existing = await prisma.brand.findFirst({
      where: { slug: body.slug },
      select: { id: true },
    });

    if (existing) {
      return NextResponse.json(
        { error: "A brand with this slug already exists." },
        { status: 409 },
      );
    }

    const data = await prisma.brand.create({
      data: {
        name: body.name,
        slug: body.slug,
        company_id: body.company_id,
        email: body.email || null,
        phone: body.phone || null,
        address_line1: body.address_line1 || null,
        address_line2: body.address_line2 || null,
        city: body.city || null,
        region: body.region || null,
        country: body.country || null,
        postal_code: body.postal_code || null,
        uses_custom_theme: body.uses_custom_theme || false,
        primary_color: body.uses_custom_theme ? body.primary_color : null,
        secondary_color: body.uses_custom_theme ? body.secondary_color : null,
        accent_color: body.uses_custom_theme ? body.accent_color : null,
      },
    });

    await logAudit({
      actorId: session.user.id,
      actorEmail: session.user.email,
      action: "brand.create",
      entityType: "brand",
      entityId: data.id,
      afterData: data,
    });

    return NextResponse.json({ brand: data });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
