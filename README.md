# VELTO — For a Warmer Home

Full source for the VELTO storefront and password-protected admin panel. React, TypeScript, Vinext and Cloudflare D1.

## Features
- Aprons, cushion covers and table covers only. Older oven/vase records are excluded without deleting historical orders.
- Colour, size, material, price and availability filters; search, wishlist, bag and demo checkout.
- Admin product editor with image upload, stock, colour, size and product SEO.
- Admin homepage banner image/text/button editor and promotion announcement.
- Percentage/fixed coupons with minimum order, expiry (India time) and enable/disable. Discounts are calculated on the server.
- Server-rendered SEO metadata, canonical URLs, social sharing tags, product pages, sitemap and noindex admin pages.
- Razorpay: server-created orders, signature/capture verification and idempotent authenticated webhooks.

## Run and deploy
Use Node 22.13+ and npm. Run `npm ci`, then `npm run dev` in the supported Cloudflare/Vinext environment. `npm run build` produces the Worker build; `npm start` runs the built Worker locally. Preserve the scripts and hosting configuration.

Bind Cloudflare D1 as `DB`. Apply the ordered SQL migrations in `drizzle/` using your hosting migration workflow. Configure `ADMIN_PASSWORD` as a strong server-side secret. Never commit real secrets.

`.openai/hosting.json` identifies the existing hosted Site. Reuse this project for updates. For separate self-hosting, configure equivalent Worker/D1 bindings. The archive excludes credentials, databases, customer data, node_modules and build output. Uploaded images, edited settings, coupons and orders are stored in D1; export the database separately if migrating live data.

## Admin guide
Open `/admin` and use the password supplied separately.
1. Products: edit details, stock, colour, size and SEO. One colour/size per product SKU; use separate products for separately stocked variants. Upload PNG/JPEG/WebP up to 1.5 MB.
2. Banner: edit image, alt text, announcement, heading, description and category button, then Save.
3. Coupons: enter a code, percentage/fixed discount, minimum spend and optional expiry. One code per order; payable total stays at least ₹1. Disable codes to stop future use.
4. SEO: edit homepage title, description, canonical site origin and social image. Product overrides are under Products. Sitemap: `/sitemap.xml`.
5. Payments: view configuration and select demo/test/live. Keys belong in hosting secrets, never public form fields.

## Razorpay setup — currently unconfigured
The default is demo. Configure these server secrets for test mode:
- RAZORPAY_KEY_ID
- RAZORPAY_KEY_SECRET
- RAZORPAY_WEBHOOK_SECRET

Enable automatic capture in Razorpay. Configure `https://YOUR-DOMAIN/api/payments/webhook` for `payment.captured` with the same signing secret. Select Razorpay test in admin. Complete test payments on your merchant account, including failed/cancelled payments and webhook retries.

Live mode additionally requires live keys and RAZORPAY_LIVE_ENABLED=true. Only then can admin enable it. Publish your actual delivery/return/privacy policies and confirm shipping/taxes before live use: current policy content describes the demo store, and checkout adds no shipping/tax surcharge. Refunds are performed in Razorpay; changing order status does not issue a refund.

Captured live payments decrement stock exactly once. Stock is not reserved while the payment window is open. Concurrent purchases that exceed available stock are marked `Paid - stock review`; staff must arrange fulfilment or a refund. Demo/test payments do not reduce inventory. Review uncertain provider orders in Razorpay before retrying.

Official integration reference: https://razorpay.com/docs/payments/payment-gateway/web-integration/standard/integration-steps/

## Validation
TypeScript; local admin authorization and persistent banner/SEO/product settings; image validation; coupon discounts/expiry; price integrity and duplicate cart rejection; unconfigured payment blocking; combined storefront filters. Mocked gateway checks cover server order amounts, idempotency, bad signatures, incorrect amounts, uncaptured payments, signed webhooks, guest sessions and exactly-once stock updates. No real merchant transaction was run because credentials were not supplied.
