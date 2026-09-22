// path: app/api/settings/google-drive/test/route.js

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { testDriveConnection } from "@/lib/googleDrive";

function draftFromRequest(body, savedConfig) {
  const clientEmail = body.client_email?.trim();
  const projectId = body.project_id?.trim();
  const privateKey = body.private_key?.trim();

  if (!clientEmail || !projectId || (!privateKey && !savedConfig?.private_key)) {
    throw new Error(
      "Enter a service-account email, project ID, and private key before testing.",
    );
  }

  return {
    client_email: clientEmail,
    project_id: projectId,
    shared_drive_id: body.shared_drive_id?.trim() || null,
    private_key: privateKey || savedConfig.private_key,
    privateKeyIsPlaintext: Boolean(privateKey),
  };
}

export async function POST(req) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.roleName !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const savedConfig = await prisma.googleDriveConfig.findFirst({
    orderBy: { id: "desc" },
  });
  try {
    const body = await req.json().catch(() => ({}));
    const useSavedConfig = body.use_saved_config === true;

    if (useSavedConfig && !savedConfig) {
      return NextResponse.json(
        { success: false, message: "No saved configuration is available yet." },
        { status: 400 },
      );
    }

    const config = useSavedConfig
      ? savedConfig
      : draftFromRequest(body, savedConfig);
    const result = await testDriveConnection(config);

    // A draft test deliberately leaves the database untouched. Only a test of
    // the saved record becomes its recorded connection health.
    if (useSavedConfig) {
      await prisma.googleDriveConfig.update({
        where: { id: savedConfig.id },
        data: {
          last_tested_at: new Date(),
          last_test_success: result.success,
          last_test_error: result.success ? null : result.message,
        },
      });
    }

    return NextResponse.json({ ...result, tested_saved_config: useSavedConfig });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error.message || "Unable to test Google Drive." },
      { status: 400 },
    );
  }
}
