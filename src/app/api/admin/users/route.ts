import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const mapped = (data || []).map((u) => ({
      _id: u.id,
      id: u.id,
      username: u.username,
      role: u.role,
      displayName: u.display_name,
      email: u.email,
      status: u.status,
      createdAt: u.created_at,
    }));

    return NextResponse.json(mapped);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { username, password, role, displayName, email } = await request.json();

    if (!username || !password || !displayName) {
      return NextResponse.json({ error: "Vui lòng nhập đầy đủ thông tin bắt buộc" }, { status: 400 });
    }

    const supabase = await createClient();
    const emailToUse = email || `${username.toLowerCase()}@namindx.hub`;

    // Create auth user in Supabase Auth
    const { data: authUser, error: authError } = await supabase.auth.signUp({
      email: emailToUse,
      password: password,
      options: {
        data: {
          display_name: displayName,
          username,
          role: role || "teacher",
        },
      },
    });

    if (authError) return NextResponse.json({ error: authError.message }, { status: 400 });

    return NextResponse.json({
      success: true,
      user: {
        id: authUser.user?.id,
        username,
        role: role || "teacher",
        displayName,
        email: emailToUse,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
