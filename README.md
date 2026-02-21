# 🍽️ SharePlate — Smart Food Management System

A full-stack web application that connects **food donors** (restaurants, caterers, individuals) with **food receivers** (NGOs, shelters, communities) to reduce food waste through an automated, real-time donation and request workflow.

**Author:** Siddhi Sahu  
**Tech Stack:** HTML/CSS/JS SPA · Node.js · Express.js · MySQL · JWT Authentication · REST APIs

---

## ✨ Features

### Core Features
| Feature | Description |
|---------|-------------|
| **JWT Authentication** | Secure register/login with role-based access (Donor, Receiver, Admin) |
| **Food Donation CRUD** | Donors list surplus food with category, quantity, expiry, location, food type |
| **Request Workflow** | Receivers browse → Request → Donors accept/reject → Pickup → Delivery confirmed |
| **Real-time Notifications** | In-app notifications for requests, approvals, pickups, and deliveries |
| **Dashboard Analytics** | Live stats — total donations, food saved, active listings, pending requests |
| **Expiry Countdown** | Visual countdown timers on expiring food donations |
| **Leaderboard** | Top donors ranked by total food donated and ratings |
| **Category Filtering** | 10 food categories with search, food type, and city filters |
| **Ratings & Reviews** | Post-delivery rating system for trust building |
| **Activity Audit Log** | Complete audit trail of all actions |

### Technical Highlights
- **MySQL Transactions** — Atomic request processing prevents race conditions
- **Role-Based Middleware** — JWT + role guards (donor/receiver/admin) on every route
- **Soft Deletes** — Donations cancelled, not deleted, preserving history
- **Connection Pooling** — Efficient MySQL pool with 15 concurrent connections
- **SPA Architecture** — Single-page frontend with dynamic routing
- **Responsive Design** — Mobile-first, works on all devices
- **Industry-Grade UI** — Custom design system with Playfair Display + DM Sans typography

---

## 📁 Project Structure

```
smart-food-management/
├── backend/
│   ├── config/
│   │   └── db.js                  # MySQL connection pool
│   ├── middleware/
│   │   └── auth.js                # JWT authentication & role authorization
│   ├── routes/
│   │   ├── auth.js                # Register, Login, Profile (4 endpoints)
│   │   ├── donations.js           # Donation CRUD + my-donations (6 endpoints)
│   │   ├── requests.js            # Request workflow + status updates (4 endpoints)
│   │   └── dashboard.js           # Stats, categories, notifications, leaderboard (7 endpoints)
│   ├── server.js                  # Express entry point
│   ├── package.json
│   └── .env.example
├── frontend/
│   ├── css/
│   │   └── style.css              # 600+ lines of polished CSS
│   ├── js/
│   │   └── app.js                 # Complete SPA logic (auth, CRUD, workflows)
│   └── index.html                 # Full UI with 7 sections + 4 modals
├── database/
│   └── schema.sql                 # 7 tables + indexes + seed data
├── .gitignore
└── README.md
```

---

## 🚀 Setup & Installation

### Prerequisites
- [Node.js](https://nodejs.org/) v14+
- [MySQL](https://www.mysql.com/) v8.0+

### 1. Clone
```bash
git clone https://github.com/YOUR_USERNAME/smart-food-management.git
cd smart-food-management
```

### 2. Setup Database
```bash
mysql -u root -p
```
```sql
SOURCE database/schema.sql;
```

### 3. Configure Environment
```bash
cd backend
cp .env.example .env
# Edit .env with your MySQL password and a JWT secret
```

### 4. Install & Run
```bash
npm install
npm start
```

### 5. Open
```
http://localhost:5000
```

### Demo Accounts
| Role | Email | Password |
|------|-------|----------|
| Donor | ananya@demo.com | password123 |
| Receiver | foodbank@demo.com | password123 |
| Admin | admin@smartfood.com | password123 |

---

## 🔌 API Endpoints (21 total)

### Auth — `/api/auth`
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/register` | No | Create new account |
| `POST` | `/login` | No | Login and receive JWT |
| `GET` | `/profile` | Yes | Get current user profile |
| `PUT` | `/profile` | Yes | Update profile details |

### Donations — `/api/donations`
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/` | No | Browse all available donations (with filters) |
| `GET` | `/:id` | No | Get donation details + requests |
| `POST` | `/` | Donor | Create new donation |
| `PUT` | `/:id` | Donor | Update donation |
| `DELETE` | `/:id` | Donor | Cancel donation (soft delete) |
| `GET` | `/user/my-donations` | Donor | List my donations |

### Requests — `/api/requests`
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/` | Receiver | Request a donation |
| `PUT` | `/:id/status` | Yes | Accept / Reject / Pickup / Deliver |
| `GET` | `/my-requests` | Receiver | List my requests |
| `GET` | `/donation/:id` | Donor | View requests on a donation |

### Dashboard — `/api/dashboard`
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/stats` | No | Platform-wide statistics |
| `GET` | `/categories` | No | Food categories with counts |
| `GET` | `/notifications` | Yes | User notifications |
| `PUT` | `/notifications/:id/read` | Yes | Mark notification read |
| `PUT` | `/notifications/read-all` | Yes | Mark all read |
| `GET` | `/leaderboard` | No | Top donors ranking |

---

## 🗄️ Database Schema (7 Tables)

| Table | Purpose |
|-------|---------|
| `users` | Donors, Receivers, Admins with address, organization, verification |
| `food_categories` | 10 food categories (Cooked Meals, Fruits, Dairy, Bakery, etc.) |
| `donations` | Core table — food listings with quantity, expiry, location, status |
| `donation_requests` | Request workflow — pending → accepted → picked_up → delivered |
| `notifications` | In-app notifications with type and read tracking |
| `ratings` | Post-delivery ratings and reviews |
| `activity_log` | Full audit trail of all platform actions |

---

## 📊 App Sections

1. **Auth** — Login / Register with role selection (Donor or Receiver)
2. **Dashboard** — 6 stat cards + recent donations table + category distribution chart
3. **Browse Food** — Card grid of available donations with category/type/search filters
4. **My Donations** (Donor) — Table of created donations + view/manage requests
5. **My Requests** (Receiver) — Track status of all requested donations
6. **Notifications** — Real-time updates on request status changes
7. **Leaderboard** — Top donors ranked by food saved

---

## 🔄 Donation Workflow

```
Donor creates listing
        ↓
Donation appears in Browse (status: available)
        ↓
Receiver sends request → Donor gets notification
        ↓
Donor accepts request → Status: reserved → Receiver notified
        ↓
Receiver picks up food → Status: picked_up
        ↓
Delivery confirmed → Status: delivered → Both can rate
```

---

## 🛠️ Built With

| Layer | Technology |
|-------|-----------|
| Frontend | HTML5, CSS3, Vanilla JavaScript, Font Awesome |
| Backend | Node.js, Express.js |
| Database | MySQL 8.0 with mysql2/promise |
| Auth | JWT (jsonwebtoken) + bcryptjs |
| Architecture | REST API + Single Page Application |
| Design | Playfair Display + DM Sans fonts, custom CSS design system |

---

## 📄 License

MIT License — free to use, modify, and distribute.

---

## 🙏 Acknowledgments

Built as a social impact project to address the global food waste crisis. In India alone, approximately 40% of food produced is wasted while millions go hungry. **SharePlate** bridges this gap by creating a seamless digital platform connecting surplus food with those who need it most.
