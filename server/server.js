// server/server.js
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

const app = express();

app.use(
  cors({
    origin: true,
    credentials: true
  })
);

app.use(express.json({ limit: "15mb" }));

const JWT_SECRET = process.env.JWT_SECRET || "gogy_super_secret_dev_key_2026";

function validateStrictPassword(pw) {
  if (!pw || pw.length < 10) return "Password must be at least 10 characters long.";
  if (!/[A-Z]/.test(pw)) return "Password must contain at least one capital letter.";
  if (!/[a-zA-Z]/.test(pw) || !/\d/.test(pw)) {
    return "Password must contain a mix of letters and numbers.";
  }
  return null;
}

// ==========================================
// 1. MONGOOSE SCHEMAS & MODELS
// ==========================================

const userSchema = new mongoose.Schema(
  {
    accountType: { type: String, enum: ["personal", "business"], default: "personal" },
    role: { type: String, enum: ["user", "admin", "viewer", "driver"], default: "user", index: true },
    name: { type: String, required: true },
    email: { type: String, lowercase: true },
    phone: { type: String },
    password: { type: String, required: true },
    location: { type: String, required: true, default: "Toronto, ON" },
    averageRating: { type: Number, default: 0 },
    ratingCount: { type: Number, default: 0 },
    // NEW: Permission toggle for posting listings
    canPostListings: { type: Boolean, default: true }
  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);

const listingSchema = new mongoose.Schema(
  {
    sellerId: { type: String, required: true, index: true },
    sellerName: { type: String, required: true },
    sellerRating: { type: Number, default: 0 },
    sellerRatingCount: { type: Number, default: 0 },
    title: { type: String, required: true, trim: true },
    category: { type: String, required: true, index: true },
    subcategory: { type: String, required: true, index: true },
    pricingType: {
      type: String,
      enum: ["fixed", "hourly", "free"],
      default: "fixed"
    },
    price: { type: Number, default: 0 },
    stockCount: { type: Number, required: true, default: 1, min: 0 },
    location: { type: String, required: true },
    isLocationMasked: { type: Boolean, default: true }, 
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
    isDeliveryChat: { type: Boolean, default: false },
    orderId: { type: String, default: null },
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

const orderSchema = new mongoose.Schema(
  {
    orderNumber: { type: String, required: true, unique: true },
    buyerId: { type: String, required: true, index: true },
    buyerName: { type: String, required: true },
    buyerContact: { type: String },
    paymentMethod: {
      type: String,
      enum: ["pickup", "cash", "etransfer", "credit"],
      required: true
    },
    paymentOptionLabel: { type: String, required: true },
    status: {
      type: String,
      enum: [
        "pending_payment", 
        "waiting_etransfer",
        "waiting_cash",
        "active",
        "pickup_pending",
        "cancelled"
      ],
      required: true,
      index: true
    },
    dispatchStatus: {
      type: String,
      enum: ["N/A", "pending", "active", "completed"],
      default: "N/A",
      index: true
    },
    driverId: { type: String, default: null },
    driverName: { type: String, default: null },
    items: [
      {
        listingId: { type: String, required: true },
        title: { type: String, required: true },
        sellerId: { type: String, index: true },
        sellerName: { type: String, required: true },
        sellerLocation: { type: String, default: "" },
        quantity: { type: Number, required: true, default: 1 },
        unitPrice: { type: Number, required: true, default: 0 },
        shippingCost: { type: Number, default: 0 },
        deliveryMethod: { type: String, default: "pickup" },
        buyerLocationType: { type: String, default: "address" },
        buyerAddress: { type: String, default: "" },
        buyerPin: { type: String, default: "" },
        specialInstructions: { type: String, default: "" },
        image: { type: String }
      }
    ],
    itemSubtotal: { type: Number, required: true, default: 0 },
    deliveryTotal: { type: Number, required: true, default: 0 },
    grandTotal: { type: Number, required: true, default: 0 },
    lockboxPhoto: { type: String, default: null },
    verifiedBy: { type: String, default: null },
    verifiedAt: { type: Date, default: null }
  },
  { timestamps: true }
);

const Order = mongoose.model("Order", orderSchema);

const ratingSchema = new mongoose.Schema(
  {
    orderId: { type: String, required: true, index: true },
    orderNumber: { type: String, required: true },
    listingId: { type: String, required: true },
    listingTitle: { type: String, required: true },
    raterId: { type: String, required: true, index: true },
    raterName: { type: String, required: true },
    targetUserId: { type: String, required: true, index: true },
    targetUserName: { type: String, required: true },
    stars: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, required: true, trim: true }
  },
  { timestamps: true }
);

const Rating = mongoose.model("Rating", ratingSchema);

// ==========================================
// 2. CLEANUP & MASTER ADMIN BOOTSTRAP
// ==========================================
async function initializeDatabase() {
  try {
    const masterEmail = "admin@gogymarket.com";
    const existingAdmin = await User.findOne({ email: masterEmail });
    if (!existingAdmin) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash("AdminPass123", salt);
      await User.create({
        accountType: "business",
        role: "admin",
        name: "GoGyMarket Master Admin",
        email: masterEmail,
        password: hashedPassword,
        location: "2033 Yonge Street, Toronto"
      });
      console.log("🛡️ Created Master Admin: admin@gogymarket.com");
    }
  } catch (err) {
    console.error("Initialization error:", err.message);
  }
}

async function verifyStaff(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized: Missing token" });
    }
    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user || !["admin", "viewer", "driver"].includes(user.role)) {
      return res.status(403).json({ error: "Forbidden: Staff/Driver access required" });
    }
    req.staffUser = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired session token" });
  }
}

function requireFullAdmin(req, res, next) {
  if (!req.staffUser || req.staffUser.role !== "admin") {
    return res.status(403).json({ error: "View-only account: Only full Administrators can make changes." });
  }
  next();
}

async function sendOrderNotification({ listingId, listingTitle, buyerName, sellerName, text }) {
  const formattedTime = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  let conv = await Conversation.findOne({ listingId, buyerName, isDeliveryChat: false });

  if (!conv) {
    conv = await Conversation.create({
      listingId,
      listingTitle,
      buyerName,
      sellerName,
      messages: [{ sender: "GoGyMarket Admin", text, time: formattedTime }]
    });
  } else {
    conv.messages.push({ sender: "GoGyMarket Admin", text, time: formattedTime });
    await conv.save();
  }
  return conv;
}

// ==========================================
// 3. API ROUTES
// ==========================================

app.get("/", (req, res) => res.send("GoGyMarket API is live."));

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", dbConnected: mongoose.connection.readyState === 1 });
});

app.post("/api/auth/register", async (req, res) => {
  try {
    const { accountType, firstName, lastName, businessName, contactMethod, password, location } = req.body;
    const pwError = validateStrictPassword(password);
    if (pwError) return res.status(400).json({ error: pwError });

    const isEmail = contactMethod.includes("@");
    const email = isEmail ? contactMethod.toLowerCase().trim() : undefined;
    const phone = !isEmail ? contactMethod.trim() : undefined;

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
      role: "user",
      name: displayName,
      email,
      phone,
      password: hashedPassword,
      location: location || "Toronto, ON",
      canPostListings: true
    });

    const token = jwt.sign({ id: newUser._id, role: newUser.role }, JWT_SECRET, { expiresIn: "7d" });

    res.status(201).json({
      token,
      user: {
        id: newUser._id, name: newUser.name, email: newUser.email, phone: newUser.phone, location: newUser.location, role: newUser.role, canPostListings: newUser.canPostListings
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const { contactMethod, password } = req.body;
    const isEmail = contactMethod.includes("@");
    const query = isEmail ? { email: contactMethod.toLowerCase().trim() } : { phone: contactMethod.trim() };
    const user = await User.findOne(query);

    if (!user) return res.status(400).json({ error: "Invalid login credentials." });
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ error: "Invalid login credentials." });

    const token = jwt.sign({ id: user._id, role: user.role || "user" }, JWT_SECRET, { expiresIn: "7d" });

    res.json({
      token,
      user: {
        id: user._id, name: user.name, email: user.email, phone: user.phone, location: user.location, role: user.role || "user", canPostListings: user.canPostListings !== false
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 4. ORDER, RATING, CHECKOUT & STRIPE ROUTES
// ==========================================

app.post("/api/orders", async (req, res) => {
  try {
    const {
      buyerId, buyerName, buyerContact, paymentMethod, paymentOptionLabel, items, itemSubtotal, deliveryTotal, grandTotal, lockboxPhoto
    } = req.body;

    if (!items || items.length === 0) return res.status(400).json({ error: "Cart cannot be empty." });

    let initialStatus = "active";
    if (paymentMethod === "etransfer") initialStatus = "waiting_etransfer";
    else if (paymentMethod === "cash") initialStatus = "waiting_cash";
    else if (paymentMethod === "pickup") initialStatus = "pickup_pending";
    else if (paymentMethod === "credit") initialStatus = "pending_payment";

    const orderNumber = "ORD-" + Math.floor(100000 + Math.random() * 900000);
    let requiresDriver = false;

    for (const item of items) {
      const qty = Math.max(1, Number(item.quantity || 1));
      if (item.deliveryMethod === "delivery") {
        requiresDriver = true;
        const listing = await Listing.findById(item.listingId || item._id);
        if (listing) {
          const currentStock = listing.stockCount != null ? listing.stockCount : 1;
          const newStock = Math.max(0, currentStock - qty);
          listing.stockCount = newStock;
          if (newStock === 0) listing.status = "sold";
          await listing.save();
        }
      }
    }

    const formattedItems = items.map((i) => ({
      listingId: i._id || i.listingId,
      title: i.title,
      sellerId: i.sellerId,
      sellerName: i.sellerName,
      sellerLocation: i.location || i.sellerLocation || "",
      quantity: Number(i.quantity || 1),
      unitPrice: Number(i.price || i.unitPrice || 0),
      shippingCost: Number(i.shippingCost || 0),
      deliveryMethod: i.deliveryMethod || "pickup",
      buyerLocationType: i.buyerLocationType || "address",
      buyerAddress: i.buyerAddress || "",
      buyerPin: i.buyerPin || "",
      specialInstructions: i.specialInstructions || "",
      image: i.images?.[0] || i.image || ""
    }));

    const newOrder = await Order.create({
      orderNumber, buyerId, buyerName, buyerContact, paymentMethod, paymentOptionLabel, status: initialStatus,
      dispatchStatus: requiresDriver ? "pending" : "N/A",
      items: formattedItems, itemSubtotal: Number(itemSubtotal || 0), deliveryTotal: Number(deliveryTotal || 0), grandTotal: Number(grandTotal || 0), lockboxPhoto: lockboxPhoto || null
    });

    for (const item of formattedItems) {
      const itemTotal = item.unitPrice * item.quantity;
      let msg = "";
      
      if (paymentMethod === "credit") {
        continue; 
      }

      if (paymentMethod === "pickup") {
        msg = `🧾 ORDER ${orderNumber} (Option 1: Local Pickup)\nItem: ${item.quantity}x ${item.title}\nItem Total: $${itemTotal.toLocaleString()} GYD\n\nBuyer ${buyerName} selected Local Pickup. Please coordinate pickup time and payment directly in this chat.`;
      } else if (paymentMethod === "etransfer") {
        msg = `⏳ ORDER ${orderNumber} PENDING ADMIN VERIFICATION (eTransfer to gogymarket.com)\nItem: ${item.quantity}x ${item.title}\nTotal Due: $${(itemTotal + item.shippingCost).toLocaleString()} GYD\n\nOnce GoGyMarket Admin verifies the eTransfer, the seller will be notified that the item is ready for pickup.`;
      } else if (paymentMethod === "cash") {
        msg = `⏳ ORDER ${orderNumber} PENDING ADMIN CASH CONFIRMATION (Lockbox Photo Uploaded)\nItem: ${item.quantity}x ${item.title}\nTotal Due: $${(itemTotal + item.shippingCost).toLocaleString()} GYD\n\nOnce GoGyMarket Admin confirms the cash lockbox photo, the seller will be notified that the item is ready for pickup.`;
      }

      if (msg) {
        await sendOrderNotification({
          listingId: item.listingId, listingTitle: item.title, buyerName, sellerName: item.sellerName, text: msg
        });
      }
    }

    res.status(201).json(newOrder);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post("/api/create-checkout-session", async (req, res) => {
  try {
    const { orderId, items, deliveryTotal, domain } = req.body;

    if (!process.env.STRIPE_SECRET_KEY) {
      return res.status(500).json({ error: "Stripe key is not configured on the server." });
    }

    const lineItems = items.map(item => ({
      price_data: {
        currency: 'cad', 
        product_data: { name: item.title },
        unit_amount: Math.round((item.price || item.unitPrice) * 100), 
      },
      quantity: item.quantity || 1,
    }));

    if (deliveryTotal > 0) {
      lineItems.push({
        price_data: {
          currency: 'cad',
          product_data: { name: "Delivery Fee" },
          unit_amount: Math.round(deliveryTotal * 100),
        },
        quantity: 1,
      });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      success_url: `${domain}?session_id={CHECKOUT_SESSION_ID}&order_id=${orderId}&payment_success=true`,
      cancel_url: `${domain}?payment_cancelled=true`,
    });

    res.json({ url: session.url });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/orders/confirm-stripe", async (req, res) => {
  try {
    const { sessionId, orderId } = req.body;
    
    if (!process.env.STRIPE_SECRET_KEY) {
       return res.status(500).json({ error: "Stripe key missing."});
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status === 'paid') {
      const order = await Order.findById(orderId);
      
      if (order && order.status === "pending_payment") {
        order.status = "active";
        await order.save();

        for (const item of order.items) {
          const itemTotal = item.unitPrice * item.quantity;
          const msg = `✅ ORDER ${order.orderNumber} ACTIVE & PAID (Credit Card)\nItem: ${item.quantity}x ${item.title}\nItem Total: $${itemTotal.toLocaleString()} GYD\nDelivery Fee: $${item.shippingCost.toLocaleString()} GYD\n\nPayment is complete! Seller ${item.sellerName}, please prepare this item for delivery pickup.`;
          
          await sendOrderNotification({
            listingId: item.listingId, listingTitle: item.title, buyerName: order.buyerName, sellerName: item.sellerName, text: msg
          });
        }
      }
      res.json({ success: true, order });
    } else {
      res.status(400).json({ error: "Stripe payment not completed" });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/orders/user/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const orders = await Order.find({
      $or: [{ buyerId: userId }, { "items.sellerId": userId }]
    }).sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/ratings", async (req, res) => {
  try {
    const ratings = await Rating.find().sort({ createdAt: -1 });
    res.json(ratings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/ratings", async (req, res) => {
  try {
    const { orderId, listingId, raterId, raterName, targetUserId, targetUserName, stars, comment } = req.body;

    if (!stars || stars < 1 || stars > 5) return res.status(400).json({ error: "Please select a star rating between 1 and 5." });
    if (!comment || !comment.trim()) return res.status(400).json({ error: "Please write a comment for your review." });

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ error: "Order not found." });

    if (order.status !== "active") {
      return res.status(400).json({ error: "Ratings can only be submitted after payment has been verified." });
    }

    if (String(order.buyerId) !== String(raterId)) {
      return res.status(400).json({ error: "Only the Buyer can leave a rating for this transaction." });
    }

    const existingRating = await Rating.findOne({ orderId, listingId, raterId });
    if (existingRating) return res.status(400).json({ error: "You have already rated the seller for this item." });

    const matchedItem = order.items.find((i) => String(i.listingId) === String(listingId)) || order.items[0];

    const newRating = await Rating.create({
      orderId, orderNumber: order.orderNumber, listingId, listingTitle: matchedItem ? matchedItem.title : "Marketplace Item",
      raterId, raterName, targetUserId, targetUserName, stars: Number(stars), comment: comment.trim()
    });

    const allTargetRatings = await Rating.find({ targetUserId });
    const totalStars = allTargetRatings.reduce((sum, r) => sum + r.stars, 0);
    const avg = Number((totalStars / allTargetRatings.length).toFixed(1));

    await User.findByIdAndUpdate(targetUserId, { averageRating: avg, ratingCount: allTargetRatings.length });
    await Listing.updateMany(
      { sellerId: targetUserId },
      { sellerRating: avg, sellerRatingCount: allTargetRatings.length }
    );

    res.status(201).json(newRating);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ==========================================
// 5. ADMINISTRATION PORTAL & ANALYTICS ROUTES
// ==========================================

app.get("/api/admin/stats", verifyStaff, async (req, res) => {
  try {
    const [listings, orders, ratings] = await Promise.all([
      Listing.find(),
      Order.find({ status: { $ne: "cancelled" } }),
      Rating.find()
    ]);

    const itemTitleCounts = {};
    const subcategoryCounts = {};
    listings.forEach((l) => {
      const titleKey = l.title.trim();
      itemTitleCounts[titleKey] = (itemTitleCounts[titleKey] || 0) + 1;
      const subKey = `${l.category} › ${l.subcategory}`;
      subcategoryCounts[subKey] = (subcategoryCounts[subKey] || 0) + 1;
    });

    const topPostedItems = Object.entries(itemTitleCounts).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 5);
    const topCategories = Object.entries(subcategoryCounts).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 5);

    const deliveryCounts = { pickup: 0, delivery: 0 };
    orders.forEach((o) => {
      o.items.forEach((item) => {
        if (item.deliveryMethod === "delivery") deliveryCounts.delivery += Number(item.quantity || 1);
        else deliveryCounts.pickup += Number(item.quantity || 1);
      });
    });

    const mostCommonDelivery = deliveryCounts.delivery > deliveryCounts.pickup ? "Delivery" : deliveryCounts.pickup > deliveryCounts.delivery ? "Local Pickup" : "Tied (Pickup & Delivery)";

    const paymentCounts = { cash: 0, etransfer: 0, credit: 0 };
    orders.forEach((o) => {
      if (paymentCounts[o.paymentMethod] != null) paymentCounts[o.paymentMethod] += 1;
    });

    const sortedPayments = Object.entries(paymentCounts).sort((a, b) => b[1] - a[1]);
    const paymentLabels = { cash: "Cash in Lockbox", etransfer: "eTransfer", credit: "Credit Card" };
    const mostPopularPayment = sortedPayments[0][1] > 0 ? paymentLabels[sortedPayments[0][0]] : "No Delivery Payments Yet";

    res.json({
      totalListings: listings.length, totalOrders: orders.length, totalRatings: ratings.length,
      topPostedItems, topCategories, deliveryCounts, mostCommonDelivery, paymentCounts, mostPopularPayment
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/admin/orders", verifyStaff, async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch("/api/admin/orders/:id/verify", verifyStaff, requireFullAdmin, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ error: "Order not found." });
    if (order.status !== "waiting_etransfer" && order.status !== "waiting_cash") return res.status(400).json({ error: "Only pending eTransfer or Cash orders require manual verification." });

    const previousType = order.status === "waiting_etransfer" ? "eTransfer" : "Cash Lockbox";
    order.status = "active";
    order.verifiedBy = req.staffUser.name;
    order.verifiedAt = new Date();
    await order.save();

    for (const item of order.items) {
      await sendOrderNotification({
        listingId: item.listingId, listingTitle: item.title, buyerName: order.buyerName, sellerName: item.sellerName,
        text: `✅ PAYMENT VERIFIED BY ADMIN (${previousType})\nOrder: ${order.orderNumber}\nItem: ${item.quantity}x ${item.title}\n\n🔔 Notification to Seller (${item.sellerName}): Payment has been verified by GoGyMarket Admin. Your item is now ACTIVE and ready for delivery pickup! The Buyer can now rate this transaction.`
      });
    }
    res.json(order);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.patch("/api/admin/orders/:id/cancel", verifyStaff, requireFullAdmin, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ error: "Order not found." });
    if (order.status === "cancelled") return res.status(400).json({ error: "Order is already cancelled." });

    for (const item of order.items) {
      if (item.deliveryMethod === "delivery") {
        const listing = await Listing.findById(item.listingId);
        if (listing) {
          listing.stockCount = (listing.stockCount || 0) + Number(item.quantity || 1);
          if (listing.stockCount > 0 && listing.status === "sold") listing.status = "active";
          await listing.save();
        }
      }
      await sendOrderNotification({
        listingId: item.listingId, listingTitle: item.title, buyerName: order.buyerName, sellerName: item.sellerName,
        text: `❌ ORDER CANCELLED BY ADMIN\nOrder: ${order.orderNumber}\nItem: ${item.quantity}x ${item.title}\n\nThis transaction has been cancelled by GoGyMarket Administration and any reserved stock has been returned to the listing.`
      });
    }

    order.status = "cancelled";
    if (order.dispatchStatus === "pending") order.dispatchStatus = "N/A";
    order.verifiedBy = req.staffUser.name;
    order.verifiedAt = new Date();
    await order.save();
    res.json(order);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.get("/api/admin/users", verifyStaff, async (req, res) => {
  try {
    const users = await User.find().select("-password").sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/admin/users", verifyStaff, requireFullAdmin, async (req, res) => {
  try {
    const { name, contactMethod, password, role, accountType, location } = req.body;
    if (!["user", "admin", "viewer", "driver"].includes(role)) return res.status(400).json({ error: "Role must be 'user', 'admin', 'viewer', or 'driver'." });
    const pwError = validateStrictPassword(password);
    if (pwError) return res.status(400).json({ error: pwError });
    const isEmail = contactMethod.includes("@");
    const email = isEmail ? contactMethod.toLowerCase().trim() : undefined;
    const phone = !isEmail ? contactMethod.trim() : undefined;
    if (email) {
      const exists = await User.findOne({ email });
      if (exists) return res.status(400).json({ error: "Email is already in use." });
    }
    if (phone) {
      const exists = await User.findOne({ phone });
      if (exists) return res.status(400).json({ error: "Phone number is already in use." });
    }
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const newAccount = await User.create({
      accountType: accountType || (role === "user" ? "personal" : "business"),
      role, name: name.trim(), email, phone, password: hashedPassword, location: location || "Toronto, ON"
    });
    res.status(201).json(newAccount);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.delete("/api/admin/users/:id", verifyStaff, requireFullAdmin, async (req, res) => {
  try {
    if (String(req.staffUser._id) === String(req.params.id)) return res.status(400).json({ error: "You cannot delete your own active Admin account." });
    const deletedUser = await User.findByIdAndDelete(req.params.id);
    if (!deletedUser) return res.status(404).json({ error: "User not found." });
    await Listing.deleteMany({ sellerId: String(req.params.id) });
    res.json({ deleted: true, id: req.params.id, name: deletedUser.name });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.patch("/api/admin/users/:id/reset-password", verifyStaff, requireFullAdmin, async (req, res) => {
  try {
    const { newPassword } = req.body;
    const pwError = validateStrictPassword(newPassword);
    if (pwError) return res.status(400).json({ error: pwError });
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    const updatedUser = await User.findByIdAndUpdate(req.params.id, { password: hashedPassword }, { new: true }).select("-password");
    if (!updatedUser) return res.status(404).json({ error: "User not found." });
    res.json({ message: `Password successfully reset for ${updatedUser.name}.` });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// NEW: Toggle Posting Privileges (Admin Only)
app.patch("/api/admin/users/:id/toggle-posting", verifyStaff, requireFullAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: "User not found." });
    
    // Default undefined to true, then flip it
    const currentStatus = user.canPostListings !== false;
    user.canPostListings = !currentStatus;
    
    await user.save();
    res.json({ 
      message: `User posting access set to ${user.canPostListings}.`, 
      canPostListings: user.canPostListings 
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ==========================================
// 6. DRIVER API ROUTES
// ==========================================

app.get("/api/driver/orders", verifyStaff, async (req, res) => {
  try {
    if (req.staffUser.role !== "driver" && req.staffUser.role !== "admin") {
      return res.status(403).json({ error: "Driver or Admin access required." });
    }
    const orders = await Order.find({
      dispatchStatus: { $in: ["pending", "active", "completed"] },
      status: { $ne: "cancelled" }
    }).sort({ createdAt: -1 });

    const filteredOrders = req.staffUser.role === "admin" 
      ? orders 
      : orders.filter(o => o.dispatchStatus === "pending" || String(o.driverId) === String(req.staffUser._id));

    res.json(filteredOrders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch("/api/driver/orders/:id/accept", verifyStaff, async (req, res) => {
  try {
    if (req.staffUser.role !== "driver") return res.status(403).json({ error: "Only drivers can accept delivery requests." });
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ error: "Order not found." });
    if (order.status === "cancelled") return res.status(400).json({ error: "Order has been cancelled." });
    if (order.dispatchStatus !== "pending") return res.status(400).json({ error: "This delivery is already active or completed." });

    order.dispatchStatus = "active";
    order.driverId = req.staffUser._id;
    order.driverName = req.staffUser.name;
    await order.save();

    const formattedTime = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    await Conversation.create({
      listingId: String(order._id),
      listingTitle: `Delivery: Order ${order.orderNumber}`,
      buyerName: order.buyerName,
      sellerName: req.staffUser.name, 
      isDeliveryChat: true,
      orderId: String(order._id),
      messages: [{ 
        sender: "GoGyMarket Dispatch", 
        text: `Driver ${req.staffUser.name} has accepted your delivery! You can message them directly in this thread.`, 
        time: formattedTime 
      }]
    });

    res.json(order);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.patch("/api/driver/orders/:id/complete", verifyStaff, async (req, res) => {
  try {
    if (req.staffUser.role !== "driver") return res.status(403).json({ error: "Only drivers can complete delivery requests." });
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ error: "Order not found." });
    if (String(order.driverId) !== String(req.staffUser._id)) {
      return res.status(403).json({ error: "You are not assigned to this delivery." });
    }
    if (order.dispatchStatus !== "active") return res.status(400).json({ error: "This delivery is not currently active." });

    order.dispatchStatus = "completed";
    await order.save();

    const formattedTime = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const deliveryConv = await Conversation.findOne({ orderId: String(order._id), isDeliveryChat: true });
    if (deliveryConv) {
      deliveryConv.messages.push({
        sender: "GoGyMarket Dispatch",
        text: `🏁 DELIVERY COMPLETED: ${req.staffUser.name} has marked this delivery as successfully dropped off!`,
        time: formattedTime
      });
      await deliveryConv.save();
    }

    for (const item of order.items) {
      await sendOrderNotification({
        listingId: item.listingId, listingTitle: item.title, buyerName: order.buyerName, sellerName: item.sellerName,
        text: `🚚 DELIVERY COMPLETED\nOrder: ${order.orderNumber}\nItem: ${item.quantity}x ${item.title}\n\nThe delivery driver (${order.driverName}) has marked this order as successfully delivered!`
      });
    }
    
    res.json(order);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ==========================================
// 7. LISTINGS, CONVERSATIONS & SHIPPING ROUTES
// ==========================================

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
    // SECURITY BLOCK: Check if the user is allowed to post
    const seller = await User.findById(req.body.sellerId);
    if (!seller) return res.status(404).json({ error: "Seller account not found." });
    if (seller.canPostListings === false) {
      return res.status(403).json({ error: "Your account has been restricted from posting new listings." });
    }

    const stock = req.body.stockCount != null ? Number(req.body.stockCount) : 1;
    const newListing = await Listing.create({
      ...req.body,
      stockCount: stock,
      status: stock > 0 ? "active" : "sold",
      sellerRating: seller.averageRating || 0,
      sellerRatingCount: seller.ratingCount || 0,
      isLocationMasked: req.body.isLocationMasked !== undefined ? req.body.isLocationMasked : true
    });
    res.status(201).json(newListing);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.put("/api/listings/:id", async (req, res) => {
  try {
    const { title, description, price, stockCount, isLocationMasked } = req.body;
    const stock = stockCount != null ? Number(stockCount) : 1;
    
    const updated = await Listing.findByIdAndUpdate(
      req.params.id,
      { 
        title, 
        description, 
        price: Number(price || 0),
        stockCount: stock,
        status: stock > 0 ? "active" : "sold",
        isLocationMasked: isLocationMasked !== undefined ? isLocationMasked : true
      },
      { new: true }
    );
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.patch("/api/listings/:id/deduct-stock", async (req, res) => {
  try {
    const quantityToDeduct = Math.max(1, Number(req.body.quantity || 1));
    const listing = await Listing.findById(req.params.id);
    if (!listing) return res.status(404).json({ error: "Listing not found" });
    const currentStock = listing.stockCount != null ? listing.stockCount : 1;
    const newStock = Math.max(0, currentStock - quantityToDeduct);
    listing.stockCount = newStock;
    if (newStock === 0) listing.status = "sold";
    await listing.save();
    res.json(listing);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.patch("/api/listings/:id/status", async (req, res) => {
  try {
    const updateData = { status: req.body.status };
    if (req.body.status === "sold") updateData.stockCount = 0;
    const updated = await Listing.findByIdAndUpdate(req.params.id, updateData, { new: true });
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
    let conv = await Conversation.findOne({ listingId, buyerName, isDeliveryChat: false });
    const formattedTime = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const msgText = initialMessage || `Hi ${sellerName}, is "${listingTitle}" still available?`;

    if (!conv) {
      conv = await Conversation.create({
        listingId, listingTitle, buyerName, sellerName, messages: [{ sender: buyerName, text: msgText, time: formattedTime }]
      });
    } else if (initialMessage) {
      conv.messages.push({ sender: buyerName, text: initialMessage, time: formattedTime });
      await conv.save();
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
    conv.messages.push({ sender, text, time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) });
    await conv.save();
    res.json(conv);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.delete("/api/conversations/:convId/messages/:msgId", async (req, res) => {
  try {
    const conv = await Conversation.findById(req.params.convId);
    if (!conv) return res.status(404).json({ error: "Conversation not found" });
    const initialLength = conv.messages.length;
    conv.messages = conv.messages.filter((m) => m._id.toString() !== req.params.msgId);
    if (conv.messages.length === initialLength) return res.status(404).json({ error: "Message not found or already deleted" });
    await conv.save();
    res.json(conv);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.delete("/api/conversations/:id", async (req, res) => {
  try {
    const deleted = await Conversation.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: "Conversation not found" });
    res.json({ deleted: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

async function formatWaypoint(inputStr) {
  if (!inputStr || typeof inputStr !== "string") return { address: "Toronto, ON" };

  let urlToTest = inputStr;
  
  if (inputStr.includes("maps.app.goo.gl") || inputStr.includes("goo.gl") || inputStr.includes("maps.google.com")) {
    try {
      const response = await fetch(inputStr, { 
        method: "GET", 
        redirect: "follow",
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" 
        }
      });
      urlToTest = response.url;
    } catch (e) {
      console.error("Failed to unwrap short URL:", e);
    }
  }

  const pinMatch = urlToTest.match(/3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
  if (pinMatch) return { location: { latLng: { latitude: parseFloat(pinMatch[1]), longitude: parseFloat(pinMatch[2]) } } };
  
  const atMatch = urlToTest.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (atMatch) return { location: { latLng: { latitude: parseFloat(atMatch[1]), longitude: parseFloat(atMatch[2]) } } };

  const qMatch = urlToTest.match(/q=(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (qMatch) return { location: { latLng: { latitude: parseFloat(qMatch[1]), longitude: parseFloat(qMatch[2]) } } };

  const rawMatch = urlToTest.match(/^(-?\d+\.\d+),\s*(-?\d+\.\d+)$/);
  if (rawMatch) return { location: { latLng: { latitude: parseFloat(rawMatch[1]), longitude: parseFloat(rawMatch[2]) } } };

  const placeMatch = urlToTest.match(/\/place\/([^\/]+)/);
  if (placeMatch) {
    let decoded = decodeURIComponent(placeMatch[1]).replace(/\+/g, " ");
    if (decoded.includes("@")) decoded = decoded.split("@")[0];
    return { address: decoded };
  }

  return { address: inputStr };
}

app.post("/api/shipping-quote", async (req, res) => {
  try {
    const { origin, destination } = req.body;
    if (!process.env.GOOGLE_MAPS_API_KEY) return res.status(500).json({ error: "Google Maps API key missing." });
    
    const mapUrl = "https://routes.googleapis.com/distanceMatrix/v2:computeRouteMatrix";
    const requestBody = { 
      origins: [{ waypoint: await formatWaypoint(origin) }], 
      destinations: [{ waypoint: await formatWaypoint(destination) }], 
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
    res.status(400).json({ error: "Could not calculate driving distance between these addresses/pins." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 8. DATABASE CONNECTION & SERVER START
// ==========================================
if (process.env.MONGO_URI) {
  mongoose
    .connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 8000 })
    .then(async () => {
      console.log("✅ Connected to MongoDB Atlas");
      await initializeDatabase();
    })
    .catch((err) => console.error("❌ MongoDB connection error:", err.message));
}

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
