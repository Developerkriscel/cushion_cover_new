"use client";
import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowUpRight,
  Package,
  ShoppingBag,
  IndianRupee,
  Plus,
  LogOut,
  X,
  Check,
  LayoutDashboard,
  BarChart3,
  Bell,
  Printer,
  Eye,
} from "lucide-react";
import { Product, money } from "../catalog";
import { categories, defaultSettings } from "../shop-config";
import Controls, { ImagePicker, MultiImagePicker } from "./controls";
import { downloadInvoice } from "../store";

type Order = {
  id: string;
  customer: string;
  address: string;
  phone: string;
  pincode: string;
  items: string;
  total: number;
  status: string;
  created_at: string;
  payment_method?: string;
  payment_status?: string;
  payment_id?: string;
};

const ORDER_STATUSES = [
  "Received",
  "Paid - stock review",
  "COD - stock review",
  "Packed",
  "Shipped",
  "Delivered",
  "Cancelled",
];

const parseOrderItems = (items: string) => {
  try {
    const parsed = JSON.parse(items);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const paymentText = (value?: string) => value || "pending";

export default function Admin() {
  const [authed, setAuthed] = useState(false),
    [loading, setLoading] = useState(true),
    [products, setProducts] = useState<Product[]>([]),
    [orders, setOrders] = useState<Order[]>([]),
    [customers, setCustomers] = useState<any[]>([]),
    [tab, setTab] = useState("Dashboard"),
    [orderTab, setOrderTab] = useState<"Pending" | "Delivered" | "Cancelled">(
      "Pending",
    ),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [editing, setEditing] = useState<Product | null>(null),
    [busy, setBusy] = useState(false);
  const [dashboardFilter, setDashboardFilter] = useState("today"),
    [dashboardCustomDates, setDashboardCustomDates] = useState({ start: "", end: "" }),
    [settings, setSettings] = useState(defaultSettings),
    [coupons, setCoupons] = useState<any[]>([]),
    [payment, setPayment] = useState<any>({}),
    [showNotifications, setShowNotifications] = useState(false),
    [readNotifications, setReadNotifications] = useState<string[]>([]),
    [viewingOrder, setViewingOrder] = useState<Order | null>(null);
  const editDialog = useRef<HTMLDialogElement>(null);
  const viewOrderDialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (editing) editDialog.current?.showModal();
    else editDialog.current?.close();
  }, [editing]);
  useEffect(() => {
    if (viewingOrder) viewOrderDialog.current?.showModal();
    else viewOrderDialog.current?.close();
  }, [viewingOrder]);
  useEffect(() => {
    try {
      const stored = localStorage.getItem('admin_read_notifications');
      if (stored) setReadNotifications(JSON.parse(stored));
    } catch(e) {}
  }, []);
  async function load() {
    try {
      const r = await fetch("/api/shop?action=admin");
      const d: any = await r.json();
      if (r.ok) {
        setAuthed(true);
        setProducts(d.products || []);
        setOrders(d.orders || []);
        setCustomers(d.customers || []);
        setSettings(d.settings || defaultSettings);
        setCoupons(d.coupons || []);
        setPayment(d.payment || {});
      } else if (r.status !== 401) setError(d.error);
    } catch {
      setError("Could not connect. Please try again.");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, []);
  async function api(body: unknown) {
    const r = await fetch("/api/shop", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const d: any = await r.json();
    if (!r.ok) throw Error(d.error);
    return d;
  }
  async function login(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api({
        action: "login",
        password: new FormData(e.currentTarget).get("password"),
      });
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const f = Object.fromEntries(new FormData(e.currentTarget));
    try {
      await api({
        action: "saveProduct",
        product: {
          ...editing,
          ...f,
          price: Number(f.price),
          stock: Number(f.stock),
          imageSwitchTime: f.imageSwitchTime ? Number(f.imageSwitchTime) : 3,
        },
      });
      setEditing(null);
      setNotice("Product saved. Your storefront is up to date.");
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const notifications = (() => {
    const notifs: any[] = [];
    customers.forEach(c => {
      if (c.created_at) {
        const d = new Date(c.created_at);
        if (Date.now() - d.getTime() < 86400000 * 3) {
          notifs.push({ id: `c-${c.email}`, type: 'account', text: `New account: ${c.name} (${c.email})`, time: d });
        }
      }
    });
    orders.forEach(o => {
      const d = new Date(o.created_at);
      const shortId = o.id.split('-')[0];
      if (Date.now() - d.getTime() < 86400000 * 7) {
        if (o.status === "Cancelled") {
           notifs.push({ id: `o-c-${o.id}`, type: 'cancel', text: `Order #${shortId} was cancelled`, time: d });
        } else {
           notifs.push({ id: `o-${o.id}`, type: 'order', text: `New order #${shortId} from ${o.customer}`, time: d });
           if (String(o.payment_status || "").toLowerCase() === "paid") {
              notifs.push({ id: `p-${o.id}`, type: 'payment', text: `Payment of ${money(o.total)} received for #${shortId}`, time: new Date(d.getTime() + 1000) });
           }
        }
      }
    });
    products.forEach(p => {
      if (p.stock === 0) {
        notifs.push({ id: `stock-${p.id}`, type: 'stock', text: `Out of stock: ${p.name}`, time: new Date() });
      }
    });
    return notifs.sort((a, b) => b.time.getTime() - a.time.getTime()).slice(0, 15);
  })();

  const unreadCount = notifications.filter(n => !readNotifications.includes(n.id)).length;

  const markAllRead = () => {
    const allIds = notifications.map(n => n.id);
    setReadNotifications(allIds);
    localStorage.setItem('admin_read_notifications', JSON.stringify(allIds));
  };

  const isPaidOrder = (o: Order) =>
    String(o.payment_status || "").toLowerCase() === "paid";
  const isRevenueOrder = (o: Order) =>
    o.status !== "Cancelled" &&
    (isPaidOrder(o) ||
      (String(o.payment_method || "").toLowerCase() === "cod" &&
        o.status === "Delivered"));
  const filteredOrdersForTab = orders.filter((o) =>
    orderTab === "Delivered"
      ? o.status === "Delivered"
      : orderTab === "Cancelled"
        ? o.status === "Cancelled"
        : o.status !== "Delivered" && o.status !== "Cancelled",
  );

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <a href="/" className="brand">
          VELTO<span>STORE MANAGEMENT</span>
        </a>
        <div className="admin-tabs">
          {["Dashboard", "Products", "Orders", "Banner", "Coupons", "SEO", "Payments"].map(
            (x) => (
              <button
                key={x}
                className={tab === x ? "active" : ""}
                onClick={() => setTab(x)}
              >
                {x === "Dashboard" ? (
                  <LayoutDashboard size={18} />
                ) : x === "Products" ? (
                  <Package size={18} />
                ) : (
                  <ShoppingBag size={18} />
                )}{" "}
                {x}
              </button>
            )
          )}
        </div>
        <div className="admin-tabs" style={{ marginTop: 'auto', borderTop: '1px solid #334e40', paddingTop: '10px' }}>
          {authed && (
            <button
              style={{ color: '#ef4444' }}
              onClick={async () => {
                await api({ action: "logout" });
                setAuthed(false);
              }}
            >
              <LogOut size={18} /> Sign out
            </button>
          )}
          <a href="/" style={{ display: 'flex', alignItems: 'center', gap: '12px', textAlign: 'left', padding: '15px', fontSize: '14px', color: '#f7f5eb', textDecoration: 'none' }} onMouseOver={e => e.currentTarget.style.background = '#ffffff18'} onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
            <ArrowLeft size={18} /> Back to store
          </a>
        </div>
      </aside>
      <main className="admin-main">
        <header className="admin-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <div>
            <span className="eyebrow">VELTO / ADMIN</span>
            <h1>{authed ? "Your store, at a glance." : "Welcome back."}</h1>
          </div>
          {authed && (
            <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
              <div style={{ position: 'relative' }}>
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '8px', position: 'relative' }}
                >
                  <Bell size={22} color="#475569" />
                  {unreadCount > 0 && (
                    <span style={{ position: 'absolute', top: '4px', right: '6px', background: '#ef4444', width: '10px', height: '10px', borderRadius: '50%', border: '2px solid #fff' }}></span>
                  )}
                </button>
                {showNotifications && (
                  <div style={{ position: 'absolute', top: '100%', right: 0, width: '380px', background: '#fff', borderRadius: '16px', boxShadow: '0 20px 40px -10px rgba(0,0,0,0.15)', border: '1px solid #e2e8f0', zIndex: 50, overflow: 'hidden', marginTop: '12px' }}>
                    <div style={{ padding: '18px 20px', borderBottom: '1px solid #f1f5f9', background: 'linear-gradient(to right, #f8fafc, #ffffff)', fontWeight: 700, fontSize: '15px', color: '#0f172a', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      Notifications
                      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        {unreadCount > 0 && (
                           <button onClick={markAllRead} style={{ background: 'none', border: 'none', fontSize: '12px', color: '#64748b', cursor: 'pointer', fontWeight: 600, padding: 0 }} onMouseOver={e => e.currentTarget.style.color = '#0f172a'} onMouseOut={e => e.currentTarget.style.color = '#64748b'}>Mark all read</button>
                        )}
                        {unreadCount > 0 && <span style={{ background: '#eff6ff', color: '#2563eb', padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 600 }}>{unreadCount} New</span>}
                      </div>
                    </div>
                    <div className="custom-scrollbar" style={{ maxHeight: '420px', overflowY: 'auto' }}>
                      {notifications.length > 0 ? notifications.map((n, i) => {
                        const isRead = readNotifications.includes(n.id);
                        return (
                          <div key={n.id || i} style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', gap: '14px', alignItems: 'flex-start', background: isRead ? 'transparent' : '#f8fafc', transition: 'background 0.2s', cursor: 'default' }} onMouseOver={e => e.currentTarget.style.background = isRead ? '#f8fafc' : '#f1f5f9'} onMouseOut={e => e.currentTarget.style.background = isRead ? 'transparent' : '#f8fafc'}>
                            <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: n.type === 'stock' || n.type === 'cancel' ? '#fef2f2' : n.type === 'payment' ? '#ecfdf5' : '#eff6ff', color: n.type === 'stock' || n.type === 'cancel' ? '#ef4444' : n.type === 'payment' ? '#10b981' : '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              {n.type === 'stock' ? <Package size={18} /> : n.type === 'cancel' ? <X size={18} /> : n.type === 'payment' ? <IndianRupee size={18} /> : <ShoppingBag size={18} />}
                            </div>
                            <div style={{ flex: 1 }}>
                              <p style={{ margin: 0, fontSize: '14px', color: isRead ? '#475569' : '#0f172a', lineHeight: 1.5, fontWeight: isRead ? 400 : 600 }}>{n.text}</p>
                              <span style={{ fontSize: '12px', color: '#64748b', marginTop: '6px', display: 'block', fontWeight: 500 }}>
                                {new Date(n.time).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                              </span>
                            </div>
                            {!isRead && (
                              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#3b82f6', marginTop: '6px', flexShrink: 0 }}></div>
                            )}
                          </div>
                        );
                      }) : (
                        <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8', fontSize: '14px', fontWeight: 500 }}>No notifications</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
              <button
                className="text-link"
                onClick={async () => {
                  await api({ action: "logout" });
                  setAuthed(false);
                }}
              >
                <LogOut size={16} /> Sign out
              </button>
            </div>
          )}
        </header>
        {loading ? (
          <p style={{ color: "#64748b" }}>Loading your secure environment...</p>
        ) : !authed ? (
          <div
            style={{
              maxWidth: "440px",
              marginTop: "40px",
              background: "#fff",
              border: "1px solid #e2e8f0",
              borderRadius: "16px",
              padding: "36px",
              boxShadow: "0 10px 25px -5px rgba(0,0,0,0.05)",
            }}
          >
            <h2
              style={{
                fontSize: "22px",
                fontWeight: 800,
                color: "#0f172a",
                marginBottom: "8px",
                marginTop: 0,
              }}
            >
              Authentication Required
            </h2>
            <p
              style={{
                fontSize: "15px",
                color: "#64748b",
                marginBottom: "24px",
                marginTop: 0,
              }}
            >
              Please enter your admin password to securely access the store
              management portal.
            </p>

            <form
              onSubmit={login}
              style={{ display: "flex", flexDirection: "column", gap: "16px" }}
            >
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "14px",
                    fontWeight: 600,
                    color: "#334155",
                    marginBottom: "8px",
                  }}
                >
                  Admin Password
                </label>
                <input
                  type="password"
                  name="password"
                  placeholder="Enter password"
                  required
                  autoComplete="current-password"
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    padding: "16px",
                    border: "2px solid #e2e8f0",
                    borderRadius: "12px",
                    fontSize: "16px",
                    outline: "none",
                    transition: "border-color 0.2s",
                    backgroundColor: "#f8fafc",
                  }}
                  onFocus={(e) => (e.target.style.borderColor = "#131e2d")}
                  onBlur={(e) => (e.target.style.borderColor = "#e2e8f0")}
                />
              </div>

              {error && (
                <div
                  style={{
                    background: "#fef2f2",
                    border: "1px solid #fecaca",
                    padding: "12px",
                    borderRadius: "8px",
                  }}
                >
                  <p
                    style={{
                      margin: 0,
                      color: "#ef4444",
                      fontSize: "14px",
                      fontWeight: 500,
                    }}
                  >
                    {error}
                  </p>
                </div>
              )}

              <button
                type="submit"
                disabled={busy}
                style={{
                  width: "100%",
                  padding: "16px",
                  background: "#131e2d",
                  color: "#fff",
                  border: "none",
                  borderRadius: "12px",
                  fontSize: "16px",
                  fontWeight: 700,
                  cursor: busy ? "not-allowed" : "pointer",
                  opacity: busy ? 0.7 : 1,
                  transition: "background 0.2s",
                  marginTop: "8px",
                }}
                onMouseOver={(e) =>
                  !busy && (e.target.style.background = "#1a273a")
                }
                onMouseOut={(e) =>
                  !busy && (e.target.style.background = "#131e2d")
                }
              >
                {busy ? "Authenticating..." : "Secure Login"}
              </button>
            </form>
          </div>
        ) : (
          <>
            <style>{`
.dashboard-wrapper {
  font-family: 'Inter', system-ui, sans-serif;
  animation: fadeIn 0.4s ease-out;
}
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
.custom-kpi-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 16px; margin-bottom: 32px; }
.custom-kpi-card { background: #ffffff; border-radius: 16px; padding: 20px; border: 1px solid rgba(226, 232, 240, 0.8); box-shadow: 0 4px 20px -2px rgba(0,0,0,0.03); display: flex; align-items: flex-start; justify-content: space-between; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); position: relative; overflow: hidden; }
.custom-kpi-card::before { content: ''; position: absolute; top: 0; left: 0; width: 100%; height: 4px; background: transparent; transition: background 0.3s; }
.custom-kpi-card:hover { transform: translateY(-4px); box-shadow: 0 12px 28px -4px rgba(0,0,0,0.08); }
.custom-kpi-card:nth-child(1):hover::before { background: #3b82f6; }
.custom-kpi-card:nth-child(2):hover::before { background: #d946ef; }
.custom-kpi-card:nth-child(3):hover::before { background: #10b981; }
.custom-kpi-card:nth-child(4):hover::before { background: #f43f5e; }
.custom-kpi-content { display: flex; flex-direction: column; gap: 6px; z-index: 1; }
.custom-kpi-label { font-size: 13px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.8px; margin: 0; font-family: 'Inter', system-ui, sans-serif; }
.custom-kpi-value { font-size: 28px; font-weight: 800; color: #0f172a; margin: 0; letter-spacing: -0.5px; font-family: 'Inter', system-ui, sans-serif; }
.custom-kpi-icon-wrap { width: 44px; height: 44px; border-radius: 12px; display: flex; align-items: center; justify-content: center; z-index: 1; }
.custom-kpi-card:nth-child(1) .custom-kpi-icon-wrap { background: linear-gradient(135deg, #eff6ff, #dbeafe); color: #2563eb; }
.custom-kpi-card:nth-child(2) .custom-kpi-icon-wrap { background: linear-gradient(135deg, #fdf4ff, #fae8ff); color: #c026d3; }
.custom-kpi-card:nth-child(3) .custom-kpi-icon-wrap { background: linear-gradient(135deg, #ecfdf5, #d1fae5); color: #059669; }
.custom-kpi-card:nth-child(4) .custom-kpi-icon-wrap { background: linear-gradient(135deg, #fff1f2, #ffe4e6); color: #e11d48; }
.custom-kpi-status { font-size: 12px; font-weight: 600; padding: 4px 10px; border-radius: 20px; display: inline-flex; width: max-content; margin-top: 8px; font-family: 'Inter', system-ui, sans-serif; }
.custom-kpi-status.good { background: rgba(16, 185, 129, 0.1); color: #059669; }
.custom-kpi-status.warning { background: rgba(245, 158, 11, 0.1); color: #d97706; }
.custom-kpi-status.danger { background: rgba(244, 63, 94, 0.1); color: #e11d48; }
.section-title { font-size: 18px; font-weight: 700; color: #1e293b; margin: 0 0 16px; font-family: 'Inter', system-ui, sans-serif; letter-spacing: -0.3px; }
.chart-card { background: #ffffff; border-radius: 20px; padding: 28px; border: 1px solid rgba(226, 232, 240, 0.8); box-shadow: 0 10px 30px -5px rgba(0,0,0,0.04); margin-bottom: 32px; }
.chart-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 30px; }
.chart-header h3 { font-size: 18px; font-weight: 700; color: #0f172a; margin: 0; font-family: 'Inter', system-ui, sans-serif; }
.chart-container { position: relative; width: 100%; height: 280px; }
.chart-grid { position: absolute; inset: 0; display: flex; flex-direction: column; justify-content: space-between; pointer-events: none; padding-bottom: 24px; }
.chart-grid-line { width: 100%; height: 1px; background: #f1f5f9; border-top: 1px dashed #e2e8f0; }
.simple-bar-chart { position: absolute; inset: 0; display: flex; align-items: flex-end; justify-content: space-around; padding-bottom: 28px; padding-top: 20px; }
.bar-wrapper { display: flex; flex-direction: column; justify-content: flex-end; align-items: center; height: 100%; position: relative; cursor: pointer; width: 48px; }
.bar-fill { width: 100%; background: linear-gradient(180deg, #3b82f6 0%, #60a5fa 100%); border-radius: 8px 8px 0 0; transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1); min-height: 4px; box-shadow: 0 4px 14px rgba(59, 130, 246, 0.2); transform-origin: bottom; animation: growUp 0.8s ease-out; }
@keyframes growUp { from { transform: scaleY(0); } to { transform: scaleY(1); } }
.bar-wrapper:hover .bar-fill { background: linear-gradient(180deg, #2563eb 0%, #3b82f6 100%); box-shadow: 0 8px 20px rgba(59, 130, 246, 0.3); transform: scaleY(1.02); }
.bar-label { position: absolute; bottom: -28px; font-size: 13px; color: #64748b; font-weight: 600; font-family: 'Inter', system-ui, sans-serif; }
.bar-tooltip { position: absolute; top: -45px; background: #0f172a; color: white; padding: 6px 12px; border-radius: 8px; font-size: 13px; font-weight: 600; opacity: 0; transform: translateY(10px); transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1); pointer-events: none; white-space: nowrap; z-index: 10; font-family: 'Inter', system-ui, sans-serif; box-shadow: 0 4px 12px rgba(0,0,0,0.15); }
.bar-tooltip::after { content: ''; position: absolute; bottom: -4px; left: 50%; transform: translateX(-50%) rotate(45deg); width: 8px; height: 8px; background: #0f172a; }
.bar-wrapper:hover .bar-tooltip { opacity: 1; transform: translateY(0); }
.custom-scrollbar::-webkit-scrollbar { width: 6px; }
.custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
.custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
.custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
`}</style>
            {tab === "Dashboard" && (
              <>
                {(() => {
                  let startDate = new Date();
                  let endDate = new Date();
                  startDate.setHours(0, 0, 0, 0);
                  endDate.setHours(23, 59, 59, 999);
                  let filterTitle = "Today";
                  let chartDays = 1;

                  if (dashboardFilter === "today") {
                    chartDays = 1;
                  } else if (dashboardFilter === "this_week") {
                    startDate.setDate(startDate.getDate() - startDate.getDay());
                    filterTitle = "This Week";
                    chartDays = 7;
                  } else if (dashboardFilter === "this_month") {
                    startDate.setDate(1);
                    filterTitle = "This Month";
                    chartDays = endDate.getDate();
                  } else if (dashboardFilter === "last_month") {
                    startDate.setMonth(startDate.getMonth() - 1);
                    startDate.setDate(1);
                    endDate = new Date(startDate);
                    endDate.setMonth(endDate.getMonth() + 1);
                    endDate.setDate(0);
                    endDate.setHours(23, 59, 59, 999);
                    filterTitle = "Last Month";
                    chartDays = endDate.getDate();
                  } else if (dashboardFilter === "custom") {
                    if (dashboardCustomDates.start) {
                       startDate = new Date(dashboardCustomDates.start);
                       startDate.setHours(0, 0, 0, 0);
                    }
                    if (dashboardCustomDates.end) {
                       endDate = new Date(dashboardCustomDates.end);
                       endDate.setHours(23, 59, 59, 999);
                    } else {
                       endDate = new Date(startDate);
                       endDate.setHours(23, 59, 59, 999);
                    }
                    filterTitle = "Custom Range";
                    chartDays = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
                    if (chartDays > 60) chartDays = 60;
                  }

                  const filteredOrders = orders.filter(o => {
                    const d = new Date(o.created_at);
                    return d >= startDate && d <= endDate;
                  });
                  
                  const ordersCount = filteredOrders.length;
                  const revenueCount = filteredOrders.filter(isRevenueOrder).reduce((s, o) => s + o.total, 0);
                  const cancelledCount = filteredOrders.filter(o => o.status === "Cancelled").length;
                  const itemsSold = filteredOrders.filter(o => o.status !== "Cancelled").reduce((total, o) => {
                    const items = parseOrderItems(o.items);
                    return total + items.reduce((s: number, item: any) => s + (item.qty || 1), 0);
                  }, 0);

                  const chartData = Array.from({ length: chartDays }, (_, i) => {
                    const d = new Date(endDate);
                    d.setDate(d.getDate() - ((chartDays - 1) - i));
                    return { date: d.toISOString().split('T')[0], label: d.toLocaleDateString('en-US', chartDays <= 7 ? { weekday: 'short' } : { day: 'numeric', month: 'short' }), revenue: 0, orders: 0 };
                  });
                  
                  filteredOrders.forEach(o => {
                    if (!isRevenueOrder(o)) return;
                    const d = o.created_at.split('T')[0];
                    const day = chartData.find(x => x.date === d);
                    if (day) {
                      day.revenue += o.total;
                      day.orders += 1;
                    }
                  });

                  return (
                    <div className="dashboard-wrapper">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
                        <h2 className="section-title" style={{ margin: 0 }}>Performance Overview</h2>
                        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                          {dashboardFilter === "custom" && (
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <input type="date" value={dashboardCustomDates.start} onChange={e => setDashboardCustomDates({...dashboardCustomDates, start: e.target.value})} style={{ padding: '8px 12px', borderRadius: '10px', border: '1px solid rgba(226, 232, 240, 0.8)', fontSize: '13px', outline: 'none' }} />
                              <input type="date" value={dashboardCustomDates.end} onChange={e => setDashboardCustomDates({...dashboardCustomDates, end: e.target.value})} style={{ padding: '8px 12px', borderRadius: '10px', border: '1px solid rgba(226, 232, 240, 0.8)', fontSize: '13px', outline: 'none' }} />
                            </div>
                          )}
                          <select value={dashboardFilter} onChange={e => setDashboardFilter(e.target.value)} style={{ padding: '9px 14px', borderRadius: '10px', border: '1px solid rgba(226, 232, 240, 0.8)', fontSize: '13px', outline: 'none', background: '#fff', cursor: 'pointer', fontWeight: 600, color: '#334155', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                            <option value="today">Today</option>
                            <option value="this_week">This Week</option>
                            <option value="this_month">This Month</option>
                            <option value="last_month">Last Month</option>
                            <option value="custom">Custom Range</option>
                          </select>
                        </div>
                      </div>
                      
                      <div className="custom-kpi-grid">
                        <div className="custom-kpi-card">
                          <div className="custom-kpi-content">
                            <h3 className="custom-kpi-label">Items Sold</h3>
                            <p className="custom-kpi-value">{itemsSold}</p>
                            <span className="custom-kpi-status good">{filterTitle}</span>
                          </div>
                          <div className="custom-kpi-icon-wrap">
                            <Package size={22} />
                          </div>
                        </div>
                        <div className="custom-kpi-card">
                          <div className="custom-kpi-content">
                            <h3 className="custom-kpi-label">Orders Placed</h3>
                            <p className="custom-kpi-value">{ordersCount}</p>
                            <span className="custom-kpi-status good">{filterTitle}</span>
                          </div>
                          <div className="custom-kpi-icon-wrap">
                            <ShoppingBag size={22} />
                          </div>
                        </div>
                        <div className="custom-kpi-card">
                          <div className="custom-kpi-content">
                            <h3 className="custom-kpi-label">Revenue</h3>
                            <p className="custom-kpi-value">{money(revenueCount)}</p>
                            <span className="custom-kpi-status good">{filterTitle}</span>
                          </div>
                          <div className="custom-kpi-icon-wrap">
                            <IndianRupee size={22} />
                          </div>
                        </div>
                        <div className="custom-kpi-card">
                          <div className="custom-kpi-content">
                            <h3 className="custom-kpi-label">Cancelled</h3>
                            <p className="custom-kpi-value">{cancelledCount}</p>
                            <span className="custom-kpi-status danger">{filterTitle}</span>
                          </div>
                          <div className="custom-kpi-icon-wrap">
                            <X size={22} />
                          </div>
                        </div>
                      </div>

                      <div className="chart-card">
                        <div className="chart-header">
                          <h3>Sales Overview ({filterTitle})</h3>
                          <BarChart3 size={22} color="#64748b" />
                        </div>
                        <div className="chart-container">
                          <div className="chart-grid">
                            <div className="chart-grid-line"></div>
                            <div className="chart-grid-line"></div>
                            <div className="chart-grid-line"></div>
                            <div className="chart-grid-line"></div>
                          </div>
                          <div className="simple-bar-chart">
                            {(() => {
                              const maxVal = Math.max(...chartData.map(d => d.revenue), 1);
                              return chartData.map((d, i) => (
                                <div key={i} className="bar-wrapper">
                                  <div className="bar-tooltip">₹{d.revenue.toLocaleString()}</div>
                                  <div className="bar-fill" style={{ height: `${(d.revenue / maxVal) * 100}%` }}></div>
                                  <span className="bar-label">{d.label}</span>
                                </div>
                              ));
                            })()}
                          </div>
                        </div>
                      </div>

                    </div>
                  );
                })()}
              </>
            )}
            <div className="demo-notice">
              Checkout mode: {settings.paymentMode}. Gateway:{" "}
              {payment.ready ? "configured" : "not configured"}. Cashfree
              orders require payment verification; COD orders remain pending
              until delivery is completed.
            </div>
            {notice && (
              <p className="save-notice" role="status">
                <Check size={17} />
                {notice}
              </p>
            )}
            {error && !editing && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
            {tab !== "Dashboard" && (
              <div className="admin-table-head">
                <h2>{tab}</h2>
                {tab === "Products" && (
                  <button
                    className="primary"
                    onClick={() => {
                      setError("");
                      setEditing({
                        id: "piece-" + crypto.randomUUID().slice(0, 8),
                        name: "",
                        category: "Cushion covers",
                        price: 1000,
                        stock: 10,
                        image: "/cushion.png",
                        description: "",
                        material: "Cotton",
                        color: "Natural",
                        size: "40 x 40 cm",
                        seoTitle: "",
                        seoDescription: "",
                        dimensions: "",
                        tag: "NEW ARRIVAL",
                      });
                    }}
                  >
                    <Plus size={16} /> Add product
                  </button>
                )}
                {tab === "Coupons" && (
                  <button
                    className="primary"
                    onClick={() => window.dispatchEvent(new CustomEvent('openCouponModal'))}
                  >
                    <Plus size={16} /> Create Coupon
                  </button>
                )}
              </div>
            )}
            {!["Dashboard", "Products", "Orders"].includes(tab) ? (
              <Controls
                key={tab}
                tab={tab}
                settings={settings}
                coupons={coupons}
                payment={payment}
                api={api}
                reload={load}
              />
            ) : tab === "Products" ? (
              <div className="custom-table-container dashboard-wrapper">
                <div className="custom-kpi-grid" style={{ marginBottom: '24px' }}>
                  <div className="custom-kpi-card">
                    <div className="custom-kpi-content">
                      <h3 className="custom-kpi-label">Total Products</h3>
                      <p className="custom-kpi-value">{products.length}</p>
                      <span className="custom-kpi-status good">Active Catalog</span>
                    </div>
                    <div className="custom-kpi-icon-wrap">
                      <Package size={22} />
                    </div>
                  </div>
                  <div className="custom-kpi-card">
                    <div className="custom-kpi-content">
                      <h3 className="custom-kpi-label">Total Orders</h3>
                      <p className="custom-kpi-value">{orders.length}</p>
                      <span className="custom-kpi-status good">All Time</span>
                    </div>
                    <div className="custom-kpi-icon-wrap">
                      <ShoppingBag size={22} />
                    </div>
                  </div>
                  <div className="custom-kpi-card">
                    <div className="custom-kpi-content">
                      <h3 className="custom-kpi-label">Net Revenue</h3>
                      <p className="custom-kpi-value">
                        {money(
                          orders
                            .filter(isRevenueOrder)
                            .reduce((s, o) => s + o.total, 0),
                        )}
                      </p>
                      <span className="custom-kpi-status good">
                        Paid + delivered COD
                      </span>
                    </div>
                    <div className="custom-kpi-icon-wrap">
                      <IndianRupee size={22} />
                    </div>
                  </div>
                  <div className="custom-kpi-card">
                    <div className="custom-kpi-content">
                      <h3 className="custom-kpi-label">Low Stock Alerts</h3>
                      <p className="custom-kpi-value">
                        {products.filter((p) => p.stock < 10).length}
                      </p>
                      <span
                        className={`custom-kpi-status ${products.filter((p) => p.stock < 10).length > 0 ? "danger" : "good"}`}
                      >
                        {products.filter((p) => p.stock < 10).length > 0
                          ? "Requires Attention"
                          : "Stock Healthy"}
                      </span>
                    </div>
                    <div className="custom-kpi-icon-wrap">
                      <Package size={22} />
                    </div>
                  </div>
                </div>
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Category</th>
                      <th>Price</th>
                      <th>Status</th>
                      <th className="text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map((p) => (
                      <tr key={p.id}>
                        <td>
                          <div className="custom-table-product">
                            <div className="custom-table-img-wrap">
                              <img
                                src={(p.image || "/cushion.png").split(",")[0]}
                                alt=""
                                loading="lazy"
                                decoding="async"
                                onError={(e) => {
                                  (e.currentTarget as HTMLImageElement).src = "/cushion.png";
                                }}
                              />
                            </div>
                            <div className="custom-table-product-info">
                              <strong>{p.name}</strong>
                              <small>{p.id}</small>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className="custom-category-badge">
                            {p.category}
                          </span>
                        </td>
                        <td className="custom-table-price">{money(p.price)}</td>
                        <td>
                          <span
                            className={`custom-stock-badge ${p.stock < 10 ? "low" : "ok"}`}
                          >
                            <span className="dot"></span>
                            {p.stock} in stock
                          </span>
                        </td>
                        <td>
                          <div className="custom-table-actions">
                            <a
                              href={`/products/${p.id}`}
                              className="custom-action-btn view-btn"
                            >
                              <ArrowUpRight size={14} /> View
                            </a>
                            <button
                              className="custom-action-btn edit-btn"
                              onClick={() => {
                                setError("");
                                setEditing(p);
                              }}
                            >
                              Edit
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : tab === "Orders" ? (
              <>
                <style>{`
.custom-order-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 24px; margin-top: 20px; }
.custom-order-card { background: #fff; border-radius: 16px; border: 1px solid #e2e8f0; box-shadow: 0 4px 12px -2px rgba(0,0,0,0.03); overflow: hidden; display: flex; flex-direction: column; transition: transform 0.2s, box-shadow 0.2s; }
.custom-order-card:hover { transform: translateY(-4px); box-shadow: 0 12px 24px -4px rgba(0,0,0,0.06); }
.custom-order-header { padding: 14px 16px; border-bottom: 1px solid #f1f5f9; display: flex; justify-content: space-between; align-items: flex-start; background: #f8fafc; flex-wrap: wrap; gap: 12px; }
.custom-order-id { font-size: 15px; font-weight: 800; color: #0f172a; margin: 0; letter-spacing: 0.5px; display: flex; align-items: center; gap: 8px; }
.custom-order-date { font-size: 11px; color: #64748b; font-weight: 600; margin-top: 4px; display: block; }
.custom-order-status { padding: 4px 8px; border-radius: 6px; border: 1px solid #cbd5e1; font-size: 12px; font-weight: 600; color: #334155; background: #fff; cursor: pointer; outline: none; }
.custom-order-status:focus { border-color: #0ea5e9; box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.1); }
.custom-order-body { padding: 16px; display: flex; flex-direction: column; gap: 16px; }
.custom-order-user { display: flex; flex-direction: column; gap: 14px; }
.custom-order-customer { display: flex; justify-content: space-between; align-items: center; }
.custom-order-customer h3 { margin: 0; font-size: 15px; font-weight: 800; color: #1e293b; display: flex; align-items: center; gap: 8px; }
.custom-order-total { font-size: 14px; font-weight: 900; color: #059669; background: #d1fae5; padding: 4px 10px; border-radius: 20px; }
.custom-order-contact { display: flex; flex-direction: column; gap: 8px; }
.custom-contact-item { display: flex; align-items: center; gap: 8px; font-size: 12px; color: #475569; background: #f1f5f9; padding: 8px 12px; border-radius: 12px; font-weight: 600; }
.custom-order-address { font-size: 12px; color: #475569; line-height: 1.6; background: #f8fafc; padding: 10px 14px; border-radius: 12px; border-left: 3px solid #cbd5e1; }
.custom-order-address strong { color: #334155; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; display: block; margin-bottom: 4px; }
.custom-order-items { margin: 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 6px; border-top: 1px dashed #e2e8f0; padding-top: 14px; }
.custom-order-item { display: flex; justify-content: space-between; align-items: center; font-size: 12px; font-weight: 500; color: #334155; padding: 8px 10px; border-radius: 10px; background: #f8fafc; }
.custom-item-name { color: #1e293b; font-weight: 600; }
.custom-item-price { color: #64748b; font-weight: 700; }
`}</style>
                <div
                  className="coupon-tab-nav"
                  style={{ display: "flex", gap: "10px", marginBottom: "20px" }}
                >
                  <button
                    onClick={() => setOrderTab("Pending")}
                    className={orderTab === "Pending" ? "primary" : ""}
                    style={
                      orderTab !== "Pending"
                        ? {
                            padding: "10px 16px",
                            background: "#f1f5f9",
                            border: "none",
                            borderRadius: "8px",
                            cursor: "pointer",
                            color: "#475569",
                            fontWeight: 600,
                          }
                        : {}
                    }
                  >
                    Pending Orders
                  </button>
                  <button
                    onClick={() => setOrderTab("Delivered")}
                    className={orderTab === "Delivered" ? "primary" : ""}
                    style={
                      orderTab !== "Delivered"
                        ? {
                            padding: "10px 16px",
                            background: "#f1f5f9",
                            border: "none",
                            borderRadius: "8px",
                            cursor: "pointer",
                            color: "#475569",
                            fontWeight: 600,
                          }
                        : {}
                    }
                  >
                    Delivered
                  </button>
                  <button
                    onClick={() => setOrderTab("Cancelled")}
                    className={orderTab === "Cancelled" ? "primary" : ""}
                    style={
                      orderTab !== "Cancelled"
                        ? {
                            padding: "10px 16px",
                            background: "#f1f5f9",
                            border: "none",
                            borderRadius: "8px",
                            cursor: "pointer",
                            color: "#475569",
                            fontWeight: 600,
                          }
                        : {}
                    }
                  >
                    Cancelled
                  </button>
                </div>
                <div className="custom-order-grid">
                  {!filteredOrdersForTab.length ? (
                    <div className="empty" style={{ gridColumn: "1 / -1" }}>
                      <ShoppingBag size={38} />
                      <h3>No {orderTab.toLowerCase()} orders.</h3>
                      <p>
                        Orders will appear here as customers place Cashfree or
                        COD purchases.
                      </p>
                      <a className="text-link" href="/">
                        Visit storefront <ArrowUpRight size={17} />
                      </a>
                    </div>
                  ) : null}
                  {filteredOrdersForTab.map((o) => (
                      <article key={o.id} className="custom-order-card">
                        <div className="custom-order-header">
                          <div>
                            <h2 className="custom-order-id">
                              #{o.id.slice(0, 8).toUpperCase()}
                            </h2>
                            <span className="custom-order-date">
                              {new Date(o.created_at).toLocaleString("en-IN")}
                            </span>
                          </div>
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <select
                              aria-label={"Status for order " + o.id.slice(0, 8)}
                              value={o.status}
                              className="custom-order-status"
                              onChange={async (e) => {
                                try {
                                  await api({
                                    action: "updateOrder",
                                    id: o.id,
                                    status: e.target.value,
                                  });
                                  await load();
                                } catch (e) {
                                  setError((e as Error).message);
                                }
                              }}
                            >
                              {ORDER_STATUSES.map((x) => (
                                <option key={x}>{x}</option>
                              ))}
                            </select>
                            <button
                              type="button"
                              title="View Order Details"
                              onClick={() => setViewingOrder(o)}
                              style={{
                                padding: "8px",
                                background: "#0ea5e9",
                                color: "white",
                                border: "none",
                                borderRadius: "8px",
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                              }}
                            >
                              <Eye size={16} />
                            </button>
                            <button
                              type="button"
                              title="Print Invoice"
                              onClick={() => downloadInvoice(o)}
                              style={{
                                padding: "8px",
                                background: "#0e7579",
                                color: "white",
                                border: "none",
                                borderRadius: "8px",
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                              }}
                            >
                              <Printer size={16} />
                            </button>
                          </div>
                        </div>
                        <div className="custom-order-body">
                          <div className="custom-order-user">
                            <div className="custom-order-customer">
                              <h3>{o.customer}</h3>
                              <span className="custom-order-total">
                                {money(o.total)}
                              </span>
                            </div>
                            <div className="custom-order-contact">
                              <div className="custom-contact-item">
                                Phone: {o.phone}
                              </div>
                              <div className="custom-contact-item">
                                Pincode: {o.pincode}
                              </div>
                              <div className="custom-contact-item">
                                Payment: {paymentText(o.payment_status)} via{" "}
                                {o.payment_method || "unknown"}
                              </div>
                              {o.payment_id && (
                                <div className="custom-contact-item">
                                  Ref: {o.payment_id}
                                </div>
                              )}
                            </div>
                            <div className="custom-order-address">
                              <strong>Delivery Address</strong>
                              {o.address}
                            </div>
                          </div>
                          <ul className="custom-order-items">
                            {parseOrderItems(o.items).map((x: any) => (
                              <li key={x.id} className="custom-order-item">
                                <span className="custom-item-name">
                                  {x.name}{" "}
                                  <span style={{ color: "#94a3b8" }}>
                                    x {x.qty}
                                  </span>
                                </span>{" "}
                                <span className="custom-item-price">
                                  {money(x.price * x.qty)}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </article>
                    ))}
                </div>
              </>
            ) : null}
          </>
        )}
        {editing && (
          <dialog
            ref={editDialog}
            className="edit-overlay"
            onCancel={() => setEditing(null)}
          >
            <section
              className="edit-product"
              role="dialog"
              aria-modal="true"
              aria-labelledby="edit-title"
            >
              <div className="cart-head">
                <h2 id="edit-title">Product details</h2>
                <button
                  aria-label="Close editor"
                  onClick={() => setEditing(null)}
                >
                  <X />
                </button>
              </div>
              <form onSubmit={save}>
                <label>
                  Product name
                  <input
                    name="name"
                    defaultValue={editing.name}
                    required
                    maxLength={100}
                    autoFocus
                  />
                </label>
                <div className="form-row">
                  <label>
                    Category
                    <select name="category" defaultValue={editing.category}>
                      {categories.map((c) => (
                        <option key={c}>{c}</option>
                      ))}
                    </select>
                  </label>
                </div>
                <div>
                  <label>Product image</label>
                  <MultiImagePicker
                    value={editing.image}
                    onChange={(image) => setEditing({ ...editing, image })}
                    api={api}
                  />
                </div>
                <div className="form-row">
                  <label>
                    Price (₹)
                    <input
                      name="price"
                      type="number"
                      min="1"
                      max="1000000"
                      step="1"
                      defaultValue={editing.price}
                      required
                    />
                  </label>
                  <label>
                    Stock
                    <input
                      name="stock"
                      type="number"
                      min="0"
                      max="100000"
                      step="1"
                      defaultValue={editing.stock}
                      required
                    />
                  </label>
                </div>
                <div className="form-row">
                  <label>
                    Colour
                    <input
                      name="color"
                      required
                      maxLength={40}
                      defaultValue={editing.color}
                    />
                  </label>
                  <label>
                    Size
                    <input
                      name="size"
                      required
                      maxLength={60}
                      defaultValue={editing.size}
                    />
                  </label>
                </div>
                <label>
                  Description
                  <textarea
                    name="description"
                    defaultValue={editing.description}
                    maxLength={1000}
                  />
                </label>
                <div className="form-row">
                  <label>
                    Material
                    <input
                      name="material"
                      defaultValue={editing.material}
                      required
                      maxLength={100}
                    />
                  </label>
                  <label>
                    Dimensions
                    <input
                      name="dimensions"
                      defaultValue={editing.dimensions}
                      maxLength={100}
                    />
                  </label>
                </div>
                <label>
                  Image Switch Time (Seconds)
                  <input
                    name="imageSwitchTime"
                    type="number"
                    min="1"
                    max="60"
                    step="0.5"
                    defaultValue={editing.imageSwitchTime || 3}
                    placeholder="E.g. 3 (Default is 3 seconds)"
                  />
                </label>
                <label>
                  SEO title
                  <input
                    name="seoTitle"
                    maxLength={70}
                    defaultValue={editing.seoTitle || ""}
                    placeholder="Optional — uses product name"
                  />
                </label>
                <label>
                  SEO description
                  <textarea
                    name="seoDescription"
                    maxLength={170}
                    defaultValue={editing.seoDescription || ""}
                    placeholder="Optional — uses product description"
                  />
                </label>
                {error && (
                  <p className="error" role="alert">
                    {error}
                  </p>
                )}
                <button className="primary" disabled={busy}>
                  {busy ? "Saving…" : "Save product"}
                  <Check size={18} />
                </button>
              </form>
            </section>
          </dialog>
        )}
        {viewingOrder && (
          <dialog
            ref={viewOrderDialog}
            className="edit-overlay"
            onCancel={() => setViewingOrder(null)}
          >
            <section
              className="edit-product"
              style={{ maxWidth: '600px' }}
              role="dialog"
              aria-modal="true"
              aria-labelledby="view-title"
            >
              <div className="cart-head">
                <div>
                  <h2 id="view-title" style={{ margin: 0 }}>Order #{viewingOrder.id.slice(0, 8).toUpperCase()}</h2>
                  <small>{new Date(viewingOrder.created_at).toLocaleString("en-IN")}</small>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    className="primary"
                    style={{ margin: 0, padding: '8px 12px' }}
                    onClick={() => downloadInvoice(viewingOrder)}
                    title="Print Invoice"
                  >
                    <Printer size={16} /> Print
                  </button>
                  <button
                    aria-label="Close viewer"
                    style={{ padding: '8px' }}
                    onClick={() => setViewingOrder(null)}
                  >
                    <X />
                  </button>
                </div>
              </div>
              <div style={{ padding: '30px 40px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '30px' }}>
                  <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '12px' }}>
                    <h3 style={{ margin: '0 0 15px', fontSize: '15px', color: '#0f172a' }}>Customer Info</h3>
                    <p style={{ margin: '0 0 8px', fontSize: '14px', fontWeight: 600 }}>{viewingOrder.customer}</p>
                    <p style={{ margin: '0 0 4px', fontSize: '13px', color: '#475569' }}>Phone: {viewingOrder.phone}</p>
                  </div>
                  <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '12px' }}>
                    <h3 style={{ margin: '0 0 15px', fontSize: '15px', color: '#0f172a' }}>Delivery Details</h3>
                    <p style={{ margin: '0 0 8px', fontSize: '13px', color: '#475569', lineHeight: 1.5 }}>
                      {viewingOrder.address}<br />
                      Pincode: {viewingOrder.pincode}
                    </p>
                    <div style={{ display: 'inline-block', padding: '4px 10px', background: '#e2e8f0', borderRadius: '6px', fontSize: '12px', fontWeight: 600, color: '#334155' }}>
                      Status: {viewingOrder.status}
                    </div>
                  </div>
                </div>
                
                <h3 style={{ margin: '0 0 15px', fontSize: '15px', color: '#0f172a', borderBottom: '2px solid #f1f5f9', paddingBottom: '10px' }}>Order Items</h3>
                <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 30px' }}>
                  {parseOrderItems(viewingOrder.items).map((x: any) => (
                    <li key={x.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #f1f5f9', fontSize: '14px' }}>
                      <span style={{ fontWeight: 500, color: '#1e293b' }}>
                        {x.name} <span style={{ color: '#64748b', fontSize: '13px', marginLeft: '8px' }}>x {x.qty}</span>
                      </span>
                      <span style={{ fontWeight: 600, color: '#0f172a' }}>
                        {money(x.price * x.qty)}
                      </span>
                    </li>
                  ))}
                </ul>

                <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '20px', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h3 style={{ margin: '0 0 4px', fontSize: '14px', color: '#166534' }}>Payment Information</h3>
                    <p style={{ margin: 0, fontSize: '13px', color: '#15803d' }}>
                      Method: {viewingOrder.payment_method || 'unknown'} | Status: {paymentText(viewingOrder.payment_status)}
                      {viewingOrder.payment_id ? ` | Ref: ${viewingOrder.payment_id}` : ''}
                    </p>
                  </div>
                  <strong style={{ fontSize: '24px', color: '#166534' }}>{money(viewingOrder.total)}</strong>
                </div>
              </div>
            </section>
          </dialog>
        )}
      </main>
    </div>
  );
}
