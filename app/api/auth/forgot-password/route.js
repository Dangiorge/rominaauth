// path: app/api/auth/forgot-password/route.js

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createAuthToken } from "@/lib/tokens";
import { sendPasswordResetEmail } from "@/lib/email";

export async function POST(req) {
  const { email } = await req.json();
  if (!email)
    return NextResponse.json({ error: "Email is required." }, { status: 400 });

  const user = await prisma.user.findFirst({
    where: { email, deleted_at: null },
  });

  if (user && user.is_active) {
    const token = await createAuthToken(user.id, "password_reset", 30);
    await sendPasswordResetEmail(user.email, user.full_name, token);
  }

  return NextResponse.json({
    success: true,
    message: "If that email exists, a reset link has been sent.",
  });
}
