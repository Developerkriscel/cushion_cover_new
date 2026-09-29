import { Product } from "../../catalog";
import { categories, validImage, ShopSettings, Coupon } from "../../shop-config";
import {
  E,
  admin,
  hmac,
  user,
  guestCookie,
  products,
  settings,
  coupons,
  paymentStatus,
  quote,
  customer,
} from "../../shop-data";

const json = (
  data: unknown,
  status = 200,
  headers: Record<string, string> = {},
) =>
  Response.json(data, {
    status,
    headers: { "Cache-Control": "no-store", ...headers },
  });

const str = (value: unknown, max: number, min = 0) =>
  typeof value === "string" && value.trim().length >= min && value.length <= max;

const saveConfig = (id: string, data: unknown) =>
  E()
    .DB.prepare(
      "INSERT INTO store_config (id,data) VALUES (?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data",
    )
    .bind(id, JSON.stringify(data))
    .run();

async function ensureCustomerColumns() {
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

async function ensureOrderColumns() {
  for (const statement of [
    "ALTER TABLE orders ADD COLUMN payment_method TEXT",
    "ALTER TABLE orders ADD COLUMN payment_status TEXT",
    "ALTER TABLE orders ADD COLUMN payment_id TEXT",
  ]) {
    try {
      await E().DB.prepare(statement).run();
    } catch {}
  }
}

export async function GET(req: Request) {
  try {
    const s = await settings();
    const searchParams = new URL(req.url).searchParams;

    if (searchParams.get("action") === "admin") {
      if (!(await admin(req)))
        return json({ error: "Please sign in to the admin panel." }, 401);

      const orders = await E()
        .DB.prepare("SELECT * FROM orders ORDER BY created_at DESC LIMIT 200")
        .all();

      return json({
        products: await products(),
        settings: s,
        coupons: await coupons(),
        payment: paymentStatus(s),
        orders: orders.results,
        customers: await E().DB.prepare("SELECT email, name, last_name, phone, created_at FROM customers ORDER BY created_at DESC LIMIT 50").all().then(r => r.results).catch(() => []),
      });
    }

    const uid = await user(req);
    let state = null;
    let customerOrders: unknown[] = [];
    let customerAddresses: unknown[] = [];
    let cust: { addresses?: string; name?: string } | null = null;

    if (uid) {
      const stateRow = await E()
        .DB.prepare("SELECT data FROM shopping_state WHERE user_id=?")
        .bind(uid)
        .first<{ data: string }>();

      if (stateRow) state = JSON.parse(stateRow.data);

      if (uid.startsWith("customer:")) {
        await ensureCustomerColumns();
        await ensureOrderColumns();
        const email = uid.slice("customer:".length);

        cust = await E()
          .DB.prepare("SELECT addresses, name, last_name, phone FROM customers WHERE email=?")
          .bind(email)
          .first<{ addresses?: string; name?: string; last_name?: string; phone?: string }>();

        if (cust?.addresses) customerAddresses = JSON.parse(cust.addresses);

        const orders = await E()
          .DB.prepare(
            "SELECT id, total, status, created_at, items, payment_method, payment_status, payment_id, customer, address, phone, pincode FROM orders WHERE user_id=? ORDER BY created_at DESC LIMIT 50",
          )
          .bind(uid)
          .all();
        customerOrders = orders.results;
      }
    }

    return json(
      {
        products: await products(),
        settings: s,
        payment: paymentStatus(s),
        state,
        customer:
          typeof uid === "string" && uid.startsWith("customer:")
            ? {
                name: cust?.name || uid.slice("customer:".length).split("@")[0],
                last_name: cust?.last_name || "",
                phone: cust?.phone || "",
                email: uid.slice("customer:".length),
              }
            : null,
        orders: customerOrders,
        addresses: customerAddresses,
      },
      200,
      uid ? {} : { "Set-Cookie": await guestCookie() },
    );
  } catch {
    return json(
      { error: "The store is temporarily unavailable. Please try again." },
      503,
    );
  }
}

export async function POST(req: Request) {
  try {
    if (req.headers.get("origin") !== new URL(req.url).origin)
      return json({ error: "Request not allowed" }, 403);

    if (Number(req.headers.get("content-length") || 0) > 2300000)
      return json({ error: "Request too large" }, 413);

    const raw = await req.text();
    if (raw.length > 2300000)
      return json({ error: "Request too large" }, 413);

    const body = JSON.parse(raw);
    const db = E().DB;

    if (body.action === "login") {
      if (
        !E().ADMIN_PASSWORD ||
        typeof body.password !== "string" ||
        body.password !== E().ADMIN_PASSWORD
      )
        return json({ error: "Incorrect admin password." }, 401);

      const exp = String(Date.now() + 8 * 60 * 60 * 1000);
      return json(
        { ok: true },
        200,
        {
          "Set-Cookie": `aangan_admin=${exp}.${await hmac(exp)}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=28800`,
        },
      );
    }

    if (body.action === "logout")
      return json(
        { ok: true },
        200,
        {
          "Set-Cookie":
            "aangan_admin=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0",
        },
      );

    if (
      [
        "saveProduct",
        "saveSettings",
        "saveCoupon",
        "deleteCoupon",
        "uploadMedia",
        "updateOrder",
      ].includes(body.action) &&
      !(await admin(req))
    )
      return json({ error: "Admin sign-in required." }, 401);

    if (body.action === "uploadMedia") {
      if (
        !["image/png", "image/jpeg", "image/webp", "video/mp4", "video/webm"].includes(body.mime) ||
        typeof body.data !== "string" ||
        body.data.length > 50000000 ||
        !/^[A-Za-z0-9+/]*={0,2}$/.test(body.data)
      )
        return json({ error: "Upload an image or video under 25 MB." }, 400);

      const bytes = atob(body.data);
      const isWebm =
        bytes.charCodeAt(0) === 0x1a &&
        bytes.charCodeAt(1) === 0x45 &&
        bytes.charCodeAt(2) === 0xdf &&
        bytes.charCodeAt(3) === 0xa3;
      const good =
        body.mime === "image/png"
          ? bytes.startsWith("\x89PNG\r\n\x1a\n")
          : body.mime === "image/jpeg"
            ? bytes.startsWith("\xff\xd8\xff")
            : body.mime === "image/webp"
              ? bytes.startsWith("RIFF") && bytes.slice(8, 12) === "WEBP"
              : body.mime === "video/mp4"
                ? bytes.slice(4, 8) === "ftyp"
                : isWebm;

      if (!good)
        return json({ error: "Media format does not match the file." }, 400);

      const id = crypto.randomUUID();
      await db
        .prepare("INSERT INTO media (id,mime,data) VALUES (?,?,?)")
        .bind(id, body.mime, body.data)
        .run();

      const ext =
        body.mime === "image/png"
          ? ".png"
          : body.mime === "image/jpeg"
            ? ".jpg"
            : body.mime === "image/webp"
              ? ".webp"
              : body.mime === "video/mp4"
                ? ".mp4"
                : ".webm";

      return json({ url: "/api/media/" + id + ext });
    }

    if (body.action === "saveProduct") {
      const p = body.product as Product;
      if (
        !p ||
        !/^[-a-z0-9]{1,60}$/.test(p.id) ||
        /^(vase|oven)-/.test(p.id) ||
        !str(p.name, 100, 1) ||
        !categories.includes(p.category as (typeof categories)[number]) ||
        !Number.isInteger(p.price) ||
        p.price < 1 ||
        p.price > 1000000 ||
        !Number.isInteger(p.stock) ||
        p.stock < 0 ||
        p.stock > 100000 ||
        !validImage(p.image) ||
        !str(p.description, 2000) ||
        !str(p.material, 100, 1) ||
        !str(p.dimensions, 100) ||
        !str(p.color, 40, 1) ||
        !str(p.size, 60, 1) ||
        !str(p.seoTitle || "", 70) ||
        !str(p.seoDescription || "", 170)
      )
        return json(
          { error: "Check product fields, colour, size, price and stock." },
          400,
        );

      const clean = {
        id: p.id,
        name: p.name.trim(),
        category: p.category,
        price: p.price,
        stock: p.stock,
        image: p.image,
        description: p.description,
        material: p.material,
        dimensions: p.dimensions,
        color: p.color!.trim(),
        size: p.size!.trim(),
        tag: str(p.tag, 40) ? p.tag : "",
        seoTitle: p.seoTitle || "",
        seoDescription: p.seoDescription || "",
        imageSwitchTime: p.imageSwitchTime || 3,
      };

      await db
        .prepare(
          "INSERT INTO products (id,data) VALUES (?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data",
        )
        .bind(p.id, JSON.stringify(clean))
        .run();

      return json({ ok: true });
    }

    if (body.action === "saveSettings") {
      const s = body.settings as ShopSettings;
      const lengths = {
        announcement: 140,
        bannerTitle: 65,
        bannerText: 180,
        bannerEyebrow: 60,
        bannerAlt: 180,
        buttonText: 45,
        seoTitle: 70,
        seoDescription: 170,
      } as const;

      if (
        !s ||
        Object.entries(lengths).some(
          ([key, max]) =>
            !str(s[key as keyof typeof lengths] as string, max, 1),
        ) ||
        !validImage(s.bannerImage) ||
        !validImage(s.socialImage) ||
        !categories.includes(s.buttonCategory as (typeof categories)[number]) ||
        !["test", "live"].includes(s.paymentMode)
      )
        return json(
          {
            error:
              "Check banner and SEO fields. Title max 70, description max 170 characters.",
          },
          400,
        );

      let url: URL;
      try {
        url = new URL(s.siteUrl);
      } catch {
        return json({ error: "Enter a valid HTTPS website URL." }, 400);
      }

      if (
        url.protocol !== "https:" ||
        url.username ||
        url.password ||
        url.search ||
        url.hash ||
        url.pathname !== "/"
      )
        return json({ error: "Use your HTTPS site origin, without a path." }, 400);

      s.siteUrl = url.origin;
      const payment = paymentStatus(s);
      if (body.requirePaymentReady && !payment.ready)
        return json(
          {
            error:
              "Payment keys and webhook secret are not configured for this mode.",
          },
          400,
        );

      const clean: Partial<ShopSettings> = {};
      for (const key of [
        ...Object.keys(lengths),
        "bannerImage",
        "socialImage",
        "buttonCategory",
        "siteUrl",
        "paymentMode",
      ] as (keyof ShopSettings)[])
        clean[key] = s[key] as never;

      await saveConfig("settings", clean);
      return json({ ok: true });
    }

    if (body.action === "saveCoupon") {
      const c = body.coupon as Coupon;
      if (
        !c ||
        !str(c.code, 24, 3) ||
        !/^[A-Z0-9_\-]+$/.test(c.code) ||
        !["percent", "fixed"].includes(c.type) ||
        !Number.isInteger(c.value) ||
        c.value < 1 ||
        c.value > (c.type === "percent" ? 99 : 100000) ||
        !Number.isInteger(c.minOrder) ||
        c.minOrder < 0 ||
        c.minOrder > 1000000 ||
        typeof c.active !== "boolean" ||
        typeof c.expires !== "string" ||
        (c.expires &&
          (!/^\d{4}-\d{2}-\d{2}$/.test(c.expires) ||
            !Number.isFinite(Date.parse(c.expires))))
      )
        return json(
          { error: "Enter a valid coupon code, discount, minimum order and expiry." },
          400,
        );

      const list = await coupons();
      const next = list.filter((x) => x.code !== c.code);
      if (next.length >= 100) return json({ error: "Maximum 100 coupons." }, 400);

      next.push({
        code: c.code,
        type: c.type,
        value: c.value,
        minOrder: c.minOrder,
        expires: c.expires,
        active: c.active,
      });

      await saveConfig("coupons", next);
      return json({ ok: true });
    }

    if (body.action === "deleteCoupon") {
      await saveConfig(
        "coupons",
        (await coupons()).filter((c) => c.code !== body.code),
      );
      return json({ ok: true });
    }

    if (body.action === "saveState") {
      const uid = await user(req);
      if (!uid)
        return json(
          { error: "Refresh the page to start your shopping session." },
          401,
        );

      const state = body.state;
      if (
        !state ||
        !Array.isArray(state.wish) ||
        state.wish.length > 200 ||
        typeof state.bag !== "object" ||
        !state.bag ||
        Array.isArray(state.bag) ||
        Object.keys(state.bag).length > 200 ||
        state.wish.some(
          (x: unknown) => typeof x !== "string" || !/^[-a-z0-9]{1,60}$/.test(x),
        ) ||
        Object.entries(state.bag).some(
          ([key, value]) =>
            !/^[-a-z0-9]{1,60}$/.test(key) ||
            !Number.isInteger(value) ||
            Number(value) < 0 ||
            Number(value) > 20,
        )
      )
        return json({ error: "Invalid shopping state" }, 400);

      await db
        .prepare(
          "INSERT INTO shopping_state (user_id,data) VALUES (?,?) ON CONFLICT(user_id) DO UPDATE SET data=excluded.data",
        )
        .bind(uid, JSON.stringify(state))
        .run();

      return json({ ok: true });
    }
    if (body.action === "customerCancelOrder") {
      const uid = await user(req);
      if (!uid) return json({ error: "Unauthorized" }, 401);

      const existingOrder = await db.prepare("SELECT status FROM orders WHERE id=? AND user_id=?").bind(body.orderId, uid).first<{status: string}>();
      
      if (!existingOrder) return json({ error: "Order not found." }, 404);
      if (['Shipped', 'Delivered', 'Cancelled'].includes(existingOrder.status)) {
         return json({ error: "This order cannot be cancelled at its current stage." }, 400);
      }

      await db.prepare("UPDATE orders SET status='Cancelled' WHERE id=? AND user_id=?").bind(body.orderId, uid).run();
      return json({ ok: true });
    }

    if (body.action === "customerUpdateProfile") {
      const uid = await user(req);
      if (!uid || !uid.startsWith("customer:")) return json({ error: "Unauthorized" }, 401);
      
      const email = uid.slice("customer:".length);
      const name = typeof body.name === 'string' ? body.name.trim() : '';
      const lastName = typeof body.last_name === 'string' ? body.last_name.trim() : '';
      const phone = typeof body.phone === 'string' ? body.phone.replace(/\\D/g, '').slice(-10) : '';

      if (name.length < 2) return json({ error: "First name is required." }, 400);

      await db.prepare("UPDATE customers SET name=?, last_name=?, phone=? WHERE email=?")
        .bind(name, lastName, phone, email).run();
      
      return json({ ok: true });
    }

    
    if (body.action === "createCodOrder") {
      const uid = await user(req);
      if (!uid) return json({ error: "Unauthorized" }, 401);

      const cust = customer(body);
      const quoted = await quote(body.items, body.coupon);
      
      const orderId = crypto.randomUUID();
      const lines = quoted.items as { id: string; qty: number }[];

      const cfg = await settings();
      const live = cfg.paymentMode === "live";

      const shortage = live
        ? lines
            .map(
              () =>
                "COALESCE((SELECT CAST(json_extract(data,'$.stock') AS INTEGER) FROM products WHERE id=?),0) < ?",
            )
            .join(" OR ")
        : "0";
      const status = live
        ? `CASE WHEN (${shortage}) THEN 'COD - stock review' ELSE 'Received' END`
        : "'Received'";
      const shortageArgs = live ? lines.flatMap((line) => [line.id, line.qty]) : [];

      const writes = [
        db
          .prepare(
            `INSERT INTO orders (id,user_id,customer,address,phone,pincode,items,total,status,created_at,payment_method,payment_status,payment_id) VALUES (?,?,?,?,?,?,?,?,${status},?,?,?,?)`,
          )
          .bind(
            orderId,
            uid,
            cust.name,
            cust.address,
            cust.phone,
            cust.pincode,
            JSON.stringify(quoted.items),
            quoted.total,
            ...shortageArgs,
            new Date().toISOString(),
            "cod",
            "pending",
            ""
          ),
      ];

      if (live) {
        for (const line of lines) {
          writes.push(
            db
              .prepare(
                "UPDATE products SET data=json_set(data,'$.stock',MAX(0,CAST(json_extract(data,'$.stock') AS INTEGER)-?)) WHERE id=?",
              )
              .bind(line.qty, line.id),
          );
        }
      }

      await db.batch(writes);
      return json({ ok: true, id: orderId });
    }

    if (body.action === "quote") {
      try {
        return json(await quote(body.items, body.coupon));
      } catch (e: any) {
        return json({ error: e.message || String(e) }, 400);
      }
    }

    if (body.action === "updateOrder") {
      if (
        ![
          "Received",
          "Paid - stock review",
          "Packed",
          "Shipped",
          "Delivered",
          "Cancelled",
        ].includes(
          body.status,
        )
      )
        return json({ error: "Invalid status" }, 400);

      await db
        .prepare("UPDATE orders SET status=? WHERE id=?")
        .bind(body.status, body.id)
        .run();

      return json({ ok: true });
    }

    if (body.action === "placeOrder") {
      return json(
        { error: "Orders must be paid through Cashfree before confirmation." },
        409,
      );
    }

    return json({ error: "Unknown action" }, 400);
  } catch {
    return json({ error: "Could not save your changes. Please try again." }, 503);
  }
}

