import { E } from "../shop/../../shop-data";
import { NextResponse } from "next/server";

export async function GET() {
  const coupons = [
    { code: "WELCOME10", type: "percent", value: 10, minOrder: 500, expires: "2026-12-31", active: true },
    { code: "FESTIVE500", type: "fixed", value: 500, minOrder: 2000, expires: "2026-12-31", active: true }
  ];
  
  await E()
    .DB.prepare(
      "INSERT INTO store_config (id,data) VALUES (?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data",
    )
    .bind("coupons", JSON.stringify(coupons))
    .run();
    
  return NextResponse.json({ ok: true, coupons });
}
