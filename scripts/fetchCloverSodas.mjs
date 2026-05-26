import { config } from 'dotenv';
config();

const token = process.env.CLOVER_API_TOKEN;
const merchantId = process.env.CLOVER_MERCHANT_ID;

if (!token || !merchantId) {
  console.log('No Clover credentials found');
  process.exit(0);
}

// Fetch all items and filter for beverages/sodas
const res = await fetch(
  `https://api.clover.com/v3/merchants/${merchantId}/items?limit=500&expand=categories`,
  { headers: { Authorization: `Bearer ${token}` } }
);
const data = await res.json();
const items = (data.elements || []);

// Filter for soda-related items
const sodaKeywords = ['soda', 'can', 'coke', 'pepsi', 'sprite', 'dr pepper', 'fanta', 'root beer', 'lemonade', 'ginger', '2 liter', '2l', 'bottle'];
const sodaItems = items.filter(item => {
  const name = (item.name || '').toLowerCase();
  return sodaKeywords.some(kw => name.includes(kw));
});

console.log('All soda-related items:');
sodaItems.forEach(item => {
  const cats = item.categories?.elements?.map(c => c.name).join(', ') || 'no category';
  console.log(`  - ${item.name} (${cats})`);
});

// Also show all beverage category items
const bevItems = items.filter(item => {
  const cats = (item.categories?.elements || []).map(c => (c.name || '').toLowerCase());
  return cats.some(c => c.includes('bev') || c.includes('drink') || c.includes('soda'));
});

if (bevItems.length > 0) {
  console.log('\nBeverage category items:');
  bevItems.forEach(item => console.log(`  - ${item.name}`));
}

console.log(`\nTotal items in Clover: ${items.length}`);
