import { db } from "@/db";
import { members } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/session";
import { writeFile, unlink } from "fs/promises";
import { join } from "path";
import sharp from "sharp";

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp"];
const AVATARS_DIR = join(process.cwd(), "public", "avatars");

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ error: "Не авторизован" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return Response.json({ error: "Файл не передан" }, { status: 400 });
  }

  if (file.size > MAX_FILE_SIZE) {
    return Response.json({ error: "Файл слишком большой (макс. 5MB)" }, { status: 413 });
  }

  if (!ALLOWED_MIME.includes(file.type)) {
    return Response.json(
      { error: "Поддерживаются только JPG, PNG, WebP" },
      { status: 415 },
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  const processed = await sharp(buffer)
    .resize(256, 256, { fit: "cover", position: "center" })
    .webp({ quality: 85 })
    .toBuffer();

  const filename = `${user.id}.webp`;
  const filepath = join(AVATARS_DIR, filename);

  await writeFile(filepath, processed);

  const avatarUrl = `/avatars/${filename}?v=${Date.now()}`;

  await db.update(members).set({ avatarUrl }).where(eq(members.id, user.id));

  return Response.json({ ok: true, avatarUrl });
}

export async function DELETE() {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ error: "Не авторизован" }, { status: 401 });
  }

  const filename = `${user.id}.webp`;
  const filepath = join(AVATARS_DIR, filename);

  try {
    await unlink(filepath);
  } catch {
    // File may not exist — не проблема
  }

  await db.update(members).set({ avatarUrl: null }).where(eq(members.id, user.id));

  return Response.json({ ok: true });
}
