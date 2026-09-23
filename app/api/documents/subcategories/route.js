// path: app/api/documents/subcategories/route.js

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { category_id, name, code, description } = body;

    const subcategory = await prisma.documentSubCategory.create({
      data: {
        category_id: parseInt(category_id),
        name,
        code,
        description,
      },
    });

    return NextResponse.json({ subcategory }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
