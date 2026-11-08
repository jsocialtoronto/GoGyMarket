// client/src/components/AdminDashboard.jsx
import React, { useState, useEffect } from "react";

const API_BASE = (import.meta.env.VITE_API_URL || "http://localhost:5000").replace(/\/$/, "");

export default function AdminDashboard({ currentUser, onOrdersUpdated }) {
  const isFullAdmin = currentUser?.role === "admin";
  const token = localStorage.getItem("gogy_token");

  const [activeSubTab, setActiveSubTab] = useState("transactions"); // "transactions" | "users"
  const [orders, setOrders] = useState([]);
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [previewPhoto, setPreviewPhoto] = useState(null);

  // Create Staff Account State
  const [staffRole, setStaffRole] = useState("viewer");
  const [staffName, setStaffName] = useState("");
  const [staffContact, setStaffContact] = useState("");
  const [staffLocation, setStaffLocation] = useState("Toronto, ON");
  const [staffPassword, setStaffPassword] = useState("");
  const [staffConfirmPassword, setStaffConfirmPassword] = useState("");

  // Password Reset Modal State
  const [resetTargetUser, setResetTargetUser] = useState(null);
  const [resetPassword, setResetPassword] = useState("");
  const [resetConfirmPassword, setResetConfirmPassword] = useState("");

  const [feedback, setFeedback] = useState({ type: "", text: "" });

  const fetchAdminData = async () => {
    try {
      setIsLoading(true);
      const headers = { Authorization: `Bearer ${token}` };
      const [ordersRes, usersRes] = await Promise.all([
        fetch(`${API_BASE}/api/admin/orders`, { headers }),
        fetch(`${API_BASE}/api/admin/users`, { headers })
      ]);

      if (ordersRes.ok) setOrders(await ordersRes.json());
      if (usersRes.ok) setUsers(await usersRes.json());
    } catch (err) {
      console.error("Failed to load admin data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  // Same strict password validation rules as user registration
  const validatePasswordRules = (pw, confirmPw) => {
    if (pw.length < 10) return "Password must be at least 10 characters long.";
    if (!/[A-Z]/.test(pw)) return "Password must contain at least one capital letter.";
    if (!/[a-zA-Z]/.test(pw) || !/\d/.test(pw)) {
      return "Password must contain a mix of letters and numbers.";
    }
    if (pw !== confirmPw) return "Passwords do not match.";
    return null;
  };

  const handleVerifyOrder = async (orderId) => {
    if (!isFullAdmin) return;
    setFeedback({ type: "", text: "" });
    try {
      const res = await fetch(`${API_BASE}/api/admin/orders/${orderId}/verify`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to verify order");

      setOrders((prev) => prev.map((o) => (o._id === orderId ? data : o)));
      setFeedback({
        type: "success",
        text: `Order ${data.orderNumber} verified and set to ACTIVE! Seller has been notified for pickup.`
      });
      if (onOrdersUpdated) onOrdersUpdated();
    } catch (err) {
      setFeedback({ type: "error", text: err.message });
    }
  };

  const handleCancelOrder = async (orderId) => {
    if (!isFullAdmin) return;
    setFeedback({ type: "", text: "" });
    try {
      const res = await fetch(`${API_BASE}/api/admin/orders/${orderId}/cancel`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to cancel order");

      setOrders((prev) => prev.map((o) => (o._id === orderId ? data : o)));
      setFeedback({
        type: "success",
        text: `Order ${data.orderNumber} has been cancelled and stock restored.`
      });
      if (onOrdersUpdated) onOrdersUpdated();
    } catch (err) {
      setFeedback({ type: "error", text: err.message });
    }
  };

  const handleCreateStaff = async (e) => {
    e.preventDefault();
    if (!isFullAdmin) return;
    setFeedback({ type: "", text: "" });

    if (!staffName.trim()) {
      setFeedback({ type: "error", text: "Name is required." });
      return;
    }

    const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(staffContact);
    const isValidPhone = /^\+?[\d\s-]{10,}$/.test(staffContact);
    if (!isValidEmail && !isValidPhone) {
      setFeedback({
        type: "error",
        text: "Enter a valid email address or phone number (minimum 10 digits)."
      });
      return;
    }

    const pwErr = validatePasswordRules(staffPassword, staffConfirmPassword);
    if (pwErr) {
      setFeedback({ type: "error", text: pwErr });
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/admin/users`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name: staffName,
          contactMethod: staffContact,
          password: staffPassword,
          role: staffRole,
          location: staffLocation
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not create account");

      setUsers((prev) => [data, ...prev]);
      setStaffName("");
      setStaffContact("");
      setStaffPassword("");
      setStaffConfirmPassword("");
      setFeedback({
        type: "success",
        text: `Created ${data.role.toUpperCase()} account for ${data.name}.`
      });
    } catch (err) {
      setFeedback({ type: "error", text: err.message });
    }
  };

  const handleResetPasswordSubmit = async (e) => {
    e.preventDefault();
    if (!isFullAdmin || !resetTargetUser) return;
    setFeedback({ type: "", text: "" });

    const pwErr = validatePasswordRules(resetPassword, resetConfirmPassword);
    if (pwErr) {
      setFeedback({ type: "error", text: pwErr });
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/admin/users/${resetTargetUser._id}/reset-password`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ newPassword: resetPassword })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to reset password");

      setFeedback({ type: "success", text: data.message });
      setResetTargetUser(null);
      setResetPassword("");
      setResetConfirmPassword("");
    } catch (err) {
      setFeedback({ type: "error", text: err.message });
    }
  };

  const getStatusBadge = (status, paymentMethod) => {
    switch (status) {
      case "waiting_etransfer":
        return (
          <span className="bg-amber-100 text-amber-800 border border-amber-300 text-xs font-extrabold px-2.5 py-1 rounded-full">
            ⏳ Waiting on Payment for eTransfer
          </span>
        );
      case "waiting_cash":
        return (
          <span className="bg-blue-100 text-blue-800 border border-blue-300 text-xs font-extrabold px-2.5 py-1 rounded-full">
            📸 Waiting on Confirmation of Cash
          </span>
        );
      case "active":
        return (
          <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-extrabold px-2.5 py-1 rounded-full">
            ✅ Active & Paid {paymentMethod === "credit" ? "(Stripe Auto)" : "(Admin Verified)"}
          </span>
        );
      case "pickup_pending":
        return (
          <span className="bg-slate-100 text-slate-700 border border-slate-300 text-xs font-bold px-2.5 py-1 rounded-full">
            🤝 Local Pickup (Buyer & Seller)
          </span>
        );
      case "cancelled":
        return (
          <span className="bg-red-100 text-red-700 border border-red-300 text-xs font-extrabold px-2.5 py-1 rounded-full">
            ❌ Cancelled
          </span>
        );
      default:
        return null;
    }
  };

  const filteredOrders = orders.filter((o) =>
    statusFilter === "all" ? true : o.status === statusFilter
  );

  return (
    <div className="space-y-6">
      {/* Top Admin Role Banner */}
      <div className="bg-slate-900 text-white p-5 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl">🛡️</span>
            <h2 className="text-xl font-black">GoGyMarket Administration</h2>
            <span
              className={`text-xs font-black uppercase px-2.5 py-0.5 rounded-full ${
                isFullAdmin
                  ? "bg-emerald-500 text-slate-950"
                  : "bg-amber-400 text-slate-950"
              }`}
            >
              {isFullAdmin ? "Full Admin Access" : "Viewer Mode (Read-Only)"}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {isFullAdmin
              ? "You have full permissions to verify eTransfers & Cash, cancel transactions, create Admin/Viewer accounts, and reset passwords."
              : "You are signed in as a Viewer. You can inspect all transactions and users, but cannot make changes."}
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setActiveSubTab("transactions")}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors ${
              activeSubTab === "transactions"
                ? "bg-emerald-600 text-white"
                : "bg-slate-800 text-slate-300 hover:bg-slate-700"
            }`}
          >
            💳 All Transactions ({orders.length})
          </button>
          <button
            onClick={() => setActiveSubTab("users")}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors ${
              activeSubTab === "users"
                ? "bg-emerald-600 text-white"
                : "bg-slate-800 text-slate-300 hover:bg-slate-700"
            }`}
          >
            👥 Users & Staff ({users.length})
          </button>
        </div>
      </div>

      {feedback.text && (
        <div
          className={`p-4 rounded-xl border text-sm font-bold flex items-center justify-between ${
            feedback.type === "error"
              ? "bg-red-50 border-red-300 text-red-700"
              : "bg-emerald-50 border-emerald-300 text-emerald-800"
          }`}
        >
          <span>{feedback.text}</span>
          <button onClick={() => setFeedback({ type: "", text: "" })} className="text-xs underline">
            Dismiss
          </button>
        </div>
      )}

      {/* TAB 1: TRANSACTIONS & PAYMENT VERIFICATION */}
      {activeSubTab === "transactions" && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              {[
                { id: "all", label: "All Transactions" },
                { id: "waiting_etransfer", label: "⏳ Waiting on eTransfer" },
                { id: "waiting_cash", label: "📸 Waiting on Cash" },
                { id: "active", label: "✅ Active & Paid" },
                { id: "cancelled", label: "❌ Cancelled" }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setStatusFilter(tab.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                    statusFilter === tab.id
                      ? "bg-slate-900 text-white border-slate-900"
                      : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <button
              onClick={fetchAdminData}
              className="text-xs font-bold text-emerald-700 hover:underline"
            >
              ↻ Refresh List
            </button>
          </div>

          {isLoading ? (
            <div className="bg-white p-10 rounded-xl border text-center text-sm text-slate-500">
              Loading transactions...
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="bg-white p-10 rounded-xl border text-center text-sm text-slate-500">
              No transactions match this filter.
            </div>
          ) : (
            <div className="space-y-4">
              {filteredOrders.map((order) => (
                <div
                  key={order._id}
                  className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
                    <div>
                      <div className="flex items-center gap-3">
                        <span className="font-black text-slate-900 text-base">
                          {order.orderNumber}
                        </span>
                        {getStatusBadge(order.status, order.paymentMethod)}
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        Buyer: <span className="font-bold text-slate-700">{order.buyerName}</span> (
                        {order.buyerContact}) • Placed{" "}
                        {new Date(order.createdAt).toLocaleString()}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="text-xs font-bold uppercase text-slate-400">Grand Total</p>
                      <p className="text-xl font-black text-emerald-700">
                        ${Number(order.grandTotal).toLocaleString()} GYD
                      </p>
                      <p className="text-[11px] text-slate-500">{order.paymentOptionLabel}</p>
                    </div>
                  </div>

                  {/* Order Items */}
                  <div className="space-y-2">
                    {order.items.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs"
                      >
                        <div className="flex items-center gap-3">
                          {item.image && (
                            <img
                              src={item.image}
                              alt={item.title}
                              className="w-12 h-12 rounded object-cover border"
                            />
                          )}
                          <div>
                            <p className="font-bold text-slate-900 text-sm">
                              {item.quantity}x {item.title}
                            </p>
                            <p className="text-slate-500">
                              Seller: <span className="font-semibold">{item.sellerName}</span> •{" "}
                              {item.deliveryMethod === "pickup"
                                ? "Local Pickup"
                                : `Deliver To: ${item.buyerAddress}`}
                            </p>
                          </div>
                        </div>
                        <div className="text-right font-bold text-slate-800">
                          <p>${(item.unitPrice * item.quantity).toLocaleString()} GYD</p>
                          {item.shippingCost > 0 && (
                            <p className="text-emerald-700">
                              + ${item.shippingCost.toLocaleString()} GYD Delivery
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Lockbox Photo Inspection & Admin Controls */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                    <div className="flex items-center gap-3">
                      {order.lockboxPhoto && (
                        <button
                          onClick={() => setPreviewPhoto(order.lockboxPhoto)}
                          className="bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-bold px-3 py-2 rounded-lg flex items-center gap-1.5"
                        >
                          🔍 View Uploaded Lockbox Cash Photo
                        </button>
                      )}
                      {order.verifiedBy && (
                        <span className="text-xs text-slate-400">
                          Updated by {order.verifiedBy}
                        </span>
                      )}
                    </div>

                    {/* Action Buttons: Enabled for Admin, Disabled for Viewer */}
                    {isFullAdmin ? (
                      <div className="flex items-center gap-2">
                        {order.status === "waiting_etransfer" && (
                          <button
                            onClick={() => handleVerifyOrder(order._id)}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-4 py-2 rounded-lg shadow-sm"
                          >
                            ✓ Verify eTransfer & Notify Seller
                          </button>
                        )}

                        {order.status === "waiting_cash" && (
                          <button
                            onClick={() => handleVerifyOrder(order._id)}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-4 py-2 rounded-lg shadow-sm"
                          >
                            ✓ Confirm Lockbox Cash & Notify Seller
                          </button>
                        )}

                        {order.status !== "cancelled" && (
                          <button
                            onClick={() => handleCancelOrder(order._id)}
                            className="bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 text-xs font-bold px-3.5 py-2 rounded-lg"
                          >
                            Cancel Transaction
                          </button>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs font-semibold text-slate-400 italic">
                        🔒 Viewer account — actions disabled
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: USER DIRECTORY, STAFF CREATION & PASSWORD RESETS */}
      {activeSubTab === "users" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Create Admin / Viewer Form */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 h-fit space-y-4">
            <h3 className="font-bold text-base text-slate-900 border-b pb-2">
              Create Admin or Viewer Account
            </h3>

            {!isFullAdmin ? (
              <div className="bg-slate-50 p-4 rounded-lg border text-xs text-slate-500">
                🔒 Only full Administrators can create new Admin or Viewer accounts.
              </div>
            ) : (
              <form onSubmit={handleCreateStaff} className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Account Role *
                  </label>
                  <select
                    value={staffRole}
                    onChange={(e) => setStaffRole(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-semibold bg-white"
                  >
                    <option value="admin">🛡️ Full Administrator (Can do anything)</option>
                    <option value="viewer">👁️ Viewer (Read-only, no changes)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Alex Manager"
                    value={staffName}
                    onChange={(e) => setStaffName(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Email or Phone Number *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="staff@gogymarket.com or 416-555-0199"
                    value={staffContact}
                    onChange={(e) => setStaffContact(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Password *
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="Min 10 chars, 1 capital, letters & numbers"
                    value={staffPassword}
                    onChange={(e) => setStaffPassword(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Confirm Password *
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="Re-type password"
                    value={staffConfirmPassword}
                    onChange={(e) => setStaffConfirmPassword(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm py-2.5 rounded-lg shadow-sm"
                >
                  + Create {staffRole === "admin" ? "Admin" : "Viewer"} Account
                </button>
              </form>
            )}
          </div>

          {/* Right Column: User Directory & Password Reset */}
          <div className="lg:col-span-2 bg-white p-5 rounded-xl border border-slate-200 space-y-4">
            <h3 className="font-bold text-base text-slate-900 border-b pb-2">
              Registered Users & Staff Directory
            </h3>

            <div className="space-y-2.5">
              {users.map((u) => (
                <div
                  key={u._id}
                  className="p-3.5 rounded-lg border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-sm">{u.name}</span>
                      <span
                        className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                          u.role === "admin"
                            ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                            : u.role === "viewer"
                            ? "bg-amber-100 text-amber-800 border border-amber-300"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {u.role || "user"}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {u.email || u.phone} • 📍 {u.location}
                    </p>
                  </div>

                  {isFullAdmin && (
                    <button
                      onClick={() => {
                        setResetTargetUser(u);
                        setResetPassword("");
                        setResetConfirmPassword("");
                      }}
                      className="text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white px-3 py-1.5 rounded-lg"
                    >
                      🔑 Reset Password
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: PASSWORD RESET */}
      {resetTargetUser && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white max-w-md w-full rounded-xl p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="font-bold text-slate-900">
                Reset Password for {resetTargetUser.name}
              </h3>
              <button
                onClick={() => setResetTargetUser(null)}
                className="text-slate-400 hover:text-slate-700 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleResetPasswordSubmit} className="space-y-3">
              <p className="text-xs text-slate-500">
                Password must be at least 10 characters, include 1 capital letter, and contain a mix of letters and numbers.
              </p>
              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                  New Password *
                </label>
                <input
                  type="password"
                  required
                  value={resetPassword}
                  onChange={(e) => setResetPassword(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                  Confirm New Password *
                </label>
                <input
                  type="password"
                  required
                  value={resetConfirmPassword}
                  onChange={(e) => setResetConfirmPassword(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setResetTargetUser(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg"
                >
                  Save New Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: LOCKBOX PHOTO PREVIEW */}
      {previewPhoto && (
        <div
          onClick={() => setPreviewPhoto(null)}
          className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-4"
        >
          <div className="bg-white p-4 rounded-xl max-w-lg w-full space-y-3">
            <div className="flex justify-between items-center">
              <h4 className="font-bold text-sm">Lockbox Cash Verification Photo</h4>
              <button
                onClick={() => setPreviewPhoto(null)}
                className="text-xs font-bold text-slate-500"
              >
                Close ✕
              </button>
            </div>
            <img src={previewPhoto} alt="Lockbox Cash" className="w-full rounded-lg border" />
          </div>
        </div>
      )}
    </div>
  );
}
