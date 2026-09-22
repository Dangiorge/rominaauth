import { NextResponse } from "next/server";
import { drive } from "@/lib/google-drive";

export async function GET() {
  try {
    const response = await drive.files.list({
      pageSize: 5,
      fields: "files(id, name, mimeType)",
    });

    return NextResponse.json({
      success: true,
      message:
        "Successfully authenticated and connected to Google Drive via OAuth2!",
      filesFound: response.data.files,
    });
  } catch (error) {
    console.error("Google Drive Connection Error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 },
    );
  }
}
