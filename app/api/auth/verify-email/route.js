// path: app/api/auth/verify-email/route.js

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { consumeAuthToken } from "@/lib/tokens";

export async function POST(req) {
  const { token } = await req.json();
  if (!token)
    return NextResponse.json({ error: "Token is required." }, { status: 400 });

  let userId;
  try {
    userId = await consumeAuthToken(token, "email_verify");
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: userId },
    data: { email_verified_at: new Date() },
  });
  return NextResponse.json({ success: true });
}
