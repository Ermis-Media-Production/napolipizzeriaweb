/**
 * LanguageContext.tsx
 * Provides EN/ES language switching with automatic device language detection.
 * Persists user choice in localStorage. Falls back to English for unsupported locales.
 */
import React, { createContext, useContext, useState, useEffect } from "react";

export type Lang = "en" | "es";

// ── TRANSLATIONS ──────────────────────────────────────────────────────────────
export const T = {
  en: {
    // Navigation
    nav: {
      menu: "Menu",
      specials: "Specials",
      catering: "Catering",
      order: "Order",
      about: "About",
      contact: "Contact",
      orderNow: "Order Now",
    },
    // Menu section headers
    sections: {
      appetizers: "Appetizers",
      lunchSpecials: "Lunch Specials",
      pizza: "Pizza",
      wings: "Wings & Fingers",
      pasta: "Pasta",
      subs: "Subs & Sandwiches",
      wraps: "Wraps",
      burgers: "Burgers",
      salads: "Salads",
      desserts: "Desserts",
      childrens: "Children's Menu",
      beverages: "Beverages",
      specials: "Anytime Specials",
      soups: "Soups",
      sides: "Sides",
    },
    // Common UI
    ui: {
      addToCart: "Add to Cart",
      add: "Add",
      order: "Order",
      viewCart: "View Cart",
      close: "Close",
      next: "Next",
      back: "Back",
      selectSize: "Select Size",
      selectSauce: "Select Sauce",
      selectCut: "Select Cut",
      toppings: "Toppings",
      halfHalf: "Half & Half",
      marinara: "Marinara",
      butter: "Butter",
      included: "Included",
      extra: "Extra",
      freeTopping: "Free topping",
      extraTopping: "Extra topping",
      addFries: "+Fries",
      customize: "Customize",
      popular: "Popular",
      bestValue: "Best Value",
      bestSeller: "Best Seller",
      cal: "cal",
      protein: "protein",
      contains: "Contains:",
      perSlice: "per slice (approx.)",
    },
    // Dietary tags
    diet: {
      V: "Vegetarian",
      VG: "Vegan",
      GF: "Gluten-Free",
      DF: "Dairy-Free",
      HOT: "Spicy",
      BEST: "Best Seller",
    },
    // Allergens
    allergens: {
      milk: "Milk",
      eggs: "Eggs",
      fish: "Fish",
      shellfish: "Shellfish",
      treeNuts: "Tree Nuts",
      peanuts: "Peanuts",
      wheat: "Wheat",
      soy: "Soy",
      sesame: "Sesame",
    },
    // Disclaimer
    disclaimer: {
      title: "⚠️ Allergy & Nutritional Notice:",
      body: "Calorie counts and nutritional values shown are approximate estimates based on standard recipes and may vary depending on portion size, preparation method, and ingredient substitutions. Menu items may contain or come into contact with common allergens including",
      allergenList: "milk, eggs, wheat, soy, peanuts, tree nuts, fish, shellfish, and sesame",
      inform: "If you have a food allergy or dietary restriction, please inform our staff before placing your order.",
      guarantee: "We cannot guarantee that any item is completely free of allergens due to shared kitchen equipment and preparation areas.",
      contact: "For detailed nutritional information or allergen inquiries, please contact us at",
    },
    // Home page
    home: {
      heroTitle: "Authentic Italian",
      heroSubtitle: "Pizza & More",
      heroDesc: "Hand-tossed New York style pizza, fresh pasta, wings, burgers and more — made with love in North Las Vegas.",
      orderOnline: "Order Online",
      viewMenu: "View Full Menu",
      pickupSpecial: "Pick Up Special",
      pickupDesc: "16\" 1-Topping Pizza",
      pickupPrice: "$12.99",
      pickupSub: "Pick Up Only",
    },
    // Order types
    orderTypes: {
      pickup: "Pick Up",
      delivery: "Delivery",
      dineIn: "Dine In",
      catering: "Catering",
    },
    // Cart
    cart: {
      title: "Your Order",
      empty: "Your cart is empty",
      emptyDesc: "Add items from our menu to get started.",
      subtotal: "Subtotal",
      tax: "Tax",
      deliveryFee: "Delivery Fee",
      total: "Total",
      checkout: "Proceed to Checkout",
      continueShopping: "Continue Shopping",
      remove: "Remove",
      qty: "Qty",
    },
    // Checkout
    checkout: {
      title: "Checkout",
      orderType: "Order Type",
      contactInfo: "Contact Information",
      firstName: "First Name",
      lastName: "Last Name",
      phone: "Phone",
      email: "Email",
      address: "Delivery Address",
      street: "Street Address",
      apt: "Apt/Suite (optional)",
      city: "City",
      state: "State",
      zip: "ZIP Code",
      notes: "Special Instructions",
      payment: "Payment",
      placeOrder: "Place Order",
      orderConfirmed: "Order Confirmed!",
      thankYou: "Thank you for your order.",
    },
    // Footer
    footer: {
      hours: "Hours",
      location: "Location",
      phone: "Phone",
      followUs: "Follow Us",
      services: "Services",
      allRights: "All rights reserved.",
      taxNote: "Taxes not included. Prices subject to change without notice.",
    },
  },

  es: {
    nav: {
      menu: "Menú",
      specials: "Especiales",
      catering: "Catering",
      order: "Ordenar",
      about: "Nosotros",
      contact: "Contacto",
      orderNow: "Ordenar Ahora",
    },
    sections: {
      appetizers: "Entradas",
      lunchSpecials: "Especiales de Almuerzo",
      pizza: "Pizza",
      wings: "Alitas y Dedos de Pollo",
      pasta: "Pasta",
      subs: "Subs y Sándwiches",
      wraps: "Wraps",
      burgers: "Hamburguesas",
      salads: "Ensaladas",
      desserts: "Postres",
      childrens: "Menú Infantil",
      beverages: "Bebidas",
      specials: "Especiales Todo el Día",
      soups: "Sopas",
      sides: "Acompañamientos",
    },
    ui: {
      addToCart: "Agregar al Carrito",
      add: "Agregar",
      order: "Ordenar",
      viewCart: "Ver Carrito",
      close: "Cerrar",
      next: "Siguiente",
      back: "Atrás",
      selectSize: "Seleccionar Tamaño",
      selectSauce: "Seleccionar Salsa",
      selectCut: "Seleccionar Corte",
      toppings: "Ingredientes",
      halfHalf: "Mitad y Mitad",
      marinara: "Marinara",
      butter: "Mantequilla",
      included: "Incluido",
      extra: "Extra",
      freeTopping: "Ingrediente gratis",
      extraTopping: "Ingrediente extra",
      addFries: "+Papas Fritas",
      customize: "Personalizar",
      popular: "Popular",
      bestValue: "Mejor Precio",
      bestSeller: "Más Vendido",
      cal: "cal",
      protein: "proteína",
      contains: "Contiene:",
      perSlice: "por rebanada (aprox.)",
    },
    diet: {
      V: "Vegetariano",
      VG: "Vegano",
      GF: "Sin Gluten",
      DF: "Sin Lácteos",
      HOT: "Picante",
      BEST: "Más Vendido",
    },
    allergens: {
      milk: "Leche",
      eggs: "Huevos",
      fish: "Pescado",
      shellfish: "Mariscos",
      treeNuts: "Nueces",
      peanuts: "Cacahuates",
      wheat: "Trigo",
      soy: "Soya",
      sesame: "Ajonjolí",
    },
    disclaimer: {
      title: "⚠️ Aviso de Alérgenos y Nutrición:",
      body: "Las calorías y valores nutricionales mostrados son estimaciones aproximadas basadas en recetas estándar y pueden variar según el tamaño de la porción, el método de preparación y las sustituciones de ingredientes. Los artículos del menú pueden contener o estar en contacto con alérgenos comunes, incluyendo",
      allergenList: "leche, huevos, trigo, soya, cacahuates, nueces, pescado, mariscos y ajonjolí",
      inform: "Si tiene una alergia alimentaria o restricción dietética, por favor informe a nuestro personal antes de realizar su pedido.",
      guarantee: "No podemos garantizar que ningún artículo esté completamente libre de alérgenos debido al equipo de cocina compartido y las áreas de preparación.",
      contact: "Para información nutricional detallada o consultas sobre alérgenos, contáctenos al",
    },
    home: {
      heroTitle: "Italiana Auténtica",
      heroSubtitle: "Pizza y Más",
      heroDesc: "Pizza estilo Nueva York hecha a mano, pasta fresca, alitas, hamburguesas y más — preparadas con amor en North Las Vegas.",
      orderOnline: "Ordenar en Línea",
      viewMenu: "Ver Menú Completo",
      pickupSpecial: "Especial para Llevar",
      pickupDesc: "Pizza 16\" con 1 Ingrediente",
      pickupPrice: "$12.99",
      pickupSub: "Solo para Llevar",
    },
    orderTypes: {
      pickup: "Para Llevar",
      delivery: "Entrega a Domicilio",
      dineIn: "Comer Aquí",
      catering: "Catering",
    },
    cart: {
      title: "Tu Pedido",
      empty: "Tu carrito está vacío",
      emptyDesc: "Agrega artículos del menú para comenzar.",
      subtotal: "Subtotal",
      tax: "Impuesto",
      deliveryFee: "Costo de Entrega",
      total: "Total",
      checkout: "Proceder al Pago",
      continueShopping: "Seguir Comprando",
      remove: "Eliminar",
      qty: "Cant.",
    },
    checkout: {
      title: "Pago",
      orderType: "Tipo de Pedido",
      contactInfo: "Información de Contacto",
      firstName: "Nombre",
      lastName: "Apellido",
      phone: "Teléfono",
      email: "Correo Electrónico",
      address: "Dirección de Entrega",
      street: "Dirección",
      apt: "Apto/Suite (opcional)",
      city: "Ciudad",
      state: "Estado",
      zip: "Código Postal",
      notes: "Instrucciones Especiales",
      payment: "Pago",
      placeOrder: "Realizar Pedido",
      orderConfirmed: "¡Pedido Confirmado!",
      thankYou: "Gracias por su pedido.",
    },
    footer: {
      hours: "Horario",
      location: "Ubicación",
      phone: "Teléfono",
      followUs: "Síguenos",
      services: "Servicios",
      allRights: "Todos los derechos reservados.",
      taxNote: "Impuestos no incluidos. Precios sujetos a cambio sin previo aviso.",
    },
  },
} as const;

// Use a structural type that both en and es satisfy
export type Translations = typeof T[Lang];

// ── CONTEXT ───────────────────────────────────────────────────────────────────
interface LanguageContextType {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: Translations;
}

const LanguageContext = createContext<LanguageContextType>({
  lang: "en",
  setLang: () => {},
  t: T.en,
});

/** Detect device language: returns "es" if Spanish, "en" otherwise */
function detectDeviceLang(): Lang {
  const nav = typeof navigator !== "undefined" ? navigator.language || "" : "";
  return nav.toLowerCase().startsWith("es") ? "es" : "en";
}

const STORAGE_KEY = "napoli_lang";

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    // 1. Check localStorage for user's saved preference
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as Lang | null;
      if (saved === "en" || saved === "es") return saved;
    } catch {}
    // 2. Fall back to device language
    return detectDeviceLang();
  });

  const setLang = (l: Lang) => {
    setLangState(l);
    try {
      localStorage.setItem(STORAGE_KEY, l);
    } catch {}
  };

  // Keep html lang attribute in sync
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  return (
    <LanguageContext.Provider value={{ lang, setLang, t: T[lang] }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
