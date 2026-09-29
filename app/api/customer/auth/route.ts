import { E, ensureStoreSchema, hmac, user } from "../../../shop-data";

const json = (
  data: unknown,
  status = 200,
  headers: Record<string, string> = {},
) =>
  Response.json(data, {
    status,
    headers: { "Cache-Control": "no-store", ...headers },
  });

const encoder = new TextEncoder();
const PASSWORD_ITERATIONS = 150000;

type ShoppingState = {
  bag?: Record<string, number>;
  wish?: string[];
  wishlist?: string[];
};

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

function toBase64(bytes: Uint8Array) {
  return btoa(String.fromCharCode(...bytes));
}

function fromBase64(value: string) {
  return Uint8Array.from(atob(value), (char) => char.charCodeAt(0));
}

async function ensureCustomerTable() {
  await ensureStoreSchema();
  const db = E().DB;
  await db
    .prepare(
      "CREATE TABLE IF NOT EXISTS customers (email TEXT PRIMARY KEY, password TEXT, name TEXT, last_name TEXT, phone TEXT, addresses TEXT)",
    )
    .run();

  for (const statement of [
    "ALTER TABLE customers ADD COLUMN phone TEXT",
    "ALTER TABLE customers ADD COLUMN last_name TEXT",
    "ALTER TABLE customers ADD COLUMN addresses TEXT",
    "ALTER TABLE customers ADD COLUMN created_at TEXT DEFAULT CURRENT_TIMESTAMP",
  ]) {
    try {
      await db.prepare(statement).run();
    } catch {}
  }
}

async function derivePassword(password: string, salt: Uint8Array, iterations: number) {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations },
    key,
    256,
  );
  return new Uint8Array(bits);
}

async function hashPassword(password: string) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await derivePassword(password, salt, PASSWORD_ITERATIONS);
  return `pbkdf2$${PASSWORD_ITERATIONS}$${toBase64(salt)}$${toBase64(hash)}`;
}

async function verifyPassword(password: string, stored: string) {
  if (!stored.startsWith("pbkdf2$")) {
    return { ok: stored === password, upgrade: stored === password };
  }

  const [, iterationsRaw, saltRaw, hashRaw] = stored.split("$");
  const iterations = Number(iterationsRaw);
  if (!Number.isInteger(iterations) || !saltRaw || !hashRaw)
    return { ok: false, upgrade: false };

  const salt = fromBase64(saltRaw);
  const expected = fromBase64(hashRaw);
  const actual = await derivePassword(password, salt, iterations);

  if (actual.length !== expected.length) return { ok: false, upgrade: false };

  let diff = 0;
  for (let i = 0; i < actual.length; i++) diff |= actual[i] ^ expected[i];

  return {
    ok: diff === 0,
    upgrade: diff === 0 && iterations < PASSWORD_ITERATIONS,
  };
}

function cleanEmail(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function cleanPassword(value: unknown) {
  return typeof value === "string" ? value : "";
}

function validEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254;
}

function validPassword(password: string) {
  return (
    password.length >= 8 &&
    password.length <= 128 &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /[0-9]/.test(password) &&
    /[^A-Za-z0-9]/.test(password)
  );
}

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

function normalizeState(value: unknown) {
  const state = (value || {}) as ShoppingState;
  const bag =
    state.bag && typeof state.bag === "object" && !Array.isArray(state.bag)
      ? Object.fromEntries(
          Object.entries(state.bag)
            .filter(
              ([id, qty]) =>
                /^[-a-z0-9]{1,60}$/.test(id) &&
                Number.isInteger(qty) &&
                qty >= 0 &&
                qty <= 20,
            )
            .slice(0, 200),
        )
      : {};
  const wish = (state.wish || state.wishlist || [])
    .filter((id) => typeof id === "string" && /^[-a-z0-9]{1,60}$/.test(id))
    .slice(0, 200);

  return { bag, wish };
}

async function saveMergedState(email: string, incoming: unknown) {
  const db = E().DB;
  const uid = "customer:" + email;
  const next = normalizeState(incoming);
  const existing = await db
    .prepare("SELECT data FROM shopping_state WHERE user_id=?")
    .bind(uid)
    .first<{ data: string }>();

  if (existing) {
    const current = JSON.parse(existing.data);
    next.bag = { ...(current.bag || {}), ...next.bag };
    next.wish = [...new Set([...(current.wish || []), ...next.wish])];
  }

  await db
    .prepare(
      "INSERT INTO shopping_state (user_id,data) VALUES (?,?) ON CONFLICT(user_id) DO UPDATE SET data=excluded.data",
    )
    .bind(uid, JSON.stringify(next))
    .run();
}

function customerCookie(email: string, exp: string, sig: string) {
  return `velto_customer=${email}|${exp}|${sig}; HttpOnly; SameSite=Lax; Path=/; Max-Age=2592000`;
}

export async function POST(req: Request) {
  try {
    const raw = await req.text();
    if (raw.length > 50000) return json({ error: "Request too large" }, 413);

    const body = JSON.parse(raw);

    if (body.action === "customerLogout") {
      return json(
        { ok: true },
        200,
        {
          "Set-Cookie":
            "velto_customer=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Max-Age=0; HttpOnly; SameSite=Lax",
        },
      );
    }

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

    const db = E().DB;
    await ensureCustomerTable();

    if (body.action === "customerRegister") {
      const email = cleanEmail(body.email);
      const password = cleanPassword(body.password);
      const firstName =
        typeof body.firstName === "string" ? body.firstName.trim() : "";
      const lastName =
        typeof body.lastName === "string" ? body.lastName.trim() : "";
      const phone =
        typeof body.phone === "string"
          ? body.phone.replace(/\D/g, "").slice(-10)
          : "";

      if (!validEmail(email))
        return json({ error: "Enter a valid email address." }, 400);
      if (!validPassword(password))
        return json(
          { error: "Password must include uppercase, lowercase, number and symbol." },
          400,
        );
      if (firstName.length < 2 || firstName.length > 80)
        return json({ error: "Enter your first name." }, 400);
      if (lastName.length > 80)
        return json({ error: "Last name is too long." }, 400);
      if (!/^\d{10}$/.test(phone))
        return json({ error: "Enter a valid 10-digit mobile number." }, 400);

      const existing = await db
        .prepare("SELECT email FROM customers WHERE email=?")
        .bind(email)
        .first();
      if (existing) return json({ error: "Email already registered." }, 400);

      const addresses = Array.isArray(body.addresses)
        ? body.addresses.slice(0, 10).map(cleanAddress)
        : [];
      if (addresses.some((address) => !address))
        return json({ error: "Check the delivery address details." }, 400);

      if (addresses.length) {
        const defaultIndex = addresses.findIndex((address) => address?.isDefault);
        addresses.forEach((address, index) => {
          if (address)
            address.isDefault = index === (defaultIndex >= 0 ? defaultIndex : 0);
        });
      }

      await db
        .prepare(
          "INSERT INTO customers (email, password, name, last_name, phone, addresses) VALUES (?, ?, ?, ?, ?, ?)",
        )
        .bind(
          email,
          await hashPassword(password),
          firstName,
          lastName,
          phone,
          JSON.stringify(addresses),
        )
        .run();

      await saveMergedState(email, body.state);

      const exp = String(Date.now() + 30 * 24 * 60 * 60 * 1000);
      return json(
        { ok: true, name: firstName },
        200,
        { "Set-Cookie": customerCookie(email, exp, await hmac(email + exp)) },
      );
    }

    if (body.action === "customerLogin") {
      const email = cleanEmail(body.email);
      const password = cleanPassword(body.password);

      if (!validEmail(email) || !password)
        return json({ error: "Invalid email or password." }, 401);

      const customer = await db
        .prepare("SELECT name, password FROM customers WHERE email=?")
        .bind(email)
        .first<{ name: string; password: string }>();

      const result = customer
        ? await verifyPassword(password, customer.password || "")
        : { ok: false, upgrade: false };

      if (!customer || !result.ok)
        return json({ error: "Invalid email or password." }, 401);

      if (result.upgrade) {
        await db
          .prepare("UPDATE customers SET password=? WHERE email=?")
          .bind(await hashPassword(password), email)
          .run();
      }

      await saveMergedState(email, body.state);

      const exp = String(Date.now() + 30 * 24 * 60 * 60 * 1000);
      return json(
        { ok: true, name: customer.name },
        200,
        { "Set-Cookie": customerCookie(email, exp, await hmac(email + exp)) },
      );
    }


    if (body.action === "customerPasswordHelp") {
      const email = cleanEmail(body.email);
      const signedInUser = await user(req);
      if (validEmail(email) && signedInUser === "customer:" + email) {
        return json({
          ok: true,
          message:
            "You are already signed in. Sign out and contact support if you need a password reset.",
        });
      }

      return json({
        ok: true,
        message:
          "If this email is registered, contact info@velto.com for account recovery.",
      });
    }

    return json({ error: "Unknown action" }, 400);
  } catch {
    return json({ error: "Could not complete authentication." }, 503);
  }
}
