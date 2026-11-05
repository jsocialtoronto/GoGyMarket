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
  
  // Shipping Calculator State
  const [shippingCost, setShippingCost] = useState(null);
  const [shippingDistance, setShippingDistance] = useState(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [calcError, setCalcError] = useState("");

  useEffect(() => {
    setMainImageIndex(0);
    setShippingCost(null);
    setCalcError("");
  }, [listing._id]);

  const images = listing.images?.length > 0
    ? listing.images
    : ["https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop&q=80"];

  const statusMeta = LISTING_STATUSES[listing.status] || LISTING_STATUSES.active;
  const isOwner = listing.sellerId === currentUser.id;

  const handleCalculateShipping = async () => {
    setIsCalculating(true);
    setCalcError("");
    try {
      const res = await fetch(`${API_BASE}/api/shipping-quote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          origin: listing.location,
          destination: currentUser.location // Using the logged-in user's location
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to calculate distance");
      
      setShippingDistance(data.formattedDistance);
      setShippingCost(data.shippingCost);
    } catch (err) {
      setCalcError(err.message);
    } finally {
      setIsCalculating(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200">
      <div className="bg-slate-50 border-b border-slate-200 px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <button
          onClick={onClose}
          className="text-slate-600 hover:text-emerald-700 font-bold text-sm flex items-center gap-2"
        >
          <span>←</span> Back to previous screen
        </button>
        <div className="flex gap-2 text-xs font-semibold text-slate-500">
          <span>{listing.category}</span>
          <span>›</span>
          <span>{listing.subcategory}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 lg:divide-x divide-slate-200">
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
        </div>

        <div className="p-6 flex flex-col">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-3xl font-black text-emerald-700 tracking-tight">
                {formatPrice(listing)}
              </p>
              <h1 className="text-xl font-bold text-slate-900 mt-2 leading-tight">
                {listing.title}
              </h1>
            </div>
            <button onClick={() => onToggleFavourite(listing._id)} className="w-12 h-12 rounded-full border border-slate-200 flex items-center justify-center bg-slate-50 hover:bg-slate-100">
              <span className="text-xl">{isFavourite ? "❤️" : "🤍"}</span>
            </button>
          </div>

          <div className="flex items-center gap-4 mt-4 text-sm font-medium text-slate-600">
            <span>📍 {listing.location}</span>
          </div>

          {/* MODULE 2: DELIVERY & SHIPPING CALCULATOR */}
          <div className="mt-6 flex flex-col gap-2">
            {listing.deliveryMethods?.includes("pickup") && (
              <div className="inline-flex items-center gap-2 bg-slate-100 text-slate-700 px-3 py-1.5 rounded-lg text-sm font-bold w-fit">
                <span>🏪</span> Local Pickup Available
              </div>
            )}
            {listing.deliveryMethods?.includes("delivery") && (
              <div className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-800 border border-emerald-200 px-3 py-1.5 rounded-lg text-sm font-bold w-fit">
                <span>🚙</span> Seller Delivers (Fee: ${listing.deliveryFee} GYD)
              </div>
            )}
            
            {listing.deliveryMethods?.includes("shipping") && !isOwner && (
              <div className="mt-2 bg-indigo-50 border border-indigo-200 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-indigo-900 font-bold text-sm">
                    <span>📦</span> Shipping Available
                  </div>
                  {shippingCost === null && !isCalculating && (
                    <button onClick={handleCalculateShipping} className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-3 py-1.5 rounded-md shadow-sm">
                      Calculate Cost
                    </button>
                  )}
                </div>
                
                {isCalculating && <p className="text-xs text-indigo-600 mt-2 font-medium">Calculating distance via Google Maps...</p>}
                
                {shippingCost !== null && (
                  <div className="mt-3 pt-3 border-t border-indigo-200/50 flex justify-between items-center">
                    <span className="text-xs font-semibold text-indigo-700">Distance: {shippingDistance}</span>
                    <span className="text-sm font-black text-indigo-900">Est. Shipping: ${shippingCost.toLocaleString()} GYD</span>
                  </div>
                )}

                {calcError && <p className="text-xs text-red-600 mt-2 font-semibold">⚠️ {calcError}</p>}
              </div>
            )}
          </div>

          <div className="mt-8 pt-6 border-t border-slate-200 flex-1">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-3">Description</h3>
            <p className="text-slate-700 whitespace-pre-wrap leading-relaxed">{listing.description}</p>
          </div>

          <div className="mt-8 bg-slate-50 rounded-xl border border-slate-200 p-5">
            {!isOwner && listing.status === "active" && (
              <button onClick={() => onMessageSeller(listing)} className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold text-lg py-3.5 rounded-lg shadow-md transition-all">
                💬 Message Seller
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
