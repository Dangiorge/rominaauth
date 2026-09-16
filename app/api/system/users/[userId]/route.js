import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { validateUserPayload, validatePassword } from "@/lib/validation";
import { canRemoveUser } from "@/lib/guards";
import { logAudit } from "@/lib/audit";
import bcrypt from "bcryptjs";

export async function GET(req, { params }) {
  const { userId } = await params;
  const session = await getServerSession(authOptions);
  if (!session || session.user.roleName !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const data = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        full_name: true,
        phone: true,
        employee_id: true,
        address: true,
        city: true,
        country: true,
        date_of_birth: true,
        gender: true,
        department: true,
        job_title: true,
        hire_date: true,
        avatar_url: true,
        status: true,
        is_active: true,
        must_change_password: true,
        last_login_at: true,
        created_at: true,
        updated_at: true,
        role_id: true,
        roles: {
          select: { id: true, name: true },
        },
      },
    });

    if (!data) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    return NextResponse.json({
      user: { ...data, role_name: data.roles?.name },
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req, { params }) {
  const { userId } = await params;
  const session = await getServerSession(authOptions);
  if (!session || session.user.roleName !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { valid, errors } = validateUserPayload(body, { isUpdate: true });
  if (!valid) {
    return NextResponse.json({ error: errors.join(" ") }, { status: 400 });
  }

  try {
    const before = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!before) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    if (body.email && body.email !== before.email) {
      const dup = await prisma.user.findFirst({
        where: {
          email: body.email,
          NOT: { id: userId },
        },
        select: { id: true },
      });

      if (dup) {
        return NextResponse.json(
          { error: "Another user already uses this email." },
          { status: 409 },
        );
      }
    }

    const isDeactivating =
      body.is_active === false && before.is_active === true;
    const isRoleChange = body.role_id && body.role_id !== before.role_id;
    if (isDeactivating || isRoleChange) {
      const guard = await canRemoveUser(userId, session.user.id);
      if (!guard.allowed) {
        return NextResponse.json({ error: guard.reason }, { status: 409 });
      }
    }

    const updatePayload = {
      ...("email" in body && { email: body.email }),
      ...("full_name" in body && { full_name: body.full_name }),
      ...("phone" in body && { phone: body.phone }),
      ...("employee_id" in body && { employee_id: body.employee_id }),
      ...("address" in body && { address: body.address }),
      ...("city" in body && { city: body.city }),
      ...("country" in body && { country: body.country }),
      ...("date_of_birth" in body && {
        date_of_birth: body.date_of_birth ? new Date(body.date_of_birth) : null,
      }),
      ...("gender" in body && { gender: body.gender }),
      ...("department" in body && { department: body.department }),
      ...("job_title" in body && { job_title: body.job_title }),
      ...("hire_date" in body && {
        hire_date: body.hire_date ? new Date(body.hire_date) : null,
      }),
      ...("role_id" in body && { role_id: body.role_id }),
      ...("is_active" in body && {
        is_active: body.is_active,
        status: body.is_active ? "active" : "suspended",
      }),
      updated_by: session.user.id,
      updated_at: new Date(),
    };

    if (body.new_password) {
      const pw = validatePassword(body.new_password);
      if (!pw.valid) {
        return NextResponse.json(
          { error: pw.errors.join(" ") },
          { status: 400 },
        );
      }
      updatePayload.password_hash = await bcrypt.hash(body.new_password, 10);
      updatePayload.must_change_password = true;
    }

    const data = await prisma.user.update({
      where: { id: userId },
      data: updatePayload,
      select: { id: true, email: true, full_name: true },
    });

    await logAudit({
      actorId: session.user.id,
      actorEmail: session.user.email,
      action: "user.update",
      entityType: "user",
      entityId: userId,
      beforeData: before,
      afterData: updatePayload,
    });

    return NextResponse.json({ user: data });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  const { userId } = await params;
  const session = await getServerSession(authOptions);
  if (!session || session.user.roleName !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const hard = searchParams.get("hard") === "true";

  try {
    const guard = await canRemoveUser(userId, session.user.id);
    if (!guard.allowed) {
      return NextResponse.json({ error: guard.reason }, { status: 409 });
    }

    if (hard) {
      await prisma.user.delete({
        where: { id: userId },
      });
    } else {
      await prisma.user.update({
        where: { id: userId },
        data: {
          deleted_at: new Date(),
          is_active: false,
          status: "archived",
          updated_at: new Date(),
        },
      });
    }

    await logAudit({
      actorId: session.user.id,
      actorEmail: session.user.email,
      action: hard ? "user.hard_delete" : "user.soft_delete",
      entityType: "user",
      entityId: userId,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
