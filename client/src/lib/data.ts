// TradeVault — Shared mock data for products, suppliers, and categories

export interface Supplier {
  id: string;
  name: string;
  logo: string;
  location: string;
  country: string;
  rating: number;
  reviewCount: number;
  verified: boolean;
  goldSupplier: boolean;
  yearsActive: number;
  responseRate: number;
  responseTime: string;
  description: string;
  specialties: string[];
  totalProducts: number;
  minOrder: string;
  banner: string;
}

export interface Product {
  id: string;
  name: string;
  supplierId: string;
  supplierName: string;
  category: string;
  subcategory: string;
  image: string;
  moq: number;
  moqUnit: string;
  priceRange: { min: number; max: number };
  priceTiers: { qty: string; price: number }[];
  rating: number;
  reviewCount: number;
  tags: string[];
  featured: boolean;
  inStock: boolean;
  leadTime: string;
  description: string;
  specifications: { label: string; value: string }[];
}

export const CATEGORIES = [
  { id: "all", label: "All Categories", icon: "LayoutGrid" },
  { id: "electronics", label: "Electronics", icon: "Cpu" },
  { id: "textiles", label: "Textiles & Apparel", icon: "Shirt" },
  { id: "packaging", label: "Packaging", icon: "Package" },
  { id: "industrial", label: "Industrial", icon: "Factory" },
  { id: "food", label: "Food & Beverage", icon: "Coffee" },
  { id: "beauty", label: "Beauty & Personal Care", icon: "Sparkles" },
  { id: "furniture", label: "Furniture & Decor", icon: "Sofa" },
];

export const MOQ_RANGES = [
  { id: "any", label: "Any MOQ" },
  { id: "1-50", label: "1 – 50 units" },
  { id: "51-200", label: "51 – 200 units" },
  { id: "201-500", label: "201 – 500 units" },
  { id: "500+", label: "500+ units" },
];

export const SUPPLIERS: Supplier[] = [
  {
    id: "apex-tech",
    name: "Apex Tech Manufacturing",
    logo: "https://images.unsplash.com/photo-1560472355-536de3962603?w=80&h=80&fit=crop",
    location: "Shenzhen, Guangdong",
    country: "China",
    rating: 4.8,
    reviewCount: 312,
    verified: true,
    goldSupplier: true,
    yearsActive: 11,
    responseRate: 97,
    responseTime: "< 2 hrs",
    description: "Apex Tech Manufacturing is a leading OEM/ODM electronics supplier specializing in consumer electronics, IoT devices, and industrial components. With ISO 9001 certification and 11 years of export experience, we serve over 40 countries worldwide.",
    specialties: ["Consumer Electronics", "IoT Devices", "PCB Assembly", "Custom OEM"],
    totalProducts: 284,
    minOrder: "$500",
    banner: "https://d2xsxph8kpxj0f.cloudfront.net/310519663690084073/brxvWsWYfwFxoqeFg9Rbqu/tradevault-supplier-banner-LuVFn8j3PzEAZDGe5aGbB9.webp",
  },
  {
    id: "meridian-textiles",
    name: "Meridian Textiles Group",
    logo: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=80&h=80&fit=crop",
    location: "Tirupur, Tamil Nadu",
    country: "India",
    rating: 4.6,
    reviewCount: 189,
    verified: true,
    goldSupplier: false,
    yearsActive: 8,
    responseRate: 94,
    responseTime: "< 4 hrs",
    description: "Meridian Textiles Group is a vertically integrated textile manufacturer offering premium fabrics, garments, and custom apparel solutions. GOTS certified and committed to sustainable production practices.",
    specialties: ["Organic Cotton", "Custom Apparel", "Fabric Rolls", "Private Label"],
    totalProducts: 156,
    minOrder: "$300",
    banner: "https://d2xsxph8kpxj0f.cloudfront.net/310519663690084073/brxvWsWYfwFxoqeFg9Rbqu/tradevault-product-textiles-PX5GDJf5xeNgnhEMupt3sv.webp",
  },
  {
    id: "packpro-solutions",
    name: "PackPro Solutions",
    logo: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=80&h=80&fit=crop",
    location: "Dongguan, Guangdong",
    country: "China",
    rating: 4.7,
    reviewCount: 241,
    verified: true,
    goldSupplier: true,
    yearsActive: 6,
    responseRate: 99,
    responseTime: "< 1 hr",
    description: "PackPro Solutions delivers innovative packaging solutions for retail, e-commerce, and food industries. Specializing in eco-friendly materials, custom printing, and high-volume production runs.",
    specialties: ["Custom Boxes", "Eco Packaging", "Food-Grade Containers", "Branded Packaging"],
    totalProducts: 198,
    minOrder: "$200",
    banner: "https://d2xsxph8kpxj0f.cloudfront.net/310519663690084073/brxvWsWYfwFxoqeFg9Rbqu/tradevault-product-packaging-cQo3qDP3MvuySjKvNQXHKV.webp",
  },
];

export const PRODUCTS: Product[] = [
  {
    id: "p001",
    name: "Wireless Earbuds TWS Pro — Bulk OEM",
    supplierId: "apex-tech",
    supplierName: "Apex Tech Manufacturing",
    category: "electronics",
    subcategory: "Audio",
    image: "https://d2xsxph8kpxj0f.cloudfront.net/310519663690084073/brxvWsWYfwFxoqeFg9Rbqu/tradevault-product-electronics-bLjjxinLxXRe3SjnEWweKR.webp",
    moq: 100,
    moqUnit: "units",
    priceRange: { min: 8.5, max: 14.0 },
    priceTiers: [
      { qty: "100 – 499", price: 14.0 },
      { qty: "500 – 999", price: 11.5 },
      { qty: "1,000+", price: 8.5 },
    ],
    rating: 4.7,
    reviewCount: 88,
    tags: ["OEM", "Custom Logo", "Bluetooth 5.3"],
    featured: true,
    inStock: true,
    leadTime: "15–20 days",
    description: "Premium TWS wireless earbuds with active noise cancellation, 30-hour battery life, and IPX5 water resistance. Available for OEM/ODM with custom branding, packaging, and firmware.",
    specifications: [
      { label: "Bluetooth Version", value: "5.3" },
      { label: "Battery Life", value: "30 hrs (case)" },
      { label: "Water Resistance", value: "IPX5" },
      { label: "Driver Size", value: "10mm" },
      { label: "Charging", value: "USB-C + Wireless" },
      { label: "Certifications", value: "CE, FCC, RoHS" },
    ],
  },
  {
    id: "p002",
    name: "USB-C Fast Charging Cable — 6ft Braided",
    supplierId: "apex-tech",
    supplierName: "Apex Tech Manufacturing",
    category: "electronics",
    subcategory: "Cables & Accessories",
    image: "https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=600&h=450&fit=crop",
    moq: 500,
    moqUnit: "units",
    priceRange: { min: 0.85, max: 1.8 },
    priceTiers: [
      { qty: "500 – 1,999", price: 1.8 },
      { qty: "2,000 – 4,999", price: 1.2 },
      { qty: "5,000+", price: 0.85 },
    ],
    rating: 4.5,
    reviewCount: 214,
    tags: ["100W PD", "Braided Nylon", "Custom Color"],
    featured: false,
    inStock: true,
    leadTime: "10–14 days",
    description: "Heavy-duty braided USB-C to USB-C cable supporting 100W Power Delivery and 10Gbps data transfer. Available in custom colors and lengths with private label packaging.",
    specifications: [
      { label: "Power Delivery", value: "100W" },
      { label: "Data Transfer", value: "10 Gbps" },
      { label: "Length", value: "6ft / 1.8m" },
      { label: "Material", value: "Nylon Braided" },
      { label: "Compatibility", value: "USB-C Universal" },
      { label: "Certifications", value: "CE, FCC" },
    ],
  },
  {
    id: "p003",
    name: "Organic Cotton Jersey Fabric — 200 GSM",
    supplierId: "meridian-textiles",
    supplierName: "Meridian Textiles Group",
    category: "textiles",
    subcategory: "Fabrics",
    image: "https://d2xsxph8kpxj0f.cloudfront.net/310519663690084073/brxvWsWYfwFxoqeFg9Rbqu/tradevault-product-textiles-PX5GDJf5xeNgnhEMupt3sv.webp",
    moq: 200,
    moqUnit: "kg",
    priceRange: { min: 4.2, max: 6.8 },
    priceTiers: [
      { qty: "200 – 499 kg", price: 6.8 },
      { qty: "500 – 999 kg", price: 5.5 },
      { qty: "1,000+ kg", price: 4.2 },
    ],
    rating: 4.8,
    reviewCount: 67,
    tags: ["GOTS Certified", "Organic", "Sustainable"],
    featured: true,
    inStock: true,
    leadTime: "20–25 days",
    description: "GOTS-certified 100% organic cotton jersey fabric, 200 GSM. Ideal for T-shirts, activewear, and baby clothing. Available in 50+ standard colors or custom dyeing.",
    specifications: [
      { label: "Composition", value: "100% Organic Cotton" },
      { label: "Weight", value: "200 GSM" },
      { label: "Width", value: "160 cm" },
      { label: "Certification", value: "GOTS, OEKO-TEX 100" },
      { label: "Colors", value: "50+ standard, custom" },
      { label: "Shrinkage", value: "< 3%" },
    ],
  },
  {
    id: "p004",
    name: "Custom Kraft Paper Shopping Bags",
    supplierId: "packpro-solutions",
    supplierName: "PackPro Solutions",
    category: "packaging",
    subcategory: "Retail Bags",
    image: "https://d2xsxph8kpxj0f.cloudfront.net/310519663690084073/brxvWsWYfwFxoqeFg9Rbqu/tradevault-product-packaging-cQo3qDP3MvuySjKvNQXHKV.webp",
    moq: 500,
    moqUnit: "units",
    priceRange: { min: 0.32, max: 0.68 },
    priceTiers: [
      { qty: "500 – 1,999", price: 0.68 },
      { qty: "2,000 – 4,999", price: 0.48 },
      { qty: "5,000+", price: 0.32 },
    ],
    rating: 4.6,
    reviewCount: 143,
    tags: ["Eco-Friendly", "Custom Print", "Recyclable"],
    featured: true,
    inStock: true,
    leadTime: "12–18 days",
    description: "Premium kraft paper shopping bags with twisted paper handles. Available in multiple sizes with full-color custom printing. FSC-certified paper, biodegradable and recyclable.",
    specifications: [
      { label: "Material", value: "120 GSM Kraft Paper" },
      { label: "Certification", value: "FSC Certified" },
      { label: "Printing", value: "Up to 4-color CMYK" },
      { label: "Sizes", value: "S / M / L / XL" },
      { label: "Handle", value: "Twisted Paper" },
      { label: "Finish", value: "Matte / Gloss Lamination" },
    ],
  },
  {
    id: "p005",
    name: "Amber Glass Dropper Bottles — 30ml",
    supplierId: "packpro-solutions",
    supplierName: "PackPro Solutions",
    category: "packaging",
    subcategory: "Glass Containers",
    image: "https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?w=600&h=450&fit=crop",
    moq: 1000,
    moqUnit: "units",
    priceRange: { min: 0.18, max: 0.42 },
    priceTiers: [
      { qty: "1,000 – 4,999", price: 0.42 },
      { qty: "5,000 – 9,999", price: 0.28 },
      { qty: "10,000+", price: 0.18 },
    ],
    rating: 4.9,
    reviewCount: 98,
    tags: ["UV Protection", "Borosilicate", "Custom Label"],
    featured: false,
    inStock: true,
    leadTime: "8–12 days",
    description: "Premium amber borosilicate glass dropper bottles with aluminum dropper caps. UV-protective amber glass ideal for essential oils, serums, and pharmaceutical products.",
    specifications: [
      { label: "Volume", value: "30ml" },
      { label: "Material", value: "Borosilicate Glass" },
      { label: "Color", value: "Amber (UV Protection)" },
      { label: "Cap", value: "Aluminum Dropper" },
      { label: "Neck Size", value: "18/400" },
      { label: "Customization", value: "Screen Print / Label" },
    ],
  },
  {
    id: "p006",
    name: "Premium Merino Wool Blend Fabric",
    supplierId: "meridian-textiles",
    supplierName: "Meridian Textiles Group",
    category: "textiles",
    subcategory: "Fabrics",
    image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&h=450&fit=crop",
    moq: 100,
    moqUnit: "meters",
    priceRange: { min: 12.0, max: 18.5 },
    priceTiers: [
      { qty: "100 – 299 m", price: 18.5 },
      { qty: "300 – 599 m", price: 15.0 },
      { qty: "600+ m", price: 12.0 },
    ],
    rating: 4.7,
    reviewCount: 52,
    tags: ["Merino Wool", "Premium", "Winter Collection"],
    featured: false,
    inStock: true,
    leadTime: "25–30 days",
    description: "Luxurious 80% Merino wool / 20% nylon blend fabric. Exceptionally soft, naturally temperature-regulating, and machine washable. Perfect for premium knitwear and outerwear.",
    specifications: [
      { label: "Composition", value: "80% Merino / 20% Nylon" },
      { label: "Weight", value: "280 GSM" },
      { label: "Width", value: "150 cm" },
      { label: "Care", value: "Machine Washable" },
      { label: "Colors", value: "30+ standard" },
      { label: "Certification", value: "Woolmark Certified" },
    ],
  },
];

export function getProductsByCategory(category: string): Product[] {
  if (category === "all") return PRODUCTS;
  return PRODUCTS.filter((p) => p.category === category);
}

export function getProductById(id: string): Product | undefined {
  return PRODUCTS.find((p) => p.id === id);
}

export function getSupplierById(id: string): Supplier | undefined {
  return SUPPLIERS.find((s) => s.id === id);
}

export function getProductsBySupplier(supplierId: string): Product[] {
  return PRODUCTS.filter((p) => p.supplierId === supplierId);
}
