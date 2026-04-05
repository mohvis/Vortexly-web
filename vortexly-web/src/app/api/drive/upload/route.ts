import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { refreshGoogleToken } from "@/lib/google/refresh-token";
import { ensureDriveFolder } from "@/lib/google/ensure-folder";

// POST /api/drive/upload
// Body: multipart/form-data  { file: Blob, filename: string }
// Returns: { driveFileId, driveUrl, fileName }
export async function POST(req: NextRequest) {
  try {
    // ── 1. Authenticate ──────────────────────────────────────────
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
    }

    // ── 2. Load Drive tokens ─────────────────────────────────────
    const { data: tokenRow, error: tokenErr } = await supabase
      .from("drive_tokens")
      .select("access_token, refresh_token, expires_at, folder_id")
      .eq("user_id", user.id)
      .single();

    if (tokenErr || !tokenRow) {
      return NextResponse.json(
        { error: "Drive not connected. Sign in with Google to enable Drive sync." },
        { status: 403 },
      );
    }

    // ── 3. Refresh token if expired ──────────────────────────────
    let { access_token: accessToken, folder_id: folderId } = tokenRow;
    const expired = tokenRow.expires_at
      ? new Date(tokenRow.expires_at) <= new Date(Date.now() + 30_000)
      : true;

    if (expired) {
      if (!tokenRow.refresh_token) {
        // Delete the stale row so /api/drive/status returns connected:false next time
        await supabase.from("drive_tokens").delete().eq("user_id", user.id);
        return NextResponse.json(
          { error: "Drive token expired. Please sign in again.", stale: true },
          { status: 403 },
        );
      }
      const refreshed = await refreshGoogleToken(tokenRow.refresh_token);
      accessToken = refreshed.accessToken;
      await supabase
        .from("drive_tokens")
        .update({ access_token: accessToken, expires_at: refreshed.expiresAt })
        .eq("user_id", user.id);
    }

    // ── 4. Ensure Vortexly folder exists ─────────────────────────
    const resolvedFolderId = await ensureDriveFolder(accessToken, folderId);
    if (resolvedFolderId !== folderId) {
      await supabase
        .from("drive_tokens")
        .update({ folder_id: resolvedFolderId })
        .eq("user_id", user.id);
    }

    // ── 5. Parse upload body ─────────────────────────────────────
    let fileBlob: Blob;
    let fileName: string;
    let mimeType: string;

    const contentType = req.headers.get("content-type") ?? "";
    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      const file = form.get("file");
      if (!file || typeof file === "string") {
        return NextResponse.json({ error: "Missing file field" }, { status: 400 });
      }
      fileBlob = file as File;
      fileName = form.get("filename") as string ?? (file as File).name;
      mimeType = (file as File).type || "image/png";
    } else {
      // Fallback: raw binary body with filename header
      const buf = await req.arrayBuffer();
      mimeType = contentType || "image/png";
      fileName = req.headers.get("x-filename") ?? `vortexly-pin-${Date.now()}.png`;
      fileBlob = new Blob([buf], { type: mimeType });
    }

    // ── 6. Upload to Google Drive (multipart) ────────────────────
    const metadata = JSON.stringify({
      name:    fileName,
      parents: [resolvedFolderId],
    });

    const boundary = "vortexly_boundary_" + Date.now();
    const multipart = [
      `--${boundary}`,
      "Content-Type: application/json; charset=UTF-8",
      "",
      metadata,
      `--${boundary}`,
      `Content-Type: ${mimeType}`,
      "",
    ].join("\r\n");

    const closing = `\r\n--${boundary}--`;

    const multipartBody = new Uint8Array([
      ...new TextEncoder().encode(multipart + "\r\n"),
      ...new Uint8Array(await fileBlob.arrayBuffer()),
      ...new TextEncoder().encode(closing),
    ]);

    const uploadRes = await fetch(
      "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink,name",
      {
        method:  "POST",
        headers: {
          Authorization:  `Bearer ${accessToken}`,
          "Content-Type": `multipart/related; boundary="${boundary}"`,
        },
        body: multipartBody,
      },
    );

    if (!uploadRes.ok) {
      const body = await uploadRes.text();
      console.error("[/api/drive/upload] Drive API error:", body);
      return NextResponse.json(
        { error: `Drive upload failed (${uploadRes.status})` },
        { status: 502 },
      );
    }

    const driveFile = await uploadRes.json() as { id: string; webViewLink: string; name: string };

    return NextResponse.json({
      driveFileId: driveFile.id,
      driveUrl:    driveFile.webViewLink,
      fileName:    driveFile.name,
    });
  } catch (err) {
    console.error("[/api/drive/upload]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
