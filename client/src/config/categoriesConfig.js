// src/config/categoriesConfig.js

export const MARKETPLACE_CATEGORIES = {
  "Electronics": [
    "Phones and accessories",
    "Computers",
    "Tablets",
    "Televisions",
    "Video games and accessories"
  ],
  "Home and Living": [
    "Furniture",
    "Appliances",
    "Kitchenware",
    "Home decor",
    "Tools",
    "Garden"
  ],
  "Fashion and Beauty": [
    "Men's Clothing and footwear",
    "Women's Clothing and footwear",
    "Handbags and luggage",
    "Jewellery and accessories",
    "Makeup and Cosmetics"
  ],
  "Food and Agriculture": [
    "Fresh produce - Fruit and Vegetables",
    "Herbs, Spices, ointment",
    "Meat, poultry, livestock",
    "Packaged food, farm supplies"
  ],
  "Baby and Family": [
    "Baby furniture",
    "Strollers",
    "Toys",
    "Boys clothing",
    "Girls clothing",
    "School supplies"
  ],
  "Services": [
    "Hair stylist",
    "Cook",
    "Babysitter",
    "Mechanics",
    "Electricians",
    "Contractors",
    "Cleaner"
  ]
};

export const PRICING_TYPES = [
  { id: "fixed", label: "Fixed Price ($)" },
  { id: "hourly", label: "Hourly Rate ($/hr)" },
  { id: "contact_for_quote", label: "Contact for Quote" },
  { id: "free", label: "Free" }
];

export const LISTING_STATUSES = {
  active: { label: "Active", badgeClass: "bg-emerald-100 text-emerald-800 border-emerald-300" },
  pending: { label: "Pending Pickup", badgeClass: "bg-amber-100 text-amber-800 border-amber-300" },
  sold: { label: "Sold", badgeClass: "bg-slate-200 text-slate-600 border-slate-300" }
};
