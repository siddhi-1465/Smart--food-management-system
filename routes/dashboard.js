const express = require("express");
const db = require("../config/db");
const { authenticate } = require("../middleware/auth");
const router = express.Router();

// ========== DASHBOARD STATS ==========
router.get("/stats", async (req, res) => {
  try {
    const [totalDonations] = await db.query("SELECT COUNT(*) AS c FROM donations WHERE status != 'cancelled'");
    const [activeDonations] = await db.query("SELECT COUNT(*) AS c FROM donations WHERE status = 'available' AND expiry_time > NOW()");
    const [totalDelivered] = await db.query("SELECT COUNT(*) AS c FROM donations WHERE status = 'delivered'");
    const [totalDonors] = await db.query("SELECT COUNT(*) AS c FROM users WHERE role = 'donor' AND is_active = TRUE");
    const [totalReceivers] = await db.query("SELECT COUNT(*) AS c FROM users WHERE role = 'receiver' AND is_active = TRUE");
    const [totalRequests] = await db.query("SELECT COUNT(*) AS c FROM donation_requests");
    const [pendingRequests] = await db.query("SELECT COUNT(*) AS c FROM donation_requests WHERE status = 'pending'");
    const [foodSaved] = await db.query("SELECT COALESCE(SUM(quantity), 0) AS total FROM donations WHERE status = 'delivered'");
    const [avgRating] = await db.query("SELECT COALESCE(AVG(rating), 0) AS avg FROM ratings");

    // Recent activity
    const [recentDonations] = await db.query(
      `SELECT d.id, d.title, d.status, d.quantity, d.quantity_unit, d.created_at,
              u.full_name AS donor_name, fc.icon AS category_icon
       FROM donations d
       JOIN users u ON d.donor_id = u.id
       LEFT JOIN food_categories fc ON d.category_id = fc.id
       ORDER BY d.created_at DESC LIMIT 5`
    );

    // Category distribution
    const [categoryStats] = await db.query(
      `SELECT fc.name, fc.icon, COUNT(d.id) AS donation_count, COALESCE(SUM(d.quantity), 0) AS total_quantity
       FROM food_categories fc
       LEFT JOIN donations d ON fc.id = d.category_id AND d.status != 'cancelled'
       GROUP BY fc.id
       ORDER BY donation_count DESC`
    );

    res.json({
      success: true,
      data: {
        totalDonations: totalDonations[0].c,
        activeDonations: activeDonations[0].c,
        totalDelivered: totalDelivered[0].c,
        totalDonors: totalDonors[0].c,
        totalReceivers: totalReceivers[0].c,
        totalRequests: totalRequests[0].c,
        pendingRequests: pendingRequests[0].c,
        foodSaved: parseFloat(foodSaved[0].total),
        avgRating: parseFloat(avgRating[0].avg).toFixed(1),
        recentDonations,
        categoryStats,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ========== FOOD CATEGORIES ==========
router.get("/categories", async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT fc.*, COUNT(d.id) AS donation_count
       FROM food_categories fc
       LEFT JOIN donations d ON fc.id = d.category_id AND d.status = 'available' AND d.expiry_time > NOW()
       GROUP BY fc.id ORDER BY fc.name`
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ========== NOTIFICATIONS ==========
router.get("/notifications", authenticate, async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 20",
      [req.user.id]
    );
    const [unread] = await db.query(
      "SELECT COUNT(*) AS c FROM notifications WHERE user_id = ? AND is_read = FALSE",
      [req.user.id]
    );
    res.json({ success: true, data: { notifications: rows, unreadCount: unread[0].c } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Mark notification as read
router.put("/notifications/:id/read", authenticate, async (req, res) => {
  try {
    await db.query("UPDATE notifications SET is_read = TRUE WHERE id = ? AND user_id = ?", [req.params.id, req.user.id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Mark all as read
router.put("/notifications/read-all", authenticate, async (req, res) => {
  try {
    await db.query("UPDATE notifications SET is_read = TRUE WHERE user_id = ?", [req.user.id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ========== LEADERBOARD ==========
router.get("/leaderboard", async (req, res) => {
  try {
    const [donors] = await db.query(
      `SELECT u.id, u.full_name, u.organization, COUNT(d.id) AS donation_count,
              COALESCE(SUM(CASE WHEN d.status = 'delivered' THEN d.quantity ELSE 0 END), 0) AS total_donated,
              COALESCE((SELECT AVG(r.rating) FROM ratings r WHERE r.rated_user = u.id), 0) AS avg_rating
       FROM users u
       LEFT JOIN donations d ON u.id = d.donor_id AND d.status != 'cancelled'
       WHERE u.role = 'donor' AND u.is_active = TRUE
       GROUP BY u.id
       ORDER BY total_donated DESC
       LIMIT 10`
    );
    res.json({ success: true, data: donors });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
