import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { validateUserPayload } from "@/lib/validation";
import { logAudit } from "@/lib/audit";
import bcrypt from "bcryptjs";

export async function GET(req) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.roleName !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const includeDeleted = searchParams.get("includeDeleted") === "true";

  try {
    const data = await prisma.user.findMany({
      where: includeDeleted ? {} : { deleted_at: null },
      select: {
        id: true,
        email: true,
        full_name: true,
        phone: true,
        employee_id: true,
        department: true,
        job_title: true,
        status: true,
        is_active: true,
        last_login_at: true,
        created_at: true,
        deleted_at: true,
        role_id: true,
        roles: {
          select: { id: true, name: true },
        },
      },
      orderBy: { created_at: "desc" },
    });

    const users = data.map((u) => ({ ...u, role_name: u.roles?.name }));
    return NextResponse.json({ users });
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
  const { valid, errors } = validateUserPayload(body);
  if (!valid) {
    return NextResponse.json({ error: errors.join(" ") }, { status: 400 });
  }

  try {
    const existing = await prisma.user.findUnique({
      where: { email: body.email },
      select: { id: true },
    });

    if (existing) {
      return NextResponse.json(
        { error: "A user with this email already exists." },
        { status: 409 },
      );
    }

    const password_hash = await bcrypt.hash(body.password, 10);

    const data = await prisma.user.create({
      data: {
        email: body.email,
        password_hash,
        full_name: body.full_name,
        phone: body.phone || null,
        employee_id: body.employee_id || null,
        address: body.address || null,
        city: body.city || null,
        country: body.country || null,
        date_of_birth: body.date_of_birth ? new Date(body.date_of_birth) : null,
        gender: body.gender || null,
        department: body.department || null,
        job_title: body.job_title || null,
        hire_date: body.hire_date ? new Date(body.hire_date) : null,
        role_id: body.role_id,
        status: "active",
        is_active: true,
        must_change_password: body.must_change_password ?? true,
        created_by: session.user.id,
      },
      select: { id: true, email: true, full_name: true },
    });

    await logAudit({
      actorId: session.user.id,
      actorEmail: session.user.email,
      action: "user.create",
      entityType: "user",
      entityId: data.id,
      afterData: { email: data.email, full_name: data.full_name },
    });

    return NextResponse.json({ user: data });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
