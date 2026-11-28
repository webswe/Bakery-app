import React, { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { saveRecipePreset } from "./bakeryOperations.js";
import { lineCost, unitLabels, units } from "./costing.js";
import { parseQuantity } from "./quantity.js";
import { recipeSaleDetails } from "./recipePricing.js";
import { purchaseMode, purchaseTax } from "./taxation.js";
import { money } from "./uiFormatters.js";

const uid = () => crypto.randomUUID();

function UnitSelect({ name, value, onChange }) {
  return (
    <select name={name} defaultValue={value || "g"} onChange={onChange}>
      {Object.keys(units).map((u) => (
        <option key={u} value={u}>
          {unitLabels[u]}
        </option>
      ))}
    </select>
  );
}
export function ItemFields({ item: i = {}, taxRates }) {
  const [mode, setMode] = useState(i.id ? purchaseMode(i) : "added"),
    [price, setPrice] = useState(i.price ?? ""),
    [category, setCategory] = useState(
      i.taxCategory || (i.type === "packaging" ? "other" : "food"),
    ),
    [rate, setRate] = useState(
      i.tax ?? taxRates[i.type === "packaging" ? "other" : "food"],
    );
  let taxDetails;
  try {
    taxDetails = purchaseTax({ price, tax: rate, taxMode: mode });
  } catch {}
  function chooseTax(value) {
    setCategory(value);
    setRate(taxRates[value]);
  }
  return (
    <>
      <label>
        Item name
        <input
          name="name"
          defaultValue={i.name}
          required
          placeholder="e.g. All-purpose flour"
        />
      </label>
      <label>
        Category
        <select
          name="type"
          defaultValue={i.type || "ingredient"}
          onChange={(e) =>
            chooseTax(e.target.value === "packaging" ? "other" : "food")
          }
        >
          <option value="ingredient">Ingredient</option>
          <option value="packaging">Packaging</option>
        </select>
      </label>
      <div className="form-row">
        <label>
          Net package quantity
          <input
            name="amount"
            type="number"
            min="0.001"
            step="any"
            defaultValue={i.amount}
            required
          />
        </label>
        <label>
          Unit
          <UnitSelect name="unit" value={i.unit} />
        </label>
      </div>
      <label>
        Package price ($)
        <input
          name="price"
          type="number"
          min="0"
          step="0.01"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          required
        />
      </label>
      <div className="form-row">
        <label>
          Tax category
          <select
            name="taxCategory"
            value={category}
            onChange={(e) => chooseTax(e.target.value)}
          >
            <option value="food">Food</option>
            <option value="other">Other</option>
          </select>
        </label>
        <label>
          Purchase tax treatment
          <select
            name="taxMode"
            value={mode}
            onChange={(e) => setMode(e.target.value)}
          >
            <option value="added">Add tax to this price</option>
            <option value="included">Tax already included</option>
            <option value="exempt">Tax exempt / no tax</option>
            {mode === "legacy" && (
              <option value="legacy">Previously saved: no extra tax</option>
            )}
          </select>
        </label>
      </div>
      {mode === "legacy" && (
        <p className="hint">
          This older item did not distinguish included tax from exemption. Its
          cost stays unchanged until you choose a treatment.
        </p>
      )}
      {mode === "added" || mode === "included" ? (
        <label>
          Purchase tax rate (%)
          <input
            name="tax"
            type="number"
            min="0"
            max="100"
            step="any"
            value={rate}
            onChange={(e) => setRate(e.target.value)}
            required
          />
        </label>
      ) : (
        <input type="hidden" name="tax" value={rate} />
      )}
      <p className="hint">
        Food and Other rates are purchase defaults only. Editing this item does
        not change those defaults or customer sales tax.
      </p>
      {taxDetails && (
        <div className="tax-breakdown" role="status">
          <h3>Package cost breakdown</h3>
          <dl>
            <dt>{mode === "legacy" ? "Entered price" : "Before-tax price"}</dt>
            <dd>{money(taxDetails.base)}</dd>
            <dt>
              {mode === "legacy"
                ? "Additional tax"
                : mode === "exempt"
                  ? "Tax (exempt)"
                  : `Purchase tax (${rate}%)`}
            </dt>
            <dd>{money(taxDetails.tax)}</dd>
            <dt>Final package cost</dt>
            <dd>{money(taxDetails.total)}</dd>
          </dl>
          <small>
            Used in recipe costs, stock value and purchase estimates.
          </small>
        </div>
      )}
      <div className="conversion-box">
        <h3>Stock planning</h3>
        <label>
          Supplier
          <input
            name="supplier"
            defaultValue={i.supplier || ""}
            placeholder="Supplier name"
          />
        </label>
        <label>
          Minimum on hand (purchase unit)
          <input
            name="minStock"
            type="number"
            min="0"
            step="any"
            defaultValue={i.minStock || 0}
          />
        </label>
        <label>
          Current stock expiry
          <input
            name="expiryDate"
            type="date"
            defaultValue={i.expiryDate || ""}
          />
        </label>
        <p className="hint">
          Expiry applies to the current stock as a whole; update it when
          receiving new stock.
        </p>
        <h3>Can size</h3>
        <p>
          Use “can” in purchases or recipes. Set the net weight from your
          brand’s label; condensed and evaporated milk often use different can
          sizes.
        </p>
        <label>
          Grams per can
          <input
            name="gramsPerCan"
            type="number"
            min="0.001"
            step="any"
            defaultValue={i.gramsPerCan}
            placeholder="e.g. 397 condensed / 354 evaporated"
          />
        </label>
        <h3>Kitchen-measure conversions</h3>
        <p>
          Add the measures you use in recipes. A direct tablespoon value is
          especially useful for butter, shortening, and nut butters.
        </p>
        <div className="form-row">
          <label>
            Grams per US cup
            <input
              name="gramsPerCup"
              type="number"
              min="0.001"
              step="any"
              defaultValue={i.gramsPerCup}
              placeholder="e.g. 120 flour"
            />
          </label>
          <label>
            Grams per tablespoon
            <input
              name="gramsPerTbsp"
              type="number"
              min="0.001"
              step="any"
              defaultValue={i.gramsPerTbsp}
              placeholder="e.g. 14.2 butter"
            />
          </label>
          <label>
            Grams per teaspoon
            <input
              name="gramsPerTsp"
              type="number"
              min="0.001"
              step="any"
              defaultValue={i.gramsPerTsp}
              placeholder="e.g. 4.7 butter"
            />
          </label>
        </div>
        <p className="hint">
          Example: butter at 14.2 g per tablespoon means 2 tbsp uses 28.4 g.
          Weigh your own ingredient for the most accurate result.
        </p>
        <details>
          <summary>Advanced: density and individual pieces</summary>
          <label>
            Grams per piece (optional)
            <input
              name="gramsPerEach"
              type="number"
              min="0.001"
              step="any"
              defaultValue={i.gramsPerEach}
              placeholder="e.g. 50 for a shelled egg"
            />
          </label>
          <label>
            Grams per stick (optional)
            <input
              name="gramsPerStick"
              type="number"
              min="0.001"
              step="any"
              defaultValue={i.gramsPerStick}
              placeholder="e.g. 113.4 for US butter"
            />
          </label>
          <label>
            Density (g/ml), optional
            <input
              name="density"
              type="number"
              min="0.001"
              step="any"
              defaultValue={i.density}
              placeholder="Used when grams per cup is not set"
            />
          </label>
        </details>
      </div>
      <p className="hint">
        US cups and spoons. Use “stick” for ingredients such as butter. Direct
        measure values take priority over density for that exact measure.
      </p>
    </>
  );
}
export function RecipeFields({ recipe: r = {}, items, data, save }) {
  const savedSale = recipeSaleDetails(r);
  const [lines, setLines] = useState(
      (r.lines || []).map((l) => ({ ...l, key: uid() })),
    ),
    [yieldN, setYield] = useState(r.yield || 1),
    [saleFormat, setSaleFormat] = useState(savedSale.format),
    [saleQuantity, setSaleQuantity] = useState(savedSale.quantity),
    [salePrice, setSalePrice] = useState(savedSale.salePrice);
  let total = 0,
    ingredientTotal = 0,
    packagingTotal = 0;

  function savePreset(kind, message) {
    const name = prompt(message);
    if (!name) return;
    const packaging = kind === "packaging";
    const presetLines = lines
      .filter((line) => {
        const item = items.find((entry) => entry.id === line.itemId);
        return (item?.type === "packaging") === packaging;
      })
      .map(({ itemId, amount, unit }) => ({ itemId, amount, unit }));
    save(saveRecipePreset(data, kind, { name, lines: presetLines }));
  }

  return (
    <>
      <div className="recipe-editor-intro">
        <div>
          <span className="eyebrow">
            {r.id ? "EDITING SAVED RECIPE" : "NEW RECIPE"}
          </span>
          <h3>{r.name || "Build a complete batch"}</h3>
        </div>
        <span className="pill">{lines.length} RECIPE ITEMS</span>
      </div>
      <label>
        Recipe name
        <input
          name="name"
          defaultValue={r.name}
          required
          placeholder="e.g. Tres leches cups"
        />
      </label>
      <div className="form-row">
        <label>
          Category
          <input
            name="category"
            defaultValue={r.category || "Desserts"}
            required
          />
        </label>
        <label>
          Sellable portions
          <input
            name="yield"
            type="number"
            min="1"
            step="1"
            value={yieldN}
            onChange={(e) => setYield(+e.target.value)}
            required
          />
        </label>
      </div>
      <div className="conversion-box recipe-selling-box">
        <h3>Selling format</h3>
        <p>
          Choose how the customer buys this dessert. Bakery Ledger still tracks
          finished stock by individual sellable portions.
        </p>
        <div className="form-row">
          <label>
            Sold as
            <select
              name="saleFormat"
              value={saleFormat}
              onChange={(event) => {
                const format = event.target.value;
                setSaleFormat(format);
                if (format === "dozen") setSaleQuantity(12);
                if (["individual", "slice"].includes(format))
                  setSaleQuantity(1);
              }}
            >
              <option value="individual">Individual dessert</option>
              <option value="slice">Slice</option>
              <option value="box">Box</option>
              <option value="tray">Tray</option>
              <option value="dozen">Dozen</option>
              <option value="custom">Custom selling unit</option>
            </select>
          </label>
          <label>
            Desserts / portions in one selling unit
            <input
              name="saleQuantity"
              type="number"
              min="1"
              max={yieldN}
              step="1"
              value={saleQuantity}
              disabled={["individual", "slice", "dozen"].includes(saleFormat)}
              onChange={(event) => setSaleQuantity(+event.target.value)}
              required
            />
          </label>
        </div>
        {["individual", "slice", "dozen"].includes(saleFormat) && (
          <input name="saleQuantity" type="hidden" value={saleQuantity} />
        )}
        <label>
          Customer price for one{" "}
          {saleFormat === "individual"
            ? "dessert"
            : saleFormat === "custom"
              ? "selling unit"
              : saleFormat}{" "}
          ($)
          <input
            name="salePrice"
            type="number"
            min="0"
            step="0.01"
            value={salePrice}
            onChange={(event) => setSalePrice(event.target.value)}
            required
          />
        </label>
        <div className="price-equivalent">
          <span>Equivalent price per dessert / portion</span>
          <b>{money((Number(salePrice) || 0) / Math.max(1, saleQuantity))}</b>
        </div>
        <p className="hint">
          Ingredient and packaging lines below are batch quantities. Their
          costs, plus labor, utilities and overhead, are divided across the
          batch yield automatically.
        </p>
      </div>
      <label>
        Allergens
        <input
          name="allergens"
          defaultValue={r.allergens || ""}
          placeholder="e.g. Milk, eggs, wheat, peanuts"
        />
      </label>
      <div className="conversion-box">
        <h3>Method & timing</h3>
        <div className="form-row">
          <label>
            Prep minutes
            <input
              name="prepMinutes"
              type="number"
              min="0"
              step="1"
              defaultValue={r.prepMinutes || 0}
            />
          </label>
          <label>
            Bake minutes
            <input
              name="bakeMinutes"
              type="number"
              min="0"
              step="1"
              defaultValue={r.bakeMinutes || 0}
            />
          </label>
          <label>
            Cooling minutes
            <input
              name="coolingMinutes"
              type="number"
              min="0"
              step="1"
              defaultValue={r.coolingMinutes || 0}
            />
          </label>
        </div>
        <div className="form-row">
          <label>
            Bake temperature
            <input
              name="bakeTemperature"
              defaultValue={r.bakeTemperature || ""}
              placeholder="e.g. 350°F / 175°C"
            />
          </label>
          <label>
            Equipment
            <input
              name="equipment"
              defaultValue={r.equipment || ""}
              placeholder="Mixer, 2 sheet pans"
            />
          </label>
        </div>
        <label>
          Step-by-step method
          <textarea
            name="method"
            defaultValue={r.method || ""}
            placeholder={"1. Prepare pans\n2. Mix batter\n3. Bake and cool"}
          />
        </label>
        <h3>Finished-product shelf life</h3>
        <div className="form-row">
          <label>
            Best within (days)
            <input
              name="shelfLifeDays"
              type="number"
              min="0"
              step="1"
              defaultValue={r.shelfLifeDays || 0}
            />
          </label>
          <label>
            Storage instructions
            <input
              name="storageInstructions"
              defaultValue={r.storageInstructions || ""}
              placeholder="Refrigerate at or below 40°F"
            />
          </label>
        </div>
        <p className="hint">
          A value of 0 leaves best-before dates unset. New production captures
          these details as a snapshot.
        </p>
      </div>
      <div className="conversion-box">
        <h3>Batch labor & overhead</h3>
        <p>
          Set wage and electricity rates in Settings → Production costs. These
          allocations are included in production cost.
        </p>
        <div className="form-row">
          <label>
            Labor minutes
            <input
              name="laborMinutes"
              type="number"
              min="0"
              step="any"
              defaultValue={r.laborMinutes || 0}
            />
          </label>
          <label>
            Electricity (kWh)
            <input
              name="electricityKwh"
              type="number"
              min="0"
              step="any"
              defaultValue={r.electricityKwh || 0}
            />
          </label>
          <label>
            Other overhead ($/batch)
            <input
              name="overheadPerBatch"
              type="number"
              min="0"
              step="0.01"
              defaultValue={r.overheadPerBatch || 0}
            />
          </label>
        </div>
      </div>
      <h3>Ingredients & packaging</h3>
      <p className="hint">
        Enter quantities for the whole batch, including boxes, utensils, and
        napkins. Decimals and fractions such as 0.5, 1/2, 1 1/2, and ½ are
        accepted. Cost reflects the amount used; packages show what you need to
        buy.
      </p>
      <div className="recipe-preset-tools">
        {[
          ...(data.recipeComponents || []).map((preset) => ({
            ...preset,
            kind: "component",
          })),
          ...(data.packagingPresets || []).map((preset) => ({
            ...preset,
            kind: "packaging",
          })),
        ].map((preset) => (
          <button
            type="button"
            className="preset-chip"
            key={preset.id}
            onClick={() =>
              setLines([
                ...lines,
                ...preset.lines.map((line) => ({ ...line, key: uid() })),
              ])
            }
          >
            + {preset.name}{" "}
            <small>
              {preset.kind === "component" ? "sub-recipe" : "packaging"}
            </small>
          </button>
        ))}
      </div>
      {lines.map((l, index) => {
        let result, err;
        try {
          result = lineCost({ ...l, amount: parseQuantity(l.amount) }, items);
          total += result.cost;
          if (items.find((item) => item.id === l.itemId)?.type === "packaging")
            packagingTotal += result.cost;
          else ingredientTotal += result.cost;
        } catch (e) {
          err = e.message;
        }
        const update = (patch) =>
          setLines(lines.map((x, n) => (n === index ? { ...x, ...patch } : x)));
        return (
          <div className="recipe-line" data-line key={l.key}>
            <select
              name="itemId"
              value={l.itemId}
              onChange={(e) => update({ itemId: e.target.value })}
            >
              {items.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name} {i.type === "packaging" ? "(packaging)" : ""}
                </option>
              ))}
            </select>
            <div className="line-amount">
              <input
                aria-label="Recipe quantity"
                name="quantity"
                type="text"
                inputMode="decimal"
                value={l.amount}
                onChange={(e) => update({ amount: e.target.value })}
                placeholder="e.g. 1/2"
                required
              />
              <UnitSelect
                name="lineUnit"
                value={l.unit}
                onChange={(e) => update({ unit: e.target.value })}
              />
              <button
                type="button"
                className="icon-button"
                aria-label="Remove recipe item"
                onClick={() => setLines(lines.filter((_, n) => n !== index))}
              >
                <Trash2 size={17} />
              </button>
            </div>
            <small className={err ? "error" : "hint"}>
              {err ||
                `${money(result.cost)} used (${Number(result.needed.toFixed(3))} ${result.unit}) · ${result.packs} package(s) to buy (${money(result.purchase)})`}
            </small>
          </div>
        );
      })}
      <button
        type="button"
        className="secondary"
        disabled={!items.length}
        onClick={() =>
          setLines([
            ...lines,
            { key: uid(), itemId: items[0].id, amount: 1, unit: items[0].unit },
          ])
        }
      >
        <Plus size={16} />
        Add ingredient or packaging
      </button>
      {!!lines.length && (
        <div className="preset-save-actions">
          <span>Reuse these lines in other recipes:</span>
          <button
            type="button"
            className="text-button"
            onClick={() =>
              savePreset(
                "component",
                "Name this sub-recipe (for example, Vanilla buttercream)",
              )
            }
          >
            Save ingredients as sub-recipe
          </button>
          <button
            type="button"
            className="text-button"
            onClick={() =>
              savePreset(
                "packaging",
                "Name this packaging preset (for example, Market box kit)",
              )
            }
          >
            Save packaging preset
          </button>
        </div>
      )}
      <div className="cost-summary">
        <span>
          Ingredients <b>{money(ingredientTotal)}</b>
        </span>
        <span>
          Packaging <b>{money(packagingTotal)}</b>
        </span>
        <span>
          Materials total <b>{money(total)}</b>
        </span>
        <span>
          Per portion <b>{yieldN > 0 ? money(total / yieldN) : "—"}</b>
        </span>
      </div>
    </>
  );
}
