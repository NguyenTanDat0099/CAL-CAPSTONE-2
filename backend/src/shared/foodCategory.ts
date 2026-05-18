// Meal-slot taxonomy used by the user-facing Meal Plans filter tabs.
// Any food category stored in the DB MUST be one of these values so that the
// frontend filter (Breakfast / Lunch / Dinner / Snack / Other) works.

export type MealSlot = 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack' | 'Other';

export const MEAL_SLOTS: readonly MealSlot[] = [
  'Breakfast',
  'Lunch',
  'Dinner',
  'Snack',
  'Other',
];

const BREAKFAST_KEYWORDS = /\b(milk|coffee|latte|cappuccino|espresso|mocha|tea|matcha|cocoa|hot chocolate|juice|smoothie|yogurt|yoghurt|oatmeal|oat|cereal|pancake|waffle|toast|bread|loaf|bagel|croissant|muffin|granola|porridge|congee|cháo|chao|xôi|xoi|bánh mì|banh mi|egg|omelet|omelette|frittata)\b/i;

const SNACK_KEYWORDS = /\b(cookie|cake|chip|crisps|candy|chocolate|donut|doughnut|pie|ice cream|sorbet|sherbet|gelato|cracker|popcorn|biscuit|brownie|gummy|jelly|mochi|wafer|brownies|pretzel|pudding|custard|tart|macaron|cupcake|nut|nuts|trail mix|fruit bar|granola bar|protein bar|protein shake|smoothie bar|chè |che |kẹo|keo)\b/i;

const FRUIT_KEYWORDS = /\b(apple|banana|berry|berries|grape|orange|melon|watermelon|peach|pear|mango|cherry|kiwi|pineapple|plum|apricot|raspberry|strawberry|blueberry|lemon|lime|raisin|date|fig|persimmon|guava|pomegranate|papaya|chuối|chuoi|táo|tao|nho|cam|xoài|xoai|dứa|dua|ổi|oi)\b/i;

const LUNCH_KEYWORDS = /\b(salad|sandwich|wrap|burrito|sub|panini|soup|stew|broth|noodle|noodles|pasta|spaghetti|fettuccine|ramen|udon|pho|phở|bún|bun|cơm tấm|com tam|bibimbap|gimbap|sushi roll|quinoa bowl|grain bowl|rice bowl|veggie bowl|buddha bowl|poke|salad bowl|gỏi|goi)\b/i;

const DINNER_KEYWORDS = /\b(beef|pork|chicken|lamb|veal|mutton|steak|wagyu|fillet|filet|sirloin|ribeye|brisket|rib|ribs|fish|salmon|tuna|cod|mackerel|trout|sardine|shrimp|prawn|crab|lobster|squid|octopus|mussel|clam|oyster|scallop|abalone|duck|goose|turkey|roast|grilled|stew|curry|stir.?fry|braised|baked|fried|smoked|tofu|tempeh|paneer|lasagna|risotto|paella|sushi platter|sashimi|teriyaki|barbecue|bbq|hot ?pot|lẩu|lau|kho |nướng|nuong|chiên|chien|hấp|hap|xào|xao)\b/i;

const VEGETABLE_KEYWORDS = /\b(salad|vegetable|veggie|kale|spinach|lettuce|cabbage|broccoli|cauliflower|asparagus|carrot|cucumber|tomato|squash|pumpkin|zucchini|eggplant|aubergine|pepper|capsicum|mushroom|onion|garlic|celery|leek|radish|turnip|beet|beetroot|sprout|bean sprout|okra|bok choy|kim chi|rau|cải|cai|bí|bi|cà|ca)\b/i;

const CATEGORY_FALLBACK: ReadonlyArray<[RegExp, MealSlot]> = [
  [/breakfast/i, 'Breakfast'],
  [/lunch/i, 'Lunch'],
  [/dinner|supper/i, 'Dinner'],
  [/snack|dessert|sweet|candy|beverage|drink|packaged/i, 'Snack'],
  [/restaurant|main course|entrée|entree|meat|seafood|protein/i, 'Dinner'],
  [/raw|vegetable|fruit|salad|side dish|side/i, 'Lunch'],
  [/other|general|misc|uncategor/i, 'Other'],
];

/**
 * Coerce any food category string (or unknown food row) into one of the 5
 * canonical meal slots used by the user Meal Plans UI.
 *
 * - Tries the food name first via keyword heuristics (most accurate).
 * - Falls back to mapping the legacy category string (handles "Packaged Food",
 *   "Restaurant Food", "Raw Vegetables and Fruits", etc.).
 * - Defaults to "Other" so the food still shows up in the catch-all tab.
 */
export const normalizeMealSlot = (
  rawCategory?: string | null,
  foodName?: string | null
): MealSlot => {
  // Step 1: if the raw category is ALREADY a meal slot, trust it.
  const cleaned = (rawCategory ?? '').trim();
  const exact = MEAL_SLOTS.find(
    slot => slot.toLowerCase() === cleaned.toLowerCase()
  );
  if (exact) return exact;

  // Step 2: derive from food name keywords.
  const name = (foodName ?? '').toLowerCase();
  if (name) {
    if (BREAKFAST_KEYWORDS.test(name)) return 'Breakfast';
    if (SNACK_KEYWORDS.test(name)) return 'Snack';
    if (FRUIT_KEYWORDS.test(name)) return 'Snack';
    if (DINNER_KEYWORDS.test(name)) return 'Dinner';
    if (LUNCH_KEYWORDS.test(name)) return 'Lunch';
    if (VEGETABLE_KEYWORDS.test(name)) return 'Lunch';
  }

  // Step 3: fallback by legacy category string.
  for (const [pattern, slot] of CATEGORY_FALLBACK) {
    if (pattern.test(cleaned)) return slot;
  }

  return 'Other';
};
