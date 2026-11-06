// client/src/components/AuthScreen.jsx
import React, { useState } from "react";

const API_BASE = (import.meta.env.VITE_API_URL || "http://localhost:5000").replace(/\/$/, "");

export default function AuthScreen({ onAuthSuccess }) {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({ name: "", email: "", password: "", location: "" });
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    const endpoint = isLogin ? "/api/auth/login" : "/api/auth/register";
    
    try {
      const res = await fetch(`${API_BASE}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || "Authentication failed");
      }

      // Pass the user object and JWT token back to App.jsx
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
          <div className="flex rounded-lg bg-slate-100 p-1 mb-6">
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
            <>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Jane Doe"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2.5 focus:border-emerald-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Default Location</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Toronto, ON"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2.5 focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Email Address</label>
            <input
              type="email"
              required
              placeholder="you@email.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full border border-slate-300 rounded-lg px-3 py-2.5 focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Password</label>
            <input
              type="password"
              required
              placeholder="••••••••"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="w-full border border-slate-300 rounded-lg px-3 py-2.5 focus:border-emerald-500 focus:outline-none"
            />
          </div>

          {error && <div className="text-red-600 bg-red-50 p-3 rounded-lg text-sm font-semibold text-center border border-red-200">{error}</div>}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-lg py-3 rounded-lg shadow-md transition-colors mt-4"
          >
            {isLoading ? "Please wait..." : (isLogin ? "Sign In" : "Create Account")}
          </button>
        </form>
      </div>
    </div>
  );
}
