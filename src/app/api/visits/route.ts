import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("visitors")
      .select("count")
      .limit(1)
      .single();

    if (error && error.code !== "PGRST116") {
      return NextResponse.json({ count: 0 });
    }

    return NextResponse.json({ count: data?.count || 0 });
  } catch (err: any) {
    return NextResponse.json({ count: 0 });
  }
}

export async function POST() {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("visitors")
      .select("id, count")
      .limit(1)
      .single();

    if (data) {
      const newCount = (data.count || 0) + 1;
      await supabase
        .from("visitors")
        .update({ count: newCount })
        .eq("id", data.id);
      return NextResponse.json({ count: newCount });
    } else {
      const { data: inserted } = await supabase
        .from("visitors")
        .insert({ count: 1 })
        .select("count")
        .single();
      return NextResponse.json({ count: inserted?.count || 1 });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
