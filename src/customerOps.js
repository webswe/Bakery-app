const clean = (value) => String(value || "").trim();
const key = (value) => clean(value).toLocaleLowerCase();

export function saveCustomer(data, input, id) {
  const name = clean(input.name);
  if (!name) throw Error("Enter a customer name.");
  const duplicate = (data.customers || []).find(
    (customer) => key(customer.name) === key(name) && customer.id !== id,
  );
  if (duplicate) throw Error("A customer with this name already exists.");
  const previous = (data.customers || []).find((customer) => customer.id === id);
  const customer = {
    ...previous,
    id: id || crypto.randomUUID(),
    name,
    phone: clean(input.phone),
    email: clean(input.email),
    preferences: clean(input.preferences),
    allergies: clean(input.allergies),
    notes: clean(input.notes),
    updatedAt: new Date().toISOString(),
  };
  return {
    ...data,
    customers: [
      ...(data.customers || []).filter((item) => item.id !== customer.id),
      customer,
    ],
  };
}

export function ensureCustomer(data, input) {
  const name = clean(input.customer);
  if (!name) return { data, customerId: "" };
  const selected = (data.customers || []).find(
    (customer) => customer.id === input.customerId,
  );
  const matched = selected || (data.customers || []).find(
    (customer) => key(customer.name) === key(name),
  );
  if (matched) return { data, customerId: matched.id };
  const next = saveCustomer(data, { name });
  return { data: next, customerId: next.customers.at(-1).id };
}

export function customerActivity(data, customer) {
  const matches = (record) =>
    record.customerId === customer.id ||
    (!record.customerId && key(record.customer) === key(customer.name));
  const quotes = (data.quotes || []).filter(matches);
  const orders = (data.orders || []).filter(matches);
  const sales = (data.sales || []).filter(matches);
  return {
    quotes,
    orders,
    sales,
    orderTotal: orders.reduce((sum, order) => sum + (order.total || 0), 0),
    lastDate: [...quotes.map((item) => item.date), ...orders.map((item) => item.pickupDate), ...sales.map((item) => item.date)]
      .filter(Boolean)
      .sort()
      .at(-1) || "",
  };
}
