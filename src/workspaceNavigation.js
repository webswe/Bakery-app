export const sections = [
  { name: "Overview", pages: ["Overview"] },
  { name: "Sales", pages: ["Orders", "Quotes"] },
  {
    name: "Kitchen",
    pages: [
      "Daily planner",
      "Can make",
      "Product stock",
      "Recipes",
      "Recipe scaling",
    ],
  },
  {
    name: "Stock",
    pages: [
      "Inventory dashboard",
      "Inventory",
      "Shopping list",
      "Ingredients",
      "Packaging",
      "Waste & expiry",
    ],
  },
  { name: "Settings", pages: ["Cost settings", "Tax settings", "Backups"] },
];
export const pages = {
  Overview: {
    label: "Overview",
    description:
      "See what needs attention today, then review your business performance.",
    action: "Record a sale",
    modal: "sale",
  },
  Orders: {
    label: "Orders",
    description:
      "Track accepted quotes, payments and pickups. Fulfill orders from finished stock.",
    next: "Daily planner",
    nextLabel: "Plan production",
  },
  Quotes: {
    label: "Quotes",
    description:
      "Calculate a price, save it for your customer, then create an order when accepted.",
    next: "Orders",
    nextLabel: "View orders",
  },
  "Daily planner": {
    label: "Production plan",
    description:
      "Organize batches, follow kitchen checklists and record completed production.",
    next: "Shopping list",
    nextLabel: "Review shopping list",
  },
  "Can make": {
    label: "Batch availability",
    description:
      "Check how many batches each recipe can make with current ingredients and packaging.",
    next: "Daily planner",
    nextLabel: "Plan production",
  },
  "Product stock": {
    label: "Finished stock",
    description:
      "Review prepared desserts and captured costs. Fulfill an order or record a direct sale.",
    action: "Record a sale",
    modal: "sale",
    next: "Orders",
    nextLabel: "Fulfill an order",
  },
  Recipes: {
    label: "Recipes",
    description:
      "Manage batch ingredients, packaging, yield and production costs.",
    action: "New recipe",
    modal: "recipe",
    next: "Recipe scaling",
    nextLabel: "Scale a recipe",
  },
  "Recipe scaling": {
    label: "Recipe scaling",
    description:
      "Preview quantities for a target portion count without changing your saved recipe.",
    next: "Recipes",
    nextLabel: "Manage recipes",
  },
  "Inventory dashboard": {
    label: "Stock overview",
    description:
      "Review shared production demand, remaining inventory and forecast shortages.",
    next: "Shopping list",
    nextLabel: "Build shopping list",
  },
  Inventory: {
    label: "Stock movements",
    description:
      "Receive purchased packages, count inventory and review stock activity.",
    action: "Add inventory item",
    modal: "item",
    next: "Inventory dashboard",
    nextLabel: "View stock forecast",
  },
  "Shopping list": {
    label: "Shopping list",
    description:
      "Group purchases by supplier and buy enough for production and minimum stock levels.",
    next: "Inventory",
    nextLabel: "Receive purchases",
  },
  Ingredients: {
    label: "Ingredients",
    description:
      "Maintain purchase sizes, prices, can weights and ingredient conversions.",
    action: "Add ingredient",
    modal: "item",
    next: "Inventory",
    nextLabel: "Manage on-hand stock",
  },
  Packaging: {
    label: "Packaging",
    description:
      "Maintain boxes, containers and utensils used in your recipes.",
    action: "Add packaging",
    modal: "item",
    next: "Inventory",
    nextLabel: "Manage on-hand stock",
  },
  "Waste & expiry": {
    label: "Waste & expiry",
    description:
      "Review low stock and expiry dates, then record spoiled inventory or unsold desserts.",
    next: "Shopping list",
    nextLabel: "Replenish stock",
  },
  "Cost settings": {
    label: "Production costs",
    description:
      "Set wage and electricity assumptions for future production and quotes.",
  },
  "Tax settings": {
    label: "Purchase taxes",
    description:
      "Set food and other tax defaults for future purchases. Existing records retain their rates.",
    action: "Edit tax defaults",
    modal: "tax",
  },
  Backups: {
    label: "Backups & recovery",
    description:
      "Download independent copies, restore a JSON file or recover a dated local snapshot.",
  },
};
export const sectionFor = (page) =>
  sections.find((s) => s.pages.includes(page)) || sections[0];
export function readRoute(hash = "") {
  const params = new URLSearchParams(hash.replace(/^#/, ""));
  const page = params.get("page");
  return {
    page: Object.hasOwn(pages, page) ? page : "Overview",
    context: { quoteId: params.get("quote") || "" },
  };
}
export function routeHash(page, context = {}) {
  const params = new URLSearchParams({
    page: Object.hasOwn(pages, page) ? page : "Overview",
  });
  if (context.quoteId) params.set("quote", context.quoteId);
  return "#" + params.toString();
}
