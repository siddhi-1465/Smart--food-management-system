// =============================================
// SharePlate - Smart Food Management System
// Frontend Application Logic
// Author: Siddhi Sahu
// =============================================

const API = "/api";
let token = localStorage.getItem("token");
let currentUser = null;
let allCategories = [];

// ==================== INIT ====================
document.addEventListener("DOMContentLoaded", () => {
  if (token) { loadApp(); } else { showAuth(); }
});

// ==================== AUTH ====================
function showAuth() {
  document.getElementById("authPage").style.display = "flex";
  document.getElementById("appPage").style.display = "none";
}
function showLogin() {
  document.getElementById("loginForm").style.display = "block";
  document.getElementById("registerForm").style.display = "none";
  document.getElementById("authSubtitle").textContent = "Login to reduce food waste";
}
function showRegister() {
  document.getElementById("loginForm").style.display = "none";
  document.getElementById("registerForm").style.display = "block";
  document.getElementById("authSubtitle").textContent = "Create your account";
}

async function login() {
  const email = document.getElementById("loginEmail").value.trim();
  const password = document.getElementById("loginPassword").value;
  if (!email || !password) return toast("Enter email and password", "error");
  try {
    const res = await api("/auth/login", "POST", { email, password });
    token = res.data.token;
    localStorage.setItem("token", token);
    currentUser = res.data.user;
    toast("Welcome back, " + currentUser.full_name + "!", "success");
    loadApp();
  } catch (e) {}
}

async function register() {
  const data = {
    full_name: document.getElementById("regName").value.trim(),
    email: document.getElementById("regEmail").value.trim(),
    password: document.getElementById("regPassword").value,
    role: document.getElementById("regRole").value,
    phone: document.getElementById("regPhone").value.trim(),
    organization: document.getElementById("regOrg").value.trim(),
    city: document.getElementById("regCity").value.trim(),
    pincode: document.getElementById("regPincode").value.trim(),
  };
  if (!data.full_name || !data.email || !data.password) return toast("Fill in required fields", "error");
  try {
    const res = await api("/auth/register", "POST", data);
    token = res.data.token;
    localStorage.setItem("token", token);
    currentUser = res.data.user;
    toast("Account created! Welcome, " + currentUser.full_name, "success");
    loadApp();
  } catch (e) {}
}

function logout() {
  token = null; currentUser = null;
  localStorage.removeItem("token");
  showAuth();
}

// ==================== LOAD APP ====================
async function loadApp() {
  document.getElementById("authPage").style.display = "none";
  document.getElementById("appPage").style.display = "flex";
  try {
    const res = await api("/auth/profile");
    currentUser = res.data;
    document.getElementById("userName").textContent = currentUser.full_name;
    document.getElementById("userRole").textContent = currentUser.role;
    document.getElementById("userAvatar").textContent = currentUser.full_name.charAt(0).toUpperCase();

    // Show/hide role-specific nav
    document.querySelectorAll(".donor-only").forEach(el => el.style.display = currentUser.role === "donor" || currentUser.role === "admin" ? "flex" : "none");
    document.querySelectorAll(".receiver-only").forEach(el => el.style.display = currentUser.role === "receiver" || currentUser.role === "admin" ? "flex" : "none");

    await loadCategories();
    go("dashboard");
    loadNotifCount();
  } catch (e) { logout(); }
}

// ==================== NAVIGATION ====================
function go(section) {
  document.querySelectorAll(".section").forEach(s => s.classList.remove("active"));
  document.querySelectorAll(".nav-link").forEach(n => n.classList.remove("active"));
  const el = document.getElementById("section-" + section);
  if (el) el.classList.add("active");
  const nav = document.querySelector(`.nav-link[data-section="${section}"]`);
  if (nav) nav.classList.add("active");

  const titles = { dashboard: "Dashboard", browse: "Browse Food", "my-donations": "My Donations", "my-requests": "My Requests", notifications: "Notifications", leaderboard: "Leaderboard" };
  document.getElementById("pageTitle").textContent = titles[section] || "SharePlate";

  switch (section) {
    case "dashboard": loadDashboard(); break;
    case "browse": loadDonations(); break;
    case "my-donations": loadMyDonations(); break;
    case "my-requests": loadMyRequests(); break;
    case "notifications": loadNotifications(); break;
    case "leaderboard": loadLeaderboard(); break;
  }
}

// ==================== API ====================
async function api(endpoint, method = "GET", data = null) {
  const opts = { method, headers: { "Content-Type": "application/json" } };
  if (token) opts.headers.Authorization = "Bearer " + token;
  if (data) opts.body = JSON.stringify(data);
  const res = await fetch(API + endpoint, opts);
  const json = await res.json();
  if (!json.success) { toast(json.message, "error"); throw new Error(json.message); }
  return json;
}

// ==================== TOAST ====================
function toast(msg, type = "success") {
  const area = document.getElementById("toastArea");
  const t = document.createElement("div");
  t.className = "toast toast-" + type;
  const icon = type === "success" ? "check-circle" : type === "error" ? "times-circle" : "info-circle";
  t.innerHTML = `<i class="fas fa-${icon}"></i> ${msg}`;
  area.appendChild(t);
  setTimeout(() => t.remove(), 4000);
}

// ==================== CATEGORIES ====================
async function loadCategories() {
  const res = await api("/dashboard/categories");
  allCategories = res.data;
  ["filterCategory", "dCategory"].forEach(id => {
    const sel = document.getElementById(id);
    if (!sel) return;
    const first = sel.options[0] ? sel.options[0].outerHTML : "";
    sel.innerHTML = first;
    allCategories.forEach(c => sel.innerHTML += `<option value="${c.id}">${c.icon} ${c.name}</option>`);
  });
}

// ==================== DASHBOARD ====================
async function loadDashboard() {
  try {
    const res = await api("/dashboard/stats");
    const d = res.data;
    document.getElementById("statsRow").innerHTML = `
      <div class="stat-card"><div class="stat-icon orange"><i class="fas fa-utensils"></i></div><div><div class="stat-val">${d.totalDonations}</div><div class="stat-label">Total Donations</div></div></div>
      <div class="stat-card"><div class="stat-icon green"><i class="fas fa-clock"></i></div><div><div class="stat-val">${d.activeDonations}</div><div class="stat-label">Active Now</div></div></div>
      <div class="stat-card"><div class="stat-icon blue"><i class="fas fa-truck"></i></div><div><div class="stat-val">${d.totalDelivered}</div><div class="stat-label">Delivered</div></div></div>
      <div class="stat-card"><div class="stat-icon purple"><i class="fas fa-users"></i></div><div><div class="stat-val">${d.totalDonors + d.totalReceivers}</div><div class="stat-label">Community Members</div></div></div>
      <div class="stat-card"><div class="stat-icon amber"><i class="fas fa-inbox"></i></div><div><div class="stat-val">${d.pendingRequests}</div><div class="stat-label">Pending Requests</div></div></div>
      <div class="stat-card"><div class="stat-icon green"><i class="fas fa-leaf"></i></div><div><div class="stat-val">${d.foodSaved} kg</div><div class="stat-label">Food Saved</div></div></div>
    `;
    // Recent donations
    document.getElementById("recentBody").innerHTML = d.recentDonations.map(r => `<tr>
      <td>${r.category_icon || "🍽️"}</td><td><strong>${r.title}</strong></td>
      <td>${r.quantity} ${r.quantity_unit || ""}</td><td><span class="badge badge-${r.status}">${r.status}</span></td>
      <td>${new Date(r.created_at).toLocaleDateString("en-IN")}</td><td>${r.donor_name}</td>
    </tr>`).join("") || '<tr><td colspan="6"><div class="empty"><p>No donations yet</p></div></td></tr>';
    // Category chart
    document.getElementById("categoryChart").innerHTML = d.categoryStats.map(c => `
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px">
        <span style="font-size:20px">${c.icon}</span>
        <div style="flex:1">
          <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:4px"><span style="font-weight:600">${c.name}</span><span style="color:var(--text-muted)">${c.donation_count}</span></div>
          <div style="height:6px;background:var(--border-light);border-radius:3px;overflow:hidden"><div style="height:100%;background:var(--primary);border-radius:3px;width:${Math.min((c.donation_count / Math.max(...d.categoryStats.map(x => x.donation_count), 1)) * 100, 100)}%"></div></div>
        </div>
      </div>
    `).join("");
  } catch (e) {}
}

// ==================== BROWSE DONATIONS ====================
async function loadDonations() {
  try {
    const cat = document.getElementById("filterCategory").value;
    const type = document.getElementById("filterType").value;
    const search = document.getElementById("filterSearch").value;
    let q = "/donations?status=available";
    if (cat) q += "&category=" + cat;
    if (type) q += "&food_type=" + type;
    if (search) q += "&search=" + search;
    const res = await api(q);
    const grid = document.getElementById("donationsGrid");
    if (!res.data.length) { grid.innerHTML = '<div class="empty" style="grid-column:1/-1"><i class="fas fa-utensils"></i><h3>No donations available</h3><p>Check back later or donate food!</p></div>'; return; }
    grid.innerHTML = res.data.map(d => `
      <div class="donation-card">
        <div class="card-header">
          <h3>${d.title}</h3>
          <span class="card-cat">${d.category_icon || "🍽️"} ${d.category_name || "Other"}</span>
        </div>
        <div class="card-body">
          <div class="card-meta">
            <span class="meta-tag"><i class="fas fa-weight-hanging"></i> ${d.quantity} ${d.quantity_unit}</span>
            <span class="badge badge-${d.food_type}">${d.food_type}</span>
            <span class="expiry ${getExpiryClass(d.expiry_time)}"><i class="fas fa-clock"></i> ${getExpiryText(d.expiry_time)}</span>
          </div>
          <p class="card-desc">${d.description || "No description provided"}</p>
          <div class="card-meta"><span class="meta-tag"><i class="fas fa-map-marker-alt"></i> ${d.pickup_city || d.pickup_address}</span></div>
        </div>
        <div class="card-footer">
          <div class="card-donor"><div class="donor-avatar">${(d.donor_name || "D").charAt(0)}</div><span class="donor-name">${d.donor_name}</span></div>
          ${currentUser && currentUser.role === "receiver" ? `<button class="btn btn-primary btn-sm" onclick="openRequestModal(${d.id},'${d.title.replace(/'/g,"\\'")}',${d.quantity},'${d.quantity_unit}')"><i class="fas fa-hand-holding-heart"></i> Request</button>` : `<span class="badge badge-${d.status}">${d.status}</span>`}
        </div>
      </div>
    `).join("");
  } catch (e) {}
}

function handleGlobalSearch(e) { if (e.key === "Enter") { go("browse"); document.getElementById("filterSearch").value = document.getElementById("globalSearch").value; loadDonations(); } }

// ==================== MY DONATIONS (Donor) ====================
async function loadMyDonations() {
  try {
    const res = await api("/donations/user/my-donations");
    document.getElementById("myDonationsBody").innerHTML = res.data.map(d => `<tr>
      <td><strong>${d.title}</strong></td>
      <td>${d.category_icon || ""} ${d.category_name || "-"}</td>
      <td>${d.quantity} ${d.quantity_unit}</td>
      <td><span class="badge badge-${d.food_type}">${d.food_type}</span></td>
      <td class="expiry ${getExpiryClass(d.expiry_time)}">${getExpiryText(d.expiry_time)}</td>
      <td>${d.request_count || 0} <button class="btn btn-ghost btn-sm" onclick="viewRequests(${d.id})"><i class="fas fa-eye"></i></button></td>
      <td><span class="badge badge-${d.status}">${d.status}</span></td>
      <td><div class="act-btns">
        <button class="btn-edit" onclick="editDonation(${d.id})" title="Edit"><i class="fas fa-pen"></i></button>
        ${d.status === "available" ? `<button class="btn-reject" onclick="cancelDonation(${d.id})" title="Cancel"><i class="fas fa-times"></i></button>` : ""}
      </div></td>
    </tr>`).join("") || '<tr><td colspan="8"><div class="empty"><p>No donations yet. Start donating!</p></div></td></tr>';
  } catch (e) {}
}

// ==================== MY REQUESTS (Receiver) ====================
async function loadMyRequests() {
  try {
    const res = await api("/requests/my-requests");
    document.getElementById("myRequestsBody").innerHTML = res.data.map(r => `<tr>
      <td><strong>${r.donation_title}</strong><br><span style="font-size:12px;color:var(--text-muted)">${r.category_icon || ""} ${r.category_name || ""}</span></td>
      <td>${r.donor_name}<br><span style="font-size:12px;color:var(--text-muted)">${r.donor_org || ""}</span></td>
      <td>${r.requested_quantity} ${r.quantity_unit || ""}</td>
      <td><span class="badge badge-${r.status}">${r.status}</span></td>
      <td style="font-size:12px">${r.pickup_address || "-"}, ${r.pickup_city || ""}</td>
      <td style="font-size:12px">${new Date(r.created_at).toLocaleDateString("en-IN")}</td>
    </tr>`).join("") || '<tr><td colspan="6"><div class="empty"><p>No requests yet</p></div></td></tr>';
  } catch (e) {}
}

// ==================== DONATION MODAL ====================
function openDonationModal(donation = null) {
  document.getElementById("donationModalTitle").textContent = donation ? "Edit Donation" : "Donate Food";
  document.getElementById("donationId").value = donation ? donation.id : "";
  document.getElementById("dTitle").value = donation ? donation.title : "";
  document.getElementById("dDesc").value = donation ? donation.description || "" : "";
  document.getElementById("dCategory").value = donation ? donation.category_id || "" : "";
  document.getElementById("dFoodType").value = donation ? donation.food_type : "veg";
  document.getElementById("dQty").value = donation ? donation.quantity : "";
  document.getElementById("dUnit").value = donation ? donation.quantity_unit : "kg";
  document.getElementById("dAddress").value = donation ? donation.pickup_address : "";
  document.getElementById("dCity").value = donation ? donation.pickup_city || "" : "";
  document.getElementById("dPincode").value = donation ? donation.pickup_pincode || "" : "";
  document.getElementById("dInstructions").value = donation ? donation.special_instructions || "" : "";
  if (donation && donation.expiry_time) {
    document.getElementById("dExpiry").value = new Date(donation.expiry_time).toISOString().slice(0, 16);
  } else { document.getElementById("dExpiry").value = ""; }
  document.getElementById("donationModal").classList.add("active");
}
function closeDonationModal() { document.getElementById("donationModal").classList.remove("active"); }

async function saveDonation() {
  const id = document.getElementById("donationId").value;
  const data = {
    title: document.getElementById("dTitle").value.trim(),
    description: document.getElementById("dDesc").value.trim(),
    category_id: document.getElementById("dCategory").value || null,
    food_type: document.getElementById("dFoodType").value,
    quantity: parseInt(document.getElementById("dQty").value),
    quantity_unit: document.getElementById("dUnit").value,
    expiry_time: document.getElementById("dExpiry").value,
    pickup_address: document.getElementById("dAddress").value.trim(),
    pickup_city: document.getElementById("dCity").value.trim(),
    pickup_pincode: document.getElementById("dPincode").value.trim(),
    special_instructions: document.getElementById("dInstructions").value.trim(),
  };
  if (!data.title || !data.quantity || !data.expiry_time || !data.pickup_address) return toast("Fill in all required fields", "error");
  try {
    if (id) { await api("/donations/" + id, "PUT", { ...data, status: "available" }); toast("Donation updated!"); }
    else { await api("/donations", "POST", data); toast("Donation published! Thank you! 🎉"); }
    closeDonationModal(); loadMyDonations(); loadDonations();
  } catch (e) {}
}

async function editDonation(id) {
  try { const res = await api("/donations/" + id); openDonationModal(res.data); } catch (e) {}
}

async function cancelDonation(id) {
  if (!confirm("Cancel this donation?")) return;
  try { await api("/donations/" + id, "DELETE"); toast("Donation cancelled"); loadMyDonations(); } catch (e) {}
}

// ==================== REQUEST MODAL ====================
function openRequestModal(donationId, title, qty, unit) {
  document.getElementById("reqDonationId").value = donationId;
  document.getElementById("reqDonationInfo").innerHTML = `<strong>${title}</strong> — ${qty} ${unit} available`;
  document.getElementById("reqQty").value = "";
  document.getElementById("reqQty").max = qty;
  document.getElementById("reqMessage").value = "";
  document.getElementById("requestModal").classList.add("active");
}
function closeRequestModal() { document.getElementById("requestModal").classList.remove("active"); }

async function submitRequest() {
  const data = {
    donation_id: parseInt(document.getElementById("reqDonationId").value),
    requested_quantity: parseInt(document.getElementById("reqQty").value),
    message: document.getElementById("reqMessage").value.trim(),
  };
  if (!data.requested_quantity) return toast("Enter quantity", "error");
  try { await api("/requests", "POST", data); toast("Request sent! The donor will be notified 🙏"); closeRequestModal(); loadDonations(); } catch (e) {}
}

// ==================== VIEW REQUESTS (Donor views requests on their donation) ====================
async function viewRequests(donationId) {
  try {
    const res = await api("/requests/donation/" + donationId);
    const body = document.getElementById("viewRequestsBody");
    if (!res.data.length) { body.innerHTML = '<div class="empty"><p>No requests yet</p></div>'; }
    else {
      body.innerHTML = res.data.map(r => `
        <div style="padding:16px;border:1px solid var(--border-light);border-radius:var(--radius-sm);margin-bottom:12px">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
            <div><strong>${r.receiver_name}</strong> <span style="color:var(--text-muted);font-size:12px">${r.receiver_org || ""}</span></div>
            <span class="badge badge-${r.status}">${r.status}</span>
          </div>
          <p style="font-size:13px;color:var(--text-secondary);margin-bottom:8px">Requested: <strong>${r.requested_quantity}</strong> | ${r.message || "No message"}</p>
          <p style="font-size:12px;color:var(--text-muted);margin-bottom:10px">Phone: ${r.receiver_phone || "-"} | Email: ${r.receiver_email || "-"}</p>
          ${r.status === "pending" ? `<div class="act-btns">
            <button class="btn btn-success btn-sm" onclick="updateRequestStatus(${r.id},'accepted')"><i class="fas fa-check"></i> Accept</button>
            <button class="btn btn-danger btn-sm" onclick="updateRequestStatus(${r.id},'rejected')"><i class="fas fa-times"></i> Reject</button>
          </div>` : ""}
          ${r.status === "accepted" ? `<button class="btn btn-primary btn-sm" onclick="updateRequestStatus(${r.id},'picked_up')"><i class="fas fa-truck"></i> Mark Picked Up</button>` : ""}
          ${r.status === "picked_up" ? `<button class="btn btn-success btn-sm" onclick="updateRequestStatus(${r.id},'delivered')"><i class="fas fa-check-double"></i> Mark Delivered</button>` : ""}
        </div>
      `).join("");
    }
    document.getElementById("viewRequestsModal").classList.add("active");
  } catch (e) {}
}
function closeViewRequests() { document.getElementById("viewRequestsModal").classList.remove("active"); }

async function updateRequestStatus(reqId, status) {
  try { await api("/requests/" + reqId + "/status", "PUT", { status }); toast("Status updated to " + status); viewRequests(document.querySelector("#viewRequestsBody [onclick*=updateRequestStatus]")?.closest(".modal-body")?.dataset?.id || ""); closeViewRequests(); loadMyDonations(); } catch (e) {}
}

// ==================== NOTIFICATIONS ====================
async function loadNotifCount() {
  try {
    const res = await api("/dashboard/notifications");
    const count = res.data.unreadCount;
    const badge = document.getElementById("notifBadge");
    const dot = document.getElementById("notifDot");
    if (count > 0) { badge.textContent = count; badge.style.display = "inline"; dot.style.display = "block"; }
    else { badge.style.display = "none"; dot.style.display = "none"; }
  } catch (e) {}
}

async function loadNotifications() {
  try {
    const res = await api("/dashboard/notifications");
    const list = document.getElementById("notifList");
    if (!res.data.notifications.length) { list.innerHTML = '<div class="empty"><i class="fas fa-bell"></i><h3>No notifications</h3></div>'; return; }
    list.innerHTML = res.data.notifications.map(n => `
      <div style="padding:16px 20px;background:${n.is_read ? "var(--surface)" : "var(--primary-bg)"};border:1px solid var(--border-light);border-radius:var(--radius-sm);margin-bottom:10px;cursor:pointer;transition:all .2s" onclick="markNotifRead(${n.id},this)">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <strong style="font-size:14px">${n.title}</strong>
          <span style="font-size:11px;color:var(--text-muted)">${timeAgo(n.created_at)}</span>
        </div>
        <p style="font-size:13px;color:var(--text-secondary);margin-top:4px">${n.message}</p>
      </div>
    `).join("");
  } catch (e) {}
}

async function markNotifRead(id, el) {
  try { await api("/dashboard/notifications/" + id + "/read", "PUT"); if (el) el.style.background = "var(--surface)"; loadNotifCount(); } catch (e) {}
}
async function markAllRead() {
  try { await api("/dashboard/notifications/read-all", "PUT"); toast("All marked as read"); loadNotifications(); loadNotifCount(); } catch (e) {}
}

// ==================== LEADERBOARD ====================
async function loadLeaderboard() {
  try {
    const res = await api("/dashboard/leaderboard");
    document.getElementById("leaderboardList").innerHTML = res.data.map((d, i) => `
      <div class="leaderboard-item">
        <div class="lb-rank ${i === 0 ? "gold" : i === 1 ? "silver" : i === 2 ? "bronze" : "default"}">${i + 1}</div>
        <div class="lb-info"><h4>${d.full_name}</h4><p>${d.organization || "Individual"} · ${d.donation_count} donations · ⭐ ${parseFloat(d.avg_rating).toFixed(1)}</p></div>
        <div class="lb-stat"><div class="val">${d.total_donated}</div><div class="unit">kg saved</div></div>
      </div>
    `).join("") || '<div class="empty"><p>No donors yet</p></div>';
  } catch (e) {}
}

// ==================== UTILITY ====================
function getExpiryText(dt) {
  const diff = new Date(dt) - new Date();
  if (diff < 0) return "Expired";
  const hrs = Math.floor(diff / 3600000);
  if (hrs < 1) return Math.floor(diff / 60000) + "m left";
  if (hrs < 24) return hrs + "h left";
  return Math.floor(hrs / 24) + "d left";
}
function getExpiryClass(dt) {
  const hrs = (new Date(dt) - new Date()) / 3600000;
  if (hrs < 0) return "soon";
  if (hrs < 6) return "soon";
  if (hrs < 24) return "medium";
  return "ok";
}
function timeAgo(dt) {
  const diff = (new Date() - new Date(dt)) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return Math.floor(diff / 60) + "m ago";
  if (diff < 86400) return Math.floor(diff / 3600) + "h ago";
  return Math.floor(diff / 86400) + "d ago";
}
