// path: app/api/documents/categories/route.js

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const company_id = searchParams.get("company_id");

  try {
    const categories = await prisma.documentCategory.findMany({
      where: {
        ...(company_id ? { company_id: parseInt(company_id) } : {}),
        is_active: true,
      },
      include: {
        subcategories: {
          where: { is_active: true },
        },
      },
    });

    return NextResponse.json({ categories }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { company_id, name, code, description } = body;

    const category = await prisma.documentCategory.create({
      data: {
        company_id: parseInt(company_id),
        name,
        code,
        description,
      },
    });

    return NextResponse.json({ category }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
