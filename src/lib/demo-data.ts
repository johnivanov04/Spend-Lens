/**
 * Sample demo transactions (no real personal data). Dates are relative to
 * "today" so they land in the last-7-days dashboard/summary windows. Merchants
 * are chosen so the mock classifier produces useful, varied results — including
 * a refund (negative amount) and an unknown merchant.
 */
export type DemoTransaction = {
  merchant: string;
  description: string;
  amount: number;
  transaction_date: string;
};

function dayOffset(today: Date, n: number): string {
  const d = new Date(today);
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
}

export function sampleTransactions(today: Date = new Date()): DemoTransaction[] {
  return [
    { merchant: "ROBLOX.COM", description: "ROBLOX.COM 888-858-2569 CA", amount: 9.99, transaction_date: dayOffset(today, 0) },
    { merchant: "APPLE.COM/BILL", description: "APPLE.COM/BILL 866-712-7753 CA", amount: 19.99, transaction_date: dayOffset(today, 1) },
    { merchant: "STEAMGAMES.COM", description: "STEAMGAMES.COM 425-952-2985 WA", amount: 29.99, transaction_date: dayOffset(today, 2) },
    { merchant: "NETFLIX.COM", description: "NETFLIX.COM monthly", amount: 15.49, transaction_date: dayOffset(today, 3) },
    { merchant: "MICROSOFT XBOX", description: "MICROSOFT*XBOX", amount: 14.99, transaction_date: dayOffset(today, 4) },
    { merchant: "NINTENDO", description: "NINTENDO eShop", amount: 7.99, transaction_date: dayOffset(today, 5) },
    { merchant: "SPOTIFY", description: "SPOTIFY Premium", amount: 10.99, transaction_date: dayOffset(today, 6) },
    { merchant: "ROBLOX.COM", description: "ROBLOX.COM Robux", amount: 4.99, transaction_date: dayOffset(today, 1) },
    { merchant: "SQ *DIGITAL SERVICE", description: "SQ *DIGITAL SERVICE", amount: 6.0, transaction_date: dayOffset(today, 2) },
    { merchant: "APPLE.COM/BILL", description: "APPLE.COM/BILL refund", amount: -9.99, transaction_date: dayOffset(today, 3) },
  ];
}
