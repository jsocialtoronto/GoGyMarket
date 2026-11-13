// client/src/App.jsx
import React, { useState, useEffect, useMemo } from "react";
import PortalLayout from "./components/PortalLayout";
import PostListingForm from "./components/PostListingForm";
import ListingDetail from "./components/ListingDetail";
import AuthScreen from "./components/AuthScreen";
import AdminDashboard from "./components/AdminDashboard";
import { MARKETPLACE_CATEGORIES } from "./config/categoriesConfig";

const API_BASE = (import.meta.env.VITE_API_URL || "http://localhost:5000").replace(/\/$/, "");

export default function App() {
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem("gogy_user");
      return saved ? JSON.parse(saved) : null;
    } catch (e) { return null; }
  });

  const isStaff = currentUser?.role === "admin" || currentUser?.role === "viewer";
  const isDriver = currentUser?.role === "driver";

  const [activeTab, setActiveTab] = useState(isDriver ? "driver" : isStaff ? "admin" : "search");
  const [selectedListing, setSelectedListing] = useState(null);
  const [listings, setListings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const [itemDistances, setItemDistances] = useState({});

  const [favouriteIds, setFavouriteIds] = useState(() => {
    try {
      const saved = localStorage.getItem("gogy_favs");
      const parsed = saved ? JSON.parse(saved) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) { return []; }
  });

  const [cart, setCart] = useState(() => {
    try {
      const saved = localStorage.getItem("gogy_cart");
      const parsed = saved ? JSON.parse(saved) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) { return []; }
  });

  const [deliveryPaymentMethod, setDeliveryPaymentMethod] = useState("cash");
  const [cashVerifyStep, setCashVerifyStep] = useState(false);
  const [lockboxPhoto, setLockboxPhoto] = useState(null);
  const [checkoutError, setCheckoutError] = useState("");
  const [isProcessingOrder, setIsProcessingOrder] = useState(false);
  const [completedOrder, setCompletedOrder] = useState(null);

  const [myOrders, setMyOrders] = useState([]);
  const [allRatings, setAllRatings] = useState([]);
  const [ratingStars, setRatingStars] = useState({});
  const [ratingComment, setRatingComment] = useState({});
  const [ratingError, setRatingError] = useState("");

  const [driverOrders, setDriverOrders] = useState([]);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCat, setSelectedCat] = useState("");
  const [selectedSubcat, setSelectedSubcat] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [locationFilter, setLocationFilter] = useState("");

  const [conversations, setConversations] = useState([]);
  const [activeConvId, setActiveConvId] = useState(null);
  const [replyText, setReplyText] = useState("");

  const [editingListing, setEditingListing] = useState(null);
  // NEW: Add condition to Edit Form State
  const [editFormData, setEditFormData] = useState({ title: "", description: "", price: "", stockCount: 1, isLocationMasked: true, isOversized: false, condition: "New" });

  const loadMarketplaceData = async () => {
    try {
      setIsLoading(true);
      const [listingsRes, convsRes] = await Promise.all([
        fetch(`${API_BASE}/api/listings`),
        fetch(`${API_BASE}/api/conversations`)
      ]);

      if (listingsRes.ok) {
        const listingsData = await listingsRes.json();
        setListings(Array.isArray(listingsData) ? listingsData : []);
      }
      if (convsRes.ok) {
        const convsData = await convsRes.json();
        const validConvs = Array.isArray(convsData) ? convsData : [];
        const myConvs = isStaff ? validConvs : validConvs.filter(c => c?.buyerName === currentUser?.name || c?.sellerName === currentUser?.name);
        setConversations(myConvs);
        if (myConvs.length > 0 && !activeConvId) setActiveConvId(myConvs[0]._id);
      }

      if (currentUser && !isStaff && !isDriver) {
        const [ordersRes, ratingsRes] = await Promise.all([
          fetch(`${API_BASE}/api/orders/user/${currentUser.id}`),
          fetch(`${API_BASE}/api/ratings`)
        ]);
        if (ordersRes.ok) {
          const oData = await ordersRes.json();
          setMyOrders(Array.isArray(oData) ? oData : []);
        }
        if (ratingsRes.ok) {
          const rData = await ratingsRes.json();
          setAllRatings(Array.isArray(rData) ? rData : []);
        }
      }
    } catch (err) {
      console.error("Error loading data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadDriverData = async () => {
    try {
      setIsLoading(true);
      const [ordersRes, convsRes] = await Promise.all([
        fetch(`${API_BASE}/api/driver/orders`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("gogy_token")}` }
        }),
        fetch(`${API_BASE}/api/conversations`)
      ]);

      if (ordersRes.ok) {
        const dData = await ordersRes.json();
        setDriverOrders(Array.isArray(dData) ? dData : []);
      }
      if (convsRes.ok) {
        const convsData = await convsRes.json();
        const validConvs = Array.isArray(convsData) ? convsData : [];
        const myConvs = validConvs.filter(c => c?.buyerName === currentUser?.name || c?.sellerName === currentUser?.name);
        setConversations(myConvs);
        if (myConvs.length > 0 && !activeConvId) setActiveConvId(myConvs[0]._id);
      }
    } catch (err) {
      console.error("Error loading driver data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get("session_id");
    const orderId = params.get("order_id");
    const isSuccess = params.get("payment_success");
    const isCancelled = params.get("payment_cancelled");

    if (isSuccess && sessionId && orderId) {
      setIsProcessingOrder(true);
      fetch(`${API_BASE}/api/orders/confirm-stripe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, orderId })
      })
      .then(res => res.json())
      .then(data => {
         if (data.success) {
           setCart([]);
           setActiveTab("orders");
         }
      })
      .finally(() => {
         window.history.replaceState({}, document.title, window.location.pathname);
         setIsProcessingOrder(false);
      });
    } else if (isCancelled) {
      setCheckoutError("Payment was cancelled at checkout. You can try again.");
      setActiveTab("cart");
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  useEffect(() => {
    if (currentUser) {
      if (isDriver) {
        loadDriverData();
      } else {
        loadMarketplaceData();
      }
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

  // NEW: Updated price formatter to remove "hourly"
  const formatPrice = (item) => {
    if (!item) return "$0 GYD";
    if (item.pricingType === "free") return "FREE";
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

  const handleDeleteListing = async (e, listingId) => {
    e.stopPropagation();
    try {
      const res = await fetch(`${API_BASE}/api/listings/${listingId}`, { method: "DELETE" });
      if (res.ok) setListings((prev) => prev.filter((item) => item._id !== listingId));
    } catch (err) {
      console.error("Failed to delete listing:", err);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editingListing) return;
    try {
      const res = await fetch(`${API_BASE}/api/listings/${editingListing._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editFormData)
      });
      if (res.ok) {
        const updated = await res.json();
        setListings((prev) => prev.map((l) => (l._id === updated._id ? updated : l)));
        setEditingListing(null);
      } else {
        const data = await res.json();
        alert(data.error || "Failed to update listing.");
      }
    } catch (err) {
      console.error("Error updating listing:", err);
    }
  };

  const cartItemTotal = cart.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 1), 0);
  const cartDeliveryTotal = cart.reduce((sum, item) => sum + Number(item.shippingCost || 0), 0);
  const cartGrandTotal = cartItemTotal + cartDeliveryTotal;
  const hasDeliveryItems = cart.some((item) => item.deliveryMethod === "delivery");

  const processStripeCheckout = async () => {
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
          paymentMethod: "credit",
          paymentOptionLabel: "Option 4: Delivery - Credit Card (Active & Paid)",
          items: cart,
          itemSubtotal: cartItemTotal,
          deliveryTotal: cartDeliveryTotal,
          grandTotal: cartGrandTotal,
        })
      });

      const savedOrder = await res.json();
      if (!res.ok) throw new Error(savedOrder.error || "Could not create order");

      const stripeRes = await fetch(`${API_BASE}/api/create-checkout-session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: savedOrder._id,
          items: cart,
          deliveryTotal: cartDeliveryTotal,
          domain: window.location.origin
        })
      });

      const stripeData = await stripeRes.json();
      if (!stripeRes.ok) throw new Error(stripeData.error || "Could not connect to Stripe");

      window.location.href = stripeData.url;
    } catch (err) {
      setCheckoutError("Failed to initiate Stripe checkout: " + err.message);
      setIsProcessingOrder(false);
    }
  };

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
    if (deliveryPaymentMethod === "credit") {
      processStripeCheckout();
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

  const handleDeleteMessage = async (convId, msgId) => {
    try {
      const res = await fetch(`${API_BASE}/api/conversations/${convId}/messages/${msgId}`, { method: "DELETE" });
      if (res.ok) {
        const updatedConv = await res.json();
        setConversations((prev) => prev.map((c) => (c._id === convId ? updatedConv : c)));
      }
    } catch (err) {
      console.error("Failed to delete message:", err);
    }
  };

  const handleDeleteConversation = async (e, convId) => {
    e.stopPropagation();
    const confirmed = window.confirm("Are you sure you want to permanently delete this entire conversation?");
    if (!confirmed) return;
    try {
      const res = await fetch(`${API_BASE}/api/conversations/${convId}`, { method: "DELETE" });
      if (res.ok) {
        setConversations((prev) => prev.filter((c) => c._id !== convId));
        if (activeConvId === convId) setActiveConvId(null);
      }
    } catch (err) {
      console.error("Failed to delete conversation:", err);
    }
  };

  const handleSubmitRating = async (orderId, listingId, targetUserId, targetUserName, raterRole) => {
    setRatingError("");
    const stars = ratingStars[`${orderId}_${listingId}`] || 5;
    const comment = ratingComment[`${orderId}_${listingId}`] || "";

    if (!comment.trim()) {
      setRatingError("Please write a comment for your review.");
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/ratings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId, listingId, raterId: currentUser.id, raterName: currentUser.name, raterRole, targetUserId, targetUserName, stars, comment
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to submit rating");

      setAllRatings((prev) => [data, ...prev]);
      alert("Rating submitted successfully!");
      loadMarketplaceData();
    } catch (err) {
      setRatingError(err.message);
    }
  };

  const handleAcceptDelivery = async (orderId) => {
    try {
      const res = await fetch(`${API_BASE}/api/driver/orders/${orderId}/accept`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${localStorage.getItem("gogy_token")}` }
      });
      if (res.ok) {
        loadDriverData();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to accept delivery");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCompleteDelivery = async (orderId) => {
    try {
      const res = await fetch(`${API_BASE}/api/driver/orders/${orderId}/complete`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${localStorage.getItem("gogy_token")}` }
      });
      if (res.ok) {
        loadDriverData();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to complete delivery");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const filteredListings = useMemo(() => {
    let result = (listings || []).filter((item) => {
      if (!item) return false;
      if (currentUser && item.sellerId === currentUser.id) return false;
      
      const stock = item.stockCount != null ? Number(item.stockCount) : 1;
      if (item.status === "sold" || stock <= 0) return false;

      const matchesKeyword =
        !searchQuery ||
        (item.title && item.title.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesCat = !selectedCat || item.category === selectedCat;
      const matchesSub = !selectedSubcat || item.subcategory === selectedSubcat;
      const itemPrice = Number(item.price || 0);
      const matchesMinPrice = minPrice === "" || itemPrice >= Number(minPrice);
      const matchesMaxPrice = maxPrice === "" || itemPrice <= Number(maxPrice);
      const matchesLocation = !locationFilter || (item.location && item.location.toLowerCase().includes(locationFilter.toLowerCase()));

      return matchesKeyword && matchesCat && matchesSub && matchesMinPrice && matchesMaxPrice && matchesLocation;
    });

    return result.slice(0, 10);
  }, [listings, searchQuery, selectedCat, selectedSubcat, minPrice, maxPrice, locationFilter, currentUser]);

  useEffect(() => {
    if (!currentUser?.location || activeTab !== "search" || filteredListings.length === 0) return;

    let isMounted = true; 

    const fetchDistancesSequentially = async () => {
      for (const item of filteredListings) {
        if (!isMounted) break;
        
        if (itemDistances[item._id] !== undefined) continue;

        setItemDistances(prev => ({ ...prev, [item._id]: "Calculating..." }));

        try {
          const res = await fetch(`${API_BASE}/api/shipping-quote`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              origin: item.location,
              destination: currentUser.location,
              isOversized: item.isOversized || false 
            })
          });
          
          const data = await res.json();
          
          if (isMounted) {
            if (data.success) {
              setItemDistances(prev => ({ ...prev, [item._id]: data.formattedDistance }));
            } else {
              setItemDistances(prev => ({ ...prev, [item._id]: "Distance unknown" }));
            }
          }
        } catch (err) {
          if (isMounted) {
            setItemDistances(prev => ({ ...prev, [item._id]: "Distance unknown" }));
          }
        }
        
        await new Promise(resolve => setTimeout(resolve, 300));
      }
    };

    fetchDistancesSequentially();

    return () => {
      isMounted = false;
    };
  }, [filteredListings, currentUser, activeTab]); 

  const myListings = (listings || []).filter((item) => item?.sellerId === currentUser?.id);
  const favouriteListings = (listings || []).filter((item) => favouriteIds.includes(item?._id));
  const activeConversation = conversations?.find((c) => c?._id === activeConvId);

  const renderMessagesTab = () => (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden grid grid-cols-1 md:grid-cols-3 min-h-[480px]">
      <div className="border-r border-slate-200 p-4 space-y-2 overflow-y-auto max-h-[480px]">
        <h2 className="font-bold text-sm uppercase tracking-wider text-slate-500 mb-3">Conversations</h2>
        {(!conversations || conversations.length === 0) ? (
          <p className="text-xs text-slate-400">No messages yet.</p>
        ) : (
          conversations.map((conv) => {
            if (!conv) return null;
            const otherPersonName = conv?.sellerName === currentUser?.name ? conv?.buyerName : conv?.sellerName;
            return (
              <div key={conv._id} onClick={() => setActiveConvId(conv._id)} className={`p-3 rounded-lg cursor-pointer border transition-colors ${activeConvId === conv._id ? "bg-emerald-50 border-emerald-300" : "border-slate-200 hover:bg-slate-50"}`}>
                <div className="flex justify-between items-start text-xs font-bold text-slate-800">
                  <div className="flex-1">
                    <span>{otherPersonName || "Unknown User"}</span>
                    {conv?.isDeliveryChat && <span className="ml-2 text-[9px] bg-blue-100 text-blue-800 border border-blue-200 px-1.5 py-0.5 rounded font-black uppercase tracking-wider">Dispatch</span>}
                    <p className="text-xs text-slate-600 font-medium truncate mt-0.5">{conv?.listingTitle || "Item Inquiry"}</p>
                  </div>
                  <button onClick={(e) => handleDeleteConversation(e, conv._id)} className="ml-2 text-slate-300 hover:text-red-500 transition-colors" title="Delete Thread">🗑️</button>
                </div>
              </div>
            );
          })
        )}
      </div>
      
      <div className="md:col-span-2 flex flex-col justify-between p-4 bg-slate-50">
        {activeConversation ? (
          <>
            <div className="space-y-4 overflow-y-auto max-h-80 pr-2">
              {(activeConversation?.messages || []).map((m, idx) => {
                if (!m) return null;
                const isMe = m?.sender === currentUser?.name;
                const isAdminMsg = m?.sender === "GoGyMarket Admin" || m?.sender === "GoGyMarket Dispatch";
                return (
                  <div key={m?._id || idx} className={`flex flex-col ${isAdminMsg ? "items-center" : isMe ? "items-end" : "items-start"}`}>
                    <div className="flex items-center gap-2">
                      {isMe && !isAdminMsg && m?._id && (
                        <button onClick={() => handleDeleteMessage(activeConversation._id, m._id)} className="text-xs text-slate-300 hover:text-red-500 opacity-0 hover:opacity-100 transition-opacity" title="Delete Message">🗑️</button>
                      )}
                      <div className={`px-4 py-2.5 rounded-xl text-sm max-w-md whitespace-pre-wrap ${isAdminMsg ? "bg-amber-50 border border-amber-300 text-amber-950 font-medium" : isMe ? "bg-emerald-600 text-white" : "bg-white border border-slate-200 text-slate-800"}`}>
                        {m?.text}
                      </div>
                      {!isMe && !isAdminMsg && m?._id && (
                        <button onClick={() => handleDeleteMessage(activeConversation._id, m._id)} className="text-xs text-slate-300 hover:text-red-500 opacity-0 hover:opacity-100 transition-opacity" title="Delete Message">🗑️</button>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-400 mt-1 px-1">{m?.sender} • {m?.time}</span>
                  </div>
                );
              })}
            </div>
            <form onSubmit={handleSendReply} className="mt-4 flex gap-2">
              <input type="text" placeholder="Write a message..." value={replyText} onChange={(e) => setReplyText(e.target.value)} className="flex-1 rounded-lg border border-slate-300 px-3 py-2.5 text-sm bg-white focus:outline-none focus:border-emerald-500" />
              <button type="submit" className="bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors">Send</button>
            </form>
          </>
        ) : (
          <div className="m-auto text-center text-slate-400 text-sm">Select a conversation on the left to view messages.</div>
        )}
      </div>
    </div>
  );

  if (!currentUser) {
    return (
      <AuthScreen
        onAuthSuccess={(user, token) => {
          localStorage.setItem("gogy_user", JSON.stringify(user));
          localStorage.setItem("gogy_token", token);
          setCurrentUser(user);
          if (user.role === "driver") {
            setActiveTab("driver");
          } else if (user.role === "admin" || user.role === "viewer") {
            setActiveTab("admin");
          } else {
            setActiveTab("search");
          }
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
        unreadMessages: conversations?.length || 0,
        myListings: myListings?.length || 0,
        favourites: favouriteListings?.length || 0,
        cart: cart.reduce((sum, i) => sum + Number(i?.quantity || 1), 0),
        orders: myOrders?.length || 0
      }}
    >
      {isDriver ? (
        <>
          {activeTab === "driver" && (
            <div className="max-w-4xl mx-auto space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">Driver Delivery Portal</h2>
                  <p className="text-xs text-slate-500">View and accept pending delivery requests.</p>
                </div>
                <button onClick={loadDriverData} className="text-xs font-bold text-emerald-700 hover:underline">
                  ↻ Refresh Requests
                </button>
              </div>
              
              {(!driverOrders || driverOrders.length === 0) ? (
                <div className="bg-white p-12 rounded-xl border border-slate-200 text-center text-slate-500">
                  No active or pending delivery requests at the moment.
                </div>
              ) : (
                <div className="space-y-4">
                  {driverOrders.map((order) => (
                    <div key={order._id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
                      <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                        <div>
                          <span className="font-black text-slate-900">{order.orderNumber}</span>
                          <span className={`ml-3 text-[11px] font-bold px-2.5 py-1 rounded-full ${
                            order.dispatchStatus === 'pending' ? 'bg-amber-100 text-amber-800' : 
                            order.dispatchStatus === 'active' ? 'bg-blue-100 text-blue-800' :
                            'bg-emerald-100 text-emerald-800'
                          }`}>
                            {order.dispatchStatus === 'pending' ? '⏳ Pending Dispatch' : 
                             order.dispatchStatus === 'active' ? '🚚 Active (In Transit)' :
                             '✅ Completed'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500">Placed: {new Date(order.createdAt).toLocaleString()}</p>
                      </div>
                      
                      {(order.items || []).filter(i => i.deliveryMethod === 'delivery').map((item, idx) => (
                        <div key={idx} className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-3">
                          <p className="font-bold text-slate-900 text-sm">{item.quantity}x {item.title}</p>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                            <div className="bg-white p-3 rounded border border-slate-200">
                              <p className="font-bold text-slate-500 uppercase mb-1">Pickup From (Seller)</p>
                              <p className="font-semibold text-slate-800">{item.sellerName}</p>
                              <p className="text-slate-600">{item.sellerLocation}</p>
                            </div>
                            
                            <div className="bg-white p-3 rounded border border-slate-200">
                              <p className="font-bold text-slate-500 uppercase mb-1">Deliver To (Buyer)</p>
                              <p className="font-semibold text-slate-800">{order.buyerName} ({order.buyerContact})</p>
                              {item.buyerLocationType === 'pin' ? (
                                <a href={item.buyerPin} target="_blank" rel="noreferrer" className="text-blue-600 underline font-semibold break-all">📍 View Pin Drop Location</a>
                              ) : (
                                <p className="text-slate-600">{item.buyerAddress}</p>
                              )}
                            </div>
                          </div>

                          {item.specialInstructions && (
                            <div className="mt-2 bg-amber-50 p-3 rounded-lg border border-amber-200 text-xs">
                              <span className="font-bold text-amber-800">Special Instructions: </span>
                              <span className="text-amber-900">{item.specialInstructions}</span>
                            </div>
                          )}
                        </div>
                      ))}

                      {order.dispatchStatus === 'pending' && (
                        <button 
                          onClick={() => handleAcceptDelivery(order._id)}
                          className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 rounded-lg shadow-md transition-colors mt-2"
                        >
                          Accept Delivery Request
                        </button>
                      )}
                      {order.dispatchStatus === 'active' && (
                        <button 
                          onClick={() => handleCompleteDelivery(order._id)}
                          className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-lg shadow-md transition-colors mt-2"
                        >
                          ✓ Mark Delivery as Completed
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          {activeTab === "messages" && renderMessagesTab()}
        </>
      ) : isStaff ? (
        activeTab === "admin" && (
          <AdminDashboard currentUser={currentUser} onOrdersUpdated={loadMarketplaceData} />
        )
      ) : selectedListing ? (
        <ListingDetail
          listing={selectedListing}
          cart={cart}
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
          activeTab={activeTab} 
        />
      ) : (
        <>
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

                <div className="pt-4 border-t border-slate-200 space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="font-bold text-sm uppercase tracking-wider text-slate-600">Advanced Filters</h2>
                    {(minPrice || maxPrice || locationFilter) && (
                      <button
                        onClick={() => { setMinPrice(""); setMaxPrice(""); setLocationFilter(""); }}
                        className="text-xs text-emerald-600 font-semibold hover:underline"
                      >
                        Reset
                      </button>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Price Range (GYD)</label>
                    <div className="flex items-center gap-2">
                      <input 
                        type="number" 
                        placeholder="Min $" 
                        value={minPrice} 
                        onChange={e => setMinPrice(e.target.value)} 
                        className="w-full border border-slate-300 rounded px-2 py-1.5 text-xs focus:outline-none focus:border-emerald-500" 
                      />
                      <span className="text-slate-400">-</span>
                      <input 
                        type="number" 
                        placeholder="Max $" 
                        value={maxPrice} 
                        onChange={e => setMaxPrice(e.target.value)} 
                        className="w-full border border-slate-300 rounded px-2 py-1.5 text-xs focus:outline-none focus:border-emerald-500" 
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Location Match</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Toronto" 
                      value={locationFilter} 
                      onChange={e => setLocationFilter(e.target.value)} 
                      className="w-full border border-slate-300 rounded px-2 py-1.5 text-xs focus:outline-none focus:border-emerald-500" 
                    />
                    <p className="text-[10px] text-slate-400 mt-1">Filters listings containing this city or neighborhood name.</p>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-200">
                  <button
                    onClick={() => setActiveTab("post")}
                    disabled={currentUser?.canPostListings === false}
                    className={`w-full font-bold text-xs py-2.5 px-3 rounded-lg shadow-sm ${
                      currentUser?.canPostListings === false 
                        ? "bg-slate-300 text-slate-500 cursor-not-allowed" 
                        : "bg-emerald-600 hover:bg-emerald-500 text-white"
                    }`}
                  >
                    {currentUser?.canPostListings === false 
                      ? "🚫 Posting Restricted" 
                      : (selectedSubcat ? `+ Post in ${selectedSubcat}` : "+ Post a New Listing")}
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
                    Loading live listings...
                  </div>
                ) : (!filteredListings || filteredListings.length === 0) ? (
                  <div className="bg-white p-10 rounded-xl border border-slate-200 text-center space-y-3">
                    <p className="text-slate-600 text-sm font-medium">
                      No active listings match your search and filter criteria.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredListings.map((item) => {
                      const isFav = favouriteIds.includes(item._id);
                      const stock = item.stockCount != null ? Number(item.stockCount) : 1;
                      const distText = itemDistances[item._id] ? `${itemDistances[item._id]} away` : "Calculating...";

                      return (
                        <div
                          key={item._id}
                          onClick={() => setSelectedListing(item)}
                          className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md hover:border-emerald-400 transition-all flex flex-col cursor-pointer group"
                        >
                          <div className="relative h-44 bg-slate-100">
                            <img src={item.images?.[0]} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                            <button onClick={(e) => toggleFavourite(e, item._id)} className="absolute top-2 right-2 w-8 h-8 rounded-full bg-white/90 shadow flex items-center justify-center text-sm hover:scale-110">
                              {isFav ? "❤️" : "🤍"}
                            </button>
                            {stock === 1 && (
                              <span className="absolute top-2 left-2 bg-red-600 text-white text-[11px] font-black px-2.5 py-1 rounded-full shadow-md animate-pulse">🔥 Only 1 Available!</span>
                            )}
                            
                            {/* NEW: Condition displayed right beside the category */}
                            <span className="absolute bottom-2 left-2 bg-slate-900/80 text-white text-[11px] px-2 py-0.5 rounded shadow-sm flex items-center gap-1.5">
                              <span>{item.category} › {item.subcategory}</span>
                              <span className="border-l border-white/40 pl-1.5 text-emerald-300 font-bold">{item.condition || "New"}</span>
                            </span>
                          </div>
                          <div className="p-4 flex-1 flex flex-col justify-between">
                            <div>
                              <div className="flex items-center justify-between gap-2">
                                <p className="text-emerald-700 font-extrabold text-lg">{formatPrice(item)}</p>
                                {stock > 1 && <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">{stock} in stock</span>}
                              </div>
                              <h3 className="font-bold text-sm text-slate-900 line-clamp-2 mt-0.5 group-hover:text-emerald-700">
                                {item.title}
                                {item.isOversized && (
                                  <span className="ml-2 bg-amber-100 text-amber-800 border border-amber-200 text-[9px] font-black px-1.5 py-0.5 rounded uppercase align-middle shadow-sm">
                                    📦 Oversize
                                  </span>
                                )}
                              </h3>
                            </div>
                            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                              <span className="truncate max-w-[120px] font-semibold text-emerald-700">📍 {distText}</span>
                              {item.sellerRatingCount > 0 ? (
                                <span className="font-bold text-yellow-600">⭐ {item.sellerRating}</span>
                              ) : (
                                <span className="text-slate-400 font-semibold">New Seller</span>
                              )}
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

          {activeTab === "cart" && (
            <div className="max-w-4xl mx-auto space-y-6">
              {completedOrder ? (
                <div className="bg-white rounded-2xl border-2 border-emerald-500 shadow-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                  <div className="bg-emerald-600 text-white p-6 text-center">
                    <div className="w-14 h-14 bg-white text-emerald-600 rounded-full flex items-center justify-center text-3xl mx-auto mb-3 shadow">✓</div>
                    <h2 className="text-2xl font-black">Order Submitted!</h2>
                    <p className="text-emerald-100 text-sm mt-1">
                      {completedOrder.status === "waiting_etransfer"
                        ? "Status: Waiting on Payment for eTransfer (Admin will verify and notify seller)"
                        : completedOrder.status === "waiting_cash"
                        ? "Status: Waiting on Confirmation of Cash (Admin will verify lockbox photo and notify seller)"
                        : "Status: Active & Confirmed! Both buyer and seller can now leave ratings."}
                    </p>
                  </div>

                  <div className="p-6 space-y-6">
                    <div className="flex flex-wrap justify-between gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 text-sm">
                      <div><p className="text-xs font-bold text-slate-400 uppercase">Order Number</p><p className="font-extrabold text-slate-900">{completedOrder.orderId}</p></div>
                      <div><p className="text-xs font-bold text-slate-400 uppercase">Purchase Option</p><p className="font-bold text-emerald-700">{completedOrder.paymentOptionLabel}</p></div>
                      <div><p className="text-xs font-bold text-slate-400 uppercase">Date & Time</p><p className="font-semibold text-slate-700">{completedOrder.timestamp}</p></div>
                    </div>

                    <div className="space-y-3">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Items Breakdown</h3>
                      {(completedOrder.items || []).map((item) => (
                        <div key={item.cartItemId} className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-white">
                          <div className="flex items-center gap-3">
                            <img src={item.images?.[0]} alt={item.title} className="w-14 h-14 rounded-lg object-cover border" />
                            <div>
                              <p className="font-bold text-slate-900 text-sm">{item.quantity || 1}x {item.title}</p>
                              <p className="text-xs text-slate-500">Seller: {item.sellerName} • {item.deliveryMethod === "pickup" ? `Local Pickup (${item.location})` : `Deliver to: ${item.buyerLocationType === 'pin' ? 'Pin Drop' : item.buyerAddress}`}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-extrabold text-slate-900 text-sm">${(Number(item.price) * Number(item.quantity || 1)).toLocaleString()} GYD</p>
                            {item.shippingCost > 0 && <p className="text-xs text-emerald-700 font-semibold">+ ${Number(item.shippingCost).toLocaleString()} GYD Delivery</p>}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="bg-slate-900 text-white p-5 rounded-xl space-y-2">
                      <div className="flex justify-between text-sm text-slate-300"><span>Items Subtotal:</span><span>${completedOrder.itemSubtotal.toLocaleString()} GYD</span></div>
                      <div className="flex justify-between text-sm text-slate-300"><span>Delivery Charges:</span><span>${completedOrder.deliveryTotal.toLocaleString()} GYD</span></div>
                      <div className="flex justify-between text-xl font-black text-emerald-400 pt-2 border-t border-slate-700"><span>Total Breakdown:</span><span>${completedOrder.grandTotal.toLocaleString()} GYD</span></div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 pt-2">
                      <button onClick={() => { setCompletedOrder(null); setActiveTab("orders"); }} className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-lg shadow-sm">⭐ Go to Orders & Ratings</button>
                      <button onClick={() => { setCompletedOrder(null); setActiveTab("search"); }} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold py-3 rounded-lg">Continue Shopping</button>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <h2 className="text-2xl font-bold text-slate-900">Your Shopping Cart</h2>

                  {(!cart || cart.length === 0) ? (
                    <div className="bg-white p-12 rounded-xl border border-slate-200 text-center space-y-4">
                      <span className="text-4xl">🛒</span>
                      <h3 className="text-lg font-bold text-slate-700">Your cart is currently empty</h3>
                      <button onClick={() => setActiveTab("search")} className="bg-emerald-600 text-white font-bold px-6 py-2.5 rounded-lg">Return to Search</button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      <div className="lg:col-span-2 space-y-4">
                        {cashVerifyStep ? (
                          <div className="bg-white p-6 rounded-xl border-2 border-emerald-500 shadow-sm space-y-5">
                            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                              <div>
                                <span className="bg-emerald-100 text-emerald-800 text-xs font-extrabold px-2.5 py-1 rounded">OPTION 2: CASH VERIFICATION</span>
                                <h3 className="text-lg font-bold text-slate-900 mt-1">Upload Photo of Cash in Lockbox</h3>
                              </div>
                              <button onClick={() => setCashVerifyStep(false)} className="text-xs font-bold text-slate-500 hover:text-slate-800">← Back to Cart</button>
                            </div>
                            <p className="text-sm text-slate-600 leading-relaxed">To submit your Cash Delivery order of <span className="font-bold text-slate-900">${cartGrandTotal.toLocaleString()} GYD</span>, place the cash inside your lockbox and upload a clear photo below.</p>
                            <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center bg-slate-50">
                              {lockboxPhoto ? (
                                <div className="space-y-3">
                                  <img src={lockboxPhoto} alt="Cash in Lockbox Verification" className="max-h-60 mx-auto rounded-lg border border-slate-200 shadow-sm" />
                                  <button type="button" onClick={() => setLockboxPhoto(null)} className="text-xs text-red-600 font-bold hover:underline">Remove & Retake Photo</button>
                                </div>
                              ) : (
                                <label className="cursor-pointer flex flex-col items-center justify-center space-y-2 py-6">
                                  <span className="text-4xl">📸</span>
                                  <span className="font-bold text-sm text-emerald-700">Click to Take or Upload Lockbox Cash Photo</span>
                                  <input type="file" accept="image/*" capture="environment" onChange={handleLockboxPhotoUpload} className="hidden" />
                                </label>
                              )}
                            </div>
                          </div>
                        ) : (
                          cart.map((item) => (
                            <div key={item.cartItemId} className="bg-white p-4 rounded-xl border border-slate-200 flex flex-col gap-4">
                              <div className="flex gap-4">
                                <img src={item.images?.[0]} alt={item.title} className="w-24 h-24 rounded-lg object-cover border border-slate-100" />
                                <div className="flex-1 flex flex-col">
                                  <h3 className="font-bold text-slate-900 line-clamp-2 leading-tight">{item.quantity || 1}x {item.title}</h3>
                                  <p className="text-emerald-700 font-extrabold mt-1">${(Number(item.price) * Number(item.quantity || 1)).toLocaleString()} GYD</p>
                                  <div className="mt-auto pt-2 flex items-center justify-between">
                                    <div className="bg-slate-100 text-slate-600 px-2.5 py-1 rounded text-xs font-semibold">
                                      {item.deliveryMethod === "pickup" ? "🚶 Option 1: Local Pickup (Free)" : `🚚 Delivery (+$${Number(item.shippingCost).toLocaleString()} GYD)`}
                                    </div>
                                    <button onClick={() => handleRemoveFromCart(item.cartItemId)} className="text-red-500 text-xs font-bold hover:underline">Remove</button>
                                  </div>
                                </div>
                              </div>

                              {item.deliveryMethod === "delivery" && (
                                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs space-y-1.5 text-slate-700 mt-2">
                                  <p className="font-bold uppercase tracking-wider text-slate-500 mb-1">Delivery Details Saved</p>
                                  <p><span className="font-bold">Deliver To:</span> {item.buyerLocationType === 'pin' ? <a href={item.buyerPin} target="_blank" rel="noreferrer" className="text-blue-600 underline font-semibold break-all">Pin Drop URL</a> : item.buyerAddress}</p>
                                  {item.specialInstructions && <p><span className="font-bold">Instructions:</span> {item.specialInstructions}</p>}
                                </div>
                              )}
                            </div>
                          ))
                        )}
                      </div>

                      <div className="bg-white p-6 rounded-xl border border-slate-200 h-fit space-y-4 sticky top-24 shadow-sm">
                        <h3 className="font-bold text-lg text-slate-900 border-b border-slate-200 pb-3">Order & Payment Options</h3>
                        {!hasDeliveryItems ? (
                          <div className="bg-emerald-50 border border-emerald-200 p-3.5 rounded-lg text-xs text-emerald-900 space-y-1">
                            <p className="font-extrabold">Option 1: Local Pickup Selected</p>
                            <p>You and the seller will coordinate pickup and payment directly in Messages.</p>
                          </div>
                        ) : (
                          <div className="space-y-2.5">
                            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Select Delivery Payment (Options 2–4):</p>
                            <label className={`flex items-start gap-2.5 p-3 rounded-lg border cursor-pointer text-xs ${deliveryPaymentMethod === "cash" ? "border-emerald-500 bg-emerald-50/50 font-bold" : "border-slate-200"}`}>
                              <input type="radio" name="delivPay" checked={deliveryPaymentMethod === "cash"} onChange={() => { setDeliveryPaymentMethod("cash"); setCheckoutError(""); }} className="mt-0.5" />
                              <div><p className="text-slate-900 font-bold">Option 2: Cash in Lockbox</p><p className="text-slate-500 font-normal">Upload photo of cash; Admin confirms & notifies seller</p></div>
                            </label>
                            <label className={`flex items-start gap-2.5 p-3 rounded-lg border cursor-pointer text-xs ${deliveryPaymentMethod === "etransfer" ? "border-emerald-500 bg-emerald-50/50 font-bold" : "border-slate-200"}`}>
                              <input type="radio" name="delivPay" checked={deliveryPaymentMethod === "etransfer"} onChange={() => { setDeliveryPaymentMethod("etransfer"); setCashVerifyStep(false); setCheckoutError(""); }} className="mt-0.5" />
                              <div><p className="text-slate-900 font-bold">Option 3: eTransfer</p><p className="text-slate-500 font-normal">Send to <span className="font-bold text-slate-800">gogymarket.com</span> (Admin verifies)</p></div>
                            </label>
                            <label className={`flex items-start gap-2.5 p-3 rounded-lg border cursor-pointer text-xs ${deliveryPaymentMethod === "credit" ? "border-emerald-500 bg-emerald-50/50 font-bold" : "border-slate-200"}`}>
                              <input type="radio" name="delivPay" checked={deliveryPaymentMethod === "credit"} onChange={() => { setDeliveryPaymentMethod("credit"); setCashVerifyStep(false); setCheckoutError(""); }} className="mt-0.5" />
                              <div><p className="text-slate-900 font-bold">Option 4: Credit Card (Stripe)</p><p className="text-slate-500 font-normal">Automatically active & paid upon completion</p></div>
                            </label>
                          </div>
                        )}

                        <div className="space-y-2 pt-2 border-t border-slate-200">
                          <div className="flex justify-between text-sm text-slate-600"><span>Items Subtotal:</span><span className="font-medium text-slate-900">${cartItemTotal.toLocaleString()} GYD</span></div>
                          <div className="flex justify-between text-sm text-slate-600"><span>Delivery Fees:</span><span className="font-medium text-slate-900">${cartDeliveryTotal.toLocaleString()} GYD</span></div>
                        </div>
                        <div className="flex justify-between font-black text-xl text-emerald-700 border-t border-slate-200 pt-3"><span>Total:</span><span>${cartGrandTotal.toLocaleString()} GYD</span></div>

                        {checkoutError && <div className="p-3 bg-red-50 border border-red-200 text-red-600 text-xs font-bold rounded-lg">⚠️ {checkoutError}</div>}
                        <button onClick={handleCheckoutSubmit} disabled={isProcessingOrder} className="w-full bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white font-bold text-sm py-3.5 rounded-lg mt-2 shadow-md transition-colors">
                          {isProcessingOrder ? "Processing Order..." : hasDeliveryItems && deliveryPaymentMethod === "cash" && !cashVerifyStep ? "Proceed to Cash Verification →" : "Confirm & Complete Purchase"}
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {activeTab === "orders" && (
            <div className="max-w-4xl mx-auto space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">My Completed Orders & Reviews</h2>
                  <p className="text-xs text-slate-500">Buyers can review sellers on transactions that are successfully paid and verified.</p>
                </div>
                <button onClick={loadMarketplaceData} className="text-xs font-bold text-emerald-700 hover:underline">↻ Refresh Orders</button>
              </div>

              {ratingError && <div className="p-3 bg-red-50 border border-red-200 text-red-600 text-xs font-bold rounded-lg">⚠️ {ratingError}</div>}

              {(!myOrders || myOrders.length === 0) ? (
                <div className="bg-white p-12 rounded-xl border border-slate-200 text-center space-y-3">
                  <span className="text-4xl">⭐</span>
                  <h3 className="text-lg font-bold text-slate-700">No order history yet</h3>
                  <p className="text-xs text-slate-400">Complete a purchase or make a sale to track it here.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {myOrders.map((order) => {
                    const isPaidAndActive = order.status === "active";
                    const isBuyer = String(order.buyerId) === String(currentUser.id);

                    return (
                      <div key={order._id} className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
                        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
                          <div>
                            <div className="flex items-center gap-3">
                              <span className="font-black text-slate-900 text-base">{order.orderNumber}</span>
                              <span className={`text-xs font-extrabold px-2.5 py-1 rounded-full ${isPaidAndActive ? "bg-emerald-100 text-emerald-800 border border-emerald-300" : "bg-amber-100 text-amber-800 border border-amber-300"}`}>
                                {isPaidAndActive ? "✅ Completed & Paid" : `⏳ Status: ${order.status}`}
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 mt-1">{isBuyer ? `Seller Order` : `Buyer: ${order.buyerName}`} • Placed {new Date(order.createdAt).toLocaleString()}</p>
                          </div>
                          <div className="text-right flex flex-col items-end gap-2">
                            <div>
                              <p className="text-xs font-bold uppercase text-slate-400">Total Paid</p>
                              <p className="text-lg font-black text-emerald-700">${Number(order.grandTotal).toLocaleString()} GYD</p>
                            </div>
                            {order.dispatchStatus === "completed" && <span className="bg-blue-100 text-blue-800 text-[10px] font-extrabold uppercase px-2 py-0.5 rounded shadow-sm">🚚 Delivery Completed</span>}
                          </div>
                        </div>

                        <div className="space-y-3">
                          {(order.items || []).map((item, idx) => {
                            const targetUserId = item.sellerId;
                            const targetUserName = item.sellerName;
                            const raterRole = "buyer"; 

                            const existingRating = (allRatings || []).find(
                              (r) => String(r.orderId) === String(order._id) && String(r.listingId) === String(item.listingId) && String(r.raterId) === String(currentUser.id)
                            );

                            return (
                              <div key={idx} className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                                <div className="flex items-center justify-between text-xs">
                                  <div className="flex items-center gap-3">
                                    {item.image && <img src={item.image} alt={item.title} className="w-12 h-12 rounded object-cover border" />}
                                    <div>
                                      <p className="font-bold text-slate-900 text-sm">{item.quantity}x {item.title}</p>
                                      <p className="text-slate-500">{isBuyer ? `Seller: ${item.sellerName}` : `Buyer: ${order.buyerName}`}</p>
                                    </div>
                                  </div>
                                  <span className="font-extrabold text-slate-800">${(item.unitPrice * item.quantity).toLocaleString()} GYD</span>
                                </div>

                                <div className="pt-3 border-t border-slate-200">
                                  {!isPaidAndActive ? (
                                    <p className="text-xs text-amber-700 font-semibold italic">🔒 Rating available once payment is verified and transaction is Active.</p>
                                  ) : !isBuyer ? (
                                    <p className="text-xs text-slate-500 italic font-semibold">As the Seller, you must wait for the Buyer to leave a review for your service.</p>
                                  ) : existingRating ? (
                                    <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-lg text-xs space-y-1">
                                      <p className="font-bold text-emerald-900">⭐ You rated {targetUserName}: {existingRating.stars} / 5 Stars</p>
                                      <p className="text-slate-700">"{existingRating.comment}"</p>
                                    </div>
                                  ) : (
                                    <div className="space-y-2 bg-white p-3 rounded-lg border border-slate-200">
                                      <p className="text-xs font-bold text-slate-700">Leave a review for Seller ({targetUserName}):</p>
                                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                                        <select value={ratingStars[`${order._id}_${item.listingId}`] || 5} onChange={(e) => setRatingStars((prev) => ({ ...prev, [`${order._id}_${item.listingId}`]: Number(e.target.value) }))} className="border border-slate-300 rounded px-2 py-1 text-xs font-bold bg-white">
                                          <option value="5">⭐⭐⭐⭐⭐ (5/5)</option>
                                          <option value="4">⭐⭐⭐⭐ (4/5)</option>
                                          <option value="3">⭐⭐⭐ (3/5)</option>
                                          <option value="2">⭐⭐ (2/5)</option>
                                          <option value="1">⭐ (1/5)</option>
                                        </select>
                                        <input type="text" placeholder="Write a comment about this transaction..." value={ratingComment[`${order._id}_${item.listingId}`] || ""} onChange={(e) => setRatingComment((prev) => ({ ...prev, [`${order._id}_${item.listingId}`]: e.target.value }))} className="flex-1 w-full sm:w-auto border border-slate-300 rounded px-3 py-1.5 text-xs" />
                                        <button onClick={() => handleSubmitRating(order._id, item.listingId, targetUserId, targetUserName, raterRole)} className="bg-emerald-600 hover:bg-emerald-500 w-full sm:w-auto text-white font-bold text-xs px-3 py-1.5 rounded shadow-sm">Submit Review</button>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {activeTab === "post" && (
            <PostListingForm
              currentUser={currentUser}
              initialCategory={selectedCat}
              initialSubcategory={selectedSubcat}
              onPublishSuccess={handlePublishSuccess}
            />
          )}

          {activeTab === "listings" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold">My Listings</h2>
                  <p className="text-xs text-slate-500">Edit or manage the items you have listed on GoGyMarket.</p>
                </div>
                <button 
                  onClick={() => setActiveTab("post")} 
                  disabled={currentUser?.canPostListings === false}
                  className={`text-xs font-bold px-4 py-2.5 rounded-lg shadow-sm ${
                    currentUser?.canPostListings === false
                      ? "bg-slate-300 text-slate-500 cursor-not-allowed" 
                      : "bg-emerald-600 hover:bg-emerald-500 text-white"
                  }`}
                >
                  {currentUser?.canPostListings === false ? "🚫 Posting Restricted" : "+ Post Another Listing"}
                </button>
              </div>
              <div className="space-y-3">
                {(!myListings || myListings.length === 0) ? (
                  <div className="bg-white p-8 rounded-xl border border-slate-200 text-center text-slate-500 text-sm">You haven't posted any listings yet.</div>
                ) : (
                  myListings.map((item) => {
                    const stock = item.stockCount != null ? Number(item.stockCount) : 1;
                    const isSoldOut = item.status === "sold" || stock <= 0;
                    
                    let badgeClass = "bg-emerald-100 text-emerald-800 border-emerald-300";
                    if (isSoldOut) badgeClass = "bg-red-100 text-red-800 border-red-300";
                    else if (item.status === "pending") badgeClass = "bg-amber-100 text-amber-800 border-amber-300";

                    return (
                      <div key={item._id} onClick={() => setSelectedListing(item)} className="bg-white p-4 rounded-xl border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 cursor-pointer hover:border-emerald-300">
                        <div className="flex items-center gap-4">
                          <img src={item.images?.[0]} alt={item.title} className="w-20 h-20 rounded-lg object-cover border" />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${badgeClass}`}>
                                {isSoldOut ? "Sold Out (0 Left)" : `Active • ${stock} in stock`}
                              </span>
                              {stock === 1 && !isSoldOut && <span className="text-[11px] font-black text-red-600">🔥 Only 1 Left!</span>}
                            </div>
                            <h3 className="font-bold text-slate-900 mt-1">{item.title}</h3>
                            <p className="text-sm font-extrabold text-emerald-700">{formatPrice(item)}</p>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 self-end sm:self-center">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingListing(item);
                              setEditFormData({
                                title: item.title,
                                description: item.description,
                                price: item.price,
                                stockCount: item.stockCount,
                                isLocationMasked: item.isLocationMasked !== false,
                                isOversized: item.isOversized || false,
                                condition: item.condition || "New" // Load Condition flag
                              });
                            }}
                            className="bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-bold px-3 py-1.5 rounded-lg"
                          >
                            ✏️ Edit
                          </button>
                          <button onClick={(e) => handleDeleteListing(e, item._id)} className="text-xs text-red-600 font-semibold hover:underline px-2 py-1">Delete</button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {activeTab === "favourites" && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold">Saved Favourites</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {(!favouriteListings || favouriteListings.length === 0) ? (
                  <div className="bg-white p-8 rounded-xl border border-slate-200 text-center text-slate-500 text-sm col-span-full">You haven't saved any listings yet.</div>
                ) : (
                  favouriteListings.map((item) => (
                    <div key={item._id} onClick={() => setSelectedListing(item)} className="bg-white rounded-xl border p-4 flex gap-4 items-center cursor-pointer hover:border-emerald-300">
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

      {/* NEW: Edit Modal Form Updates */}
      {editingListing && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-in fade-in zoom-in-95 duration-200">
          <div className="bg-white max-w-md w-full rounded-xl p-6 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <h3 className="font-bold text-slate-900 text-lg">Edit Listing</h3>
              <button onClick={() => setEditingListing(null)} className="text-slate-400 hover:text-slate-700 font-bold">✕</button>
            </div>
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Title</label>
                <input 
                  type="text" 
                  required 
                  value={editFormData.title} 
                  onChange={e => setEditFormData({...editFormData, title: e.target.value})} 
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none" 
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Description</label>
                <textarea 
                  rows="4" 
                  required 
                  value={editFormData.description} 
                  onChange={e => setEditFormData({...editFormData, description: e.target.value})} 
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                ></textarea>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Price (GYD)</label>
                  <input 
                    type="number" 
                    min="0" 
                    required 
                    value={editFormData.price} 
                    onChange={e => setEditFormData({...editFormData, price: e.target.value})} 
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none" 
                  />
                </div>
                <div>
                   <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Condition</label>
                   <select 
                     value={editFormData.condition} 
                     onChange={e => setEditFormData({...editFormData, condition: e.target.value})} 
                     className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                   >
                     <option value="New">New</option>
                     <option value="Used - Good">Used - Good</option>
                     <option value="Used - Fair">Used - Fair</option>
                   </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Stock Available</label>
                  <input 
                    type="number" 
                    min="0" 
                    required 
                    value={editFormData.stockCount} 
                    onChange={e => setEditFormData({...editFormData, stockCount: e.target.value})} 
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none" 
                  />
                  <p className="text-[10px] text-slate-500 mt-1">Set to 0 to mark as Sold Out.</p>
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl space-y-2 mt-2">
                <p className="text-[11px] text-amber-900 font-semibold leading-tight">
                  <span className="font-black">DELIVERY OVERSIZE CHARGE:</span> Items that can not fit in 15 inch x 10 inch x 10 inch container will be charged an extra delivery cost. Delivery cost is $20/km for first container (buyer pays) + $10/km for all additional containers (seller pays).
                </p>
                <label className="flex items-start gap-2 cursor-pointer bg-white border border-amber-300 p-2 rounded-lg w-full transition-colors hover:bg-amber-50/50">
                  <input 
                    type="checkbox" 
                    checked={editFormData.isOversized} 
                    onChange={e => setEditFormData({...editFormData, isOversized: e.target.checked})}
                    className="w-4 h-4 mt-0.5 text-amber-600 focus:ring-amber-500 rounded border-slate-300"
                  />
                  <div className="flex-1">
                    <span className="text-xs font-bold text-slate-900">Oversized item</span>
                    <p className="text-[10px] text-amber-700 mt-0.5 font-bold leading-tight">To avoid seller paying over sized item cost click on this box to have the buyer pay for the additional delivery cost.</p>
                  </div>
                </label>
              </div>
              
              <label className="flex items-center gap-2 cursor-pointer bg-slate-50 border border-slate-200 p-3 rounded-lg w-fit mt-2">
                <input 
                  type="checkbox" 
                  checked={editFormData.isLocationMasked} 
                  onChange={e => setEditFormData({...editFormData, isLocationMasked: e.target.checked})}
                  className="w-4 h-4 text-emerald-600 focus:ring-emerald-500"
                />
                <span className="text-sm font-bold text-slate-700">Mask my exact address from public view</span>
              </label>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setEditingListing(null)} className="px-4 py-2 text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg">Cancel</button>
                <button type="submit" className="px-5 py-2 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg shadow-sm transition-colors">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </PortalLayout>
  );
}
