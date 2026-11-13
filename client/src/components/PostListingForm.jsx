// client/src/components/PostListingForm.jsx
import React, { useState } from "react";
import { MARKETPLACE_CATEGORIES } from "../config/categoriesConfig";

const API_BASE = (import.meta.env.VITE_API_URL || "http://localhost:5000").replace(/\/$/, "");

export default function PostListingForm({ currentUser, initialCategory = "", initialSubcategory = "", onPublishSuccess }) {
  const [formData, setFormData] = useState({
    title: "",
    category: initialCategory || Object.keys(MARKETPLACE_CATEGORIES)[0],
    subcategory: initialSubcategory || MARKETPLACE_CATEGORIES[initialCategory || Object.keys(MARKETPLACE_CATEGORIES)[0]][0],
    pricingType: "fixed",
    price: "",
    condition: "New", // NEW
    stockCount: 1,
    location: currentUser?.location || "Toronto, ON",
    isLocationMasked: true,
    isOversized: false, 
    description: ""
  });
  
  const [images, setImages] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleCategoryChange = (e) => {
    const newCat = e.target.value;
    setFormData({
      ...formData,
      category: newCat,
      subcategory: MARKETPLACE_CATEGORIES[newCat][0]
    });
  };

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    Promise.all(files.map(file => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (ev) => resolve(ev.target.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    })).then(base64Images => {
      setImages(prev => [...prev, ...base64Images].slice(0, 5));
      if (base64Images.length > 0) setError(""); 
    }).catch(err => {
      setError("Failed to read image file.");
    });
  };

  const removeImage = (indexToRemove) => {
    setImages(prev => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");

    if (!images || images.length === 0) {
      setError("At least 1 picture is required to post a listing.");
      setIsSubmitting(false);
      return;
    }

    try {
      const payload = {
        sellerId: currentUser.id,
        sellerName: currentUser.name,
        title: formData.title.trim(),
        category: formData.category,
        subcategory: formData.subcategory,
        pricingType: formData.pricingType,
        price: Number(formData.price || 0),
        condition: formData.condition, // Added payload mapping
        stockCount: Math.max(1, Number(formData.stockCount || 1)),
        location: formData.location.trim(),
        isLocationMasked: formData.isLocationMasked,
        isOversized: formData.isOversized, 
        description: formData.description.trim(),
        images: images 
      };

      const res = await fetch(`${API_BASE}/api/listings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to post listing");
      
      onPublishSuccess(data);
    } catch (err) {
      setError(err.message);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto bg-white p-6 rounded-xl border border-slate-200 shadow-sm animate-in fade-in zoom-in-95 duration-200">
      <h2 className="text-2xl font-bold text-slate-900 mb-6">Post a New Listing</h2>
      
      {error && <div className="mb-6 p-3 bg-red-50 border border-red-200 text-red-600 text-sm font-bold rounded-lg">⚠️ {error}</div>}
      
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Listing Title *</label>
          <input 
            type="text" 
            required 
            value={formData.title} 
            onChange={e => setFormData({...formData, title: e.target.value})} 
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none" 
            placeholder="e.g. Vintage Leather Jacket" 
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Category *</label>
            <select 
              value={formData.category} 
              onChange={handleCategoryChange} 
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-semibold bg-white focus:border-emerald-500 focus:outline-none"
            >
              {Object.keys(MARKETPLACE_CATEGORIES).map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Subcategory *</label>
            <select 
              value={formData.subcategory} 
              onChange={e => setFormData({...formData, subcategory: e.target.value})} 
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-semibold bg-white focus:border-emerald-500 focus:outline-none"
            >
              {MARKETPLACE_CATEGORIES[formData.category]?.map(sub => (
                <option key={sub} value={sub}>{sub}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Pricing Type *</label>
            <select 
              value={formData.pricingType} 
              onChange={e => setFormData({...formData, pricingType: e.target.value})} 
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-semibold bg-white focus:border-emerald-500 focus:outline-none"
            >
              <option value="fixed">Fixed Price</option>
              <option value="free">Free Item</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
              Price (GYD) {formData.pricingType !== "free" ? "*" : ""}
            </label>
            <input 
              type="number" 
              min="0" 
              required={formData.pricingType !== "free"} 
              disabled={formData.pricingType === "free"} 
              value={formData.pricingType === "free" ? 0 : formData.price} 
              onChange={e => setFormData({...formData, price: e.target.value})} 
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-semibold focus:border-emerald-500 focus:outline-none disabled:bg-slate-100 disabled:text-slate-400" 
              placeholder="0.00" 
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Condition *</label>
            <select 
              value={formData.condition} 
              onChange={e => setFormData({...formData, condition: e.target.value})} 
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-semibold bg-white focus:border-emerald-500 focus:outline-none"
            >
              <option value="New">New</option>
              <option value="Used - Good">Used - Good</option>
              <option value="Used - Fair">Used - Fair</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Quantity Available *</label>
              <input 
                type="number" 
                min="1" 
                required 
                value={formData.stockCount} 
                onChange={e => setFormData({...formData, stockCount: e.target.value})} 
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none" 
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Pickup Location (Origin) *</label>
              <input 
                type="text" 
                required 
                value={formData.location} 
                onChange={e => setFormData({...formData, location: e.target.value})} 
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none" 
                placeholder="City or Neighborhood" 
              />
            </div>
          </div>
          <label className="flex items-center gap-2 cursor-pointer bg-slate-50 border border-slate-200 p-3 rounded-lg w-fit">
            <input 
              type="checkbox" 
              checked={formData.isLocationMasked} 
              onChange={e => setFormData({...formData, isLocationMasked: e.target.checked})}
              className="w-4 h-4 text-emerald-600 focus:ring-emerald-500"
            />
            <span className="text-sm font-bold text-slate-700">Mask my exact address from public view</span>
          </label>
        </div>

        <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl space-y-3 mt-2">
          <p className="text-xs text-amber-900 font-semibold leading-relaxed">
            <span className="font-black">DELIVERY OVERSIZE CHARGE:</span> Items that can not fit in 15 inch x 10 inch x 10 inch container will be charged an extra delivery cost. Delivery cost is $20/km for first container (buyer pays) + $10/km for all additional containers (seller pays) required to ship your product.
          </p>
          <label className="flex items-start gap-3 cursor-pointer bg-white border border-amber-300 p-3 rounded-lg w-full transition-colors hover:bg-amber-50/50">
            <input 
              type="checkbox" 
              checked={formData.isOversized} 
              onChange={e => setFormData({...formData, isOversized: e.target.checked})}
              className="w-5 h-5 mt-0.5 text-amber-600 focus:ring-amber-500 rounded border-slate-300"
            />
            <div className="flex-1">
              <span className="text-sm font-bold text-slate-900">Oversized item</span>
              <p className="text-xs text-slate-600 mt-0.5 font-medium">ANY Product larger than 15 inch x 10 inch x 10 inch container</p>
              <p className="text-[10px] text-amber-700 mt-1 font-bold">To avoid seller paying over sized item cost click on this box to have the buyer pay for the additional delivery cost.</p>
            </div>
          </label>
        </div>

        <div>
          <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Description *</label>
          <textarea 
            rows="5" 
            required 
            value={formData.description} 
            onChange={e => setFormData({...formData, description: e.target.value})} 
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none" 
            placeholder="Provide details about the item's condition, features, etc."
          ></textarea>
        </div>

        <div>
          <label className="block text-xs font-bold uppercase text-slate-700 mb-2">Upload Photos *</label>
          
          <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-300 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors">
             <span className="text-2xl mb-2">📸</span>
             <span className="text-sm font-bold text-emerald-700">Tap to Take Photo or Browse Library</span>
             <span className="text-xs text-slate-500 mt-1">Up to 5 images (At least 1 required)</span>
             <input 
               type="file" 
               accept="image/*" 
               capture="environment"
               multiple
               onChange={handleImageUpload}
               className="hidden"
             />
          </label>
          
          {images.length > 0 && (
            <div className="flex flex-wrap gap-3 mt-4">
              {images.map((src, idx) => (
                <div key={idx} className="relative w-20 h-20 border border-slate-200 rounded-lg overflow-hidden">
                  <img src={src} alt="Upload preview" className="w-full h-full object-cover" />
                  <button 
                    type="button"
                    onClick={() => removeImage(idx)}
                    className="absolute top-1 right-1 bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold shadow-md hover:bg-red-500"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <button 
          type="submit" 
          disabled={isSubmitting} 
          className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-400 text-white font-bold text-sm py-3.5 rounded-lg shadow-md transition-colors mt-2"
        >
          {isSubmitting ? "Publishing..." : "Publish Listing to Marketplace"}
        </button>
      </form>
    </div>
  );
}
