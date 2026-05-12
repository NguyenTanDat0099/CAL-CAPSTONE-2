-- =====================================================
-- CalAI Database Schema
-- Database: calai
-- =====================================================

CREATE DATABASE IF NOT EXISTS calai;
USE calai;

-- =====================================================
-- Accounts (authentication)
-- =====================================================
CREATE TABLE IF NOT EXISTS accounts (
    account_id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255),
    email_verified TINYINT DEFAULT 0,
    status ENUM('active', 'inactive', 'suspended') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email (email)
);

-- =====================================================
-- Roles
-- =====================================================
CREATE TABLE IF NOT EXISTS roles (
    role_id INT AUTO_INCREMENT PRIMARY KEY,
    role_name VARCHAR(50) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT IGNORE INTO roles (role_name) VALUES ('user'), ('admin');

-- =====================================================
-- Account Roles (many-to-many)
-- =====================================================
CREATE TABLE IF NOT EXISTS accountroles (
    account_id INT NOT NULL,
    role_id INT NOT NULL,
    PRIMARY KEY (account_id, role_id),
    FOREIGN KEY (account_id) REFERENCES accounts(account_id) ON DELETE CASCADE,
    FOREIGN KEY (role_id) REFERENCES roles(role_id) ON DELETE CASCADE
);

-- =====================================================
-- Admin Audit Logs
-- =====================================================
CREATE TABLE IF NOT EXISTS adminauditlogs (
    log_id INT AUTO_INCREMENT PRIMARY KEY,
    admin_account_id INT NULL,
    action VARCHAR(100) NOT NULL,
    target_type VARCHAR(100) NOT NULL,
    target_id INT NULL,
    detail TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (admin_account_id) REFERENCES accounts(account_id) ON DELETE SET NULL,
    INDEX idx_adminauditlogs_admin (admin_account_id),
    INDEX idx_adminauditlogs_target (target_type, target_id),
    INDEX idx_adminauditlogs_created (created_at)
);

-- =====================================================
-- Users (profile information)
-- =====================================================
CREATE TABLE IF NOT EXISTS users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    account_id INT NOT NULL UNIQUE,
    full_name VARCHAR(255),
    gender ENUM('male', 'female', 'other') DEFAULT 'other',
    age INT,
    height DECIMAL(5,2),
    weight DECIMAL(5,2),
    has_completed_setup TINYINT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (account_id) REFERENCES accounts(account_id) ON DELETE CASCADE,
    INDEX idx_account (account_id)
);

-- =====================================================
-- Weight History
-- =====================================================
CREATE TABLE IF NOT EXISTS weight_history (
    weight_history_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    weight DECIMAL(5,2) NOT NULL,
    recorded_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    source VARCHAR(50) DEFAULT 'manual',
    note VARCHAR(255) NULL,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    INDEX idx_weight_history_user_date (user_id, recorded_at)
);

-- =====================================================
-- User Goals
-- =====================================================
CREATE TABLE IF NOT EXISTS usergoals (
    goal_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    target_calories INT,
    target_protein INT,
    target_carbs INT,
    target_fat INT,
    target_weight DECIMAL(5,2),
    goal_type ENUM('weight_loss', 'muscle_gain', 'maintenance', 'general') DEFAULT 'general',
    activity_level VARCHAR(50) DEFAULT 'moderate',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    INDEX idx_user (user_id)
);

-- =====================================================
-- Food Categories
-- =====================================================
CREATE TABLE IF NOT EXISTS foodcategories (
    category_id INT AUTO_INCREMENT PRIMARY KEY,
    category_name VARCHAR(255) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- Foods
-- =====================================================
CREATE TABLE IF NOT EXISTS foods (
    food_id INT AUTO_INCREMENT PRIMARY KEY,
    food_name VARCHAR(255) NOT NULL,
    category_id INT NULL,
    calories DECIMAL(10,2),
    protein DECIMAL(10,2),
    carbs DECIMAL(10,2),
    fat DECIMAL(10,2),
    fiber DECIMAL(10,2),
    sugar DECIMAL(10,2),
    sodium DECIMAL(10,2),
    serving_size VARCHAR(100),
    image_path VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES foodcategories(category_id) ON DELETE SET NULL,
    INDEX idx_food_category (category_id)
);

-- =====================================================
-- Meals
-- =====================================================
CREATE TABLE IF NOT EXISTS meals (
    meal_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    meal_type ENUM('breakfast', 'lunch', 'dinner', 'snack') NOT NULL,
    meal_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    INDEX idx_user_date (user_id, meal_date)
);

-- =====================================================
-- Meal Items
-- =====================================================
CREATE TABLE IF NOT EXISTS mealitems (
    mealitem_id INT AUTO_INCREMENT PRIMARY KEY,
    meal_id INT NOT NULL,
    food_id INT NOT NULL,
    quantity DECIMAL(10,2) DEFAULT 1.0,
    calories DECIMAL(10,2),
    protein DECIMAL(10,2),
    carbs DECIMAL(10,2),
    fat DECIMAL(10,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (meal_id) REFERENCES meals(meal_id) ON DELETE CASCADE,
    FOREIGN KEY (food_id) REFERENCES foods(food_id) ON DELETE CASCADE,
    INDEX idx_meal (meal_id)
);

-- =====================================================
-- Food Images
-- =====================================================
CREATE TABLE IF NOT EXISTS foodimages (
    image_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    image_url LONGTEXT NOT NULL,
    source ENUM('upload', 'camera') NOT NULL DEFAULT 'upload',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    INDEX idx_foodimages_user (user_id)
);

-- =====================================================
-- Food Recognition Results
-- =====================================================
CREATE TABLE IF NOT EXISTS foodrecognitionresults (
    result_id INT AUTO_INCREMENT PRIMARY KEY,
    image_id INT NOT NULL,
    food_id INT NOT NULL,
    portion_size DECIMAL(10,2) DEFAULT 1.0,
    confidence_score DECIMAL(5,2) DEFAULT 0.80,
    detected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (image_id) REFERENCES foodimages(image_id) ON DELETE CASCADE,
    FOREIGN KEY (food_id) REFERENCES foods(food_id) ON DELETE CASCADE,
    INDEX idx_foodresults_image (image_id),
    INDEX idx_foodresults_food (food_id)
);

-- =====================================================
-- Daily Nutrition Logs
-- =====================================================
CREATE TABLE IF NOT EXISTS dailynutritionlogs (
    log_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    date DATE NOT NULL,
    total_calories DECIMAL(10,2) DEFAULT 0,
    total_protein DECIMAL(10,2) DEFAULT 0,
    total_carbs DECIMAL(10,2) DEFAULT 0,
    total_fat DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    UNIQUE KEY uk_user_date (user_id, date),
    INDEX idx_user (user_id)
);

-- =====================================================
-- Chat Sessions
-- =====================================================
CREATE TABLE IF NOT EXISTS chatsessions (
    session_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    INDEX idx_user (user_id)
);

-- =====================================================
-- Chat Messages
-- =====================================================
CREATE TABLE IF NOT EXISTS chatmessages (
    message_id INT AUTO_INCREMENT PRIMARY KEY,
    session_id INT NOT NULL,
    sender ENUM('user', 'ai') NOT NULL,
    message_text TEXT,
    image_url LONGTEXT NULL,
    image_name VARCHAR(255) NULL,
    thinking_steps JSON DEFAULT NULL,
    food_insight JSON DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES chatsessions(session_id) ON DELETE CASCADE,
    INDEX idx_session (session_id)
);

-- =====================================================
-- Meal Schedules (multi-day plans saved by user, optionally shared to Discover)
-- =====================================================
CREATE TABLE IF NOT EXISTS mealschedules (
    schedule_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    color VARCHAR(20) DEFAULT '#FB923C',
    target_calories INT,
    source ENUM('manual','chat','shared') NOT NULL DEFAULT 'manual',
    is_published TINYINT NOT NULL DEFAULT 0,
    published_at TIMESTAMP NULL,
    achieved TINYINT NOT NULL DEFAULT 0,
    plan_payload JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    INDEX idx_mealschedules_user (user_id),
    INDEX idx_mealschedules_published (is_published)
);

-- =====================================================
-- Meal Schedule Items (individual meals inside a schedule)
-- =====================================================
CREATE TABLE IF NOT EXISTS mealscheduleitems (
    item_id INT AUTO_INCREMENT PRIMARY KEY,
    schedule_id INT NOT NULL,
    day_offset INT DEFAULT 0,
    meal_type ENUM('breakfast','lunch','dinner','snack') NOT NULL,
    name VARCHAR(255) NOT NULL,
    serving VARCHAR(100),
    calories DECIMAL(10,2),
    protein DECIMAL(10,2),
    carbs DECIMAL(10,2),
    fat DECIMAL(10,2),
    notes TEXT,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (schedule_id) REFERENCES mealschedules(schedule_id) ON DELETE CASCADE,
    INDEX idx_mealscheduleitems_schedule (schedule_id)
);

-- =====================================================
-- User Food Preferences (long-term memory)
-- Stores cross-session habits: dishes the user favors, avoids, is allergic to, etc.
-- Used to personalize chatbot recommendations.
-- =====================================================
CREATE TABLE IF NOT EXISTS userfoodpreferences (
    preference_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    food_name VARCHAR(255) NOT NULL,
    preference_type ENUM('favorite','avoided','disliked','allergy') NOT NULL DEFAULT 'favorite',
    meal_slot ENUM('breakfast','lunch','dinner','snack','beverage','any') DEFAULT 'any',
    note VARCHAR(500),
    weight DECIMAL(4,2) DEFAULT 1.00,
    source ENUM('user','inferred') DEFAULT 'user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    UNIQUE KEY uk_user_food_type (user_id, food_name, preference_type),
    INDEX idx_userfoodprefs_user (user_id),
    INDEX idx_userfoodprefs_type (user_id, preference_type)
);

-- =====================================================
-- Procedure to update daily nutrition logs
-- =====================================================
DROP PROCEDURE IF EXISTS update_daily_nutrition;

DELIMITER //
CREATE PROCEDURE update_daily_nutrition(IN p_user_id INT, IN p_date DATE)
BEGIN
    INSERT INTO dailynutritionlogs (user_id, date, total_calories, total_protein, total_carbs, total_fat)
    SELECT
        m.user_id,
        m.meal_date,
        COALESCE(SUM(mi.calories), 0),
        COALESCE(SUM(mi.protein), 0),
        COALESCE(SUM(mi.carbs), 0),
        COALESCE(SUM(mi.fat), 0)
    FROM meals m
    JOIN mealitems mi ON mi.meal_id = m.meal_id
    WHERE m.user_id = p_user_id AND m.meal_date = p_date
    GROUP BY m.user_id, m.meal_date
    ON DUPLICATE KEY UPDATE
        total_calories = VALUES(total_calories),
        total_protein = VALUES(total_protein),
        total_carbs = VALUES(total_carbs),
        total_fat = VALUES(total_fat);
END //
DELIMITER ;
