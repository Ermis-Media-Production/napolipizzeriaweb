/**
 * useResolveCloverItemId
 *
 * Resolves Clover catalog item IDs for a list of item names + categories.
 * Used by wizard modals (Pizza, Wings, Burgers, Subs, Wraps) to attach the
 * correct cloverItemId to cart items so kitchen printer routing works correctly.
 *
 * Returns a stable lookup function `resolve(name, category?)` that returns the
 * cloverItemId string or undefined if not found / still loading.
 */

import { useMemo } from "react";
import { trpc } from "@/lib/trpc";

export interface CloverItemRequest {
  name: string;
  category?: string;
}

/**
 * Hook that pre-fetches Clover IDs for a fixed list of items.
 * Pass the list of items you expect to add to the cart.
 * Returns a `resolve(name)` function to look up the ID synchronously.
 */
export function useResolveCloverItemId(items: CloverItemRequest[]) {
  const { data } = trpc.menuItems.resolveCloverIds.useQuery(
    { items },
    {
      // Only fetch when there are items to resolve
      enabled: items.length > 0,
      // Cache for 5 minutes — Clover catalog doesn't change often
      staleTime: 5 * 60 * 1000,
      // Don't refetch on window focus — not needed for catalog IDs
      refetchOnWindowFocus: false,
    }
  );

  const resolve = useMemo(() => {
    return (name: string): string | undefined => {
      if (!data) return undefined;
      return data[name] ?? undefined;
    };
  }, [data]);

  return { resolve, isLoaded: !!data };
}

/**
 * Standalone utility: resolve a single item's Clover ID from an already-fetched map.
 * Use this inside wizard "Add to Cart" handlers when you have the resolved map.
 */
export function getCloverItemId(
  resolvedMap: Record<string, string | null> | undefined,
  name: string
): string | undefined {
  if (!resolvedMap) return undefined;
  return resolvedMap[name] ?? undefined;
}
