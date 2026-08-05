import { createClient } from "@/lib/supabase/server";

export async function uploadToTeacherDrive({
  teacherName,
  className,
  fullName,
  studentCode,
  stage,
  session,
  files,
  fileUrl,
  notes,
}: {
  teacherName: string;
  className: string;
  fullName: string;
  studentCode?: string;
  stage: string;
  session: string;
  files?: File[];
  fileUrl?: string;
  notes?: string;
}) {
  const supabase = await createClient();

  // 1. Fetch Teacher's Google Refresh Token from profiles table
  const { data: profile, error: profErr } = await supabase
    .from("profiles")
    .select("google_refresh_token, email, display_name, username")
    .or(`display_name.eq.${teacherName},username.eq.${teacherName},email.eq.${teacherName}`)
    .maybeSingle();

  if (profErr || !profile || !profile.google_refresh_token) {
    throw new Error(`Giáo viên ${teacherName} chưa kết nối ủy quyền Google Drive OAuth.`);
  }

  // 2. Exchange refresh token for fresh Access Token
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("Chưa cấu hình GOOGLE_CLIENT_ID và GOOGLE_CLIENT_SECRET trên hệ thống server.");
  }

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: profile.google_refresh_token,
      grant_type: "refresh_token",
    }),
  });

  const tokenData = await tokenRes.json();
  if (!tokenRes.ok || !tokenData.access_token) {
    throw new Error("Ủy quyền Google Drive của Giáo viên đã hết hạn. Vui lòng yêu cầu Giáo viên đăng nhập lại!");
  }

  const accessToken = tokenData.access_token;
  const driveHeaders = {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
  };

  // Helper to search folder by name & parentId
  const searchFolder = async (name: string, parentId?: string) => {
    let q = `mimeType = 'application/vnd.google-apps.folder' and name = '${name}' and trashed = false`;
    if (parentId) {
      q += ` and '${parentId}' in parents`;
    }
    const res = await fetch(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}`, {
      headers: driveHeaders,
    });
    if (res.ok) {
      const d = await res.json();
      return d.files && d.files.length > 0 ? d.files[0] : null;
    }
    return null;
  };

  // Helper to create folder
  const createFolder = async (name: string, parentId?: string) => {
    const body: any = {
      name,
      mimeType: "application/vnd.google-apps.folder",
    };
    if (parentId) {
      body.parents = [parentId];
    }
    const res = await fetch("https://www.googleapis.com/drive/v3/files", {
      method: "POST",
      headers: driveHeaders,
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Không thể tạo thư mục '${name}' trên Google Drive: ${errText}`);
    }
    return await res.json();
  };

  // 3. Root Folder Logic: Find 'MindX Hub' OR Rename 'NA MindX Hub' OR Create 'MindX Hub'
  let rootFolder = await searchFolder("MindX Hub");
  if (!rootFolder) {
    const oldRootFolder = await searchFolder("NA MindX Hub");
    if (oldRootFolder) {
      // Auto-rename 'NA MindX Hub' -> 'MindX Hub'
      const renameRes = await fetch(`https://www.googleapis.com/drive/v3/files/${oldRootFolder.id}`, {
        method: "PATCH",
        headers: driveHeaders,
        body: JSON.stringify({ name: "MindX Hub" }),
      });
      if (renameRes.ok) {
        rootFolder = await renameRes.json();
      } else {
        rootFolder = oldRootFolder;
      }
    } else {
      // Create new 'MindX Hub' folder
      rootFolder = await createFolder("MindX Hub");
    }
  }

  const rootFolderId = rootFolder.id;

  // 4. Subfolder Level 1: Class Folder (<Mã Lớp / Tên Lớp>)
  let classFolder = await searchFolder(className, rootFolderId);
  if (!classFolder) {
    classFolder = await createFolder(className, rootFolderId);
  }
  const classFolderId = classFolder.id;

  // 5. Subfolder Level 2: Stage Folder (<Giai đoạn>)
  let stageFolder = await searchFolder(stage, classFolderId);
  if (!stageFolder) {
    stageFolder = await createFolder(stage, classFolderId);
  }
  const stageFolderId = stageFolder.id;

  // Resolve Student Code if not explicitly passed
  let resolvedStudentCode = studentCode || "";
  if (!resolvedStudentCode && fullName) {
    const { data: stRow } = await supabase
      .from("students")
      .select("student_code")
      .or(`name.eq.${fullName},display_name.eq.${fullName}`)
      .limit(1)
      .maybeSingle();

    if (stRow?.student_code) {
      resolvedStudentCode = stRow.student_code;
    }
  }

  // 6. Calculate Submission Attempt Number
  const { data: existingSubs } = await supabase
    .from("submissions")
    .select("attempt_number")
    .eq("teacher", teacherName)
    .eq("class_name", className)
    .eq("full_name", fullName)
    .eq("stage", stage)
    .eq("session", session);

  const attemptCount = (existingSubs?.length || 0) + 1;

  // 7. Upload File(s) or Shortcut Link to Teacher's Stage Folder on Drive
  const uploadedResults = [];

  if (files && files.length > 0) {
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const originalExt = file.name.includes(".") ? file.name.substring(file.name.lastIndexOf(".")) : "";
      
      const fileIndexSuffix = files.length > 1 ? ` (File ${i + 1})` : "";
      const targetFileName = `${fullName} - ${className} - ${stage} - Lần ${attemptCount}${fileIndexSuffix}${originalExt}`;

      const metadata = {
        name: targetFileName,
        parents: [stageFolderId],
      };

      const fileBuffer = await file.arrayBuffer();
      let driveFile: any = null;
      let isDriveQuotaError = false;

      try {
        const form = new FormData();
        form.append("metadata", new Blob([JSON.stringify(metadata)], { type: "application/json" }));
        form.append("file", new Blob([fileBuffer], { type: file.type || "application/octet-stream" }));

        const uploadRes = await fetch(
          "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink",
          {
            method: "POST",
            headers: { Authorization: `Bearer ${accessToken}` },
            body: form,
          }
        );

        const resData = await uploadRes.json();
        if (uploadRes.ok && resData.id) {
          driveFile = resData;
        } else {
          const errMsg = resData.error?.message || "";
          if (uploadRes.status === 403 || errMsg.includes("quota") || errMsg.includes("storage") || errMsg.includes("full")) {
            isDriveQuotaError = true;
          } else {
            throw new Error(`Lỗi tải tệp '${file.name}' lên Google Drive: ${errMsg || "Thất bại"}`);
          }
        }
      } catch (err: any) {
        if (err.message?.includes("quota") || err.message?.includes("storage") || err.message?.includes("full")) {
          isDriveQuotaError = true;
        } else {
          throw err;
        }
      }

      if (isDriveQuotaError || !driveFile) {
        // Fallback: Upload to Supabase Storage Bucket 'submissions-backup'
        const storagePath = `${teacherName}/${className}/${stage}/${Date.now()}_${file.name}`;
        const { data: stData, error: stErr } = await supabase.storage
          .from("submissions-backup")
          .upload(storagePath, fileBuffer, {
            contentType: file.type || "application/octet-stream",
            upsert: true,
          });

        if (stErr) {
          // If bucket doesn't exist, try creating or fallback to public URL upload
          console.error("Supabase Storage Backup Error:", stErr);
        }

        const { data: publicUrlData } = supabase.storage
          .from("submissions-backup")
          .getPublicUrl(storagePath);

        const fallbackUrl = publicUrlData?.publicUrl || "";

        uploadedResults.push({
          fileName: targetFileName,
          driveFileId: null,
          driveUrl: fallbackUrl,
          isPendingDriveSync: true,
          storageProvider: "supabase",
          supabaseStoragePath: storagePath,
        });
      } else {
        uploadedResults.push({
          fileName: targetFileName,
          driveFileId: driveFile.id,
          driveUrl: driveFile.webViewLink || `https://drive.google.com/file/d/${driveFile.id}/view`,
          isPendingDriveSync: false,
          storageProvider: "google_drive",
        });
      }
    }
  } else if (fileUrl) {
    // If Link submission: Create a URL text file shortcut on Google Drive
    const targetFileName = `${fullName} - ${className} - ${stage} - Lần ${attemptCount}.url`;
    const metadata = {
      name: targetFileName,
      parents: [stageFolderId],
    };

    let driveFile: any = null;
    let isDriveQuotaError = false;

    try {
      const linkContent = `[InternetShortcut]\nURL=${fileUrl}`;
      const form = new FormData();
      form.append("metadata", new Blob([JSON.stringify(metadata)], { type: "application/json" }));
      form.append("file", new Blob([linkContent], { type: "text/plain" }));

      const uploadRes = await fetch(
        "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink",
        {
          method: "POST",
          headers: { Authorization: `Bearer ${accessToken}` },
          body: form,
        }
      );

      const resData = await uploadRes.json();
      if (uploadRes.ok && resData.id) {
        driveFile = resData;
      } else {
        const errMsg = resData.error?.message || "";
        if (uploadRes.status === 403 || errMsg.includes("quota") || errMsg.includes("storage") || errMsg.includes("full")) {
          isDriveQuotaError = true;
        } else {
          throw new Error(`Lỗi tải liên kết lên Google Drive: ${errMsg || "Thất bại"}`);
        }
      }
    } catch (err: any) {
      if (err.message?.includes("quota") || err.message?.includes("storage") || err.message?.includes("full")) {
        isDriveQuotaError = true;
      } else {
        throw err;
      }
    }

    uploadedResults.push({
      fileName: targetFileName,
      driveFileId: driveFile?.id || null,
      driveUrl: fileUrl,
      isPendingDriveSync: isDriveQuotaError,
      storageProvider: isDriveQuotaError ? "supabase" : "google_drive",
    });
  }

  // 8. Record Submission in Supabase DB Table
  const primaryResult = uploadedResults[0];
  const basePayload: any = {
    teacher: teacherName,
    class_name: className,
    full_name: fullName,
    student_code: resolvedStudentCode || null,
    stage,
    session,
    attempt_number: attemptCount,
    file_name: primaryResult.fileName,
    file_url: primaryResult.driveUrl,
    notes: notes || "",
  };

  // Attempt insert with sync fields first
  let { data: inserted, error: insertErr } = await supabase
    .from("submissions")
    .insert({
      ...basePayload,
      storage_provider: primaryResult.storageProvider || "google_drive",
      is_pending_drive_sync: Boolean(primaryResult.isPendingDriveSync),
      supabase_storage_path: primaryResult.supabaseStoragePath || null,
    })
    .select()
    .single();

  // If column error occurs (e.g., is_pending_drive_sync column not created in DB yet), fallback to base schema fields
  if (insertErr && (insertErr.message?.includes("column") || insertErr.message?.includes("is_pending_drive_sync") || insertErr.code === "PGRST204")) {
    console.warn("Extra sync columns not found in submissions table, retrying with base schema...", insertErr.message);
    const { data: retryData, error: retryErr } = await supabase
      .from("submissions")
      .insert(basePayload)
      .select()
      .single();

    inserted = retryData;
    insertErr = retryErr;
  }

  if (insertErr) {
    console.error("DB Insert Error:", insertErr);
    throw new Error(`Đã tải tệp lên Drive thành công nhưng lỗi lưu lịch sử vào hệ thống: ${insertErr.message}`);
  }

  return {
    success: true,
    attemptNumber: attemptCount,
    uploadedResults,
    submission: inserted,
    isPendingDriveSync: Boolean(primaryResult.isPendingDriveSync),
  };
}
