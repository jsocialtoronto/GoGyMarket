// server/server.js
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const app = express();

// Allow your live Vercel site and local development to communicate with Render
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://gogymarket.vercel.app",
      process.env.CLIENT_URL
    ].filter(Boolean),
    credentials: true
  })
);

// 15mb limit allows base64 listing photos to save directly in MongoDB
app.use(express.json({ limit: "15mb" }));

// ==========================================
// 1. MONGOOSE SCHEMAS & MODELS
// ==========================================

const listingSchema = new mongoose.Schema(
  {
    sellerId: { type: String, required: true, index: true },
    sellerName: { type: String, required: true },
    title: { type: String, required: true, trim: true },
    category: { type: String, required: true, index: true },
    subcategory: { type: String, required: true, index: true },
    pricingType: {
      type: String,
      enum: ["fixed", "hourly", "free", "contact_for_quote"],
      default: "fixed"
    },
    price: { type: Number, default: 0 },
    location: { type: String, required: true },
    description: { type: String, required: true },
    images: [{ type: String }],
    status: {
      type: String,
      enum: ["active", "pending", "sold"],
      default: "active",
      index: true
    }
  },
  { timestamps: true }
);

const Listing = mongoose.model("Listing", listingSchema);

const conversationSchema = new mongoose.Schema(
  {
    listingId: { type: String, required: true },
    listingTitle: { type: String, required: true },
    buyerName: { type: String, required: true },
    sellerName: { type: String, required: true },
    messages: [
      {
        sender: { type: String, required: true },
        text: { type: String, required: true },
        time: { type: String, required: true }
      }
    ]
  },
  { timestamps: true }
);

const Conversation = mongoose.model("Conversation", conversationSchema);

// ==========================================
// 2. INITIAL STARTER SEED DATA
// ==========================================
async function seedInitialData() {
  try {
    const count = await Listing.countDocuments();
    if (count === 0) {
      await Listing.insertMany([
        {
          sellerId: "usr_1",
          sellerName: "Errol D.",
          title: "DeWalt 20V Max Cordless Drill & Impact Driver Kit",
          category: "Home and Living",
          subcategory: "Tools",
          pricingType: "fixed",
          price: 165,
          location: "Midtown Toronto, ON",
          description:
            "Includes both tools, two 20V batteries, charger, and hard carrying case. Works like new.",
          images: [
            "https://images.unsplash.com/photo-1504148455328-c376907d081c?w=600&auto=format&fit=crop&q=80"
          ],
          status: "active"
        },
        {
          sellerId: "usr_2",
          sellerName: "Marcus T.",
          title: "Licensed Master Electrician - Panel Upgrades & Troubleshooting",
          category: "Services",
          subcategory: "Electricians",
          pricingType: "hourly",
          price: 90,
          location: "Toronto, ON",
          description:
            "ESA certified residential & commercial electrical work, pot lights, and EV charger installation.",
          images: [
            "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=600&auto=format&fit=crop&q=80"
          ],
          status: "active"
        },
        {
          sellerId: "usr_3",
          sellerName: "Sarah K.",
          title: "UPPAbaby Vista V2 Stroller + Bassinet",
          category: "Baby and Family",
          subcategory: "Strollers",
          pricingType: "fixed",
          price: 450,
          location: "North York, ON",
          description:
            "Gently used stroller in charcoal grey. Folds smoothly, includes rain shield.",
          images: [
            "https://images.unsplash.com/photo-1591088398332-8a7791972843?w=600&auto=format&fit=crop&q=80"
          ],
          status: "active"
        }
      ]);
      console.log("Seeded initial GoGyMarket listings into MongoDB");
    }
  } catch (err) {
    console.error("Seed error:", err.message);
  }
}

// ==========================================
// 3. API ROUTES
// ==========================================

// Health Check
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    service: "GoGyMarket API is running",
    dbConnected: mongoose.connection.readyState === 1
  });
});

// GET all listings (newest first)
app.get("/api/listings", async (req, res) => {
  try {
    const listings = await Listing.find().sort({ createdAt: -1 });
    res.json(listings);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch listings" });
  }
});

// POST create a new listing
app.post("/api/listings", async (req, res) => {
  try {
    const newListing = await Listing.create(req.body);
    res.status(201).json(newListing);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PATCH update listing status (Active / Pending / Sold)
app.patch("/api/listings/:id/status", async (req, res) => {
  try {
    const { status } = req.body;
    const updated = await Listing.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE a listing
app.delete("/api/listings/:id", async (req, res) => {
  try {
    await Listing.findByIdAndDelete(req.params.id);
    res.json({ deleted: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET all message conversations
app.get("/api/conversations", async (req, res) => {
  try {
    const convs = await Conversation.find().sort({ updatedAt: -1 });
    res.json(convs);
  } catch (err) {
    res.status(500).json({ error: "Failed to load conversations" });
  }
});

// POST start or open a conversation for a listing
app.post("/api/conversations", async (req, res) => {
  try {
    const { listingId, listingTitle, buyerName, sellerName, initialMessage } = req.body;
    let conv = await Conversation.findOne({ listingId, buyerName });

    if (!conv) {
      conv = await Conversation.create({
        listingId,
        listingTitle,
        buyerName,
        sellerName,
        messages: [
          {
            sender: buyerName,
            text: initialMessage || `Hi ${sellerName}, is "${listingTitle}" still available?`,
            time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
          }
        ]
      });
    }
    res.status(201).json(conv);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST send a reply inside a conversation
app.post("/api/conversations/:id/messages", async (req, res) => {
  try {
    const { sender, text } = req.body;
    const conv = await Conversation.findById(req.params.id);
    if (!conv) return res.status(404).json({ error: "Conversation not found" });

    conv.messages.push({
      sender,
      text,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    });
    await conv.save();
    res.json(conv);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ==========================================
// 4. DATABASE CONNECTION & SERVER START
// ==========================================
if (process.env.MONGO_URI) {
  mongoose
    .connect(process.env.MONGO_URI)
    .then(async () => {
      console.log("Connected to MongoDB Atlas (gogymarket)");
      await seedInitialData();
    })
    .catch((err) => console.error("MongoDB error:", err));
}

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
