'use strict';

// CommonJS twin of backend/src/shared/foodCategory.ts so import + migration
// scripts produce the same meal-slot taxonomy as the running app.

const MEAL_SLOTS = ['Breakfast', 'Lunch', 'Dinner', 'Snack', 'Other'];

const BREAKFAST_KEYWORDS = /\b(milk|coffee|latte|cappuccino|espresso|mocha|tea|matcha|cocoa|hot chocolate|juice|smoothie|yogurt|yoghurt|oatmeal|oat|cereal|pancake|waffle|toast|bread|loaf|bagel|croissant|muffin|granola|porridge|congee|cháo|chao|xôi|xoi|bánh mì|banh mi|egg|omelet|omelette|frittata)\b/i;
const SNACK_KEYWORDS = /\b(cookie|cake|chip|crisps|candy|chocolate|donut|doughnut|pie|ice cream|sorbet|sherbet|gelato|cracker|popcorn|biscuit|brownie|gummy|jelly|mochi|wafer|brownies|pretzel|pudding|custard|tart|macaron|cupcake|nut|nuts|trail mix|fruit bar|granola bar|protein bar|protein shake|chè |che |kẹo|keo)\b/i;
const FRUIT_KEYWORDS = /\b(apple|banana|berry|berries|grape|orange|melon|watermelon|peach|pear|mango|cherry|kiwi|pineapple|plum|apricot|raspberry|strawberry|blueberry|lemon|lime|raisin|date|fig|persimmon|guava|pomegranate|papaya|chuối|chuoi|táo|tao|nho|cam|xoài|xoai|dứa|dua|ổi|oi)\b/i;
const LUNCH_KEYWORDS = /\b(salad|sandwich|wrap|burrito|sub|panini|soup|stew|broth|noodle|noodles|pasta|spaghetti|fettuccine|ramen|udon|pho|phở|bún|bun|cơm tấm|com tam|bibimbap|gimbap|sushi roll|quinoa bowl|grain bowl|rice bowl|veggie bowl|buddha bowl|poke|salad bowl|gỏi|goi)\b/i;
const DINNER_KEYWORDS = /\b(beef|pork|chicken|lamb|veal|mutton|steak|wagyu|fillet|filet|sirloin|ribeye|brisket|rib|ribs|fish|salmon|tuna|cod|mackerel|trout|sardine|shrimp|prawn|crab|lobster|squid|octopus|mussel|clam|oyster|scallop|abalone|duck|goose|turkey|roast|grilled|stew|curry|stir.?fry|braised|baked|fried|smoked|tofu|tempeh|paneer|lasagna|risotto|paella|sushi platter|sashimi|teriyaki|barbecue|bbq|hot ?pot|lẩu|lau|kho |nướng|nuong|chiên|chien|hấp|hap|xào|xao)\b/i;
const VEGETABLE_KEYWORDS = /\b(salad|vegetable|veggie|kale|spinach|lettuce|cabbage|broccoli|cauliflower|asparagus|carrot|cucumber|tomato|squash|pumpkin|zucchini|eggplant|aubergine|pepper|capsicum|mushroom|onion|garlic|celery|leek|radish|turnip|beet|beetroot|sprout|bean sprout|okra|bok choy|kim chi|rau|cải|cai|bí|bi|cà|ca)\b/i;

const CATEGORY_FALLBACK = [
  [/breakfast/i, 'Breakfast'],
  [/lunch/i, 'Lunch'],
  [/dinner|supper/i, 'Dinner'],
  [/snack|dessert|sweet|candy|beverage|drink|packaged/i, 'Snack'],
  [/restaurant|main course|entrée|entree|meat|seafood|protein/i, 'Dinner'],
  [/raw|vegetable|fruit|salad|side dish|side/i, 'Lunch'],
  [/other|general|misc|uncategor/i, 'Other'],
];

function normalizeMealSlot(rawCategory, foodName) {
  const cleaned = String(rawCategory || '').trim();
  const exact = MEAL_SLOTS.find(
    slot => slot.toLowerCase() === cleaned.toLowerCase()
  );
  if (exact) return exact;

  const name = String(foodName || '').toLowerCase();
  if (name) {
    if (BREAKFAST_KEYWORDS.test(name)) return 'Breakfast';
    if (SNACK_KEYWORDS.test(name)) return 'Snack';
    if (FRUIT_KEYWORDS.test(name)) return 'Snack';
    if (DINNER_KEYWORDS.test(name)) return 'Dinner';
    if (LUNCH_KEYWORDS.test(name)) return 'Lunch';
    if (VEGETABLE_KEYWORDS.test(name)) return 'Lunch';
  }

  for (const [pattern, slot] of CATEGORY_FALLBACK) {
    if (pattern.test(cleaned)) return slot;
  }

  return 'Other';
}

module.exports = { normalizeMealSlot, MEAL_SLOTS };
