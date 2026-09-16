import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canDeleteTaxClass } from "@/lib/itemGuards";
import { logAudit } from "@/lib/audit";

export async function PUT(req, { params }) {
  try {
    const { taxId } = await params;
    const session = await getServerSession(authOptions);
    if (!session || session.user.roleName !== "super_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { name, code, rate, is_inclusive, is_taxable, is_active } = body;

    const before = await prisma.taxClass.findUnique({
      where: { id: taxId },
    });

    if (!before || before.deleted_at !== null) {
      return NextResponse.json(
        { error: "Tax class not found." },
        { status: 404 },
      );
    }

    if (code && code.trim() !== before.code) {
      const dup = await prisma.taxClass.findFirst({
        where: {
          company_id: before.company_id,
          code: code.trim(),
          NOT: { id: taxId },
          deleted_at: null,
        },
        select: { id: true },
      });

      if (dup) {
        return NextResponse.json(
          { error: "Another tax class already uses this code." },
          { status: 409 },
        );
      }
    }

    let parsedRate = before.rate;
    if (rate !== undefined && rate !== null) {
      parsedRate = parseFloat(rate);
      if (isNaN(parsedRate) || parsedRate < 0) {
        return NextResponse.json(
          { error: "Tax rate must be a valid non-negative number." },
          { status: 400 },
        );
      }
    }

    const data = await prisma.taxClass.update({
      where: { id: taxId },
      data: {
        name: name ? name.trim() : before.name,
        code: code ? code.trim() : before.code,
        rate: parsedRate,
        is_inclusive:
          is_inclusive !== undefined ? is_inclusive : before.is_inclusive,
        is_taxable: is_taxable !== undefined ? is_taxable : before.is_taxable,
        is_active: is_active ?? true,
        updated_by: session.user.id,
        updated_at: new Date(),
      },
    });

    await logAudit({
      actorId: session.user.id,
      actorEmail: session.user.email,
      action: "tax_class.update",
      entityType: "tax_class",
      entityId: taxId,
      beforeData: before,
      afterData: data,
    });

    return NextResponse.json({ tax: data }, { status: 200 });
  } catch (error) {
    console.error("PUT /api/settings/taxes/[taxId] error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  try {
    const { taxId } = await params;
    const session = await getServerSession(authOptions);
    if (!session || session.user.roleName !== "super_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const guard = await canDeleteTaxClass(taxId);
    if (!guard.allowed) {
      return NextResponse.json({ error: guard.reason }, { status: 409 });
    }

    const data = await prisma.taxClass.update({
      where: { id: taxId },
      data: {
        deleted_at: new Date(),
        is_active: false,
        updated_by: session.user.id,
      },
    });

    await logAudit({
      actorId: session.user.id,
      actorEmail: session.user.email,
      action: "tax_class.delete",
      entityType: "tax_class",
      entityId: taxId,
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("DELETE /api/settings/taxes/[taxId] error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
