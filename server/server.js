// server/server.js
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const app = express();

app.use(
  cors({
    origin: true,
    credentials: true
  })
);

app.use(express.json({ limit: "15mb" }));

const JWT_SECRET = process.env.JWT_SECRET || "gogy_super_secret_dev_key_2026";

// ==========================================
// 1. MONGOOSE SCHEMAS & MODELS
// ==========================================

const userSchema = new mongoose.Schema(
  {
    accountType: { type: String, enum: ["personal", "business"], default: "personal" },
    name: { type: String, required: true }, 
    email: { type: String, lowercase: true }, 
    phone: { type: String },
    password: { type: String, required: true },
    location: { type: String, required: true, default: "Toronto, ON" }
  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);

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
    deliveryMethods: { type: [String], default: ["pickup"] },
    deliveryFee: { type: Number, default: 0 },
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
          location: "2033 Yonge Street, Toronto, ON",
          deliveryMethods: ["pickup", "delivery"],
          deliveryFee: 15,
          description: "Includes both tools, two 20V batteries, charger, and hard carrying case. Works like new.",
          images: ["https://images.unsplash.com/photo-1504148455328-c376907d081c?w=600&auto=format&fit=crop&q=80"],
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

// AUTH ROUTES
app.post("/api/auth/register", async (req, res) => {
  try {
    const { accountType, firstName, lastName, businessName, contactMethod, password, location } = req.body;
    
    const isEmail = contactMethod.includes("@");
    const email = isEmail ? contactMethod.toLowerCase() : undefined;
    const phone = !isEmail ? contactMethod : undefined;

    if (email) {
      const existingUser = await User.findOne({ email });
      if (existingUser) return res.status(400).json({ error: "This email is already registered." });
    }
    if (phone) {
      const existingUser = await User.findOne({ phone });
      if (existingUser) return res.status(400).json({ error: "This phone number is already registered." });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const displayName = accountType === "business" ? businessName : `${firstName} ${lastName}`;

    const newUser = await User.create({
      accountType,
      name: displayName,
      email,
      phone,
      password: hashedPassword,
      location: location || "Toronto, ON"
    });

    const token = jwt.sign({ id: newUser._id }, JWT_SECRET, { expiresIn: "7d" });

    res.status(201).json({
      token,
      user: { id: newUser._id, name: newUser.name, email: newUser.email, phone: newUser.phone, location: newUser.location }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const { contactMethod, password } = req.body;
    const isEmail = contactMethod.includes("@");

    const query = isEmail ? { email: contactMethod.toLowerCase() } : { phone: contactMethod };
    const user = await User.findOne(query);
    
    if (!user) return res.status(400).json({ error: "Invalid login credentials." });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ error: "Invalid login credentials." });

    const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: "7d" });

    res.json({
      token,
      user: { id: user._id, name: user.name, email: user.email, phone: user.phone, location: user.location }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// LISTINGS
app.get("/api/listings", async (req, res) => {
  try {
    const listings = await Listing.find().sort({ createdAt: -1 });
    res.json(listings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/listings", async (req, res) => {
  try {
    const newListing = await Listing.create(req.body);
    res.status(201).json(newListing);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.patch("/api/listings/:id/status", async (req, res) => {
  try {
    const updated = await Listing.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.delete("/api/listings/:id", async (req, res) => {
  try {
    await Listing.findByIdAndDelete(req.params.id);
    res.json({ deleted: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// CONVERSATIONS
app.get("/api/conversations", async (req, res) => {
  try {
    const convs = await Conversation.find().sort({ updatedAt: -1 });
    res.json(convs);
  } catch (err) {
    res.status(500).json({ error: "Failed to load conversations" });
  }
});

app.post("/api/conversations", async (req, res) => {
  try {
    const { listingId, listingTitle, buyerName, sellerName, initialMessage } = req.body;
    let conv = await Conversation.findOne({ listingId, buyerName });

    if (!conv) {
      conv = await Conversation.create({
        listingId, listingTitle, buyerName, sellerName,
        messages: [{
          sender: buyerName,
          text: initialMessage || `Hi ${sellerName}, is "${listingTitle}" still available?`,
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        }]
      });
    }
    res.status(201).json(conv);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post("/api/conversations/:id/messages", async (req, res) => {
  try {
    const { sender, text } = req.body;
    const conv = await Conversation.findById(req.params.id);
    if (!conv) return res.status(404).json({ error: "Conversation not found" });

    conv.messages.push({
      sender, text,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    });
    await conv.save();
    res.json(conv);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// SHIPPING QUOTE
app.post("/api/shipping-quote", async (req, res) => {
  try {
    const { origin, destination } = req.body;
    if (!process.env.GOOGLE_MAPS_API_KEY) return res.status(500).json({ error: "Google Maps API key missing." });

    const mapUrl = "https://routes.googleapis.com/distanceMatrix/v2:computeRouteMatrix";
    const requestBody = {
      origins: [{ waypoint: { address: origin } }],
      destinations: [{ waypoint: { address: destination } }],
      travelMode: "DRIVE"
    };

    const response = await fetch(mapUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": process.env.GOOGLE_MAPS_API_KEY,
        "X-Goog-FieldMask": "originIndex,destinationIndex,duration,distanceMeters,status,condition"
      },
      body: JSON.stringify(requestBody)
    });

    const data = await response.json();

    if (data.error) return res.status(400).json({ error: `Google API Error: ${data.error.message}` });
    
    if (Array.isArray(data) && data.length > 0) {
      if (data[0].distanceMeters != null) {
        const distanceKm = Math.ceil(data[0].distanceMeters / 1000); 
        return res.json({ success: true, distanceKm, shippingCost: distanceKm * 20, formattedDistance: `${distanceKm} km` });
      } else if (data[0].status && data[0].status.message) {
        return res.status(400).json({ error: `Google Maps: ${data[0].status.message}` });
      }
    }
    res.status(400).json({ error: `Raw Google Response: ${JSON.stringify(data)}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 4. DATABASE CONNECTION & SERVER START
// ==========================================
if (process.env.MONGO_URI) {
  mongoose
    .connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 8000 })
    .then(async () => {
      console.log("✅ Connected to MongoDB Atlas");
      
      await seedInitialData();

      try {
        await Listing.updateMany(
          { sellerName: "Sarah K." },
          { $set: { location: "1800 Sheppard Ave E, Toronto, ON" } }
        );
        await Listing.updateMany(
          { sellerName: "Marcus T." },
          { $set: { location: "290 Bremner Blvd, Toronto, ON" } }
        );
        await Listing.updateMany(
          { sellerName: "Errol D." },
          { $set: { location: "2033 Yonge Street, Toronto, ON" } }
        );
      } catch (updateErr) {
        console.error("Failed to update sample addresses:", updateErr);
      }

    })
    .catch((err) => console.error("❌ MongoDB connection error:", err.message));
}

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
