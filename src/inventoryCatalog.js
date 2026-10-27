export function removeInventoryItem(data, itemId) {
  const item = data.items.find((candidate) => candidate.id === itemId);
  if (!item) throw Error("Inventory item is missing.");
  const recipes = data.recipes.filter((recipe) =>
    recipe.lines.some((line) => line.itemId === item.id),
  );
  if (recipes.length)
    throw Error(
      `Remove ${item.name} from these recipes first: ${recipes.map((recipe) => recipe.name).join(", ")}.`,
    );
  const tracked = (data.inventoryLots || [])
    .filter((lot) => lot.itemId === item.id)
    .reduce((sum, lot) => sum + (lot.remaining || 0), 0);
  if ((item.stock || 0) > 0 || tracked > 0)
    throw Error("Set this item’s on-hand quantity to zero before deleting it.");
  return {
    ...data,
    items: data.items.filter((candidate) => candidate.id !== item.id),
  };
}
