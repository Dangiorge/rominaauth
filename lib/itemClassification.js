// path: lib/itemClassification.js

// The master matrix from the spec. "sellableOverridable" means the checkbox stays
// editable after picking the type (e.g. semi_processed items are "optionally" sellable).
export const ITEM_TYPE_DEFAULTS = {
  finished_product: {
    is_inventory: true,
    is_sellable: true,
    is_recipe_linked: true,
    sellableOverridable: false,
  },
  service: {
    is_inventory: false,
    is_sellable: true,
    is_recipe_linked: false,
    sellableOverridable: false,
  },
  semi_processed: {
    is_inventory: true,
    is_sellable: false,
    is_recipe_linked: true,
    sellableOverridable: true,
  },
  ingredient: {
    is_inventory: true,
    is_sellable: false,
    is_recipe_linked: false,
    sellableOverridable: false,
  },
  packaging: {
    is_inventory: true,
    is_sellable: false,
    is_recipe_linked: false,
    sellableOverridable: false,
  },
  asset: {
    is_inventory: false,
    is_sellable: false,
    is_recipe_linked: false,
    sellableOverridable: false,
  },
  expense: {
    is_inventory: false,
    is_sellable: false,
    is_recipe_linked: false,
    sellableOverridable: false,
  },
};

export const ITEM_TYPE_LABELS = {
  finished_product: "Finished Product",
  service: "Service",
  semi_processed: "Semi-Processed",
  ingredient: "Ingredient",
  packaging: "Packaging",
  asset: "Asset",
  expense: "Expense",
};

// Types that are permitted to be flagged sellable at all — used for server-side enforcement
// so a client can never sneak an ingredient into is_sellable=true.
const SELLABLE_ALLOWED_TYPES = [
  "finished_product",
  "service",
  "semi_processed",
];
const RECIPE_LINKED_ALLOWED_TYPES = ["finished_product", "semi_processed"];
const NEVER_INVENTORY_TYPES = ["service", "asset", "expense"];

export function getDefaultFlags(itemType) {
  return ITEM_TYPE_DEFAULTS[itemType] || ITEM_TYPE_DEFAULTS.ingredient;
}

// Server-side enforcement — always call this before saving, regardless of what the client sent.
export function enforceFlagRules(itemType, flags) {
  const result = { ...flags };
  if (!SELLABLE_ALLOWED_TYPES.includes(itemType)) result.is_sellable = false;
  if (!RECIPE_LINKED_ALLOWED_TYPES.includes(itemType))
    result.is_recipe_linked = false;
  if (NEVER_INVENTORY_TYPES.includes(itemType)) result.is_inventory = false;
  return result;
}
