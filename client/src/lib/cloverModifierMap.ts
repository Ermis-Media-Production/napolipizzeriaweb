/**
 * cloverModifierMap.ts (client)
 *
 * Static map of Clover modifier IDs for pizza options.
 * These IDs were created via the Clover API for merchant MRWSQWMCDSHQ1.
 *
 * Modifier Groups:
 *   Pizza Crust → VMHY08WAQHZ5J
 *   Pizza Cut   → X25FH8C1XGABW
 *   Toppings    → ZBQA3B76GD2RY  (1 Toppings Incluid - 30 options)
 */

// ── Pizza Crust modifier IDs ──────────────────────────────────────────────
export const CLOVER_CRUST_IDS: Record<string, string> = {
  regular:        "JEZMYYN69VFDA",
  thin:           "TQWYNRPMVV5AY",
  stuffed:        "1GHDD803TKY4W",
  "gluten-free":  "NX5EWFB7E12A0",
};

// ── Pizza Cut modifier IDs ────────────────────────────────────────────────
export const CLOVER_CUT_IDS: Record<string, string> = {
  triangle: "PX5GXMRPJZ2HM",
  square:   "V3DRMMKYCCMGY",
  strips:   "41CK91EV5ZVQW",
  uncut:    "QKKPQ37WXWZT6",
};

// ── Pizza Topping modifier IDs (group ZBQA3B76GD2RY) ─────────────────────
// Keys are lowercase topping names matching PIZZA_30_TOPPINGS in napoliData.ts
// Empty string = not in Clover catalog → falls back to note field
export const CLOVER_TOPPING_IDS: Record<string, string> = {
  "anchovies":            "27FYN7QDA3968",
  "artichoke hearts":     "6GEBD5SEK4RAR",
  "fresh basil":          "HJN22B35T6HDJ",
  "black olives":         "3KZ7W273RGPPT",
  "broccoli":             "",
  "zucchini":             "",
  "capicola":             "",
  "cheddar cheese":       "Z5TYARCWHSTK6",
  "grilled chicken":      "FX0XK710WWBTA",
  "chorizo":              "",
  "eggplant":             "D1R15VTRETKT2",
  "fresh garlic":         "EH138QBB86E3J",
  "green olives":         "C554WPYRXKQN4",
  "green peppers":        "M6Y0E9CMWK6AY",
  "ground beef":          "EAZ8NRB2CNVS8",
  "ham":                  "Q46EJ49N80F0Y",
  "italian sausage":      "4GPGM0WYPD6MP",
  "jalapeños":            "0J728EV560NZA",
  "meatballs":            "1P6EG92TSVW4P",
  "mushrooms":            "39B6DSBHNHBQY",
  "onions":               "6DNCPZZ9B45NP",
  "pepperoni":            "RBAYJV0S76MTE",
  "pineapple":            "FAKBBG90TX46A",
  "red roasted peppers":  "A4CSN8QHZN47T",
  "salami":               "4XNS4BAWKMX86",
  "spinach":              "AERNJ7EW0P98P",
  "tomatoes":             "6JGACQG16VQG6",
  "canadian bacon":       "",
};
