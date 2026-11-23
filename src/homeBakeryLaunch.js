import { recipeCostDetails } from "./recipePricing.js";

const finite = (value, fallback = 0) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};
const positive = (value, fallback = 0) => Math.max(0, finite(value, fallback));
const clamp = (value, minimum, maximum) =>
  Math.min(maximum, Math.max(minimum, finite(value, minimum)));

export const beginnerSteps = [
  {
    id: "first-product",
    title: "Choose one product to start with",
    detail: "Pick something you make consistently before building a large menu.",
  },
  {
    id: "cost-product",
    title: "Add its ingredients and packaging",
    detail: "Use the package price and package size you actually buy.",
  },
  {
    id: "price-product",
    title: "Check that the selling price leaves a profit",
    detail: "A sale is not income until ingredients, packaging, and other costs are covered.",
  },
  {
    id: "order-basics",
    title: "Decide how orders, payment, and pickup work",
    detail: "Start with simple lead time, deposit, and pickup expectations.",
  },
  {
    id: "first-quote",
    title: "Make a practice quote",
    detail: "Try the order flow before a customer is waiting.",
  },
  {
    id: "first-order",
    title: "Record the first real order",
    detail: "Keep the customer, price, payment, and pickup date together.",
  },
  {
    id: "first-sale",
    title: "Complete and record the first sale",
    detail: "The dashboard becomes useful once real sales are recorded.",
  },
  {
    id: "first-ten",
    title: "Complete the first 10 sales",
    detail: "Use the first 10 sales to learn what sells and how long it takes.",
  },
];

export const launchSteps = [
  {
    id: "rules",
    title: "Check local home-food rules",
    detail:
      "Record the licensing, zoning, food-safety, labeling, sales-channel, and inspection requirements that apply where you live.",
  },
  {
    id: "identity",
    title: "Set the bakery identity and contact details",
    detail: "Use the name and contact information customers will see.",
  },
  {
    id: "costs",
    title: "Enter real production costs",
    detail: "Include ingredients, packaging, labor, utilities, and overhead.",
  },
  {
    id: "menu",
    title: "Choose a small launch menu",
    detail: "Start with products you can make consistently and profitably.",
  },
  {
    id: "pricing",
    title: "Verify prices and minimum margins",
    detail: "Test prices before accepting paid orders.",
  },
  {
    id: "policies",
    title: "Write order, deposit, cancellation, and pickup policies",
    detail: "Clear expectations protect both the baker and customer.",
  },
  {
    id: "payments",
    title: "Choose payment methods and bookkeeping routine",
    detail:
      "Decide how deposits, balances, tax, expenses, and payouts are recorded.",
  },
  {
    id: "backup",
    title: "Export and verify a portable backup",
    detail: "Keep a recovery copy away from the computer running the app.",
  },
  {
    id: "soft-launch",
    title: "Run a limited soft launch",
    detail:
      "Test the menu, packaging, timing, pickup, and customer instructions with a controlled order volume.",
  },
];

export function normalizeLaunchProfile(settings = {}) {
  const saved = settings.homeBakeryLaunch || {};
  return {
    stage: ["idea", "setup", "soft-launch", "operating"].includes(saved.stage)
      ? saved.stage
      : "idea",
    targetLaunchDate: saved.targetLaunchDate || "",
    monthlyOwnerIncome: positive(saved.monthlyOwnerIncome),
    weeklySalesGoal: positive(saved.weeklySalesGoal, 100),
    firstProductId: String(saved.firstProductId || ""),
    workingDaysPerWeek: clamp(saved.workingDaysPerWeek ?? 3, 1, 7),
    hoursPerWeek: positive(saved.hoursPerWeek, 15),
    maxBatchesPerWeek: Math.max(
      1,
      Math.round(positive(saved.maxBatchesPerWeek, 8)),
    ),
    startupCash: positive(saved.startupCash),
    completedSteps: Array.isArray(saved.completedSteps)
      ? saved.completedSteps.filter((id) =>
          launchSteps.some((step) => step.id === id),
        )
      : [],
    localRequirements: String(saved.localRequirements || ""),
    channels: {
      customOrders: saved.channels?.customOrders ?? true,
      porchPickup: saved.channels?.porchPickup ?? true,
      markets: saved.channels?.markets ?? false,
      wholesale: saved.channels?.wholesale ?? false,
      delivery: saved.channels?.delivery ?? false,
      online: saved.channels?.online ?? false,
    },
    startupCosts: {
      permits: positive(saved.startupCosts?.permits),
      insurance: positive(saved.startupCosts?.insurance),
      equipment: positive(saved.startupCosts?.equipment),
      packaging: positive(saved.startupCosts?.packaging),
      branding: positive(saved.startupCosts?.branding),
      marketFees: positive(saved.startupCosts?.marketFees),
      other: positive(saved.startupCosts?.other),
    },
    monthlyCosts: {
      insurance: positive(saved.monthlyCosts?.insurance),
      utilities: positive(saved.monthlyCosts?.utilities),
      software: positive(saved.monthlyCosts?.software),
      marketing: positive(saved.monthlyCosts?.marketing),
      marketFees: positive(saved.monthlyCosts?.marketFees),
      other: positive(saved.monthlyCosts?.other),
    },
    policies: {
      depositPercent: clamp(saved.policies?.depositPercent ?? 50, 0, 100),
      leadDays: Math.max(0, Math.round(positive(saved.policies?.leadDays, 7))),
      cancellationHours: Math.max(
        0,
        Math.round(positive(saved.policies?.cancellationHours, 48)),
      ),
      pickupWindow: String(
        saved.policies?.pickupWindow || "Pickup at the agreed date and time.",
      ),
      latePolicy: String(
        saved.policies?.latePolicy ||
          "Contact the bakery as soon as possible if pickup will be late.",
      ),
      customOrderNote: String(saved.policies?.customOrderNote || ""),
    },
  };
}

export function saveLaunchProfile(data, input) {
  const current = normalizeLaunchProfile(data.settings);
  const next = normalizeLaunchProfile({
    homeBakeryLaunch: {
      ...current,
      ...input,
      channels: { ...current.channels, ...(input.channels || {}) },
      startupCosts: {
        ...current.startupCosts,
        ...(input.startupCosts || {}),
      },
      monthlyCosts: {
        ...current.monthlyCosts,
        ...(input.monthlyCosts || {}),
      },
      policies: { ...current.policies, ...(input.policies || {}) },
    },
  });
  return {
    ...data,
    settings: {
      ...(data.settings || {}),
      homeBakeryLaunch: next,
    },
  };
}

export function toggleLaunchStep(data, id) {
  if (!launchSteps.some((step) => step.id === id))
    throw Error("Unknown launch step.");
  const profile = normalizeLaunchProfile(data.settings);
  const completedSteps = profile.completedSteps.includes(id)
    ? profile.completedSteps.filter((stepId) => stepId !== id)
    : [...profile.completedSteps, id];
  return saveLaunchProfile(data, { completedSteps });
}

export function launchReadiness(data) {
  const profile = normalizeLaunchProfile(data.settings);
  const automatic = {
    identity: Boolean(
      data.businessProfile?.name ||
      data.businessProfile?.bakeryName ||
      data.settings?.bakeryName,
    ),
    costs:
      positive(data.settings?.hourlyWage) > 0 &&
      positive(data.settings?.electricityRate) > 0,
    menu: (data.recipes || []).length >= 1,
    pricing: (data.recipes || []).some(
      (recipe) =>
        positive(recipe.salePrice ?? recipe.price) > 0 &&
        positive(recipe.yield) > 0,
    ),
    policies:
      profile.policies.depositPercent >= 0 &&
      profile.policies.leadDays >= 0 &&
      Boolean(profile.policies.pickupWindow.trim()),
    payments: (data.sales || []).length > 0 || (data.payments || []).length > 0,
  };
  const steps = launchSteps.map((step) => ({
    ...step,
    complete:
      profile.completedSteps.includes(step.id) || Boolean(automatic[step.id]),
    automatic: Boolean(automatic[step.id]),
  }));
  const complete = steps.filter((step) => step.complete).length;
  return {
    profile,
    steps,
    complete,
    total: steps.length,
    percent: Math.round((complete / steps.length) * 100),
  };
}

export function beginnerJourney(data) {
  const profile = normalizeLaunchProfile(data.settings);
  const recipe =
    (data.recipes || []).find((row) => row.id === profile.firstProductId) ||
    (data.recipes || [])[0] ||
    null;
  const menu = launchMenuGuide(data);
  const product = recipe
    ? menu.find((row) => row.recipeId === recipe.id) || null
    : null;
  const itemIds = new Set((recipe?.lines || []).map((line) => line.itemId));
  const linkedItems = (data.items || []).filter((item) => itemIds.has(item.id));
  const ingredientsReady =
    Boolean(recipe?.lines?.length) &&
    linkedItems.length === recipe.lines.length &&
    linkedItems.every(
      (item) =>
        positive(item.amount) > 0 &&
        positive(item.price) >= 0 &&
        !item.needsPrice,
    );
  const results = {
    "first-product": Boolean(recipe),
    "cost-product": ingredientsReady,
    "price-product": Boolean(product && product.price > 0 && product.profit > 0),
    "order-basics": Boolean(
      profile.policies.pickupWindow.trim() &&
        profile.policies.leadDays >= 0 &&
        profile.policies.depositPercent >= 0,
    ),
    "first-quote": (data.quotes || []).length > 0,
    "first-order": (data.orders || []).length > 0,
    "first-sale": (data.sales || []).length > 0,
    "first-ten": (data.sales || []).length >= 10,
  };
  const steps = beginnerSteps.map((step) => ({
    ...step,
    complete: results[step.id],
  }));
  const complete = steps.filter((step) => step.complete).length;
  const weeklyUnits =
    product?.price > 0
      ? Math.ceil(profile.weeklySalesGoal / product.price)
      : null;
  return {
    profile,
    recipe,
    product,
    steps,
    complete,
    total: steps.length,
    percent: Math.round((complete / steps.length) * 100),
    weeklyUnits,
    weeklyRevenue:
      weeklyUnits == null ? null : weeklyUnits * positive(product?.price),
    weeklyProfit:
      weeklyUnits == null ? null : weeklyUnits * positive(product?.profit),
    salesCount: (data.sales || []).length,
    ordersCount: (data.orders || []).length,
  };
}

export function startupBudget(settings = {}) {
  const profile = normalizeLaunchProfile(settings);
  const startupTotal = Object.values(profile.startupCosts).reduce(
    (sum, value) => sum + positive(value),
    0,
  );
  const monthlyTotal = Object.values(profile.monthlyCosts).reduce(
    (sum, value) => sum + positive(value),
    0,
  );
  const remainingStartup = Math.max(0, startupTotal - profile.startupCash);
  return {
    profile,
    startupTotal,
    monthlyTotal,
    remainingStartup,
    startupCovered: startupTotal
      ? Math.min(100, (profile.startupCash / startupTotal) * 100)
      : 100,
    threeMonthRunway: startupTotal + monthlyTotal * 3,
  };
}

export function launchMenuGuide(data) {
  return (data.recipes || [])
    .map((recipe) => {
      try {
        const details = recipeCostDetails(
          recipe,
          data.items || [],
          data.settings || {},
        );
        const price = positive(details.salePrice);
        const profit = price - details.costPerSellingUnit;
        const margin = price ? (profit / price) * 100 : 0;
        const laborHours = positive(recipe.laborMinutes) / 60;
        const profitPerLaborHour =
          laborHours > 0 ? (profit * details.sellableUnits) / laborHours : null;
        const readiness = [
          !(recipe.lines || []).length ? "Add ingredients and packaging" : "",
          !(positive(recipe.yield) > 0) ? "Set the batch yield" : "",
          !(price > 0) ? "Set the selling price" : "",
          margin < 20 ? "Review the low margin" : "",
        ].filter(Boolean);
        return {
          recipeId: recipe.id,
          name: recipe.name,
          price,
          cost: details.costPerSellingUnit,
          profit,
          margin,
          profitPerLaborHour,
          readiness,
          launchScore:
            margin +
            Math.min(40, positive(profitPerLaborHour)) -
            readiness.length * 20,
        };
      } catch (error) {
        return {
          recipeId: recipe.id,
          name: recipe.name,
          price: 0,
          cost: 0,
          profit: 0,
          margin: 0,
          profitPerLaborHour: null,
          readiness: [error.message],
          launchScore: -100,
        };
      }
    })
    .sort(
      (a, b) =>
        b.launchScore - a.launchScore ||
        b.margin - a.margin ||
        a.name.localeCompare(b.name),
    );
}

export function weeklyLaunchPlan(data) {
  const profile = normalizeLaunchProfile(data.settings);
  const budget = startupBudget(data.settings);
  const menu = launchMenuGuide(data).filter(
    (row) => row.profit > 0 && !row.readiness.length,
  );
  const averageProfit = menu.length
    ? menu.reduce((sum, row) => sum + row.profit, 0) / menu.length
    : 0;
  const monthlyNeed = profile.monthlyOwnerIncome + budget.monthlyTotal;
  const weeklyNeed = monthlyNeed / 4.345;
  const unitsPerWeek =
    weeklyNeed > 0 && averageProfit > 0
      ? Math.ceil(weeklyNeed / averageProfit)
      : null;
  const averageUnitsPerBatch = menu.length
    ? menu.reduce((sum, row) => {
        const recipe = data.recipes.find((item) => item.id === row.recipeId);
        const quantity =
          recipe?.saleFormat === "dozen"
            ? 12
            : Math.max(1, finite(recipe?.saleQuantity, 1));
        return (
          sum + Math.max(1, Math.floor(finite(recipe?.yield, 1) / quantity))
        );
      }, 0) / menu.length
    : 0;
  const requiredBatches =
    unitsPerWeek != null && averageUnitsPerBatch > 0
      ? Math.ceil(unitsPerWeek / averageUnitsPerBatch)
      : null;
  const capacityUnits = Math.floor(
    profile.maxBatchesPerWeek * averageUnitsPerBatch,
  );
  return {
    profile,
    menu,
    monthlyNeed,
    weeklyNeed,
    averageProfit,
    unitsPerWeek,
    averageUnitsPerBatch,
    requiredBatches,
    capacityUnits,
    capacityGap:
      unitsPerWeek == null ? null : Math.max(0, unitsPerWeek - capacityUnits),
    dailyUnits:
      unitsPerWeek == null
        ? null
        : Math.ceil(unitsPerWeek / profile.workingDaysPerWeek),
  };
}

export function policyText(settings = {}, bakeryName = "the bakery") {
  const profile = normalizeLaunchProfile(settings);
  const policy = profile.policies;
  return [
    `ORDER POLICY — ${bakeryName}`,
    `Please order at least ${policy.leadDays} day(s) in advance.`,
    `A ${policy.depositPercent}% deposit is required to reserve the date.`,
    `Cancellations or major changes require at least ${policy.cancellationHours} hour(s) notice.`,
    policy.pickupWindow,
    policy.latePolicy,
    policy.customOrderNote,
    "Products are made in a home kitchen. Confirm the exact disclosure, allergen, labeling, licensing, and sales requirements that apply in your location.",
  ]
    .filter(Boolean)
    .join("\n\n");
}
