import React from "react";
import {
  getNutrition,
  DIET_TAG_CONFIG,
  ALLERGEN_CONFIG,
  type DietTag,
  type Allergen,
} from "@/lib/napoliNutrition";

interface NutritionBadgesProps {
  itemName: string;
  /** Show allergen icons (default: true) */
  showAllergens?: boolean;
  /** Compact mode hides allergen row (default: false) */
  compact?: boolean;
}

/**
 * Renders calorie count, protein, dietary tags (V/VG/GF/DF/HOT/★),
 * and allergen icons for a given menu item name.
 * Returns null if no nutrition data is available.
 */
export function NutritionBadges({
  itemName,
  showAllergens = true,
  compact = false,
}: NutritionBadgesProps) {
  const info = getNutrition(itemName);
  if (!info) return null;

  const { cal, protein, carbs, tags = [], allergens = [] } = info;

  return (
    <div className="flex flex-col gap-0.5 mt-1">
      {/* Row 1: calories + protein + diet tags */}
      <div className="flex flex-wrap items-center gap-1">
        {/* Calories */}
        <span
          className="inline-flex items-center gap-0.5 text-[10px] font-medium leading-none px-1.5 py-0.5 rounded"
          style={{ background: "oklch(0.96 0.02 30)", color: "oklch(0.45 0.08 30)" }}
          title="Approximate calories"
        >
          🔥 {cal} cal
        </span>
        {/* Protein */}
        {protein > 0 && (
          <span
            className="inline-flex items-center gap-0.5 text-[10px] font-medium leading-none px-1.5 py-0.5 rounded"
            style={{ background: "oklch(0.94 0.04 260)", color: "oklch(0.38 0.14 260)" }}
            title="Approximate protein"
          >
            💪 {protein}g
          </span>
        )}
        {/* Carbs */}
        {carbs != null && carbs > 0 && (
          <span
            className="inline-flex items-center gap-0.5 text-[10px] font-medium leading-none px-1.5 py-0.5 rounded"
            style={{ background: "oklch(0.94 0.06 145)", color: "oklch(0.36 0.12 145)" }}
            title="Approximate carbohydrates"
          >
            🌾 {carbs}g
          </span>
        )}
        {/* Diet tags */}
        {(tags as DietTag[]).map((tag) => {
          const cfg = DIET_TAG_CONFIG[tag];
          return (
            <span
              key={tag}
              className="inline-flex items-center text-[10px] font-bold leading-none px-1.5 py-0.5 rounded"
              style={{ background: cfg.bg, color: cfg.color }}
              title={cfg.title}
            >
              {cfg.label}
            </span>
          );
        })}
      </div>

      {/* Row 2: allergen icons */}
      {showAllergens && !compact && allergens.length > 0 && (
        <div className="flex flex-wrap items-center gap-0.5">
          <span
            className="text-[9px] leading-none"
            style={{ color: "oklch(0.55 0.04 30)" }}
          >
            Contains:
          </span>
          {(allergens as Allergen[]).map((a) => {
            const cfg = ALLERGEN_CONFIG[a];
            return (
              <span
                key={a}
                className="text-[11px] leading-none"
                title={cfg.label}
              >
                {cfg.emoji}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default NutritionBadges;
