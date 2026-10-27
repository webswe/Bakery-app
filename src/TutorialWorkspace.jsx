import React, { useEffect, useRef, useState } from "react";

export const tutorialSteps = [
  {
    title: "Know what needs attention",
    page: "Overview",
    button: "Open overview",
    text: "Start each day here. Review open orders, batches due, stock alerts, monthly revenue, costs and profit.",
    tip: "Add ordinary business expenses from the latest-transactions panel so profit stays useful.",
  },
  {
    title: "Set your real operating costs",
    page: "Cost settings",
    button: "Set production costs",
    text: "Enter your hourly wage and electricity rate. Bakery Ledger adds these costs to future recipe batches and quotes.",
    tip: "Then visit Tax settings. Purchase tax and customer sales tax are separate, and saved records retain their original rates.",
  },
  {
    title: "Build the stock catalog",
    page: "Ingredients",
    button: "Manage ingredients",
    text: "Add package sizes, prices, suppliers, minimum stock and conversions. Use grams per can for condensed and evaporated milk.",
    tip: "Add boxes, cups, forks and other supplies under Packaging so every recipe includes its complete cost.",
  },
  {
    title: "Create a complete recipe",
    page: "Recipes",
    button: "Manage recipes",
    text: "Add the ingredients and packaging used by one batch, its sellable yield, labor, electricity, overhead and allergens.",
    tip: "The selling price is per portion. The recipe card compares that price with the full batch cost.",
  },
  {
    title: "Quote, accept and collect",
    page: "Quotes",
    button: "Create a quote",
    text: "Choose a recipe and portions, set the target margin, extra costs and customer tax, then save the quote.",
    tip: "Accept it under Orders to create a production task. Record deposits, later payments or refunds under Payments.",
  },
  {
    title: "Plan and complete production",
    page: "Daily planner",
    button: "Open production plan",
    text: "Schedule whole batches, use the kitchen checklist and complete the task when the desserts are made.",
    tip: "Completion deducts ingredients using earliest-expiry lots and adds portions to Finished stock. Prep sheets print scaled quantities and labels.",
  },
  {
    title: "Buy and receive what you need",
    page: "Inventory dashboard",
    button: "Review stock forecast",
    text: "Check shortages caused by scheduled production, build the supplier-grouped shopping list, then receive packages under Inventory.",
    tip: "Open Lot details while receiving to save the actual supplier, price and expiry date. Inventory counts reconcile live lots.",
  },
  {
    title: "Run the owner routine",
    page: "Owner forecast",
    button: "Open owner forecast",
    text: "Use Calendar and Prep sheets for today, Payments and Orders for pickups, and the seven-day forecast for upcoming cash and production needs.",
    tip: "Review Tax report and Waste analysis monthly. Export a backup regularly and optionally enable the local PIN lock.",
  },
];

export function GuidedTutorial({ navigate, onClose }) {
  const [index, setIndex] = useState(0);
  const dialog = useRef(null);
  const step = tutorialSteps[index];
  const last = index === tutorialSteps.length - 1;
  useEffect(() => {
    const previous = document.activeElement;
    dialog.current?.focus();
    return () => previous?.isConnected && previous.focus();
  }, []);
  return (
    <div className="tutorial-overlay" role="presentation">
      <section
        ref={dialog}
        tabIndex={-1}
        className="panel tutorial-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="tutorial-title"
        onKeyDown={(event) => {
          if (event.key === "Escape") onClose();
        }}
      >
        <div className="tutorial-progress" aria-label={`Step ${index + 1} of ${tutorialSteps.length}`}>
          {tutorialSteps.map((item, n) => (
            <span className={n <= index ? "complete" : ""} key={item.title} />
          ))}
        </div>
        <span className="eyebrow">OWNER QUICK START · {index + 1}/{tutorialSteps.length}</span>
        <h2 id="tutorial-title">{step.title}</h2>
        <p>{step.text}</p>
        <div className="tutorial-tip"><b>Best practice</b>{step.tip}</div>
        <button
          className="secondary tutorial-open"
          onClick={() => navigate(step.page)}
        >
          {step.button}
        </button>
        <div className="tutorial-actions">
          <button className="text-button" onClick={onClose}>Exit tutorial</button>
          <span />
          {index > 0 && (
            <button className="secondary" onClick={() => setIndex(index - 1)}>Back</button>
          )}
          <button
            className="primary"
            onClick={() => (last ? onClose() : setIndex(index + 1))}
          >
            {last ? "Finish" : "Next"}
          </button>
        </div>
      </section>
    </div>
  );
}

export default function TutorialWorkspace({ navigate, startTour }) {
  return (
    <div className="tutorial-page">
      <section className="panel tutorial-welcome">
        <div>
          <span className="eyebrow">ABOUT 10 MINUTES</span>
          <h2>Set up the bakery once, then follow the daily workflow</h2>
          <p>
            Bakery Ledger is organized around the owner’s real sequence: price
            purchases, cost recipes, quote, produce, collect, fulfill and review.
          </p>
        </div>
        <button className="primary" onClick={startTour}>Start guided tutorial</button>
      </section>
      <div className="tutorial-flow" aria-label="Bakery workflow">
        <span>Set up</span><b>→</b><span>Quote</span><b>→</b><span>Plan</span>
        <b>→</b><span>Produce</span><b>→</b><span>Fulfill</span><b>→</b><span>Review</span>
      </div>
      <div className="tutorial-grid">
        {tutorialSteps.map((step, index) => (
          <article className="panel tutorial-card" key={step.title}>
            <span className="tutorial-number">{index + 1}</span>
            <div>
              <h3>{step.title}</h3>
              <p>{step.text}</p>
              <small>{step.tip}</small>
              <button className="text-button" onClick={() => navigate(step.page)}>
                {step.button} →
              </button>
            </div>
          </article>
        ))}
      </div>
      <section className="panel tutorial-rhythm">
        <h2>A simple owner rhythm</h2>
        <div>
          <p><b>Every morning</b> Overview, Calendar, Prep sheets and stock shortages.</p>
          <p><b>For every order</b> Save quote, accept order, record payments, complete production, then fulfill.</p>
          <p><b>After shopping</b> Receive each delivery lot with its current price and expiry date.</p>
          <p><b>Every month</b> Review profit, tax, waste and supplier prices; then export a backup.</p>
        </div>
      </section>
    </div>
  );
}
