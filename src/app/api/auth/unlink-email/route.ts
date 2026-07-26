import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    }

    // Update profile in DB
    await supabase
      .from("profiles")
      .update({
        email: "",
        google_refresh_token: "",
      })
      .eq("id", user.id);

    return NextResponse.json({ success: true, message: "Hủy liên kết Email / Google thành công!" });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
