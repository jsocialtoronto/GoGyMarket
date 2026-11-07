// client/src/components/AuthScreen.jsx
import React, { useState } from "react";

const API_BASE = (import.meta.env.VITE_API_URL || "http://localhost:5000").replace(/\/$/, "");

export default function AuthScreen({ onAuthSuccess }) {
  const [isLogin, setIsLogin] = useState(true);
  
  // Dynamic Form State
  const [accountType, setAccountType] = useState("personal"); // 'personal' | 'business'
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [contactMethod, setContactMethod] = useState(""); // Email or Phone
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  // NEW: Address and City state
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  
  const [isNotRobot, setIsNotRobot] = useState(false);

  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const validateRegistration = () => {
    if (accountType === "personal") {
      if (!firstName.trim() || !lastName.trim()) return "First and Last name are required.";
    } else {
      if (!businessName.trim()) return "Business Name is required.";
    }

    // Ensure both Address and City are provided
    if (!address.trim() || !city.trim()) return "Both Address and City/Town are required.";

    // Contact Validation (Email or Phone)
    const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactMethod);
    const isValidPhone = /^\+?[\d\s-]{10,}$/.test(contactMethod);
    if (!isValidEmail && !isValidPhone) {
      return "Please enter a valid email address or phone number (minimum 10 digits).";
    }

    // Strict Password Validation
    if (password.length < 10) return "Password must be at least 10 characters long.";
    if (!/[A-Z]/.test(password)) return "Password must contain at least one uppercase letter.";
    if (!/[a-zA-Z]/.test(password) || !/\d/.test(password)) return "Password must contain a mix of letters and numbers.";
    
    if (password !== confirmPassword) return "Passwords do not match.";
    if (!isNotRobot) return "Please verify that you are not a robot.";

    return null; // Passes all checks
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    
    if (!isLogin) {
      const validationError = validateRegistration();
      if (validationError) {
        setError(validationError);
        return;
      }
    }

    setIsLoading(true);

    const endpoint = isLogin ? "/api/auth/login" : "/api/auth/register";
    
    // Combine Address and City for the backend
    const payload = isLogin 
      ? { contactMethod, password }
      : { 
          accountType, 
          firstName, 
          lastName, 
          businessName, 
          contactMethod, 
          password, 
          location: `${address.trim()}, ${city.trim()}` 
        };
    
    try {
      const res = await fetch(`${API_BASE}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || "Authentication failed");

      onAuthSuccess(data.user, data.token);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="bg-white max-w-md w-full rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
        <div className="bg-black text-white p-6 text-center">
          <span className="bg-emerald-500 text-slate-950 font-black px-3 py-1.5 rounded-md text-2xl tracking-tight inline-block mb-3">
            MKT
          </span>
          <h1 className="text-2xl font-bold">GoGyMarket</h1>
          <p className="text-slate-400 text-sm mt-1">Sign in to buy and sell securely</p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="flex rounded-lg bg-slate-100 p-1 mb-4">
            <button
              type="button"
              onClick={() => { setIsLogin(true); setError(""); }}
              className={`flex-1 text-sm font-bold py-2 rounded-md transition-colors ${isLogin ? "bg-white shadow-sm text-emerald-700" : "text-slate-500 hover:text-slate-900"}`}
            >
              Login
            </button>
            <button
              type="button"
              onClick={() => { setIsLogin(false); setError(""); }}
              className={`flex-1 text-sm font-bold py-2 rounded-md transition-colors ${!isLogin ? "bg-white shadow-sm text-emerald-700" : "text-slate-500 hover:text-slate-900"}`}
            >
              Register
            </button>
          </div>

          {!isLogin && (
            <div className="flex gap-2 mb-4">
              <label className={`flex-1 flex items-center justify-center gap-2 cursor-pointer px-3 py-2 rounded-lg border text-sm font-semibold transition-colors ${accountType === "personal" ? "bg-emerald-50 border-emerald-500 text-emerald-700" : "bg-white border-slate-300 text-slate-600 hover:bg-slate-50"}`}>
                <input type="radio" name="accType" checked={accountType === "personal"} onChange={() => setAccountType("personal")} className="sr-only" />
                👤 Personal
              </label>
              <label className={`flex-1 flex items-center justify-center gap-2 cursor-pointer px-3 py-2 rounded-lg border text-sm font-semibold transition-colors ${accountType === "business" ? "bg-emerald-50 border-emerald-500 text-emerald-700" : "bg-white border-slate-300 text-slate-600 hover:bg-slate-50"}`}>
                <input type="radio" name="accType" checked={accountType === "business"} onChange={() => setAccountType("business")} className="sr-only" />
                🏢 Business
              </label>
            </div>
          )}

          {!isLogin && accountType === "personal" && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">First Name *</label>
                <input type="text" placeholder="e.g. Jane" value={firstName} onChange={(e) => setFirstName(e.target.value)} className="w-full border border-slate-300 rounded-lg px-3 py-2.5 focus:border-emerald-500 focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Last Name *</label>
                <input type="text" placeholder="e.g. Doe" value={lastName} onChange={(e) => setLastName(e.target.value)} className="w-full border border-slate-300 rounded-lg px-3 py-2.5 focus:border-emerald-500 focus:outline-none" />
              </div>
            </div>
          )}

          {!isLogin && accountType === "business" && (
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Business Name *</label>
              <input type="text" placeholder="e.g. Jane's Auto Repair" value={businessName} onChange={(e) => setBusinessName(e.target.value)} className="w-full border border-slate-300 rounded-lg px-3 py-2.5 focus:border-emerald-500 focus:outline-none" />
            </div>
          )}

          {/* NEW: Address and City split into two fields */}
          {!isLogin && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Address *</label>
                <input type="text" placeholder="e.g. 15 Eastdale Ave" value={address} onChange={(e) => setAddress(e.target.value)} className="w-full border border-slate-300 rounded-lg px-3 py-2.5 focus:border-emerald-500 focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">City / Town *</label>
                <input type="text" placeholder="e.g. Toronto" value={city} onChange={(e) => setCity(e.target.value)} className="w-full border border-slate-300 rounded-lg px-3 py-2.5 focus:border-emerald-500 focus:outline-none" />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Email or Phone Number *</label>
            <input
              type="text"
              required
              placeholder="you@email.com OR 416-555-0199"
              value={contactMethod}
              onChange={(e) => setContactMethod(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2.5 focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Password *</label>
            <input
              type="password"
              required
              placeholder="••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2.5 focus:border-emerald-500 focus:outline-none"
            />
            {!isLogin && <p className="text-[10px] text-slate-500 mt-1">Min. 10 chars, 1 capital letter, and a mix of letters & numbers.</p>}
          </div>

          {!isLogin && (
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Confirm Password *</label>
              <input
                type="password"
                required
                placeholder="••••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2.5 focus:border-emerald-500 focus:outline-none"
              />
            </div>
          )}

          {!isLogin && (
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 mt-2 flex items-center gap-3">
              <input 
                type="checkbox" 
                id="robotCheck"
                checked={isNotRobot}
                onChange={(e) => setIsNotRobot(e.target.checked)}
                className="w-5 h-5 text-emerald-600 rounded cursor-pointer"
              />
              <label htmlFor="robotCheck" className="text-sm font-semibold text-slate-700 cursor-pointer select-none">
                I verify that I am not a robot
              </label>
            </div>
          )}

          {error && <div className="text-red-600 bg-red-50 p-3 rounded-lg text-sm font-semibold text-center border border-red-200">{error}</div>}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-400 text-white font-bold text-lg py-3 rounded-lg shadow-md transition-colors mt-4"
          >
            {isLoading ? "Please wait..." : (isLogin ? "Sign In" : "Create Account")}
          </button>
        </form>
      </div>
    </div>
  );
}
