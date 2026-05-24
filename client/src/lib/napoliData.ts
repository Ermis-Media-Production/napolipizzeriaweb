// ─────────────────────────────────────────────────────────────
// NAPOLI PIZZERIA — Full Menu Data (extracted from menu photos)
// ─────────────────────────────────────────────────────────────

export const RESTAURANT_INFO = {
  name: "The Original Napoli Pizzeria",
  tagline: "Home of the 30\" & 36\" Pizza",
  subtitle: "Serving Fast Italian Cuisine",
  address: "3131 W. Craig Rd.",
  city: "North Las Vegas, NV 89032",
  phone: "725-204-0379",
  website: "www.napolipizzerianorthlasvegas.com",
  instagram: "@napolipizzeriacraig",
  facebook: "@napolipizzeriacraig",
  hours: [
    { days: "Every Day", time: "10:00AM – 10:00PM" },
  ],
  services: ["Delivery", "Dine-In", "Pick Up", "Catering"],
  pickupSpecial: { label: "16\" 1 Topping", price: "$12.99" },
};

// ── APPETIZERS ─────────────────────────────────────────────
export const APPETIZERS = [
  {
    name: "Napoli's Combo Platter",
    desc: "Deep Fried: Onion Rings, Zucchini Sticks, Breaded Mushrooms, Mozzarella Sticks & Jalapeño Peppers. Side of Marinara & Ranch",
    price: "$14.49",
    highlight: true,
  },
  { name: "French Fries", desc: "", prices: [{ size: "S", price: "$3.49" }, { size: "M", price: "$4.49" }, { size: "L", price: "$6.49" }] },
  { name: "Garlic Bread", desc: "Add Cheese $2", price: "$3.49" },
  { name: "Bread Sticks (12)", desc: "Add Cheese $3", price: "$7.49" },
  { name: "Curly Fries", desc: "Add Cheese & Garlic $3", price: "$3.49" },
  { name: "Garlic Balls w/ Cheese (20)", desc: "", price: "$3.49" },
  { name: "Breaded Mushrooms (12)", desc: "", price: "$10.49" },
  { name: "Fried Ravioli (8)", desc: "", price: "$10.49" },
  { name: "Zucchini Sticks (12)", desc: "", price: "$10.49" },
  { name: "Jalapeño Poppers (6)", desc: "", price: "$10.49" },
  { name: "Cheese Quesadilla", desc: "Add Chicken #2", price: "$10.49" },
  { name: "Chili Cheese Fries", desc: "", price: "$10.49" },
  { name: "Bruschetta", desc: "", price: "$12.49" },
  { name: "Curly Fries W/ Bacon", desc: "", price: "$12.49" },
  { name: "Onion Rings", desc: "", price: "$9.49" },
];

// ── SIDES ──────────────────────────────────────────────────
export const SIDES = [
  { name: "Potato Salad, Coleslaw, Pasta Salad, Side Salad, Sweet Potato Fries or Baked Beans", prices: [{ size: "Sm", price: "$4.49" }, { size: "Med", price: "$7.49" }, { size: "Lg", price: "$10.49" }] },
  { name: "Meatballs (2)", price: "$7.49" },
  { name: "Sausage (2)", price: "$7.49" },
  { name: "Marinara w/ Beef", price: "$10.49" },
];

// ── SOUPS ──────────────────────────────────────────────────
export const SOUPS = [
  { name: "Lentil, Bowl of Chili, Chicken Noodle, Cream of Broccoli or Minestrone", price: "$7.49" },
];

// ── SALADS ─────────────────────────────────────────────────
export const SALADS = [
  { name: "Dinner Side Salad", desc: "Dressing: Italian, Fat Free Italian, Ranch, Bleu Cheese, 1000 Island, Honey Mustard, Caesar, French, Oil & Balsamic Vinegar, Vinaigrette or Vinaigrette", prices: [{ size: "Sm", price: "$6.49" }, { size: "Med", price: "$9.49" }, { size: "Lg", price: "$13.49" }] },
  { name: "Antipasto Salad", desc: "2 Types of Olives, Tomatoes, Cucumbers, Onions, Feta & Tzatziki", prices: [{ size: "Sm", price: "$10.49" }, { size: "Med", price: "$13.49" }, { size: "Lg", price: "$13.49" }] },
  { name: "Egg's Chef Salad", price: "$13.49" },
  { name: "Blackened Chicken Salad", price: "$13.49" },
  { name: "Buffalo Crispy Chicken Salad", price: "$13.49" },
  { name: "Crispy Chicken Salad", price: "$13.49" },
  { name: "Chicken Caesar Salad", price: "$13.49" },
  { name: "Mediterranean Salad", price: "$13.49" },
  { name: "Greek Salad", desc: "Olives, Feta & Tzatziki", price: "$13.49" },
  { name: "Napoli Italian Chopped Salad", price: "$15.49" },
  { name: "Gyro Salad", desc: "2 Types of Olives, Tomatoes, Cucumbers, Onions, Feta & Tzatziki", price: "$15.49" },
  { name: "Spinach Salad", desc: "Baby Spinach, Boiled Eggs, Bacon, Tomato & Bacon Dressing", price: "$14.49" },
  { name: "Caesar Salad", prices: [{ size: "Sm", price: "$9.49" }, { size: "Lg", price: "$13.49" }] },
  { name: "Steak Salad (Sirloin Beef Flap)", desc: "Lettuce W/ Marinated Strips, red onion, tomatoes, pepperoncini & Feta Cheese", price: "$16.49", highlight: true },
];

// ── LUNCH SPECIALS ─────────────────────────────────────────
export const LUNCH_SPECIALS = {
  note: "Monday–Friday 9AM–3PM Only · FREE Can of Soda with any Lunch Special",
  items: [
    { num: 1, name: "Triple Decker BLT + Fries", price: "$10.49" },
    { num: 2, name: "Stromboli or Calzone", price: "$13.49" },
    { num: 3, name: "10\" Pizza 1 Topping", price: "$10.49" },
    { num: 4, name: "Meatball, Sausage or Ham Sub + Fries", price: "$10.49" },
    { num: 5, name: "3 Chicken Fingers + Fries", price: "$12.49" },
    { num: 6, name: "Manicotti, Ravioli or Stuffed Shells + Garlic Bread", price: "$12.49" },
    { num: 7, name: "Lasagna + Garlic Bread", price: "$15.49" },
    { num: 8, name: "2 Slices of Cheese or Pepperoni Pizza", price: "$9.49" },
    { num: 9, name: "Spaghetti & Meatballs or Sausage + Garlic Bread", price: "$13.49" },
    { num: 10, name: "Philly Cheesesteak + Fries", price: "$12.49" },
    { num: 11, name: "1/2 Pound Cheeseburger + Fries", price: "$12.49" },
    { num: 12, name: "Eggplant Parmigiana Spaghetti + Garlic Bread", price: "$12.49" },
    { num: 13, name: "6 Wings + Dinner Salad", price: "$11.49" },
    { num: 14, name: "Hot Pastrami + Fries", price: "$12.49" },
    { num: 15, name: "Grilled Sausage & Peppers Sub + Fries", price: "$12.49" },
    { num: 16, name: "10 Wings + Fries", price: "$15.49" },
    { num: 17, name: "Antipasto Salad + Garlic Bread", price: "$12.49" },
    { num: 18, name: "Blackened Chicken Salad + Garlic Bread", price: "$12.49" },
    { num: 19, name: "1 Slice Cheese or Pepperoni + 6 Boneless Wings", price: "$12.49" },
    { num: 20, name: "Chicken Caesar Salad + Garlic Bread", price: "$12.49" },
    { num: 21, name: "Nutella Pizza", price: "$13.49" },
    { num: 22, name: "Greek Salad + Garlic Bread", price: "$12.49" },
    { num: 23, name: "Chef Salad + Garlic Bread", price: "$12.49" },
    { num: 24, name: "Chicken or Lamb Gyro + Fries", price: "$12.49" },
  ],
};

// ── PIZZERIA — Hand Tossed "New York" Style ────────────────
export const PIZZA_SIZES = ["10\"", "14\"", "16\"", "18\"", "24\"", "28\"", "30\"", "36\""];

export const PIZZA_BASE_PRICES = {
  "Plain Cheese": ["$9.49", "$14.99", "$17.49", "$20.49", "$27.49", "$38.49", "$42.49", "$71.49"],
  "Add Topping": ["$2.25", "$2.75", "$3.00", "$3.50", "$4.50", "$5.50", "$6.00", "$9.75"],
  "4 Topping Combo": ["$14.49", "$21.49", "$25.49", "$27.49", "$34.49", "$46.49", "$52.49", "$86.49"],
};

export const PIZZA_30_TOPPINGS = [
  "Anchovies", "Artichoke Hearts", "Fresh Basil", "Black Olives", "Broccoli", "Zucchini", "Capicola",
  "Cheddar Cheese", "Grilled Chicken", "Chorizo", "Eggplant", "Fresh Garlic", "Green Olives", "Green Peppers",
  "Ground Beef", "Ham", "Italian Sausage", "Jalapeños", "Meatballs", "Mushrooms", "Onions", "Pepperoni",
  "Pineapple", "Red Roasted Peppers", "Salami", "Spinach", "Tomatoes", "Canadian Bacon",
];

export const PIZZA_SPECIALS = [
  { name: "BBQ Chicken", desc: "Chicken, Red Onions, Spice Honey BBQ Sauce" },
  { name: "Buffalo Chicken", desc: "Chicken, Mozzarella, Buffalo & Ranch Sauce" },
  { name: "3 Cheese", desc: "Mozzarella, Ricotta, Provolone, Feta, Parmesan Cheese" },
  { name: "Chicken Alfredo", desc: "Chicken, Mozzarella, Mushrooms, Alfredo Sauce" },
  { name: "Deluxe", desc: "Pastrami, Chicken, Green & Black Olives, Cilantro, Red Onions" },
  { name: "Greek", desc: "Chicken, Green & Black Olives, Tomatoes, Garlic, Oregano, Sprinkled w/ Feta" },
  { name: "Italian", desc: "Pepperoni, Sausage, Tomatoes, Artichoke Hearts, Garlic" },
  { name: "Meat Lover", desc: "Pepperoni, Sausage, Ham, Metball" },
  { name: "Mexican Style", desc: "Pepperoni, Beef, Chorizo, Jalapeños, White Onions, Cilantro" },
  { name: "Napoli's Special", desc: "Pepperoni, Bacon, Black Olives, Feta" },
  { name: "Pesto Chicken", desc: "Chicken, Mozzarella Cheese, Red Onions, Roasted Red Peppers, Mushrooms, Pesto Sauce" },
  { name: "Ranch", desc: "Crispy Chicken, Mozzarella, Ranch" },
  { name: "Southwestern Chicken", desc: "Chicken, Bell Peppers, Red Onion, Tomatoes, Jalapeños, Cilantro, Mozzarella, Cheddar" },
  { name: "Supreme", desc: "Pepperoni, Sausage, Mushrooms, White Onions, Black Olives, Green Peppers" },
  { name: "Taco", desc: "Taco Meat, Cheddar Cheese, Shredded Lettuce, Tomatoes, Salsa, Jalapeños" },
  { name: "Vegetarian", desc: "Mushrooms, Green Peppers, White Onions, Black Olives, Tomatoes" },
  { name: "White Pizza", desc: "Garlic, Ricotta, Mozzarella, Provolone, No Sauce" },
];

// Gluten Free Pizza 14" $12.75
// Sicilian 12x8: 4 Topping Combo $37.99, Add Topping $3.50

// ── STUFFED DOUGH ──────────────────────────────────────────
export const STUFFED_DOUGH = [
  {
    name: "Stuffed Chicago Deep Dish",
    price: "$29.99 each",
    extraTopping: "Topping $6.50",
    combo: "4 Topping Combo $43.99",
  },
  {
    name: "Calzone",
    desc: "Ricotta, Mozzarella, & Choice of 2 Toppings",
    sizes: ["10\"", "14\"", "16\"", "18\"", "24\"", "28\""],
    prices: ["$13.49", "$19.49", "$23.49", "$25.49", "$35.49", "$39.49"],
  },
  {
    name: "Stromboli",
    desc: "Pepperoni, Ham, Green Peppers, Onions, Mozzarella, or Choice of 4 Toppings",
    sizes: ["10\"", "14\"", "16\"", "18\"", "24\"", "28\""],
    prices: ["$15.49", "$19.49", "$23.49", "$25.49", "$35.49", "$43.49"],
  },
];

// ── WRAPS ──────────────────────────────────────────────────
export const WRAPS = {
  note: "Choice of Flour or Wheat Bread w/ Lettuce, Tomatoes, Onions & Mayo. Gluten Free Bread Available.",
  price: "$12.49",
  items: ["Grilled Chicken Caesar", "Crispy Chicken", "Buffalo Chicken"],
};

// ── WINGS ──────────────────────────────────────────────────
export const WINGS = {
  note: "Includes Ranch or Extra Sauce. Ranch or Extra Sauce 2oz $1.49 · 6oz $2.49",
  flavors: ["Plain", "Mild", "Medium", "Hot", "BBQ", "Spicy Honey BBQ", "Lemon Pepper", "Teriyaki", "Spicy Teriyaki", "Sweet Red Chili", "Mango Habanero"],
  boneIn: [
    { qty: "6pc", price: "$11.49", addFries: "$2" },
    { qty: "10pc", price: "$15.49", addFries: "$2" },
    { qty: "20pc", price: "$25.49", addFries: "$2" },
    { qty: "40pc", price: "$56.49", addFries: "$4" },
    { qty: "80pc", price: "$108.49", addFries: "$4" },
  ],
  boneless: [
    { qty: "6pc", price: "$9.49", addFries: "$2" },
    { qty: "10pc", price: "$13.49", addFries: "$2" },
    { qty: "20pc", price: "$26.49", addFries: "$2" },
    { qty: "40pc", price: "$47.49", addFries: "$4" },
    { qty: "80pc", price: "$89.49", addFries: "$4" },
  ],
  chickenFingers: [
    { qty: "5pc", price: "$13.49", addFries: "$2" },
    { qty: "10pc", price: "$22.49", addFries: "$2" },
    { qty: "20pc", price: "$40.49", addFries: "$2" },
    { qty: "40pc", price: "$75.49", addFries: "$4" },
    { qty: "80pc", price: "$144.49", addFries: "$4" },
  ],
};

// ── PASTA ──────────────────────────────────────────────────
export const PASTA = {
  note: "Served w/ Garlic Bread & House Salad",
  wholeLottaPrice: "$23.49",
  wholeLottaItems: ["Cannelloni", "Ravioli", "Stuffed Shells", "Manicotti"],
  classic: [
    { name: "Spaghetti & Meatballs", price: "$16.49" },
    { name: "Spaghetti & Sausage", price: "$16.49" },
    { name: "Baked Ziti", price: "$19.99" },
    { name: "Ziti w/ Marinara", price: "$13.49" },
    { name: "Chicken Parmigiana", price: "$20.49" },
    { name: "Homemade Shells", price: "" },
    { name: "Manicotti w/ Ricotta & Egg", price: "$17.49" },
    { name: "Cannelloni $17.49", price: "" },
    { name: "Fettuccine Alfredo", price: "$19.99" },
    { name: "Chicken Fettuccine Alfredo", price: "$22.99" },
    { name: "Shrimp & Chicken Fettuccine Alfredo", price: "$24.99" },
    { name: "Stuffed Shells w/ Ricotta", price: "$17.49" },
  ],
  ravioli: [
    { name: "Creamy Butter Ravioli", price: "$16.49" },
    { name: "Marinara Ravioli", price: "$16.49" },
    { name: "Baked Ravioli", price: "$19.99" },
    { name: "Ravioli Bolognese (Sauteed)", price: "$19.99" },
    { name: "Spaghetti w/ Marinara", price: "$13.49" },
  ],
  tortellini: [
    { name: "Tortellini w/ Marinara", price: "$19.99" },
    { name: "Tortellini Ala Parma", price: "$19.99" },
    { name: "Tortellini Alfredo", price: "$20.49" },
    { name: "Ravioli Bolognese (Sauteed)", price: "$19.99" },
    { name: "Alfredo, Chicken, Garlic & Broccoli", price: "" },
  ],
  parmigiana: [
    { name: "Eggplant Parmigiana", price: "$17.49" },
    { name: "Chicken Parmigiana", price: "$20.49" },
  ],
};

// ── SUB SANDWICHES ─────────────────────────────────────────
export const SUBS = {
  note: "Choice of Fries, Coleslaw, Potato Salad, Pasta Salad or Side Salad. Add Avocado or Add Cheese $1.00. Gluten Free Bread Available.",
  cold: [
    { name: "Napoli Italian Special", price: "$12.49" },
    { name: "Ham & Cheese", price: "$12.49" },
    { name: "Fried Chicken", price: "$12.49" },
    { name: "Turkey & Cheese", price: "$12.49" },
  ],
  hotDetailed: [
    { name: "Buffalo Chicken Breast", add: "Add Cheese $1", price: "$12.49" },
    { name: "Crispy Chicken", add: "Add Cheese $1", price: "$12.49" },
    { name: "Grilled Sausage & Peppers", price: "$12.49" },
    { name: "Fried Chicken", add: "Add Cheese $1", price: "$12.49" },
    { name: "California Turkey", add: "Add $1", price: "$12.49" },
    { name: "Philly Steak Bomb", add: "Add $2", desc: "Crispy Onions, Cheesy Mustard, Bacon, Cheddar", price: "$12.49" },
    { name: "Watertown", price: "$12.49" },
    { name: "Newton", price: "$12.49" },
    { name: "Meatball Parmigiana", price: "$12.49" },
    { name: "Meatball & Sausage Parmigiana", price: "$12.49" },
    { name: "Eggplant Parmigiana", price: "$12.49" },
    { name: "Beef or Chicken Philly", price: "$12.49" },
  ],
};

// ── BURGERS ────────────────────────────────────────────────
export const BURGERS = {
  note: "100% Angus Beef. Cheese, Lettuce, Tomatoes, Onions, Pickles & Mayo. Choice of 1 Side. Add Cheese $1, Add Bacon $1, Add Avocado $1. Gluten Free Bread Available.",
  items: [
    { name: "Hamburger", half: "$11.49", single: "$14.49" },
    { name: "Cheeseburger", half: "$12.49", single: "$15.49" },
    { name: "Bacon Burger", half: "$12.49", single: "$15.49" },
    { name: "Chili Cheese", half: "$13.49", single: "$16.49" },
    { name: "Blue Beef & Cheese", half: "$13.49", single: "$16.49" },
    { name: "Crispy Chicken Burger", half: "$13.49", single: "$16.49" },
    { name: "Bacon Cheeseburger", half: "$13.49", single: "$16.49" },
    { name: "Napoli's 1000 Island", desc: "Cheddar, House Sauce Southwestern", half: "$13.49", single: "$16.49" },
    { name: "Mexican Style", desc: "Bacon, Tomato & Bacon Dressing", half: "$13.49", single: "$16.49" },
    { name: "Napoli Cheeseburger", half: "$13.49", single: "$16.49" },
    { name: "Sunrise", desc: "Egg & Bacon", half: "$13.49", single: "$16.49" },
    { name: "Greek", half: "$13.49", single: "$16.49" },
    { name: "Pastrami", desc: "Swiss Cheese & Mustard", half: "$14.49", single: "$17.49" },
    { name: "Texas", desc: "Bacon, BBQ Sauce, Cheddar", half: "$13.49", single: "$16.49" },
    { name: "Southwestern", desc: "Avocado, Salsa, Jalapeños, Cheddar", half: "$13.49", single: "$16.49" },
  ],
};

// ── TRIPLE DECKERS ─────────────────────────────────────────
export const TRIPLE_DECKERS = {
  note: "Choice of Fries, Coleslaw, Potato Salad, Pasta Salad or Side Salad. Lettuce, Tomatoes & Mayo. Gluten Free Bread Available.",
  items: [
    { name: "Turkey", price: "$11.49" },
    { name: "Chicken or Turkey & Bacon", price: "$12.49" },
    { name: "Chicken & Bacon", price: "$13.49" },
  ],
};

// ── DESSERTS ───────────────────────────────────────────────
export const DESSERTS = {
  price: "$5.99",
  items: [
    "Zeppolis (20) – Sugar or Cinnamon",
    "Red Velvet Cake",
    "Eclair",
    "Brownie (1)",
    "Fresh Cannoli (1)",
    "Baklava",
    "Plain Cheesecake",
    "Strawberry Cheesecake",
    "Caramel Cheesecake",
    "Nutella Cheesecake",
    "Tiramisu",
    "Chocolate Cake",
    "Carrot Cake",
  ],
};

// ── CHILDREN'S MENU ────────────────────────────────────────
export const CHILDRENS_MENU = {
  price: "$8.49",
  items: [
    "Chicken Fingers (3) w/ Fries",
    "Grilled Cheese w/ Fries",
    "Ziti w/ Marinara or Butter",
    "Macaroni & Cheese w/ Fries",
    "Dinosaur Nugget w/ Fries",
    "Spaghetti w/ Marinara or Butter",
  ],
};

// ── BEVERAGES ──────────────────────────────────────────────
export const BEVERAGES = [
  { name: "Soda Can", price: "$1.49" },
  { name: "Glass Bottle Soda", price: "$3.49" },
  { name: "Perrier (11.5oz)", price: "$3.49" },
  { name: "Bottled Water", price: "$1.49" },
  { name: "2 Liter (Coke, Diet Coke, Coke Zero, Dr. Pepper, Sprite, Root Beer, Orange Fanta, Ginger Ale)", price: "$5.99" },
  { name: "Gold Peak Iced Tea (Green Tea, Raspberry, Black Sweetened or Unsweetened)", prices: [{ size: "20oz", price: "$4.49" }, { size: "32oz", price: "$5.49" }] },
  { name: "Root Beer Float – Over 100 Flavors", prices: [{ size: "20oz", price: "$6.49" }, { size: "32oz", price: "$9.49" }] },
  { name: "Handspun Frozen Custard Milkshake (Vanilla, Strawberry, Oreos, Peanut Butter, Chocolate)", price: "$8.49", size: "20oz" },
  { name: "Wine & Beer", note: "For Dine-In Only" },
];

// ── ANYTIME SPECIALS ───────────────────────────────────────
export const ANYTIME_SPECIALS = [
  { num: 1, name: "Two 16\" Pizzas 1 Topping", price: "$32.99" },
  { num: 2, name: "28\" Pizza 4 Toppings + (1) 2 Liter Soda", price: "$45.99" },
  { num: 3, name: "18\" Pizza 2 Toppings", price: "$22.99" },
  { num: 4, name: "14\" Cheese Pizza + Spaghetti & Meatballs + Garlic Bread + (1) 2 Liter Soda", price: "$30.99" },
  { num: 5, name: "24\" Cheese Pizza + 20 Wings + (1) 2 Liter Soda", price: "$52.99" },
  { num: 6, name: "6 Fingers + 20 Wings + 16\" Pizza 1 Topping + (1) 2 Liter Soda", price: "$63.99" },
  { num: 7, name: "Two 16\" Pizzas 2 Toppings/ea + (1) 2 Liter Soda", price: "$39.99" },
  { num: 8, name: "16\" Pizza 1 Topping + 1 Lasagna + House Salad + Garlic Bread + (1) 2 Liter Soda", price: "$39.99" },
  { num: 9, name: "16\" Pizza 1 Topping + 20 Wings + (1) 2 Liter Soda", price: "$43.99" },
  { num: 10, name: "16\" Pizza 1 Topping + 10 Fingers + (1) 2 Liter Soda", price: "$40.99" },
  { num: 11, name: "28\" Pizza 1 Topping + 40 Wings + Two 2 Liter Sodas", price: "$93.99" },
  { num: 12, name: "10\" Pizza 4 Toppings + 40 Wings + 20 Fingers + Two Lg Fries + Two 2 Liter Sodas", price: "$131.99" },
  { num: 13, name: "16\" Specialty Pizza + 20 Wings + (1) 2 Liter Soda", price: "$55.99" },
  { num: 14, name: "18\" Pizza 1 Topping + 20 Wings + Antipasto or Chef Salad + (1)", price: "$55.99" },
  { num: 15, name: "Two 18\" Pizzas 2 Toppings + Two 2 Liter Sodas", price: "$100.99" },
  { num: 16, name: "14\" Pizza 1 Topping + 10 Wings + (1) 2 Liter Soda", price: "$33.99" },
  { num: 17, name: "14\" Pizza 1 Topping + 10 Wings + 5 Fingers", price: "$38.99" },
  { num: 18, name: "16\" Pizza 1 Topping + 20 Wings + 10 Fingers + (1) 2 Liter Soda", price: "$70.99" },
  { num: 19, name: "36\" Pizza 4 Toppings + 40 Wings + Garlic Balls + Two 2 Liter Sodas", price: "$129.99" },
];

// ── MENU CATEGORIES (for nav) ──────────────────────────────
export const MENU_CATEGORIES = [
  { id: "appetizers", label: "Appetizers", emoji: "🧅" },
  { id: "lunch", label: "Lunch Specials", emoji: "🕙" },
  { id: "pizza", label: "Pizzeria", emoji: "🍕" },
  { id: "wings", label: "Wings", emoji: "🍗" },
  { id: "pasta", label: "Pasta", emoji: "🍝" },
  { id: "subs", label: "Subs & Sandwiches", emoji: "🥖" },
  { id: "burgers", label: "Burgers", emoji: "🍔" },
  { id: "salads", label: "Salads", emoji: "🥗" },
  { id: "desserts", label: "Desserts", emoji: "🍰" },
  { id: "childrens", label: "Children's Menu", emoji: "🧒" },
  { id: "beverages", label: "Beverages", emoji: "🥤" },
  { id: "specials", label: "Anytime Specials", emoji: "⭐" },
];
