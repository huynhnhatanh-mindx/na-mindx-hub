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
    const uname = username.trim().toLowerCase();

    // Map known usernames to their emails
    const emailCandidateMap: Record<string, string[]> = {
      admin: ["admin@namindx.com", "admin@mindx.net.vn"],
      anhhn: ["huynhnhatanh@mindx.net.vn", "anhhn@mindx.net.vn"],
      huanvm: ["huanvm@mindx.net.vn"],
      kietnt3: ["kietnt3@mindx.net.vn"],
      khangtt: ["khangtt@mindx.net.vn"],
      vylnt: ["tuonviii.2404@gmail.com", "vylnt@mindx.net.vn"],
      test1: ["anhhn.contact.work@gmail.com"],
    };

    let candidates: string[] = [];

    if (uname.includes("@")) {
      candidates = [uname];
    } else if (emailCandidateMap[uname]) {
      candidates = emailCandidateMap[uname];
    } else {
      candidates = [`${uname}@mindx.net.vn`, `${uname}@namindx.com`];
    }

    let authData: any = null;
    let authError: any = null;

    for (const email of candidates) {
      const result = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (!result.error && result.data?.user) {
        authData = result.data;
        authError = null;
        break;
      } else {
        authError = result.error;
      }
    }

    if (!authError && authData?.user) {
      // Get associated profile
      const { data: userProfile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", authData.user.id)
        .maybeSingle();

      return NextResponse.json({
        token: authData.session?.access_token,
        user: {
          id: authData.user.id,
          username: userProfile?.username || username,
          role: userProfile?.role || (uname === "admin" ? "admin" : "teacher"),
          displayName: userProfile?.display_name || userProfile?.username || username,
          email: userProfile?.email || authData.user.email,
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
