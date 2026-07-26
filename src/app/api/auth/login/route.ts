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

    // Map username to email
    let emailToUse = username;
    if (!username.includes("@")) {
      if (username.toLowerCase() === "admin") {
        emailToUse = "admin@namindx.com";
      } else {
        emailToUse = `${username.toLowerCase()}@mindx.net.vn`;
      }
    }

    // Try primary email sign in
    let { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: emailToUse,
      password: password,
    });

    // Fallback try admin@namindx.com if username is admin
    if (authError && username.toLowerCase() === "admin") {
      const fallback = await supabase.auth.signInWithPassword({
        email: "admin@namindx.com",
        password: password,
      });
      if (!fallback.error && fallback.data?.user) {
        authData = fallback.data;
        authError = null;
      }
    }

    if (!authError && authData?.user) {
      // Get profile
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
          displayName: profile?.display_name || profile?.username || "Quản trị viên",
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
