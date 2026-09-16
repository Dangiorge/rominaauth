// path: app/api/account/profile/route.js

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      email: true,
      full_name: true,
      phone: true,
      address: true,
      city: true,
      country: true,
      date_of_birth: true,
      gender: true,
      job_title: true,
      department_id: true,
      email_verified_at: true,
      department_ref: { select: { name: true } },
    },
  });

  if (!user) return NextResponse.json({ error: "Not found." }, { status: 404 });
  return NextResponse.json({ profile: user });
}

export async function PUT(req) {
  const session = await getServerSession(authOptions);
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();

  const updatePayload = {
    ...("full_name" in body && { full_name: body.full_name }),
    ...("phone" in body && { phone: body.phone }),
    ...("address" in body && { address: body.address }),
    ...("city" in body && { city: body.city }),
    ...("country" in body && { country: body.country }),
    ...("date_of_birth" in body && {
      date_of_birth: body.date_of_birth ? new Date(body.date_of_birth) : null,
    }),
    ...("gender" in body && { gender: body.gender }),
    updated_at: new Date(),
  };

  await prisma.user.update({
    where: { id: session.user.id },
    data: updatePayload,
  });
  return NextResponse.json({ success: true });
}
