// path: app/api/settings/google-drive/route.js

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { encrypt } from "@/lib/crypto";
import { extractDriveId } from "@/lib/googleDrive";
import { logAudit } from "@/lib/audit";

function readConfigInput(body, existing) {
  const clientEmail = body.client_email?.trim();
  const projectId = body.project_id?.trim();
  const privateKey = body.private_key?.trim();

  if (!clientEmail || !projectId || (!privateKey && !existing?.private_key)) {
    throw new Error(
      "Client email, project ID, and a private key are required for a new configuration.",
    );
  }

  return {
    client_email: clientEmail,
    project_id: projectId,
    private_key: privateKey ? encrypt(privateKey) : existing.private_key,
    shared_drive_id: extractDriveId(body.shared_drive_id?.trim()) || null,
  };
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.roleName !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const config = await prisma.googleDriveConfig.findFirst({
    orderBy: { id: "desc" },
  });
  if (!config) return NextResponse.json({ config: null });

  const { private_key, ...safe } = config;
  return NextResponse.json({
    config: { ...safe, has_private_key: !!private_key },
  });
}

export async function POST(req) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.roleName !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const existing = await prisma.googleDriveConfig.findFirst({
      orderBy: { id: "desc" },
    });
    const data = readConfigInput(body, existing);

    const config = existing
      ? await prisma.googleDriveConfig.update({
          where: { id: existing.id },
          data: { ...data, updated_at: new Date() },
        })
      : await prisma.googleDriveConfig.create({
          data: { ...data, created_by: session.user.id },
        });

    await logAudit({
      actorId: session.user.id,
      actorEmail: session.user.email,
      action: existing
        ? "google_drive_config.update"
        : "google_drive_config.create",
      entityType: "google_drive_config",
      entityId: config.id,
      afterData: {
        client_email: data.client_email,
        project_id: data.project_id,
        shared_drive_id: data.shared_drive_id,
      },
    });

    const { private_key, ...safe } = config;
    return NextResponse.json({ config: { ...safe, has_private_key: true } });
  } catch (error) {
    console.error("Unable to save Google Drive configuration:", error);
    return NextResponse.json(
      { error: error.message || "Unable to save Google Drive configuration." },
      { status: 400 },
    );
  }
}
