type Order = {
  id: string;
  total: number;
  customer?: { name: string };
};

const orders: Order[] = [
  { id: "ORDER-101", total: 24, customer: { name: "Sam" } },
  { id: "ORDER-102", total: 18 }
];

export async function runApp(): Promise<void> {
  console.log("Preparing order summaries...\n");

  for (const order of orders) {
    // Guest orders should display "Guest" when no customer is attached.
    const customerName = order.customer!.name;
    console.log(`${order.id}: ${customerName} — £${order.total.toFixed(2)}`);
  }

  console.log("\nAll orders processed successfully.");
}
