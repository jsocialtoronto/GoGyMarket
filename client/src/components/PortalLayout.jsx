// client/src/components/PortalLayout.jsx
import React from "react";

export default function PortalLayout({
  activeTab,
  setActiveTab,
  currentUser,
  counts,
  children
}) {
  const navItems = [
    { id: "search", label: "Search", icon: "🔍", badge: null },
    { id: "messages", label: "Messages", icon: "💬", badge: counts.unreadMessages },
    { id: "post", label: "Post Ad", icon: "➕", badge: null },
    { id: "listings", label: "My Listings", icon: "📦", badge: counts.myListings },
    { id: "favourites", label: "Saved", icon: "❤️", badge: counts.favourites },
    { id: "cart", label: "Cart", icon: "🛒", badge: counts.cart }
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900">
      <header className="bg-black text-white sticky top-0 z-30 shadow-md">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div
            onClick={() => setActiveTab("search")}
            className="flex items-center gap-2 cursor-pointer"
          >
            <span className="bg-emerald-500 text-slate-950 font-black px-2.5 py-1 rounded text-lg tracking-tight">
              MKT
            </span>
            <div>
              <h1 className="font-bold text-base leading-none">GoGyMarket</h1>
              <span className="text-xs text-slate-400">Buyer & Seller Unified Hub</span>
            </div>
          </div>

          {/* Signed-in User Pill with safe fallbacks and Logout */}
          <div className="flex items-center gap-3 bg-slate-900 px-3 py-1.5 rounded-full border border-slate-800">
            <div className="w-7 h-7 rounded-full bg-emerald-500 text-slate-950 font-bold flex items-center justify-center text-sm">
              {(currentUser?.name || "U").charAt(0).toUpperCase()}
            </div>
            <div className="hidden sm:block text-left mr-2">
              <p className="text-xs font-semibold leading-none">{currentUser?.name || "User"}</p>
              <p className="text-[11px] text-emerald-400 leading-tight truncate max-w-[100px]">
                {currentUser?.location || "Unknown"}
              </p>
            </div>
            <button 
              onClick={() => {
                localStorage.removeItem("gogy_user");
                localStorage.removeItem("gogy_token");
                window.location.reload();
              }}
              className="text-[10px] font-bold bg-slate-800 hover:bg-red-600 text-white px-2 py-1 rounded transition-colors"
            >
              LOGOUT
            </button>
          </div>
        </div>

        <nav className="bg-black border-t border-slate-800 pt-1">
          <div className="max-w-6xl mx-auto px-2 sm:px-4 flex items-center justify-between sm:justify-start sm:gap-1 overflow-x-auto">
            {navItems.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`relative flex items-center gap-1.5 px-3 sm:px-4 py-3 text-xs sm:text-sm transition-all whitespace-nowrap rounded-t-lg ${
                    isActive
                      ? "bg-emerald-600 text-white font-bold"
                      : "bg-transparent text-slate-400 hover:bg-slate-900 hover:text-white font-medium"
                  }`}
                >
                  <span>{tab.icon}</span>
                  <span>{tab.label}</span>
                  {tab.badge > 0 && (
                    <span
                      className={`ml-1 px-1.5 py-0.5 text-[11px] font-bold rounded-full ${
                        isActive
                          ? "bg-white text-emerald-700"
                          : "bg-slate-800 text-emerald-400"
                      }`}
                    >
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </nav>
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  );
}
