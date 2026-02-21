const express = require("express");
const db = require("../config/db");
const { authenticate, authorize } = require("../middleware/auth");
const router = express.Router();

// GET all available donations (public - with filters)
router.get("/", async (req, res) => {
  try {
    const { category, city, food_type, search, status } = req.query;
    let query = `
      SELECT d.*, u.full_name AS donor_name, u.organization AS donor_org, u.phone AS donor_phone,
             fc.name AS category_name, fc.icon AS category_icon,
             (SELECT COUNT(*) FROM donation_requests dr WHERE dr.donation_id = d.id AND dr.status != 'cancelled') AS request_count
      FROM donations d
      JOIN users u ON d.donor_id = u.id
      LEFT JOIN food_categories fc ON d.category_id = fc.id
      WHERE d.expiry_time > NOW()
    `;
    const params = [];

    if (status) { query += " AND d.status = ?"; params.push(status); }
    else { query += " AND d.status IN ('available', 'reserved')"; }
    if (category) { query += " AND d.category_id = ?"; params.push(category); }
    if (city) { query += " AND d.pickup_city LIKE ?"; params.push(`%${city}%`); }
    if (food_type) { query += " AND d.food_type = ?"; params.push(food_type); }
    if (search) { query += " AND (d.title LIKE ? OR d.description LIKE ?)"; params.push(`%${search}%`, `%${search}%`); }

    query += " ORDER BY d.created_at DESC";
    const [rows] = await db.query(query, params);
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET single donation
router.get("/:id", async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT d.*, u.full_name AS donor_name, u.organization AS donor_org, u.phone AS donor_phone,
              u.email AS donor_email, u.city AS donor_city,
              fc.name AS category_name, fc.icon AS category_icon
       FROM donations d
       JOIN users u ON d.donor_id = u.id
       LEFT JOIN food_categories fc ON d.category_id = fc.id
       WHERE d.id = ?`,
      [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ success: false, message: "Donation not found" });

    // Get requests for this donation
    const [requests] = await db.query(
      `SELECT dr.*, u.full_name AS receiver_name, u.organization AS receiver_org, u.phone AS receiver_phone
       FROM donation_requests dr
       JOIN users u ON dr.receiver_id = u.id
       WHERE dr.donation_id = ?
       ORDER BY dr.created_at DESC`,
      [req.params.id]
    );

    res.json({ success: true, data: { ...rows[0], requests } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// CREATE donation (donor only)
router.post("/", authenticate, authorize("donor", "admin"), async (req, res) => {
  try {
    const { title, description, category_id, quantity, quantity_unit, food_type, expiry_time, pickup_address, pickup_city, pickup_pincode, special_instructions } = req.body;
    if (!title || !quantity || !expiry_time || !pickup_address) {
      return res.status(400).json({ success: false, message: "Title, quantity, expiry time, and pickup address are required" });
    }
    const [result] = await db.query(
      `INSERT INTO donations (donor_id, title, description, category_id, quantity, quantity_unit, food_type, expiry_time, pickup_address, pickup_city, pickup_pincode, special_instructions)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [req.user.id, title, description, category_id || null, quantity, quantity_unit || "kg", food_type || "veg", expiry_time, pickup_address, pickup_city || null, pickup_pincode || null, special_instructions || null]
    );
    await db.query(
      "INSERT INTO activity_log (user_id, action, entity_type, entity_id, details) VALUES (?, 'CREATE_DONATION', 'donation', ?, ?)",
      [req.user.id, result.insertId, `Created donation: ${title}`]
    );
    res.status(201).json({ success: true, message: "Donation listed successfully!", data: { id: result.insertId } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// UPDATE donation
router.put("/:id", authenticate, async (req, res) => {
  try {
    const [existing] = await db.query("SELECT donor_id FROM donations WHERE id = ?", [req.params.id]);
    if (existing.length === 0) return res.status(404).json({ success: false, message: "Not found" });
    if (existing[0].donor_id !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Not authorized" });
    }
    const { title, description, category_id, quantity, quantity_unit, food_type, expiry_time, pickup_address, pickup_city, pickup_pincode, status, special_instructions } = req.body;
    await db.query(
      `UPDATE donations SET title=?, description=?, category_id=?, quantity=?, quantity_unit=?, food_type=?, expiry_time=?, pickup_address=?, pickup_city=?, pickup_pincode=?, status=?, special_instructions=? WHERE id=?`,
      [title, description, category_id, quantity, quantity_unit, food_type, expiry_time, pickup_address, pickup_city, pickup_pincode, status, special_instructions, req.params.id]
    );
    res.json({ success: true, message: "Donation updated" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE donation (soft - set cancelled)
router.delete("/:id", authenticate, async (req, res) => {
  try {
    const [existing] = await db.query("SELECT donor_id FROM donations WHERE id = ?", [req.params.id]);
    if (existing.length === 0) return res.status(404).json({ success: false, message: "Not found" });
    if (existing[0].donor_id !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Not authorized" });
    }
    await db.query("UPDATE donations SET status = 'cancelled' WHERE id = ?", [req.params.id]);
    res.json({ success: true, message: "Donation cancelled" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET my donations (for donor)
router.get("/user/my-donations", authenticate, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT d.*, fc.name AS category_name, fc.icon AS category_icon,
              (SELECT COUNT(*) FROM donation_requests dr WHERE dr.donation_id = d.id) AS request_count
       FROM donations d
       LEFT JOIN food_categories fc ON d.category_id = fc.id
       WHERE d.donor_id = ?
       ORDER BY d.created_at DESC`,
      [req.user.id]
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
