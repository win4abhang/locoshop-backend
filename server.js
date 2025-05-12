const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const cors = require("cors");

dotenv.config();
const app = express();

// CORS configuration to allow only specific origin (your frontend)
const corsOptions = {
  origin: 'https://locoshop-admin.netlify.app', // Your frontend URL
  methods: 'GET,POST,DELETE,PUT', // Allow specific HTTP methods
  allowedHeaders: 'Content-Type,Authorization', // Allow specific headers
};

// Middleware
app.use(cors(corsOptions)); // Use CORS middleware with the options
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Routes
const storeRoutes = require("./routes/storeRoutes");
app.use("/api/stores", storeRoutes);

// MongoDB Connection
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  })
  .then(() => {
    console.log("MongoDB connected");

    // Start the server
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch((err) => console.log("MongoDB connection error:", err.message));
