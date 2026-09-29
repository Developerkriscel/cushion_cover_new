import { E } from "../../../shop-data";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const raw = (await params).id;
  const id = raw.replace(/\.[a-z0-9]+$/i, "");

  if (!/^[a-f0-9-]{36}$/.test(id)) {
    return new Response("Not found", { status: 404 });
  }

  const row = await E()
    .DB.prepare("SELECT mime,data FROM media WHERE id=?")
    .bind(id)
    .first<{ mime: string; data: string }>();

  if (!row) return new Response("Not found", { status: 404 });

  return new Response(
    Uint8Array.from(atob(row.data), (char) => char.charCodeAt(0)),
    {
      headers: {
        "Content-Type": row.mime,
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "public,max-age=31536000,immutable",
      },
    },
  );
}
