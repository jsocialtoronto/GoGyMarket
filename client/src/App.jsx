// src/App.jsx
import React, { useState, useMemo } from "react";
import PortalLayout from "./components/PortalLayout";
import PostListingForm from "./components/PostListingForm";
import { MARKETPLACE_CATEGORIES, LISTING_STATUSES } from "./config/categoriesConfig";

const INITIAL_LISTINGS = [
  {
    _id: "lst_101",
    sellerId: "usr_1",
    sellerName: "Errol D.",
    title: "DeWalt 20V Max Cordless Drill & Impact Driver Kit",
    category: "Home and Living",
    subcategory: "Tools",
    pricingType: "fixed",
    price: 165,
    location: "Midtown Toronto, ON",
    description: "Includes both tools, two 20V batteries, charger, and hard carrying case. Works like new.",
    images: ["https://images.unsplash.com/photo-1504148455328-c376907d081c?w=600&auto=format&fit=crop&q=80"],
    status: "active",
    createdAt: "2026-10-28T14:00:00Z"
  },
  {
    _id: "lst_102",
    sellerId: "usr_2",
    sellerName: "Marcus T.",
    title: "Licensed Master Electrician - Panel Upgrades & Troubleshooting",
    category: "Services",
    subcategory: "Electricians",
    pricingType: "hourly",
    price: 90,
    location: "Toronto, ON",
    description: "ESA certified residential & commercial electrical work, pot lights, and EV charger installation.",
    images: ["https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=600&auto=format&fit=crop&q=80"],
    status: "active",
    createdAt: "2026-10-29T10:30:00Z"
  },
  {
    _id: "lst_103",
    sellerId: "usr_3",
    sellerName: "Sarah K.",
    title: "UPPAbaby Vista V2 Stroller + Bassinet",
    category: "Baby and Family",
    subcategory: "Strollers",
    pricingType: "fixed",
    price: 450,
    location: "North York, ON",
    description: "Gently used stroller in charcoal grey. Folds smoothly, includes rain shield.",
    images: ["https://images.unsplash.com/photo-1591088398332-8a7791972843?w=600&auto=format&fit=crop&q=80"],
    status: "active",
    createdAt: "2026-10-30T09:15:00Z"
  }
];

export default function App() {
  const currentUser = { id: "usr_1", name: "Errol D.", location: "Midtown Toronto, ON" };

  // Active portal view: 'search' | 'messages' | 'post' | 'listings' | 'favourites'
  const [activeTab, setActiveTab] = useState("post");
  const [listings, setListings] = useState(INITIAL_LISTINGS);
  const [favouriteIds, setFavouriteIds] = useState(["lst_102"]);

  // Search & Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCat, setSelectedCat] = useState("");
  const [selectedSubcat, setSelectedSubcat] = useState("");

  // Mock Conversations for Module 1 Tab 2 (Messages)
  const [conversations, setConversations] = useState([
    {
      id: "conv_1",
      listingTitle: "DeWalt 20V Max Cordless Drill & Impact Driver Kit",
      otherUser: "Dave M.",
      role: "Selling",
      messages: [
        { sender: "Dave M.", text: "Hi! Is the DeWalt drill kit still available for pickup today?", time: "2:15 PM" },
        { sender: "Errol D.", text: "Yes it is! I'm near Yonge & Eglinton.", time: "2:18 PM" }
      ]
    }
  ]);
  const [activeConvId, setActiveConvId] = useState("conv_1");
  const [replyText, setReplyText] = useState("");

  // Helper to format price badge across Product & Service types
  const formatPrice = (item) => {
    if (item.pricingType === "free") return "FREE";
    if (item.pricingType === "contact_for_quote") return "Contact for Quote";
    if (item.pricingType === "hourly") return `$${item.price}/hr`;
    return `$${item.price.toLocaleString()}`;
  };

  // Add newly posted item to state and route to "4. Listing"
  const handlePublishSuccess = (newListing) => {
    setListings((prev) => [newListing, ...prev]);
    setActiveTab("listings");
  };

  // Toggle Heart / Favourite
  const toggleFavourite = (id) => {
    setFavouriteIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Update My Listing Status (Active -> Pending -> Sold)
  const handleStatusChange = (listingId, newStatus) => {
    setListings((prev) =>
      prev.map((item) => (item._id === listingId ? { ...item, status: newStatus } : item))
    );
  };

  // Filtered listings for Search view
  const filteredListings = useMemo(() => {
    return listings.filter((item) => {
      if (item.status === "sold") return false;
      const matchesKeyword =
        !searchQuery ||
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCat = !selectedCat || item.category === selectedCat;
      const matchesSub = !selectedSubcat || item.subcategory === selectedSubcat;
      return matchesKeyword && matchesCat && matchesSub;
    });
  }, [listings, searchQuery, selectedCat, selectedSubcat]);

  const myListings = listings.filter((item) => item.sellerId === currentUser.id);
  const favouriteListings = listings.filter((item) => favouriteIds.includes(item._id));

  return (
    <PortalLayout
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      currentUser={currentUser}
      counts={{
        unreadMessages: conversations.length,
        myListings: myListings.length,
        favourites: favouriteListings.length
      }}
    >
      {/* 1. SEARCH PORTAL VIEW */}
      {activeTab === "search" && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Left Category Sidebar */}
          <aside className="bg-white p-4 rounded-xl border border-slate-200 h-fit space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-sm uppercase tracking-wider text-slate-600">
                Categories
              </h2>
              {selectedCat && (
                <button
                  onClick={() => {
                    setSelectedCat("");
                    setSelectedSubcat("");
                  }}
                  className="text-xs text-emerald-600 font-semibold hover:underline"
                >
                  Clear All
                </button>
              )}
            </div>

            <ul className="space-y-1 text-sm">
              {Object.keys(MARKETPLACE_CATEGORIES).map((cat) => (
                <li key={cat}>
                  <button
                    onClick={() => {
                      setSelectedCat(cat);
                      setSelectedSubcat("");
                    }}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg font-medium transition-colors ${
                      selectedCat === cat
                        ? "bg-emerald-600 text-white font-bold"
                        : "text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    {cat}
                  </button>

                  {/* Expand subcategories when parent is selected */}
                  {selectedCat === cat && (
                    <ul className="pl-4 mt-1 space-y-1 border-l-2 border-emerald-200 ml-2">
                      {MARKETPLACE_CATEGORIES[cat].map((sub) => (
                        <li key={sub}>
                          <button
                            onClick={() => setSelectedSubcat(sub)}
                            className={`w-full text-left px-2 py-1 rounded text-xs ${
                              selectedSubcat === sub
                                ? "text-emerald-700 font-bold bg-emerald-50"
                                : "text-slate-600 hover:text-slate-900"
                            }`}
                          >
                            • {sub}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          </aside>

          {/* Right Search Bar & Product Grid */}
          <section className="md:col-span-3 space-y-4">
            <div className="bg-white p-3 rounded-xl border border-slate-200 flex gap-2">
              <input
                type="text"
                placeholder="Search products or services across all categories..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredListings.map((item) => {
                const isFav = favouriteIds.includes(item._id);
                return (
                  <div
                    key={item._id}
                    className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col"
                  >
                    <div className="relative h-44 bg-slate-100">
                      <img
                        src={item.images[0]}
                        alt={item.title}
                        className="w-full h-full object-cover"
                      />
                      <button
                        onClick={() => toggleFavourite(item._id)}
                        className="absolute top-2 right-2 w-8 h-8 rounded-full bg-white/90 shadow flex items-center justify-center text-sm"
                        title="Save to Favourites"
                      >
                        {isFav ? "❤️" : "🤍"}
                      </button>
                      <span className="absolute bottom-2 left-2 bg-slate-900/80 text-white text-[11px] px-2 py-0.5 rounded">
                        {item.category} › {item.subcategory}
                      </span>
                    </div>
                    <div className="p-4 flex-1 flex flex-col justify-between">
                      <div>
                        <p className="text-emerald-700 font-extrabold text-lg">
                          {formatPrice(item)}
                        </p>
                        <h3 className="font-bold text-sm text-slate-900 line-clamp-2 mt-0.5">
                          {item.title}
                        </h3>
                        <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                          {item.description}
                        </p>
                      </div>
                      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                        <span>📍 {item.location}</span>
                        <button
                          onClick={() => setActiveTab("messages")}
                          className="text-emerald-600 font-bold hover:underline"
                        >
                          Message ›
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      )}

      {/* 2. MESSAGES PORTAL VIEW */}
      {activeTab === "messages" && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden grid grid-cols-1 md:grid-cols-3 min-h-[480px]">
          <div className="border-r border-slate-200 p-4 space-y-2">
            <h2 className="font-bold text-sm uppercase tracking-wider text-slate-500 mb-3">
              Active Conversations
            </h2>
            {conversations.map((conv) => (
              <div
                key={conv.id}
                onClick={() => setActiveConvId(conv.id)}
                className={`p-3 rounded-lg cursor-pointer border ${
                  activeConvId === conv.id
                    ? "bg-emerald-50 border-emerald-300"
                    : "border-slate-200 hover:bg-slate-50"
                }`}
              >
                <div className="flex justify-between text-xs font-bold text-slate-800">
                  <span>{conv.otherUser}</span>
                  <span className="text-emerald-700">{conv.role}</span>
                </div>
                <p className="text-xs text-slate-600 font-medium truncate mt-0.5">
                  {conv.listingTitle}
                </p>
              </div>
            ))}
          </div>

          <div className="md:col-span-2 flex flex-col justify-between p-4 bg-slate-50">
            <div className="space-y-3 overflow-y-auto max-h-80">
              {conversations
                .find((c) => c.id === activeConvId)
                ?.messages.map((m, idx) => {
                  const isMe = m.sender === currentUser.name;
                  return (
                    <div
                      key={idx}
                      className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}
                    >
                      <div
                        className={`px-3.5 py-2 rounded-xl text-sm max-w-md ${
                          isMe
                            ? "bg-emerald-600 text-white"
                            : "bg-white border border-slate-200 text-slate-800"
                        }`}
                      >
                        {m.text}
                      </div>
                      <span className="text-[10px] text-slate-400 mt-0.5">
                        {m.sender} • {m.time}
                      </span>
                    </div>
                  );
                })}
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!replyText.trim()) return;
                setConversations((prev) =>
                  prev.map((c) =>
                    c.id === activeConvId
                      ? {
                          ...c,
                          messages: [
                            ...c.messages,
                            { sender: currentUser.name, text: replyText, time: "Just now" }
                          ]
                        }
                      : c
                  )
                );
                setReplyText("");
              }}
              className="mt-4 flex gap-2"
            >
              <input
                type="text"
                placeholder="Write a message..."
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white"
              />
              <button
                type="submit"
                className="bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-semibold"
              >
                Send
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 3. POST LISTING VIEW */}
      {activeTab === "post" && (
        <PostListingForm
          currentUser={currentUser}
          onPublishSuccess={handlePublishSuccess}
        />
      )}

      {/* 4. MY LISTINGS & STATUS MANAGER VIEW */}
      {activeTab === "listings" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold">My Listings & Status</h2>
              <p className="text-xs text-slate-500">
                Manage everything you have posted and update availability status
              </p>
            </div>
            <button
              onClick={() => setActiveTab("post")}
              className="bg-emerald-600 text-white text-xs font-bold px-4 py-2.5 rounded-lg"
            >
              + Post Another Listing
            </button>
          </div>

          <div className="space-y-3">
            {myListings.map((item) => {
              const statusMeta = LISTING_STATUSES[item.status];
              return (
                <div
                  key={item._id}
                  className="bg-white p-4 rounded-xl border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-4">
                    <img
                      src={item.images[0]}
                      alt={item.title}
                      className="w-20 h-20 rounded-lg object-cover border border-slate-200"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${statusMeta.badgeClass}`}
                        >
                          {statusMeta.label}
                        </span>
                        <span className="text-xs text-slate-400">
                          {item.category} › {item.subcategory}
                        </span>
                      </div>
                      <h3 className="font-bold text-slate-900 mt-1">{item.title}</h3>
                      <p className="text-sm font-extrabold text-emerald-700">
                        {formatPrice(item)}
                      </p>
                    </div>
                  </div>

                  {/* Quick Status Switcher */}
                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <label className="text-xs font-semibold text-slate-500">Status:</label>
                    <select
                      value={item.status}
                      onChange={(e) => handleStatusChange(item._id, e.target.value)}
                      className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold bg-slate-50"
                    >
                      <option value="active">Active</option>
                      <option value="pending">Pending Pickup</option>
                      <option value="sold">Sold</option>
                    </select>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 5. FAVOURITES VIEW */}
      {activeTab === "favourites" && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold">Saved Favourites ({favouriteListings.length})</h2>
          {favouriteListings.length === 0 ? (
            <div className="bg-white p-8 rounded-xl border border-slate-200 text-center text-slate-500 text-sm">
              You haven't saved any listings yet. Click the ❤️ icon on any item in Search!
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {favouriteListings.map((item) => (
                <div
                  key={item._id}
                  className="bg-white rounded-xl border border-slate-200 p-4 flex gap-4 items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={item.images[0]}
                      alt={item.title}
                      className="w-16 h-16 rounded-lg object-cover"
                    />
                    <div>
                      <p className="text-emerald-700 font-bold text-sm">{formatPrice(item)}</p>
                      <h3 className="font-semibold text-sm line-clamp-1">{item.title}</h3>
                      <span className="text-xs text-slate-400">{item.subcategory}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => toggleFavourite(item._id)}
                    className="text-xs text-red-600 font-semibold hover:underline"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </PortalLayout>
  );
}
