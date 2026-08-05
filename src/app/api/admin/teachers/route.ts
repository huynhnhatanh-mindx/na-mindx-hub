import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    const mapped = (data || []).map((t) => ({
      _id: t.id,
      id: t.id,
      name: t.display_name || t.username,
      displayName: t.display_name,
      email: t.email,
      username: t.username,
      role: t.role || "teacher",
      status: t.status || "active",
      createdAt: t.created_at,
    }));
    return NextResponse.json(mapped);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { username, password, displayName, role } = await request.json();
    if (!username || !password || !displayName) {
      return NextResponse.json({ error: "Vui lòng nhập đầy đủ Tên đăng nhập, Mật khẩu và Họ tên" }, { status: 400 });
    }

    const supabase = await createClient();
    const uname = username.trim().toLowerCase();
    const userRole = role || "teacher";

    // Call public.create_system_account SQL function to bypass email rate limits completely
    const { data, error } = await supabase.rpc("create_system_account", {
      p_username: uname,
      p_password: password,
      p_display_name: displayName.trim(),
      p_role: userRole,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (data && data.error) {
      return NextResponse.json({ error: data.error }, { status: 400 });
    }

    return NextResponse.json({
      _id: data.id,
      id: data.id,
      username: data.username,
      displayName: data.displayName,
      role: data.role,
      status: data.status,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
