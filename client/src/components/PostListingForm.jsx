// client/src/components/PostListingForm.jsx
import React, { useState, useEffect } from "react";
import { MARKETPLACE_CATEGORIES, PRICING_TYPES } from "../config/categoriesConfig";

const API_BASE = (import.meta.env.VITE_API_URL || "http://localhost:5000").replace(/\/$/, "");

export default function PostListingForm({
  currentUser,
  initialCategory = "",
  initialSubcategory = "",
  onPublishSuccess
}) {
  const categoryNames = Object.keys(MARKETPLACE_CATEGORIES);

  const [formData, setFormData] = useState({
    title: "",
    category: initialCategory,
    subcategory: initialSubcategory,
    pricingType: initialCategory === "Services" ? "hourly" : "fixed",
    price: "",
    stockCount: "1",
    location: currentUser?.location || "Toronto, ON",
    description: "",
    images: []
  });

  useEffect(() => {
    if (initialCategory) {
      setFormData((prev) => ({
        ...prev,
        category: initialCategory,
        subcategory: initialSubcategory || "",
        pricingType: initialCategory === "Services" ? "hourly" : "fixed"
      }));
    }
  }, [initialCategory, initialSubcategory]);

  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const availableSubcategories = formData.category
    ? MARKETPLACE_CATEGORIES[formData.category] || []
    : [];

  const isService = formData.category === "Services";

  const availablePricingTypes = PRICING_TYPES.filter((type) => {
    if (type.id === "hourly") return isService;
    return true;
  });

  const handleCategoryChange = (e) => {
    const selectedCategory = e.target.value;
    setError("");
    setFormData((prev) => ({
      ...prev,
      category: selectedCategory,
      subcategory: "",
      pricingType: selectedCategory === "Services" ? "hourly" : "fixed"
    }));
  };

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    files.slice(0, 4).forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData((prev) => ({
          ...prev,
          images: [...prev.images, reader.result].slice(0, 4)
        }));
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (indexToRemove) => {
    setFormData((prev) => ({
      ...prev,
      images: prev.images.filter((_, idx) => idx !== indexToRemove)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!formData.category || !formData.subcategory) {
      setError("Please select both a Main Category and a Subcategory in Step 1.");
      return;
    }

    if (!formData.title.trim() || !formData.description.trim()) {
      setError("Please enter a Title and Description in Step 2.");
      return;
    }

    if (
      (formData.pricingType === "fixed" || formData.pricingType === "hourly") &&
      (formData.price === "" || Number(formData.price) < 0)
    ) {
      setError("Please enter a valid amount in the Price box (or choose 'Free').");
      return;
    }

    const parsedStock = parseInt(formData.stockCount, 10);
    if (!isService && (isNaN(parsedStock) || parsedStock < 1)) {
      setError("Please enter a valid Stock Count (minimum 1).");
      return;
    }

    setIsSubmitting(true);

    const newListingPayload = {
      sellerId: currentUser.id,
      sellerName: currentUser.name,
      title: formData.title.trim(),
      category: formData.category,
      subcategory: formData.subcategory,
      pricingType: formData.pricingType,
      price:
        formData.pricingType === "free" || formData.pricingType === "contact_for_quote"
          ? 0
          : Number(formData.price),
      stockCount: isService ? 999 : parsedStock,
      location: formData.location.trim(),
      description: formData.description.trim(),
      images:
        formData.images.length > 0
          ? formData.images
          : [
              "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop&q=80"
            ],
      status: "active"
    };

    try {
      const res = await fetch(`${API_BASE}/api/listings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newListingPayload)
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Server responded with status ${res.status}`);
      }

      const savedListing = await res.json();
      setIsSubmitting(false);
      onPublishSuccess(savedListing);
    } catch (err) {
      setIsSubmitting(false);
      setError(`Publish failed: ${err.message}`);
    }
  };

  return (
    <div className="max-w-3xl mx-auto bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-10">
      <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold">Post a Listing on GoGyMarket</h2>
          <p className="text-xs text-slate-400">
            Complete the steps below and click Publish at the bottom
          </p>
        </div>
        {isService && (
          <span className="bg-indigo-500/20 border border-indigo-400 text-indigo-200 text-xs px-2.5 py-1 rounded-full font-medium">
            🛠️ Service Listing Mode
          </span>
        )}
      </div>

      <form onSubmit={handleSubmit} noValidate className="p-6 space-y-8">
        {/* STEP 1: CASCADING CATEGORY & SUBCATEGORY */}
        <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Step 1: Choose Category
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">
                Main Category *
              </label>
              <select
                value={formData.category}
                onChange={handleCategoryChange}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none"
              >
                <option value="">-- Select a Category --</option>
                {categoryNames.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">
                Subcategory *
              </label>
              <select
                value={formData.subcategory}
                onChange={(e) => {
                  setError("");
                  setFormData((prev) => ({ ...prev, subcategory: e.target.value }));
                }}
                disabled={!formData.category}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm disabled:bg-slate-100 disabled:text-slate-400 focus:border-emerald-500 focus:outline-none"
              >
                <option value="">
                  {formData.category
                    ? `-- Select ${formData.category} Subcategory --`
                    : "Select Main Category first"}
                </option>
                {availableSubcategories.map((sub) => (
                  <option key={sub} value={sub}>
                    {sub}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* STEP 2: LISTING TITLE & DESCRIPTION */}
        <div className="space-y-4 px-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Step 2: Item Details
          </h3>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">
              {isService ? "Service Headline *" : "Listing Title *"}
            </label>
            <input
              type="text"
              placeholder={
                isService
                  ? "e.g., Licensed Electrician - Panel Upgrades & EV Chargers"
                  : "e.g., Fresh Homemade Jamaican Patties"
              }
              value={formData.title}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, title: e.target.value }))
              }
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">
              {isService ? "Service Details & Availability *" : "Description *"}
            </label>
            <textarea
              rows={4}
              placeholder={
                isService
                  ? "Describe your experience, service area, minimum call-out fee, and availability..."
                  : "Include condition, specifications, and details buyers should know..."
              }
              value={formData.description}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, description: e.target.value }))
              }
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none"
            />
          </div>
        </div>

        {/* STEP 3: DYNAMIC PRICING, STOCK COUNT & LOCATION */}
        <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 space-y-5">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Step 3: Pricing, Stock & Origin Location
          </h3>

          <div className="flex flex-wrap gap-2">
            {availablePricingTypes.map((type) => (
              <label
                key={type.id}
                className={`cursor-pointer px-3 py-2 rounded-lg border text-xs sm:text-sm font-medium transition-all ${
                  formData.pricingType === type.id
                    ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                    : "bg-white text-slate-700 border-slate-300 hover:bg-slate-100"
                }`}
              >
                <input
                  type="radio"
                  name="pricingType"
                  value={type.id}
                  checked={formData.pricingType === type.id}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, pricingType: e.target.value }))
                  }
                  className="sr-only"
                />
                {type.label}
              </label>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {(formData.pricingType === "fixed" || formData.pricingType === "hourly") && (
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  {formData.pricingType === "hourly"
                    ? "Hourly Rate ($ GYD) *"
                    : "Price ($ GYD) *"}
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-400 font-semibold">$</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.price}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, price: e.target.value }))
                    }
                    className="w-full rounded-lg border border-slate-300 pl-7 pr-12 py-2.5 text-sm focus:border-emerald-500 focus:outline-none"
                  />
                  {formData.pricingType === "hourly" && (
                    <span className="absolute right-3 top-2.5 text-xs text-slate-500 font-medium">/ hr</span>
                  )}
                </div>
              </div>
            )}

            {!isService && (
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  Quantity / Stock Available *
                </label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  placeholder="e.g. 10"
                  value={formData.stockCount}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, stockCount: e.target.value }))
                  }
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none"
                />
              </div>
            )}

            <div className={isService ? "sm:col-span-2" : ""}>
              <label className="block text-sm font-semibold text-slate-700 mb-1">
                Item Location (Origin Address) *
              </label>
              <input
                type="text"
                placeholder="e.g. 2033 Yonge Street, Toronto"
                value={formData.location}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, location: e.target.value }))
                }
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* STEP 4: PHOTO PREVIEWS */}
        <div className="bg-slate-50 p-5 rounded-xl border border-slate-200">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
            Step 4: Photos (Optional - Up to 4)
          </label>
          <div className="flex flex-wrap gap-3 items-center">
            <label className="w-24 h-24 rounded-lg border-2 border-dashed border-slate-300 hover:border-emerald-500 flex flex-col items-center justify-center cursor-pointer bg-white text-slate-500 hover:text-emerald-600 transition-colors">
              <span className="text-xl">📷</span>
              <span className="text-[11px] font-semibold mt-1">Add Photo</span>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageUpload}
                className="hidden"
              />
            </label>

            {formData.images.map((imgUrl, idx) => (
              <div
                key={idx}
                className="relative w-24 h-24 rounded-lg overflow-hidden border border-slate-200 bg-white"
              >
                <img src={imgUrl} alt="Preview" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => removeImage(idx)}
                  className="absolute top-1 right-1 bg-slate-900/80 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center hover:bg-red-600 transition-colors"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-300 text-red-700 text-sm rounded-lg font-semibold flex items-center gap-2">
            <span>⚠️</span> {error}
          </div>
        )}

        <div className="pt-2 flex items-center justify-end gap-3">
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-400 text-white font-bold px-8 py-3.5 rounded-lg shadow-sm transition-all text-sm"
          >
            {isSubmitting ? "Saving to MongoDB..." : "Publish Listing to GoGyMarket"}
          </button>
        </div>
      </form>
    </div>
  );
}
