const express = require("express");
const db = require("../config/db");
const { authenticate, authorize } = require("../middleware/auth");
const router = express.Router();

// CREATE request (receiver requests a donation)
router.post("/", authenticate, authorize("receiver", "admin"), async (req, res) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const { donation_id, requested_quantity, message } = req.body;
    if (!donation_id || !requested_quantity) {
      conn.release();
      return res.status(400).json({ success: false, message: "Donation ID and quantity required" });
    }

    // Check donation availability
    const [donation] = await conn.query("SELECT * FROM donations WHERE id = ? AND status = 'available'", [donation_id]);
    if (donation.length === 0) {
      conn.release();
      return res.status(400).json({ success: false, message: "Donation not available" });
    }

    // Check duplicate request
    const [dup] = await conn.query(
      "SELECT id FROM donation_requests WHERE donation_id = ? AND receiver_id = ? AND status NOT IN ('rejected','cancelled')",
      [donation_id, req.user.id]
    );
    if (dup.length > 0) {
      conn.release();
      return res.status(400).json({ success: false, message: "You already have an active request for this donation" });
    }

    const [result] = await conn.query(
      "INSERT INTO donation_requests (donation_id, receiver_id, requested_quantity, message) VALUES (?, ?, ?, ?)",
      [donation_id, req.user.id, requested_quantity, message || null]
    );

    // Notify donor
    await conn.query(
      "INSERT INTO notifications (user_id, title, message, type, reference_id, reference_type) VALUES (?, ?, ?, 'request', ?, 'donation_request')",
      [donation[0].donor_id, "New Request Received", `A receiver has requested ${requested_quantity} ${donation[0].quantity_unit} of "${donation[0].title}".`, result.insertId]
    );

    await conn.commit();
    res.status(201).json({ success: true, message: "Request submitted!", data: { id: result.insertId } });
  } catch (error) {
    await conn.rollback();
    res.status(500).json({ success: false, message: error.message });
  } finally {
    conn.release();
  }
});

// UPDATE request status (donor accepts/rejects, receiver marks pickup/delivery)
router.put("/:id/status", authenticate, async (req, res) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const { status } = req.body;
    const validStatuses = ["accepted", "rejected", "picked_up", "delivered", "cancelled"];
    if (!validStatuses.includes(status)) {
      conn.release();
      return res.status(400).json({ success: false, message: "Invalid status" });
    }

    const [request] = await conn.query(
      `SELECT dr.*, d.donor_id, d.title AS donation_title, d.status AS donation_status
       FROM donation_requests dr
       JOIN donations d ON dr.donation_id = d.id
       WHERE dr.id = ?`,
      [req.params.id]
    );
    if (request.length === 0) {
      conn.release();
      return res.status(404).json({ success: false, message: "Request not found" });
    }

    const r = request[0];
    let updateFields = "status = ?";
    const updateParams = [status];

    if (status === "picked_up") { updateFields += ", picked_up_at = NOW()"; }
    if (status === "delivered") { updateFields += ", delivered_at = NOW()"; }

    await conn.query(`UPDATE donation_requests SET ${updateFields} WHERE id = ?`, [...updateParams, req.params.id]);

    // Update donation status based on request
    if (status === "accepted") {
      await conn.query("UPDATE donations SET status = 'reserved' WHERE id = ?", [r.donation_id]);
    }
    if (status === "picked_up") {
      await conn.query("UPDATE donations SET status = 'picked_up' WHERE id = ?", [r.donation_id]);
    }
    if (status === "delivered") {
      await conn.query("UPDATE donations SET status = 'delivered' WHERE id = ?", [r.donation_id]);
    }

    // Send notification
    const notifyUserId = (status === "accepted" || status === "rejected") ? r.receiver_id : r.donor_id;
    const notifyTitle = status === "accepted" ? "Request Accepted!" : status === "rejected" ? "Request Declined" : status === "picked_up" ? "Food Picked Up" : "Delivery Confirmed";
    const notifyMsg = `"${r.donation_title}" — status updated to ${status}.`;
    await conn.query(
      "INSERT INTO notifications (user_id, title, message, type, reference_id, reference_type) VALUES (?, ?, ?, ?, ?, 'donation_request')",
      [notifyUserId, notifyTitle, notifyMsg, status === "accepted" ? "accepted" : status === "rejected" ? "rejected" : status === "picked_up" ? "pickup" : "delivery", req.params.id]
    );

    await conn.commit();
    res.json({ success: true, message: `Request ${status}` });
  } catch (error) {
    await conn.rollback();
    res.status(500).json({ success: false, message: error.message });
  } finally {
    conn.release();
  }
});

// GET my requests (for receiver)
router.get("/my-requests", authenticate, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT dr.*, d.title AS donation_title, d.quantity, d.quantity_unit, d.food_type,
              d.expiry_time, d.pickup_address, d.pickup_city, d.status AS donation_status,
              u.full_name AS donor_name, u.phone AS donor_phone, u.organization AS donor_org,
              fc.name AS category_name, fc.icon AS category_icon
       FROM donation_requests dr
       JOIN donations d ON dr.donation_id = d.id
       JOIN users u ON d.donor_id = u.id
       LEFT JOIN food_categories fc ON d.category_id = fc.id
       WHERE dr.receiver_id = ?
       ORDER BY dr.created_at DESC`,
      [req.user.id]
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET requests for a donation (for donor)
router.get("/donation/:donationId", authenticate, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT dr.*, u.full_name AS receiver_name, u.organization AS receiver_org, u.phone AS receiver_phone, u.email AS receiver_email
       FROM donation_requests dr
       JOIN users u ON dr.receiver_id = u.id
       WHERE dr.donation_id = ?
       ORDER BY dr.created_at DESC`,
      [req.params.donationId]
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
