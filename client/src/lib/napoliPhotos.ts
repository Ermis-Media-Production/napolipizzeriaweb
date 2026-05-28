// ─────────────────────────────────────────────────────────────
// NAPOLI PIZZERIA — Menu Item Photo Map
// Sources: Clover POS CDN (cloverstatic.com) + webdev storage
// ─────────────────────────────────────────────────────────────

// Clover CDN base — photos are served directly from Clover's CDN
const C = "https://cloverstatic.com/menu-assets/items/";

// Webdev storage base
const S = "/manus-storage/";

export const MENU_PHOTOS: Record<string, string> = {
  // ── APPETIZERS ──────────────────────────────────────────────
  "Napoli's Combo Platter":         S + "napoli-combo-platter_82ee98cd.jpg",
  "French Fries":                   S + "napoli-french-fries-photo_19374293.jpg",
  "Garlic Bread":                   "https://d2xsxph8kpxj0f.cloudfront.net/310519663690084073/brxvWsWYfwFxoqeFg9Rbqu/napoli-garlic-bread-BGUR6YGQLqbBXawWuDkbem.webp",
  "Bread Sticks (12)":              S + "cheese_bread_sticks_7b2c9b3d.webp",
  "Curly Fries":                    S + "curly_fries_6060b06a.webp",
  "Garlic Balls w/ Cheese (20)":    "https://d2xsxph8kpxj0f.cloudfront.net/310519663690084073/brxvWsWYfwFxoqeFg9Rbqu/napoli-garlic-balls-6a5y9k6vhDLNtrAefSjwL2.webp",
  "Breaded Mushrooms (12)":         S + "breaded_mushrooms_12pc_8331cf0e.webp",
  "Fried Ravioli (8)":              S + "fried_ravioli_2a7da3d8.webp",
  "Zucchini Sticks (12)":           C + "QKCA3T979YYJA.jpeg",
  "Jalapeño Poppers (6)":           S + "jalapeno-poppers-golden-crispy-breaded-jalapeno-pe_d03ab464.jpeg",
  "Cheese Quesadilla":              "https://d2xsxph8kpxj0f.cloudfront.net/310519663690084073/brxvWsWYfwFxoqeFg9Rbqu/napoli-cheese-quesadilla-CvtmLtSu8mUpoq8aXLgnrZ.webp",
  "Chili Cheese Fries":             "https://d2xsxph8kpxj0f.cloudfront.net/310519663690084073/brxvWsWYfwFxoqeFg9Rbqu/napoli-chili-cheese-fries-PC49xr4AL3qD6voTzYFoZk.webp",
  "Bruschetta":                     "https://d2xsxph8kpxj0f.cloudfront.net/310519663690084073/brxvWsWYfwFxoqeFg9Rbqu/napoli-bruschetta-TLaynNtwqZJsbMhaVbsQGT.webp",
  "Curly Fries W/ Bacon":           S + "curly_fries_cheese_bacon_82976486.webp",
  "Onion Rings":                    "https://d2xsxph8kpxj0f.cloudfront.net/310519663690084073/brxvWsWYfwFxoqeFg9Rbqu/napoli-onion-rings-QUdG8EwTZ7q53br8CPG7rW.webp",

  // ── SALADS ──────────────────────────────────────────────────
  "Dinner Side Salad":              C + "V3SCW3RTEA2M6.jpeg",
  "Antipasto Salad":                C + "NZQAR9314JRV8.jpeg",
  "Egg's Chef Salad":               C + "V3SCW3RTEA2M6.jpeg",
  "Blackened Chicken Salad":        C + "6M1Q1NDBM5B98.jpeg",
  "Buffalo Crispy Chicken Salad":   C + "JH1K9S966RK00.jpeg",
  "Crispy Chicken Salad":           C + "JH1K9S966RK00.jpeg",
  "Chicken Caesar Salad":           C + "JH1K9S966RK00.jpeg",
  "Mediterranean Salad":            C + "NZQAR9314JRV8.jpeg",
  "Greek Salad":                    C + "AHT0Q3RRX0K0G.jpeg",
  "Napoli Italian Chopped Salad":   C + "NZQAR9314JRV8.jpeg",
  "Gyro Salad":                     C + "NZQAR9314JRV8.jpeg",
  "Spinach Salad":                  C + "G6Q6HRG064F8P.jpeg",
  "Caesar Salad":                   C + "WE0SBNVX0SW78.jpeg",
  "Steak Salad (Sirloin Beef Flap)":C + "RXECXK4BDTJ6Y.jpeg",

  // ── PIZZA SPECIALS ──────────────────────────────────────────
  "BBQ Chicken":                    C + "T6GATR3640CSW.jpeg",
  "Buffalo Chicken":                C + "TK54KSEM9MQ0C.jpeg?v=1778152442519",
  "3 Cheese":                       C + "Q5P394HBCYWV6.jpeg",
  "Chicken Alfredo":                C + "VEDECN2MXP29R.jpeg?v=1779391850463",
  "Deluxe":                         C + "Q5P394HBCYWV6.jpeg",
  "Greek":                          C + "T6GATR3640CSW.jpeg",
  "Italian":                        C + "082CDPWK0FS0G.jpeg",
  "Meat Lover":                     C + "ECXJ2YTAJ2JYW.jpeg?v=1779393721741",
  "Mexican Style":                  C + "2YQ7DP539SPQM.jpeg",
  "Napoli's Special":               S + "napoli-special-pizza-photo_0b03c1c6.jpg",
  "Pesto Chicken":                  S + "napoli-pesto-chicken-pizza-photo_9f4073f0.jpg",
  "Ranch":                          C + "T6GATR3640CSW.jpeg",
  "Southwestern Chicken":           S + "napoli-southwestern-pizza-photo_015a851c.jpg",
  "Supreme":                        C + "TK54KSEM9MQ0C.jpeg?v=1778152442519",
  "Taco":                           S + "napoli-taco-pizza-photo_73fd48e4.jpg",
  "Vegetarian":                     S + "napoli-vegetarian-pizza-photo_533eada6.jpg",
  "White Pizza":                    C + "H9JY5SKG4R53T.jpeg",

  // ── STUFFED DOUGH ───────────────────────────────────────────
  "Stuffed Chicago Deep Dish":      S + "napoli-deep-dish-photo_1967e276.jpg",
  "Calzone":                        S + "napoli-calzone-photo_a2c79f74.jpg",
  "Stromboli":                      S + "napoli-stromboli-photo_0a321b0b.jpg",

  // ── WRAPS ────────────────────────────────────────────────────
  "Grilled Chicken Caesar":         C + "DAQMPQ8ERBF68.jpeg?v=1779391946506",
  "Crispy Chicken":                 C + "CMGT5R06VWGXT.jpeg?v=1779391871539",
  "Veggie":                         C + "S7J1CFNP6795J.jpeg?v=1777003730735",
  "Steak":                          C + "RXECXK4BDTJ6Y.jpeg",

  // ── WINGS ────────────────────────────────────────────────────
  "Wings":                          C + "KQXZYE71T0EME.jpeg",
  "Chicken Fingers":                C + "7BKS32E6KM95R.jpeg",

  // ── PASTA ────────────────────────────────────────────────────
  "Spaghetti & Meatballs":          C + "4NZ1VQXECCYMR.jpeg",
  "Spaghetti & Sausage":            C + "4NZ1VQXECCYMR.jpeg",
  "Baked Ziti":                     C + "EA4SX42TRT7GM.jpeg",
  "Ziti w/ Marinara":               C + "EA4SX42TRT7GM.jpeg",
  "Chicken Parmigiana":             C + "TQ1HVCD5ESJ42.jpeg",
  "Homemade Shells":                C + "EA4SX42TRT7GM.jpeg",
  "Manicotti w/ Ricotta & Egg":     C + "YFYDWKSNTR0J6.jpeg",
  "Cannelloni":                     S + "napoli-cannelloni_2c91af3d.jpg",
  "Fettuccine Alfredo":             C + "P07GFBEYXKZEJ.jpeg",
  "Chicken Fettuccine Alfredo":     C + "TQ1HVCD5ESJ42.jpeg",
  "Shrimp & Chicken Fettuccine Alfredo": C + "TQ1HVCD5ESJ42.jpeg",
  "Stuffed Shells w/ Ricotta":      C + "EA4SX42TRT7GM.jpeg",
  "Creamy Butter Ravioli":          C + "EA4SX42TRT7GM.jpeg",
  "Marinara Ravioli":               C + "EA4SX42TRT7GM.jpeg",
  "Baked Ravioli":                  C + "EA4SX42TRT7GM.jpeg",
  "Ravioli Bolognese (Sauteed)":    C + "EA4SX42TRT7GM.jpeg",
  "Spaghetti w/ Marinara":          C + "4NZ1VQXECCYMR.jpeg",
  "Tortellini w/ Marinara":         C + "EA4SX42TRT7GM.jpeg",
  "Tortellini Ala Parma":           C + "EA4SX42TRT7GM.jpeg",
  "Tortellini Alfredo":             C + "P07GFBEYXKZEJ.jpeg",
  "Alfredo, Chicken, Garlic & Broccoli": C + "TQ1HVCD5ESJ42.jpeg",
  "Eggplant Parmigiana":            C + "TQ1HVCD5ESJ42.jpeg",
  "Lasagna":                        C + "EA4SX42TRT7GM.jpeg",

  // ── SUBS — COLD ──────────────────────────────────────────────
  "Napoli Italian Special":         C + "9QBSHW65WFC2G.jpeg",
  "Ham & Cheese":                   C + "21WHCK9MDQENT.jpeg",
  "Fried Chicken":                  C + "TQ1HVCD5ESJ42.jpeg",
  "Turkey & Cheese":                C + "21WHCK9MDQENT.jpeg",

  // ── SUBS — HOT ───────────────────────────────────────────────
  "Buffalo Chicken Breast":         C + "HFVDXB816MJB2.jpeg",
  "Grilled Sausage & Peppers":      C + "KE3E767Y3WKAG.jpeg",
  "California Turkey":              C + "21WHCK9MDQENT.jpeg",
  "Philly Steak Bomb":              C + "QKCA3T979YYJA.jpeg",
  "Watertown":                      S + "napoli-watertown-sub_e7746134.jpg",
  "Newton":                         S + "napoli-newton-sub_439c08d6.jpg",
  "Meatball Parmigiana":            C + "9WPMWQ71D6AWP.jpeg",
  "Meatball & Sausage Parmigiana":  S + "napoli-meatball-sausage-parm_bfcb31dd.jpg",
  "Beef or Chicken Philly":         S + "napoli-beef-chicken-philly_6d157067.jpg",

  // ── BURGERS ──────────────────────────────────────────────────
  "Hamburger":                      S + "napoli_hamburger_regular_no_cheese_621b8d14.webp",
  "Cheeseburger":                   S + "napoli_cheeseburger_88e6c254.webp",
  "Bacon Burger":                   S + "napoli_bacon_d87bd55c.webp",
  "Chili Cheese":                   S + "napoli_chili_cheese_84760a59.webp",
  "Blue Beef & Cheese":             S + "napoli_blue_cheese_74d66a5c.webp",
  "Crispy Chicken Burger":          S + "napoli_crispy_chicken_9569e18e.webp",
  "Bacon Cheeseburger":             S + "napoli_bacon_cheese_1dfbb5a1.webp",
  "Napoli's 1000 Island":           S + "napoli_1000_island_4fb04ca8.webp",
  "Mexican Style Burger":           S + "napoli_mexican_style_34b6a694.webp",
  "Napoli Cheeseburger":            S + "napoli_cheeseburger_88e6c254.webp",
  "Sunrise":                        S + "napoli_hamburger_regular_807b7b42.webp",
  "Greek Burger":                   S + "napoli_greek_dbca63bc.webp",
  // Burger-specific overrides (same name as pizza items — resolved in getBurgerPhoto)
  "Burger:Mexican Style":           S + "napoli_mexican_style_34b6a694.webp",
  "Burger:Greek":                   S + "napoli_greek_dbca63bc.webp",
  "Pastrami":                       S + "napoli_pastrami_f47ba9ba.webp",
  "Texas":                          S + "napoli_texas_2c41a252.webp",
  "Southwestern":                   S + "napoli_southwestern_f96fb67e.webp",

  // ── TRIPLE DECKERS ───────────────────────────────────────────
  "Turkey":                         C + "21WHCK9MDQENT.jpeg",
  "Chicken or Turkey & Bacon":      C + "TQ1HVCD5ESJ42.jpeg",
  "Chicken & Bacon":                C + "TQ1HVCD5ESJ42.jpeg",

  // ── DESSERTS ─────────────────────────────────────────────────
  "Zeppolis (20) – Sugar or Cinnamon": C + "A7YSN4D4SPSDJ.jpeg",
  "Red Velvet Cake":                C + "7KQWC5V32FF6T.jpeg",
  "Eclair":                         C + "67G76ZMK0KM4J.jpeg",
  "Brownie (1)":                    C + "CYFXXZXRDZ4HA.jpeg",
  "Fresh Cannoli (1)":              C + "C3BYJWZR6321C.jpeg",
  "Baklava":                        C + "06FWZKQGT6W4G.jpeg",
  "Plain Cheesecake":               C + "R35QDZ3F85R84.jpeg",
  "Strawberry Cheesecake":          C + "S6DS9KZFQP8RR.jpeg",
  "Caramel Cheesecake":             C + "44S73X804EHMP.jpeg",
  "Nutella Cheesecake":             C + "5K4V5WYRFZ1VT.jpeg",
  "Tiramisu":                       C + "AAZCK9ZWNS3DT.jpeg",
  "Chocolate Cake":                 C + "TAWTNQJCNHPGG.jpeg",
  "Carrot Cake":                    C + "1X218Z83988FR.jpeg",

  // ── CHILDREN'S MENU ──────────────────────────────────────────
  "Chicken Fingers (3) w/ Fries":   C + "7BKS32E6KM95R.jpeg",
  "Grilled Cheese w/ Fries":        C + "0MPQWX8V4FPPA.jpeg",
  "Ziti w/ Marinara or Butter":     C + "EA4SX42TRT7GM.jpeg",
  "Macaroni & Cheese w/ Fries":     C + "YFYDWKSNTR0J6.jpeg",
  "Dinosaur Nugget w/ Fries":       C + "7BKS32E6KM95R.jpeg",
  "Spaghetti w/ Marinara or Butter":C + "4NZ1VQXECCYMR.jpeg",

  // ── BEVERAGES ────────────────────────────────────────────────
  "Soda Can":                       C + "DVVRX7FH10MQ4.jpeg",
  "Glass Bottle Soda":              C + "DVVRX7FH10MQ4.jpeg",
  "Perrier (11.5oz)":               C + "DVVRX7FH10MQ4.jpeg",
  "Bottled Water":                  C + "DVVRX7FH10MQ4.jpeg",
  "2 Liter (Coke, Diet Coke, Coke Zero, Dr. Pepper, Sprite, Root Beer, Orange Fanta, Ginger Ale)": C + "44A95MHJWMCHG.jpeg",
  "Gold Peak Iced Tea (Green Tea, Raspberry, Black Sweetened or Unsweetened)": C + "DVVRX7FH10MQ4.jpeg",
  "Root Beer Float – Over 100 Flavors": S + "napoli-root-beer-float_d5e5e6dc.jpg",
  "Handspun Frozen Custard Milkshake (Vanilla, Strawberry, Oreos, Peanut Butter, Chocolate)": S + "napoli-milkshake_25667203.jpg",
};

/**
 * Get a photo URL for a menu item by name.
 * Returns undefined if no photo is available.
 */
export function getMenuPhoto(name: string): string | undefined {
  return MENU_PHOTOS[name];
}

/**
 * Get a photo URL specifically for a burger item.
 * Uses burger-prefixed keys to avoid conflicts with pizza items that share names (e.g. Greek, Mexican Style).
 */
export function getBurgerPhoto(name: string): string | undefined {
  return MENU_PHOTOS[`Burger:${name}`] ?? MENU_PHOTOS[name];
}
