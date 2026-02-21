-- =============================================
-- Smart Food Management System - Database Schema
-- Author: Siddhi Sahu
-- Tech: MySQL 8.0+
-- =============================================

CREATE DATABASE IF NOT EXISTS smart_food_db;
USE smart_food_db;

-- =============================================
-- USERS TABLE (donors, receivers, admins)
-- =============================================
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(120) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    role ENUM('donor', 'receiver', 'admin') NOT NULL DEFAULT 'donor',
    organization VARCHAR(200),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    pincode VARCHAR(10),
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    avatar_url VARCHAR(255),
    is_verified BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_role (role),
    INDEX idx_city (city)
);

-- =============================================
-- FOOD CATEGORIES
-- =============================================
CREATE TABLE IF NOT EXISTS food_categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(80) NOT NULL UNIQUE,
    icon VARCHAR(10),
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- FOOD DONATIONS (core table)
-- =============================================
CREATE TABLE IF NOT EXISTS donations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    donor_id INT NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    category_id INT,
    quantity INT NOT NULL,
    quantity_unit ENUM('kg', 'litres', 'packets', 'plates', 'boxes', 'items') DEFAULT 'kg',
    food_type ENUM('veg', 'non-veg', 'vegan') DEFAULT 'veg',
    expiry_time DATETIME NOT NULL,
    pickup_address TEXT NOT NULL,
    pickup_city VARCHAR(100),
    pickup_pincode VARCHAR(10),
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    image_url VARCHAR(255),
    status ENUM('available', 'reserved', 'picked_up', 'delivered', 'expired', 'cancelled') DEFAULT 'available',
    special_instructions TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (donor_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES food_categories(id) ON DELETE SET NULL,
    INDEX idx_status (status),
    INDEX idx_city (pickup_city),
    INDEX idx_expiry (expiry_time),
    INDEX idx_donor (donor_id)
);

-- =============================================
-- DONATION REQUESTS (receiver requests a donation)
-- =============================================
CREATE TABLE IF NOT EXISTS donation_requests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    donation_id INT NOT NULL,
    receiver_id INT NOT NULL,
    requested_quantity INT NOT NULL,
    message TEXT,
    status ENUM('pending', 'accepted', 'rejected', 'picked_up', 'delivered', 'cancelled') DEFAULT 'pending',
    pickup_scheduled_at DATETIME,
    picked_up_at DATETIME,
    delivered_at DATETIME,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (donation_id) REFERENCES donations(id) ON DELETE CASCADE,
    FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_status (status),
    INDEX idx_receiver (receiver_id),
    INDEX idx_donation (donation_id)
);

-- =============================================
-- NOTIFICATIONS
-- =============================================
CREATE TABLE IF NOT EXISTS notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    type ENUM('request', 'accepted', 'rejected', 'pickup', 'delivery', 'expiry', 'system') DEFAULT 'system',
    is_read BOOLEAN DEFAULT FALSE,
    reference_id INT,
    reference_type VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_read (user_id, is_read)
);

-- =============================================
-- RATINGS & FEEDBACK
-- =============================================
CREATE TABLE IF NOT EXISTS ratings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    donation_id INT NOT NULL,
    rated_by INT NOT NULL,
    rated_user INT NOT NULL,
    rating TINYINT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    review TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (donation_id) REFERENCES donations(id) ON DELETE CASCADE,
    FOREIGN KEY (rated_by) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (rated_user) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_rating (donation_id, rated_by)
);

-- =============================================
-- ACTIVITY LOG (audit trail)
-- =============================================
CREATE TABLE IF NOT EXISTS activity_log (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50),
    entity_id INT,
    details TEXT,
    ip_address VARCHAR(45),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_user (user_id),
    INDEX idx_action (action)
);

-- =============================================
-- SEED DATA
-- =============================================

-- Food Categories
INSERT INTO food_categories (name, icon, description) VALUES
('Cooked Meals', '🍛', 'Ready-to-eat cooked food items'),
('Raw Vegetables', '🥬', 'Fresh uncooked vegetables'),
('Fruits', '🍎', 'Fresh fruits'),
('Dairy Products', '🥛', 'Milk, curd, cheese, paneer etc.'),
('Bakery Items', '🍞', 'Bread, cakes, pastries, biscuits'),
('Grains & Pulses', '🌾', 'Rice, wheat, dal, cereals'),
('Beverages', '🥤', 'Juices, tea, coffee, water'),
('Packaged Food', '📦', 'Sealed packaged food items'),
('Sweets & Snacks', '🍪', 'Mithai, namkeen, chips'),
('Baby Food', '🍼', 'Infant formula, baby cereal');

-- Users (password hash = bcrypt of "password123")
INSERT INTO users (full_name, email, password_hash, phone, role, organization, address, city, state, pincode) VALUES
('Ananya Sharma', 'ananya@demo.com', '$2b$10$dummyhashfordemopurposeonly1234567890abcdef', '9876543210', 'donor', 'Sharma Caterers', '45 MG Road', 'Chennai', 'Tamil Nadu', '600001'),
('FoodBank Chennai', 'foodbank@demo.com', '$2b$10$dummyhashfordemopurposeonly1234567890abcdef', '9876543211', 'receiver', 'FoodBank Trust', '12 Anna Salai', 'Chennai', 'Tamil Nadu', '600002'),
('Rajesh Kumar', 'rajesh@demo.com', '$2b$10$dummyhashfordemopurposeonly1234567890abcdef', '9876543212', 'donor', 'Hotel Grand Palace', '78 T Nagar', 'Chennai', 'Tamil Nadu', '600017'),
('Hope Foundation', 'hope@demo.com', '$2b$10$dummyhashfordemopurposeonly1234567890abcdef', '9876543213', 'receiver', 'Hope NGO', '23 Adyar', 'Chennai', 'Tamil Nadu', '600020'),
('Priya Mehta', 'priya@demo.com', '$2b$10$dummyhashfordemopurposeonly1234567890abcdef', '9876543214', 'donor', 'Mehta Sweets', '56 Mylapore', 'Chennai', 'Tamil Nadu', '600004'),
('Admin User', 'admin@smartfood.com', '$2b$10$dummyhashfordemopurposeonly1234567890abcdef', '9876543200', 'admin', 'SmartFood Platform', 'HQ', 'Chennai', 'Tamil Nadu', '600001');

-- Donations
INSERT INTO donations (donor_id, title, description, category_id, quantity, quantity_unit, food_type, expiry_time, pickup_address, pickup_city, pickup_pincode, status) VALUES
(1, 'Wedding Surplus - Biryani & Curry', 'Fresh biryani and paneer curry from wedding event. Serves approximately 100 people.', 1, 50, 'kg', 'veg', DATE_ADD(NOW(), INTERVAL 8 HOUR), '45 MG Road, T Nagar', 'Chennai', '600001', 'available'),
(3, 'Hotel Buffet Leftovers', 'Variety of dishes from lunch buffet including rice, dal, sabzi, and naan.', 1, 30, 'kg', 'veg', DATE_ADD(NOW(), INTERVAL 6 HOUR), '78 T Nagar Main Road', 'Chennai', '600017', 'available'),
(5, 'Fresh Sweets - Diwali Stock', 'Assorted sweets - ladoo, barfi, gulab jamun. Freshly made today.', 9, 20, 'boxes', 'veg', DATE_ADD(NOW(), INTERVAL 48 HOUR), '56 Mylapore High Road', 'Chennai', '600004', 'available'),
(1, 'Fresh Fruit Basket', '10 baskets of mixed seasonal fruits - mangoes, bananas, apples.', 3, 10, 'boxes', 'vegan', DATE_ADD(NOW(), INTERVAL 72 HOUR), '45 MG Road, T Nagar', 'Chennai', '600001', 'available'),
(3, 'Bakery Items - Bread & Buns', 'Fresh bread loaves and burger buns baked this morning.', 5, 100, 'packets', 'veg', DATE_ADD(NOW(), INTERVAL 24 HOUR), '78 T Nagar Main Road', 'Chennai', '600017', 'reserved'),
(5, 'Rice & Dal Packets', 'Pre-packed rice and dal combo meals for 50 people.', 6, 50, 'packets', 'veg', DATE_ADD(NOW(), INTERVAL 12 HOUR), '56 Mylapore High Road', 'Chennai', '600004', 'available'),
(1, 'Morning Breakfast Surplus', 'Idli, dosa batter, sambar, and chutney from morning catering.', 1, 15, 'kg', 'veg', DATE_ADD(NOW(), INTERVAL 4 HOUR), '45 MG Road', 'Chennai', '600001', 'picked_up'),
(3, 'Packaged Biscuits', 'Sealed packets of cream and digestive biscuits.', 8, 200, 'packets', 'veg', DATE_ADD(NOW(), INTERVAL 180 DAY), '78 T Nagar', 'Chennai', '600017', 'available');

-- Donation Requests
INSERT INTO donation_requests (donation_id, receiver_id, requested_quantity, message, status) VALUES
(1, 2, 30, 'We can distribute to 60 families in our area. Please confirm pickup time.', 'accepted'),
(2, 4, 20, 'Our shelter home needs food for tonight dinner.', 'pending'),
(5, 2, 50, 'We have volunteers ready for pickup.', 'accepted'),
(3, 4, 10, 'Would love to distribute these to street children during Diwali.', 'pending'),
(7, 2, 15, 'Picked up and distributed successfully. Thank you!', 'delivered');

-- Notifications
INSERT INTO notifications (user_id, title, message, type, is_read) VALUES
(1, 'New Request Received', 'FoodBank Chennai has requested 30 kg of your Wedding Surplus donation.', 'request', FALSE),
(2, 'Request Accepted!', 'Ananya Sharma has accepted your request for Wedding Surplus Biryani.', 'accepted', TRUE),
(3, 'New Request Received', 'Hope Foundation requested 20 kg of Hotel Buffet Leftovers.', 'request', FALSE),
(4, 'Donation Available Nearby', 'Fresh Sweets available in Mylapore. Request now!', 'system', FALSE),
(1, 'Delivery Confirmed', 'Morning Breakfast Surplus has been successfully delivered.', 'delivery', TRUE);

-- Ratings
INSERT INTO ratings (donation_id, rated_by, rated_user, rating, review) VALUES
(7, 2, 1, 5, 'Excellent quality food, properly packed. Very grateful!'),
(7, 1, 2, 4, 'Punctual pickup, great coordination.');
