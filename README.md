# CalAI - Nutrition Tracking System

##  Giới thiệu

CalAI là hệ thống giúp người dùng theo dõi dinh dưỡng và gợi ý chế độ ăn dựa trên thông tin cá nhân.

---

## Chức năng chính

*  Đăng ký / đăng nhập
*  Tính BMI, BMR, TDEE
*  Ghi lại bữa ăn hàng ngày
*  Theo dõi calories & dinh dưỡng
*  Gợi ý món ăn theo goal & diet
*  Nhận diện món ăn bằng AI

---

##  Database

Các bảng chính:

* users, accounts
* foods, foodcategories
* meals, mealitems
* nutrition_calculations, macro_targets
* diet_types, diet_food_rules

---

## Cài đặt

### 1. Import database

```bash
mysql -u root -p calai < schema.sql
```

### 2. Import dữ liệu mẫu

```bash
mysql -u root -p calai < seed.sql
```

---

## 🚀 Mục tiêu

* Cá nhân hóa dinh dưỡng
* Hỗ trợ người dùng ăn uống khoa học

---


