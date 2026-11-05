// client/src/components/ListingDetail.jsx
import React, { useState, useEffect } from "react";
import { LISTING_STATUSES } from "../config/categoriesConfig";

export default function ListingDetail({
  listing,
  onClose,
  onMessageSeller,
  isFavourite,
  onToggleFavourite,
  formatPrice,
  currentUser
}) {
  // Always default the main gallery image to the first photo
  const [mainImageIndex, setMainImageIndex] = useState(0);

  // Reset the gallery back to image 0 if the user clicks a different listing
  useEffect(() => {
    setMainImageIndex(0);
  }, [listing._id]);

  const images = listing.images?.length > 0
    ? listing.images
    : ["https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop&q=80"];

  const statusMeta = LISTING_STATUSES[listing.status] || LISTING_STATUSES.active;
  const isOwner = listing.sellerId === currentUser.id;

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200">
      {/* Top Navigation Bar */}
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
        {/* LEFT COLUMN: Photo Gallery */}
        <div className="p-6 bg-slate-50/50 flex flex-col gap-4">
          {/* Main Hero Image */}
          <div className="w-full aspect-square bg-slate-100 rounded-xl overflow-hidden border border-slate-200 relative group">
            <img
              src={images[mainImageIndex]}
              alt={listing.title}
              className="w-full h-full object-contain bg-black/5"
            />
            {listing.status !== "active" && (
              <div className="absolute inset-0 bg-white/60 backdrop-blur-sm flex items-center justify-center">
                <span className={`px-4 py-2 rounded-lg border-2 font-black text-lg shadow-sm ${statusMeta.badgeClass}`}>
                  {statusMeta.label.toUpperCase()}
                </span>
              </div>
            )}
          </div>

          {/* Thumbnail Strip */}
          {images.length > 1 && (
            <div className="flex gap-3 overflow-x-auto pb-2">
              {images.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setMainImageIndex(idx)}
                  className={`relative w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden border-2 transition-all ${
                    mainImageIndex === idx
                      ? "border-emerald-500 shadow-md"
                      : "border-slate-200 hover:border-slate-400 opacity-70 hover:opacity-100"
                  }`}
                >
                  <img src={img} alt={`Thumbnail ${idx + 1}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: Details & Actions */}
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
            <button
              onClick={() => onToggleFavourite(listing._id)}
              className="flex-shrink-0 w-12 h-12 rounded-full border border-slate-200 flex items-center justify-center bg-slate-50 hover:bg-slate-100 transition-colors shadow-sm"
              title="Save to Favourites"
            >
              <span className="text-xl">{isFavourite ? "❤️" : "🤍"}</span>
            </button>
          </div>

          <div className="flex items-center gap-4 mt-4 text-sm font-medium text-slate-600">
            <span className="flex items-center gap-1">
              📍 {listing.location}
            </span>
            <span>•</span>
            <span>
              Posted {new Date(listing.createdAt).toLocaleDateString()}
            </span>
          </div>

          <div className="mt-8 pt-6 border-t border-slate-200 flex-1">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-3">
              Description
            </h3>
            <p className="text-slate-700 whitespace-pre-wrap leading-relaxed">
              {listing.description}
            </p>
          </div>

          {/* Seller Card & Call To Action */}
          <div className="mt-8 bg-slate-50 rounded-xl border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center">
                  {listing.sellerName?.charAt(0) || "U"}
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Seller</p>
                  <p className="font-bold text-slate-900">{listing.sellerName}</p>
                </div>
              </div>
            </div>

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
                onClick={() => onMessageSeller(listing)}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold text-lg py-3.5 rounded-lg shadow-md transition-all flex items-center justify-center gap-2"
              >
                <span>💬</span> Message Seller
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
