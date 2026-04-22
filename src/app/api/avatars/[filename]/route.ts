import { readFile, stat } from "fs/promises";
import { join } from "path";

const AVATARS_DIR = join(process.cwd(), "data", "avatars");

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ filename: string }> },
) {
  const { filename } = await params;

  if (!/^[a-f0-9-]+\.webp$/.test(filename)) {
    return new Response("Not found", { status: 404 });
  }

  const filepath = join(AVATARS_DIR, filename);

  try {
    const [buffer, stats] = await Promise.all([readFile(filepath), stat(filepath)]);
    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "image/webp",
        "Content-Length": String(stats.size),
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
