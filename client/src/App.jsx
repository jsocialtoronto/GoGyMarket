// client/src/App.jsx
import React, { useState, useEffect, useMemo } from "react";
import PortalLayout from "./components/PortalLayout";
import PostListingForm from "./components/PostListingForm";
import ListingDetail from "./components/ListingDetail";
import { MARKETPLACE_CATEGORIES, LISTING_STATUSES } from "./config/categoriesConfig";

const API_BASE = (import.meta.env.VITE_API_URL || "http://localhost:5000").replace(/\/$/, "");

export default function App() {
  const currentUser = {
    id: "usr_1",
    name: "Errol D.",
    location: "Midtown Toronto, ON"
  };

  const [activeTab, setActiveTab] = useState("search");
  
  // NEW: Tracks which listing is currently opened in full-screen view
  const [selectedListing, setSelectedListing] = useState(null);
  
  const [listings, setListings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const [favouriteIds, setFavouriteIds] = useState(() => {
    const saved = localStorage.getItem("gogy_favs");
    return saved ? JSON.parse(saved) : [];
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCat, setSelectedCat] = useState("");
  const [selectedSubcat, setSelectedSubcat] = useState("");

  const [conversations, setConversations] = useState([]);
  const [activeConvId, setActiveConvId] = useState(null);
  const [replyText, setReplyText] = useState("");

  useEffect(() => {
    async function loadMarketplaceData() {
      try {
        setIsLoading(true);
        const [listingsRes, convsRes] = await Promise.all([
          fetch(`${API_BASE}/api/listings`),
          fetch(`${API_BASE}/api/conversations`)
        ]);

        if (listingsRes.ok) {
          const listingsData = await listingsRes.json();
          setListings(listingsData);
        }
        if (convsRes.ok) {
          const convsData = await convsRes.json();
          setConversations(convsData);
          if (convsData.length > 0) setActiveConvId(convsData[0]._id);
        }
      } catch (err) {
        console.error("Error loading data from Render:", err);
      } finally {
        setIsLoading(false);
      }
    }
    loadMarketplaceData();
  }, []);

  useEffect(() => {
    localStorage.setItem("gogy_favs", JSON.stringify(favouriteIds));
  }, [favouriteIds]);

  // Clear selected listing if user switches tabs via top navigation
  useEffect(() => {
    setSelectedListing(null);
  }, [activeTab]);

  const formatPrice = (item) => {
    if (item.pricingType === "free") return "FREE";
    if (item.pricingType === "contact_for_quote") return "Contact for Quote";
    if (item.pricingType === "hourly") return `$${item.price}/hr`;
    return `$${Number(item.price || 0).toLocaleString()}`;
  };

  const handlePublishSuccess = (savedListing) => {
    setListings((prev) => [savedListing, ...prev]);
    setSelectedCat("");
    setSelectedSubcat("");
    setActiveTab("listings");
  };

  const toggleFavourite = (e, id) => {
    e.stopPropagation(); // Prevents the card click event from firing when clicking the heart
    setFavouriteIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleStatusChange = async (e, listingId, newStatus) => {
    e.stopPropagation();
    try {
      const res = await fetch(`${API_BASE}/api/listings/${listingId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        const updated = await res.json();
        setListings((prev) =>
          prev.map((item) => (item._id === listingId ? updated : item))
        );
        if (selectedListing?._id === listingId) {
          setSelectedListing(updated);
        }
      }
    } catch (err) {
      console.error("Failed to update status:", err);
    }
  };

  const handleDeleteListing = async (e, listingId) => {
    e.stopPropagation();
    try {
      const res = await fetch(`${API_BASE}/api/listings/${listingId}`, {
        method: "DELETE"
      });
      if (res.ok) {
        setListings((prev) => prev.filter((item) => item._id !== listingId));
      }
    } catch (err) {
      console.error("Failed to delete listing:", err);
    }
  };

  const handleMessageSeller = async (item) => {
    try {
      const res = await fetch(`${API_BASE}/api/conversations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listingId: item._id,
          listingTitle: item.title,
          buyerName: currentUser.name,
          sellerName: item.sellerName
        })
      });
      if (res.ok) {
        const conv = await res.json();
        setConversations((prev) => {
          const exists = prev.some((c) => c._id === conv._id);
          return exists ? prev : [conv, ...prev];
        });
        setActiveConvId(conv._id);
        setSelectedListing(null); // Close detail view
        setActiveTab("messages"); // Jump to messages tab
      }
    } catch (err) {
      console.error("Failed to start conversation:", err);
    }
  };

  const handleSendReply = async (e) => {
    e.preventDefault();
    if (!replyText.trim() || !activeConvId) return;

    try {
      const res = await fetch(
        `${API_BASE}/api/conversations/${activeConvId}/messages`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sender: currentUser.name,
            text: replyText.trim()
          })
        }
      );
      if (res.ok) {
        const updatedConv = await res.json();
        setConversations((prev) =>
          prev.map((c) => (c._id === activeConvId ? updatedConv : c))
        );
        setReplyText("");
      }
    } catch (err) {
      console.error("Failed to send message:", err);
    }
  };

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
  const favouriteListings = listings.filter((item) =>
    favouriteIds.includes(item._id)
  );
  const activeConversation = conversations.find((c) => c._id === activeConvId);

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
      {/* GLOBAL OVERLAY: If a listing is selected, hide the tabs and show the Detail View */}
      {selectedListing ? (
        <ListingDetail
          listing={selectedListing}
          onClose={() => setSelectedListing(null)}
          onMessageSeller={handleMessageSeller}
          isFavourite={favouriteIds.includes(selectedListing._id)}
          onToggleFavourite={(id) => {
            setFavouriteIds((prev) =>
              prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
            );
          }}
          formatPrice={formatPrice}
          currentUser={currentUser}
        />
      ) : (
        <>
          {/* 1. SEARCH PORTAL VIEW */}
          {activeTab === "search" && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <aside className="bg-white p-4 rounded-xl border border-slate-200 h-fit space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="font-bold text-sm uppercase tracking-wider text-slate-600">
                    Browse Categories
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

                <div className="pt-3 border-t border-slate-200">
                  <button
                    onClick={() => setActiveTab("post")}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs py-2.5 px-3 rounded-lg shadow-sm transition-colors"
                  >
                    {selectedSubcat
                      ? `+ Post in ${selectedSubcat}`
                      : selectedCat
                      ? `+ Post in ${selectedCat}`
                      : "+ Post a New Listing"}
                  </button>
                </div>
              </aside>

              <section className="md:col-span-3 space-y-4">
                <div className="bg-white p-3 rounded-xl border border-slate-200 flex flex-wrap gap-2 items-center justify-between">
                  <input
                    type="text"
                    placeholder="Search products or services across GoGyMarket..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="flex-1 min-w-[220px] px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-emerald-500"
                  />
                  {selectedCat && (
                    <button
                      onClick={() => setActiveTab("post")}
                      className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-3.5 py-2.5 rounded-lg whitespace-nowrap"
                    >
                      + Post in {selectedSubcat || selectedCat}
                    </button>
                  )}
                </div>

                {isLoading ? (
                  <div className="bg-white p-10 rounded-xl border border-slate-200 text-center text-slate-500 text-sm">
                    Loading live listings from MongoDB...
                  </div>
                ) : filteredListings.length === 0 ? (
                  <div className="bg-white p-10 rounded-xl border border-slate-200 text-center space-y-3">
                    <p className="text-slate-600 text-sm font-medium">
                      No active listings in{" "}
                      <span className="font-bold text-slate-900">
                        {selectedSubcat
                          ? `${selectedCat} › ${selectedSubcat}`
                          : selectedCat || "this search"}
                      </span>{" "}
                      yet.
                    </p>
                    <button
                      onClick={() => setActiveTab("post")}
                      className="inline-block bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-5 py-2.5 rounded-lg shadow-sm"
                    >
                      + Post the First Listing in {selectedSubcat || selectedCat || "GoGyMarket"}
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredListings.map((item) => {
                      const isFav = favouriteIds.includes(item._id);
                      return (
                        <div
                          key={item._id}
                          onClick={() => setSelectedListing(item)}
                          className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md hover:border-emerald-400 transition-all flex flex-col cursor-pointer group"
                        >
                          <div className="relative h-44 bg-slate-100">
                            <img
                              src={item.images?.[0]}
                              alt={item.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                            <button
                              onClick={(e) => toggleFavourite(e, item._id)}
                              className="absolute top-2 right-2 w-8 h-8 rounded-full bg-white/90 shadow flex items-center justify-center text-sm hover:scale-110 transition-transform"
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
                              <h3 className="font-bold text-sm text-slate-900 line-clamp-2 mt-0.5 group-hover:text-emerald-700 transition-colors">
                                {item.title}
                              </h3>
                              <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                                {item.description}
                              </p>
                            </div>
                            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                              <span>📍 {item.location}</span>
                              <span className="text-emerald-600 font-bold group-hover:underline">
                                View Details ›
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
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
                {conversations.length === 0 ? (
                  <p className="text-xs text-slate-400">
                    No conversations yet. Click "View Details" on any listing to message the seller.
                  </p>
                ) : (
                  conversations.map((conv) => (
                    <div
                      key={conv._id}
                      onClick={() => setActiveConvId(conv._id)}
                      className={`p-3 rounded-lg cursor-pointer border ${
                        activeConvId === conv._id
                          ? "bg-emerald-50 border-emerald-300"
                          : "border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex justify-between text-xs font-bold text-slate-800">
                        <span>{conv.sellerName}</span>
                        <span className="text-emerald-700">Chat</span>
                      </div>
                      <p className="text-xs text-slate-600 font-medium truncate mt-0.5">
                        {conv.listingTitle}
                      </p>
                    </div>
                  ))
                )}
              </div>

              <div className="md:col-span-2 flex flex-col justify-between p-4 bg-slate-50">
                {activeConversation ? (
                  <>
                    <div className="space-y-3 overflow-y-auto max-h-80">
                      {activeConversation.messages.map((m, idx) => {
                        const isMe = m.sender === currentUser.name;
                        return (
                          <div
                            key={idx}
                            className={`flex flex-col ${
                              isMe ? "items-end" : "items-start"
                            }`}
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

                    <form onSubmit={handleSendReply} className="mt-4 flex gap-2">
                      <input
                        type="text"
                        placeholder="Write a message..."
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white focus:outline-none focus:border-emerald-500"
                      />
                      <button
                        type="submit"
                        className="bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-slate-800"
                      >
                        Send
                      </button>
                    </form>
                  </>
                ) : (
                  <div className="m-auto text-center text-slate-400 text-sm">
                    Select a conversation on the left to view messages.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 3. POST LISTING VIEW */}
          {activeTab === "post" && (
            <PostListingForm
              currentUser={currentUser}
              initialCategory={selectedCat}
              initialSubcategory={selectedSubcat}
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
                    Manage everything you have posted and update availability status in MongoDB
                  </p>
                </div>
                <button
                  onClick={() => setActiveTab("post")}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-4 py-2.5 rounded-lg shadow-sm"
                >
                  + Post Another Listing
                </button>
              </div>

              <div className="space-y-3">
                {myListings.length === 0 ? (
                  <div className="bg-white p-8 rounded-xl border border-slate-200 text-center text-slate-500 text-sm">
                    You haven't posted any listings yet.
                  </div>
                ) : (
                  myListings.map((item) => {
                    const statusMeta =
                      LISTING_STATUSES[item.status] || LISTING_STATUSES.active;
                    return (
                      <div
                        key={item._id}
                        onClick={() => setSelectedListing(item)}
                        className="bg-white p-4 rounded-xl border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 cursor-pointer hover:border-emerald-300 transition-colors group"
                      >
                        <div className="flex items-center gap-4">
                          <img
                            src={item.images?.[0]}
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
                            <h3 className="font-bold text-slate-900 mt-1 group-hover:text-emerald-700 transition-colors">
                              {item.title}
                            </h3>
                            <p className="text-sm font-extrabold text-emerald-700">
                              {formatPrice(item)}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 self-end sm:self-center">
                          <label className="text-xs font-semibold text-slate-500">
                            Status:
                          </label>
                          <select
                            value={item.status}
                            onChange={(e) =>
                              handleStatusChange(e, item._id, e.target.value)
                            }
                            onClick={(e) => e.stopPropagation()}
                            className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold bg-slate-50 cursor-pointer"
                          >
                            <option value="active">Active</option>
                            <option value="pending">Pending Pickup</option>
                            <option value="sold">Sold</option>
                          </select>
                          <button
                            onClick={(e) => handleDeleteListing(e, item._id)}
                            className="text-xs text-red-600 font-semibold hover:underline ml-2"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* 5. FAVOURITES VIEW */}
          {activeTab === "favourites" && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold">
                Saved Favourites ({favouriteListings.length})
              </h2>
              {favouriteListings.length === 0 ? (
                <div className="bg-white p-8 rounded-xl border border-slate-200 text-center text-slate-500 text-sm">
                  You haven't saved any listings yet. Click the ❤️ icon on any item in Search!
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {favouriteListings.map((item) => (
                    <div
                      key={item._id}
                      onClick={() => setSelectedListing(item)}
                      className="bg-white rounded-xl border border-slate-200 p-4 flex gap-4 items-center justify-between cursor-pointer hover:border-emerald-300 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <img
                          src={item.images?.[0]}
                          alt={item.title}
                          className="w-16 h-16 rounded-lg object-cover border border-slate-200"
                        />
                        <div>
                          <p className="text-emerald-700 font-bold text-sm">
                            {formatPrice(item)}
                          </p>
                          <h3 className="font-semibold text-sm line-clamp-1">
                            {item.title}
                          </h3>
                          <span className="text-xs text-slate-400">
                            {item.subcategory}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={(e) => toggleFavourite(e, item._id)}
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
        </>
      )}
    </PortalLayout>
  );
}
