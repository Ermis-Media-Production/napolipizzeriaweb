/**
 * Napoli Pizzeria — Spanish translations for all menu items
 * Key = English item name (exact match from napoliData.ts)
 * Value = { name: Spanish name, desc?: Spanish description }
 */

export const MENU_TRANSLATIONS_ES: Record<string, { name: string; desc?: string }> = {
  // ── APPETIZERS ──────────────────────────────────────────────────────────────
  "Garlic Bread (12)": { name: "Pan de Ajo (12)" },
  "Garlic Bread w/ Cheese (12)": { name: "Pan de Ajo con Queso (12)" },
  "Garlic Balls (12)": { name: "Bolitas de Ajo (12)" },
  "Mozzarella Sticks (8)": { name: "Palitos de Mozzarella (8)" },
  "Chicken Fingers (3)": { name: "Dedos de Pollo (3)" },
  "Chicken Fingers (5)": { name: "Dedos de Pollo (5)" },
  "Chicken Fingers (10)": { name: "Dedos de Pollo (10)" },
  "Curly Fries": { name: "Papas Rizadas" },
  "Curly Fries W/ Bacon": { name: "Papas Rizadas con Tocino" },
  "Breaded Mushrooms (12)": { name: "Champiñones Empanizados (12)" },
  "Fried Ravioli (8)": { name: "Ravioli Frito (8)" },
  "Zucchini Sticks (12)": { name: "Palitos de Calabacín (12)" },
  "Jalapeño Poppers (6)": { name: "Jalapeños Rellenos (6)" },
  "Cheese Quesadilla": { name: "Quesadilla de Queso", desc: "Agregar Pollo +$2" },
  "Chili Cheese Fries": { name: "Papas con Chili y Queso" },
  "Bruschetta": { name: "Bruschetta" },
  "Onion Rings": { name: "Aros de Cebolla" },

  // ── SIDES ───────────────────────────────────────────────────────────────────
  "Potato Salad, Coleslaw, Pasta Salad, Side Salad, Sweet Potato Fries or Baked Beans": {
    name: "Ensalada de Papa, Coleslaw, Ensalada de Pasta, Ensalada, Papas Dulces o Frijoles Horneados",
  },
  "Meatballs (2)": { name: "Albóndigas (2)" },
  "Sausage (2)": { name: "Salchicha (2)" },
  "Marinara w/ Beef": { name: "Marinara con Carne" },

  // ── SOUPS ───────────────────────────────────────────────────────────────────
  "Lentil, Bowl of Chili, Chicken Noodle, Cream of Broccoli or Minestrone": {
    name: "Lentejas, Chili, Sopa de Pollo con Fideos, Crema de Brócoli o Minestrone",
  },

  // ── SALADS ──────────────────────────────────────────────────────────────────
  "Dinner Side Salad": {
    name: "Ensalada de Acompañamiento",
    desc: "Aderezos: Italiano, Italiano Sin Grasa, Ranch, Queso Azul, 1000 Islas, Miel Mostaza, César, Francés, Aceite y Vinagre Balsámico, Vinagreta",
  },
  "Antipasto Salad": {
    name: "Ensalada Antipasto",
    desc: "2 Tipos de Aceitunas, Tomates, Pepinos, Cebollas, Feta y Tzatziki",
  },
  "Egg's Chef Salad": { name: "Ensalada del Chef con Huevo" },
  "Blackened Chicken Salad": { name: "Ensalada de Pollo a la Parrilla" },
  "Buffalo Crispy Chicken Salad": { name: "Ensalada de Pollo Crujiente Buffalo" },
  "Crispy Chicken Salad": { name: "Ensalada de Pollo Crujiente" },
  "Chicken Caesar Salad": { name: "Ensalada César con Pollo" },
  "Mediterranean Salad": { name: "Ensalada Mediterránea" },
  "Greek Salad": { name: "Ensalada Griega", desc: "Aceitunas, Feta y Tzatziki" },
  "Napoli Italian Chopped Salad": { name: "Ensalada Italiana Picada Napoli" },
  "Gyro Salad": {
    name: "Ensalada Gyro",
    desc: "2 Tipos de Aceitunas, Tomates, Pepinos, Cebollas, Feta y Tzatziki",
  },
  "Spinach Salad": {
    name: "Ensalada de Espinaca",
    desc: "Espinaca Baby, Huevos Cocidos, Tocino, Tomate y Aderezo de Tocino",
  },
  "Caesar Salad": { name: "Ensalada César" },
  "Steak Salad (Sirloin Beef Flap)": {
    name: "Ensalada de Bistec (Sirloin)",
    desc: "Lechuga con Tiras Marinadas, Cebolla Roja, Tomates, Pepperoncini y Queso Feta",
  },

  // ── PIZZA SPECIALS ──────────────────────────────────────────────────────────
  "BBQ Chicken": { name: "Pollo BBQ", desc: "Pollo, Cebolla Morada, Salsa BBQ con Miel Picante" },
  "Buffalo Chicken": { name: "Pollo Buffalo", desc: "Pollo, Mozzarella, Salsa Buffalo y Ranch" },
  "3 Cheese": { name: "3 Quesos", desc: "Mozzarella, Ricotta, Provolone, Feta, Queso Parmesano" },
  "Chicken Alfredo": { name: "Pollo Alfredo", desc: "Pollo, Mozzarella, Champiñones, Salsa Alfredo" },
  "Deluxe": {
    name: "Deluxe",
    desc: "Pastrami, Pollo, Aceitunas Verdes y Negras, Cilantro, Cebolla Morada",
  },
  "Greek": {
    name: "Griega",
    desc: "Pollo, Aceitunas Verdes y Negras, Tomates, Ajo, Orégano, con Feta",
  },
  "Italian": {
    name: "Italiana",
    desc: "Pepperoni, Salchicha, Tomates, Corazones de Alcachofa, Ajo",
  },
  "Meat Lover": { name: "Amante de la Carne", desc: "Pepperoni, Salchicha, Jamón, Albóndiga" },
  "Mexican Style": {
    name: "Estilo Mexicano",
    desc: "Pepperoni, Carne, Chorizo, Jalapeños, Cebolla Blanca, Cilantro",
  },
  "Napoli's Special": {
    name: "Especial de Napoli",
    desc: "Pepperoni, Tocino, Aceitunas Negras, Feta",
  },
  "Pesto Chicken": {
    name: "Pollo al Pesto",
    desc: "Pollo, Mozzarella, Cebolla Morada, Pimientos Rojos Asados, Champiñones, Salsa Pesto",
  },
  "Ranch": { name: "Ranch", desc: "Pollo Crujiente, Mozzarella, Ranch" },
  "Southwestern Chicken": {
    name: "Pollo Suroeste",
    desc: "Pollo, Pimientos, Cebolla Morada, Tomates, Jalapeños, Cilantro, Mozzarella, Cheddar",
  },
  "Supreme": {
    name: "Suprema",
    desc: "Pepperoni, Salchicha, Champiñones, Cebolla Blanca, Aceitunas Negras, Pimientos Verdes",
  },
  "Taco": {
    name: "Taco",
    desc: "Carne para Taco, Queso Cheddar, Lechuga Rallada, Tomates, Salsa, Jalapeños",
  },
  "Vegetarian": {
    name: "Vegetariana",
    desc: "Champiñones, Pimientos Verdes, Cebolla Blanca, Aceitunas Negras, Tomates",
  },
  "White Pizza": {
    name: "Pizza Blanca",
    desc: "Ajo, Ricotta, Mozzarella, Provolone, Sin Salsa",
  },
  "Stuffed Chicago Deep Dish": { name: "Chicago Deep Dish Rellena" },
  "Calzone": { name: "Calzone" },
  "Stromboli": { name: "Stromboli" },
  "Sicilian 12x8": { name: "Siciliana 12x8" },

  // ── PASTA ───────────────────────────────────────────────────────────────────
  "Spaghetti & Meatballs": { name: "Espagueti con Albóndigas" },
  "Spaghetti & Sausage": { name: "Espagueti con Salchicha" },
  "Baked Ziti": { name: "Ziti al Horno" },
  "Ziti w/ Marinara": { name: "Ziti con Marinara" },
  "Chicken Parmigiana": { name: "Pollo a la Parmesana" },
  "Homemade Shells": { name: "Conchas Caseras" },
  "Manicotti w/ Ricotta & Egg": { name: "Manicotti con Ricotta y Huevo" },
  "Cannelloni": { name: "Canelones" },
  "Fettuccine Alfredo": { name: "Fettuccine Alfredo" },
  "Chicken Fettuccine Alfredo": { name: "Fettuccine Alfredo con Pollo" },
  "Shrimp & Chicken Fettuccine Alfredo": { name: "Fettuccine Alfredo con Camarones y Pollo" },
  "Stuffed Shells w/ Ricotta": { name: "Conchas Rellenas con Ricotta" },
  "Creamy Butter Ravioli": { name: "Ravioli con Mantequilla Cremosa" },
  "Marinara Ravioli": { name: "Ravioli con Marinara" },
  "Baked Ravioli": { name: "Ravioli al Horno" },
  "Ravioli Bolognese (Sauteed)": { name: "Ravioli Boloñesa (Salteado)" },
  "Spaghetti w/ Marinara": { name: "Espagueti con Marinara" },
  "Tortellini w/ Marinara": { name: "Tortellini con Marinara" },
  "Tortellini Ala Parma": { name: "Tortellini a la Parma" },
  "Tortellini Alfredo": { name: "Tortellini Alfredo" },
  "Alfredo, Chicken, Garlic & Broccoli": { name: "Alfredo con Pollo, Ajo y Brócoli" },
  "Eggplant Parmigiana": { name: "Berenjena a la Parmesana" },
  "Napoli Italian Special": { name: "Especial Italiano Napoli" },

  // ── SUBS & SANDWICHES ───────────────────────────────────────────────────────
  "Ham & Cheese": { name: "Jamón y Queso" },
  "Fried Chicken": { name: "Pollo Frito" },
  "Turkey & Cheese": { name: "Pavo y Queso" },
  "Buffalo Chicken Breast": { name: "Pechuga de Pollo Buffalo" },
  "Crispy Chicken": { name: "Pollo Crujiente" },
  "Grilled Sausage & Peppers": { name: "Salchicha a la Parrilla con Pimientos" },
  "California Turkey": { name: "Pavo California" },
  "Philly Steak Bomb": {
    name: "Philly Steak Bomb",
    desc: "Cebollas Crujientes, Mostaza con Queso, Tocino, Cheddar",
  },
  "Watertown": { name: "Watertown" },
  "Newton": { name: "Newton" },
  "Meatball Parmigiana": { name: "Albóndiga a la Parmesana" },
  "Meatball & Sausage Parmigiana": { name: "Albóndiga y Salchicha a la Parmesana" },
  "Hot Pastrami": { name: "Pastrami Caliente" },
  "Tuna Salad": { name: "Ensalada de Atún" },
  "Grilled Sausage & Peppers Sub": { name: "Sub de Salchicha a la Parrilla con Pimientos" },

  // ── BURGERS ─────────────────────────────────────────────────────────────────
  "Classic Cheeseburger": { name: "Hamburguesa Clásica con Queso" },
  "Bacon Cheeseburger": { name: "Hamburguesa con Tocino y Queso" },
  "BBQ Bacon Burger": { name: "Hamburguesa BBQ con Tocino" },
  "Mushroom Swiss Burger": { name: "Hamburguesa con Champiñones y Suizo" },
  "Napoli Burger": { name: "Hamburguesa Napoli" },
  "Veggie Burger": { name: "Hamburguesa Vegetal" },
  "Double Smash Burger": { name: "Doble Smash Burger" },

  // ── WRAPS ───────────────────────────────────────────────────────────────────
  "Turkey": { name: "Pavo" },
  "Chicken or Turkey & Bacon": { name: "Pollo o Pavo con Tocino" },
  "Chicken & Bacon": { name: "Pollo con Tocino" },

  // ── DESSERTS ─────────────────────────────────────────────────────────────────
  "Zeppolis (20) – Sugar or Cinnamon": { name: "Zeppolis (20) – Azúcar o Canela" },
  "Red Velvet Cake": { name: "Pastel Red Velvet" },
  "Eclair": { name: "Éclair" },
  "Brownie (1)": { name: "Brownie (1)" },
  "Fresh Cannoli (1)": { name: "Cannoli Fresco (1)" },
  "Baklava": { name: "Baklava" },
  "Plain Cheesecake": { name: "Cheesecake Natural" },
  "Strawberry Cheesecake": { name: "Cheesecake de Fresa" },
  "Caramel Cheesecake": { name: "Cheesecake de Caramelo" },
  "Nutella Cheesecake": { name: "Cheesecake de Nutella" },
  "Tiramisu": { name: "Tiramisú" },
  "Chocolate Cake": { name: "Pastel de Chocolate" },
  "Carrot Cake": { name: "Pastel de Zanahoria" },

  // ── CHILDREN'S MENU ─────────────────────────────────────────────────────────
  "Chicken Fingers (3) w/ Fries": { name: "Dedos de Pollo (3) con Papas" },
  "Grilled Cheese w/ Fries": { name: "Sándwich de Queso a la Plancha con Papas" },
  "Ziti w/ Marinara or Butter": { name: "Ziti con Marinara o Mantequilla" },
  "Macaroni & Cheese w/ Fries": { name: "Macarrones con Queso y Papas" },
  "Dinosaur Nugget w/ Fries": { name: "Nuggets Dinosaurio con Papas" },
  "Spaghetti w/ Marinara or Butter": { name: "Espagueti con Marinara o Mantequilla" },

  // ── BEVERAGES ───────────────────────────────────────────────────────────────
  "Soda Can": { name: "Refresco en Lata" },
  "Glass Bottle Soda": { name: "Refresco en Botella de Vidrio" },
  "Perrier (11.5oz)": { name: "Agua Perrier (11.5oz)" },
  "Bottled Water": { name: "Agua Embotellada" },
  "2 Liter (Coke, Diet Coke, Coke Zero, Dr. Pepper, Sprite, Root Beer, Orange Fanta, Ginger Ale)": {
    name: "2 Litros (Coca-Cola, Coca Light, Coke Zero, Dr. Pepper, Sprite, Root Beer, Fanta Naranja, Ginger Ale)",
  },
  "Gold Peak Iced Tea (Green Tea, Raspberry, Black Sweetened or Unsweetened)": {
    name: "Té Helado Gold Peak (Té Verde, Frambuesa, Negro Dulce o Sin Azúcar)",
  },
  "Root Beer Float – Over 100 Flavors": { name: "Root Beer Float – Más de 100 Sabores" },
  "Handspun Frozen Custard Milkshake (Vanilla, Strawberry, Oreos, Peanut Butter, Chocolate)": {
    name: "Malteada de Helado Artesanal (Vainilla, Fresa, Oreos, Mantequilla de Maní, Chocolate)",
  },
  "Wine & Beer": { name: "Vino y Cerveza" },

  // ── LUNCH SPECIALS ──────────────────────────────────────────────────────────
  "Triple Decker BLT + Fries": { name: "Triple Decker BLT + Papas" },
  "Stromboli or Calzone": { name: "Stromboli o Calzone" },
  "10\" Pizza 1 Topping": { name: "Pizza 10\" 1 Ingrediente" },
  "Meatball, Sausage or Ham Sub + Fries": { name: "Sub de Albóndiga, Salchicha o Jamón + Papas" },
  "3 Chicken Fingers + Fries": { name: "3 Dedos de Pollo + Papas" },
  "Manicotti, Ravioli or Stuffed Shells + Garlic Bread": {
    name: "Manicotti, Ravioli o Conchas Rellenas + Pan de Ajo",
  },
  "Lasagna + Garlic Bread": { name: "Lasaña + Pan de Ajo" },
  "2 Slices of Cheese or Pepperoni Pizza": { name: "2 Rebanadas de Pizza de Queso o Pepperoni" },
  "Spaghetti & Meatballs or Sausage + Garlic Bread": {
    name: "Espagueti con Albóndigas o Salchicha + Pan de Ajo",
  },
  "Philly Cheesesteak + Fries": { name: "Philly Cheesesteak + Papas" },
  "1/2 Pound Cheeseburger + Fries": { name: "Hamburguesa de 1/2 Libra con Queso + Papas" },
  "Eggplant Parmigiana Spaghetti + Garlic Bread": {
    name: "Espagueti con Berenjena a la Parmesana + Pan de Ajo",
  },
  "6 Wings + Dinner Salad": { name: "6 Alitas + Ensalada" },
  "Hot Pastrami + Fries": { name: "Pastrami Caliente + Papas" },
  "Grilled Sausage & Peppers Sub + Fries": {
    name: "Sub de Salchicha a la Parrilla con Pimientos + Papas",
  },
  "10 Wings + Fries": { name: "10 Alitas + Papas" },
  "Antipasto Salad + Garlic Bread": { name: "Ensalada Antipasto + Pan de Ajo" },
  "Blackened Chicken Salad + Garlic Bread": { name: "Ensalada de Pollo a la Parrilla + Pan de Ajo" },
  "1 Slice Cheese or Pepperoni + 6 Boneless Wings": {
    name: "1 Rebanada de Queso o Pepperoni + 6 Alitas sin Hueso",
  },
  "Chicken Caesar Salad + Garlic Bread": { name: "Ensalada César con Pollo + Pan de Ajo" },
  "Nutella Pizza": { name: "Pizza de Nutella" },
  "Greek Salad + Garlic Bread": { name: "Ensalada Griega + Pan de Ajo" },
  "Chef Salad + Garlic Bread": { name: "Ensalada del Chef + Pan de Ajo" },
  "Chicken or Lamb Gyro + Fries": { name: "Gyro de Pollo o Cordero + Papas" },

  // ── ANYTIME SPECIALS ────────────────────────────────────────────────────────
  "Two 16\" Pizzas 1 Topping": { name: "Dos Pizzas 16\" 1 Ingrediente" },
  "28\" Pizza 4 Toppings + (1) 2 Liter Soda": {
    name: "Pizza 28\" 4 Ingredientes + (1) Refresco 2 Litros",
  },
  "18\" Pizza 2 Toppings": { name: "Pizza 18\" 2 Ingredientes" },
  "14\" Cheese Pizza + Spaghetti & Meatballs + Garlic Bread + (1) 2 Liter Soda": {
    name: "Pizza 14\" de Queso + Espagueti con Albóndigas + Pan de Ajo + (1) Refresco 2 Litros",
  },
  "24\" Cheese Pizza + 20 Wings + (1) 2 Liter Soda": {
    name: "Pizza 24\" de Queso + 20 Alitas + (1) Refresco 2 Litros",
  },
  "6 Fingers + 20 Wings + 16\" Pizza 1 Topping + (1) 2 Liter Soda": {
    name: "6 Dedos de Pollo + 20 Alitas + Pizza 16\" 1 Ingrediente + (1) Refresco 2 Litros",
  },
  "Two 16\" Pizzas 2 Toppings/ea + (1) 2 Liter Soda": {
    name: "Dos Pizzas 16\" 2 Ingredientes c/u + (1) Refresco 2 Litros",
  },
  "16\" Pizza 1 Topping + 1 Lasagna + House Salad + Garlic Bread + (1) 2 Liter Soda": {
    name: "Pizza 16\" 1 Ingrediente + 1 Lasaña + Ensalada + Pan de Ajo + (1) Refresco 2 Litros",
  },
  "16\" Pizza 1 Topping + 20 Wings + (1) 2 Liter Soda": {
    name: "Pizza 16\" 1 Ingrediente + 20 Alitas + (1) Refresco 2 Litros",
  },
  "16\" Pizza 1 Topping + 10 Fingers + (1) 2 Liter Soda": {
    name: "Pizza 16\" 1 Ingrediente + 10 Dedos de Pollo + (1) Refresco 2 Litros",
  },
  "28\" Pizza 1 Topping + 40 Wings + Two 2 Liter Sodas": {
    name: "Pizza 28\" 1 Ingrediente + 40 Alitas + Dos Refrescos 2 Litros",
  },
  "10\" Pizza 4 Toppings + 40 Wings + 20 Fingers + Two Lg Fries + Two 2 Liter Sodas": {
    name: "Pizza 10\" 4 Ingredientes + 40 Alitas + 20 Dedos de Pollo + Dos Papas Grandes + Dos Refrescos 2 Litros",
  },
  "16\" Specialty Pizza + 20 Wings + (1) 2 Liter Soda": {
    name: "Pizza Especial 16\" + 20 Alitas + (1) Refresco 2 Litros",
  },
  "18\" Pizza 1 Topping + 20 Wings + Antipasto or Chef Salad + (1)": {
    name: "Pizza 18\" 1 Ingrediente + 20 Alitas + Ensalada Antipasto o del Chef + (1) Refresco",
  },
  "Two 18\" Pizzas 2 Toppings + Two 2 Liter Sodas": {
    name: "Dos Pizzas 18\" 2 Ingredientes + Dos Refrescos 2 Litros",
  },
  "14\" Pizza 1 Topping + 10 Wings + (1) 2 Liter Soda": {
    name: "Pizza 14\" 1 Ingrediente + 10 Alitas + (1) Refresco 2 Litros",
  },
  "14\" Pizza 1 Topping + 10 Wings + 5 Fingers": {
    name: "Pizza 14\" 1 Ingrediente + 10 Alitas + 5 Dedos de Pollo",
  },
  "16\" Pizza 1 Topping + 20 Wings + 10 Fingers + (1) 2 Liter Soda": {
    name: "Pizza 16\" 1 Ingrediente + 20 Alitas + 10 Dedos de Pollo + (1) Refresco 2 Litros",
  },
  "36\" Pizza 4 Toppings + 40 Wings + Garlic Balls + Two 2 Liter Sodas": {
    name: "Pizza 36\" 4 Ingredientes + 40 Alitas + Bolitas de Ajo + Dos Refrescos 2 Litros",
  },

  // ── MENU CATEGORIES ─────────────────────────────────────────────────────────
  "Appetizers": { name: "Aperitivos" },
  "Lunch Specials": { name: "Especiales del Almuerzo" },
  "Pizzeria": { name: "Pizzería" },
  "Wings": { name: "Alitas" },
  "Pasta": { name: "Pasta" },
  "Subs & Sandwiches": { name: "Subs y Sándwiches" },
  "Burgers": { name: "Hamburguesas" },
  "Salads": { name: "Ensaladas" },
  "Desserts": { name: "Postres" },
  "Children's Menu": { name: "Menú Infantil" },
  "Beverages": { name: "Bebidas" },
  "Anytime Specials": { name: "Especiales Todo el Día" },
};

/**
 * Returns the translated name and description for a menu item.
 * Falls back to the English name/desc if no translation exists.
 */
export function translateItem(
  name: string,
  desc: string | undefined,
  lang: "en" | "es"
): { name: string; desc?: string } {
  if (lang === "en") return { name, desc };
  const t = MENU_TRANSLATIONS_ES[name];
  if (!t) return { name, desc };
  return {
    name: t.name,
    desc: t.desc !== undefined ? t.desc : desc,
  };
}

/**
 * Returns the translated category label.
 */
export function translateCategory(label: string, lang: "en" | "es"): string {
  if (lang === "en") return label;
  return MENU_TRANSLATIONS_ES[label]?.name ?? label;
}
