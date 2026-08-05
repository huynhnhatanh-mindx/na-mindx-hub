import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json().catch(() => ({}));
    const teacherName = body.teacherName;

    let query = supabase
      .from("submissions")
      .select("*")
      .eq("is_pending_drive_sync", true);

    if (teacherName) {
      query = query.eq("teacher", teacherName);
    }

    const { data: pendingSubs, error: fetchErr } = await query;
    if (fetchErr) {
      return NextResponse.json({ error: fetchErr.message }, { status: 500 });
    }

    if (!pendingSubs || pendingSubs.length === 0) {
      return NextResponse.json({ message: "Không có bài nộp nào đang chờ đẩy về Google Drive.", syncedCount: 0 });
    }

    let syncedCount = 0;
    const errors: string[] = [];

    for (const sub of pendingSubs) {
      try {
        // Fetch teacher google_refresh_token
        const { data: profile } = await supabase
          .from("profiles")
          .select("google_refresh_token")
          .or(`display_name.eq.${sub.teacher},username.eq.${sub.teacher},email.eq.${sub.teacher}`)
          .maybeSingle();

        if (!profile || !profile.google_refresh_token) {
          errors.push(`Giáo viên ${sub.teacher} chưa kết nối Google OAuth.`);
          continue;
        }

        // Token exchange
        const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            client_id: process.env.GOOGLE_CLIENT_ID || "",
            client_secret: process.env.GOOGLE_CLIENT_SECRET || "",
            refresh_token: profile.google_refresh_token,
            grant_type: "refresh_token",
          }),
        });

        const tokenData = await tokenRes.json();
        if (!tokenRes.ok || !tokenData.access_token) {
          errors.push(`Ủy quyền Google Drive của Giáo viên ${sub.teacher} đã hết hạn.`);
          continue;
        }

        const accessToken = tokenData.access_token;
        const driveHeaders = { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" };

        // Helper to search folder
        const searchFolder = async (name: string, parentId?: string) => {
          let q = `mimeType = 'application/vnd.google-apps.folder' and name = '${name}' and trashed = false`;
          if (parentId) q += ` and '${parentId}' in parents`;
          const res = await fetch(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}`, { headers: driveHeaders });
          if (res.ok) {
            const d = await res.json();
            return d.files && d.files.length > 0 ? d.files[0] : null;
          }
          return null;
        };

        const createFolder = async (name: string, parentId?: string) => {
          const b: any = { name, mimeType: "application/vnd.google-apps.folder" };
          if (parentId) b.parents = [parentId];
          const res = await fetch("https://www.googleapis.com/drive/v3/files", {
            method: "POST",
            headers: driveHeaders,
            body: JSON.stringify(b),
          });
          return await res.json();
        };

        // Root Folder
        let rootFolder = await searchFolder("MindX Hub");
        if (!rootFolder) {
          const oldRoot = await searchFolder("NA MindX Hub");
          if (oldRoot) {
            const ren = await fetch(`https://www.googleapis.com/drive/v3/files/${oldRoot.id}`, {
              method: "PATCH",
              headers: driveHeaders,
              body: JSON.stringify({ name: "MindX Hub" }),
            });
            rootFolder = ren.ok ? await ren.json() : oldRoot;
          } else {
            rootFolder = await createFolder("MindX Hub");
          }
        }

        // Class Folder
        let classFolder = await searchFolder(sub.class_name, rootFolder.id);
        if (!classFolder) classFolder = await createFolder(sub.class_name, rootFolder.id);

        // Stage Folder
        let stageFolder = await searchFolder(sub.stage, classFolder.id);
        if (!stageFolder) stageFolder = await createFolder(sub.stage, classFolder.id);

        let newDriveUrl = sub.file_url;

        // If file in Supabase Storage, download and upload to Drive
        if (sub.supabase_storage_path) {
          const { data: fileData, error: dlErr } = await supabase.storage
            .from("submissions-backup")
            .download(sub.supabase_storage_path);

          if (dlErr || !fileData) {
            errors.push(`Không thể tải tệp tạm từ Supabase cho bài nộp ${sub.id}`);
            continue;
          }

          const fileBuffer = await fileData.arrayBuffer();
          const metadata = { name: sub.file_name, parents: [stageFolder.id] };

          const form = new FormData();
          form.append("metadata", new Blob([JSON.stringify(metadata)], { type: "application/json" }));
          form.append("file", new Blob([fileBuffer], { type: fileData.type || "application/octet-stream" }));

          const uploadRes = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink", {
            method: "POST",
            headers: { Authorization: `Bearer ${accessToken}` },
            body: form,
          });

          const driveFile = await uploadRes.json();
          if (!uploadRes.ok) {
            errors.push(`Google Drive vẫn báo lỗi khi tải tệp ${sub.file_name}: ${driveFile.error?.message || "Thất bại"}`);
            continue;
          }

          newDriveUrl = driveFile.webViewLink || `https://drive.google.com/file/d/${driveFile.id}/view`;

          // Remove temp file from Supabase storage
          await supabase.storage.from("submissions-backup").remove([sub.supabase_storage_path]);
        } else if (sub.file_url && sub.file_url.startsWith("http")) {
          // Shortcut URL link case
          const metadata = { name: `${sub.file_name}.url`, parents: [stageFolder.id] };
          const linkContent = `[InternetShortcut]\nURL=${sub.file_url}`;
          const form = new FormData();
          form.append("metadata", new Blob([JSON.stringify(metadata)], { type: "application/json" }));
          form.append("file", new Blob([linkContent], { type: "text/plain" }));

          await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink", {
            method: "POST",
            headers: { Authorization: `Bearer ${accessToken}` },
            body: form,
          });
        }

        // Update DB
        await supabase
          .from("submissions")
          .update({
            storage_provider: "google_drive",
            is_pending_drive_sync: false,
            file_url: newDriveUrl,
            supabase_storage_path: null,
          })
          .eq("id", sub.id);

        syncedCount++;
      } catch (subErr: any) {
        errors.push(`Lỗi xử lý bài nộp ID ${sub.id}: ${subErr.message}`);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Đã đẩy thành công ${syncedCount} bài nộp về Google Drive!`,
      syncedCount,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
