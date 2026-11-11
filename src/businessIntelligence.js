import { monthlySummary } from "./analytics.js";
import { savePlan } from "./planning.js";
import { localDay } from "./dateUtils.js";

const number = (value) => Math.max(0, Number(value) || 0);

function normalizeBusinessGoals(value = {}) {
  return {
    monthlyRevenue: number(value.monthlyRevenue),
    monthlyProfit: number(value.monthlyProfit),
    targetMargin: number(value.targetMargin),
    cashReserve: number(value.cashReserve),
    maxWastePercent: number(value.maxWastePercent),
    weeklyBatches: number(value.weeklyBatches),
    weeklyOwnerHours: number(value.weeklyOwnerHours),
  };
}

export function financialCenter(data, month) {
  const summary = monthlySummary(data, month);
  const finance = {
    openingCash: number(data.settings?.finance?.openingCash),
    monthlyExpenseBudget: number(data.settings?.finance?.monthlyExpenseBudget),
  };
  const monthPayments = (data.payments || []).filter((row) =>
    row.date?.startsWith(month),
  );
  const cashIn =
    monthPayments.reduce(
      (sum, row) =>
        sum +
        (row.kind === "adjustment"
          ? 0
          : row.kind === "refund"
            ? -number(row.amount)
            : number(row.amount)),
      0,
    ) +
    summary.sales
      .filter(
        (sale) =>
          !sale.orderId &&
          sale.paymentStatus !== "unpaid" &&
          sale.paymentStatus !== "partial" &&
          !(data.payments || []).some((payment) => payment.saleId === sale.id),
      )
      .reduce((sum, sale) => sum + number(sale.total), 0);
  const wasteCost = (data.waste || [])
    .filter((row) => row.date?.startsWith(month))
    .reduce((sum, row) => sum + number(row.cost), 0);
  const purchaseCash = (data.purchaseHistory || [])
    .filter((row) => row.date?.startsWith(month))
    .reduce(
      (sum, row) =>
        sum +
        number(row.finalPackageCost ?? row.packagePrice) *
          Math.max(1, number(row.packages) || 1),
      0,
    );
  const cashOut = summary.overhead + purchaseCash;
  const netCashFlow = cashIn - cashOut;
  const expenseGroups = Object.entries(
    summary.expenses.reduce((groups, row) => {
      const key = row.category?.trim() || "Other";
      groups[key] = (groups[key] || 0) + number(row.amount);
      return groups;
    }, {}),
  )
    .map(([name, amount]) => ({ name, amount }))
    .sort((a, b) => b.amount - a.amount);
  const margin = summary.revenue ? (summary.profit / summary.revenue) * 100 : 0;
  const goals = normalizeBusinessGoals(data.settings?.ownerGoals);
  const cashFlowByDay = {};
  const addCash = (date, field, amount) => {
    if (!date?.startsWith(month)) return;
    const row = (cashFlowByDay[date] ||= { date, cashIn: 0, cashOut: 0 });
    row[field] += amount;
  };
  monthPayments.forEach((row) => {
    if (row.kind === "adjustment") return;
    const amount = number(row.amount);
    if (row.kind === "refund") addCash(row.date, "cashOut", amount);
    else addCash(row.date, "cashIn", amount);
  });
  summary.sales
    .filter(
      (sale) =>
        !sale.orderId &&
        sale.paymentStatus !== "unpaid" &&
        sale.paymentStatus !== "partial" &&
        !(data.payments || []).some((payment) => payment.saleId === sale.id),
    )
    .forEach((sale) => addCash(sale.date, "cashIn", number(sale.total)));
  summary.expenses.forEach((expense) =>
    addCash(expense.date, "cashOut", number(expense.amount)),
  );
  (data.purchaseHistory || []).forEach((purchase) =>
    addCash(
      purchase.date,
      "cashOut",
      number(purchase.finalPackageCost ?? purchase.packagePrice) *
        Math.max(1, number(purchase.packages) || 1),
    ),
  );
  let runningCash = finance.openingCash;
  const dailyCashFlow = Object.values(cashFlowByDay)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((row) => {
      const net = row.cashIn - row.cashOut;
      runningCash += net;
      return { ...row, net, runningCash };
    });
  const paymentEntries = data.payments || [];
  const balanceFor = (id, type, total) =>
    Math.max(
      0,
      number(total) -
        paymentEntries
          .filter((entry) => entry[`${type}Id`] === id)
          .reduce(
            (sum, entry) =>
              sum +
              (entry.kind === "refund"
                ? -number(entry.amount)
                : number(entry.amount)),
            0,
          ),
    );
  const upcomingCollections = [
    ...(data.orders || [])
      .filter(
        (order) => order.status !== "cancelled" && order.status !== "completed",
      )
      .map((order) => ({
        date: order.pickupDate,
        name: order.customer || order.recipeName || "Customer order",
        amount: balanceFor(order.id, "order", order.total),
      })),
    ...(data.sales || [])
      .filter((sale) => ["unpaid", "partial"].includes(sale.paymentStatus))
      .map((sale) => ({
        date: sale.dueDate || sale.date,
        name: sale.customer || sale.recipeName || "Direct sale",
        amount: balanceFor(sale.id, "sale", sale.total),
      })),
  ]
    .filter((entry) => entry.amount > 0)
    .sort((a, b) =>
      (a.date || "9999-12-31").localeCompare(b.date || "9999-12-31"),
    )
    .slice(0, 5);
  return {
    ...summary,
    cashIn,
    outstanding:
      (data.orders || [])
        .filter(
          (order) =>
            order.status !== "cancelled" &&
            order.status !== "completed" &&
            order.pickupDate?.startsWith(month),
        )
        .reduce((sum, order) => {
          const paid = (data.payments || [])
            .filter((row) => row.orderId === order.id)
            .reduce(
              (total, row) =>
                total +
                (row.kind === "refund"
                  ? -number(row.amount)
                  : number(row.amount)),
              0,
            );
          return sum + Math.max(0, number(order.total) - paid);
        }, 0) +
      summary.sales
        .filter(
          (sale) =>
            !sale.orderId && ["unpaid", "partial"].includes(sale.paymentStatus),
        )
        .reduce((sum, sale) => {
          const paid = (data.payments || [])
            .filter((payment) => payment.saleId === sale.id)
            .reduce((total, payment) => total + number(payment.amount), 0);
          return sum + Math.max(0, number(sale.total) - paid);
        }, 0),
    wasteCost,
    wastePercent: summary.revenue ? (wasteCost / summary.revenue) * 100 : 0,
    margin,
    expenseGroups,
    finance,
    purchaseCash,
    cashOut,
    netCashFlow,
    cashPosition: finance.openingCash + netCashFlow,
    expenseBudgetProgress: finance.monthlyExpenseBudget
      ? (summary.overhead / finance.monthlyExpenseBudget) * 100
      : 0,
    dailyCashFlow,
    upcomingCollections,
    goals,
    progress: {
      revenue: goals.monthlyRevenue
        ? (summary.revenue / goals.monthlyRevenue) * 100
        : 0,
      profit: goals.monthlyProfit
        ? (summary.profit / goals.monthlyProfit) * 100
        : 0,
      reserve: goals.cashReserve ? (cashIn / goals.cashReserve) * 100 : 0,
    },
  };
}

export function financialGuidance(report) {
  const notes = [];
  if (report.goals.monthlyRevenue && report.progress.revenue < 75)
    notes.push({
      level: "warning",
      title: "Revenue is behind target",
      detail: `${Math.max(0, 100 - report.progress.revenue).toFixed(0)}% of the monthly goal remains. Review open quotes and pickup balances.`,
    });
  if (report.revenue > 0 && report.profit < 0)
    notes.push({
      level: "danger",
      title: "The month is currently unprofitable",
      detail:
        "Review recipe margins and the largest expense categories before accepting low-margin work.",
    });
  if (report.goals.targetMargin && report.margin < report.goals.targetMargin)
    notes.push({
      level: "warning",
      title: "Margin is below goal",
      detail: `Current margin is ${report.margin.toFixed(1)}%; the goal is ${report.goals.targetMargin.toFixed(1)}%.`,
    });
  if (
    report.goals.maxWastePercent &&
    report.wastePercent > report.goals.maxWastePercent
  )
    notes.push({
      level: "warning",
      title: "Waste is above its limit",
      detail: `Waste is ${report.wastePercent.toFixed(1)}% of revenue this month.`,
    });
  if (report.outstanding > 0)
    notes.push({
      level: "info",
      title: "Pickup balances still need collection",
      detail: `${report.outstanding.toFixed(2)} remains due across open orders and unpaid direct sales.`,
    });
  if (report.cashPosition < 0)
    notes.push({
      level: "danger",
      title: "Cash position is below zero",
      detail:
        "Review upcoming collections and planned spending before making new purchases.",
    });
  if (report.finance.monthlyExpenseBudget && report.expenseBudgetProgress > 100)
    notes.push({
      level: "warning",
      title: "Operating expense budget exceeded",
      detail: `Operating expenses are ${report.expenseBudgetProgress.toFixed(0)}% of the monthly budget.`,
    });
  if (!notes.length)
    notes.push({
      level: "positive",
      title: "No urgent financial exceptions",
      detail:
        "Recorded revenue, profit, margin, and waste are within the goals you set.",
    });
  return notes;
}

function dateShift(day, amount) {
  const value = new Date(`${day}T12:00:00`);
  value.setDate(value.getDate() + amount);
  return localDay(value);
}

export function scheduleSuggestions(data, startDate = localDay(), days = 14) {
  const endDate = dateShift(startDate, days - 1);
  const plannedOrders = new Set(
    (data.productionPlans || []).map((plan) => plan.orderId).filter(Boolean),
  );
  return (data.orders || [])
    .filter(
      (order) =>
        order.status !== "cancelled" &&
        order.status !== "completed" &&
        order.pickupDate >= startDate &&
        order.pickupDate <= endDate &&
        !plannedOrders.has(order.id),
    )
    .map((order) => {
      const recipe = data.recipes.find(
        (row) => row.id === order.recipeId || row.name === order.recipeName,
      );
      if (!recipe) return null;
      const minutes =
        number(recipe.prepMinutes) +
        number(recipe.bakeMinutes) +
        number(recipe.coolMinutes) +
        number(recipe.decorateMinutes || recipe.laborMinutes);
      const measuredMinutes = (data.productionPlans || [])
        .filter(
          (plan) =>
            plan.recipeId === recipe.id &&
            Number(plan.actualMinutes) > 0 &&
            Number(plan.batches) > 0,
        )
        .map((plan) => Number(plan.actualMinutes) / Number(plan.batches));
      const minutesPerBatch = measuredMinutes.length
        ? measuredMinutes.reduce((sum, value) => sum + value, 0) /
          measuredMinutes.length
        : minutes;
      const leadDays = minutesPerBatch > 360 ? 2 : 1;
      const batches = Math.max(
        1,
        Math.ceil(
          number(order.portions || order.quantity) / (recipe.yield || 1),
        ),
      );
      return {
        id: `suggestion-${order.id}`,
        orderId: order.id,
        customer: order.customer || "Customer order",
        pickupDate: order.pickupDate,
        recipe,
        batches,
        date: dateShift(order.pickupDate, -leadDays),
        minutes: Math.round(minutesPerBatch * batches),
        learned: measuredMinutes.length > 0,
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function applyScheduleSuggestions(data, suggestions) {
  return suggestions.reduce(
    (next, row) =>
      savePlan(next, {
        date: row.date,
        recipeId: row.recipe.id,
        batches: row.batches,
        orderId: row.orderId,
        notes: `Auto-planned for ${row.customer}; pickup ${row.pickupDate}`,
      }),
    data,
  );
}

export function productionPerformance(data) {
  const completed = (data.productionPlans || []).filter(
    (plan) => plan.status === "completed",
  );
  const rows = completed.map((plan) => {
    const batch = (data.productionBatches || []).find(
      (entry) => entry.productionPlanId === plan.id,
    );
    const recipe =
      plan.recipeSnapshot?.recipe ||
      data.recipes.find((entry) => entry.id === plan.recipeId) ||
      {};
    const plannedYield =
      number(plan.producedPortions) ||
      number(recipe.yield) * number(plan.batches);
    const actualYield =
      batch?.actualYield == null ? null : number(batch.actualYield);
    const plannedMinutes =
      (number(recipe.prepMinutes) +
        number(recipe.bakeMinutes) +
        number(recipe.coolMinutes) +
        number(recipe.decorateMinutes || recipe.laborMinutes)) *
      number(plan.batches);
    const actualMinutes =
      plan.actualMinutes == null ? null : number(plan.actualMinutes);
    return {
      id: plan.id,
      date: plan.date,
      recipeName: recipe.name || plan.recipeName || "Recipe",
      plannedYield,
      actualYield,
      yieldVariance:
        actualYield == null || !plannedYield
          ? null
          : ((actualYield - plannedYield) / plannedYield) * 100,
      plannedMinutes,
      actualMinutes,
      timeVariance:
        actualMinutes == null || !plannedMinutes
          ? null
          : ((actualMinutes - plannedMinutes) / plannedMinutes) * 100,
      completedAt: plan.completedAt,
      onDay: plan.completedAt?.startsWith(plan.date) ?? null,
    };
  });
  const measured = rows.filter((row) => row.actualYield != null);
  return {
    rows: rows.sort((a, b) => b.date.localeCompare(a.date)),
    completed: rows.length,
    measured: measured.length,
    averageYieldVariance: measured.length
      ? measured.reduce((sum, row) => sum + row.yieldVariance, 0) /
        measured.length
      : 0,
    onDayPercent: rows.length
      ? (rows.filter((row) => row.onDay).length / rows.length) * 100
      : 0,
  };
}

export function recordProductionActual(data, planId, input) {
  const plan = (data.productionPlans || []).find((row) => row.id === planId);
  if (!plan || plan.status !== "completed")
    throw Error("Choose completed production.");
  const actualMinutes = Number(input.actualMinutes);
  if (!Number.isFinite(actualMinutes) || actualMinutes <= 0)
    throw Error("Enter the actual working minutes.");
  const actualYield = Number(input.actualYield);
  if (!Number.isFinite(actualYield) || actualYield < 0)
    throw Error("Enter the actual yield.");
  const batch = (data.productionBatches || []).find(
    (row) => row.productionPlanId === planId,
  );
  return {
    ...data,
    productionPlans: data.productionPlans.map((row) =>
      row.id === planId
        ? {
            ...row,
            actualMinutes,
            actualRecordedAt: new Date().toISOString(),
          }
        : row,
    ),
    productionBatches: data.productionBatches.map((row) =>
      row.id === batch?.id
        ? {
            ...row,
            actualYield,
            yieldRecordedAt: new Date().toISOString(),
          }
        : row,
    ),
  };
}

export function supplierInsights(data) {
  const groups = new Map();
  for (const row of data.purchaseHistory || []) {
    const amount = number(row.amount) || 1;
    const key = row.itemId || row.itemName;
    const supplier = row.supplier?.trim() || "Unassigned";
    const group = groups.get(key) || {
      itemId: row.itemId,
      itemName: row.itemName,
      offers: new Map(),
    };
    const unitCost = number(row.finalPackageCost ?? row.packagePrice) / amount;
    group.offers.set(supplier, {
      supplier,
      unitCost,
      packageCost: number(row.finalPackageCost ?? row.packagePrice),
      date: row.date,
    });
    groups.set(key, group);
  }
  return [...groups.values()]
    .map((group) => {
      const offers = [...group.offers.values()].sort(
        (a, b) => a.unitCost - b.unitCost,
      );
      const current = data.items.find((item) => item.id === group.itemId);
      return {
        ...group,
        offers,
        best: offers[0],
        current,
        reorder: current
          ? number(current.stock) <= number(current.minStock)
          : false,
      };
    })
    .sort((a, b) => Number(b.reorder) - Number(a.reorder));
}

export function wasteCoaching(data, month) {
  const rows = (data.waste || []).filter((row) => row.date?.startsWith(month));
  const groups = new Map();
  for (const row of rows) {
    const key = row.itemId || row.name || "Other";
    const item = data.items.find((entry) => entry.id === row.itemId);
    const current = groups.get(key) || {
      name: item?.name || row.name || "Other",
      entries: 0,
      cost: 0,
      reasons: {},
    };
    current.entries += 1;
    current.cost += number(row.cost);
    const reason = row.reason || "Unspecified";
    current.reasons[reason] = (current.reasons[reason] || 0) + 1;
    groups.set(key, current);
  }
  return [...groups.values()]
    .map((row) => {
      const topReason = Object.entries(row.reasons).sort(
        (a, b) => b[1] - a[1],
      )[0]?.[0];
      const action = /expir/i.test(topReason || "")
        ? "Buy smaller packages or schedule a use-soon batch."
        : /over|extra/i.test(topReason || "")
          ? "Reduce the next batch or adjust the recorded recipe yield."
          : /damage|drop|burn|quality/i.test(topReason || "")
            ? "Add a production checkpoint to the prep sheet."
            : "Review the last entries and set one prevention step.";
      return { ...row, topReason, action };
    })
    .sort((a, b) => b.cost - a.cost);
}

function changeSummary(previous, next) {
  const ignored = new Set(["changeLog"]);
  return Object.keys(next)
    .filter(
      (key) =>
        !ignored.has(key) &&
        JSON.stringify(previous?.[key]) !== JSON.stringify(next[key]),
    )
    .map((key) => key.replace(/([A-Z])/g, " $1").toLowerCase());
}

function recordChanges(previous, next) {
  const collections = [
    ["items", "Inventory item"],
    ["recipes", "Recipe"],
    ["orders", "Order"],
    ["quotes", "Quote"],
    ["productionPlans", "Production plan"],
    ["waste", "Waste entry"],
    ["expenses", "Expense"],
    ["payments", "Payment"],
    ["purchaseOrders", "Purchase order"],
  ];
  const changes = [];
  for (const [key, label] of collections) {
    const before = new Map((previous[key] || []).map((row) => [row.id, row]));
    const after = new Map((next[key] || []).map((row) => [row.id, row]));
    for (const [id, row] of after) {
      const old = before.get(id);
      if (!old || JSON.stringify(old) !== JSON.stringify(row))
        changes.push({
          collection: key,
          id,
          action: old ? "updated" : "added",
          label,
          name:
            row.name ||
            row.title ||
            row.customer ||
            row.recipeName ||
            row.itemName ||
            id,
        });
    }
    for (const [id, row] of before) {
      if (!after.has(id))
        changes.push({
          collection: key,
          id,
          action: "removed",
          label,
          name:
            row.name ||
            row.title ||
            row.customer ||
            row.recipeName ||
            row.itemName ||
            id,
        });
    }
  }
  return changes.slice(0, 12);
}

export function withChangeLog(previous, next) {
  const areas = changeSummary(previous, next);
  if (!areas.length) return next;
  const records = recordChanges(previous, next);
  return {
    ...next,
    changeLog: [
      ...(previous.changeLog || []),
      {
        id: crypto.randomUUID(),
        at: new Date().toISOString(),
        areas,
        records,
        summary: `Updated ${areas.slice(0, 3).join(", ")}${areas.length > 3 ? ` and ${areas.length - 3} more` : ""}`,
      },
    ].slice(-250),
  };
}

export function saveBusinessProfile(data, input) {
  const name = input.name?.trim();
  if (!name) throw Error("Enter a profile name.");
  const profile = {
    id: input.id || crypto.randomUUID(),
    name,
    savedAt: new Date().toISOString(),
    businessProfile: structuredClone(data.businessProfile || {}),
    appearance: structuredClone(data.settings?.appearance || {}),
  };
  return {
    ...data,
    businessProfiles: [
      ...(data.businessProfiles || []).filter((row) => row.id !== profile.id),
      profile,
    ],
  };
}

export function applyBusinessProfile(data, id) {
  const profile = (data.businessProfiles || []).find((row) => row.id === id);
  if (!profile) throw Error("Business profile is missing.");
  return {
    ...data,
    businessProfile: structuredClone(profile.businessProfile),
    settings: {
      ...data.settings,
      appearance: structuredClone(profile.appearance),
    },
    activeBusinessProfileId: id,
  };
}

export function setupProgress(data) {
  const checks = [
    [
      "Business details",
      Boolean(data.businessProfile?.name),
      "Business profile",
    ],
    ["Sales tax choice", data.salesTaxRate != null, "Tax settings"],
    ["Inventory prices", data.items?.some((row) => row.price > 0), "Inventory"],
    [
      "At least one complete recipe",
      data.recipes?.some((row) => row.lines?.length && row.yield > 0),
      "Recipes",
    ],
    [
      "Financial goals",
      normalizeBusinessGoals(data.settings?.ownerGoals).monthlyRevenue > 0,
      "Goals & tasks",
    ],
    [
      "Backup reviewed",
      Boolean(data.settings?.setup?.backupReviewed),
      "Secure backups",
    ],
  ].map(([label, complete, page]) => ({ label, complete, page }));
  return {
    checks,
    completed: checks.filter((row) => row.complete).length,
    percent: Math.round(
      (checks.filter((row) => row.complete).length / checks.length) * 100,
    ),
  };
}
