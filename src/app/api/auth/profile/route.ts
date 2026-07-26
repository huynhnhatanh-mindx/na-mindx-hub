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

    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    return NextResponse.json({
      id: user.id,
      username: profile?.username || user.email,
      role: profile?.role || "admin",
      displayName: profile?.display_name || user.email,
      email: profile?.email || user.email,
      emailNotificationsEnabled: profile?.email_notifications_enabled || false,
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
    const { displayName, email, emailNotificationsEnabled, password } = body;

    const updates: any = {};
    if (displayName) updates.display_name = displayName;
    if (email !== undefined) updates.email = email;
    if (emailNotificationsEnabled !== undefined) updates.email_notifications_enabled = emailNotificationsEnabled;

    if (Object.keys(updates).length > 0) {
      await supabase.from("profiles").update(updates).eq("id", user.id);
    }

    if (password) {
      await supabase.auth.updateUser({ password });
    }

    return NextResponse.json({ success: true, message: "Cập nhật thông tin thành công" });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
