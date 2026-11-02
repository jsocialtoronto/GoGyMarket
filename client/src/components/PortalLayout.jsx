// src/components/PortalLayout.jsx
import React from "react";

export default function PortalLayout({
  activeTab,
  setActiveTab,
  currentUser,
  counts,
  children
}) {
  const navItems = [
    { id: "search", label: "1. Search", icon: "🔍", badge: null },
    { id: "messages", label: "2. Messages", icon: "💬", badge: counts.unreadMessages },
    { id: "post", label: "3. Post Ad", icon: "➕", isPrimary: true },
    { id: "listings", label: "4. Listing", icon: "📦", badge: counts.myListings },
    { id: "favourites", label: "5. Favourites", icon: "❤️", badge: counts.favourites }
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900">
      {/* Top Portal Header */}
      <header className="bg-slate-900 text-white sticky top-0 z-30 shadow-md">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          {/* Brand Logo */}
          <div
            onClick={() => setActiveTab("search")}
            className="flex items-center gap-2 cursor-pointer"
          >
            <span className="bg-emerald-500 text-slate-950 font-black px-2.5 py-1 rounded text-lg tracking-tight">
              MKT
            </span>
            <div>
              <h1 className="font-bold text-base leading-none">Marketplace Portal</h1>
              <span className="text-xs text-slate-400">Buyer & Seller Unified Hub</span>
            </div>
          </div>

          {/* Signed-in User Pill */}
          <div className="flex items-center gap-3 bg-slate-800 px-3 py-1.5 rounded-full border border-slate-700">
            <div className="w-7 h-7 rounded-full bg-emerald-500 text-slate-950 font-bold flex items-center justify-center text-sm">
              {currentUser.name.charAt(0)}
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-xs font-semibold leading-none">{currentUser.name}</p>
              <p className="text-[11px] text-emerald-400 leading-tight">
                {currentUser.location} • Buyer & Seller
              </p>
            </div>
          </div>
        </div>

        {/* 5-Tab Portal Navigation Bar */}
        <nav className="bg-slate-800 border-t border-slate-700">
          <div className="max-w-6xl mx-auto px-2 sm:px-4 flex items-center justify-between sm:justify-start sm:gap-2 overflow-x-auto">
            {navItems.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`relative flex items-center gap-1.5 px-3 sm:px-4 py-3 text-xs sm:text-sm font-medium transition-all whitespace-nowrap border-b-2 ${
                    tab.isPrimary
                      ? isActive
                        ? "bg-emerald-500 text-slate-950 border-emerald-300 font-bold"
                        : "bg-emerald-600 hover:bg-emerald-500 text-white border-transparent font-semibold rounded-t my-1 py-2"
                      : isActive
                      ? "border-emerald-400 text-emerald-400 bg-slate-900/40"
                      : "border-transparent text-slate-300 hover:text-white hover:bg-slate-700/50"
                  }`}
                >
                  <span>{tab.icon}</span>
                  <span>{tab.label}</span>
                  {tab.badge > 0 && (
                    <span className="ml-1 px-1.5 py-0.5 text-[11px] font-bold rounded-full bg-slate-700 text-emerald-300">
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </nav>
      </header>

      {/* Main Portal Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  );
}
