# Bakery Ledger

Bakery Ledger is a private, local-first desktop workspace for an owner, head chef, or baker. It brings recipes, ingredient costs, production, finished stock, direct sales, quotes, orders, and day-to-day business planning into one Windows app.

## What it helps with

- Build recipes with package, can, cup, spoon, weight, and count measurements.
- Price every dessert from ingredients, packaging, labour, utilities, and overhead.
- Plan production, print prep sheets and labels, and create a shopping list from upcoming work.
- Receive stock, track lots and expiry dates, adjust finished products, and correct accidentally added batches.
- Create quotes and customer orders, track deposits and payments, then fulfil from finished stock.
- Record one or several dessert types in a single sale, with tax, payment method, customer, and sales channel.
- Review revenue, margin, tax collected, waste, production performance, and owner goals.
- Store encrypted device backups, export portable JSON backups, and create privacy-safe support reports.

## Privacy and data

Bakery Ledger stores bakery records on the current device. It has no account, cloud sync, analytics, or automatic data upload. Exports, backups, and support reports are under the owner’s control.

Support reports contain the app version, operating system, current page, and the details entered by the reporter. They do not automatically include recipes, customer details, inventory, sales, or backups.

## Get the Windows app

Download the latest installer from [Releases](https://github.com/webswe/Bakery-app/releases). Run `Bakery-Ledger-Setup-<version>.exe`, then open **Bakery Ledger** from the Start menu.

The installed app checks GitHub Releases for updates. When an update is ready, choose **Restart and update**. Existing bakery data stays on the device during an update.

## Getting started

1. Open the in-app tutorial or press `F1`.
2. Complete your Business profile and cost settings.
3. Add ingredients, packaging, package sizes, and current stock.
4. Build recipes, then use **Daily planner** to schedule production.
5. Complete production to create finished stock.
6. Use **Record a sale** for completed sales, or **Quotes** and **Customer orders** for deposits, invoices, and planned pickups.

Export a backup from **Settings → Backups & recovery** before major changes.

## Report a problem

Open **Help & support** in Bakery Ledger, describe what you were trying to do, and save the generated report. You can attach the report to the prepared email draft for support at `botaa109@gmail.com`.

## Develop locally

Requirements: Node.js 22+ and npm.

```bash
npm ci
npm test
npm run build
npm run dev
```

To create a Windows installer locally:

```bash
npm run dist:win
```

The installer is written to `release/`. Local browser and installed desktop builds use different storage areas; export a backup before moving records between them.

## Publish a release

1. Update the version in `package.json` and `package-lock.json`.
2. Run `npm run format:check`, `npm test`, and `npm run build`.
3. Commit the release version, push `main`, and push a matching `v<version>` tag.
4. GitHub Actions builds the Windows installer and creates the release assets.

The update feed relies on public GitHub releases. Do not put a GitHub token in the app.

## License

[MIT](LICENSE)
