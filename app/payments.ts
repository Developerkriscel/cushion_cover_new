import { E, ensureStoreSchema, products } from "./shop-data";

type CheckoutSession = {
  id: string;
  user_id: string;
  gateway_id: string;
  data: string;
  settled: number;
};

const API_VERSION = "2025-01-01";

function cashfreeBase(mode = "test") {
  return mode === "live"
    ? "https://api.cashfree.com/pg"
    : "https://sandbox.cashfree.com/pg";
}

export async function cashfree(path: string, body?: unknown, mode = "test") {
  const e = E();
  if (!e.CASHFREE_CLIENT_ID || !e.CASHFREE_CLIENT_SECRET) {
    throw Error("Cashfree payment gateway is not configured.");
  }

  const response = await fetch(cashfreeBase(mode) + "/" + path, {
    method: body ? "POST" : "GET",
    headers: {
      "Content-Type": "application/json",
      "x-api-version": API_VERSION,
      "x-client-id": e.CASHFREE_CLIENT_ID,
      "x-client-secret": e.CASHFREE_CLIENT_SECRET,
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw Error(data?.message || "Cashfree could not complete the request.");
  }

  return data as any;
}

export async function paymentSession(gatewayId: string) {
  return E()
    .DB.prepare("SELECT * FROM checkout_sessions WHERE gateway_id=?")
    .bind(gatewayId)
    .first<CheckoutSession>();
}

async function ensureOrderColumns() {
  await ensureStoreSchema();
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

function paidPayment(payments: any[]) {
  return payments.find((payment) => payment?.payment_status === "SUCCESS");
}

export async function verifyCashfreeOrder(orderId: string, mode = "test") {
  if (!/^[-_A-Za-z0-9]{3,80}$/.test(orderId)) {
    throw Error("Invalid Cashfree order reference.");
  }

  const payments = await cashfree(
    "orders/" + encodeURIComponent(orderId) + "/payments",
    undefined,
    mode,
  );

  if (!Array.isArray(payments)) {
    throw Error("Cashfree payment status could not be read.");
  }

  const payment = paidPayment(payments);
  if (!payment) {
    throw Error("Payment is not successful yet.");
  }

  return payment;
}

export async function settle(
  session: NonNullable<Awaited<ReturnType<typeof paymentSession>>>,
  payment: any,
) {
  const data = JSON.parse(session.data);
  const amount = Number(payment.payment_amount ?? payment.order_amount);

  if (
    payment.order_id !== session.gateway_id ||
    payment.payment_status !== "SUCCESS" ||
    (payment.payment_currency && payment.payment_currency !== "INR") ||
    amount !== data.total
  ) {
    throw Error("Payment is not successful or the amount does not match.");
  }

  if (session.settled) return session.id;

  await ensureOrderColumns();
  await seedStock();
  const db = E().DB;
  const customer = data.customer;
  const live = data.mode === "live";
  const lines = data.items as { id: string; qty: number }[];

  const shortage = live
    ? lines
        .map(
          () =>
            "COALESCE((SELECT CAST(json_extract(data,'$.stock') AS INTEGER) FROM products WHERE id=?),0) < ?",
        )
        .join(" OR ")
    : "0";
  const status = live
    ? `CASE WHEN (${shortage}) THEN 'Paid - stock review' ELSE 'Received' END`
    : "'Received'";
  const shortageArgs = live ? lines.flatMap((line) => [line.id, line.qty]) : [];
  const paymentId = String(payment.cf_payment_id || payment.payment_id || "");

  const writes = [
    db
      .prepare(
        `INSERT OR IGNORE INTO orders (id,user_id,customer,address,phone,pincode,items,total,status,created_at,payment_method,payment_status,payment_id) SELECT ?,?,?,?,?,?,?,?,${status},?,?,?,? WHERE EXISTS (SELECT 1 FROM checkout_sessions WHERE id=? AND settled=0)`,
      )
      .bind(
        session.id,
        session.user_id,
        customer.name,
        customer.address,
        customer.phone,
        customer.pincode,
        JSON.stringify(data.items),
        data.total,
        ...shortageArgs,
        new Date().toISOString(),
        "cashfree",
        "paid",
        paymentId,
        session.id,
      ),
  ];

  if (live) {
    for (const line of lines) {
      writes.push(
        db
          .prepare(
            "UPDATE products SET data=json_set(data,'$.stock',MAX(0,CAST(json_extract(data,'$.stock') AS INTEGER)-?)) WHERE id=? AND EXISTS(SELECT 1 FROM checkout_sessions WHERE id=? AND settled=0)",
          )
          .bind(line.qty, line.id, session.id),
      );
    }
  }

  writes.push(
    db
      .prepare("UPDATE checkout_sessions SET settled=1,data=? WHERE id=? AND settled=0")
      .bind(JSON.stringify({ ...data, paymentId }), session.id),
  );

  await db.batch(writes);
  return session.id;
}

export async function seedStock() {
  await ensureStoreSchema();
  for (const product of await products()) {
    await E()
      .DB.prepare("INSERT OR IGNORE INTO products(id,data) VALUES (?,?)")
      .bind(product.id, JSON.stringify(product))
      .run();
  }
}
