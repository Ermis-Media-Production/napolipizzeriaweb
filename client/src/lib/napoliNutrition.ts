/**
 * napoliNutrition.ts
 * Approximate nutritional info, dietary tags, and allergen badges for all menu items.
 * Calories and protein are estimates based on standard restaurant portions.
 *
 * Dietary tags:
 *   V   = Vegetarian (no meat, poultry, fish)
 *   VG  = Vegan (no animal products)
 *   GF  = Gluten-Free (no wheat/barley/rye)
 *   DF  = Dairy-Free (no milk/cheese/butter)
 *   HOT = Spicy / Hot
 *
 * Allergens (FDA Big 9):
 *   milk | eggs | fish | shellfish | treeNuts | peanuts | wheat | soy | sesame
 */

export type DietTag = "V" | "VG" | "GF" | "DF" | "HOT" | "BEST";

export type Allergen =
  | "milk"
  | "eggs"
  | "fish"
  | "shellfish"
  | "treeNuts"
  | "peanuts"
  | "wheat"
  | "soy"
  | "sesame";

export interface NutritionInfo {
  cal: number;        // approximate calories
  protein: number;    // approximate grams of protein
  tags?: DietTag[];
  allergens?: Allergen[];
}

/** Lookup by item name (case-sensitive, matches napoliData.ts names) */
export const NUTRITION: Record<string, NutritionInfo> = {

  // ── APPETIZERS ──────────────────────────────────────────────
  "Napoli's Combo Platter":        { cal: 980,  protein: 22, tags: ["V"],         allergens: ["wheat", "milk", "eggs"] },
  "French Fries":                  { cal: 320,  protein: 4,  tags: ["V", "VG", "GF", "DF"] },
  "Garlic Bread":                  { cal: 260,  protein: 5,  tags: ["V"],         allergens: ["wheat", "milk"] },
  "Bread Sticks (12)":             { cal: 480,  protein: 12, tags: ["V"],         allergens: ["wheat", "milk"] },
  "Curly Fries":                   { cal: 380,  protein: 4,  tags: ["V"],         allergens: ["wheat"] },
  "Garlic Balls w/ Cheese (20)":   { cal: 420,  protein: 14, tags: ["V"],         allergens: ["wheat", "milk"] },
  "Breaded Mushrooms (12)":        { cal: 340,  protein: 8,  tags: ["V"],         allergens: ["wheat", "eggs"] },
  "Fried Ravioli (8)":             { cal: 460,  protein: 16, tags: ["V"],         allergens: ["wheat", "milk", "eggs"] },
  "Zucchini Sticks (12)":          { cal: 310,  protein: 7,  tags: ["V"],         allergens: ["wheat", "eggs"] },
  "Jalapeño Poppers (6)":          { cal: 380,  protein: 9,  tags: ["V", "HOT"],  allergens: ["wheat", "milk", "eggs"] },
  "Cheese Quesadilla":             { cal: 520,  protein: 18, tags: ["V"],         allergens: ["wheat", "milk"] },
  "Chili Cheese Fries":            { cal: 680,  protein: 22, allergens: ["wheat", "milk"] },
  "Bruschetta":                    { cal: 280,  protein: 6,  tags: ["V"],         allergens: ["wheat"] },
  "Curly Fries W/ Bacon":          { cal: 520,  protein: 14, allergens: ["wheat", "milk"] },
  "Onion Rings":                   { cal: 410,  protein: 5,  tags: ["V"],         allergens: ["wheat", "eggs"] },

  // ── SIDES ────────────────────────────────────────────────────
  "Meatballs (2)":                 { cal: 280,  protein: 18, allergens: ["wheat", "eggs", "milk"] },
  "Sausage (2)":                   { cal: 320,  protein: 16, allergens: ["wheat"] },
  "Marinara w/ Beef":              { cal: 340,  protein: 20, allergens: ["wheat"] },

  // ── SOUPS ────────────────────────────────────────────────────
  "Lentil, Bowl of Chili, Chicken Noodle, Cream of Broccoli or Minestrone": { cal: 220, protein: 10, tags: ["V"], allergens: ["wheat", "milk"] },

  // ── SALADS ───────────────────────────────────────────────────
  "Dinner Side Salad":             { cal: 120,  protein: 4,  tags: ["V", "VG", "GF", "DF"] },
  "Antipasto Salad":               { cal: 380,  protein: 14, tags: ["GF"],        allergens: ["milk"] },
  "Egg's Chef Salad":              { cal: 420,  protein: 22, tags: ["GF"],        allergens: ["milk", "eggs"] },
  "Blackened Chicken Salad":       { cal: 380,  protein: 32, tags: ["GF"],        allergens: ["milk"] },
  "Buffalo Crispy Chicken Salad":  { cal: 520,  protein: 34, tags: ["HOT"],       allergens: ["wheat", "milk", "eggs"] },
  "Crispy Chicken Salad":          { cal: 480,  protein: 30, allergens: ["wheat", "milk", "eggs"] },
  "Chicken Caesar Salad":          { cal: 440,  protein: 34, allergens: ["wheat", "milk", "eggs", "fish"] },
  "Mediterranean Salad":           { cal: 320,  protein: 12, tags: ["V", "GF"],   allergens: ["milk"] },
  "Greek Salad":                   { cal: 290,  protein: 10, tags: ["V", "GF"],   allergens: ["milk"] },
  "Napoli Italian Chopped Salad":  { cal: 460,  protein: 18, allergens: ["wheat", "milk"] },
  "Gyro Salad":                    { cal: 480,  protein: 26, tags: ["GF"],        allergens: ["milk"] },
  "Spinach Salad":                 { cal: 360,  protein: 16, tags: ["GF"],        allergens: ["milk", "eggs"] },
  "Caesar Salad":                  { cal: 340,  protein: 10, allergens: ["wheat", "milk", "eggs", "fish"] },
  "Steak Salad (Sirloin Beef Flap)": { cal: 520, protein: 38, tags: ["GF", "BEST"], allergens: ["milk"] },

  // ── PASTA ────────────────────────────────────────────────────
  "Spaghetti & Meatballs":         { cal: 720,  protein: 34, tags: ["BEST"],      allergens: ["wheat", "milk", "eggs"] },
  "Spaghetti & Sausage":           { cal: 680,  protein: 30, allergens: ["wheat", "milk"] },
  "Baked Ziti":                    { cal: 760,  protein: 32, tags: ["V"],         allergens: ["wheat", "milk", "eggs"] },
  "Ziti w/ Marinara":              { cal: 560,  protein: 18, tags: ["V"],         allergens: ["wheat", "milk"] },
  "Chicken Parmigiana":            { cal: 820,  protein: 48, tags: ["BEST"],      allergens: ["wheat", "milk", "eggs"] },
  "Homemade Shells":               { cal: 640,  protein: 28, tags: ["V"],         allergens: ["wheat", "milk", "eggs"] },
  "Manicotti w/ Ricotta & Egg":    { cal: 680,  protein: 30, tags: ["V"],         allergens: ["wheat", "milk", "eggs"] },
  "Cannelloni":                    { cal: 660,  protein: 28, allergens: ["wheat", "milk", "eggs"] },
  "Fettuccine Alfredo":            { cal: 780,  protein: 22, tags: ["V"],         allergens: ["wheat", "milk", "eggs"] },
  "Chicken Fettuccine Alfredo":    { cal: 920,  protein: 46, allergens: ["wheat", "milk", "eggs"] },
  "Shrimp & Chicken Fettuccine Alfredo": { cal: 980, protein: 52, allergens: ["wheat", "milk", "eggs", "shellfish"] },
  "Stuffed Shells w/ Ricotta":     { cal: 640,  protein: 28, tags: ["V"],         allergens: ["wheat", "milk", "eggs"] },
  "Creamy Butter Ravioli":         { cal: 620,  protein: 22, tags: ["V"],         allergens: ["wheat", "milk", "eggs"] },
  "Marinara Ravioli":              { cal: 560,  protein: 20, tags: ["V"],         allergens: ["wheat", "milk", "eggs"] },
  "Baked Ravioli":                 { cal: 680,  protein: 26, tags: ["V"],         allergens: ["wheat", "milk", "eggs"] },
  "Ravioli Bolognese (Sauteed)":   { cal: 720,  protein: 30, allergens: ["wheat", "milk", "eggs"] },
  "Spaghetti w/ Marinara":         { cal: 480,  protein: 14, tags: ["V"],         allergens: ["wheat"] },
  "Tortellini w/ Marinara":        { cal: 580,  protein: 22, tags: ["V"],         allergens: ["wheat", "milk", "eggs"] },
  "Tortellini Ala Parma":          { cal: 640,  protein: 26, allergens: ["wheat", "milk", "eggs"] },
  "Tortellini Alfredo":            { cal: 720,  protein: 26, tags: ["V"],         allergens: ["wheat", "milk", "eggs"] },
  "Alfredo, Chicken, Garlic & Broccoli": { cal: 860, protein: 44, allergens: ["wheat", "milk", "eggs"] },
  "Eggplant Parmigiana":           { cal: 580,  protein: 18, tags: ["V"],         allergens: ["wheat", "milk", "eggs"] },

  // ── SUBS & SANDWICHES ────────────────────────────────────────
  "Napoli Italian Special":        { cal: 680,  protein: 32, allergens: ["wheat", "milk"] },
  "Ham & Cheese":                  { cal: 580,  protein: 28, allergens: ["wheat", "milk"] },
  "Fried Chicken":                 { cal: 620,  protein: 34, allergens: ["wheat", "eggs"] },
  "Turkey & Cheese":               { cal: 540,  protein: 30, allergens: ["wheat", "milk"] },
  "Buffalo Chicken Breast":        { cal: 580,  protein: 36, tags: ["HOT"],       allergens: ["wheat", "milk", "eggs"] },
  "Crispy Chicken":                { cal: 600,  protein: 34, allergens: ["wheat", "eggs"] },
  "Grilled Sausage & Peppers":     { cal: 620,  protein: 26, allergens: ["wheat"] },
  "California Turkey":             { cal: 520,  protein: 28, allergens: ["wheat", "milk"] },
  "Philly Steak Bomb":             { cal: 760,  protein: 38, tags: ["BEST"],      allergens: ["wheat", "milk"] },
  "Watertown":                     { cal: 580,  protein: 28, allergens: ["wheat", "milk"] },
  "Newton":                        { cal: 560,  protein: 26, allergens: ["wheat", "milk"] },
  "Meatball Parmigiana":           { cal: 680,  protein: 32, allergens: ["wheat", "milk", "eggs"] },
  "Meatball & Sausage Parmigiana": { cal: 740,  protein: 36, allergens: ["wheat", "milk", "eggs"] },
  "Eggplant Parmigiana Sub":       { cal: 580,  protein: 18, tags: ["V"],         allergens: ["wheat", "milk", "eggs"] },
  "Beef or Chicken Philly":        { cal: 680,  protein: 38, allergens: ["wheat", "milk"] },

  // ── WRAPS ────────────────────────────────────────────────────
  "Grilled Chicken Caesar":        { cal: 520,  protein: 36, allergens: ["wheat", "milk", "eggs", "fish"] },
  "Crispy Chicken Wrap":           { cal: 560,  protein: 34, allergens: ["wheat", "eggs"] },
  "Buffalo Chicken Wrap":          { cal: 580,  protein: 36, tags: ["HOT"],       allergens: ["wheat", "milk", "eggs"] },
  "Veggie":                        { cal: 380,  protein: 12, tags: ["V"],         allergens: ["wheat", "milk"] },
  "Steak":                         { cal: 620,  protein: 40, allergens: ["wheat", "milk"] },

  // ── BURGERS ──────────────────────────────────────────────────
  "Hamburger":                     { cal: 580,  protein: 32, allergens: ["wheat", "eggs", "milk"] },
  "Cheeseburger":                  { cal: 640,  protein: 36, tags: ["BEST"],      allergens: ["wheat", "eggs", "milk"] },
  "Bacon Burger":                  { cal: 680,  protein: 38, allergens: ["wheat", "eggs", "milk"] },
  "Chili Cheese":                  { cal: 760,  protein: 40, allergens: ["wheat", "eggs", "milk"] },
  "Blue Beef & Cheese":            { cal: 720,  protein: 38, allergens: ["wheat", "eggs", "milk"] },
  "Crispy Chicken Burger":         { cal: 680,  protein: 36, allergens: ["wheat", "eggs", "milk"] },
  "Bacon Cheeseburger":            { cal: 740,  protein: 42, allergens: ["wheat", "eggs", "milk"] },
  "Napoli Cheeseburger":           { cal: 760,  protein: 42, tags: ["BEST"],      allergens: ["wheat", "eggs", "milk"] },
  "Greek Burger":                  { cal: 680,  protein: 36, allergens: ["wheat", "eggs", "milk"] },

  // ── WINGS & FINGERS ──────────────────────────────────────────
  "Bone-In Wings":                 { cal: 420,  protein: 36, tags: ["GF"],        allergens: ["milk"] },
  "Boneless Wings":                { cal: 380,  protein: 28, allergens: ["wheat", "eggs"] },
  "Chicken Fingers":               { cal: 440,  protein: 32, allergens: ["wheat", "eggs"] },

  // ── PIZZA (per slice / 14" reference) ────────────────────────
  "Plain Cheese":                  { cal: 280,  protein: 12, tags: ["V"],         allergens: ["wheat", "milk"] },
  "BBQ Chicken":                   { cal: 320,  protein: 18, tags: ["BEST"],      allergens: ["wheat", "milk"] },
  "Buffalo Chicken":               { cal: 310,  protein: 18, tags: ["HOT"],       allergens: ["wheat", "milk"] },
  "3 Cheese":                      { cal: 340,  protein: 16, tags: ["V"],         allergens: ["wheat", "milk"] },
  "Chicken Alfredo":               { cal: 350,  protein: 20, allergens: ["wheat", "milk", "eggs"] },
  "Deluxe":                        { cal: 360,  protein: 20, allergens: ["wheat", "milk"] },
  "Greek":                         { cal: 300,  protein: 16, allergens: ["wheat", "milk"] },
  "Italian":                       { cal: 340,  protein: 18, allergens: ["wheat", "milk"] },
  "Meat Lover":                    { cal: 400,  protein: 24, allergens: ["wheat", "milk"] },
  "Mexican Style":                 { cal: 360,  protein: 20, tags: ["HOT"],       allergens: ["wheat", "milk"] },
  "Napoli's Special":              { cal: 340,  protein: 18, tags: ["BEST"],      allergens: ["wheat", "milk"] },
  "Pesto Chicken":                 { cal: 330,  protein: 20, allergens: ["wheat", "milk", "treeNuts"] },
  "Ranch":                         { cal: 340,  protein: 18, allergens: ["wheat", "milk", "eggs"] },
  "Southwestern Chicken":          { cal: 330,  protein: 20, tags: ["HOT"],       allergens: ["wheat", "milk"] },
  "Supreme":                       { cal: 360,  protein: 20, allergens: ["wheat", "milk"] },
  "Taco":                          { cal: 370,  protein: 20, allergens: ["wheat", "milk"] },
  "Vegetarian":                    { cal: 260,  protein: 10, tags: ["V"],         allergens: ["wheat", "milk"] },
  "White Pizza":                   { cal: 300,  protein: 14, tags: ["V"],         allergens: ["wheat", "milk"] },
  "Calzone":                       { cal: 680,  protein: 30, tags: ["V"],         allergens: ["wheat", "milk", "eggs"] },
  "Stromboli":                     { cal: 720,  protein: 32, allergens: ["wheat", "milk"] },
  "Stuffed Chicago Deep Dish":     { cal: 480,  protein: 22, allergens: ["wheat", "milk", "eggs"] },
  "Sicilian 12x8":                 { cal: 380,  protein: 16, tags: ["V"],         allergens: ["wheat", "milk"] },

  // ── KIDS MENU ────────────────────────────────────────────────
  "Chicken Fingers (3) w/ Fries":  { cal: 560,  protein: 28, allergens: ["wheat", "eggs"] },
  "Grilled Cheese w/ Fries":       { cal: 520,  protein: 16, tags: ["V"],         allergens: ["wheat", "milk"] },
  "Ziti w/ Marinara or Butter":    { cal: 480,  protein: 14, tags: ["V"],         allergens: ["wheat", "milk"] },
  "Macaroni & Cheese w/ Fries":    { cal: 580,  protein: 16, tags: ["V"],         allergens: ["wheat", "milk"] },
  "Dinosaur Nugget w/ Fries":      { cal: 540,  protein: 22, allergens: ["wheat", "eggs"] },
  "Spaghetti w/ Marinara or Butter": { cal: 460, protein: 12, tags: ["V"],        allergens: ["wheat", "milk"] },

  // ── DESSERTS ─────────────────────────────────────────────────
  "Zeppolis (20) – Sugar or Cinnamon": { cal: 480, protein: 6, tags: ["V"],       allergens: ["wheat", "eggs", "milk"] },
  "Red Velvet Cake":               { cal: 420,  protein: 5,  tags: ["V"],         allergens: ["wheat", "milk", "eggs"] },
  "Eclair":                        { cal: 260,  protein: 5,  tags: ["V"],         allergens: ["wheat", "milk", "eggs"] },
  "Brownie (1)":                   { cal: 280,  protein: 4,  tags: ["V"],         allergens: ["wheat", "milk", "eggs"] },
  "Fresh Cannoli (1)":             { cal: 320,  protein: 6,  tags: ["V"],         allergens: ["wheat", "milk", "eggs"] },
  "Baklava":                       { cal: 300,  protein: 4,  tags: ["V"],         allergens: ["wheat", "treeNuts"] },
  "Plain Cheesecake":              { cal: 380,  protein: 6,  tags: ["V"],         allergens: ["wheat", "milk", "eggs"] },
  "Strawberry Cheesecake":         { cal: 400,  protein: 6,  tags: ["V"],         allergens: ["wheat", "milk", "eggs"] },
  "Caramel Cheesecake":            { cal: 420,  protein: 6,  tags: ["V"],         allergens: ["wheat", "milk", "eggs"] },
  "Nutella Cheesecake":            { cal: 440,  protein: 7,  tags: ["V"],         allergens: ["wheat", "milk", "eggs", "treeNuts"] },
  "Tiramisu":                      { cal: 360,  protein: 6,  tags: ["V"],         allergens: ["wheat", "milk", "eggs"] },
  "Chocolate Cake":                { cal: 400,  protein: 5,  tags: ["V"],         allergens: ["wheat", "milk", "eggs"] },
  "Carrot Cake":                   { cal: 380,  protein: 5,  tags: ["V"],         allergens: ["wheat", "milk", "eggs", "treeNuts"] },

  // ── BEVERAGES ────────────────────────────────────────────────
  "Soda Can":                      { cal: 140,  protein: 0,  tags: ["V", "VG", "GF", "DF"] },
  "Glass Bottle Soda":             { cal: 160,  protein: 0,  tags: ["V", "VG", "GF", "DF"] },
  "Perrier (11.5oz)":              { cal: 0,    protein: 0,  tags: ["V", "VG", "GF", "DF"] },
  "Bottled Water":                 { cal: 0,    protein: 0,  tags: ["V", "VG", "GF", "DF"] },
  "2 Liter (Coke, Diet Coke, Coke Zero, Dr. Pepper, Sprite, Root Beer, Orange Fanta, Ginger Ale)": { cal: 800, protein: 0, tags: ["V", "VG", "GF", "DF"] },
  "Gold Peak Iced Tea (Green Tea, Raspberry, Black Sweetened or Unsweetened)": { cal: 130, protein: 0, tags: ["V", "VG", "GF", "DF"] },
  "Root Beer Float – Over 100 Flavors": { cal: 380, protein: 4, tags: ["V"],      allergens: ["milk"] },
  "Handspun Frozen Custard Milkshake (Vanilla, Strawberry, Oreos, Peanut Butter, Chocolate)": { cal: 620, protein: 10, tags: ["V"], allergens: ["milk", "eggs", "wheat"] },
};

/** Returns nutrition info for an item, or undefined if not found */
export function getNutrition(itemName: string): NutritionInfo | undefined {
  return NUTRITION[itemName];
}

/** Dietary tag display config */
export const DIET_TAG_CONFIG: Record<DietTag, { label: string; color: string; bg: string; title: string }> = {
  V:    { label: "V",    color: "#166534", bg: "#dcfce7", title: "Vegetarian" },
  VG:   { label: "VG",  color: "#14532d", bg: "#bbf7d0", title: "Vegan" },
  GF:   { label: "GF",  color: "#92400e", bg: "#fef3c7", title: "Gluten-Free" },
  DF:   { label: "DF",  color: "#1e3a5f", bg: "#dbeafe", title: "Dairy-Free" },
  HOT:  { label: "🌶",  color: "#991b1b", bg: "#fee2e2", title: "Spicy" },
  BEST: { label: "★",   color: "#92400e", bg: "#fef9c3", title: "Best Seller" },
};

/** Allergen display config */
export const ALLERGEN_CONFIG: Record<Allergen, { emoji: string; label: string }> = {
  milk:      { emoji: "🥛", label: "Milk" },
  eggs:      { emoji: "🥚", label: "Eggs" },
  fish:      { emoji: "🐟", label: "Fish" },
  shellfish: { emoji: "🦐", label: "Shellfish" },
  treeNuts:  { emoji: "🌰", label: "Tree Nuts" },
  peanuts:   { emoji: "🥜", label: "Peanuts" },
  wheat:     { emoji: "🌾", label: "Wheat" },
  soy:       { emoji: "🫘", label: "Soy" },
  sesame:    { emoji: "⚪", label: "Sesame" },
};
