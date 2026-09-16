import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { validateRolePayload } from "@/lib/validation";
import { logAudit } from "@/lib/audit";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.roleName !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const roles = await prisma.role.findMany({
      orderBy: { name: "asc" },
      include: {
        _count: {
          select: {
            users: {
              where: { deleted_at: null },
            },
          },
        },
      },
    });

    const enriched = roles.map((r) => {
      const { _count, ...roleData } = r;
      return {
        ...roleData,
        user_count: _count.users,
      };
    });

    return NextResponse.json({ roles: enriched });
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
  const { valid, errors } = validateRolePayload(body);
  if (!valid) {
    return NextResponse.json({ error: errors.join(" ") }, { status: 400 });
  }

  try {
    const existing = await prisma.role.findFirst({
      where: { name: body.name },
      select: { id: true },
    });

    if (existing) {
      return NextResponse.json(
        { error: "A role with this name already exists." },
        { status: 409 },
      );
    }

    const data = await prisma.role.create({
      data: {
        name: body.name,
        description: body.description || null,
      },
    });

    await logAudit({
      actorId: session.user.id,
      actorEmail: session.user.email,
      action: "role.create",
      entityType: "role",
      entityId: data.id,
      afterData: data,
    });

    return NextResponse.json({ role: data });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
