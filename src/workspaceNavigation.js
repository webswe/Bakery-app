export const sections = [
  { name: "Overview", pages: ["Overview"] },
  { name: "Sales", pages: ["Orders", "Quotes", "Customers", "Packing", "Documents", "Payments"] },
  {
    name: "Kitchen",
    pages: [
      "Calendar",
      "Daily planner",
      "Prep sheets",
      "Batch traceability",
      "Batch yields",
      "Can make",
      "Product stock",
      "Recipes",
      "Recipe scaling",
      "Seasonal plans",
    ],
  },
  {
    name: "Stock",
    pages: [
      "Inventory dashboard",
      "Inventory",
      "Inventory lots",
      "Supplier prices",
      "Shopping list",
      "Ingredients",
      "Packaging",
      "Waste & expiry",
      "Use soon",
    ],
  },
  {
    name: "Reports",
    pages: ["Daily snapshot", "Owner forecast", "Tax report", "Waste analysis"],
  },
  {
    name: "Settings",
    pages: ["Tutorial", "Business profile", "App customization", "Cost settings", "Tax settings", "App updates", "Backups", "Security"],
  },
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
  Payments: {
    label: "Payments",
    description:
      "Record deposits, partial payments and refunds, then print a customer receipt.",
  },
  Packing: {
    label: "Packing board",
    description: "Complete a consistent packing, labeling, allergen and pickup check for every open order.",
  },
  Customers: {
    label: "Customers",
    description:
      "Keep customer contact details, preferences, allergy notes and order history together.",
  },
  Documents: {
    label: "Documents",
    description:
      "Print numbered quotes, invoices and pickup slips using your bakery profile.",
  },
  Calendar: {
    label: "Calendar",
    description:
      "See production work and customer pickups together on a monthly calendar.",
    next: "Daily planner",
    nextLabel: "Manage production",
  },
  "Daily planner": {
    label: "Production plan",
    description:
      "Organize batches, follow kitchen checklists and record completed production.",
    next: "Shopping list",
    nextLabel: "Review shopping list",
  },
  "Prep sheets": {
    label: "Prep sheets",
    description:
      "Print scaled ingredients, kitchen checks, allergens and batch labels for the day.",
  },
  "Batch traceability": {
    label: "Batch traceability",
    description:
      "Trace finished batches to ingredient delivery lots, shelf life and captured production cost.",
  },
  "Batch yields": {
    label: "Batch yields",
    description: "Record actual portions produced and spot recurring yield loss or overproduction.",
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
  "Seasonal plans": {
    label: "Seasonal planning",
    description: "Save holiday menus, market targets and event production goals.",
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
  "Inventory lots": {
    label: "Inventory lots",
    description:
      "Review delivery dates, expiry dates and remaining quantities consumed in FEFO order.",
  },
  "Supplier prices": {
    label: "Supplier prices",
    description:
      "Compare captured package costs across suppliers and export purchase history.",
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
  "Use soon": {
    label: "Use soon",
    description: "Find tracked lots nearing expiry and the recipes that can use them.",
  },
  "Daily snapshot": {
    label: "Daily snapshot",
    description: "Review one day of sales, costs, payments, tax and kitchen output.",
  },
  "Owner forecast": {
    label: "Owner forecast",
    description:
      "Plan the next seven days of order income, production cost and minimum-stock purchases.",
  },
  "Tax report": {
    label: "Tax report",
    description:
      "Review customer tax collected and purchase tax paid, then export a filing worksheet.",
  },
  "Waste analysis": {
    label: "Waste analysis",
    description:
      "See the cost of waste by item and reason and export the monthly detail.",
  },
  "Cost settings": {
    label: "Production costs",
    description:
      "Set wage and electricity assumptions for future production and quotes.",
  },
  Tutorial: {
    label: "Getting started",
    description:
      "Follow the owner workflow from initial setup through production, fulfillment and monthly review.",
  },
  "Business profile": {
    label: "Business profile",
    description:
      "Set the bakery contact and registration details shown on printed customer documents.",
  },
  "App customization": {
    label: "App customization",
    description: "Personalize the workspace appearance and choose how much guidance appears while you work.",
  },
  "Tax settings": {
    label: "Tax settings",
    description:
      "Manage purchase-tax defaults separately from customer sales tax. Existing records retain their saved rates.",
    action: "Edit tax defaults",
    modal: "tax",
  },
  "App updates": {
    label: "App updates",
    description: "Check the installed Windows app version, review release notes and install available updates.",
  },
  Backups: {
    label: "Backups & recovery",
    description:
      "Download independent copies, restore a JSON file or recover a dated local snapshot.",
  },
  Security: {
    label: "Security",
    description:
      "Optionally protect this local owner workspace with a PIN and inactivity lock.",
  },
};
export const sectionFor = (page) =>
  sections.find((s) => s.pages.includes(page)) || sections[0];
export function readRoute(hash = "") {
  const params = new URLSearchParams(hash.replace(/^#/, ""));
  const page = params.get("page");
  return {
    page: Object.hasOwn(pages, page) ? page : "Overview",
    context: {
      quoteId: params.get("quote") || "",
      orderId: params.get("order") || "",
      customerId: params.get("customer") || "",
    },
  };
}
export function routeHash(page, context = {}) {
  const params = new URLSearchParams({
    page: Object.hasOwn(pages, page) ? page : "Overview",
  });
  if (context.quoteId) params.set("quote", context.quoteId);
  if (context.orderId) params.set("order", context.orderId);
  if (context.customerId) params.set("customer", context.customerId);
  return "#" + params.toString();
}
