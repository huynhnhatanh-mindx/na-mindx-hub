import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, displayName, username, role, status } = body;
    const finalDisplayName = displayName || name;

    const supabase = await createClient();

    // 1. If username is being changed, check duplicate against other accounts
    if (username) {
      const cleanUsername = username.trim().toLowerCase();
      const { data: existingUser } = await supabase
        .from("profiles")
        .select("id")
        .eq("username", cleanUsername)
        .neq("id", id)
        .maybeSingle();

      if (existingUser) {
        return NextResponse.json(
          { error: `Tên đăng nhập "${cleanUsername}" đã được sử dụng bởi tài khoản khác.` },
          { status: 400 }
        );
      }
    }

    const updates: any = {};
    if (finalDisplayName) updates.display_name = finalDisplayName;
    if (username) updates.username = username.trim().toLowerCase();
    if (role) updates.role = role;
    if (status) updates.status = status;

    const { data, error } = await supabase
      .from("profiles")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    return NextResponse.json({
      _id: data.id,
      id: data.id,
      name: data.display_name,
      displayName: data.display_name,
      username: data.username,
      role: data.role,
      email: data.email,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { error } = await supabase.from("profiles").delete().eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
