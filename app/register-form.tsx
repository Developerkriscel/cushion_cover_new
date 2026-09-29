import React, { useState } from 'react';

interface Props {
  onSuccess: (name: string) => void;
  onSwitch: () => void;
  busy: boolean;
  setBusy: (v: boolean) => void;
  state: {
    bag: Record<string, number>;
    wish: string[];
  };
}

type RegisterResponse = {
  error?: string;
  name?: string;
};

export default function RegisterForm({ onSuccess, onSwitch, busy, setBusy, state }: Props) {
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
  });
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (form.password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    const cleanPhone = form.phone.replace(/\D/g, '').slice(-10);
    if (cleanPhone.length !== 10) {
      setError('Please enter a valid 10-digit mobile number.');
      return;
    }

    setBusy(true);
    try {
      const r = await fetch('/api/customer/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'customerRegister',
          email: form.email,
          password: form.password,
          firstName: form.firstName,
          lastName: form.lastName,
          phone: cleanPhone,
          state,
          addresses: []
        }),
      });
      const d = (await r.json()) as RegisterResponse;
      if (!r.ok) throw Error(d.error);
      onSuccess(d.name || '');
    } catch (err) {
      setError((err as Error).message || 'Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
  };

  const inputStyle = {
    padding: '12px 16px',
    borderRadius: '12px',
    border: '1px solid #e1e6eb',
    fontSize: '15px',
    background: '#ffffff',
    outline: 'none',
    color: '#333'
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={{ display: 'flex', gap: '12px' }}>
        <input 
          type="text" name="firstName" placeholder="First Name" required
          value={form.firstName} onChange={handleChange}
          style={{ ...inputStyle, flex: 1 }}
        />
        <input 
          type="text" name="lastName" placeholder="Last Name" required
          value={form.lastName} onChange={handleChange}
          style={{ ...inputStyle, flex: 1 }}
        />
      </div>
      <input 
        type="email" name="email" placeholder="Email Address" required
        value={form.email} onChange={handleChange}
        style={inputStyle}
      />
      <input 
        type="tel" name="phone" placeholder="Phone Number (10 digits)" required
        value={form.phone} onChange={handleChange}
        style={inputStyle}
      />
      <input 
        type="password" name="password" placeholder="Password (min 8 chars)" required
        value={form.password} onChange={handleChange}
        style={inputStyle}
      />
      
      {error && <p style={{ color: '#d93025', fontSize: '14px', margin: '0', textAlign: 'left' }}>{error}</p>}
      
      <button 
        type="submit"
        disabled={busy}
        style={{
          background: '#131e2d',
          color: '#fff',
          padding: '14px',
          borderRadius: '12px',
          fontSize: '16px',
          fontWeight: 700,
          border: 'none',
          cursor: busy ? 'not-allowed' : 'pointer',
          marginTop: '10px',
          transition: 'background 0.2s'
        }}
        onMouseOver={(e) => e.currentTarget.style.background = '#1a273a'}
        onMouseOut={(e) => e.currentTarget.style.background = '#131e2d'}
      >
        {busy ? 'Creating account...' : 'Create Account'}
      </button>
    </form>
  );
}
