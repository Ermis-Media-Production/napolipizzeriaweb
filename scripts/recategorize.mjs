import 'dotenv/config';
import https from 'https';
import mysql from 'mysql2/promise';

const token = process.env.CLOVER_API_TOKEN;
const mid = process.env.CLOVER_MERCHANT_ID;

function get(path) {
  return new Promise((res, rej) => {
    const opts = { hostname: 'api.clover.com', path, headers: { Authorization: 'Bearer ' + token }, timeout: 20000 };
    https.get(opts, r => { let d = ''; r.on('data', c => d += c); r.on('end', () => res(JSON.parse(d))); }).on('error', rej).on('timeout', () => rej(new Error('timeout')));
  });
}

const SLUG_MAP = {
  'pizza': 'pizza',
  'hand tossed new york style': 'pizza',
  'specialty pizza': 'pizza',
  'special pizza & wings': 'pizza',
  'gluten free pizza': 'pizza',
  'sicilian 12x8': 'pizza',
  'stuffed dough': 'pizza',
  'calzone & stromboli': 'pizza',
  '4 topp combo': 'pizza',
  'bbq chicken pizza': 'pizza',
  'buffalo chicken': 'pizza',
  'chicken alfredo pizza': 'pizza',
  'deluxe pizza': 'pizza',
  'five cheese pizza': 'pizza',
  'greek pizza': 'pizza',
  'italian pizza': 'pizza',
  'meat lover': 'pizza',
  'mexican style': 'pizza',
  "napoli's special": 'pizza',
  'pesto chicken': 'pizza',
  'ranch pizza': 'pizza',
  'southwestern chicken pizza': 'pizza',
  'supreme pizza': 'pizza',
  'taco pizza': 'pizza',
  'ultimate meat lover': 'pizza',
  'ultimate vegetarian': 'pizza',
  'vegetarian pizza': 'pizza',
  'white pizza': 'pizza',
  'burgers': 'burger',
  '1/2 pound burger': 'burger',
  'full pound burger': 'burger',
  'sandwiches': 'sandwich',
  'wraps': 'sandwich',
  'wings': 'wings',
  'appetizers': 'appetizer',
  'pasta': 'pasta',
  'salads': 'salad',
  'sides': 'sides',
  'dressings sides': 'sides',
  'desserts': 'dessert',
  "children's menu": 'kids',
  'drinks': 'beverage',
  'glass bottle soda': 'beverage',
  'anytime specials': 'special',
  'lunch special': 'lunch',
  'pick up special': 'special',
  "mother's day offers": 'special',
  'delivery charge': 'fee',
};

function toSlug(n) {
  if (n == null) return 'special';
  const name = String(n).toLowerCase().trim();
  if (SLUG_MAP[name]) return SLUG_MAP[name];
  if (name.includes('pizza') || name.includes('calzone')) return 'pizza';
  if (name.includes('burger')) return 'burger';
  if (name.includes('sandwich') || name.includes('wrap')) return 'sandwich';
  if (name.includes('pasta')) return 'pasta';
  if (name.includes('wing')) return 'wings';
  if (name.includes('appetizer')) return 'appetizer';
  if (name.includes('salad')) return 'salad';
  if (name.includes('kids') || name.includes('children')) return 'kids';
  if (name.includes('drink') || name.includes('soda') || name.includes('beverage')) return 'beverage';
  if (name.includes('dessert')) return 'dessert';
  if (name.includes('lunch')) return 'lunch';
  if (name.includes('side') || name.includes('dressing')) return 'sides';
  if (name.includes('special')) return 'special';
  return 'special';
}

const conn = await mysql.createConnection(process.env.DATABASE_URL);

// Fetch all items from Clover with categories
let all = [], offset = 0;
while (true) {
  const data = await get(`/v3/merchants/${mid}/items?expand=categories&limit=200&offset=${offset}`);
  all = all.concat(data.elements || []);
  if ((data.elements || []).length < 200) break;
  offset += 200;
}
console.log('Fetched', all.length, 'items from Clover');

let updated = 0;
for (const item of all) {
  if (item.hidden) continue;
  const cat = item.categories?.elements?.[0]?.name ?? null;
  const slug = toSlug(cat);
  if (slug === 'fee') continue;
  const [r] = await conn.execute('UPDATE menuItems SET category=? WHERE cloverItemId=?', [slug, item.id]);
  if (r.affectedRows > 0) updated++;
}
console.log('Updated', updated, 'items with new category slugs');

// Show breakdown
const [rows] = await conn.execute('SELECT category, COUNT(*) as cnt FROM menuItems WHERE isAvailable=1 GROUP BY category ORDER BY cnt DESC');
rows.forEach(r => console.log(r.category + ': ' + r.cnt));

await conn.end();
