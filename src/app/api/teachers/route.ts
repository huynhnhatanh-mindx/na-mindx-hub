import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const oauthOnly = searchParams.get("oauthOnly") === "true";

    const supabase = await createClient();
    let query = supabase
      .from("profiles")
      .select("id, display_name, username, email, role, google_refresh_token")
      .eq("role", "teacher")
      .order("display_name", { ascending: true });

    if (oauthOnly) {
      query = query
        .not("google_refresh_token", "is", null)
        .neq("google_refresh_token", "");
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const formattedData = (data || []).map((t) => ({
      id: t.id,
      name: t.display_name || t.username,
      displayName: t.display_name || t.username,
      username: t.username,
      email: t.email,
      role: t.role,
      hasOAuth: Boolean(t.google_refresh_token && t.google_refresh_token !== ""),
    }));

    return NextResponse.json(formattedData);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
