import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

const OAUTH_CHANNEL_NAME = "mindx-google-oauth";

/**
 * Build an HTML page that:
 * 1. Sends a BroadcastChannel message to the original tab
 * 2. Auto-closes itself after a brief delay
 */
function buildCallbackHtml(type: "oauth-success" | "oauth-error", payload: { email?: string; message?: string }) {
  const data = JSON.stringify({ type, ...payload });
  return `<!DOCTYPE html>
<html lang="vi">
<head><meta charset="UTF-8"><title>Đang xử lý...</title></head>
<body style="display:flex;align-items:center;justify-content:center;height:100vh;font-family:system-ui;background:#0a0a0a;color:#fafafa;">
<div style="text-align:center">
  <p>${type === "oauth-success" ? "✅ Liên kết thành công! Tab này sẽ tự đóng..." : "❌ " + (payload.message || "Có lỗi xảy ra.")}</p>
  <p style="font-size:12px;opacity:0.6;margin-top:8px;">Nếu tab không tự đóng, bạn có thể đóng thủ công.</p>
</div>
<script>
  try {
    const channel = new BroadcastChannel("${OAUTH_CHANNEL_NAME}");
    channel.postMessage(${data});
    channel.close();
  } catch(e) { console.error(e); }
  setTimeout(() => { window.close(); }, 1500);
</script>
</body>
</html>`;
}

export async function GET(request: NextRequest) {
  const origin = request.nextUrl.origin;
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const errorParam = searchParams.get("error");

  if (errorParam) {
    return new NextResponse(
      buildCallbackHtml("oauth-error", { message: errorParam }),
      { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } }
    );
  }

  if (!code) {
    return new NextResponse(
      buildCallbackHtml("oauth-error", { message: "Thiếu mã xác thực Google OAuth." }),
      { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } }
    );
  }

  try {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = `${origin}/api/auth/google/callback`;

    // 1. Exchange authorization code for tokens
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId || "",
        client_secret: clientSecret || "",
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenRes.ok) {
      const errData = await tokenRes.json();
      throw new Error(errData.error_description || "Không thể đổi mã OAuth thành token Google.");
    }

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;
    const refreshToken = tokenData.refresh_token || tokenData.access_token;

    // 2. Fetch Google User Info
    const userRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!userRes.ok) {
      throw new Error("Không thể lấy thông tin email từ Google.");
    }

    const googleUser = await userRes.json();
    const googleEmail = googleUser.email;

    // 3. Get current authenticated user
    const supabase = await createClient();
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    // 4. Check if this Google email is already linked to ANOTHER profile
    if (googleEmail) {
      const { data: existingProfile } = await supabase
        .from("profiles")
        .select("id, username, display_name")
        .eq("email", googleEmail)
        .maybeSingle();

      if (existingProfile) {
        // Determine the current user's profile ID
        let currentProfileId: string | null = null;
        if (authUser) {
          currentProfileId = authUser.id;
          // Also check by username/email in case profile ID differs from auth ID
          const { data: myProfile } = await supabase
            .from("profiles")
            .select("id")
            .eq("id", authUser.id)
            .maybeSingle();

          if (!myProfile && authUser.email) {
            const usernamePart = authUser.email.split("@")[0];
            const { data: altProfile } = await supabase
              .from("profiles")
              .select("id")
              .or(`username.eq.${usernamePart},email.eq.${authUser.email}`)
              .maybeSingle();
            if (altProfile) currentProfileId = altProfile.id;
          }
        }

        // If the existing profile with this email is NOT the current user -> reject
        if (existingProfile.id !== currentProfileId) {
          return new NextResponse(
            buildCallbackHtml("oauth-error", {
              message: `Email Google "${googleEmail}" đã được liên kết với tài khoản khác. Vui lòng sử dụng email Google khác.`,
            }),
            { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } }
          );
        }
      }
    }

    // 5. Update profile in database
    if (authUser) {
      let targetId = authUser.id;
      let { data: profile } = await supabase.from("profiles").select("id").eq("id", targetId).maybeSingle();

      if (!profile && authUser.email) {
        const usernamePart = authUser.email.split("@")[0];
        const { data: p } = await supabase.from("profiles").select("id").or(`username.eq.${usernamePart},email.eq.${authUser.email}`).maybeSingle();
        if (p) targetId = p.id;
      }

      await supabase.from("profiles").update({
        google_refresh_token: refreshToken,
        email: googleEmail,
        status: "active",
      }).eq("id", targetId);
    } else {
      // Fallback: update profile matching username 'admin'
      const { data: adminProfile } = await supabase.from("profiles").select("id").eq("username", "admin").maybeSingle();
      if (adminProfile) {
        await supabase.from("profiles").update({
          google_refresh_token: refreshToken,
          email: googleEmail,
          status: "active",
        }).eq("id", adminProfile.id);
      }
    }

    // 6. Return HTML page that sends success signal and auto-closes
    return new NextResponse(
      buildCallbackHtml("oauth-success", { email: googleEmail || "" }),
      { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } }
    );
  } catch (err: any) {
    return new NextResponse(
      buildCallbackHtml("oauth-error", { message: err.message || "Có lỗi xảy ra khi liên kết Google Drive." }),
      { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } }
    );
  }
}
