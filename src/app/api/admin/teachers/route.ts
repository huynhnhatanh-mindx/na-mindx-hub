import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.from("teachers").select("*").order("name", { ascending: true });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    const mapped = (data || []).map((t) => ({ _id: t.id, id: t.id, name: t.name }));
    return NextResponse.json(mapped);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { name } = await request.json();
    if (!name) return NextResponse.json({ error: "Tên giáo viên không được trống" }, { status: 400 });

    const supabase = await createClient();
    const { data, error } = await supabase.from("teachers").insert({ name }).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ _id: data.id, id: data.id, name: data.name });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
