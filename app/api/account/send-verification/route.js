// path: app/api/account/send-verification/route.js

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createAuthToken } from "@/lib/tokens";
import { sendVerificationEmail } from "@/lib/email";

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user)
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  if (user.email_verified_at)
    return NextResponse.json(
      { error: "Email is already verified." },
      { status: 400 },
    );

  const token = await createAuthToken(user.id, "email_verify", 60);
  await sendVerificationEmail(user.email, user.full_name, token);

  return NextResponse.json({
    success: true,
    message: "Verification email sent.",
  });
}
