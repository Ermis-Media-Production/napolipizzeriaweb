/**
 * clover-full-sync.mjs
 *
 * Full sync of Clover catalog IDs into the local database.
 * Fetches ALL items, modifier groups, and modifier options from Clover
 * and upserts their IDs into menuItems, modifierGroups, modifierOptions tables.
 *
 * Run: node scripts/clover-full-sync.mjs
 */
import 'dotenv/config';
import { createConnection } from 'mysql2/promise';

const token = process.env.CLOVER_API_TOKEN;
const mid = process.env.CLOVER_MERCHANT_ID;
const BASE = 'https://api.clover.com';
const DB_URL = process.env.DATABASE_URL;

if (!token || !mid || !DB_URL) {
  console.error('Missing CLOVER_API_TOKEN, CLOVER_MERCHANT_ID, or DATABASE_URL');
  process.exit(1);
}

async function cloverGet(path) {
  const r = await fetch(BASE + path, {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(15000),
  });
  if (!r.ok) throw new Error(`Clover API ${r.status} on ${path}`);
  return r.json();
}

async function fetchAllItems() {
  let all = [];
  let offset = 0;
  const limit = 100;
  while (true) {
    const r = await cloverGet(`/v3/merchants/${mid}/items?limit=${limit}&offset=${offset}&expand=modifierGroups,tags,printerLabel`);
    const elements = r?.elements ?? [];
    all = all.concat(elements);
    if (elements.length < limit) break;
    offset += limit;
  }
  return all;
}

async function fetchAllModifierGroups() {
  let all = [];
  let offset = 0;
  const limit = 100;
  while (true) {
    const r = await cloverGet(`/v3/merchants/${mid}/modifier_groups?limit=${limit}&offset=${offset}&expand=modifiers`);
    const elements = r?.elements ?? [];
    all = all.concat(elements);
    if (elements.length < limit) break;
    offset += limit;
  }
  return all;
}

(async () => {
  const conn = await createConnection(DB_URL);
  console.log('Connected to DB');

  // ── 1. Fetch all Clover data ──────────────────────────────────────────────
  console.log('\nFetching Clover items...');
  const cloverItems = await fetchAllItems();
  console.log(`  ${cloverItems.length} items fetched`);

  console.log('Fetching Clover modifier groups...');
  const cloverGroups = await fetchAllModifierGroups();
  console.log(`  ${cloverGroups.length} modifier groups fetched`);

  // ── 2. Sync modifier groups and their options ─────────────────────────────
  console.log('\nSyncing modifier groups...');
  let groupsUpdated = 0, groupsSkipped = 0;
  let optionsUpdated = 0, optionsSkipped = 0;

  for (const cg of cloverGroups) {
    // Update modifierGroups where name matches but cloverGroupId is null or different
    const [result] = await conn.query(
      'UPDATE modifierGroups SET cloverGroupId = ? WHERE name = ? AND (cloverGroupId IS NULL OR cloverGroupId != ?)',
      [cg.id, cg.name, cg.id]
    );
    if (result.affectedRows > 0) {
      groupsUpdated += result.affectedRows;
    } else {
      groupsSkipped++;
    }

    // Sync modifier options
    for (const cm of (cg.modifiers?.elements ?? [])) {
      const [optResult] = await conn.query(
        'UPDATE modifierOptions SET cloverOptionId = ? WHERE name = ? AND (cloverOptionId IS NULL OR cloverOptionId != ?) AND groupId IN (SELECT id FROM modifierGroups WHERE cloverGroupId = ?)',
        [cm.id, cm.name, cm.id, cg.id]
      );
      if (optResult.affectedRows > 0) {
        optionsUpdated += optResult.affectedRows;
      } else {
        optionsSkipped++;
      }
    }
  }
  console.log(`  Groups: ${groupsUpdated} updated, ${groupsSkipped} already correct`);
  console.log(`  Options: ${optionsUpdated} updated, ${optionsSkipped} already correct`);

  // ── 3. Sync menu items ────────────────────────────────────────────────────
  console.log('\nSyncing menu items...');
  let itemsUpdated = 0, itemsSkipped = 0, itemsNotFound = 0;

  for (const ci of cloverItems) {
    // Match by cloverItemId first (already synced items)
    const [byId] = await conn.query(
      'SELECT id FROM menuItems WHERE cloverItemId = ?',
      [ci.id]
    );
    if (byId.length > 0) {
      itemsSkipped++;
      continue;
    }

    // Try to match by exact name (for items not yet synced)
    const [byName] = await conn.query(
      'SELECT id, name FROM menuItems WHERE name = ? AND cloverItemId IS NULL',
      [ci.name]
    );
    if (byName.length > 0) {
      await conn.query(
        'UPDATE menuItems SET cloverItemId = ? WHERE id = ?',
        [ci.id, byName[0].id]
      );
      itemsUpdated++;
    } else {
      itemsNotFound++;
    }
  }
  console.log(`  Items: ${itemsUpdated} updated, ${itemsSkipped} already had ID, ${itemsNotFound} not matched in local DB`);

  // ── 4. Final stats ────────────────────────────────────────────────────────
  console.log('\nFinal DB stats:');
  const [itemStats] = await conn.query(
    'SELECT COUNT(*) as total, SUM(CASE WHEN cloverItemId IS NOT NULL THEN 1 ELSE 0 END) as withId, SUM(CASE WHEN cloverItemId IS NULL THEN 1 ELSE 0 END) as withoutId FROM menuItems'
  );
  console.log('  menuItems:', itemStats[0]);

  const [groupStats] = await conn.query(
    'SELECT COUNT(*) as total, SUM(CASE WHEN cloverGroupId IS NOT NULL THEN 1 ELSE 0 END) as withId, SUM(CASE WHEN cloverGroupId IS NULL THEN 1 ELSE 0 END) as withoutId FROM modifierGroups'
  );
  console.log('  modifierGroups:', groupStats[0]);

  const [optStats] = await conn.query(
    'SELECT COUNT(*) as total, SUM(CASE WHEN cloverOptionId IS NOT NULL THEN 1 ELSE 0 END) as withId, SUM(CASE WHEN cloverOptionId IS NULL THEN 1 ELSE 0 END) as withoutId FROM modifierOptions'
  );
  console.log('  modifierOptions:', optStats[0]);

  // Show any remaining items without cloverItemId
  const [stillMissing] = await conn.query(
    'SELECT id, name FROM menuItems WHERE cloverItemId IS NULL LIMIT 10'
  );
  if (stillMissing.length > 0) {
    console.log('\n  Items still missing cloverItemId:');
    for (const item of stillMissing) {
      console.log(`    [${item.id}] ${item.name}`);
    }
  } else {
    console.log('\n  ✅ All menu items have a cloverItemId!');
  }

  const [stillMissingGroups] = await conn.query(
    'SELECT id, name FROM modifierGroups WHERE cloverGroupId IS NULL LIMIT 10'
  );
  if (stillMissingGroups.length > 0) {
    console.log('\n  Groups still missing cloverGroupId:');
    for (const g of stillMissingGroups) {
      console.log(`    [${g.id}] ${g.name}`);
    }
  } else {
    console.log('  ✅ All modifier groups have a cloverGroupId!');
  }

  const [stillMissingOpts] = await conn.query(
    'SELECT id, name FROM modifierOptions WHERE cloverOptionId IS NULL LIMIT 10'
  );
  if (stillMissingOpts.length > 0) {
    console.log('\n  Options still missing cloverOptionId:');
    for (const o of stillMissingOpts) {
      console.log(`    [${o.id}] ${o.name}`);
    }
  } else {
    console.log('  ✅ All modifier options have a cloverOptionId!');
  }

  await conn.end();
  console.log('\nSync complete.');
})();
