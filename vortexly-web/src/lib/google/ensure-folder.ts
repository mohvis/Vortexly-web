/**
 * Ensures a "Vortexly PinEditor" folder exists in the user's Google Drive.
 * Returns the folder ID (creates it on first call, reuses on subsequent calls).
 */
export async function ensureDriveFolder(accessToken: string, cachedFolderId?: string | null): Promise<string> {
  // If we already have a folder ID, verify it still exists
  if (cachedFolderId) {
    const check = await fetch(
      `https://www.googleapis.com/drive/v3/files/${cachedFolderId}?fields=id,trashed`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    if (check.ok) {
      const data = await check.json() as { id: string; trashed?: boolean };
      if (!data.trashed) return data.id;
    }
    // Folder was deleted or inaccessible — fall through to create a new one
  }

  // Search for existing folder by name (in case it was created in a previous session)
  const search = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(
      "name='Vortexly PinEditor' and mimeType='application/vnd.google-apps.folder' and trashed=false"
    )}&fields=files(id,name)&spaces=drive`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );

  if (search.ok) {
    const data = await search.json() as { files: { id: string; name: string }[] };
    if (data.files.length > 0) return data.files[0].id;
  }

  // Create the folder
  const create = await fetch("https://www.googleapis.com/drive/v3/files", {
    method: "POST",
    headers: {
      Authorization:  `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name:     "Vortexly PinEditor",
      mimeType: "application/vnd.google-apps.folder",
    }),
  });

  if (!create.ok) {
    const body = await create.text();
    throw new Error(`Failed to create Drive folder (${create.status}): ${body}`);
  }

  const folder = await create.json() as { id: string };
  return folder.id;
}
