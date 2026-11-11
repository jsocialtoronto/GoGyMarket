// client/src/config/categoriesConfig.js

export const MARKETPLACE_CATEGORIES = {
  "Electronics": [
    "Phones & Tablets",
    "Computers & Laptops",
    "TVs & Audio",
    "Video Games & Consoles",
    "Other Electronics"
  ],
  "Vehicles": [
    "Cars & Trucks",
    "Motorcycles",
    "Bicycles",
    "Parts & Accessories"
  ],
  "Home & Garden": [
    "Furniture",
    "Appliances",
    "Tools & Home Improvement",
    "Garden & Outdoor"
  ],
  "Fashion & Accessories": [
    "Clothing",
    "Shoes",
    "Jewelry & Watches",
    "Bags & Luggage"
  ],
  "Hobbies & Leisure": [
    "Sports Equipment",
    "Toys & Games",
    "Books & Music",
    "Collectibles & Art"
  ],
  "Real Estate": [
    "Rentals",
    "For Sale",
    "Commercial"
  ],
  "Miscellaneous": [
    "Free Stuff",
    "Other"
  ]
};

export const LISTING_STATUSES = {
  active: { label: "Active", badgeClass: "bg-emerald-100 text-emerald-800 border-emerald-300" },
  pending: { label: "Pending", badgeClass: "bg-amber-100 text-amber-800 border-amber-300" },
  sold: { label: "Sold Out", badgeClass: "bg-red-100 text-red-800 border-red-300" }
};
