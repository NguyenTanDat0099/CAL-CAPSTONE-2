-- =========================
-- ROLES
-- =========================
INSERT INTO roles (role_name) VALUES
('admin'),
('user');

-- =========================
-- ACCOUNTS
-- =========================
INSERT INTO accounts (email, password_hash) VALUES
('user1@gmail.com', '123456'),
('admin@gmail.com', 'admin123');

-- =========================
-- ACCOUNT ROLES
-- =========================
INSERT INTO account_roles VALUES
(1, 2),
(2, 1);

-- =========================
-- ACTIVITY LEVELS
-- =========================
INSERT INTO activity_levels (name, multiplier) VALUES
('sedentary', 1.2),
('light', 1.375),
('moderate', 1.55),
('active', 1.725),
('very_active', 1.9);

-- =========================
-- GOALS
-- =========================
INSERT INTO goals (name, calorie_adjustment) VALUES
('lose_weight', -500),
('maintain_weight', 0),
('gain_weight', 500);

-- =========================
-- DIET TYPES
-- =========================
INSERT INTO diet_types (name) VALUES
('classic'),
('pescatarian'),
('vegetarian'),
('vegan');

-- =========================
-- USERS
-- =========================
INSERT INTO users (
account_id, full_name, gender, date_of_birth,
height, weight, activity_level_id, goal_id, diet_type_id
) VALUES
(1, 'Nguyen Van A', 'male', '2000-01-01', 170, 70, 3, 1, 1),
(2, 'Tran Thi B', 'female', '1998-05-10', 160, 55, 2, 2, 4);

-- =========================
-- FOOD CATEGORIES
-- =========================
INSERT INTO foodcategories (category_name) VALUES
('Meat'),
('Vegetable'),
('Fruit'),
('Grain'),
('Dairy');

-- =========================
-- FOODS
-- =========================
INSERT INTO foods (name, category_id, calories, protein, carbs, fat) VALUES
('Chicken Breast', 1, 165, 31, 0, 3.6),
('Salmon', 1, 208, 20, 0, 13),
('Broccoli', 2, 55, 3.7, 11, 0.6),
('Apple', 3, 95, 0.5, 25, 0.3),
('Rice', 4, 130, 2.7, 28, 0.3),
('Milk', 5, 42, 3.4, 5, 1);

-- =========================
-- DIET FOOD RULES
-- =========================
INSERT INTO diet_food_rules (diet_type_id, food_id) VALUES
(1,1),(1,2),(1,3),(1,4),(1,5),(1,6), -- classic
(2,2),(2,3),(2,4),(2,5),(2,6),       -- pescatarian
(3,3),(3,4),(3,5),(3,6),             -- vegetarian
(4,3),(4,4),(4,5);                   -- vegan

-- =========================
-- NUTRITION CALCULATIONS
-- =========================
INSERT INTO nutrition_calculations (user_id, bmi, bmr, tdee) VALUES
(1, 24.2, 1600, 2400),
(2, 21.5, 1300, 1800);

-- =========================
-- MACRO TARGETS
-- =========================
INSERT INTO macro_targets (user_id, calories_target, protein_target, carbs_target, fat_target) VALUES
(1, 1900, 120, 200, 60),
(2, 1800, 90, 220, 50);

-- =========================
-- MEALS
-- =========================
INSERT INTO meals (user_id, meal_type) VALUES
(1, 'breakfast'),
(1, 'lunch'),
(2, 'dinner');

-- =========================
-- MEAL ITEMS
-- =========================
INSERT INTO mealitems (meal_id, food_id, quantity, calories, protein, carbs, fat) VALUES
(1, 5, 1, 130, 2.7, 28, 0.3),
(1, 4, 1, 95, 0.5, 25, 0.3),
(2, 1, 1, 165, 31, 0, 3.6);

-- =========================
-- DAILY LOGS
-- =========================
INSERT INTO daily_nutrition_logs (user_id, date, total_calories, total_protein, total_carbs, total_fat) VALUES
(1, CURDATE(), 500, 35, 53, 4),
(2, CURDATE(), 600, 40, 70, 10);

-- =========================
-- CHAT
-- =========================
INSERT INTO chatsessions (user_id) VALUES (1);

INSERT INTO chatmessages (session_id, sender, message_text) VALUES
(1, 'user', 'Hôm nay tôi nên ăn gì?'),
(1, 'bot', 'Bạn nên ăn nhiều protein hơn.');

-- =========================
-- NOTIFICATIONS
-- =========================
INSERT INTO notifications (user_id, title, message, type) VALUES
(1, 'Reminder', 'Bạn chưa đủ calories hôm nay', 'warning');

-- =========================
-- ACHIEVEMENTS
-- =========================
INSERT INTO userachievements (user_id, title, description, achieved_at) VALUES
(1, '7-Day Streak', 'Bạn đã ăn đúng chế độ 7 ngày liên tiếp', NOW());