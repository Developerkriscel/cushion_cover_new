import Carousel from './carousel';
"use client";
import { useEffect, useRef, useState } from "react";
import {
  Tag,
  ArrowUpRight,
  ShoppingBag,
  Search,
  Heart,
  X,
  Plus,
  Minus,
  Truck,
  PackageCheck,
  Leaf,
  Box,
  ArrowRight,
  CreditCard,
  SlidersHorizontal,
  Grid2X2,
  Grid3X3,
  ChevronDown,
  Sparkles,
  User,
  Package,
  MapPin,
  LogOut,
  MoreVertical,
  ArrowLeft,
  Power,
} from "lucide-react";
import { initialProducts, Product, money } from "./catalog";
import StoreFooter from "./store-footer";
import { defaultSettings, ShopSettings, categories } from "./shop-config";
import { openCashfree } from "./cashfree-checkout";
import LoginForm from "./login-form";
import RegisterForm from "./register-form";
import AddressBook, { Address } from "./address-book";
export function downloadInvoice(order: any) {
  const items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;
  const html = `
    <html>
      <head>
        <meta charset="utf-8">
        <title>Invoice - #${order.id}</title>
        <style>
          body { font-family: system-ui, sans-serif; padding: 40px; color: #111; max-width: 800px; margin: 0 auto; }
          .header { display: flex; justify-content: space-between; border-bottom: 2px solid #eee; padding-bottom: 20px; }
          .header h1 { margin: 0; color: #0e7579; font-size: 36px; }
          .details { margin-top: 40px; display: flex; justify-content: space-between; line-height: 1.6; }
          table { width: 100%; border-collapse: collapse; margin-top: 40px; }
          th, td { padding: 12px; text-align: left; border-bottom: 1px solid #eee; }
          th { background: #f8fafc; font-weight: 600; color: #475569; }
          td { color: #1e293b; }
          .total { text-align: right; margin-top: 30px; font-size: 24px; font-weight: bold; color: #0f172a; }
          .footer { margin-top: 60px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; color: #64748b; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1>INVOICE</h1>
            <p style="color: #64748b; font-size: 14px;">Order #${order.id.slice(0, 8).toUpperCase()}</p>
          </div>
          <div style="text-align: right">
            <img src="${window.location.origin}/velto-logo.png" alt="VELTO" style="height: 36px; margin-bottom: 5px;" />
            <p style="color: #64748b; margin: 5px 0 0;">Date: ${new Date(order.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</p>
          </div>
        </div>
        <div class="details">
          <div>
            <strong style="color: #475569; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Billed To</strong><br/>
            <span style="font-size: 16px; font-weight: 600;">${order.customer}</span><br/>
            ${order.address}<br/>
            Phone: +91 ${order.phone}<br/>
            PIN: ${order.pincode}
          </div>
          <div style="text-align: right">
            <strong style="color: #475569; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Payment Method</strong><br/>
            ${order.payment_method === 'cod' ? 'Cash on Delivery' : 'Online Payment'}<br/><br/>
            <strong style="color: #475569; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Status</strong><br/>
            <span style="color: #0e7579; font-weight: 600;">${order.status}</span>
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th>Item</th>
              <th style="text-align: center;">Qty</th>
              <th style="text-align: right;">Price</th>
              <th style="text-align: right;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${items.map((item: any) => `
              <tr>
                <td>${item.name}</td>
                <td style="text-align: center;">${item.qty || item.quantity || 1}</td>
                <td style="text-align: right;">₹${item.price}</td>
                <td style="text-align: right; font-weight: 600;">₹${item.price * (item.qty || item.quantity || 1)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <div class="total">
          Grand Total: ₹${order.total}
        </div>
        <div class="footer">
          Thank you for shopping with Velto!<br/>
          If you have any questions, contact info@velto.com
        </div>
        <script>
          window.onload = () => {
            window.print();
          };
        </script>
      </body>
    </html>
  `;
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank');
}

export default function Store({
  initialSettings = defaultSettings,
  initialCatalog = initialProducts,
}: {
  initialSettings?: ShopSettings;
  initialCatalog?: Product[];
}) {
  const [products, setProducts] = useState(initialCatalog),
    [category, setCategory] = useState("All pieces"),
    [query, setQuery] = useState(""),
    [sort, setSort] = useState("Featured"),
    [wish, setWish] = useState<string[]>([]),
    [wishOnly, setWishOnly] = useState(false),
    [bag, setBag] = useState<Record<string, number>>({}),
    [drawer, setDrawer] = useState(false),
    [selected, setSelected] = useState<Product | null>(null),
    [checkout, setCheckout] = useState(false),
    [toast, setToast] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [success, setSuccess] = useState(""),
    [successMethod, setSuccessMethod] = useState("");
  const [settings, setSettings] = useState(initialSettings),
    [payment, setPayment] = useState<any>({ mode: "live", ready: false }),
    [color, setColor] = useState("all"),
    [size, setSize] = useState("all"),
    [material, setMaterial] = useState("all"),
    [minPrice, setMinPrice] = useState(""),
    [couponInput, setCouponInput] = useState(""),
    [coupon, setCoupon] = useState(""),
    [discount, setDiscount] = useState(0),
    [couponError, setCouponError] = useState("");
  const [filterOpen, setFilterOpen] = useState(false),
    [priceLimit, setPriceLimit] = useState("all"),
    [inStock, setInStock] = useState(false),
    [columns, setColumns] = useState(4);
  const [customer, setCustomer] = useState<{ name: string; last_name?: string; phone?: string; email?: string } | null>(null),
    [loginDrawer, setLoginDrawer] = useState(false),
    [authMode, setAuthMode] = useState<"login" | "register">("login"),
    [accountDropdown, setAccountDropdown] = useState(false),
    [accountTab, setAccountTab] = useState<"profile" | "orders" | "addresses" | "coupons" | "wishlist" | "bag">(
      "profile",
    );
  const [stateLoaded, setStateLoaded] = useState(false);
  const saveQueue = useRef(Promise.resolve());
  const [showHero, setShowHero] = useState(true);
  const [editingProfile, setEditingProfile] = useState(false);
  const [cancelOrderId, setCancelOrderId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [orders, setOrders] = useState<any[]>([]);
  const [addresses, setAddresses] = useState<any[]>([]);
  const [couponsList, setCouponsList] = useState<any[]>([]);
  const [trackingOrder, setTrackingOrder] = useState<string | null>(null);
  const [checkoutAddress, setCheckoutAddress] = useState<Address | null>(null);
  const [paymentMethod, setPaymentMethod] = useState("cashfree");
  const dialog = useRef<HTMLDialogElement>(null),
    detail = useRef<HTMLDialogElement>(null),
    loginDialogRef = useRef<HTMLDialogElement>(null),
    checkoutFormRef = useRef<HTMLFormElement>(null);
  const search = useRef<HTMLInputElement>(null);
  function applyShopData(d: any, fromCache = false) {
    if (!d?.products) {
      if (!fromCache) setError(d?.error || "Live stock is unavailable.");
      return;
    }
    setProducts(d.products);
    setSettings(d.settings || initialSettings);
    setPayment(d.payment || { mode: "live", ready: false });
    if (d.state) {
      const ids = new Set(d.products.map((p: Product) => p.id));
      setBag(
        Object.fromEntries(
          Object.entries(d.state.bag || {}).filter(([id]) => ids.has(id)),
        ) as Record<string, number>,
      );
      setWish((d.state.wish || []).filter((id: string) => ids.has(id)));
    }
    if (d.customer) {
      setCustomer(d.customer);
      setOrders(d.orders || []);
      setAddresses(d.addresses || []);
      setCouponsList(d.coupons || []);
    }
    if (!fromCache) setStateLoaded(true);
  }
  useEffect(() => {
    const cacheKey = "velto-shop-cache-v1";
    try {
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) applyShopData(JSON.parse(cached), true);
    } catch {}
    fetch("/api/shop")
      .then((r) => r.json())
      .then((d: any) => {
        applyShopData(d);
        if (d.products) sessionStorage.setItem(cacheKey, JSON.stringify(d));
      })
      .catch(() =>
        setError(
          "Live stock is unavailable. You can still browse the sample collection.",
        ),
      );
  }, []);
  useEffect(() => {
    if (!stateLoaded) return;
    const t = setTimeout(() => {
      const state = { bag, wish };
      saveQueue.current = saveQueue.current.then(async () => {
        try {
          const r = await fetch("/api/shop", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "saveState", state }),
          });
          if (!r.ok)
            setToast(
              "Could not save your bag and favourites. Please try again.",
            );
        } catch {
          setToast("Connection lost. Your changes are still visible here.");
        }
      });
    }, 450);
    return () => clearTimeout(t);
  }, [bag, wish, stateLoaded]);
  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(""), 3000);
      return () => clearTimeout(t);
    }
  }, [toast]);
  useEffect(() => {
    if (drawer) dialog.current?.showModal();
    else dialog.current?.close();
  }, [drawer]);
  useEffect(() => {
    if (selected) detail.current?.showModal();
    else detail.current?.close();
  }, [selected]);
  useEffect(() => {
    if (loginDrawer) loginDialogRef.current?.showModal();
    else loginDialogRef.current?.close();
  }, [loginDrawer]);
  const count = Object.values(bag).reduce((a, b) => a + b, 0);
  const cart = products.filter((p) => bag[p.id]);
  const total = cart.reduce((s, p) => s + p.price * bag[p.id], 0);
  const payableTotal = Math.max(total - discount, 0);
  const paymentLabel =
    payment.mode === "test"
      ? "Cashfree test payment"
      : "Cashfree secure online payment";
  const parseOrderItems = (items: unknown) => {
    if (Array.isArray(items)) return items;
    if (typeof items !== "string") return [];
    try {
      const parsed = JSON.parse(items);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };
  const orderDate = (order: any) => {
    const value = order.created_at || order.createdAt;
    const date = value ? new Date(value) : null;
    return date && !Number.isNaN(date.getTime())
      ? date.toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })
      : "Date unavailable";
  };
  const orderItemImage = (item: any) => {
    const savedImage = typeof item.image === "string" ? item.image : "";
    if (savedImage) return savedImage.split(",")[0];
    const product = products.find((p) => p.id === item.id);
    return product?.image?.split(",")[0] || "/placeholder.png";
  };
  const defaultAddress =
    addresses.find((address: Address) => address.isDefault) || addresses[0] || null;
  function beginCheckout(nextBag?: Record<string, number>) {
    if (!customer) {
      setLoginDrawer(true);
      setToast("Please log in to continue checkout.");
      return;
    }
    if (nextBag) setBag(nextBag);
    setCheckoutAddress(defaultAddress);
    setCheckout(true);
    setError("");
  }
  function add(p: Product) {
    if ((bag[p.id] || 0) >= Math.min(p.stock, 20)) {
      setToast("Available quantity reached");
      return;
    }
    setBag((b) => ({ ...b, [p.id]: (b[p.id] || 0) + 1 }));
    setToast(p.name + " added to your bag");
  }
  async function handleLogout() {
    setBusy(true);
    try {
      await fetch("/api/customer/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "customerLogout" }),
      });
      window.location.reload();
    } finally {
      setBusy(false);
    }
  }
  function choose(c: string) {
    setCategory(c);
    setWishOnly(false);
    setQuery("");
    setColor("all");
    setSize("all");
    setMaterial("all");
    setMinPrice("");
    setPriceLimit("all");
    setShowHero(false);
    document
      .getElementById("collection")
      ?.scrollIntoView({ behavior: "smooth" });
  }
  function goHome() {
    setCategory("All pieces");
    setWishOnly(false);
    setQuery("");
    setColor("all");
    setSize("all");
    setMaterial("all");
    setMinPrice("");
    setPriceLimit("all");
    setShowHero(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function favourite(id: string) {
    setWish((w) => (w.includes(id) ? w.filter((x) => x !== id) : [...w, id]));
  }
  let visible = products.filter(
    (p) =>
      (category === "All pieces" || p.category === category) &&
      (!wishOnly || wish.includes(p.id)) &&
      (!inStock || p.stock > 0) &&
      (priceLimit === "all" || p.price <= Number(priceLimit)) &&
      p.price >= Number(minPrice || 0) &&
      (color === "all" || p.color === color) &&
      (size === "all" || p.size === size) &&
      (material === "all" || p.material === material) &&
      p.name.toLowerCase().includes(query.toLowerCase()),
  );
  if (sort === "Price: low to high")
    visible = [...visible].sort((a, b) => a.price - b.price);
  if (sort === "Price: high to low")
    visible = [...visible].sort((a, b) => b.price - a.price);
  useEffect(() => {
    let active = true;
    setDiscount(0);
    setCouponError("");
    if (coupon && cart.length)
      fetch("/api/shop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "quote",
          items: cart.map((p) => ({ id: p.id, qty: bag[p.id] })),
          coupon,
        }),
      })
        .then(async (r) => {
          const d: any = await r.json();
          if (active) {
            if (r.ok) setDiscount(d.discount);
            else setCouponError(d.error);
          }
        })
        .catch(() => {
          if (active)
            setCouponError("Could not validate coupon. Please retry.");
        });
    return () => {
      active = false;
    };
  }, [coupon, bag, products]);
  useEffect(() => {
    const ctx = (document as any).modelContext;
    if (!ctx?.registerTool) return;
    const life = new AbortController();
    Promise.resolve(
      ctx.registerTool(
        {
          name: "filter_catalog",
          title: "Filter the collection",
          description:
            "Change the visible product search and category. Does not place an order.",
          inputSchema: {
            type: "object",
            properties: {
              query: { type: "string" },
              category: { type: "string", enum: ["All pieces", ...categories] },
            },
            additionalProperties: false,
          },
          annotations: { readOnlyHint: false },
          execute: async (input: any) => {
            if (
              !input ||
              typeof input !== "object" ||
              (input.query !== undefined && typeof input.query !== "string") ||
              (input.category !== undefined &&
                !["All pieces", ...categories].includes(input.category))
            )
              throw Error("Invalid filter");
            setQuery(input.query || "");
            setCategory(input.category || "All pieces");
            setWishOnly(false);
            document.getElementById("collection")?.scrollIntoView();
            await new Promise((r) => setTimeout(r, 0));
            return {
              query: input.query || "",
              category: input.category || "All pieces",
            };
          },
        },
        { signal: life.signal },
      ),
    ).catch(() => {});
    return () => life.abort();
  }, []);
  async function order(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!cart.length) {
      setError("Your bag is empty.");
      return;
    }
    if (!checkoutAddress) {
      setError("Please add and select a delivery address first.");
      return;
    }
    if (paymentMethod === "cashfree" && !payment.ready) {
      setError("Online payment is not configured. Please contact VELTO support.");
      return;
    }
    setBusy(true);
    setError("");
    const f = Object.fromEntries(new FormData(e.currentTarget));
    const body = {
      ...f,
      items: cart.map((p) => ({ id: p.id, qty: bag[p.id] })),
      coupon,
      paymentMethod,
    };
    try {
      if (paymentMethod === "cod") {
        const r = await fetch("/api/shop", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...body,
            action: "createCodOrder",
          }),
        });
        const d = await r.json();
        if (!r.ok) throw Error(d.error);
        setSuccessMethod("cod");
        setSuccess(d.id);
        setBag({});
        setCheckout(false);
        setDrawer(false);
        setCoupon("");
        setCouponInput("");
        fetch("/api/shop").then(r => r.json()).then(resp => { if(resp.orders) setOrders(resp.orders); });
        return;
      }
      let d: any;
      const r = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...body,
          action: "create",
          requestId: crypto.randomUUID(),
        }),
      });
      const session: any = await r.json();
      if (!r.ok) throw Error(session.error);
      await openCashfree(session);
      const vr = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "verify", orderId: session.orderId }),
      });
      d = await vr.json();
      if (!vr.ok)
        throw Error(
          d.error + " Contact support with order " + session.orderId,
        );
      setSuccess(d.id);
      setBag({});
      setCheckout(false);
      setDrawer(false);
      setCoupon("");
      setCouponInput("");
      fetch("/api/shop")
        .then((r) => r.json())
        .then((resp) => {
          if (resp.orders) setOrders(resp.orders);
        });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <div className="storefront">
        <div className="announcement">
          {settings.announcement}
          <Sparkles size={14} />
        </div>
        <header className="nav">
          <a
            className="brand velto-brand"
            href="/"
            aria-label="VELTO — For a Warmer Home"
          >
            <img src="/velto-logo.png" alt="VELTO — For a Warmer Home" />
          </a>
          <nav aria-label="Shop categories">
            <button
              className={
                category === "All pieces" && !showHero ? "nav-active" : ""
              }
              onClick={() => choose("All pieces")}
            >
              Shop all
            </button>
            <button
              className={category === "Cushion covers" ? "nav-active" : ""}
              onClick={() => choose("Cushion covers")}
            >
              Cushion covers
            </button>
            <button
              className={category === "Aprons" ? "nav-active" : ""}
              onClick={() => choose("Aprons")}
            >
              Aprons
            </button>
            <button
              className={category === "Table covers" ? "nav-active" : ""}
              onClick={() => choose("Table covers")}
            >
              Table covers
            </button>
          </nav>
          <div className="nav-actions">
            <label className="nav-search">
              <Search size={18} />
              <input
                ref={search}
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setCategory("All pieces");
                  setWishOnly(false);
                  setShowHero(false);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter")
                    document.getElementById("collection")?.scrollIntoView();
                }}
                placeholder="Search your happy things"
                aria-label="Search collection"
              />
            </label>
            <div
              style={{
                position: "relative",
                display: "flex",
                alignItems: "center",
              }}
            >
              <button
                aria-label="Account"
                onClick={() => {
                  if (!customer) {
                    setLoginDrawer(true);
                    setAccountTab("profile");
                  } else {
                    setAccountDropdown(!accountDropdown);
                  }
                }}
                style={{ display: "flex", alignItems: "center", gap: "6px" }}
              >
                <User size={21} fill={customer ? "currentColor" : "none"} />
                {customer && (
                  <span
                    style={{
                      fontSize: "15px",
                      color: "#185c62",
                      display: "flex",
                      alignItems: "center",
                      gap: "2px",
                    }}
                  >
                    {customer.name}{" "}
                    <ChevronDown
                      size={14}
                      style={{
                        transform: accountDropdown ? "rotate(180deg)" : "none",
                        transition: "transform 0.2s",
                      }}
                    />
                  </span>
                )}
              </button>
              {customer && accountDropdown && (
                <div
                  style={{ position: "fixed", inset: 0, zIndex: 90 }}
                  onClick={() => setAccountDropdown(false)}
                ></div>
              )}
              {customer && accountDropdown && (
                <div className="account-dropdown">
                  {" "}
                  <button
                    className="dropdown-item"
                    onClick={() => {
                      setAccountTab("profile");
                      setLoginDrawer(true);
                      setAccountDropdown(false);
                    }}
                  >
                    <User size={16} /> My Profile
                  </button>{" "}
                  <button
                    className="dropdown-item"
                    onClick={() => {
                      setAccountTab("orders");
                      setLoginDrawer(true);
                      setAccountDropdown(false);
                    }}
                  >
                    <Package size={16} /> Orders
                  </button>{" "}
                  <button
                    className="dropdown-item"
                    onClick={() => {
                      setAccountTab("addresses");
                      setLoginDrawer(true);
                      setAccountDropdown(false);
                    }}
                  >
                    <MapPin size={16} /> Saved Addresses
                  </button>{" "}
                  <button
                    className="dropdown-item logout"
                    onClick={() => {
                      handleLogout();
                      setAccountDropdown(false);
                    }}
                  >
                    <LogOut size={16} /> Logout
                  </button>
                </div>
              )}
            </div>
            <button
              aria-label="View wishlist"
              onClick={() => {
                const next = !wishOnly;
                setWishOnly(next);
                if (next) {
                  setCategory("All pieces");
                  setQuery("");
                  setPriceLimit("all");
                  setInStock(false);
                  setColor("all");
                  setSize("all");
                  setMaterial("all");
                  setMinPrice("");
                }
                setShowHero(false);
                document.getElementById("collection")?.scrollIntoView();
              }}
            >
              <Heart size={21} fill={wishOnly ? "currentColor" : "none"} />
            </button>
            <button
              className="bag-icon"
              aria-label={"Open shopping bag, " + count + " items"}
              onClick={() => setDrawer(true)}
            >
              <ShoppingBag size={21} />
              <span>{count}</span>
            </button>
          </div>
        </header>
        <main>
          {showHero && (
            <section className="collection-banner">
              <div className="banner-copy">
                <span className="eyebrow">{settings.bannerEyebrow}</span>
                <h1>{settings.bannerTitle}</h1>
                <p>{settings.bannerText}</p>
                <button
                  onClick={() => choose(settings.buttonCategory)}
                  className="banner-cta"
                >
                  {settings.buttonText} <ArrowRight size={18} />
                </button>
              </div>
              <div className="banner-photo">
                <Carousel images={settings.bannerImage ? settings.bannerImage.split(',') : ['/Sofa_with_colorful_cushion_covers_20260924122043.mp4']} alt={settings.bannerAlt} />
                <span className="banner-stamp">
                  HAPPY HOME
                  <br />
                  HAPPY YOU
                </span>
              </div>
            </section>
          )}
          <div className="collection-breadcrumb">
            <button onClick={goHome}>Home</button>
            <span>/</span>
            <span>
              {wishOnly
                ? "Wishlist"
                : category === "All pieces"
                  ? "Home textiles"
                  : category}
            </span>
          </div>
          <section id="collection" className="collection">
            <div className="section-heading">
              <span className="eyebrow">LITTLE THINGS. BIG PERSONALITY.</span>
              <h2>
                {wishOnly
                  ? "YOUR WISHLIST"
                  : category === "All pieces"
                    ? "FIND YOUR HAPPY THINGS"
                    : category.toUpperCase()}
              </h2>
              <p>
                {category === "Cushion covers"
                  ? "A fresh look for your favourite corner. Explore prints, textures and a little everyday joy."
                  : category === "Aprons"
                    ? "For messy recipes, happy kitchens and the joy of making something."
                    : category === "Table covers"
                      ? "Colourful gatherings begin with a thoughtfully dressed table."
                      : ""}
              </p>
            </div>

            {!wishOnly && (
              <>
              <div className="collection-toolbar">
              <div className="view-controls">
                <button
                  aria-label="Show larger product images"
                  aria-pressed={columns === 3}
                  onClick={() => setColumns(3)}
                >
                  <Grid2X2 size={20} />
                </button>
                <button
                  aria-label="Show compact product images"
                  aria-pressed={columns === 4}
                  onClick={() => setColumns(4)}
                >
                  <Grid3X3 size={20} />
                </button>
              </div>
              <span className="result-count">{visible.length} products</span>
              <div className="filter-tools">
                <select
                  aria-label="Sort products"
                  value={sort}
                  onChange={(e) => setSort(e.target.value)}
                >
                  {["Featured", "Price: low to high", "Price: high to low"].map(
                    (s) => (
                      <option key={s}>{s}</option>
                    ),
                  )}
                </select>
                <button
                  className="filter-button"
                  aria-expanded={filterOpen}
                  aria-controls="product-filters"
                  onClick={() => setFilterOpen(!filterOpen)}
                >
                  <SlidersHorizontal size={17} /> Filter{" "}
                  <ChevronDown size={14} />
                </button>
              </div>
            </div>
            {filterOpen && !wishOnly && (
              <div className="filter-panel" id="product-filters">
                <label>
                  Shop by price
                  <select
                    aria-label="Maximum price"
                    value={priceLimit}
                    onChange={(e) => setPriceLimit(e.target.value)}
                  >
                    <option value="all">All prices</option>
                    <option value="1000">Under ₹1,000</option>
                    <option value="2000">Under ₹2,000</option>
                    <option value="3000">Under ₹3,000</option>
                  </select>
                </label>
                <label>
                  Minimum price
                  <input
                    type="number"
                    aria-label="Minimum price"
                    min="0"
                    value={minPrice}
                    onChange={(e) => setMinPrice(e.target.value)}
                  />
                </label>
                {[
                  ["Colour", color, setColor, "color"],
                  ["Size", size, setSize, "size"],
                  ["Material", material, setMaterial, "material"],
                ].map(([label, value, setter, key]) => (
                  <label key={String(label)}>
                    {String(label)}
                    <select
                      aria-label={String(label)}
                      value={String(value)}
                      onChange={(e) =>
                        (setter as (v: string) => void)(e.target.value)
                      }
                    >
                      <option value="all">
                        All {String(label).toLowerCase()}s
                      </option>
                      {[
                        ...new Set(
                          products
                            .filter(
                              (p) =>
                                category === "All pieces" ||
                                p.category === category,
                            )
                            .map((p) => String(p[key as keyof Product] || "")),
                        ),
                      ]
                        .filter(Boolean)
                        .sort()
                        .map((v) => (
                          <option key={v}>{v}</option>
                        ))}
                    </select>
                  </label>
                ))}
                <label className="stock-filter">
                  <input
                    type="checkbox"
                    checked={inStock}
                    onChange={(e) => setInStock(e.target.checked)}
                  />{" "}
                  In-stock pieces only
                </label>
                <button
                  className="text-link"
                  onClick={() => {
                    setPriceLimit("all");
                    setInStock(false);
                    setColor("all");
                    setSize("all");
                    setMaterial("all");
                    setMinPrice("");
                    setQuery("");
                  }}
                >
                  Clear filters
                </button>
              </div>
            )}
              </>
            )}
            {query && (
              <div className="search-summary">
                Results for “{query}”{" "}
                <button aria-label="Clear search" onClick={() => setQuery("")}>
                  <X size={16} />
                </button>
              </div>
            )}
            {error && !drawer && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
            <div
              className={
                "product-grid columns-" +
                columns +
                " " +
                (visible.length === 1 ? "single-product" : "")
              }
            >
              {visible.map((p, i) => (
                <article className="product-card" key={p.id}>
                  <div
                    className="product-image"
                    onPointerMove={(e) => {
                      if (
                        e.pointerType === "touch" ||
                        matchMedia("(prefers-reduced-motion: reduce)").matches
                      )
                        return;
                      const r = e.currentTarget.getBoundingClientRect();
                      e.currentTarget.style.transform = `perspective(800px) rotateY(${((e.clientX - r.left) / r.width - 0.5) * 9}deg) rotateX(${((e.clientY - r.top) / r.height - 0.5) * -9}deg)`;
                    }}
                    onPointerLeave={(e) => {
                      if (e.pointerType === "touch") return;
                      e.currentTarget.style.transform = "none";
                    }}
                  >
                    <button
                      className={
                        "product-photo " +
                        (p.id.includes("sand")
                          ? "sand"
                          : p.id.includes("terracotta")
                            ? "clay"
                            : "")
                      }
                      aria-label={"View " + p.name}
                      onClick={() => setSelected(p)}
                    >
                      <Carousel images={p.image.split(',')} alt={p.name} switchTime={p.imageSwitchTime || 3} hideControls={true} />
                    </button>
                    <span className="product-tag">{p.tag}</span>
                    <button
                      className="wish"
                      style={{ zIndex: 9999, cursor: 'pointer', position: 'absolute' }}
                      aria-label={
                        (wish.includes(p.id) ? "Remove from" : "Add to") +
                        " wishlist: " +
                        p.name
                      }
                      aria-pressed={wish.includes(p.id)}
                      onPointerDown={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        favourite(p.id);
                      }}
                    >
                      <Heart
                        size={18}
                        style={{ pointerEvents: 'none' }}
                        fill={wish.includes(p.id) ? "currentColor" : "none"}
                      />
                    </button>
                    <button
                      className="quick-add"
                      disabled={!p.stock}
                      onClick={() => add(p)}
                    >
                      {p.stock ? "ADD TO BAG" : "SOLD OUT"}
                      <Plus size={17} />
                    </button>
                  </div>
                  <div className="product-info">
                    <div>
                      <span>{p.material}</span>
                      <button
                        className="product-title"
                        onClick={() => setSelected(p)}
                      >
                        {p.name}
                      </button>
                    </div>
                    <strong>{money(p.price)}</strong>
                  </div>
                  <div className="colour-row">
                    <span>
                      {p.color} · {p.size}
                    </span>
                    <span>{p.stock > 0 ? "In stock" : "Sold out"}</span>
                  </div>
                </article>
              ))}
            </div>
            {!visible.length && (
              <div className="empty">
                <Heart />
                <h3>{wishOnly ? "Your wishlist is empty" : "Nothing here just yet."}</h3>
                <p>{wishOnly ? "Explore the store and heart pieces you love to save them here." : "Try another search or save a piece you love."}</p>
                <button
                  className="text-link"
                  onClick={() => {
                    setWishOnly(false);
                    setCategory("All pieces");
                    setQuery("");
                    setPriceLimit("all");
                    setInStock(false);
                    setColor("all");
                    setSize("all");
                    setMaterial("all");
                    setMinPrice("");
                  }}
                >
                  Explore all pieces <ArrowRight size={17} />
                </button>
              </div>
            )}
            <p className="sample-note">
              Prices, finishes and product details are updated by VELTO.
            </p>
          </section>
          <section className="promo-video-section" style={{ width: "100%" }}>
            <video
              src="/hero_video_2.mp4"
              autoPlay
              loop
              muted
              playsInline
              preload="none"
              style={{
                width: "100%",
                height: "60vh",
                maxHeight: "550px",
                objectFit: "cover",
                display: "block",
              }}
            />
          </section>
          <section className="closing">
            <span className="eyebrow">A LITTLE MORE YOU</span>
            <h2>Life looks better in colour.</h2>
            <p>Mix your prints. Find your favourites. Make yourself at home.</p>
            <button className="text-link" onClick={() => choose("All pieces")}>
              Make yourself at home <ArrowRight size={18} />
            </button>
          </section>
        </main>
        <StoreFooter onShop={choose} mode={payment.mode} />
      </div>
      {toast && (
        <div className="toast" role="status">
          <PackageCheck size={18} />
          {toast}
        </div>
      )}
      \n{" "}
      <dialog
        ref={detail}
        className="product-dialog"
        onCancel={() => setSelected(null)}
      >
        {selected && (
          <>
            <button
              className="close"
              aria-label="Close product"
              onClick={() => setSelected(null)}
            >
              <X />
            </button>
            <div className="detail-grid">
              <Carousel images={selected.image.split(',')} alt={selected.name} switchTime={selected.imageSwitchTime || 3} hideControls={false} />
              <div className="detail-copy">
                <span className="eyebrow">{selected.category}</span>
                <h2>{selected.name}</h2>
                <strong className="detail-price">
                  {money(selected.price)}
                </strong>
                <p>{selected.description}</p>
                <dl>
                  <div>
                    <dt>Material</dt>
                    <dd>{selected.material}</dd>
                  </div>
                  <div>
                    <dt>Dimensions</dt>
                    <dd>{selected.dimensions}</dd>
                  </div>
                  <div>
                    <dt>Care</dt>
                    <dd>
                      {selected.material.includes("cotton") ||
                      selected.material.includes("Cotton")
                        ? "Gentle cold wash. Air dry. Do not bleach."
                        : "Hand wash gently. Dry with a soft cloth."}
                    </dd>
                  </div>
                </dl>
                <button
                  className="primary"
                  disabled={!selected.stock}
                  onClick={() => add(selected)}
                >
                  {selected.stock ? "Add to bag" : "Sold out"}
                  <ShoppingBag size={18} />
                </button>
                <a className="text-link" href={"/products/" + selected.id}>
                  View full product details <ArrowUpRight size={16} />
                </a>
              </div>
            </div>
          </>
        )}
      </dialog>
      <dialog
        ref={dialog}
        className={`cart-dialog ${checkout ? "checkout-modal-full" : ""}`}
        onCancel={() => setDrawer(false)}
      >
        {checkout ? null : (
          <div className="cart-head">
            <h2>
              {success ? "Order saved" : "Your bag"}{" "}
              <small>{!success && `(${count})`}</small>
            </h2>
            <button
              aria-label="Close shopping bag"
              onClick={() => setDrawer(false)}
            >
              <X />
            </button>
          </div>
        )}
        {checkout ? (
          <div className="checkout-full-page">
            <div className="checkout-header">
              <div className="brand velto-brand">
                <img
                  src="/velto-logo.png"
                  alt="VELTO"
                  style={{ height: "32px" }}
                />
              </div>
              <h2>Checkout</h2>
              <div style={{ flex: 1 }} />
              <button
                type="button"
                onClick={() => setCheckout(false)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  fontSize: "14px",
                  color: "#137a7f",
                  fontWeight: 600,
                  padding: "8px 16px",
                  background: "rgba(19, 122, 127, 0.08)",
                  borderRadius: "12px",
                  border: "none",
                  cursor: "pointer",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                }}
              >
                <ArrowLeft size={16} /> Back to Store
              </button>
            </div>
            <form
              ref={checkoutFormRef}
              onSubmit={order}
              className="checkout-layout-grid"
            >
              <div className="checkout-left">
                <div className="checkout-step active">
                  <div className="step-header">
                    1<span className="step-title">Delivery Details</span>
                    {checkoutAddress && <span className="step-check">✔</span>}
                  </div>
                  <div className="step-content">
                    <div style={{ marginBottom: '20px', paddingBottom: '20px', borderBottom: '1px dashed #e1e6eb' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <strong style={{ fontSize: '15px', color: '#131e2d' }}>
                          {customer?.name} {customer?.last_name}
                        </strong>
                        {customer?.phone && (
                          <span style={{ fontSize: '14px', color: '#4b5563', fontWeight: 500 }}>
                            +91 {customer.phone}
                          </span>
                        )}
                      </div>
                      {customer?.email && (
                        <div style={{ fontSize: '14px', color: '#6b7280', marginTop: '6px' }}>
                          {customer.email}
                        </div>
                      )}
                    </div>
                    {!checkoutAddress ? (
                      <>
                        <h4
                          style={{
                            fontSize: "16px",
                            marginBottom: "15px",
                            color: "#185c62",
                          }}
                        >
                          {addresses.length > 0
                            ? "Select a delivery address:"
                            : "Add a delivery address:"}
                        </h4>
                        <AddressBook
                          addresses={addresses}
                          onUpdate={setAddresses}
                          onSelect={(a) => {
                            setCheckoutAddress(a);
                            setToast("Address applied!");
                          }}
                        />
                      </>
                    ) : (
                      <>
                        <div className="selected-address-block">
                          <p>
                            <strong>{checkoutAddress.fullName}</strong>{" "}
                            <span className="address-badge">HOME</span>
                          </p>
                          <p>
                            {checkoutAddress.line1} {checkoutAddress.line2}{" "}
                            {checkoutAddress.city}, {checkoutAddress.state} -{" "}
                            {checkoutAddress.pincode}
                          </p>
                          <p style={{ marginTop: "8px" }}>
                            <strong>{checkoutAddress.phone}</strong>
                          </p>
                          <button
                            type="button"
                            className="text-link change-btn"
                            onClick={() => setCheckoutAddress(null)}
                          >
                            Change
                          </button>
                        </div>
                        <input
                          type="hidden"
                          name="name"
                          value={checkoutAddress.fullName}
                        />
                        <input
                          type="hidden"
                          name="phone"
                          value={checkoutAddress.phone}
                        />
                        <input
                          type="hidden"
                          name="address"
                          value={`${checkoutAddress.line1}\n${checkoutAddress.line2 ? checkoutAddress.line2 + "\n" : ""}${checkoutAddress.city}, ${checkoutAddress.state}\n${checkoutAddress.country}`}
                        />
                        <input
                          type="hidden"
                          name="pincode"
                          value={checkoutAddress.pincode}
                        />
                      </>
                    )}
                  </div>
                </div>
                <div className="checkout-step active">
                  <div className="step-header">
                    2<span className="step-title">Order Summary</span>
                  </div>
                  <div className="step-content cart-items-summary">
                    {cart.map((p) => (
                      <div className="summary-item" key={p.id}>
                        <div style={{ width: '90px', height: '90px', flexShrink: 0, borderRadius: '12px', overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}>
                          <Carousel images={p.image.split(',')} alt={p.name} switchTime={p.imageSwitchTime || 3} hideControls={true} />
                        </div>
                        <div>
                          <h4>{p.name}</h4>
                          <p className="summary-price">{money(p.price)}</p>
                          <span className="summary-qty">Qty: {bag[p.id]}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className={`checkout-step ${checkoutAddress ? "active" : ""}`}>
                  <div className="step-header">
                    3<span className="step-title">Payment</span>
                  </div>
                  <div className="step-content">
                    <div
                      style={{
                        display: "grid",
                        gap: "12px",
                      }}
                    >
                      <label
                        style={{
                          display: "flex",
                          alignItems: "flex-start",
                          gap: "12px",
                          padding: "16px",
                          border: paymentMethod === "cashfree" ? "2px solid #0e7579" : "1px solid #e1e6eb",
                          background: paymentMethod === "cashfree" ? "#f0fdfa" : "#fff",
                          borderRadius: "10px",
                          cursor: "pointer",
                          transition: "all 0.2s"
                        }}
                        onClick={() => setPaymentMethod("cashfree")}
                      >
                        <input
                          type="radio"
                          name="paymentMethod"
                          value="cashfree"
                          checked={paymentMethod === "cashfree"}
                          onChange={() => setPaymentMethod("cashfree")}
                          style={{ marginTop: "4px" }}
                        />
                        <span>
                          <strong
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "8px",
                              color: "#185c62",
                            }}
                          >
                            <CreditCard size={17} /> {paymentLabel}
                          </strong>
                          <small
                            style={{
                              display: "block",
                              marginTop: "6px",
                              color: "#60706c",
                              lineHeight: 1.6,
                            }}
                          >
                            {payment.mode === "test"
                              ? "Cashfree opens in sandbox mode for payment verification."
                              : "Cashfree opens a secure payment window before the order is confirmed."}
                          </small>
                        </span>
                      </label>
                      <label
                        style={{
                          display: "flex",
                          alignItems: "flex-start",
                          gap: "12px",
                          padding: "16px",
                          border: paymentMethod === "cod" ? "2px solid #0e7579" : "1px solid #e1e6eb",
                          background: paymentMethod === "cod" ? "#f0fdfa" : "#fff",
                          borderRadius: "10px",
                          cursor: "pointer",
                          transition: "all 0.2s"
                        }}
                        onClick={() => setPaymentMethod("cod")}
                      >
                        <input
                          type="radio"
                          name="paymentMethod"
                          value="cod"
                          checked={paymentMethod === "cod"}
                          onChange={() => setPaymentMethod("cod")}
                          style={{ marginTop: "4px" }}
                        />
                        <span>
                          <strong
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "8px",
                              color: "#0f172a",
                            }}
                          >
                            <Package size={17} /> Cash on Delivery (COD)
                          </strong>
                          <small
                            style={{
                              display: "block",
                              marginTop: "6px",
                              color: "#64748b",
                              lineHeight: 1.6,
                            }}
                          >
                            Pay with cash or UPI directly to the delivery agent upon receiving your order.
                          </small>
                        </span>
                      </label>
                      {paymentMethod === "cashfree" && !payment.ready && (
                        <p className="error" role="alert">
                          Cashfree payment is not configured. Add Cashfree keys before accepting orders.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              <div className="checkout-right">
                <div className="price-details-card">
                  <h3>Price Details</h3>
                  <div className="price-row">
                    <span>Price ({count} items)</span>
                    <span>{money(total)}</span>
                  </div>
                  <div className="price-row">
                    <span>Discount</span>
                    <span style={{ color: "#388e3c" }}>
                      - {money(discount)}
                    </span>
                  </div>
                  <div className="price-row">
                    <span>Delivery Charges</span>
                    <span style={{ color: "#388e3c" }}>Free</span>
                  </div>
                  <div className="price-total">
                    <span>Total Amount</span>
                    <span>{money(payableTotal)}</span>
                  </div>
                  <div className="price-savings">
                    You will save {money(discount)} on this order
                  </div>
                  <div
                    style={{
                      marginTop: "16px",
                      padding: "14px",
                      background: "#f5f8f6",
                      border: "1px solid #d8e4de",
                      borderRadius: "10px",
                      fontSize: "13px",
                      lineHeight: 1.6,
                    }}
                  >
                    <strong style={{ color: "#185c62" }}>Payment method</strong>
                    <br />
                    {paymentMethod === "cod" ? "Cash on Delivery" : paymentLabel}
                  </div>
                  {error && (
                    <div
                      style={{
                        color: "#d32f2f",
                        background: "#ffebee",
                        padding: "10px",
                        borderRadius: "8px",
                        marginTop: "15px",
                        fontSize: "13px",
                        fontWeight: "bold",
                      }}
                    >
                      {error}
                    </div>
                  )}
                  <button
                    type="submit"
                    className="continue-btn"
                    disabled={busy || (paymentMethod === "cashfree" && !payment.ready)}
                  >
                    {busy
                      ? "Processing..."
                      : paymentMethod === "cod" ? `Place Order` : `Pay ${money(payableTotal)}`}
                  </button>
                </div>
              </div>
            </form>
          </div>
        ) : cart.length ? (
          <>
            <div className="cart-items">
              {cart.map((p) => (
                <div className="cart-item" key={p.id}>
                  <div className="cart-item-content">
                    <div style={{ width: '85px', height: '105px', flexShrink: 0, borderRadius: '6px', overflow: 'hidden' }}>
                      <Carousel images={p.image.split(',')} alt={p.name} switchTime={p.imageSwitchTime || 3} hideControls={true} />
                    </div>
                    <div className="cart-item-info">
                      <h3>{p.name}</h3>
                      <p>{money(p.price)}</p>
                      <div className="quantity">
                        <button
                          type="button"
                          aria-label={"Reduce " + p.name}
                          onClick={() =>
                            setBag((b) => ({
                              ...b,
                              [p.id]: Math.max(0, b[p.id] - 1),
                            }))
                          }
                        >
                          <Minus size={14} />
                        </button>
                        <span>{bag[p.id]}</span>
                        <button
                          type="button"
                          aria-label={"Increase " + p.name}
                          onClick={() => add(p)}
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="cart-item-actions-row">
                    <button
                      type="button"
                      onClick={() => setBag((b) => ({ ...b, [p.id]: 0 }))}
                    >
                      <X size={16} /> Remove
                    </button>
                    <button
                      type="button"
                      className="buy-now-btn"
                      onClick={() => {
                        beginCheckout({ [p.id]: bag[p.id] });
                      }}
                    >
                      <PackageCheck size={16} /> Buy this now
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="cart-bottom">
              <div className="coupon-entry">
                <label htmlFor="coupon-code">Promo / coupon code</label>
                <div>
                  <input
                    id="coupon-code"
                    value={couponInput}
                    maxLength={24}
                    onChange={(e) =>
                      setCouponInput(e.target.value.toUpperCase())
                    }
                    placeholder="Enter code"
                  />
                  <button
                    onClick={() => setCoupon(couponInput.trim().toUpperCase())}
                  >
                    Apply
                  </button>
                </div>
                {coupon && (
                  <button
                    className="text-link"
                    onClick={() => {
                      setCoupon("");
                      setCouponInput("");
                    }}
                  >
                    Remove {coupon}
                  </button>
                )}
                
                {!coupon && couponsList.filter(c => c.active).length > 0 && (
                  <div style={{ marginTop: '15px' }}>
                    <p style={{ fontSize: '13px', color: '#878787', marginBottom: '8px', fontWeight: 600 }}>Available Coupons</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {couponsList.filter(c => c.active).map(c => (
                        <div key={c.code} style={{ border: '1px dashed #0e7579', background: '#f2f9f9', padding: '10px', borderRadius: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                           <div>
                             <div style={{ fontWeight: 700, color: '#0e7579', fontSize: '14px' }}>{c.code}</div>
                             <div style={{ fontSize: '12px', color: '#212121', marginTop: '2px' }}>Save {c.type === 'percent' ? c.value + '%' : '₹' + c.value} on min order ₹{c.minOrder}</div>
                           </div>
                           <button 
                             onClick={() => {
                               setCouponInput(c.code);
                               setCoupon(c.code);
                             }}
                             style={{ background: 'none', border: 'none', color: '#0e7579', fontWeight: 700, cursor: 'pointer', fontSize: '13px' }}
                           >APPLY</button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {couponError && (
                  <p className="error" role="alert">
                    {couponError}
                  </p>
                )}
                {discount > 0 && (
                  <p role="status">
                    You save {money(discount)} with {coupon}.
                  </p>
                )}
              </div>
              <div className="total">
                <span>Subtotal</span>
                <strong>{money(total)}</strong>
              </div>
              <p className="sample-note">
                {payment.mode === "test"
                  ? "Cashfree test payment mode is active."
                  : "Secure payment via Cashfree."}
              </p>
              <button
                className="primary"
                onClick={() => {
                  beginCheckout();
                }}
              >
                Continue to secure checkout{" "}
                <ArrowRight size={18} />
              </button>
            </div>
          </>
        ) : (
          <div className="empty">
            <ShoppingBag size={40} />
            <h3>Your bag is waiting.</h3>
            <p>Find something lovely for your home.</p>
            <button
              className="primary"
              onClick={() => {
                setDrawer(false);
                choose("All pieces");
              }}
            >
              Explore the collection
            </button>
          </div>
        )}
      </dialog>
      
      <style>{`
        .fullscreen-dark-modal {
          width: 100vw !important;
          height: 100vh !important;
          max-width: none !important;
          max-height: none !important;
          margin: 0 !important;
          padding: 0 !important;
          background: rgba(4, 13, 20, 0.4) radial-gradient(rgba(21, 38, 54, 0.5) 1px, transparent 1px) !important;
          background-size: 20px 20px !important;
          border: none !important;
        }
        .fullscreen-dark-modal::backdrop {
          background: rgba(4, 13, 20, 0.5) !important;
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
        }
      `}</style>
      <dialog
        ref={loginDialogRef}
        className="login-modal fullscreen-dark-modal"
      >
        <div style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative'
        }}>
          
          
                    {customer ? (
            <div style={{ background: '#f8fafc', width: '100vw', height: '100vh', position: 'fixed', top: 0, left: 0, zIndex: 99999, overflowY: 'auto', fontFamily: '"Inter", sans-serif' }}>
              <style>{`
                .acc-tab-btn { display: flex; align-items: center; justify-content: space-between; width: 100%; padding: 18px 24px; background: none; border: none; border-bottom: 1px solid #f1f5f9; cursor: pointer; transition: all 0.2s ease; position: relative; overflow: hidden; }
                .acc-tab-btn:hover { background: #f8fafc; }
                .acc-tab-btn.active { background: #f0fdfa; }
                .acc-tab-btn.active::before { content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 4px; background: #0e7579; border-radius: 0 4px 4px 0; }
                .acc-subtab-btn { padding: 12px 0; text-align: left; background: none; border: none; cursor: pointer; font-size: 14px; transition: all 0.2s ease; position: relative; display: block; width: 100%; }
                .acc-subtab-btn:hover { color: #0e7579 !important; transform: translateX(4px); }
                .acc-subtab-btn.active { color: #0e7579 !important; font-weight: 700 !important; }
                .acc-logout-btn { display: flex; align-items: center; gap: 15px; background: none; border: none; cursor: pointer; width: 100%; padding: 18px 24px; transition: all 0.2s; border-radius: 12px; }
                .acc-logout-btn:hover { background: #fee2e2; transform: translateY(-2px); }
                .acc-logout-btn:hover span { color: #ef4444 !important; }
                .acc-logout-btn:hover svg { color: #ef4444 !important; }
              `}</style>
               <div style={{ background: 'linear-gradient(135deg, #0e7579 0%, #115e59 100%)', padding: '16px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 10, boxShadow: '0 4px 20px rgba(0,0,0,0.15)', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                 <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                    <button onClick={() => setLoginDrawer(false)} style={{ color: '#fff', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', cursor: 'pointer', fontSize: '24px', display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', borderRadius: '30px', transition: 'all 0.2s', backdropFilter: 'blur(10px)' }} onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.2)'; e.currentTarget.style.transform = 'translateY(-1px)'; }} onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.transform = 'translateY(0)'; }}><ArrowLeft size={20} /> <span style={{fontSize: '14px', fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase'}}>Back to Store</span></button>
                 </div>
                 <div style={{ display: 'flex', alignItems: 'center', gap: '25px' }}>
                   <button
                     aria-label={"Open shopping bag"}
                     onClick={() => setDrawer(true)}
                     style={{ position: 'relative', color: '#fff', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                   >
                     <ShoppingBag size={24} />
                     <span style={{ position: 'absolute', top: '-5px', right: '-8px', background: '#f5c253', color: '#000', fontSize: '11px', fontWeight: 'bold', padding: '2px 6px', borderRadius: '50%' }}>
                       {Object.values(bag).reduce((a, b) => a + b, 0)}
                     </span>
                   </button>
                 </div>
               </div>

               <div style={{ width: '100%', display: 'flex', gap: '30px', alignItems: 'flex-start', padding: '40px 40px', minHeight: 'calc(100vh - 140px)' }}>
                 {/* SIDEBAR */}
                 <div style={{ width: '300px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '24px', position: 'sticky', top: '90px' }}>
                    <div style={{ background: 'linear-gradient(135deg, #0e7579 0%, #115e59 100%)', padding: '24px', display: 'flex', alignItems: 'center', gap: '18px', boxShadow: '0 10px 25px -5px rgba(14, 117, 121, 0.4)', borderRadius: '16px', position: 'relative', overflow: 'hidden' }}>
                      <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '100px', height: '100px', background: 'rgba(255,255,255,0.1)', borderRadius: '50%', filter: 'blur(20px)' }}></div>
                      <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid rgba(255,255,255,0.3)', backdropFilter: 'blur(10px)', flexShrink: 0 }}>
                         <User size={28} color="#fff" />
                      </div>
                      <div style={{ position: 'relative', zIndex: 1 }}>
                         <p style={{ margin: 0, fontSize: '13px', color: 'rgba(255,255,255,0.8)', fontWeight: 500, letterSpacing: '0.5px' }}>Welcome back,</p>
                         <p style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: '#fff', letterSpacing: '0.2px' }}>{customer.name.split(' ')[0]}</p>
                      </div>
                    </div>

                    <div style={{ background: '#fff', boxShadow: '0 10px 40px -10px rgba(0,0,0,0.08)', borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                       <button onClick={() => setAccountTab('orders')} className={`acc-tab-btn ${accountTab === "orders" ? "active" : ""}`}>
                         <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                           <Package size={20} color={accountTab === "orders" ? "#0e7579" : "#64748b"} strokeWidth={accountTab === "orders" ? 2.5 : 2} />
                           <span style={{ fontSize: '15px', fontWeight: accountTab === "orders" ? 800 : 600, color: accountTab === "orders" ? "#0f172a" : "#475569" }}>My Orders</span>
                         </div>
                         <span style={{ color: accountTab === "orders" ? '#0e7579' : '#cbd5e1', fontWeight: 800 }}>&gt;</span>
                       </button>
                       <button onClick={() => setAccountTab('coupons')} className={`acc-tab-btn ${accountTab === "coupons" ? "active" : ""}`}>
                         <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                           <Tag size={20} color={accountTab === "coupons" ? "#0e7579" : "#64748b"} strokeWidth={accountTab === "coupons" ? 2.5 : 2} />
                           <span style={{ fontSize: '15px', fontWeight: accountTab === "coupons" ? 800 : 600, color: accountTab === "coupons" ? "#0f172a" : "#475569" }}>My Coupons</span>
                         </div>
                         <span style={{ color: accountTab === "coupons" ? '#0e7579' : '#cbd5e1', fontWeight: 800 }}>&gt;</span>
                       </button>

                       <button onClick={() => setAccountTab('wishlist')} className={`acc-tab-btn ${accountTab === "wishlist" ? "active" : ""}`}>
                         <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                           <Heart size={20} color={accountTab === "wishlist" ? "#0e7579" : "#64748b"} strokeWidth={accountTab === "wishlist" ? 2.5 : 2} />
                           <span style={{ fontSize: '15px', fontWeight: accountTab === "wishlist" ? 800 : 600, color: accountTab === "wishlist" ? "#0f172a" : "#475569" }}>My Wishlist</span>
                         </div>
                         <span style={{ color: accountTab === "wishlist" ? '#0e7579' : '#cbd5e1', fontWeight: 800 }}>&gt;</span>
                       </button>

                       <button onClick={() => setAccountTab('bag')} className={`acc-tab-btn ${accountTab === "bag" ? "active" : ""}`}>
                         <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                           <ShoppingBag size={20} color={accountTab === "bag" ? "#0e7579" : "#64748b"} strokeWidth={accountTab === "bag" ? 2.5 : 2} />
                           <span style={{ fontSize: '15px', fontWeight: accountTab === "bag" ? 800 : 600, color: accountTab === "bag" ? "#0f172a" : "#475569" }}>My Bag</span>
                         </div>
                         <span style={{ color: accountTab === "bag" ? '#0e7579' : '#cbd5e1', fontWeight: 800 }}>&gt;</span>
                       </button>

                       <div style={{ padding: '24px', borderBottom: '1px solid #f1f5f9' }}>
                         <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
                           <User size={20} color="#64748b" />
                           <span style={{ fontSize: '13px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px' }}>Account Settings</span>
                         </div>
                         <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                           <button onClick={() => setAccountTab('profile')} className={`acc-subtab-btn ${accountTab === "profile" ? "active" : ""}`} style={{ color: accountTab === "profile" ? "#0e7579" : "#475569", fontWeight: accountTab === 'profile' ? 700 : 500 }}>Profile Information</button>
                           <button onClick={() => setAccountTab('addresses')} className={`acc-subtab-btn ${accountTab === "addresses" ? "active" : ""}`} style={{ color: accountTab === "addresses" ? "#0e7579" : "#475569", fontWeight: accountTab === 'addresses' ? 700 : 500 }}>Manage Addresses</button>
                         </div>
                       </div>
                       <div style={{ padding: '16px' }}>
                         <button 
                            className="acc-logout-btn"
                            onClick={() => { 
                              fetch('/api/customer/auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'customerLogout' }) }).then(() => window.location.reload());
                            }}
                         >
                           <Power size={20} color="#ef4444" strokeWidth={2.5} style={{ transition: 'all 0.2s' }} />
                           <span style={{ fontSize: '15px', fontWeight: 700, color: '#64748b', transition: 'all 0.2s' }}>Logout</span>
                         </button>
                       </div>
                    </div>
                 </div>

                 {/* CONTENT AREA */}
                 <div style={{ flex: 1, background: accountTab === 'orders' ? 'transparent' : '#fff', boxShadow: accountTab === 'orders' ? 'none' : '0 10px 40px -10px rgba(0,0,0,0.08)', borderRadius: '16px', border: accountTab === 'orders' ? 'none' : '1px solid #e2e8f0', minHeight: '600px', padding: '0', display: 'flex', flexDirection: 'column', overflow: accountTab === 'orders' ? 'visible' : 'hidden' }}>
                  {accountTab === 'profile' && (
                    <div style={{ width: "100%", padding: "0" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "30px 40px", borderBottom: "1px solid #f1f5f9", background: '#f8fafc' }}>
                        <h3 style={{ margin: 0, color: '#0f172a', fontWeight: 900, fontSize: '22px', letterSpacing: '-0.5px' }}>Profile Information</h3>
                        {!editingProfile && <button onClick={() => setEditingProfile(true)} style={{ padding: '10px 20px', background: '#fff', border: '1px solid #cbd5e1', borderRadius: '10px', color: '#0f172a', fontWeight: 700, cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', transition: 'all 0.2s' }} onMouseOver={(e) => { e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)'; e.currentTarget.style.transform = 'translateY(-1px)'; }} onMouseOut={(e) => { e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.05)'; e.currentTarget.style.transform = 'translateY(0)'; }}>Edit Profile</button>}
                      </div>
                      <div style={{ background: "#fff", padding: "0", border: "none" }}>
                        {editingProfile ? (
                          <form style={{ padding: "30px", display: "flex", flexDirection: "column", gap: "20px" }} onSubmit={async (e) => {
                            e.preventDefault();
                            const formData = new FormData(e.currentTarget);
                            const res = await fetch('/api/shop', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                action: 'customerUpdateProfile',
                                name: formData.get('name'),
                                last_name: formData.get('last_name'),
                                phone: formData.get('phone')
                              })
                            });
                            if (res.ok) {
                              setCustomer(c => c ? { ...c, name: formData.get('name') as string, last_name: formData.get('last_name') as string, phone: formData.get('phone') as string } : c);
                              setEditingProfile(false);
                            } else {
                              alert('Could not update profile');
                            }
                          }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                              <div>
                                <label style={{ display: 'block', fontSize: '14px', color: '#68778d', fontWeight: 600, marginBottom: '5px' }}>First Name</label>
                                <input type="text" name="name" defaultValue={customer.name} required style={{ width: '100%', boxSizing: 'border-box', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '16px', outline: 'none' }} />
                              </div>
                              <div>
                                <label style={{ display: 'block', fontSize: '14px', color: '#68778d', fontWeight: 600, marginBottom: '5px' }}>Last Name</label>
                                <input type="text" name="last_name" defaultValue={customer.last_name || ''} style={{ width: '100%', boxSizing: 'border-box', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '16px', outline: 'none' }} />
                              </div>
                            </div>
                            <div>
                              <label style={{ display: 'block', fontSize: '14px', color: '#68778d', fontWeight: 600, marginBottom: '5px' }}>Email Address (Read-only)</label>
                              <input type="email" value={customer.email} disabled style={{ width: '100%', boxSizing: 'border-box', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#f8fafc', color: '#94a3b8', fontSize: '16px' }} />
                            </div>
                            <div>
                              <label style={{ display: 'block', fontSize: '14px', color: '#68778d', fontWeight: 600, marginBottom: '5px' }}>Phone Number</label>
                              <input type="text" name="phone" defaultValue={customer.phone || ''} placeholder="10-digit mobile number" style={{ width: '100%', boxSizing: 'border-box', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '16px', outline: 'none' }} />
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                              <button type="button" onClick={() => setEditingProfile(false)} style={{ padding: '10px 20px', background: 'transparent', color: '#64748b', border: 'none', fontWeight: 700, cursor: 'pointer' }}>Cancel</button>
                              <button type="submit" style={{ padding: '10px 20px', background: '#131e2d', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 700, cursor: 'pointer' }}>Save Changes</button>
                            </div>
                          </form>
                        ) : (
                          <div style={{ display: "flex", flexDirection: "column", gap: "15px", padding: "30px" }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                              <div><p style={{ margin: '0 0 5px', fontSize: '14px', color: '#68778d', fontWeight: 600 }}>First Name</p><p style={{ margin: 0, fontSize: '18px', color: '#131e2d', fontWeight: 700 }}>{customer.name}</p></div>
                              <div><p style={{ margin: '0 0 5px', fontSize: '14px', color: '#68778d', fontWeight: 600 }}>Last Name</p><p style={{ margin: 0, fontSize: '18px', color: '#131e2d', fontWeight: 700 }}>{customer.last_name || '-'}</p></div>
                            </div>
                            <div><p style={{ margin: '0 0 5px', fontSize: '14px', color: '#68778d', fontWeight: 600 }}>Email Address</p><p style={{ margin: 0, fontSize: '18px', color: '#131e2d', fontWeight: 700 }}>{customer.email}</p></div>
                            <div><p style={{ margin: '0 0 5px', fontSize: '14px', color: '#68778d', fontWeight: 600 }}>Phone Number</p><p style={{ margin: 0, fontSize: '18px', color: '#131e2d', fontWeight: 700 }}>{customer.phone ? '+91 ' + customer.phone : '-'}</p></div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  {accountTab === 'orders' && (
                    <div style={{ width: "100%", padding: "0" }}>
                      <h3 style={{ marginBottom: '20px', color: '#131e2d', fontWeight: 800 }}>Order History</h3>
                      {orders.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '40px', background: '#fff', borderRadius: '20px', border: '1px solid #e1e6eb' }}>
                           <p style={{ color: '#68778d', fontSize: '16px', fontWeight: 600 }}>No orders found.</p>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
                          {orders.map(o => (
                            <div key={o.id} style={{ background: '#fff', padding: '30px', borderRadius: '24px', border: '1px solid #cbd5e1', boxShadow: '0 12px 35px -5px rgba(0,0,0,0.08), 0 5px 15px -5px rgba(0,0,0,0.03)' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                                <div>
                                  <p style={{ margin: '0 0 5px', fontWeight: 800, color: '#131e2d', fontSize: '18px' }}>Order #{o.id.substring(0,8)}</p>
                                  <p style={{ margin: 0, fontSize: '14px', color: '#68778d', fontWeight: 600 }}>{orderDate(o)}</p>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                  <p style={{ margin: '0 0 8px', fontWeight: 900, color: '#131e2d', fontSize: '20px' }}>{money(Number(o.total) || 0)}</p>
                                  <span style={{ fontSize: '13px', padding: '6px 12px', background: o.status === 'Delivered' ? '#e6f4ea' : o.status === 'Cancelled' ? '#fef2f2' : o.status === 'Received' ? '#eff6ff' : '#fef7e0', color: o.status === 'Delivered' ? '#137333' : o.status === 'Cancelled' ? '#dc2626' : o.status === 'Received' ? '#2563eb' : '#b06000', borderRadius: '12px', fontWeight: 800 }}>{o.status}</span>
                                </div>
                              </div>
                              <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '20px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                {parseOrderItems(o.items).map((item, i) => (
                                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                    <div style={{ background: '#fff', padding: '5px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                                      <img src={orderItemImage(item)} alt={item.name || "Product"} loading="lazy" decoding="async" style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '8px' }} />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                      <p style={{ margin: '0 0 4px', fontSize: '16px', color: '#131e2d', fontWeight: 700 }}>{item.name}</p>
                                      <p style={{ margin: 0, fontSize: '14px', color: '#68778d', fontWeight: 600 }}>Qty: {item.qty || item.quantity || 1}</p>
                                    </div>
                                    <p style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#131e2d' }}>{money((Number(item.price) || 0) * (Number(item.qty || item.quantity) || 1))}</p>
                                  </div>
                                ))}
                              </div>
                              {!['Shipped', 'Delivered', 'Cancelled'].includes(o.status) && (
                                <div style={{ borderTop: '1px dashed #e1e6eb', marginTop: '20px', paddingTop: '20px' }}>
                                  {cancelOrderId === o.id ? (
                                    <div style={{ background: '#f9fafb', border: '1px solid #e2e8f0', padding: '20px', borderRadius: '12px' }}>
                                      <p style={{ margin: '0 0 12px', fontWeight: 700, color: '#334155' }}>Please tell us why you are cancelling:</p>
                                      <select 
                                        value={cancelReason}
                                        onChange={e => setCancelReason(e.target.value)}
                                        style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', marginBottom: '16px', fontSize: '14px', outline: 'none' }}
                                      >
                                        <option value="">Select a reason...</option>
                                        <option value="Ordered by mistake">Ordered by mistake</option>
                                        <option value="Found a better price elsewhere">Found a better price elsewhere</option>
                                        <option value="Item no longer needed">Item no longer needed</option>
                                        <option value="Shipping time too long">Shipping time too long</option>
                                        <option value="Other">Other</option>
                                      </select>
                                      <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                                        <button onClick={() => { setCancelOrderId(null); setCancelReason(''); }} style={{ padding: '10px 16px', background: 'transparent', color: '#64748b', border: 'none', fontWeight: 700, cursor: 'pointer' }}>Go Back</button>
                                        <button 
                                          disabled={!cancelReason}
                                          onClick={async () => {
                                            try {
                                              const res = await fetch('/api/shop', {
                                                method: 'POST',
                                                headers: {'Content-Type': 'application/json'},
                                                body: JSON.stringify({ action: 'customerCancelOrder', orderId: o.id, reason: cancelReason })
                                              });
                                              if(!res.ok) {
                                                const d = await res.json();
                                                alert(d.error || 'Failed to cancel order');
                                              } else {
                                                window.location.reload();
                                              }
                                            } catch(e) {
                                              alert('Could not cancel order');
                                            }
                                          }} 
                                          style={{ padding: '10px 16px', background: cancelReason ? '#dc2626' : '#fca5a5', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: cancelReason ? 'pointer' : 'not-allowed' }}
                                        >Confirm Cancellation</button>
                                      </div>
                                    </div>
                                  ) : (
                                   <div style={{ textAlign: 'right' }}>
                                      <button onClick={() => setCancelOrderId(o.id)} style={{ padding: '6px 14px', fontSize: '13px', background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }} onMouseOver={e=>{e.currentTarget.style.background='#fef2f2'; e.currentTarget.style.borderColor='#dc2626'}} onMouseOut={e=>{e.currentTarget.style.background='#fef2f2'; e.currentTarget.style.borderColor='#fecaca'}}>Cancel Order</button>
                                    </div>
                                  )}
                                </div>
                              )}
                              {o.status === 'Delivered' && (
                                <div style={{ borderTop: '1px dashed #e1e6eb', marginTop: '20px', paddingTop: '20px', textAlign: 'right' }}>
                                  <button onClick={() => downloadInvoice(o)} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 18px', background: '#0e7579', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 2px 8px rgba(14,117,121,0.2)' }} onMouseOver={e=>{e.currentTarget.style.transform='translateY(-1px)'; e.currentTarget.style.boxShadow='0 4px 12px rgba(14,117,121,0.3)'}} onMouseOut={e=>{e.currentTarget.style.transform='translateY(0)'; e.currentTarget.style.boxShadow='0 2px 8px rgba(14,117,121,0.2)'}}>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
                                    Download Bill
                                  </button>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  {accountTab === 'addresses' && (
                    <div style={{ width: "100%", padding: "0" }}>
                      <AddressBook addresses={addresses} onUpdate={setAddresses} />
                    </div>
                  )}
{accountTab === 'coupons' && (
                    <div style={{ width: "100%", padding: "0" }}>
                      <div style={{ padding: '20px 30px', borderBottom: '1px solid #e1e6eb' }}>
                        <h3 style={{ margin: 0, color: '#212121', fontWeight: 600, fontSize: '18px' }}>Available Coupons</h3>
                      </div>
                      <div style={{ padding: '30px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        {couponsList.filter(c => c.active).length === 0 ? (
                           <div style={{ padding: '40px', textAlign: 'center', color: '#878787' }}>No coupons available right now.</div>
                        ) : (
                           couponsList.filter(c => c.active).map(c => (
                              <div key={c.code} style={{ border: '1px solid #e1e6eb', borderRadius: '4px', padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                 <div>
                                   <div style={{ display: 'inline-block', background: '#e4f3f3', color: '#0e7579', padding: '5px 15px', borderRadius: '2px', fontWeight: 700, border: '1px dashed #0e7579', marginBottom: '10px' }}>{c.code}</div>
                                   <div style={{ fontSize: '14px', color: '#212121', fontWeight: 600 }}>Get {c.type === 'percent' ? c.value + '%' : '₹' + c.value} off on your order!</div>
                                   <div style={{ fontSize: '12px', color: '#878787', marginTop: '5px' }}>Valid on orders above ₹{c.minOrder}. {c.expires ? 'Expires on: ' + new Date(c.expires).toLocaleDateString() : 'No expiry date.'}</div>
                                 </div>
                                 <button onClick={() => {
                                   navigator.clipboard.writeText(c.code);
                                   alert('Coupon code copied!');
                                 }} style={{ background: '#0e7579', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '2px', fontWeight: 600, cursor: 'pointer' }}>COPY CODE</button>
                              </div>
                           ))
                        )}
                      </div>
                    </div>
                  )}
                  {accountTab === 'wishlist' && (
                    <div style={{ width: "100%", padding: "0" }}>
                      <div style={{ padding: '20px 30px', borderBottom: '1px solid #e1e6eb' }}>
                        <h3 style={{ margin: 0, color: '#212121', fontWeight: 600, fontSize: '18px' }}>My Wishlist</h3>
                      </div>
                      <div style={{ padding: '30px' }}>
                        {wish.length === 0 ? (
                           <div style={{ padding: '40px', textAlign: 'center', color: '#878787' }}>Your wishlist is empty. Explore the store and heart pieces you love to save them here.</div>
                        ) : (
                           <div className="product-grid columns-3">
                             {products.filter(p => wish.includes(p.id)).map(p => (
                               <article className="product-card" key={p.id}>
                                  <div className="product-image">
                                    <button
                                      className={"product-photo " + (p.id.includes("sand") ? "sand" : p.id.includes("terracotta") ? "clay" : "")}
                                      aria-label={"View " + p.name}
                                      onClick={() => { setSelected(p); setAccountDropdown(false); }}
                                    >
                                      <Carousel images={p.image.split(',')} alt={p.name} switchTime={p.imageSwitchTime || 3} hideControls={true} />
                                    </button>
                                    <span className="product-tag">{p.tag}</span>
                                    <button
                                      className="wish"
                                      style={{ zIndex: 9999, cursor: 'pointer', position: 'absolute' }}
                                      onPointerDown={(e) => { e.stopPropagation(); e.preventDefault(); favourite(p.id); }}
                                    >
                                      <Heart size={18} style={{ pointerEvents: 'none' }} fill="currentColor" />
                                    </button>
                                    <button className="quick-add" disabled={!p.stock} onClick={() => add(p)}>
                                      {p.stock ? "ADD TO BAG" : "SOLD OUT"} <Plus size={17} />
                                    </button>
                                  </div>
                                  <div className="product-info">
                                    <div>
                                      <span>{p.material}</span>
                                      <button className="product-title" onClick={() => { setSelected(p); setAccountDropdown(false); }}>{p.name}</button>
                                    </div>
                                    <strong>{money(p.price)}</strong>
                                  </div>
                               </article>
                             ))}
                           </div>
                        )}
                      </div>
                    </div>
                  )}
                  {accountTab === 'bag' && (
                    <div style={{ width: "100%", padding: "0" }}>
                      <div style={{ padding: '20px 30px', borderBottom: '1px solid #e1e6eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 style={{ margin: 0, color: '#212121', fontWeight: 600, fontSize: '18px' }}>My Bag</h3>
                        {cart.length > 0 && <span style={{ color: '#64748b', fontSize: '14px', fontWeight: 600 }}>{count} items</span>}
                      </div>
                      <div style={{ padding: '30px' }}>
                        {cart.length === 0 ? (
                           <div style={{ padding: '60px 20px', textAlign: 'center', color: '#878787' }}>
                             <ShoppingBag size={48} style={{ margin: '0 auto 15px', color: '#cbd5e1' }} />
                             <div style={{ fontSize: '20px', fontWeight: 600, color: '#334155', marginBottom: '8px' }}>Your bag is waiting.</div>
                             <div>Explore the collection to find something lovely for your home.</div>
                           </div>
                        ) : (
                           <div style={{ display: 'flex', gap: '40px', flexWrap: 'wrap' }}>
                             <div className="cart-items" style={{ flex: '1 1 400px', padding: 0 }}>
                               {cart.map((p) => (
                                 <div className="cart-item" key={p.id} style={{ borderBottom: '1px solid #f1f5f9', padding: '20px 0' }}>
                                   <div style={{ display: 'flex', gap: '20px' }}>
                                     <div style={{ width: '90px', height: '110px', borderRadius: '8px', overflow: 'hidden' }}>
                                       <Carousel images={p.image.split(',')} alt={p.name} switchTime={p.imageSwitchTime || 3} hideControls={true} />
                                     </div>
                                     <div style={{ flex: 1 }}>
                                       <h3 style={{ margin: '0 0 6px', fontSize: '16px', fontWeight: 600, color: '#0f172a' }}>{p.name}</h3>
                                       <p style={{ margin: '0 0 16px', fontWeight: 600, color: '#0e7579' }}>{money(p.price)}</p>
                                       <div className="quantity" style={{ borderRadius: '6px', overflow: 'hidden', display: 'inline-flex' }}>
                                         <button type="button" aria-label={"Reduce " + p.name} onClick={() => setBag((b) => ({ ...b, [p.id]: Math.max(0, b[p.id] - 1) }))}>
                                           <Minus size={14} />
                                         </button>
                                         <span style={{ minWidth: '30px', textAlign: 'center' }}>{bag[p.id]}</span>
                                         <button type="button" aria-label={"Increase " + p.name} onClick={() => add(p)}>
                                           <Plus size={14} />
                                         </button>
                                       </div>
                                       <div style={{ marginTop: '16px' }}>
                                         <button type="button" onClick={() => setBag((b) => ({ ...b, [p.id]: 0 }))} style={{ color: '#ef4444', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 500 }}>
                                           <X size={14} /> Remove
                                         </button>
                                       </div>
                                     </div>
                                   </div>
                                 </div>
                               ))}
                             </div>
                             
                             <div className="cart-bottom" style={{ flex: '1 1 300px', maxWidth: '380px', padding: '24px', background: '#f8fafc', borderRadius: '16px', height: 'fit-content', border: '1px solid #e2e8f0' }}>
                               <div className="coupon-entry">
                                 <label htmlFor="account-coupon" style={{ fontWeight: 700, color: '#334155', display: 'block', marginBottom: '12px' }}>Promo / coupon code</label>
                                 <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
                                   <input
                                     id="account-coupon"
                                     value={couponInput}
                                     maxLength={24}
                                     onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                                     placeholder="Enter code"
                                     style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#fff' }}
                                   />
                                   <button style={{ background: '#0e7579', color: '#fff', padding: '0 20px', borderRadius: '8px', fontWeight: 700 }} onClick={() => setCoupon(couponInput.trim().toUpperCase())}>
                                     Apply
                                   </button>
                                 </div>
                                 {coupon && (
                                   <button className="text-link" onClick={() => { setCoupon(""); setCouponInput(""); }} style={{ color: '#ef4444' }}>
                                     Remove {coupon}
                                   </button>
                                 )}
                                 {couponError && <p className="error" style={{ padding: '10px', marginTop: '12px', borderRadius: '6px' }} role="alert">{couponError}</p>}
                               </div>
                               
                               <div className="total" style={{ display: 'flex', justifyContent: 'space-between', marginTop: '24px', paddingTop: '20px', borderTop: '1px solid #e2e8f0', fontSize: '18px' }}>
                                 <span style={{ fontWeight: 600, color: '#334155' }}>Subtotal</span>
                                 <strong style={{ color: '#0f172a' }}>{money(total)}</strong>
                               </div>
                               
                               {discount > 0 && (
                                 <p style={{ color: '#059669', fontSize: '14px', marginTop: '12px', fontWeight: 600, background: '#d1fae5', padding: '10px', borderRadius: '6px' }}>
                                   ✓ You save {money(discount)} with {coupon}.
                                 </p>
                               )}
                               
                               <button
                                 style={{ width: '100%', marginTop: '28px', padding: '16px', background: '#0e7579', color: '#fff', borderRadius: '8px', fontWeight: 700, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', fontSize: '15px', transition: 'all 0.2s', boxShadow: '0 4px 12px rgba(14, 117, 121, 0.2)' }}
                                 onClick={() => {
                                   setLoginDrawer(false);
                                   setDrawer(true);
                                   beginCheckout();
                                 }}
                               >
                                 Proceed to Checkout <ArrowRight size={18} />
                               </button>
                             </div>
                           </div>
                        )}
                      </div>
                    </div>
                  )}
                 </div>
               </div>
            </div>
          ) : (
            <div style={{
              background: '#f4f6f7',
              width: '100%',
              maxWidth: '400px',
              borderRadius: '20px',
              overflow: 'hidden',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
              textAlign: 'center',
              paddingBottom: '20px'
            }}>
              <div style={{
                height: '8px',
                background: 'linear-gradient(90deg, #185c62 0%, #159b9a 50%, #e8b92e 100%)'
              }}></div>
              
              <div style={{ padding: '30px 30px 10px' }}>
                <img src="/velto-logo.png" alt="VELTO" style={{ height: '70px', margin: '0 auto 15px' }} />
                <h1 style={{ fontSize: '22px', color: '#131e2d', fontWeight: 900, marginBottom: '6px', letterSpacing: '-0.5px' }}>
                  {authMode === "login" ? "Welcome back" : "Create an account"}
                </h1>
                <p style={{ color: '#68778d', fontSize: '14px', marginBottom: '24px' }}>
                  {authMode === "login"
                    ? "Enter your details below to access your account."
                    : "Join us to save your orders and addresses."}
                </p>
                
                {authMode === "login" ? (
                  <LoginForm
                    busy={busy}
                    setBusy={setBusy}
                    state={{ bag, wish }}
                    onSwitch={() => setAuthMode("register")}
                    onSuccess={() => {
                      setLoginDrawer(false);
                      window.location.reload();
                    }}
                  />
                ) : (
                  <RegisterForm
                    busy={busy}
                    setBusy={setBusy}
                    state={{ bag, wish }}
                    onSwitch={() => setAuthMode("login")}
                    onSuccess={() => {
                      setLoginDrawer(false);
                      window.location.reload();
                    }}
                  />
                )}
                
                <div style={{ marginTop: '20px', fontSize: '14px', color: '#909eb0' }}>
                  {authMode === "login" ? "Don't have an account? " : "Already have an account? "}
                  <button
                    type="button"
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#131e2d',
                      fontWeight: 700,
                      cursor: 'pointer',
                      textDecoration: 'underline'
                    }}
                    onClick={() => setAuthMode(authMode === "login" ? "register" : "login")}
                  >
                    {authMode === "login" ? "Register" : "Log in"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </dialog>

      {success && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100vw",
          height: "100vh",
          background: "rgba(0,0,0,0.6)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 999999,
          backdropFilter: "blur(5px)"
        }}>
          <div style={{
            background: "#fff",
            padding: "50px 40px",
            borderRadius: "24px",
            boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)",
            textAlign: "center",
            maxWidth: "480px",
            width: "90%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "20px",
            animation: "popupFadeIn 0.3s ease-out forwards"
          }}>
            <div style={{
              width: "80px",
              height: "80px",
              borderRadius: "50%",
              background: "#f0fdfa",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#0e7579"
            }}>
              <PackageCheck size={48} />
            </div>
            <h3 style={{ margin: 0, fontSize: "28px", fontWeight: 800, color: "#0f172a" }}>Order Confirmed!</h3>
            <p style={{ margin: 0, fontSize: "16px", color: "#475569", lineHeight: 1.6 }}>
              {successMethod === "cod"
                ? "Your order has been recorded successfully. Please pay via cash or UPI at the time of delivery."
                : payment.mode === "test"
                ? "Test payment verified. This order is recorded for payment testing."
                : "Your payment has been verified. Contact info@velto.com for order support."}
            </p>
            <div style={{
              background: "#f8fafc",
              padding: "15px 25px",
              borderRadius: "12px",
              border: "1px dashed #cbd5e1",
              fontWeight: 700,
              color: "#334155",
              letterSpacing: "1px"
            }}>
              Ref: {success.slice(0, 8).toUpperCase()}
            </div>
            <button
              onClick={() => {
                setSuccess("");
                setSuccessMethod("");
                window.location.href = "/";
              }}
              style={{
                marginTop: "10px",
                padding: "16px 32px",
                background: "#0e7579",
                color: "#fff",
                border: "none",
                borderRadius: "12px",
                fontSize: "16px",
                fontWeight: 700,
                cursor: "pointer",
                width: "100%",
                transition: "all 0.2s",
                boxShadow: "0 4px 12px rgba(14,117,121,0.3)"
              }}
              onMouseOver={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 6px 16px rgba(14,117,121,0.4)"; }}
              onMouseOut={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 4px 12px rgba(14,117,121,0.3)"; }}
            >
              Continue Shopping
            </button>
          </div>
          <style>{`
            @keyframes popupFadeIn {
              from { opacity: 0; transform: scale(0.9) translateY(20px); }
              to { opacity: 1; transform: scale(1) translateY(0); }
            }
          `}</style>
        </div>
      )}
    </>
  );
}
