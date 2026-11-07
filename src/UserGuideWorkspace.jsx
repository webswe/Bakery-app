import React, { useDeferredValue, useMemo, useState } from "react";
import { BookOpen, ChevronDown, ExternalLink, Search, X } from "lucide-react";

const guideSections = [
  {
    id: "first-setup",
    category: "Getting started",
    title: "Set up Bakery Ledger for the first time",
    summary:
      "Enter the bakery details and costs that every recipe, quote, document, and report relies on.",
    page: "Setup checklist",
    steps: [
      "Open the Owner setup checklist and complete each item in order.",
      "Add the bakery name, contact details, support email, and document information under Business profile.",
      "Set the hourly wage, electricity rate, and overhead assumptions under Cost settings.",
      "Choose the customer sales-tax default and purchase-tax defaults under Tax settings.",
      "Add ingredients and packaging before building recipes.",
      "Set monthly revenue, profit, margin, cash-reserve, and waste goals.",
    ],
    tips: [
      "Existing saved transactions keep their original costs and tax treatment when settings change.",
      "Use Bakery profiles if the same owner runs more than one brand or location identity.",
    ],
    keywords: "setup business profile cost tax goals first week onboarding",
  },
  {
    id: "daily-routine",
    category: "Daily routine",
    title: "Run the daily owner routine",
    summary:
      "Start with commitments, work through production and pickups, then reconcile the day.",
    page: "Daily snapshot",
    steps: [
      "Review Overview, Daily snapshot, and the Calendar for orders, production, and alerts.",
      "Open Use soon before planning so ingredients near expiry can be used first.",
      "Review the Smart schedule, then check Capacity planner before accepting its suggestions.",
      "Print Prep sheets or the Kitchen binder and complete production from Daily planner.",
      "Use Packing before handing off each order and record the final payment.",
      "Finish with Daily closeout, count cash, record payouts, and plan tomorrow’s first priority.",
    ],
    tips: [
      "Press Ctrl or Command + K to open quick search from anywhere.",
      "Press F1 to return to this guide.",
    ],
    keywords: "morning daily routine closeout overview calendar cash",
  },
  {
    id: "inventory-catalog",
    category: "Stock & purchasing",
    title: "Add ingredients and packaging correctly",
    summary:
      "Record the package you buy, the unit recipes use, and the conversions needed for accurate costing.",
    page: "Ingredients",
    steps: [
      "Create an item using the package size and package price shown by the supplier.",
      "Choose Ingredient or Packaging so it appears in the right catalog.",
      "Set minimum stock to control shortage and reorder warnings.",
      "Add grams per cup, tablespoon, teaspoon, density, or can when recipes use a different unit. For butter, grams per tablespoon gives the clearest result.",
      "For condensed or evaporated milk, enter the can’s actual gram weight rather than relying on a fixed default.",
    ],
    tips: [
      "Changing a current package price affects future costing; completed records keep captured costs.",
      "Delete is blocked when an item is still used by a recipe. Remove it from recipes first.",
    ],
    keywords:
      "ingredient packaging units cups fractions can milk conversion catalog",
  },
  {
    id: "receiving",
    category: "Stock & purchasing",
    title: "Receive a supplier delivery",
    summary:
      "Update on-hand stock, lot expiry, supplier history, and current package cost in one action.",
    page: "Receiving",
    steps: [
      "Choose the delivered inventory item.",
      "Enter the number of packages and the actual price per package.",
      "Record the supplier, received date, and expiry date when known.",
      "Save the delivery, then check Inventory lots to confirm the new lot.",
      "Open Supplier insights after several purchases to compare normalized prices.",
    ],
    tips: [
      "Production consumes the earliest-expiring tracked lot first.",
      "Use stock movements for corrections; use Receiving for real deliveries.",
    ],
    keywords: "receive delivery supplier purchase lot expiry stock price",
  },
  {
    id: "recipes",
    category: "Recipes & pricing",
    title: "Build and price a recipe",
    summary:
      "Capture everything used by one batch, including packaging and owner labor, before setting the selling price.",
    page: "Recipes",
    steps: [
      "Create a recipe and enter its sellable yield.",
      "Add every ingredient using decimals or common fractions such as 1/2 or 2 1/4.",
      "Add boxes, boards, cups, forks, labels, and other packaging used by the batch.",
      "Record prep, bake, cooling, decorating, and labor information.",
      "Choose the selling format: individual, slice, box, tray, dozen, or custom.",
      "Review Recipe lab and apply a suggested price only after checking the target margin.",
    ],
    tips: [
      "Duplicate a recipe before making a flavor or size variation.",
      "Version history preserves earlier recipe cards after edits.",
    ],
    keywords:
      "recipe maker price pricing packaging labor fraction duplicate edit margin",
  },
  {
    id: "quotes-orders",
    category: "Sales & customers",
    title: "Move from inquiry to accepted order",
    summary:
      "Capture the request, calculate a quote, accept it, and keep the customer and production records connected.",
    page: "Order intake",
    steps: [
      "Use Order intake for event details, design notes, dietary notes, budget, and reference photos.",
      "Create and save the quote with portions, margin, extra costs, and customer tax.",
      "When the customer accepts, create the order from the saved quote instead of retyping it.",
      "Record deposits and later payments under Payments.",
      "Print the quote, invoice, receipt, or pickup slip from Documents.",
    ],
    tips: [
      "The quoted subtotal is before customer tax; the tax line is added to the customer total.",
      "Use Exempt only when the sale itself should have no customer sales tax.",
    ],
    keywords: "inquiry quote order deposit payment invoice tax exempt customer",
  },
  {
    id: "production",
    category: "Kitchen production",
    title: "Schedule and complete production",
    summary:
      "Convert accepted orders into realistic kitchen work and keep ingredient and finished-stock records accurate.",
    page: "Smart schedule",
    steps: [
      "Review Smart schedule for accepted orders that do not have a production task.",
      "Check Capacity planner for overloaded prep, oven, decorating, or packing time.",
      "Add the suggested tasks, then adjust exact dates in Daily planner when needed.",
      "Use Production timeline to sequence prep, baking, cooling, decorating, and packing.",
      "Complete a task only when the batch is physically made; this deducts ingredients and adds finished stock.",
      "Record actual yield and working minutes under Plan vs actual.",
    ],
    tips: [
      "The scheduler learns from recorded actual minutes on later orders.",
      "Editing a production task changes the plan; it does not change the recipe card.",
    ],
    keywords:
      "production planner edit schedule capacity timeline complete batch actual time yield",
  },
  {
    id: "trace-labels",
    category: "Kitchen production",
    title: "Use prep sheets, labels, and batch tracing",
    summary:
      "Give the kitchen clear instructions and retain the link from finished desserts back to ingredient lots.",
    page: "Prep sheets",
    steps: [
      "Print Prep sheets for scaled ingredients, method, checks, allergens, and batch labels.",
      "Use Kitchen binder when one combined daily packet is more convenient.",
      "Print customer-facing labels from Label studio.",
      "Print QR trace labels for internal batch identification.",
      "Use Batch traceability to review which ingredient lots were consumed by a completed batch.",
    ],
    tips: [
      "QR trace labels contain a batch identifier and production date, not customer information.",
      "Always review recorded allergens before printing a label.",
    ],
    keywords: "prep sheet label qr trace allergen kitchen binder print batch",
  },
  {
    id: "finished-stock",
    category: "Sales & customers",
    title: "Sell or fulfill finished desserts",
    summary:
      "Use finished stock for completed products so direct sales and customer orders reduce the correct quantities.",
    page: "Product stock",
    steps: [
      "Complete production to add portions to Finished stock.",
      "For a walk-in or direct sale, choose the recipe and selling unit, then record the sale.",
      "For a customer order, open Orders and fulfill it from the linked finished stock.",
      "Confirm the payment method and customer sales-tax treatment.",
      "Review the resulting sale under Overview or Daily snapshot.",
    ],
    tips: [
      "A box or dozen sale deducts its saved number of individual portions.",
      "Do not complete production twice to correct stock; use inventory or finished-stock corrections.",
    ],
    keywords: "finished stock sale fulfill box dozen portions direct sale",
  },
  {
    id: "shopping",
    category: "Stock & purchasing",
    title: "Forecast shortages and build a shopping list",
    summary:
      "Let scheduled production calculate what is missing before shopping or placing a purchase order.",
    page: "Inventory dashboard",
    steps: [
      "Schedule production first so ingredient demand exists.",
      "Open Inventory dashboard and choose the forecast-through date.",
      "Review shortage dates and required package counts.",
      "Open Shopping list, adjust quantities if needed, and print the supplier-grouped list.",
      "Save a purchase order when you want to track ordered and received status.",
      "Use Receiving when the packages arrive.",
    ],
    tips: [
      "Minimum stock and scheduled recipe demand are both considered.",
      "A missing conversion or invalid recipe line can prevent a reliable forecast; the dashboard reports those errors.",
    ],
    keywords:
      "shopping list shortage forecast reorder purchase order supplier print",
  },
  {
    id: "goals-finance",
    category: "Goals & finance",
    title: "Use goals and the financial command center",
    summary:
      "Turn recorded sales and expenses into practical owner decisions without treating sales tax as income.",
    page: "Financial center",
    steps: [
      "Set revenue, profit, margin, cash-reserve, waste, batch, and owner-hour targets under Goals & tasks.",
      "Open Goals & finances and choose the reporting month.",
      "Compare progress bars with the owner guidance and profit bridge.",
      "Review outstanding pickup balances and the largest operating-expense categories.",
      "Open Menu profitability before changing prices or removing a product.",
      "Use Daily closeout for cash reconciliation; use Tax report for recorded tax totals.",
    ],
    tips: [
      "Revenue is shown before customer sales tax. Tax collected remains a separate liability figure.",
      "Profit is useful only when purchases, operating expenses, recipe costs, and refunds are recorded consistently.",
    ],
    keywords:
      "finance goals revenue profit cash margin expense tax report money",
  },
  {
    id: "waste",
    category: "Goals & finance",
    title: "Control expiry and waste",
    summary:
      "Record losses consistently, find repeat patterns, and plan products that use ingredients before expiry.",
    page: "Waste & expiry",
    steps: [
      "Record every discarded ingredient or product with a reason and quantity.",
      "Review Use soon before weekly production planning.",
      "Open Waste analysis for cost totals by item and reason.",
      "Open Waste coach for a suggested prevention action based on repeat patterns.",
      "Adjust purchasing, minimum stock, batch size, or recipe yield after confirming the cause.",
    ],
    tips: [
      "Use specific, consistent reason names so repeated causes group together.",
      "A waste target is measured as a percentage of recorded monthly revenue.",
    ],
    keywords: "waste expiry use soon loss prevention spoilage",
  },
  {
    id: "backup-update",
    category: "App & data",
    title: "Back up and update safely",
    summary:
      "Keep recoverable copies before updates and understand which backups can move between computers.",
    page: "Secure backups",
    steps: [
      "The installed Windows app creates one device-encrypted backup per day and keeps up to 30.",
      "Create a password-protected portable backup every week and before app updates.",
      "Store the portable file away from the bakery computer and retain its password separately.",
      "Use App updates to check the installed version and review release notes.",
      "Use Secure backups or Backups & recovery to restore only after confirming the file and date.",
    ],
    tips: [
      "Device-encrypted backups are tied to the Windows account that created them.",
      "Portable encrypted backups can move to another computer but cannot be opened without their password.",
    ],
    keywords: "backup restore encrypted update release version recovery",
  },
  {
    id: "customize",
    category: "App & data",
    title: "Customize the workspace",
    summary:
      "Choose an appearance, dashboard arrangement, saved shortcuts, and business profile that fit the owner’s routine.",
    page: "App customization",
    steps: [
      "Choose a colorway and display density under App customization.",
      "Arrange the Overview dashboard around the numbers you check most often.",
      "Pin frequently used pages with the star beside the page title.",
      "Save a Bakery profile before switching branding or document identity.",
      "Use Ctrl or Command + K to search pages and records instead of navigating every tab.",
    ],
    tips: [
      "Customization changes presentation and shortcuts; it does not alter financial records.",
      "Bakery profiles share the same ledger and are intended for related brands or locations managed together.",
    ],
    keywords: "customization color theme dashboard profile shortcut search",
  },
  {
    id: "support",
    category: "App & data",
    title: "Report a problem",
    summary:
      "Create a useful support report in plain language without automatically including private business data.",
    page: "Help & support",
    steps: [
      "Open Help & support and describe what you expected to happen.",
      "Repeat the exact steps that caused the problem and record them in order.",
      "Include what happened, whether it happens every time, and the screen you were using.",
      "Save the report or open the prepared email draft.",
      "Attach a screenshot only when it helps explain the visible result.",
    ],
    tips: [
      "The report includes app and device information, but not bakery records automatically.",
      "Do not include customer payment details or passwords.",
    ],
    keywords: "support email bug report problem tester reproduce help",
  },
];

const categories = [
  "All",
  ...new Set(guideSections.map((row) => row.category)),
];

export default function UserGuideWorkspace({ navigate }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [openId, setOpenId] = useState("first-setup");
  const deferredQuery = useDeferredValue(query.trim().toLocaleLowerCase());
  const results = useMemo(
    () =>
      guideSections.filter((row) => {
        const inCategory = category === "All" || row.category === category;
        const text =
          `${row.title} ${row.summary} ${row.keywords} ${row.steps.join(" ")} ${row.tips.join(" ")}`.toLocaleLowerCase();
        return inCategory && (!deferredQuery || text.includes(deferredQuery));
      }),
    [category, deferredQuery],
  );
  return (
    <div className="user-guide">
      <section className="panel guide-hero">
        <div>
          <span className="eyebrow">IN-APP OWNER MANUAL</span>
          <h2>How can we help?</h2>
          <p>
            Search by task or browse the workflow. Every article opens the exact
            Bakery Ledger screen where the work happens.
          </p>
        </div>
        <BookOpen size={46} aria-hidden="true" />
      </section>
      <div className="guide-search-row">
        <label className="guide-search">
          <Search size={18} aria-hidden="true" />
          <span className="sr-only">Search the user guide</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search: tax, recipe price, receive stock, backup…"
          />
          {query && (
            <button
              aria-label="Clear guide search"
              onClick={() => setQuery("")}
            >
              <X size={15} />
            </button>
          )}
        </label>
        <span className="pill">{results.length} ARTICLES</span>
      </div>
      <div className="guide-categories" aria-label="Guide categories">
        {categories.map((name) => (
          <button
            className={category === name ? "active" : ""}
            aria-pressed={category === name}
            onClick={() => setCategory(name)}
            key={name}
          >
            {name}
          </button>
        ))}
      </div>
      <div className="guide-results">
        {results.map((article) => {
          const open = openId === article.id;
          return (
            <article className="panel guide-article" key={article.id}>
              <button
                className="guide-article-heading"
                aria-expanded={open}
                onClick={() => setOpenId(open ? "" : article.id)}
              >
                <span>
                  <small>{article.category}</small>
                  <b>{article.title}</b>
                  <em>{article.summary}</em>
                </span>
                <ChevronDown className={open ? "open" : ""} size={20} />
              </button>
              {open && (
                <div className="guide-article-body">
                  <h3>Steps</h3>
                  <ol>
                    {article.steps.map((step) => (
                      <li key={step}>{step}</li>
                    ))}
                  </ol>
                  <div className="guide-tips">
                    <h3>Good to know</h3>
                    {article.tips.map((tip) => (
                      <p key={tip}>{tip}</p>
                    ))}
                  </div>
                  <button
                    className="primary"
                    onClick={() => navigate(article.page)}
                  >
                    Open {article.page}
                    <ExternalLink size={15} />
                  </button>
                </div>
              )}
            </article>
          );
        })}
        {!results.length && (
          <section className="panel empty">
            No guide article matches that search. Try a shorter word such as
            “tax,” “stock,” or “recipe.”
          </section>
        )}
      </div>
    </div>
  );
}

export { guideSections };
