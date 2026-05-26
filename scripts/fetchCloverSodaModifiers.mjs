import { config } from 'dotenv';
config();

const token = process.env.CLOVER_API_TOKEN;
const merchantId = process.env.CLOVER_MERCHANT_ID;

if (!token || !merchantId) {
  console.log('No Clover credentials found');
  process.exit(0);
}

// Fetch all modifier groups
const res = await fetch(
  `https://api.clover.com/v3/merchants/${merchantId}/modifier_groups?limit=200&expand=modifiers`,
  { headers: { Authorization: `Bearer ${token}` } }
);
const data = await res.json();
const groups = (data.elements || []);

// Look for soda-related modifier groups
const sodaGroups = groups.filter(g => {
  const name = (g.name || '').toLowerCase();
  return name.includes('soda') || name.includes('can') || name.includes('drink') || name.includes('flavor') || name.includes('beverage');
});

if (sodaGroups.length > 0) {
  console.log('Soda-related modifier groups:');
  sodaGroups.forEach(g => {
    console.log(`\n  Group: ${g.name}`);
    const mods = g.modifiers?.elements || [];
    mods.forEach(m => console.log(`    - ${m.name} (price: ${m.price || 0})`));
  });
} else {
  console.log('No soda modifier groups found. All modifier groups:');
  groups.forEach(g => {
    console.log(`\n  Group: ${g.name}`);
    const mods = g.modifiers?.elements || [];
    mods.slice(0, 5).forEach(m => console.log(`    - ${m.name}`));
    if (mods.length > 5) console.log(`    ... and ${mods.length - 5} more`);
  });
}

// Also fetch the "Sodas Can And 2 Liter" item's modifiers
const itemRes = await fetch(
  `https://api.clover.com/v3/merchants/${merchantId}/items?limit=500&filter=name%3D%22Sodas+Can+And+2+Liter%22&expand=modifierGroups`,
  { headers: { Authorization: `Bearer ${token}` } }
);
const itemData = await itemRes.json();
const items = itemData.elements || [];
console.log('\n\nSodas Can And 2 Liter item details:');
items.forEach(item => {
  console.log(`  Item: ${item.name}`);
  const mgs = item.modifierGroups?.elements || [];
  mgs.forEach(mg => console.log(`    Modifier Group: ${mg.name}`));
});
