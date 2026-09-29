import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

interface Props {
  onSuccess: (name: string) => void;
  onSwitch: () => void;
  busy: boolean;
  setBusy: (value: boolean) => void;
  state: {
    bag: Record<string, number>;
    wish: string[];
  };
}

type LoginResponse = {
  error?: string;
  name?: string;
};

export default function LoginForm({
  onSuccess,
  onSwitch,
  busy,
  setBusy,
  state,
}: Props) {
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [helpEmail, setHelpEmail] = useState("");
  const [helpMessage, setHelpMessage] = useState("");
  const [showHelp, setShowHelp] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setBusy(true);

    const form = Object.fromEntries(new FormData(e.currentTarget));

    try {
      const response = await fetch("/api/customer/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "customerLogin",
          email: form.email,
          password: form.password,
          state,
        }),
      });
      const data = (await response.json()) as LoginResponse;

      if (!response.ok) throw Error(data.error || "Unable to sign in.");

      onSuccess(data.name || "");
    } catch (err) {
      setError((err as Error).message || "Unable to sign in.");
    } finally {
      setBusy(false);
    }
  }

  async function requestPasswordHelp() {
    setError("");
    setHelpMessage("");

    if (!helpEmail) {
      setError("Please enter your email for password help.");
      return;
    }

    try {
      const response = await fetch("/api/customer/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "customerPasswordHelp",
          email: helpEmail,
        }),
      });
      const data = (await response.json()) as {
        error?: string;
        message?: string;
      };

      if (!response.ok) throw Error(data.error || "Could not request help.");
      setHelpMessage(data.message || "Password help request received.");
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <input 
          type="email"
          name="email"
          placeholder="Email Address"
          required
          autoComplete="email"
          style={{
            padding: '12px 16px',
            borderRadius: '12px',
            border: '1px solid #e1e6eb',
            fontSize: '15px',
            background: '#ffffff',
            outline: 'none',
            color: '#333'
          }}
        />
        <div style={{ position: 'relative' }}>
          <input 
            type={showPassword ? "text" : "password"}
            name="password"
            placeholder="Password"
            required
            autoComplete="current-password"
            style={{
              width: '100%',
              boxSizing: 'border-box',
              padding: '12px 40px 12px 16px',
              borderRadius: '12px',
              border: '1px solid #e1e6eb',
              fontSize: '15px',
              background: '#ffffff',
              outline: 'none',
              color: '#333'
            }}
          />
          <button
            type="button"
            aria-label={showPassword ? "Hide password" : "Show password"}
            onClick={() => setShowPassword((value) => !value)}
            style={{
              position: 'absolute',
              right: '16px',
              top: '50%',
              transform: 'translateY(-50%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#68778d',
              cursor: 'pointer',
              padding: '4px'
            }}
          >
            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        </div>
        
        {error && !showHelp && <p style={{ color: '#d93025', fontSize: '14px', margin: '0', textAlign: 'left' }}>{error}</p>}
        
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
          {busy ? 'Signing in...' : 'Sign in'}
        </button>
      </form>

      <div style={{ marginTop: '16px' }}>
        {!showHelp ? (
          <button 
            type="button" 
            onClick={() => { setShowHelp(true); setError(''); }}
            style={{ background: 'none', border: 'none', color: '#68778d', fontSize: '14px', cursor: 'pointer', textDecoration: 'underline' }}
          >
            Need password help?
          </button>
        ) : (
          <div style={{ padding: '20px', background: '#f4f6f7', borderRadius: '16px', border: '1px solid #e1e6eb' }}>
            <p style={{ color: '#131e2d', fontSize: '14px', marginBottom: '12px', fontWeight: 600 }}>Password Recovery</p>
            <input 
              type="email"
              placeholder="Enter your account email"
              value={helpEmail}
              onChange={(e) => setHelpEmail(e.target.value)}
              style={{
                width: '100%',
                padding: '14px 16px',
                borderRadius: '12px',
                border: '1px solid #e1e6eb',
                fontSize: '14px',
                background: '#ffffff',
                outline: 'none',
                color: '#333',
                boxSizing: 'border-box',
                marginBottom: '12px'
              }}
            />
            {error && showHelp && <p style={{ color: '#d93025', fontSize: '13px', margin: '0 0 10px', textAlign: 'left' }}>{error}</p>}
            {helpMessage && <p style={{ color: '#226758', fontSize: '13px', margin: '0 0 10px', textAlign: 'left' }}>{helpMessage}</p>}
            <div style={{ display: 'flex', gap: '10px' }}>
              <button 
                type="button"
                onClick={() => { setShowHelp(false); setHelpMessage(''); setError(''); }}
                style={{ flex: 1, padding: '12px', borderRadius: '10px', border: '1px solid #d1d8df', background: '#fff', color: '#333', cursor: 'pointer', fontWeight: 600 }}
              >
                Cancel
              </button>
              <button 
                type="button"
                onClick={requestPasswordHelp}
                style={{ flex: 1, padding: '12px', borderRadius: '10px', border: 'none', background: '#131e2d', color: '#fff', cursor: 'pointer', fontWeight: 600 }}
              >
                Send Link
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
