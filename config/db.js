const mysql = require("mysql2/promise");
require("dotenv").config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "smart_food_db",
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 15,
  queueLimit: 0,
  timezone: "+05:30",
});

pool
  .getConnection()
  .then((conn) => {
    console.log("✅ MySQL connected to smart_food_db");
    conn.release();
  })
  .catch((err) => console.error("❌ DB connection failed:", err.message));

module.exports = pool;
