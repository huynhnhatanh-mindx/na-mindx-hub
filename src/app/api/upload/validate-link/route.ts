import { NextResponse, type NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();
    if (!url || typeof url !== "string") {
      return NextResponse.json(
        { isAccessible: false, error: "Đường dẫn không hợp lệ." },
        { status: 400 }
      );
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      return NextResponse.json({
        isAccessible: false,
        error: "Đường dẫn không hợp lệ. Vui lòng nhập đầy đủ http:// hoặc https://.",
      });
    }

    if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
      return NextResponse.json({
        isAccessible: false,
        error: "Giao thức đường dẫn phải là http hoặc https.",
      });
    }

    return NextResponse.json({ isAccessible: true, resolvedUrl: url });
  } catch (err: any) {
    return NextResponse.json({ isAccessible: false, error: err.message });
  }
}
