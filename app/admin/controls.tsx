"use client";
import { useState, useEffect } from "react";
import { categories, ShopSettings, Coupon, sampleImages } from "../shop-config";
type Props = {
  tab: string;
  settings: ShopSettings;
  coupons: Coupon[];
  payment: any;
  api: (body: any) => Promise<any>;
  reload: () => Promise<void>;
};
export function MultiImagePicker({
  value,
  onChange,
  api,
}: {
  value: string;
  onChange: (v: string) => void;
  api: Props["api"];
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const images = value ? value.split(",").filter(Boolean) : [];

  const handleRemove = (index: number) => {
    const newImages = [...images];
    newImages.splice(index, 1);
    onChange(newImages.join(","));
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setError("");

    for (let i = 0; i < files.length; i++) {
      if (files[i].size > 25000000) {
        setError("All media must be under 25 MB.");
        return;
      }
    }

    setBusy(true);
    try {
      let uploadedUrls = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const data = await new Promise<string>((resolve, reject) => {
          const r = new FileReader();
          r.onload = () => resolve(String(r.result).split(",")[1]);
          r.onerror = reject;
          r.readAsDataURL(file);
        });
        const r = await api({ action: "uploadMedia", mime: file.type, data });
        uploadedUrls.push(r.url);
      }
      onChange([...images, ...uploadedUrls].join(","));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
      e.target.value = "";
    }
  };

  return (
    <div
      className="multi-image-picker"
      style={{
        background: "#f8fafc",
        padding: "16px",
        borderRadius: "12px",
        border: "1px solid #e2e8f0",
      }}
    >
      <div
        className="image-grid"
        style={{
          display: "flex",
          gap: "12px",
          flexWrap: "wrap",
          marginBottom: "16px",
        }}
      >
        {images.map((img, i) => (
          <div
            key={i}
            style={{
              position: "relative",
              width: "80px",
              height: "80px",
              border: "1px solid #cbd5e1",
              borderRadius: "8px",
              overflow: "hidden",
              background: "#fff",
            }}
          >
            {/\.mp4|\.webm/i.test(img) ? (
              <video
                src={img}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
                muted
              />
            ) : (
              <img
                src={img}
                alt="Preview"
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            )}
            <button
              type="button"
              onClick={() => handleRemove(i)}
              title="Remove image"
              style={{
                position: "absolute",
                top: "4px",
                right: "4px",
                background: "rgba(239,68,68,0.9)",
                color: "white",
                border: "none",
                borderRadius: "50%",
                width: "22px",
                height: "22px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                fontSize: "14px",
                lineHeight: "1",
              }}
            >
              &times;
            </button>
          </div>
        ))}
      </div>
      <div
        style={{
          display: "flex",
          gap: "12px",
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <label
          className="upload-label"
          style={{
            display: "inline-flex",
            padding: "10px 18px",
            background: "#3b82f6",
            color: "white",
            fontWeight: "600",
            borderRadius: "8px",
            cursor: "pointer",
            fontSize: "13px",
            transition: "all 0.2s",
          }}
        >
          {busy ? "Uploading..." : "+ Add Media"}
          <input
            type="file"
            multiple
            accept="image/png,image/jpeg,image/webp,video/mp4,video/webm"
            disabled={busy}
            style={{ display: "none" }}
            onChange={handleUpload}
          />
        </label>
        <select
          aria-label="Add saved banner media"
          defaultValue=""
          onChange={(e) => {
            if (e.target.value) {
              onChange([...images, e.target.value].join(","));
              e.currentTarget.value = "";
            }
          }}
          style={{ maxWidth: "240px" }}
        >
          <option value="">Add saved media</option>
          {sampleImages
            .filter((v) => !images.includes(v))
            .map((v) => (
              <option key={v} value={v}>
                {v.slice(1)}
              </option>
            ))}
        </select>
        <span style={{ fontSize: "12px", color: "#64748b" }}>
          Select images or videos (max 25MB)
        </span>
      </div>
      {error && (
        <p
          className="error"
          style={{
            color: "#ef4444",
            fontSize: "13px",
            marginTop: "10px",
            fontWeight: "500",
          }}
        >
          {error}
        </p>
      )}
    </div>
  );
}

export function ImagePicker({
  value,
  onChange,
  api,
}: {
  value: string;
  onChange: (v: string) => void;
  api: Props["api"];
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <div className="image-picker">
      <img src={value} alt="Selected image preview" />
      <select
        aria-label="Choose sample image"
        value={sampleImages.includes(value) ? value : "custom"}
        onChange={(e) => {
          if (e.target.value !== "custom") onChange(e.target.value);
        }}
      >
        {sampleImages.map((v) => (
          <option key={v} value={v}>
            {v.slice(1, -4)}
          </option>
        ))}
        {!sampleImages.includes(value) && (
          <option value="custom">Uploaded image</option>
        )}
      </select>
      <label className="upload-label">
        {busy ? "Uploading…" : "Upload Image or Video (max 25 MB)"}
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp,video/mp4,video/webm"
          disabled={busy}
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            setError("");
            if (file.size > 25000000) {
              setError("Choose media under 25 MB.");
              return;
            }
            setBusy(true);
            try {
              const data = await new Promise<string>((resolve, reject) => {
                const r = new FileReader();
                r.onload = () => resolve(String(r.result).split(",")[1]);
                r.onerror = reject;
                r.readAsDataURL(file);
              });
              const r = await api({
                action: "uploadMedia",
                mime: file.type,
                data,
              });
              onChange(r.url);
            } catch (e) {
              setError((e as Error).message);
            } finally {
              setBusy(false);
              e.target.value = "";
            }
          }}
        />
      </label>
      {error && <p className="error">{error}</p>}
    </div>
  );
}
export default function Controls({
  tab,
  settings,
  coupons,
  payment,
  api,
  reload,
}: Props) {
  const [s, setS] = useState(settings),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState(""),
    [error, setError] = useState("");
  const blank: Coupon = {
    code: "",
    type: "percent",
    value: 10,
    minOrder: 0,
    expires: "",
    active: true,
  };
  const [coupon, setCoupon] = useState<Coupon>(blank);
  const [couponTab, setCouponTab] = useState<"list" | "create">("list");
  useEffect(() => {
    const handler = () => { setCoupon(blank); setCouponTab("create"); };
    window.addEventListener("openCouponModal", handler);
    return () => window.removeEventListener("openCouponModal", handler);
  }, []);
  const field = (
    key: keyof ShopSettings,
    label: string,
    max: number,
    multi = false,
  ) => (
    <label>
      {label}
      {multi ? (
        <textarea
          maxLength={max}
          required
          value={s[key]}
          onChange={(e) => setS({ ...s, [key]: e.target.value })}
        />
      ) : (
        <input
          required
          maxLength={max}
          value={s[key]}
          onChange={(e) => setS({ ...s, [key]: e.target.value })}
        />
      )}
      <small>
        {s[key].length}/{max} characters
      </small>
    </label>
  );
  async function save(body: any) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await api(body);
      await reload();
      setNotice("Saved. Changes are now available on the storefront.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="admin-controls">
      {notice && (
        <p role="status" className="save-notice">
          {notice}
        </p>
      )}
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      {tab === "Coupons" ? (
        <>
          <div
            className="coupon-tab-nav"
            style={{ display: "none" }}
          >
          </div>
          {couponTab === "create" ? (
            <div style={{
              position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
              background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
            }}>
              <div style={{
                background: '#fff', padding: '24px', borderRadius: '16px', width: '100%', maxWidth: '460px',
                boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h2 style={{ margin: 0, fontSize: '20px', color: '#0f172a' }}>{coupon.code ? "Edit Coupon" : "Create Coupon"}</h2>
                  <button type="button" onClick={() => setCouponTab("list")} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#64748b' }}>&times;</button>
                </div>
                <p style={{ color: '#64748b', fontSize: '13px', marginBottom: '20px', lineHeight: 1.5 }}>
                  Create promotional codes with a percentage or fixed rupee discount. Expiry is evaluated in India time.
                </p>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    save({ action: "saveCoupon", coupon });
                    setCouponTab("list");
                  }}
                  style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
                >
                  <div className="form-row">
                    <label>
                      Coupon code
                      <input
                        required
                        pattern="[A-Z0-9_\-]{3,24}"
                        value={coupon.code}
                        onChange={(e) =>
                          setCoupon({
                            ...coupon,
                            code: e.target.value.toUpperCase(),
                          })
                        }
                        placeholder="WELCOME10"
                      />
                    </label>
                    <label>
                      Discount type
                      <select
                        value={coupon.type}
                        onChange={(e) =>
                          setCoupon({
                            ...coupon,
                            type: e.target.value as Coupon["type"],
                          })
                        }
                      >
                        <option value="percent">Percentage (%)</option>
                        <option value="fixed">Fixed amount (Rs.)</option>
                      </select>
                    </label>
                  </div>
                  <div className="form-row">
                    <label>
                      Discount value
                      <input
                        type="number"
                        required
                        min="1"
                        max={coupon.type === "percent" ? 99 : 100000}
                        value={coupon.value}
                        onChange={(e) =>
                          setCoupon({ ...coupon, value: Number(e.target.value) })
                        }
                      />
                    </label>
                    <label>
                      Minimum order (Rs.)
                      <input
                        type="number"
                        required
                        min="0"
                        value={coupon.minOrder}
                        onChange={(e) =>
                          setCoupon({
                            ...coupon,
                            minOrder: Number(e.target.value),
                          })
                        }
                      />
                    </label>
                    <label>
                      Expiry date (optional)
                      <input
                        type="date"
                        value={coupon.expires}
                        onChange={(e) =>
                          setCoupon({ ...coupon, expires: e.target.value })
                        }
                      />
                    </label>
                  </div>
                  <label className="check-label" style={{ marginTop: '8px' }}>
                    <input
                      type="checkbox"
                      checked={coupon.active}
                      onChange={(e) =>
                        setCoupon({ ...coupon, active: e.target.checked })
                      }
                    />{" "}
                    Active coupon
                  </label>
                  <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                    <button className="primary" style={{ flex: 1 }} disabled={busy}>
                      {busy ? "Saving..." : "Save coupon"}
                    </button>
                    <button
                      type="button"
                      style={{ padding: '0 24px', background: '#f1f5f9', border: 'none', borderRadius: '10px', fontWeight: 600, color: '#475569', cursor: 'pointer' }}
                      onClick={() => setCouponTab("list")}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          ) : null}
          <style>{`  .custom-upload-btn { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 12px 20px; background: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 12px; cursor: pointer; color: #0f172a; font-weight: 700; font-size: 14px; transition: all 0.2s; }  .custom-upload-btn:hover { background: #f1f5f9; border-color: #94a3b8; }  .custom-upload-btn input[type="file"] { display: none; }  .upload-hint { font-size: 11px; color: #64748b; font-weight: 500; margin-top: 4px; }  .image-picker > select { padding: 10px 14px; border-radius: 10px; border: 1px solid #cbd5e1; font-size: 14px; outline: none; transition: border 0.2s; background: #fff; }  .image-picker > select:focus { border-color: #10b981; box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1); }  .custom-coupon-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 24px; margin-top: 30px; }  .custom-coupon-card { background: #ffffff; border-radius: 16px; padding: 24px; border: 1px solid #e2e8f0; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05); position: relative; overflow: hidden; transition: transform 0.2s, box-shadow 0.2s; display: flex; flex-direction: column; align-items: stretch; gap: 0; }  .custom-coupon-card:hover { transform: translateY(-4px); box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1); }  .custom-coupon-card.disabled { background: #f8fafc; opacity: 0.75; filter: grayscale(1); }  .custom-coupon-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; }  .custom-coupon-code { font-size: 24px; font-weight: 900; color: #0f172a; letter-spacing: 0.5px; margin: 0 0 10px 0; }  .custom-coupon-badge { display: inline-block; padding: 6px 14px; border-radius: 20px; font-size: 11px; font-weight: 800; letter-spacing: 1px; text-transform: uppercase; }  .custom-coupon-badge.active { background: linear-gradient(135deg, #0d9488, #14b8a6); color: white; box-shadow: 0 4px 10px rgba(20, 184, 166, 0.3); }  .custom-coupon-badge.disabled { background: #e2e8f0; color: #475569; }  .custom-coupon-actions { display: flex; gap: 6px; }  .custom-coupon-btn { background: #f1f5f9; border: none; font-size: 13px; font-weight: 600; color: #475569; cursor: pointer; padding: 8px 14px; border-radius: 10px; transition: all 0.2s; }  .custom-coupon-btn:hover { background: #e2e8f0; color: #0f172a; }  .custom-coupon-details { border-top: 1px solid #f1f5f9; padding-top: 20px; display: flex; flex-direction: column; gap: 16px; }  .custom-coupon-row { display: flex; align-items: center; gap: 14px; }  .custom-coupon-icon { width: 42px; height: 42px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 18px; font-weight: 900; }  .custom-coupon-row:first-child .custom-coupon-icon { background: #eff6ff; color: #3b82f6; }  .custom-coupon-row:last-child .custom-coupon-icon { background: #fef3c7; color: #d97706; }  .custom-coupon-row-text p { margin: 0; }  .custom-coupon-label { font-size: 11px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px !important; }  .custom-coupon-val { font-size: 16px; font-weight: 800; color: #1e293b; margin: 0 !important; }  .custom-coupon-empty { grid-column: 1 / -1; padding: 60px 20px; text-align: center; background: #f8fafc; border-radius: 20px; border: 2px dashed #cbd5e1; }  .custom-coupon-empty h3 { color: #0f172a; margin: 0 0 8px 0; font-size: 20px; }  .custom-coupon-empty p { color: #64748b; margin: 0; font-size: 15px; }`}</style>
          {true && (
            <div className="custom-coupon-grid">
              {coupons.length ? (
                coupons.map((c) => (
                  <article
                    key={c.code}
                    className={`custom-coupon-card ${c.active ? "" : "disabled"}`}
                  >
                    <div className="custom-coupon-header">
                      <div>
                        <h3 className="custom-coupon-code">{c.code}</h3>
                        <span
                          className={`custom-coupon-badge ${c.active ? "active" : "disabled"}`}
                        >
                          {c.active ? "ACTIVE" : "DISABLED"}
                        </span>
                      </div>
                      <div className="custom-coupon-actions">
                        <button
                          type="button"
                          className="custom-coupon-btn"
                          onClick={() => {
                            setCoupon(c);
                            setCouponTab("create");
                          }}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="custom-coupon-btn"
                          disabled={busy}
                          onClick={() =>
                            save({
                              action: "saveCoupon",
                              coupon: { ...c, active: !c.active },
                            })
                          }
                        >
                          {c.active ? "Disable" : "Enable"}
                        </button>
                      </div>
                    </div>
                    <div className="custom-coupon-details">
                      <div className="custom-coupon-row">
                        <div className="custom-coupon-icon">%</div>
                        <div className="custom-coupon-row-text">
                          <p className="custom-coupon-label">Discount</p>
                          <p className="custom-coupon-val">
                            {c.type === "percent"
                              ? `${c.value}% OFF`
                              : `Rs. ${c.value} OFF`}
                          </p>
                        </div>
                      </div>
                      <div className="custom-coupon-row">
                        <div className="custom-coupon-icon">Rs</div>
                        <div className="custom-coupon-row-text">
                          <p className="custom-coupon-label">
                            Min. Order / Expiry
                          </p>
                          <p className="custom-coupon-val">
                            Rs. {c.minOrder} /{" "}
                            {c.expires
                              ? new Date(c.expires).toLocaleDateString(
                                  "en-IN",
                                  {
                                    day: "numeric",
                                    month: "short",
                                    year: "numeric",
                                  },
                                )
                              : "No Expiry"}
                          </p>
                        </div>
                      </div>
                    </div>
                  </article>
                ))
              ) : (
                <div className="custom-coupon-empty">
                  <h3>No coupons yet</h3>
                  <p>
                    Click "Create Coupon" to add your first promotional code.
                  </p>
                </div>
              )}
            </div>
          )}
        </>
      ) : (
        <>
          <style>{`
  .premium-settings-form { background: #ffffff; border-radius: 20px; padding: 40px; box-shadow: 0 10px 40px -10px rgba(0,0,0,0.08); border: 1px solid #f1f5f9; display: flex; flex-direction: column; gap: 24px; max-width: 100%; margin-top: 10px; }
  .premium-settings-form h3 { margin: 0 0 10px 0; font-size: 24px; font-weight: 800; color: #0f172a; }
  .premium-settings-form > p { margin: 0 0 20px 0; font-size: 15px; color: #64748b; line-height: 1.6; }
  .premium-settings-form label { display: flex; flex-direction: column; gap: 8px; font-size: 14px; font-weight: 700; color: #334155; }
  .premium-settings-form input, .premium-settings-form select, .premium-settings-form textarea { padding: 14px 18px; border-radius: 12px; border: 1px solid #cbd5e1; background: #f8fafc; font-size: 15px; color: #0f172a; transition: all 0.2s; outline: none; }
  .premium-settings-form input:focus, .premium-settings-form select:focus, .premium-settings-form textarea:focus { border-color: #3b82f6; background: #fff; box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1); }
  .premium-settings-form small { display: block; margin-top: 6px; font-size: 12px; font-weight: 600; color: #94a3b8; text-align: right; }
  .premium-settings-form .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; align-items: start; }
  .premium-settings-form .primary { align-self: flex-start; padding: 14px 32px; font-size: 16px; font-weight: 800; border-radius: 14px; background: linear-gradient(135deg, #2563eb, #1d4ed8); color: white; border: none; cursor: pointer; transition: all 0.2s; box-shadow: 0 4px 14px rgba(37, 99, 235, 0.3); }
  .premium-settings-form .primary:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(37, 99, 235, 0.4); }
  .image-picker-wrapper { background: #f8fafc; padding: 24px; border-radius: 16px; border: 1px dashed #cbd5e1; margin-bottom: 8px; }
`}</style>
          <form
            className="premium-settings-form"
            onSubmit={(e) => {
              e.preventDefault();
              save({
                action: "saveSettings",
                settings: s,
                requirePaymentReady: tab === "Payments",
              });
            }}
          >
            {tab === "Banner" ? (
              <>
                <div>
                  <h3>Homepage banner</h3>
                  <p>
                    Upload a wide image (recommended 1800 x 900 px). Save to
                    update the homepage.
                  </p>
                </div>
                <div className="image-picker-wrapper">
                  <MultiImagePicker
                    value={s.bannerImage}
                    onChange={(v) => setS({ ...s, bannerImage: v })}
                    api={api}
                  />
                </div>
                {field("bannerAlt", "Image description / alt text", 180)}
                {field("announcement", "Top announcement / promotion", 140)}
                {field("bannerEyebrow", "Banner small heading", 60)}
                {field(
                  "bannerTitle",
                  "Banner headline (use a new line if needed)",
                  65,
                  true,
                )}
                {field("bannerText", "Banner description", 180, true)}
                <div className="form-row">
                  {field("buttonText", "Button text", 45)}
                  <label>
                    Button opens category
                    <select
                      value={s.buttonCategory}
                      onChange={(e) =>
                        setS({ ...s, buttonCategory: e.target.value })
                      }
                    >
                      {categories.map((c) => (
                        <option key={c}>{c}</option>
                      ))}
                    </select>
                  </label>
                </div>
              </>
            ) : tab === "SEO" ? (
              <>
                <div>
                  <h3>Search engine appearance</h3>
                  <p>
                    These fields update the server-rendered title, description,
                    canonical URL and social sharing metadata. Each product also
                    has its own SEO fields and page.
                  </p>
                </div>
                {field("seoTitle", "Homepage SEO title", 70)}
                {field(
                  "seoDescription",
                  "Homepage meta description",
                  170,
                  true,
                )}
                {field("siteUrl", "Canonical site origin (HTTPS)", 200)}
                <div className="image-picker-wrapper">
                  <label style={{ marginBottom: "12px", display: "block" }}>
                    Social sharing image
                  </label>
                  <ImagePicker
                    value={s.socialImage}
                    onChange={(v) => setS({ ...s, socialImage: v })}
                    api={api}
                  />
                </div>
                <div className="seo-preview">
                  <small>{s.siteUrl}</small>
                  <h3>{s.seoTitle}</h3>
                  <p>{s.seoDescription}</p>
                </div>
                <p>
                  Product sitemap:{" "}
                  <a href="/sitemap.xml" target="_blank" rel="noreferrer">
                    /sitemap.xml
                  </a>
                  . Admin pages are marked noindex.
                </p>
              </>
            ) : (
              <>
                <div>
                  <h3>Cashfree payment gateway</h3>
                  <p>
                    Server-created INR orders, signature verification and
                    payment confirmation are integrated. API secrets stay on the
                    server.
                  </p>
                </div>
                <div
                  className="payment-state"
                  style={{
                    background: payment.ready ? "#ecfdf5" : "#fef2f2",
                    padding: "20px",
                    borderRadius: "12px",
                    border: payment.ready
                      ? "1px solid #bbf7d0"
                      : "1px solid #fecaca",
                  }}
                >
                  <strong>
                    {payment.ready ? "Gateway configured" : "Setup required"}
                  </strong>
                  <p
                    style={{
                      margin: "8px 0 0 0",
                      color: payment.ready ? "#166534" : "#991b1b",
                    }}
                  >
                    Test credentials:{" "}
                    {payment.testReady ? "Ready" : "Not configured"}
                    <br />
                    Live credentials:{" "}
                    {payment.liveReady ? "Ready" : "Not configured"}
                  </p>
                </div>
                <label>
                  Cashfree mode
                  <select
                    value={s.paymentMode}
                    onChange={(e) =>
                      setS({
                        ...s,
                        paymentMode: e.target
                          .value as ShopSettings["paymentMode"],
                      })
                    }
                  >
                    <option value="test" disabled={!payment.testReady}>
                      Cashfree sandbox
                    </option>
                    <option value="live" disabled={!payment.liveReady}>
                      Cashfree live
                    </option>
                  </select>
                </label>
                <p style={{ fontSize: "14px", color: "#64748b" }}>
                  Configure CASHFREE_CLIENT_ID and CASHFREE_CLIENT_SECRET in
                  your hosting secret settings. Live mode also requires
                  CASHFREE_LIVE_ENABLED=true and live keys. Do not paste secrets
                  into product or SEO fields.
                </p>
                <label>
                  Webhook endpoint
                  <input readOnly value={s.siteUrl + "/api/payments/webhook"} />
                </label>
                <p style={{ fontSize: "14px", color: "#64748b" }}>
                  In Cashfree, configure this webhook endpoint and enable
                  payment success events. Test mode is only for internal
                  verification; live customer orders should use live keys.
                </p>
                <a
                  className="text-link"
                  href="https://merchant.cashfree.com/"
                  target="_blank"
                  rel="noreferrer"
                >
                  Open Cashfree dashboard
                </a>
              </>
            )}
            <button className="primary" disabled={busy}>
              {busy ? "Saving..." : "Save " + tab.toLowerCase()}
            </button>
          </form>
        </>
      )}
    </section>
  );
}
