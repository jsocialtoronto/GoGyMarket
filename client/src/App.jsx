// client/src/App.jsx
import React, { useState, useEffect, useMemo } from "react";
import PortalLayout from "./components/PortalLayout";
import PostListingForm from "./components/PostListingForm";
import ListingDetail from "./components/ListingDetail";
import AuthScreen from "./components/AuthScreen";
import AdminDashboard from "./components/AdminDashboard";
import { MARKETPLACE_CATEGORIES, LISTING_STATUSES } from "./config/categoriesConfig";

const API_BASE = (import.meta.env.VITE_API_URL || "http://localhost:5000").replace(/\/$/, "");

export default function App() {
  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem("gogy_user");
    return saved ? JSON.parse(saved) : null;
  });

  const [activeTab, setActiveTab] = useState("search");
  const [selectedListing, setSelectedListing] = useState(null);
  const [listings, setListings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const [favouriteIds, setFavouriteIds] = useState(() => {
    const saved = localStorage.getItem("gogy_favs");
    return saved ? JSON.parse(saved) : [];
  });

  const [cart, setCart] = useState(() => {
    const saved = localStorage.getItem("gogy_cart");
    return saved ? JSON.parse(saved) : [];
  });

  const [deliveryPaymentMethod, setDeliveryPaymentMethod] = useState("cash");
  const [cashVerifyStep, setCashVerifyStep] = useState(false);
  const [lockboxPhoto, setLockboxPhoto] = useState(null);
  const [checkoutError, setCheckoutError] = useState("");
  const [isProcessingOrder, setIsProcessingOrder] = useState(false);
  const [completedOrder, setCompletedOrder] = useState(null);

  const [sellQuantities, setSellQuantities] = useState({});

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCat, setSelectedCat] = useState("");
  const [selectedSubcat, setSelectedSubcat] = useState("");

  const [conversations, setConversations] = useState([]);
  const [activeConvId, setActiveConvId] = useState(null);
  const [replyText, setReplyText] = useState("");

  const loadMarketplaceData = async () => {
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
        if (convsData.length > 0 && !activeConvId) setActiveConvId(convsData[0]._id);
      }
    } catch (err) {
      console.error("Error loading data from Render:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser) {
      loadMarketplaceData();
    }
  }, [currentUser]);

  useEffect(() => {
    localStorage.setItem("gogy_favs", JSON.stringify(favouriteIds));
  }, [favouriteIds]);

  useEffect(() => {
    localStorage.setItem("gogy_cart", JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    setSelectedListing(null);
    setCashVerifyStep(false);
    setCheckoutError("");
  }, [activeTab]);

  const formatPrice = (item) => {
    if (item.pricingType === "free") return "FREE";
    if (item.pricingType === "contact_for_quote") return "Contact for Quote";
    if (item.pricingType === "hourly") return `$${Number(item.price || 0).toLocaleString()} GYD/hr`;
    return `$${Number(item.price || 0).toLocaleString()} GYD`;
  };

  const handlePublishSuccess = (savedListing) => {
    setListings((prev) => [savedListing, ...prev]);
    setSelectedCat("");
    setSelectedSubcat("");
    setActiveTab("listings");
  };

  const toggleFavourite = (e, id) => {
    e.stopPropagation();
    setFavouriteIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleAddToCart = (cartItem) => {
    setCart((prev) => [...prev, cartItem]);
    setCompletedOrder(null);
    setSelectedListing(null);
    setActiveTab("cart");
  };

  const handleRemoveFromCart = (cartItemId) => {
    setCart((prev) => prev.filter((item) => item.cartItemId !== cartItemId));
  };

  const handleLockboxPhotoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setLockboxPhoto(reader.result);
      setCheckoutError("");
    };
    reader.readAsDataURL(file);
  };

  const handleSellerMarkSold = async (e, item) => {
    e.stopPropagation();
    const qtyToSell = Number(sellQuantities[item._id] || 1);
    try {
      const res = await fetch(`${API_BASE}/api/listings/${item._id}/deduct-stock`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quantity: qtyToSell })
      });
      if (res.ok) {
        const updated = await res.json();
        setListings((prev) => prev.map((l) => (l._id === item._id ? updated : l)));
        setSellQuantities((prev) => ({ ...prev, [item._id]: 1 }));
      }
    } catch (err) {
      console.error("Failed to deduct stock:", err);
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

  const hasDeliveryItems = cart.some((item) => item.deliveryMethod === "delivery");

  const finalizeOrder = async (paymentMethodCode, chosenMethodLabel) => {
    setIsProcessingOrder(true);
    setCheckoutError("");

    try {
      const res = await fetch(`${API_BASE}/api/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          buyerId: currentUser.id,
          buyerName: currentUser.name,
          buyerContact: currentUser.email || currentUser.phone || "N/A",
          paymentMethod: paymentMethodCode,
          paymentOptionLabel: chosenMethodLabel,
          items: cart,
          itemSubtotal: cartItemTotal,
          deliveryTotal: cartDeliveryTotal,
          grandTotal: cartGrandTotal,
          lockboxPhoto
        })
      });

      const savedOrder = await res.json();
      if (!res.ok) throw new Error(savedOrder.error || "Could not create order");

      await loadMarketplaceData();

      setCompletedOrder({
        orderId: savedOrder.orderNumber,
        status: savedOrder.status,
        timestamp: new Date(savedOrder.createdAt).toLocaleString(),
        buyerName: currentUser.name,
        buyerContact: currentUser.email || currentUser.phone,
        paymentOptionLabel: chosenMethodLabel,
        items: [...cart],
        itemSubtotal: cartItemTotal,
        deliveryTotal: cartDeliveryTotal,
        grandTotal: cartGrandTotal
      });

      setCart([]);
      setCashVerifyStep(false);
      setLockboxPhoto(null);
    } catch (err) {
      setCheckoutError("Failed to complete order: " + err.message);
    } finally {
      setIsProcessingOrder(false);
    }
  };

  const handleCheckoutSubmit = () => {
    setCheckoutError("");

    if (!hasDeliveryItems) {
      finalizeOrder("pickup", "Option 1: Local Pickup (Pay & Pickup with Seller)");
      return;
    }

    if (deliveryPaymentMethod === "cash") {
      if (!cashVerifyStep) {
        setCashVerifyStep(true);
        return;
      }
      if (!lockboxPhoto) {
        setCheckoutError("Please upload a photo of the cash in the lockbox to verify your payment.");
        return;
      }
      finalizeOrder("cash", "Option 2: Delivery - Cash in Lockbox (Pending Admin Confirmation)");
      return;
    }

    if (deliveryPaymentMethod === "etransfer") {
      finalizeOrder("etransfer", "Option 3: Delivery - eTransfer to gogymarket.com (Pending Admin Verification)");
      return;
    }

    if (deliveryPaymentMethod === "credit") {
      finalizeOrder("credit", "Option 4: Delivery - Credit Card (Active & Paid)");
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
          sellerName: item.sellerName,
          initialMessage: item.initialMessage
        })
      });
      if (res.ok) {
        const conv = await res.json();
        setConversations((prev) => {
          const exists = prev.some((c) => c._id === conv._id);
          return exists ? prev.map((c) => (c._id === conv._id ? conv : c)) : [conv, ...prev];
        });
        setActiveConvId(conv._id);
        setSelectedListing(null);
        setActiveTab("messages");
      }
    } catch (err) {
      console.error("Failed to start conversation:", err);
    }
  };

  const handleSendReply = async (e) => {
    e.preventDefault();
    if (!replyText.trim() || !activeConvId) return;

    try {
      const res = await fetch(`${API_BASE}/api/conversations/${activeConvId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sender: currentUser.name, text: replyText.trim() })
      });
      if (res.ok) {
        const updatedConv = await res.json();
        setConversations((prev) => prev.map((c) => (c._id === activeConvId ? updatedConv : c)));
        setReplyText("");
      }
    } catch (err) {
      console.error("Failed to send message:", err);
    }
  };

  const filteredListings = useMemo(() => {
    return listings.filter((item) => {
      const stock = item.stockCount != null ? Number(item.stockCount) : 1;
      if (item.status === "sold" || stock <= 0) return false;

      const matchesKeyword =
        !searchQuery ||
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCat = !selectedCat || item.category === selectedCat;
      const matchesSub = !selectedSubcat || item.subcategory === selectedSubcat;
      return matchesKeyword && matchesCat && matchesSub;
    });
  }, [listings, searchQuery, selectedCat, selectedSubcat]);

  const myListings = listings.filter((item) => item.sellerId === currentUser?.id);
  const favouriteListings = listings.filter((item) => favouriteIds.includes(item._id));
  const activeConversation = conversations.find((c) => c._id === activeConvId);

  const cartItemTotal = cart.reduce(
    (sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 1),
    0
  );
  const cartDeliveryTotal = cart.reduce((sum, item) => sum + Number(item.shippingCost || 0), 0);
  const cartGrandTotal = cartItemTotal + cartDeliveryTotal;

  if (!currentUser) {
    return (
      <AuthScreen
        onAuthSuccess={(user, token) => {
          localStorage.setItem("gogy_user", JSON.stringify(user));
          localStorage.setItem("gogy_token", token);
          setCurrentUser(user);
        }}
      />
    );
  }

  return (
    <PortalLayout
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      currentUser={currentUser}
      counts={{
        unreadMessages: conversations.length,
        myListings: myListings.length,
        favourites: favouriteListings.length,
        cart: cart.reduce((sum, i) => sum + Number(i.quantity || 1), 0)
      }}
    >
      {selectedListing ? (
        <ListingDetail
          listing={selectedListing}
          onClose={() => setSelectedListing(null)}
          onMessageSeller={handleMessageSeller}
          onAddToCart={handleAddToCart}
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
          {/* 7. ADMINISTRATION PORTAL VIEW */}
          {activeTab === "admin" && (
            <AdminDashboard
              currentUser={currentUser}
              onOrdersUpdated={loadMarketplaceData}
            />
          )}

          {/* 1. SEARCH PORTAL VIEW */}
          {activeTab === "search" && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <aside className="bg-white p-4 rounded-xl border border-slate-200 h-fit space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="font-bold text-sm uppercase tracking-wider text-slate-600">Browse Categories</h2>
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
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs py-2.5 px-3 rounded-lg shadow-sm"
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
                </div>

                {isLoading ? (
                  <div className="bg-white p-10 rounded-xl border border-slate-200 text-center text-slate-500 text-sm">
                    Loading live listings from MongoDB...
                  </div>
                ) : filteredListings.length === 0 ? (
                  <div className="bg-white p-10 rounded-xl border border-slate-200 text-center space-y-3">
                    <p className="text-slate-600 text-sm font-medium">
                      No active listings yet. Click "Post Ad" to create your first listing!
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredListings.map((item) => {
                      const isFav = favouriteIds.includes(item._id);
                      const stock = item.stockCount != null ? Number(item.stockCount) : 1;
                      const isService = item.category === "Services";

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
                              className="absolute top-2 right-2 w-8 h-8 rounded-full bg-white/90 shadow flex items-center justify-center text-sm hover:scale-110"
                            >
                              {isFav ? "❤️" : "🤍"}
                            </button>

                            {!isService && stock === 1 && (
                              <span className="absolute top-2 left-2 bg-red-600 text-white text-[11px] font-black px-2.5 py-1 rounded-full shadow-md animate-pulse">
                                🔥 Only 1 Available!
                              </span>
                            )}

                            <span className="absolute bottom-2 left-2 bg-slate-900/80 text-white text-[11px] px-2 py-0.5 rounded">
                              {item.category} › {item.subcategory}
                            </span>
                          </div>
                          <div className="p-4 flex-1 flex flex-col justify-between">
                            <div>
                              <div className="flex items-center justify-between gap-2">
                                <p className="text-emerald-700 font-extrabold text-lg">{formatPrice(item)}</p>
                                {!isService && stock > 1 && (
                                  <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                                    {stock} in stock
                                  </span>
                                )}
                              </div>
                              <h3 className="font-bold text-sm text-slate-900 line-clamp-2 mt-0.5 group-hover:text-emerald-700">
                                {item.title}
                              </h3>
                            </div>
                            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                              <span className="truncate max-w-[140px]">📍 {item.location}</span>
                              <span className="text-emerald-600 font-bold group-hover:underline">View ›</span>
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

          {/* 6. SHOPPING CART, 4-OPTION CHECKOUT & SUCCESS RECEIPT VIEW */}
          {activeTab === "cart" && (
            <div className="max-w-4xl mx-auto space-y-6">
              {completedOrder ? (
                <div className="bg-white rounded-2xl border-2 border-emerald-500 shadow-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                  <div className="bg-emerald-600 text-white p-6 text-center">
                    <div className="w-14 h-14 bg-white text-emerald-600 rounded-full flex items-center justify-center text-3xl mx-auto mb-3 shadow">
                      ✓
                    </div>
                    <h2 className="text-2xl font-black">Order Submitted!</h2>
                    <p className="text-emerald-100 text-sm mt-1">
                      {completedOrder.status === "waiting_etransfer"
                        ? "Status: Waiting on Payment for eTransfer (Admin will verify and notify seller)"
                        : completedOrder.status === "waiting_cash"
                        ? "Status: Waiting on Confirmation of Cash (Admin will verify lockbox photo and notify seller)"
                        : "Status: Active & Confirmed! A full breakdown has been sent to your Messages."}
                    </p>
                  </div>

                  <div className="p-6 space-y-6">
                    <div className="flex flex-wrap justify-between gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 text-sm">
                      <div>
                        <p className="text-xs font-bold text-slate-400 uppercase">Order Number</p>
                        <p className="font-extrabold text-slate-900">{completedOrder.orderId}</p>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-400 uppercase">Purchase Option</p>
                        <p className="font-bold text-emerald-700">{completedOrder.paymentOptionLabel}</p>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-400 uppercase">Date & Time</p>
                        <p className="font-semibold text-slate-700">{completedOrder.timestamp}</p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                        Items Breakdown
                      </h3>
                      {completedOrder.items.map((item) => (
                        <div
                          key={item.cartItemId}
                          className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-white"
                        >
                          <div className="flex items-center gap-3">
                            <img
                              src={item.images?.[0]}
                              alt={item.title}
                              className="w-14 h-14 rounded-lg object-cover border"
                            />
                            <div>
                              <p className="font-bold text-slate-900 text-sm">
                                {item.quantity || 1}x {item.title}
                              </p>
                              <p className="text-xs text-slate-500">
                                Seller: {item.sellerName} •{" "}
                                {item.deliveryMethod === "pickup"
                                  ? `Local Pickup (${item.location})`
                                  : `Deliver to: ${item.buyerAddress}`}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-extrabold text-slate-900 text-sm">
                              ${(Number(item.price) * Number(item.quantity || 1)).toLocaleString()} GYD
                            </p>
                            {item.shippingCost > 0 && (
                              <p className="text-xs text-emerald-700 font-semibold">
                                + ${Number(item.shippingCost).toLocaleString()} GYD Delivery
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="bg-slate-900 text-white p-5 rounded-xl space-y-2">
                      <div className="flex justify-between text-sm text-slate-300">
                        <span>Items Subtotal:</span>
                        <span>${completedOrder.itemSubtotal.toLocaleString()} GYD</span>
                      </div>
                      <div className="flex justify-between text-sm text-slate-300">
                        <span>Delivery Charges:</span>
                        <span>${completedOrder.deliveryTotal.toLocaleString()} GYD</span>
                      </div>
                      <div className="flex justify-between text-xl font-black text-emerald-400 pt-2 border-t border-slate-700">
                        <span>Total Breakdown:</span>
                        <span>${completedOrder.grandTotal.toLocaleString()} GYD</span>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 pt-2">
                      <button
                        onClick={() => {
                          setCompletedOrder(null);
                          setActiveTab("messages");
                        }}
                        className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-lg shadow-sm"
                      >
                        💬 View Order in Messages
                      </button>
                      <button
                        onClick={() => {
                          setCompletedOrder(null);
                          setActiveTab("search");
                        }}
                        className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold py-3 rounded-lg"
                      >
                        Continue Shopping
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <h2 className="text-2xl font-bold text-slate-900">Your Shopping Cart</h2>

                  {cart.length === 0 ? (
                    <div className="bg-white p-12 rounded-xl border border-slate-200 text-center space-y-4">
                      <span className="text-4xl">🛒</span>
                      <h3 className="text-lg font-bold text-slate-700">Your cart is currently empty</h3>
                      <button
                        onClick={() => setActiveTab("search")}
                        className="bg-emerald-600 text-white font-bold px-6 py-2.5 rounded-lg"
                      >
                        Return to Search
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      <div className="lg:col-span-2 space-y-4">
                        {cashVerifyStep ? (
                          <div className="bg-white p-6 rounded-xl border-2 border-emerald-500 shadow-sm space-y-5">
                            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                              <div>
                                <span className="bg-emerald-100 text-emerald-800 text-xs font-extrabold px-2.5 py-1 rounded">
                                  OPTION 2: CASH VERIFICATION
                                </span>
                                <h3 className="text-lg font-bold text-slate-900 mt-1">
                                  Upload Photo of Cash in Lockbox
                                </h3>
                              </div>
                              <button
                                onClick={() => setCashVerifyStep(false)}
                                className="text-xs font-bold text-slate-500 hover:text-slate-800"
                              >
                                ← Back to Cart
                              </button>
                            </div>

                            <p className="text-sm text-slate-600 leading-relaxed">
                              To submit your Cash Delivery order of{" "}
                              <span className="font-bold text-slate-900">
                                ${cartGrandTotal.toLocaleString()} GYD
                              </span>
                              , place the cash inside your lockbox and upload a clear photo below. An Administrator will confirm it and notify the seller.
                            </p>

                            <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center bg-slate-50">
                              {lockboxPhoto ? (
                                <div className="space-y-3">
                                  <img
                                    src={lockboxPhoto}
                                    alt="Cash in Lockbox Verification"
                                    className="max-h-60 mx-auto rounded-lg border border-slate-200 shadow-sm"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => setLockboxPhoto(null)}
                                    className="text-xs text-red-600 font-bold hover:underline"
                                  >
                                    Remove & Retake Photo
                                  </button>
                                </div>
                              ) : (
                                <label className="cursor-pointer flex flex-col items-center justify-center space-y-2 py-6">
                                  <span className="text-4xl">📸</span>
                                  <span className="font-bold text-sm text-emerald-700">
                                    Click to Take or Upload Lockbox Cash Photo
                                  </span>
                                  <input
                                    type="file"
                                    accept="image/*"
                                    capture="environment"
                                    onChange={handleLockboxPhotoUpload}
                                    className="hidden"
                                  />
                                </label>
                              )}
                            </div>
                          </div>
                        ) : (
                          cart.map((item) => (
                            <div
                              key={item.cartItemId}
                              className="bg-white p-4 rounded-xl border border-slate-200 flex gap-4"
                            >
                              <img
                                src={item.images?.[0]}
                                alt={item.title}
                                className="w-24 h-24 rounded-lg object-cover border border-slate-100"
                              />
                              <div className="flex-1 flex flex-col">
                                <h3 className="font-bold text-slate-900 line-clamp-2 leading-tight">
                                  {item.quantity || 1}x {item.title}
                                </h3>
                                <p className="text-emerald-700 font-extrabold mt-1">
                                  ${(Number(item.price) * Number(item.quantity || 1)).toLocaleString()} GYD
                                </p>

                                <div className="mt-auto pt-2 flex items-center justify-between">
                                  <div className="bg-slate-100 text-slate-600 px-2.5 py-1 rounded text-xs font-semibold">
                                    {item.deliveryMethod === "pickup"
                                      ? "🚶 Option 1: Local Pickup (Free)"
                                      : `🚚 Delivery (+$${Number(item.shippingCost).toLocaleString()} GYD)`}
                                  </div>
                                  <button
                                    onClick={() => handleRemoveFromCart(item.cartItemId)}
                                    className="text-red-500 text-xs font-bold hover:underline"
                                  >
                                    Remove
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>

                      <div className="bg-white p-6 rounded-xl border border-slate-200 h-fit space-y-4 sticky top-24 shadow-sm">
                        <h3 className="font-bold text-lg text-slate-900 border-b border-slate-200 pb-3">
                          Order & Payment Options
                        </h3>

                        {!hasDeliveryItems ? (
                          <div className="bg-emerald-50 border border-emerald-200 p-3.5 rounded-lg text-xs text-emerald-900 space-y-1">
                            <p className="font-extrabold">Option 1: Local Pickup Selected</p>
                            <p>
                              You and the seller will coordinate pickup and payment directly in Messages.
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-2.5">
                            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                              Select Delivery Payment (Options 2–4):
                            </p>

                            <label
                              className={`flex items-start gap-2.5 p-3 rounded-lg border cursor-pointer text-xs ${
                                deliveryPaymentMethod === "cash"
                                  ? "border-emerald-500 bg-emerald-50/50 font-bold"
                                  : "border-slate-200"
                              }`}
                            >
                              <input
                                type="radio"
                                name="delivPay"
                                checked={deliveryPaymentMethod === "cash"}
                                onChange={() => {
                                  setDeliveryPaymentMethod("cash");
                                  setCheckoutError("");
                                }}
                                className="mt-0.5"
                              />
                              <div>
                                <p className="text-slate-900 font-bold">Option 2: Cash in Lockbox</p>
                                <p className="text-slate-500 font-normal">
                                  Upload photo of cash; Admin confirms & notifies seller
                                </p>
                              </div>
                            </label>

                            <label
                              className={`flex items-start gap-2.5 p-3 rounded-lg border cursor-pointer text-xs ${
                                deliveryPaymentMethod === "etransfer"
                                  ? "border-emerald-500 bg-emerald-50/50 font-bold"
                                  : "border-slate-200"
                              }`}
                            >
                              <input
                                type="radio"
                                name="delivPay"
                                checked={deliveryPaymentMethod === "etransfer"}
                                onChange={() => {
                                  setDeliveryPaymentMethod("etransfer");
                                  setCashVerifyStep(false);
                                  setCheckoutError("");
                                }}
                                className="mt-0.5"
                              />
                              <div>
                                <p className="text-slate-900 font-bold">Option 3: eTransfer</p>
                                <p className="text-slate-500 font-normal">
                                  Send to <span className="font-bold text-slate-800">gogymarket.com</span> (Admin verifies & notifies seller)
                                </p>
                              </div>
                            </label>

                            <label
                              className={`flex items-start gap-2.5 p-3 rounded-lg border cursor-pointer text-xs ${
                                deliveryPaymentMethod === "credit"
                                  ? "border-emerald-500 bg-emerald-50/50 font-bold"
                                  : "border-slate-200"
                              }`}
                            >
                              <input
                                type="radio"
                                name="delivPay"
                                checked={deliveryPaymentMethod === "credit"}
                                onChange={() => {
                                  setDeliveryPaymentMethod("credit");
                                  setCashVerifyStep(false);
                                  setCheckoutError("");
                                }}
                                className="mt-0.5"
                              />
                              <div>
                                <p className="text-slate-900 font-bold">Option 4: Credit Card (Stripe)</p>
                                <p className="text-slate-500 font-normal">
                                  Automatically active & paid upon completion
                                </p>
                              </div>
                            </label>
                          </div>
                        )}

                        <div className="space-y-2 pt-2 border-t border-slate-200">
                          <div className="flex justify-between text-sm text-slate-600">
                            <span>Items Subtotal:</span>
                            <span className="font-medium text-slate-900">
                              ${cartItemTotal.toLocaleString()} GYD
                            </span>
                          </div>
                          <div className="flex justify-between text-sm text-slate-600">
                            <span>Delivery Fees:</span>
                            <span className="font-medium text-slate-900">
                              ${cartDeliveryTotal.toLocaleString()} GYD
                            </span>
                          </div>
                        </div>

                        <div className="flex justify-between font-black text-xl text-emerald-700 border-t border-slate-200 pt-3">
                          <span>Total:</span>
                          <span>${cartGrandTotal.toLocaleString()} GYD</span>
                        </div>

                        {checkoutError && (
                          <div className="p-3 bg-red-50 border border-red-200 text-red-600 text-xs font-bold rounded-lg">
                            ⚠️ {checkoutError}
                          </div>
                        )}

                        <button
                          onClick={handleCheckoutSubmit}
                          disabled={isProcessingOrder}
                          className="w-full bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white font-bold text-sm py-3.5 rounded-lg mt-2 shadow-md transition-colors"
                        >
                          {isProcessingOrder
                            ? "Processing Order..."
                            : hasDeliveryItems && deliveryPaymentMethod === "cash" && !cashVerifyStep
                            ? "Proceed to Cash Lockbox Verification →"
                            : "Confirm & Complete Purchase"}
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
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
                  <p className="text-xs text-slate-400">No messages yet.</p>
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
                        const isAdminMsg = m.sender === "GoGyMarket Admin";
                        return (
                          <div
                            key={idx}
                            className={`flex flex-col ${
                              isAdminMsg ? "items-center" : isMe ? "items-end" : "items-start"
                            }`}
                          >
                            <div
                              className={`px-3.5 py-2 rounded-xl text-sm max-w-md whitespace-pre-wrap ${
                                isAdminMsg
                                  ? "bg-amber-50 border border-amber-300 text-amber-950 font-medium"
                                  : isMe
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
                        className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white"
                      />
                      <button
                        type="submit"
                        className="bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-semibold"
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

          {/* 4. MY LISTINGS & STOCK INVENTORY MANAGER */}
          {activeTab === "listings" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold">My Listings & Stock Manager</h2>
                  <p className="text-xs text-slate-500">
                    Manage your inventory or deduct stock when completing a Local Pickup sale
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
                    const stock = item.stockCount != null ? Number(item.stockCount) : 1;
                    const isSoldOut = item.status === "sold" || stock <= 0;
                    const statusMeta = isSoldOut
                      ? LISTING_STATUSES.sold
                      : LISTING_STATUSES[item.status] || LISTING_STATUSES.active;

                    return (
                      <div
                        key={item._id}
                        onClick={() => setSelectedListing(item)}
                        className="bg-white p-4 rounded-xl border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 cursor-pointer hover:border-emerald-300"
                      >
                        <div className="flex items-center gap-4">
                          <img
                            src={item.images?.[0]}
                            alt={item.title}
                            className="w-20 h-20 rounded-lg object-cover border"
                          />
                          <div>
                            <div className="flex items-center gap-2">
                              <span
                                className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${statusMeta.badgeClass}`}
                              >
                                {isSoldOut ? "Sold Out (0 Left)" : `Active • ${stock} in stock`}
                              </span>
                              {stock === 1 && !isSoldOut && (
                                <span className="text-[11px] font-black text-red-600">
                                  🔥 Only 1 Left!
                                </span>
                              )}
                            </div>
                            <h3 className="font-bold text-slate-900 mt-1">{item.title}</h3>
                            <p className="text-sm font-extrabold text-emerald-700">
                              {formatPrice(item)}
                            </p>
                          </div>
                        </div>

                        <div
                          className="flex flex-wrap items-center gap-2 self-end sm:self-center"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {!isSoldOut && (
                            <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-lg border border-slate-200">
                              <label className="text-xs font-semibold text-slate-600 pl-1">
                                Qty Sold:
                              </label>
                              <select
                                value={sellQuantities[item._id] || 1}
                                onChange={(e) =>
                                  setSellQuantities((prev) => ({
                                    ...prev,
                                    [item._id]: Number(e.target.value)
                                  }))
                                }
                                className="rounded border border-slate-300 px-2 py-1 text-xs font-bold bg-white"
                              >
                                {Array.from({ length: stock }, (_, idx) => idx + 1).map((num) => (
                                  <option key={num} value={num}>
                                    {num}
                                  </option>
                                ))}
                              </select>
                              <button
                                onClick={(e) => handleSellerMarkSold(e, item)}
                                className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-3 py-1.5 rounded"
                              >
                                Mark Sold
                              </button>
                            </div>
                          )}

                          <button
                            onClick={(e) => handleDeleteListing(e, item._id)}
                            className="text-xs text-red-600 font-semibold hover:underline px-2 py-1"
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
              <h2 className="text-xl font-bold">Saved Favourites</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {favouriteListings.length === 0 ? (
                  <div className="bg-white p-8 rounded-xl border border-slate-200 text-center text-slate-500 text-sm col-span-full">
                    You haven't saved any listings yet.
                  </div>
                ) : (
                  favouriteListings.map((item) => (
                    <div
                      key={item._id}
                      onClick={() => setSelectedListing(item)}
                      className="bg-white rounded-xl border p-4 flex gap-4 items-center cursor-pointer hover:border-emerald-300"
                    >
                      <img src={item.images?.[0]} alt={item.title} className="w-16 h-16 rounded-lg object-cover" />
                      <div>
                        <p className="text-emerald-700 font-bold text-sm">{formatPrice(item)}</p>
                        <h3 className="font-semibold text-sm line-clamp-1">{item.title}</h3>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </>
      )}
    </PortalLayout>
  );
}
