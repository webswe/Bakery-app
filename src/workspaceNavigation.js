export const ownerToolkitPages = [
  "Order intake",
  "Production timeline",
  "Recurring prep",
  "Substitutions",
  "Label studio",
  "Kitchen binder",
  "Cost alerts",
  "Sales trends",
  "Data tools",
];
export const bakeryOperationsPages = [
  "Recipe lab",
  "Allergen matrix",
  "Capacity planner",
  "Kitchen timers",
  "Daily closeout",
  "Equipment care",
  "Menu profitability",
  "Purchase orders",
  "Archive",
];
export const businessIntelligencePages = [
  "Financial center",
  "Smart schedule",
  "Production performance",
  "Receiving",
  "Supplier insights",
  "Waste coach",
  "Trace labels",
  "Bakery profiles",
  "Secure backups",
  "Change history",
  "Setup checklist",
];

export const sections = [
  {
    name: "Overview",
    pages: ["Overview", "Goals & tasks", "Financial center"],
  },
  {
    name: "Sales",
    pages: [
      "Order intake",
      "Orders",
      "Quotes",
      "Customers",
      "Packing",
      "Documents",
      "Payments",
    ],
  },
  {
    name: "Kitchen",
    pages: [
      "Calendar",
      "Daily planner",
      "Smart schedule",
      "Production timeline",
      "Production performance",
      "Recurring prep",
      "Prep sheets",
      "Kitchen binder",
      "Batch traceability",
      "Batch yields",
      "Can make",
      "Product stock",
      "Recipes",
      "Recipe lab",
      "Allergen matrix",
      "Label studio",
      "Trace labels",
      "Recipe scaling",
      "Capacity planner",
      "Kitchen timers",
      "Seasonal plans",
    ],
  },
  {
    name: "Stock",
    pages: [
      "Inventory dashboard",
      "Inventory",
      "Inventory lots",
      "Receiving",
      "Supplier prices",
      "Supplier insights",
      "Shopping list",
      "Purchase orders",
      "Substitutions",
      "Ingredients",
      "Packaging",
      "Waste & expiry",
      "Use soon",
    ],
  },
  {
    name: "Reports",
    pages: [
      "Daily snapshot",
      "Daily closeout",
      "Owner forecast",
      "Menu profitability",
      "Cost alerts",
      "Sales trends",
      "Tax report",
      "Waste analysis",
      "Waste coach",
    ],
  },
  {
    name: "Settings",
    pages: [
      "Tutorial",
      "User guide",
      "Help & support",
      "Business profile",
      "Bakery profiles",
      "App customization",
      "Cost settings",
      "Tax settings",
      "Equipment care",
      "Data tools",
      "Secure backups",
      "Change history",
      "Setup checklist",
      "Archive",
      "App updates",
      "Backups",
      "Security",
    ],
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
  "Goals & tasks": {
    label: "Goals & tasks",
    description:
      "Keep owner follow-ups, deadlines and working business targets beside the daily bakery workflow.",
    next: "Overview",
    nextLabel: "Return to dashboard",
  },
  "Financial center": {
    label: "Goals & finances",
    description:
      "Track revenue, profit, cash, balances, expenses, waste, and progress toward the owner goals that matter.",
  },
  "Order intake": {
    label: "Order intake",
    description:
      "Capture custom-order details, reference photos, dietary notes, budgets and pickup commitments before quoting.",
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
    description:
      "Complete a consistent packing, labeling, allergen and pickup check for every open order.",
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
  "Smart schedule": {
    label: "Smart schedule",
    description:
      "Turn upcoming accepted orders into production tasks at the right time without disturbing work already planned.",
  },
  "Production performance": {
    label: "Plan vs actual",
    description:
      "Compare planned yields and dates with completed kitchen results so future plans become more realistic.",
  },
  "Production timeline": {
    label: "Production timeline",
    description:
      "Turn scheduled batches into a timed prep, bake, cooling, decorating and packing sequence.",
  },
  "Recurring prep": {
    label: "Recurring prep",
    description:
      "Schedule starter feeds, cleaning, ordering, inventory counts and equipment routines.",
  },
  "Prep sheets": {
    label: "Prep sheets",
    description:
      "Print scaled ingredients, kitchen checks, allergens and batch labels for the day.",
  },
  "Kitchen binder": {
    label: "Kitchen binder",
    description:
      "Print one daily packet for production, pickups, recurring tasks and owner notes.",
  },
  "Batch traceability": {
    label: "Batch traceability",
    description:
      "Trace finished batches to ingredient delivery lots, shelf life and captured production cost.",
  },
  "Batch yields": {
    label: "Batch yields",
    description:
      "Record actual portions produced and spot recurring yield loss or overproduction.",
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
  "Recipe lab": {
    label: "Recipe lab",
    description:
      "Manage pricing scenarios, customer tiers, reusable recipe components, packaging presets and recipe history.",
  },
  "Allergen matrix": {
    label: "Allergen matrix",
    description:
      "Review recorded allergens across the whole menu before planning, labeling or quoting.",
  },
  "Label studio": {
    label: "Label studio",
    description:
      "Customize and print consistent product labels with allergens, storage and batch details.",
  },
  "Trace labels": {
    label: "QR trace labels",
    description:
      "Print scannable batch labels for finished products without putting customer details in the code.",
  },
  "Capacity planner": {
    label: "Capacity planner",
    description:
      "Compare scheduled production with prep, oven, decorating and packing time.",
  },
  "Kitchen timers": {
    label: "Kitchen timers",
    description:
      "Run named bake, rest, proof and cooling timers beside the production plan.",
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
    description:
      "Save holiday menus, market targets and event production goals.",
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
  "Purchase orders": {
    label: "Purchase orders",
    description:
      "Track supplier order drafts from planned through received and closed.",
  },
  Substitutions: {
    label: "Substitutions",
    description:
      "Keep approved ingredient replacements, ratios and method or allergen notes.",
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
    description:
      "Find tracked lots nearing expiry and the recipes that can use them.",
  },
  "Daily snapshot": {
    label: "Daily snapshot",
    description:
      "Review one day of sales, costs, payments, tax and kitchen output.",
  },
  "Daily closeout": {
    label: "Daily closeout",
    description:
      "Complete the owner checklist and leave tomorrow's first priority.",
  },
  "Menu profitability": {
    label: "Menu profitability",
    description:
      "Rank menu items by sales, margin and profit earned per labor hour.",
  },
  "Cost alerts": {
    label: "Cost alerts",
    description:
      "Find recipes whose current ingredient and production costs fall below pricing targets.",
  },
  "Sales trends": {
    label: "Sales trends",
    description:
      "Compare recent revenue, gross profit, order counts and menu performance.",
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
  "Equipment care": {
    label: "Equipment care",
    description:
      "Track bakery equipment, service dates and maintenance history.",
  },
  "Data tools": {
    label: "Data tools",
    description:
      "Export or import CSV records and inspect backup contents before recovery.",
  },
  Receiving: {
    label: "Receive deliveries",
    description:
      "Receive supplier packages once and update stock, lots, costs, movements, and price history together.",
  },
  "Supplier insights": {
    label: "Supplier insights",
    description:
      "Compare normalized supplier prices and see which low-stock ingredients need a buying decision.",
  },
  "Waste coach": {
    label: "Waste coach",
    description:
      "Find repeated waste patterns and turn each one into a practical prevention step.",
  },
  "Bakery profiles": {
    label: "Bakery profiles",
    description:
      "Save and switch business identity and appearance presets for different brands or locations.",
  },
  "Secure backups": {
    label: "Secure backups",
    description:
      "Download password-protected workspace backups and maintain a clear recovery routine.",
  },
  "Change history": {
    label: "Change history",
    description:
      "Review a compact timeline of the parts of the workspace that changed.",
  },
  "Setup checklist": {
    label: "Owner setup checklist",
    description:
      "Complete the core bakery setup so forecasts, goals, pricing, and recovery tools work well.",
  },
  Archive: {
    label: "Archive",
    description:
      "Move old completed work out of daily views while keeping it restorable in backups.",
  },
  Tutorial: {
    label: "Getting started",
    description:
      "Follow the owner workflow from initial setup through production, fulfillment and monthly review.",
  },
  "User guide": {
    label: "User guide",
    description:
      "Search plain-language instructions for setup, daily work, pricing, production, finance, backups, and troubleshooting.",
  },
  "Help & support": {
    label: "Help & support",
    description:
      "Create a privacy-safe report, retry the steps, and open an email draft for support.",
  },
  "Business profile": {
    label: "Business profile",
    description:
      "Set the bakery contact and registration details shown on printed customer documents.",
  },
  "App customization": {
    label: "App customization",
    description:
      "Personalize the workspace appearance and choose how much guidance appears while you work.",
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
    description:
      "Check the installed Windows app version, review release notes and install available updates.",
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
