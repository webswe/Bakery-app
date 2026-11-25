const amount = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
};

export function paymentEffect(payment) {
  return payment?.kind === "refund"
    ? -amount(payment.amount)
    : amount(payment?.amount);
}

export function linkedPaymentTotal(payments, field, id) {
  return (payments || [])
    .filter((payment) => payment[field] === id)
    .reduce((total, payment) => total + paymentEffect(payment), 0);
}

export function orderPaid(data, order) {
  const entries = (data.payments || []).filter(
    (payment) => payment.orderId === order.id,
  );
  return entries.length
    ? entries.reduce((total, payment) => total + paymentEffect(payment), 0)
    : amount(order.paid);
}

export function directSalePaid(data, sale) {
  return linkedPaymentTotal(data.payments, "saleId", sale.id);
}

export function removePaymentEntry(data, paymentId) {
  const payment = (data.payments || []).find((entry) => entry.id === paymentId);
  if (!payment) throw Error("Payment entry is missing.");

  if (payment.orderId) {
    const order = (data.orders || []).find(
      (entry) => entry.id === payment.orderId,
    );
    if (order && ["completed", "fulfilled"].includes(order.status))
      throw Error(
        "Completed order payments cannot be removed. Record a refund instead.",
      );
  }

  const payments = (data.payments || []).filter(
    (entry) => entry.id !== paymentId,
  );
  let orders = data.orders || [];
  let sales = data.sales || [];

  if (payment.orderId) {
    const paid = linkedPaymentTotal(payments, "orderId", payment.orderId);
    orders = orders.map((order) =>
      order.id === payment.orderId ? { ...order, paid } : order,
    );
  }

  if (payment.saleId) {
    const paid = linkedPaymentTotal(payments, "saleId", payment.saleId);
    sales = sales.map((sale) => {
      if (sale.id !== payment.saleId) return sale;
      const complete = paid >= amount(sale.total) - 0.005;
      const next = {
        ...sale,
        amountPaid: paid,
        paymentStatus: complete ? "paid" : paid > 0 ? "partial" : "unpaid",
        payment: complete
          ? "Payment recorded"
          : paid > 0
            ? "Partial"
            : "Unpaid",
      };
      if (!complete) delete next.paidAt;
      return next;
    });
  }

  return { ...data, payments, orders, sales };
}
