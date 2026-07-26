import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json(
        { error: "Vui lòng nhập tên đăng nhập và mật khẩu" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // First try Supabase Auth email/password if input looks like email
    const isEmail = username.includes("@");
    const emailToUse = isEmail ? username : `${username.toLowerCase()}@namindx.hub`;

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: emailToUse,
      password: password,
    });

    if (!authError && authData?.user) {
      // Get associated profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", authData.user.id)
        .single();

      return NextResponse.json({
        token: authData.session?.access_token,
        user: {
          id: authData.user.id,
          username: profile?.username || username,
          role: profile?.role || "admin",
          displayName: profile?.display_name || username,
          email: profile?.email || authData.user.email,
          requiresGoogleAuth: false,
        },
      });
    }

    return NextResponse.json(
      { error: "Tên đăng nhập hoặc mật khẩu không chính xác" },
      { status: 401 }
    );
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
