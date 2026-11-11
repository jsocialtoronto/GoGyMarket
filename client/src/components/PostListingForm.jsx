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
    stockCount: 1,
    location: currentUser?.location || "Toronto, ON",
    description: "",
    imageStr: ""
  });
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");

    try {
      const payload = {
        sellerId: currentUser.id,
        sellerName: currentUser.name,
        title: formData.title.trim(),
        category: formData.category,
        subcategory: formData.subcategory,
        pricingType: formData.pricingType,
        price: Number(formData.price || 0),
        stockCount: Math.max(1, Number(formData.stockCount || 1)),
        location: formData.location.trim(),
        description: formData.description.trim(),
        images: formData.imageStr.split(",").map(s => s.trim()).filter(Boolean)
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
              <option value="hourly">Hourly Rate</option>
              <option value="free">Free Item</option>
            </select>
          </div>
          <div className="sm:col-span-2">
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
        </div>

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
          <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Image URLs (comma-separated)</label>
          <input 
            type="text" 
            value={formData.imageStr} 
            onChange={e => setFormData({...formData, imageStr: e.target.value})} 
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none" 
            placeholder="https://example.com/image1.jpg, https://..." 
          />
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
