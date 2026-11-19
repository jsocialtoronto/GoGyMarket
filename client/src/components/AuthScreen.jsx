// client/src/components/AuthScreen.jsx
import React, { useState } from "react";

const API_BASE = (import.meta.env.VITE_API_URL || "http://localhost:5000").replace(/\/$/, "");

export default function AuthScreen({ onAuthSuccess }) {
  const [isLogin, setIsLogin] = useState(true);
  
  const [accountType, setAccountType] = useState("personal"); 
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [contactMethod, setContactMethod] = useState(""); 
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  
  const [locationType, setLocationType] = useState("address"); // "address" | "pin"
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [pinDrop, setPinDrop] = useState("");
  const [isNotRobot, setIsNotRobot] = useState(false);

  const [verificationPhone, setVerificationPhone] = useState("");
  const [showVerificationStep, setShowVerificationStep] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");

  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const isEmail = contactMethod.includes("@");
  const activePhone = isEmail ? verificationPhone : contactMethod;
  const finalLocation = locationType === "pin" ? pinDrop.trim() : `${address.trim()}, ${city.trim()}`;

  const validateRegistration = () => {
    if (accountType === "personal") {
      if (!firstName.trim() || !lastName.trim()) return "First and Last name are required.";
    } else {
      if (!businessName.trim()) return "Business Name is required.";
    }

    if (locationType === "address") {
      if (!address.trim() || !city.trim()) return "Both Address and City/Town are required.";
    } else {
      if (!pinDrop.trim()) return "Please paste a valid Google Maps pin drop link or coordinates.";
    }

    const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactMethod);
    const isValidPhone = /^\+?[\d\s-]{10,}$/.test(contactMethod);
    if (!isValidEmail && !isValidPhone) {
      return "Please enter a valid email address or phone number (minimum 10 digits).";
    }

    if (password.length < 10) return "Password must be at least 10 characters long.";
    if (!/[A-Z]/.test(password)) return "Password must contain at least one uppercase letter.";
    if (!/[a-zA-Z]/.test(password) || !/\d/.test(password)) return "Password must contain a mix of letters and numbers.";
    
    if (password !== confirmPassword) return "Passwords do not match.";
    if (!isNotRobot) return "Please verify that you are not a robot.";

    return null; 
  };

  const handleRequestOTP = async () => {
    const validationError = validateRegistration();
    if (validationError) {
      setError(validationError);
      return;
    }

    if (isEmail && !/^\+?[\d\s-]{10,}$/.test(verificationPhone)) {
      setError("A valid mobile phone number is required for SMS security verification.");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const res = await fetch(`${API_BASE}/api/auth/send-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          phone: activePhone, 
          email: isEmail ? contactMethod.toLowerCase().trim() : undefined,
          location: finalLocation 
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send verification code.");

      setShowVerificationStep(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    
    if (!isLogin && !showVerificationStep) {
      return handleRequestOTP();
    }

    setIsLoading(true);

    const endpoint = isLogin ? "/api/auth/login" : "/api/auth/register";
    
    const payload = isLogin 
      ? { contactMethod, password }
      : { 
          accountType, 
          firstName, 
          lastName, 
          businessName, 
          contactMethod, 
          password, 
          location: finalLocation,
          verificationPhone: activePhone,
          verificationCode 
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

        <form onSubmit={handleSubmit} className="p-6">
          {!showVerificationStep && (
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
          )}

          {showVerificationStep ? (
            <div className="space-y-6 animate-in fade-in zoom-in-95 duration-200">
              <div className="text-center space-y-2">
                <h3 className="font-bold text-xl text-slate-900">Verify Mobile Number</h3>
                <p className="text-sm text-slate-600">We sent a 6-digit security code to <span className="font-bold text-slate-900">{activePhone}</span>.</p>
              </div>
              
              <div>
                <input 
                  type="text" 
                  maxLength="6"
                  required
                  placeholder="Enter 6-digit code" 
                  value={verificationCode} 
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))} 
                  className="w-full text-center tracking-[0.5em] text-3xl border border-slate-300 rounded-xl px-3 py-4 font-black text-emerald-700 focus:border-emerald-500 focus:outline-none" 
                />
              </div>

              <div className="flex flex-col gap-3">
                <button type="submit" disabled={isLoading || verificationCode.length !== 6} className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-400 text-white font-bold text-lg py-3 rounded-lg shadow-md transition-colors">
                  {isLoading ? "Verifying..." : "Verify & Create Account"}
                </button>
                <button type="button" onClick={() => { setShowVerificationStep(false); setVerificationCode(""); }} className="text-xs font-bold text-slate-500 hover:text-slate-800">
                  ← Edit Phone Number or Details
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
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

              {!isLogin && (
                <div className="space-y-2.5">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">Location Method *</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setLocationType("address")}
                      className={`py-2 px-3 rounded-lg border text-xs font-bold transition-colors ${locationType === "address" ? "bg-emerald-50 border-emerald-500 text-emerald-700" : "bg-white border-slate-300 text-slate-600 hover:bg-slate-50"}`}
                    >
                      🏠 Street Address
                    </button>
                    <button
                      type="button"
                      onClick={() => setLocationType("pin")}
                      className={`py-2 px-3 rounded-lg border text-xs font-bold transition-colors ${locationType === "pin" ? "bg-emerald-50 border-emerald-500 text-emerald-700" : "bg-white border-slate-300 text-slate-600 hover:bg-slate-50"}`}
                    >
                      📍 Pin Drop Location
                    </button>
                  </div>

                  {locationType === "address" ? (
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
                  ) : (
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Google Maps Pin Drop Link *</label>
                      <input
                        type="text"
                        placeholder="Paste Google Maps share link (e.g. https://maps.app.goo.gl/...)"
                        value={pinDrop}
                        onChange={(e) => setPinDrop(e.target.value)}
                        className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none"
                      />
                      <p className="text-[10px] text-slate-500 mt-1">Open Google Maps, drop a pin at your location, tap Share, and paste the link here.</p>
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  {isLogin ? "Email or Phone Number *" : "Primary Contact (Email or Phone) *"}
                </label>
                <input
                  type="text"
                  required
                  placeholder="you@email.com OR 416-555-0199"
                  value={contactMethod}
                  onChange={(e) => setContactMethod(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2.5 focus:border-emerald-500 focus:outline-none"
                />
              </div>

              {!isLogin && isEmail && (
                <div className="animate-in slide-in-from-top-2 duration-300">
                  <label className="block text-xs font-bold text-emerald-800 uppercase tracking-wider mb-1">Mobile Phone (For SMS Security Verification) *</label>
                  <input
                    type="text"
                    required
                    placeholder="416-555-0199"
                    value={verificationPhone}
                    onChange={(e) => setVerificationPhone(e.target.value)}
                    className="w-full border-2 border-emerald-300 bg-emerald-50 rounded-lg px-3 py-2.5 focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Password *</label>
                <input
                  type={showPassword ? "text" : "password"}
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
                    type={showPassword ? "text" : "password"}
                    required
                    placeholder="••••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2.5 focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              )}

              <label className="flex items-center gap-2 cursor-pointer mt-2">
                <input 
                  type="checkbox" 
                  checked={showPassword} 
                  onChange={(e) => setShowPassword(e.target.checked)} 
                  className="accent-emerald-600 w-4 h-4 rounded cursor-pointer" 
                />
                <span className="text-xs text-slate-600 font-semibold select-none">Show Password</span>
              </label>

              {!isLogin && (
                <div className="bg-amber-50 border border-amber-300 rounded-lg p-3.5 text-xs text-amber-950 space-y-1.5">
                  <p className="font-black uppercase tracking-wider text-amber-900">💰 $500 Welcome Credit & Onboarding Notice</p>
                  <p className="leading-relaxed">
                    Every new account receives a <strong>$500 GYD credit</strong> that can only be used toward purchases and delivery charges on GoGyMarket. Its value <strong>cannot be taken out in cash</strong>.
                  </p>
                  <p className="leading-relaxed">
                    Posting access and your $500 credit will only become active after registration is complete—which occurs once you finish <strong>seller's onboarding</strong> after a GoGyMarket representative delivers your lockbox.
                  </p>
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
              
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-400 text-white font-bold text-lg py-3 rounded-lg shadow-md transition-colors mt-4"
              >
                {isLoading ? "Please wait..." : (isLogin ? "Sign In" : "Send Verification Code →")}
              </button>
            </div>
          )}

          {error && <div className="mt-4 text-red-600 bg-red-50 p-3 rounded-lg text-sm font-semibold text-center border border-red-200">{error}</div>}
        </form>
      </div>
    </div>
  );
}
