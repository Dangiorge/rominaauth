// path: app/api/inventory/items/upload-image/route.js

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.roleName !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Temporary stub: Storage is not configured yet.
  // This prevents build errors and safely handles requests until you implement it later.
  return NextResponse.json(
    {
      imageUrl: "",
      message: "Image upload is temporarily disabled.",
    },
    { status: 200 },
  );
}
