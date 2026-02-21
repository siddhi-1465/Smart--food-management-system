const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../config/db");
const { authenticate } = require("../middleware/auth");
const router = express.Router();

// REGISTER
router.post("/register", async (req, res) => {
  try {
    const { full_name, email, password, phone, role, organization, address, city, state, pincode } = req.body;
    if (!full_name || !email || !password || !role) {
      return res.status(400).json({ success: false, message: "Name, email, password, and role are required" });
    }
    const [exists] = await db.query("SELECT id FROM users WHERE email = ?", [email]);
    if (exists.length > 0) {
      return res.status(400).json({ success: false, message: "Email already registered" });
    }
    const password_hash = await bcrypt.hash(password, 10);
    const [result] = await db.query(
      `INSERT INTO users (full_name, email, password_hash, phone, role, organization, address, city, state, pincode)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [full_name, email, password_hash, phone || null, role, organization || null, address || null, city || null, state || null, pincode || null]
    );
    const token = jwt.sign({ id: result.insertId, email, role }, process.env.JWT_SECRET || "default_secret", { expiresIn: process.env.JWT_EXPIRES_IN || "7d" });
    res.status(201).json({ success: true, message: "Registration successful", data: { token, user: { id: result.insertId, full_name, email, role } } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// LOGIN
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: "Email and password are required" });
    }
    const [users] = await db.query("SELECT * FROM users WHERE email = ? AND is_active = TRUE", [email]);
    if (users.length === 0) {
      return res.status(401).json({ success: false, message: "Invalid email or password" });
    }
    const user = users[0];
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ success: false, message: "Invalid email or password" });
    }
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, process.env.JWT_SECRET || "default_secret", { expiresIn: process.env.JWT_EXPIRES_IN || "7d" });
    delete user.password_hash;
    res.json({ success: true, message: "Login successful", data: { token, user } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET PROFILE
router.get("/profile", authenticate, async (req, res) => {
  try {
    const [users] = await db.query(
      "SELECT id, full_name, email, phone, role, organization, address, city, state, pincode, is_verified, created_at FROM users WHERE id = ?",
      [req.user.id]
    );
    if (users.length === 0) return res.status(404).json({ success: false, message: "User not found" });
    res.json({ success: true, data: users[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// UPDATE PROFILE
router.put("/profile", authenticate, async (req, res) => {
  try {
    const { full_name, phone, organization, address, city, state, pincode } = req.body;
    await db.query(
      "UPDATE users SET full_name=?, phone=?, organization=?, address=?, city=?, state=?, pincode=? WHERE id=?",
      [full_name, phone, organization, address, city, state, pincode, req.user.id]
    );
    res.json({ success: true, message: "Profile updated" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
