import { E, user } from "../../../shop-data";

const json = (data: unknown, status = 200) =>
  Response.json(data, { status, headers: { "Cache-Control": "no-store" } });

type Address = {
  id: string;
  type: string;
  fullName: string;
  phone: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
  isDefault: boolean;
};

function cleanText(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function cleanAddress(value: unknown): Address | null {
  const raw = value as Partial<Address>;
  const type = cleanText(raw.type, 20);
  const fullName = cleanText(raw.fullName, 100);
  const phone = cleanText(raw.phone, 20).replace(/\D/g, "").slice(-10);
  const line1 = cleanText(raw.line1, 180);
  const line2 = cleanText(raw.line2, 180);
  const city = cleanText(raw.city, 80);
  const state = cleanText(raw.state, 80);
  const pincode = cleanText(raw.pincode, 10);
  const country = cleanText(raw.country, 60) || "India";

  if (
    !["Home", "Work", "Other"].includes(type) ||
    fullName.length < 2 ||
    !/^\d{10}$/.test(phone) ||
    line1.length < 6 ||
    city.length < 2 ||
    state.length < 2 ||
    !/^\d{6}$/.test(pincode)
  )
    return null;

  return {
    id:
      typeof raw.id === "string" && /^[a-f0-9-]{36}$/.test(raw.id)
        ? raw.id
        : crypto.randomUUID(),
    type,
    fullName,
    phone,
    line1,
    line2,
    city,
    state,
    pincode,
    country,
    isDefault: Boolean(raw.isDefault),
  };
}

async function ensureCustomerColumns() {
  const db = E().DB;
  await db
    .prepare(
      "CREATE TABLE IF NOT EXISTS customers (email TEXT PRIMARY KEY, password TEXT, name TEXT, addresses TEXT)",
    )
    .run();

  try {
    await db.prepare("ALTER TABLE customers ADD COLUMN addresses TEXT").run();
  } catch {}
}

export async function POST(req: Request) {
  try {
    const origin = req.headers.get("origin");
    if (origin) {
      try {
        const originHost = new URL(origin).host;
        const reqHost = new URL(req.url).host;
        const hostHeader = req.headers.get("host") || req.headers.get("x-forwarded-host") || "";
        if (originHost !== reqHost && (!hostHeader || !origin.includes(hostHeader.split(":")[0]))) {
          return json({ error: "Request not allowed" }, 403);
        }
      } catch {}
    }

    const uid = await user(req);
    if (!uid || !uid.startsWith("customer:"))
      return json({ error: "Customer sign-in required." }, 401);

    const raw = await req.text();
    if (raw.length > 50000) return json({ error: "Request too large" }, 413);

    const body = JSON.parse(raw);
    if (body.action !== "saveAddresses")
      return json({ error: "Unknown action" }, 400);

    const input = Array.isArray(body.addresses) ? body.addresses.slice(0, 10) : [];
    const addresses = input.map(cleanAddress);
    if (addresses.some((address) => !address))
      return json({ error: "Check the address details and try again." }, 400);

    const next = addresses as Address[];
    if (next.length) {
      const defaultIndex = next.findIndex((address) => address.isDefault);
      next.forEach((address, index) => {
        address.isDefault = index === (defaultIndex >= 0 ? defaultIndex : 0);
      });
    }

    await ensureCustomerColumns();
    const email = uid.slice("customer:".length);
    const result = await E()
      .DB.prepare("UPDATE customers SET addresses=? WHERE email=?")
      .bind(JSON.stringify(next), email)
      .run();

    const changes = result.meta?.changes ?? 0;
    if (changes === 0) {
      await E()
        .DB.prepare(
          "INSERT INTO customers (email, password, name, addresses) VALUES (?, ?, ?, ?)",
        )
        .bind(email, "", email.split("@")[0], JSON.stringify(next))
        .run();
    }

    return json({ ok: true, addresses: next });
  } catch {
    return json({ error: "Could not save addresses." }, 503);
  }
}
