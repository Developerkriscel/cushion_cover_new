import React, { useState } from "react";
import { Edit2, Trash2, MapPin, Plus, MoreVertical } from "lucide-react";

export interface Address {
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
}

interface Props {
  addresses: Address[];
  onUpdate: (addresses: Address[]) => void;
  onSelect?: (address: Address) => void;
}

const blankAddress: Address = {
  id: "",
  type: "Home",
  fullName: "",
  phone: "",
  line1: "",
  line2: "",
  city: "",
  state: "",
  pincode: "",
  country: "India",
  isDefault: false,
};

const indianStates = [
  "Andaman and Nicobar Islands",
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chandigarh",
  "Chhattisgarh",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jammu and Kashmir",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Ladakh",
  "Lakshadweep",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Puducherry",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
];

function cleanAddress(address: Address): Address {
  return {
    ...address,
    id: address.id || crypto.randomUUID(),
    fullName: address.fullName.trim(),
    phone: address.phone.replace(/\D/g, "").slice(-10),
    line1: address.line1.trim(),
    line2: address.line2.trim(),
    city: address.city.trim(),
    state: address.state.trim(),
    pincode: address.pincode.trim(),
    country: address.country.trim() || "India",
  };
}

function validateAddress(address: Address) {
  if (!["Home", "Work", "Other"].includes(address.type))
    return "Choose an address type.";
  if (address.fullName.trim().length < 2) return "Enter the recipient name.";
  if (!/^\d{10}$/.test(address.phone.replace(/\D/g, "").slice(-10)))
    return "Enter a valid 10-digit mobile number.";
  if (address.line1.trim().length < 6) return "Enter a complete address line.";
  if (address.city.trim().length < 2) return "Enter the city.";
  if (address.state.trim().length < 2) return "Enter the state.";
  if (!/^\d{6}$/.test(address.pincode.trim()))
    return "Enter a valid 6-digit pincode.";
  return "";
}

export default function AddressBook({ addresses, onUpdate, onSelect }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Address>(blankAddress);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const showingForm = editingId !== null;

  function startAdd() {
    setError("");
    setEditingId("");
    setForm({ ...blankAddress, isDefault: addresses.length === 0 });
  }

  function startEdit(address: Address) {
    setError("");
    setEditingId(address.id);
    setForm(address);
  }

  function cancelForm() {
    setError("");
    setEditingId(null);
    setForm(blankAddress);
  }

  function updateField<K extends keyof Address>(key: K, value: Address[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function saveAddresses(next: Address[]) {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/customer/addresses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "saveAddresses", addresses: next }),
      });
      const data = (await response.json()) as {
        error?: string;
        addresses?: Address[];
      };

      if (!response.ok)
        throw Error(data.error || "Could not save address. Please try again.");

      onUpdate(data.addresses || next);
      setDeleteId(null);
      cancelForm();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const nextAddress = cleanAddress(form);
    const message = validateAddress(nextAddress);
    if (message) {
      setError(message);
      return;
    }

    let next = [...addresses];
    if (nextAddress.isDefault) {
      next = next.map((address) => ({ ...address, isDefault: false }));
    }

    if (editingId) {
      next = next.map((address) =>
        address.id === editingId ? nextAddress : address,
      );
    } else {
      next.push(nextAddress);
    }

    if (next.length === 1 || !next.some((address) => address.isDefault)) {
      next = next.map((address, index) => ({
        ...address,
        isDefault: index === 0,
      }));
    }

    await saveAddresses(next);
  }

  async function confirmDelete() {
    if (!deleteId) return;
    let next = addresses.filter((address) => address.id !== deleteId);
    if (next.length && !next.some((address) => address.isDefault)) {
      next = next.map((address, index) => ({
        ...address,
        isDefault: index === 0,
      }));
    }
    await saveAddresses(next);
  }

  async function handleSetDefault(id: string) {
    await saveAddresses(
      addresses.map((address) => ({ ...address, isDefault: address.id === id })),
    );
  }

  if (showingForm) {
    return (
      <form
        className="address-form"
        onSubmit={handleSubmit}
        style={{
          marginTop: "20px",
          padding: "20px",
          background: "#f4f6f5",
          borderRadius: "12px",
        }}
      >
        <h4 style={{ marginBottom: "15px" }}>
          {editingId ? "Edit Address" : "Add New Address"}
        </h4>

        <div style={{ display: "flex", gap: "15px", marginBottom: "15px" }}>
          {["Home", "Work", "Other"].map((type) => (
            <label
              key={type}
              style={{ flex: 1, display: "flex", alignItems: "center", gap: "5px" }}
            >
              <input
                type="radio"
                name="type"
                value={type}
                checked={form.type === type}
                onChange={() => updateField("type", type)}
              />{" "}
              {type}
            </label>
          ))}
        </div>

        <div style={{ display: "flex", gap: "15px" }}>
          <label style={{ flex: 1 }}>
            Full Name *
            <input
              value={form.fullName}
              onChange={(e) => updateField("fullName", e.target.value)}
              required
              style={{ width: "100%", marginTop: "5px", padding: "8px" }}
            />
          </label>
          <label style={{ flex: 1 }}>
            Mobile Number *
            <input
              value={form.phone}
              onChange={(e) => updateField("phone", e.target.value)}
              required
              inputMode="numeric"
              pattern="[0-9]{10}"
              title="10-digit mobile number"
              style={{ width: "100%", marginTop: "5px", padding: "8px" }}
            />
          </label>
        </div>

        <label style={{ display: "block", marginTop: "15px" }}>
          Address Line 1 * - House/Flat/Building
          <input
            value={form.line1}
            onChange={(e) => updateField("line1", e.target.value)}
            required
            style={{ width: "100%", marginTop: "5px", padding: "8px" }}
          />
        </label>
        <label style={{ display: "block", marginTop: "15px" }}>
          Address Line 2 - Area/Street/Landmark
          <input
            value={form.line2}
            onChange={(e) => updateField("line2", e.target.value)}
            style={{ width: "100%", marginTop: "5px", padding: "8px" }}
          />
        </label>

        <div style={{ display: "flex", gap: "15px", marginTop: "15px" }}>
          <label style={{ flex: 1 }}>
            State *
            <select
              value={form.state}
              onChange={(e) => {
                updateField("state", e.target.value);
              }}
              required
              style={{ width: "100%", marginTop: "5px", padding: "8px", background: "#fff", border: "1px solid #ccc" }}
            >
              <option value="">Select State</option>
              {indianStates.map(state => (
                <option key={state} value={state}>{state}</option>
              ))}
            </select>
          </label>
          <label style={{ flex: 1 }}>
            City *
            <input
              value={form.city}
              onChange={(e) => updateField("city", e.target.value)}
              required
              placeholder="City"
              style={{ width: "100%", marginTop: "5px", padding: "8px", background: "#fff", border: "1px solid #ccc" }}
            />
          </label>
        </div>

        <div style={{ display: "flex", gap: "15px", marginTop: "15px" }}>
          <label style={{ flex: 1 }}>
            Pincode *
            <input
              value={form.pincode}
              onChange={(e) => updateField("pincode", e.target.value)}
              required
              inputMode="numeric"
              pattern="[0-9]{6}"
              title="6-digit pincode"
              style={{ width: "100%", marginTop: "5px", padding: "8px" }}
            />
          </label>
          <label style={{ flex: 1 }}>
            Country *
            <input
              value={form.country}
              onChange={(e) => updateField("country", e.target.value)}
              required
              style={{ width: "100%", marginTop: "5px", padding: "8px", background: "#fff", border: "1px solid #ccc" }}
            />
          </label>
        </div>

        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            marginTop: "15px",
          }}
        >
          <input
            type="checkbox"
            checked={form.isDefault}
            onChange={(e) => updateField("isDefault", e.target.checked)}
          />{" "}
          Set as Default Address
        </label>

        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}

        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "20px" }}>
          <button className="primary" disabled={busy} style={{ margin: 0, padding: "8px 16px", borderRadius: "4px" }}>
            {busy ? "Saving..." : "Save Address"}
          </button>
          <button
            type="button"
            onClick={cancelForm}
            style={{ margin: 0, padding: "8px 16px", background: "transparent", color: "#475569", border: "1px solid #cbd5e1", borderRadius: "4px", cursor: "pointer", fontWeight: 600, display: "inline-flex", alignItems: "center", justifyContent: "center" }}
            disabled={busy}
          >
            Cancel
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className="address-book" style={{ background: '#fff', border: '1px solid #e1e6eb', borderRadius: '4px', marginTop: onSelect ? '0' : '20px' }}>
      {!onSelect && (
        <div style={{ padding: '20px 30px', borderBottom: '1px solid #e1e6eb' }}>
          <h3 style={{ margin: 0, color: '#212121', fontWeight: 600, fontSize: '18px' }}>Manage Addresses</h3>
        </div>
      )}

      {error && (
        <div style={{ padding: '15px 30px', background: '#fef2f2', color: '#dc2626', borderBottom: '1px solid #fecaca' }}>
          {error}
        </div>
      )}

      <div style={{ padding: '15px 30px', borderBottom: '1px solid #e1e6eb' }}>
         <button onClick={startAdd} style={{ color: '#0e7579', background: 'transparent', border: '1px solid #e1e6eb', width: '100%', padding: '15px', textAlign: 'left', fontWeight: 600, fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px' }}>
           <span style={{ fontSize: '18px' }}>+</span> ADD A NEW ADDRESS
         </button>
      </div>

      {deleteId && (
        <div style={{ padding: '15px 30px', background: '#fff3cd', borderBottom: '1px solid #ffeeba', color: '#856404' }}>
          Are you sure you want to delete this address?
          <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
            <button style={{ padding: '6px 12px', background: '#dc3545', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }} disabled={busy} onClick={confirmDelete}>
              {busy ? "Deleting..." : "Delete"}
            </button>
            <button
              style={{ padding: '6px 12px', background: 'transparent', color: '#856404', border: '1px solid #856404', borderRadius: '4px', cursor: 'pointer' }}
              disabled={busy}
              onClick={() => setDeleteId(null)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', maxHeight: onSelect ? "400px" : "none", overflowY: onSelect ? "auto" : "visible" }}>
        {addresses.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#878787' }}>No addresses found.</div>
        ) : (
          addresses.map((address, i) => (
            <div
              key={address.id}
              style={{ padding: '25px 30px', borderBottom: i !== addresses.length - 1 ? '1px solid #e1e6eb' : 'none', position: 'relative', background: onSelect && address.isDefault ? '#f0f8ff' : '#fff' }}
            >
              {/* Dropdown Menu Toggle */}
              <div style={{ position: 'absolute', top: '25px', right: '30px' }}>
                <button onClick={() => {
                  if (editingId === address.id) cancelForm();
                  else startEdit(address);
                }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#878787', padding: '5px' }}>
                  <Edit2 size={16} />
                </button>
                <button onClick={() => setDeleteId(address.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', padding: '5px', marginLeft: '5px' }}>
                  <Trash2 size={16} />
                </button>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '15px' }}>
                {address.type && <span style={{ background: '#f0f0f0', color: '#878787', padding: '4px 8px', fontSize: '11px', fontWeight: 600, borderRadius: '2px', textTransform: 'uppercase' }}>{address.type}</span>}
              </div>
              <p style={{ margin: '0 0 10px', fontSize: '14px', color: '#212121' }}>
                <span style={{ fontWeight: 600 }}>{address.fullName}</span> &nbsp;&nbsp; <span style={{ fontWeight: 600 }}>{address.phone}</span>
              </p>
              <p style={{ margin: '0', fontSize: '14px', color: '#212121', lineHeight: '1.6' }}>
                {address.line1}{address.line2 ? ', ' + address.line2 : ''}, {address.city}, {address.state} - <span style={{ fontWeight: 600 }}>{address.pincode}</span>
              </p>

              {onSelect && (
                 <button
                   onClick={() => onSelect(address)}
                   style={{
                     marginTop: "15px",
                     padding: "10px 20px",
                     fontSize: "14px",
                     fontWeight: 600,
                     background: '#fb641b',
                     color: '#fff',
                     border: 'none',
                     borderRadius: '2px',
                     cursor: 'pointer'
                   }}
                 >
                   DELIVER HERE
                 </button>
               )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
