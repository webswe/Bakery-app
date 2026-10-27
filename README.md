# Bakery Ledger

A local-first bakery business desktop app. Includes ingredient and packaging purchases, separate saved food and other tax rates, recipes with batch and portion costs, package purchase estimates, sales, operating expenses, and monthly profit/loss. Starts with sample inventory and a recipe; financial records start empty. Currency is USD; cups/spoons use US volume measures. Weight/volume conversions use grams per US cup or ingredient density in g/ml. For example, enter 120 g/cup for flour: 2 cups use 240 g from a 2 kg bag. Weigh your ingredient to confirm this value. Tax settings provide separate Food and Other defaults for future purchases; editing them does not rewrite existing item taxes or historical sales. The dashboard includes daily revenue/cost bars, monthly profit/loss, product performance, average sale, portions sold, and previous-month revenue comparison. Recipe yield means sellable portions, not individual ingredients. Costs use proportional consumption; purchase estimates round each recipe line up to whole packages and do not track pantry stock. Add each ingredient once per recipe to avoid duplicate purchase estimates. Profit excludes labor unless recorded as an operating expense. Record sales and expenses on a consistent tax basis; this is not tax accounting software.

## Develop

Node 22+ and npm. Use the existing checkout; no worktree is needed.

```
npm ci
npm test
npm run build
npm run dev
```

`npm run desktop` opens the built application on a machine with a graphical desktop. Records persist in localStorage on the current device. Export JSON backups regularly, especially before switching between browser and desktop, which have separate storage. Restore replaces current records after confirmation. There is no account, cloud sync, or multiuser access.

## Windows executable and updates

On Windows, run `npm ci` then `npm run dist:win`. Find the NSIS installer `.exe` in `release/`. The GitHub Actions workflow builds a Windows release when a `v*` tag is pushed, or when run manually. Update package.json's version for each release; tag it with the same version. The workflow needs repository Actions enabled and its GITHUB_TOKEN contents-write permission. Publish the resulting GitHub release (electron-builder may create a draft) including the installer, blockmap, and latest.yml. Packaged apps check the configured public GitHub release feed on launch, download newer releases, and offer a restart to install. Private repositories require a separate supported update distribution strategy; never embed a GitHub token in the app. Updates cannot be verified until releases are published. Sign production installers with a Windows code-signing certificate to establish publisher trust; signing credentials are not configured here.

## Inventory and production (1.2)

Common ingredient presets include approximate US cup weights (and a 50 g shelled egg). Confirm these against your own ingredients; packing and brand change weight. Presets have no assumed purchase price or stock. New workspaces include them; existing workspaces can select **Inventory → Add common ingredients** without replacing their items. Edit actual package sizes, prices, cup weights, density, or grams per piece. All compatible weight/volume units convert automatically; cross-dimension conversions require an ingredient measurement. Count/weight conversions need grams per piece. No universal cup weight is assumed.

1. Receive packages in **Inventory**, or use **Set on-hand quantity** for counts, spoilage, and corrections. Counts use the item's purchase unit (e.g. kg); receiving two 2 kg packages adds 4 kg. Stock activity is retained locally.
2. Set your wage per hour and electricity price per kWh in **Cost settings**. In each recipe enter labor minutes, kWh consumed, and other overhead per batch. Full production cost includes all of these.
3. **Can make** includes packaging and aggregates repeated recipe ingredients. It shows whole batches and individual ingredient shortages. **Record production** consumes the entire batch's ingredients/packaging and adds finished portions with captured costs. Set all preset purchase prices before production. Availability is per recipe independently, not a simultaneous production plan.
4. **Product stock** shows available portions, stock value, and full costs. Sales choose the product, quantity, discount, date, customer/order reference, and payment method. The total is automatic; sales cannot exceed finished stock. Cost of sales uses the average captured cost of finished stock. Deleting a tracked sale restores its quantity and cost. Older sales are preserved without retroactively deducting stock.

Labor and overhead included in production reach the profit dashboard when those products sell. Record only additional unallocated operating expenses; recording the same payroll/electricity as expenses as well will double-count it. This is an internal costing tool, not payroll or accrual accounting. Receiving ingredients updates stock only, not expenses (cost of goods is recognized on sale). Product stock currently changes through production and sales; there is no finished-product spoilage adjustment, purchase-order system, expiry tracking, or stock reservation. Export backups regularly.
