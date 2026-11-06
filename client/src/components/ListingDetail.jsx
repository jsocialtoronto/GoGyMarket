// client/src/components/ListingDetail.jsx
import React, { useState, useEffect } from "react";
import { LISTING_STATUSES } from "../config/categoriesConfig";

const API_BASE = (import.meta.env.VITE_API_URL || "http://localhost:5000").replace(/\/$/, "");

export default function ListingDetail({
  listing,
  onClose,
  onMessageSeller,
  isFavourite,
  onToggleFavourite,
  formatPrice,
  currentUser
}) {
  const [mainImageIndex, setMainImageIndex] = useState(0);
  
  // Buyer Checkout State
  const [deliveryMethod, setDeliveryMethod] = useState("pickup"); // "pickup" | "delivery"
  const [buyerAddress, setBuyerAddress] = useState(currentUser.location || "");
  
  // Shipping Math
  const [shippingCost, setShippingCost] = useState(null);
  const [shippingDistance, setShippingDistance] = useState(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [calcError, setCalcError] = useState("");

  useEffect(() => {
    setMainImageIndex(0);
    setDeliveryMethod("pickup");
    setShippingCost(null);
    setCalcError("");
  }, [listing._id]);

  const images = listing.images?.length > 0
    ? listing.images
    : ["https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop&q=80"];

  const statusMeta = LISTING_STATUSES[listing.status] || LISTING_STATUSES.active;
  const isOwner = listing.sellerId === currentUser.id;
  const isService = listing.category === "Services";

  const handleCalculateShipping = async () => {
    if (!buyerAddress.trim()) {
      setCalcError("Please enter your full delivery address.");
      return;
    }
    
    setIsCalculating(true);
    setCalcError("");
    
    try {
      const res = await fetch(`${API_BASE}/api/shipping-quote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          // Adding country context helps Google Maps route partial addresses
          origin: `${listing.location}, Canada`,
          destination: `${buyerAddress.trim()}, Canada`
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to calculate distance");
      
      setShippingDistance(data.formattedDistance);
      setShippingCost(data.shippingCost);
    } catch (err) {
      setCalcError(err.message);
      setShippingCost(null);
    } finally {
      setIsCalculating(false);
    }
  };

  const handleProceed = () => {
    let intentMessage = `Hi ${listing.sellerName}, I would like to buy "${listing.title}".\n\n`;
    
    if (isService) {
      intentMessage += `I am interested in booking this service.`;
    } else if (deliveryMethod === "pickup") {
      intentMessage += `I would like to arrange Local Pickup in ${listing.location}.`;
    } else {
      intentMessage += `I need this delivered to: ${buyerAddress}.\n`;
      if (shippingCost !== null) {
        intentMessage += `I see the delivery fee is $${shippingCost.toLocaleString()} GYD based on distance.`;
      }
    }
    
    onMessageSeller({ ...listing, initialMessage: intentMessage });
  };

  const itemPrice = Number(listing.price || 0);
  const totalCost = deliveryMethod === "delivery" && shippingCost !== null
    ? itemPrice + shippingCost
    : itemPrice;

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200">
      <div className="bg-slate-50 border-b border-slate-200 px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <button
          onClick={onClose}
          className="text-slate-600 hover:text-emerald-700 font-bold text-sm flex items-center gap-2"
        >
          <span>←</span> Back to Search
        </button>
        <div className="flex gap-2 text-xs font-semibold text-slate-500">
          <span>{listing.category}</span>
          <span>›</span>
          <span>{listing.subcategory}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 lg:divide-x divide-slate-200">
        {/* LEFT COLUMN: Gallery & Description */}
        <div className="p-6 bg-slate-50/50 flex flex-col gap-4">
          <div className="w-full aspect-square bg-slate-100 rounded-xl overflow-hidden border border-slate-200 relative group">
            <img
              src={images[mainImageIndex]}
              alt={listing.title}
              className="w-full h-full object-contain bg-black/5"
            />
          </div>
          {images.length > 1 && (
            <div className="flex gap-3 overflow-x-auto pb-2">
              {images.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setMainImageIndex(idx)}
                  className={`relative w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden border-2 transition-all ${
                    mainImageIndex === idx ? "border-emerald-500 shadow-md" : "border-slate-200 opacity-70 hover:opacity-100"
                  }`}
                >
                  <img src={img} alt={`Thumbnail ${idx + 1}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
          
          <div className="mt-4 pt-4 border-t border-slate-200">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-3">Item Description</h3>
            <p className="text-slate-700 whitespace-pre-wrap leading-relaxed text-sm">{listing.description}</p>
          </div>
        </div>

        {/* RIGHT COLUMN: Buyer Checkout Flow */}
        <div className="p-6 flex flex-col bg-white">
          <div className="flex items-start justify-between gap-4 mb-6">
            <div>
              <p className="text-3xl font-black text-emerald-700 tracking-tight">
                {formatPrice(listing)}
              </p>
              <h1 className="text-xl font-bold text-slate-900 mt-2 leading-tight">
                {listing.title}
              </h1>
              {/* Highlighted Seller Location */}
              <div className="mt-3 inline-flex items-center gap-2 bg-slate-100 text-slate-700 px-3 py-1.5 rounded-lg text-sm font-bold border border-slate-200">
                <span>📍</span> <span>Item Location: {listing.location}</span>
              </div>
            </div>
            <button onClick={() => onToggleFavourite(listing._id)} className="flex-shrink-0 w-12 h-12 rounded-full border border-slate-200 flex items-center justify-center bg-slate-50 hover:bg-slate-100">
              <span className="text-xl">{isFavourite ? "❤️" : "🤍"}</span>
            </button>
          </div>

          {!isOwner && !isService && listing.status === "active" && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 mb-6">
              <h3 className="text-sm font-bold text-slate-900 mb-4">How would you like to receive this?</h3>
              
              <div className="flex flex-col gap-3">
                <label className={`flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-colors ${deliveryMethod === "pickup" ? "border-emerald-500 bg-emerald-50/30" : "border-slate-200 bg-white hover:border-slate-300"}`}>
                  <input 
                    type="radio" 
                    name="buyerDelivery" 
                    checked={deliveryMethod === "pickup"}
                    onChange={() => setDeliveryMethod("pickup")}
                    className="w-5 h-5 text-emerald-600 focus:ring-emerald-500" 
                  />
                  <div>
                    <p className="font-bold text-slate-900 text-sm">Local Pickup in {listing.location}</p>
                    <p className="text-xs text-slate-500 font-medium">Free • You travel to the seller</p>
                  </div>
                </label>

                <label className={`flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-colors ${deliveryMethod === "delivery" ? "border-emerald-500 bg-emerald-50/30" : "border-slate-200 bg-white hover:border-slate-300"}`}>
                  <input 
                    type="radio" 
                    name="buyerDelivery" 
                    checked={deliveryMethod === "delivery"}
                    onChange={() => setDeliveryMethod("delivery")}
                    className="w-5 h-5 text-emerald-600 focus:ring-emerald-500" 
                  />
                  <div className="flex-1">
                    <p className="font-bold text-slate-900 text-sm">Delivery ($20 GYD / km)</p>
                    <p className="text-xs text-slate-500 font-medium">Delivered to your address</p>
                  </div>
                </label>
              </div>

              {deliveryMethod === "delivery" && (
                <div className="mt-4 pt-4 border-t border-slate-200 space-y-3">
                  <label className="block text-xs font-bold text-slate-700">Enter your full street address & city:</label>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      placeholder="e.g. 15 Eastdale Avenue, Toronto"
                      value={buyerAddress}
                      onChange={(e) => {
                        setBuyerAddress(e.target.value);
                        setShippingCost(null);
                      }}
                      className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500"
                    />
                    <button 
                      onClick={handleCalculateShipping}
                      disabled={isCalculating || !buyerAddress.trim()}
                      className="bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm"
                    >
                      {isCalculating ? "..." : "Calculate"}
                    </button>
                  </div>
                  
                  {calcError && <p className="text-xs text-red-600 font-semibold mt-1">⚠️ {calcError}</p>}
                  
                  {shippingCost !== null && (
                    <div className="bg-white border border-emerald-200 rounded-lg p-3 mt-2 flex justify-between items-center">
                      <div>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Distance</p>
                        <p className="font-semibold text-slate-900">{shippingDistance}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Delivery Fee</p>
                        <p className="font-black text-emerald-700">+ ${shippingCost.toLocaleString()} GYD</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="mt-auto bg-slate-50 border border-slate-200 p-5 rounded-xl">
            {!isOwner && listing.status === "active" && (
              <div className="flex justify-between items-center mb-4">
                <span className="text-sm font-bold text-slate-600">Total (Item + {deliveryMethod === "pickup" ? "Pickup" : "Delivery"})</span>
                <span className="text-2xl font-black text-slate-900">${totalCost.toLocaleString()} GYD</span>
              </div>
            )}
            
            {isOwner ? (
              <div className="bg-emerald-100 border border-emerald-300 text-emerald-800 text-sm font-bold px-4 py-3 rounded-lg text-center">
                This is your listing
              </div>
            ) : listing.status !== "active" ? (
              <div className="bg-slate-200 border border-slate-300 text-slate-600 text-sm font-bold px-4 py-3 rounded-lg text-center">
                Item is no longer available
              </div>
            ) : (
              <button
                onClick={handleProceed}
                disabled={deliveryMethod === "delivery" && shippingCost === null}
                className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-400 text-white font-bold text-lg py-3.5 rounded-lg shadow-md transition-all flex items-center justify-center gap-2"
              >
                {deliveryMethod === "delivery" && shippingCost === null 
                  ? "Calculate delivery to proceed" 
                  : "💬 Message Seller to Buy"}
              </button>
            )}
            
            <div className="mt-4 flex items-center justify-center gap-2 text-xs text-slate-500 font-medium">
              <span>👤 Seller: {listing.sellerName}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
