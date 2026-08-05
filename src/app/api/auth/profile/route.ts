import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    }

    let profile: any = null;
    if (user.id && /^[0-9a-fA-F-]{36}$/.test(user.id)) {
      const { data } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
      profile = data;
    }

    if (!profile && user.email) {
      const usernamePart = user.email.split("@")[0];
      const { data } = await supabase.from("profiles").select("*").or(`username.eq.${usernamePart},email.eq.${user.email}`).maybeSingle();
      profile = data;
    }

    const finalDisplayName = profile?.display_name || user.user_metadata?.full_name || user.user_metadata?.display_name || user.email;

    return NextResponse.json({
      id: user.id,
      username: profile?.username || user.email?.split("@")[0] || "user",
      role: profile?.role || "admin",
      displayName: finalDisplayName,
      display_name: finalDisplayName,
      email: profile?.email || null,
      emailNotificationsEnabled: profile?.email_notifications_enabled || false,
      defaultStudentMaxUploadSize: profile?.default_student_max_upload_size || 50,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    }

    const body = await request.json();
    const { displayName, email, emailNotificationsEnabled, defaultStudentMaxUploadSize, password } = body;

    const updates: any = {};
    if (displayName) updates.display_name = displayName;
    if (email !== undefined) updates.email = email;
    if (emailNotificationsEnabled !== undefined) updates.email_notifications_enabled = emailNotificationsEnabled;
    if (defaultStudentMaxUploadSize !== undefined) updates.default_student_max_upload_size = Number(defaultStudentMaxUploadSize) || 50;

    if (Object.keys(updates).length > 0) {
      let targetProfile: any = null;
      if (user.id && /^[0-9a-fA-F-]{36}$/.test(user.id)) {
        const { data } = await supabase.from("profiles").select("id").eq("id", user.id).maybeSingle();
        targetProfile = data;
      }
      if (!targetProfile && user.email) {
        const usernamePart = user.email.split("@")[0];
        const { data } = await supabase.from("profiles").select("id").or(`username.eq.${usernamePart},email.eq.${user.email}`).maybeSingle();
        targetProfile = data;
      }

      if (targetProfile?.id) {
        await supabase.from("profiles").update(updates).eq("id", targetProfile.id);
      }
    }

    if (password) {
      await supabase.auth.updateUser({ password });
    }

    return NextResponse.json({ success: true, message: "Cập nhật thông tin thành công" });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
