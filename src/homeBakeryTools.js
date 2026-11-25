import { capacityForecast, saveRecipeRevision } from "./bakeryOperations.js";
import { validDate } from "./business.js";
import { localDay } from "./dateUtils.js";
import { orderPaid } from "./paymentLedger.js";
import { inventoryForecast } from "./planning.js";
import { addDays } from "./productLots.js";
import { recipePricingPlan, recipeSaleDetails } from "./recipePricing.js";
import { money } from "./uiFormatters.js";

function amount(value, label, minimum = 0, whole = false) {
  const number = Number(value);
  if (
    String(value ?? "").trim() === "" ||
    !Number.isFinite(number) ||
    number < minimum ||
    (whole && !Number.isSafeInteger(number))
  )
    throw Error(`Enter a valid ${label}.`);
  return number;
}

function recipeFor(data, id) {
  const recipe = data.recipes.find((entry) => entry.id === id);
  if (!recipe?.lines?.length) throw Error("Choose a recipe with ingredients.");
  return recipe;
}

export function checkOrderFit(data, input, today = localDay()) {
  const recipe = recipeFor(data, input.recipeId);
  const portions = amount(input.portions, "whole portion count", 1, true);
  const batchYield = amount(recipe.yield, "recipe yield", 1, true);
  const pickup = validDate(input.pickup);
  if (pickup < today) throw Error("Choose today or a future pickup date.");

  const batches = Math.ceil(portions / batchYield);
  const hasTiming =
    Number(recipe.bakeMinutes) > 0 &&
    (Number(recipe.prepMinutes) > 0 || Number(recipe.laborMinutes) > 0);
  const existingPlans = data.productionPlans || [];
  const scheduled = (date) => ({
    ...data,
    productionPlans: [
      ...existingPlans,
      {
        id: "order-fit-preview",
        recipeId: recipe.id,
        date,
        batches,
        status: "planned",
      },
    ],
  });
  const itemIds = new Set(recipe.lines.map((line) => line.itemId));
  function evaluate(date) {
    const projected = scheduled(date);
    const stock = inventoryForecast(projected, date);
    const capacity = capacityForecast(projected, date, 1)[0];
    const shortages = stock.items.filter(
      (item) => itemIds.has(item.id) && item.shortage > 1e-9,
    );
    const overloaded = Object.keys(capacity.load).filter(
      (station) => capacity.load[station] > Number(capacity.capacity[station]),
    );
    return {
      shortages,
      overloaded,
      errors: stock.errors,
      fits:
        hasTiming &&
        !shortages.length &&
        !overloaded.length &&
        !stock.errors.length,
    };
  }

  const requested = evaluate(pickup);
  let earliest = "";
  if (hasTiming) {
    for (let offset = 0; offset < 30; offset += 1) {
      const day = offset ? addDays(today, offset) : today;
      if (evaluate(day).fits) {
        earliest = day;
        break;
      }
    }
  }
  return { ...requested, batches, hasTiming, earliest };
}

export function recordTestBatch(data, input) {
  const recipe = recipeFor(data, input.recipeId);
  const label = String(input.label || "").trim();
  if (!label) throw Error("Give the test batch a name.");
  const trial = {
    id: crypto.randomUUID(),
    label,
    recipe: structuredClone(recipe),
    date: validDate(input.date),
    yield: amount(input.yield, "actual portion count", 1, true),
    ingredientCost: amount(input.ingredientCost, "actual ingredient cost"),
    prepMinutes: amount(input.prepMinutes, "actual prep time"),
    notes: String(input.notes || "").trim(),
  };
  return { ...data, recipeTrials: [...(data.recipeTrials || []), trial] };
}

export function promoteTestBatch(data, trialId, recipeId) {
  const target = recipeFor(data, recipeId);
  const trial = (data.recipeTrials || []).find((entry) => entry.id === trialId);
  if (!trial) throw Error("Choose a saved test batch.");
  const { quantity } = recipeSaleDetails(target);
  if (trial.yield < quantity)
    throw Error(
      "The trial yield is smaller than the main recipe’s selling unit.",
    );
  const next = {
    ...structuredClone(trial.recipe),
    id: target.id,
    name: target.name,
    category: target.category,
    yield: trial.yield,
    prepMinutes: trial.prepMinutes,
    price: target.price,
    saleFormat: target.saleFormat,
    saleQuantity: target.saleQuantity,
    salePrice: target.salePrice,
    pricingPlan: target.pricingPlan,
  };
  recipePricingPlan(next, data.items, data.settings);
  const withHistory = saveRecipeRevision(data, target, next);
  return {
    ...withHistory,
    recipes: data.recipes.map((recipe) =>
      recipe.id === target.id ? next : recipe,
    ),
  };
}

export function pickupReservations(data, slotId) {
  return (data.orders || []).filter(
    (order) => order.pickupSlotId === slotId && order.status !== "cancelled",
  );
}

export function savePickupSlot(data, input, id = "") {
  const date = validDate(input.date);
  const { start, end } = input;
  const time = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
  if (!time.test(start) || !time.test(end) || start >= end)
    throw Error("Choose a start and a later end time on the same day.");
  const limit = amount(input.limit, "whole order limit", 1, true);
  const slots = data.pickupSlots || [];
  const previous = slots.find((slot) => slot.id === id);
  if (id && !previous) throw Error("This pickup window no longer exists.");
  const reservations = id ? pickupReservations(data, id) : [];
  if (
    reservations.length &&
    (date !== previous.date || start !== previous.start || end !== previous.end)
  )
    throw Error("Move the assigned orders before changing the pickup time.");
  if (reservations.length > limit)
    throw Error("The limit is below the number of assigned orders.");
  if (
    slots.some(
      (slot) =>
        slot.id !== id &&
        slot.date === date &&
        start < slot.end &&
        end > slot.start,
    )
  )
    throw Error("This window overlaps another pickup window.");
  const slot = { id: id || crypto.randomUUID(), date, start, end, limit };
  return {
    ...data,
    pickupSlots: [...slots.filter((entry) => entry.id !== id), slot],
  };
}

export function removePickupSlot(data, id) {
  if (pickupReservations(data, id).length)
    throw Error("Move the assigned orders before removing this window.");
  return {
    ...data,
    pickupSlots: (data.pickupSlots || []).filter((slot) => slot.id !== id),
  };
}

export function assignPickupSlot(data, orderId, slotId) {
  const order = (data.orders || []).find((entry) => entry.id === orderId);
  if (order?.status !== "open") throw Error("Choose an open order.");
  if (slotId) {
    const slot = (data.pickupSlots || []).find((entry) => entry.id === slotId);
    if (!slot || slot.date !== order.pickupDate)
      throw Error("Choose a window on the order’s pickup date.");
    if (
      pickupReservations(data, slotId).filter((entry) => entry.id !== orderId)
        .length >= slot.limit
    )
      throw Error("This pickup window is full.");
  }
  return {
    ...data,
    orders: data.orders.map((entry) =>
      entry.id === orderId ? { ...entry, pickupSlotId: slotId } : entry,
    ),
  };
}

export function pickupConfirmation(data, order) {
  const slot = (data.pickupSlots || []).find(
    (entry) =>
      entry.id === order.pickupSlotId && entry.date === order.pickupDate,
  );
  if (!slot) return "";
  const profile = data.businessProfile || {};
  const recipe =
    order.recipeSnapshot?.recipe ||
    data.recipes.find((entry) => entry.id === order.recipeId);
  const balance = Math.max(0, Number(order.total) - orderPaid(data, order));
  return [
    order.customer ? `Hi ${order.customer}!` : "Hello!",
    `Your pickup for ${order.portions} portions of ${order.recipeName || recipe?.name || "your order"} is confirmed.`,
    `Date: ${slot.date}, ${slot.start}–${slot.end} (local time)`,
    profile.address && `Pickup address: ${profile.address}`,
    recipe?.storageInstructions && `Storage: ${recipe.storageInstructions}`,
    `Remaining balance: ${money(balance)}`,
  ]
    .filter(Boolean)
    .join("\n");
}

export function previewMenuPrice(data, recipeId, price) {
  const recipe = recipeFor(data, recipeId);
  const current = recipePricingPlan(recipe, data.items, data.settings);
  const salePrice = Math.round(amount(price, "selling price") * 100) / 100;
  if (!Number.isFinite(salePrice)) throw Error("Enter a valid selling price.");
  const next = { ...recipe, salePrice, price: salePrice / current.quantity };
  const proposed = recipePricingPlan(next, data.items, data.settings);
  const accepted = new Set(
    (data.orders || [])
      .filter((order) => order.status !== "cancelled")
      .map((order) => order.quoteId),
  );
  const openQuotes = (data.quotes || []).filter(
    (quote) => quote.recipeId === recipeId && !accepted.has(quote.id),
  );
  return { current, proposed, openQuotes, recipe, next };
}

export function applyMenuPrice(data, recipeId, price) {
  const { recipe, next } = previewMenuPrice(data, recipeId, price);
  const withHistory = saveRecipeRevision(data, recipe, next);
  return {
    ...withHistory,
    recipes: data.recipes.map((entry) =>
      entry.id === recipeId ? next : entry,
    ),
  };
}
