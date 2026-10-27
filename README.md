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
