import { E, user, settings, paymentStatus, quote, customer } from "../../shop-data";
import { cashfree, paymentSession, settle, seedStock, verifyCashfreeOrder } from "../../payments";

const json = (value: unknown, status = 200) =>
  Response.json(value, { status, headers: { "Cache-Control": "no-store" } });

function cashfreeOrderId(requestId: string) {
  return "velto_" + requestId.replace(/-/g, "");
}

export async function POST(req: Request) {
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

  try {
    const uid = await user(req);
    if (!uid) return json({ error: "Refresh the store before checkout." }, 401);

    const raw = await req.text();
    if (raw.length > 15000) return json({ error: "Request too large" }, 413);

    const body = JSON.parse(raw);

    if (body.action === "verify") {
      if (typeof body.orderId !== "string") {
        return json({ error: "Invalid payment verification." }, 400);
      }

      const session = await paymentSession(body.orderId);
      if (!session || session.user_id !== uid) {
        return json({ error: "Order not found." }, 404);
      }

      const snapshot = JSON.parse(session.data);
      const payment = await verifyCashfreeOrder(session.gateway_id, snapshot.mode);
      const id = await settle(session, payment);
      return json({ id, mode: snapshot.mode });
    }

    if (body.action !== "create") return json({ error: "Unknown action" }, 400);

    const cfg = await settings();
    const gateway = paymentStatus(cfg);
    if (!gateway.ready) return json({ error: "Online payments are not enabled yet." }, 503);
    if (typeof body.requestId !== "string" || !/^[a-f0-9-]{36}$/.test(body.requestId)) {
      return json({ error: "Invalid checkout request." }, 400);
    }

    const cust = customer(body);
    const quoted = await quote(body.items, body.coupon);
    const old = await E()
      .DB.prepare("SELECT * FROM checkout_sessions WHERE id=?")
      .bind(body.requestId)
      .first<any>();

    if (old) {
      if (old.user_id !== uid) return json({ error: "Order not found." }, 404);
      if (old.settled) return json({ error: "This order is already paid." }, 409);

      const snapshot = JSON.parse(old.data);
      if (old.gateway_id.startsWith("pending_")) {
        return json(
          { error: "Order creation is pending. Please contact support before retrying." },
          409,
        );
      }

      return json({
        id: old.id,
        orderId: old.gateway_id,
        paymentSessionId: snapshot.paymentSessionId,
        amount: snapshot.total,
        mode: snapshot.mode,
      });
    }

    await seedStock();
    const orderId = cashfreeOrderId(body.requestId);
    const origin = new URL(req.url).origin;
    const snapshot = {
      ...quoted,
      customer: cust,
      mode: cfg.paymentMode,
      paymentSessionId: "",
    };

    await E()
      .DB.prepare("INSERT INTO checkout_sessions(id,user_id,gateway_id,data,created_at) VALUES (?,?,?,?,?)")
      .bind(
        body.requestId,
        uid,
        "pending_" + body.requestId,
        JSON.stringify(snapshot),
        new Date().toISOString(),
      )
      .run();

    const remote = await cashfree(
      "orders",
      {
        order_id: orderId,
        order_amount: quoted.total,
        order_currency: "INR",
        customer_details: {
          customer_id: uid.replace(/^customer:/, "").replace(/[^A-Za-z0-9_-]/g, "_").slice(0, 40),
          customer_name: cust.name,
          customer_phone: cust.phone,
        },
        order_meta: {
          return_url: origin + "/?order_id={order_id}",
          notify_url: origin + "/api/payments/webhook",
        },
        order_note: "VELTO order " + body.requestId.slice(0, 8),
      },
      cfg.paymentMode,
    );

    await E()
      .DB.prepare("UPDATE checkout_sessions SET gateway_id=?,data=? WHERE id=?")
      .bind(
        orderId,
        JSON.stringify({ ...snapshot, paymentSessionId: remote.payment_session_id }),
        body.requestId,
      )
      .run();

    return json({
      id: body.requestId,
      orderId,
      paymentSessionId: remote.payment_session_id,
      amount: quoted.total,
      mode: cfg.paymentMode,
    });
  } catch (error) {
    return json({ error: (error as Error).message || "Payment could not be processed." }, 400);
  }
}
