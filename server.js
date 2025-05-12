  const express = require("express");
  const mongoose = require("mongoose");
  const dotenv = require("dotenv");
  const cors = require("cors");

  dotenv.config();
  const app = express();

  // ✅ CORS for both frontend and admin panel
  const corsOptions = {
    origin: [
      'https://locoshop-frontend.netlify.app',
      'https://locoshop-admin.netlify.app'
    ],
    methods: ['GET', 'POST', 'DELETE', 'PUT'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  };

  app.use(cors(corsOptions));
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // ✅ Health check route
  app.get("/", (req, res) => {
    res.send("LocoShop backend is live");
  });

  // ✅ API Routes
  const storeRoutes = require("./routes/storeRoutes");
  app.use("/api/stores", storeRoutes);

  // ✅ MongoDB
  mongoose
    .connect(process.env.MONGO_URI)
    .then(() => {
      console.log("MongoDB connected");

      const PORT = process.env.PORT || 5000;
      app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
    })
    .catch((err) => console.log("MongoDB connection error:", err.message));
