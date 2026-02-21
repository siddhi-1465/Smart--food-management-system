const express = require("express");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve frontend
app.use(express.static(path.join(__dirname, "..", "frontend")));

// API Routes
app.use("/api/auth", require("./routes/auth"));
app.use("/api/donations", require("./routes/donations"));
app.use("/api/requests", require("./routes/requests"));
app.use("/api/dashboard", require("./routes/dashboard"));

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "OK", message: "Smart Food Management System API running", timestamp: new Date().toISOString() });
});

// SPA fallback
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "frontend", "index.html"));
});

app.listen(PORT, () => {
  console.log(`\n🍽️  Smart Food Management System`);
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📡 API available at http://localhost:${PORT}/api\n`);
});
