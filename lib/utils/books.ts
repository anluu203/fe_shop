// `price` remains the final selling price used by carts and checkout.
// Discount describes the reduction from the list price; never apply it twice.
export function listPrice(price: string, discount = 0): string | null {
  if (!(discount > 0 && discount < 100)) return null;
  const basisPoints = Math.round(discount * 100);
  return (
    (BigInt(price) * BigInt(10000) + BigInt(10000 - basisPoints) / BigInt(2)) /
    BigInt(10000 - basisPoints)
  ).toString();
}

export function validISBN(value: string): boolean {
  if (/^\d{13}$/.test(value)) {
    return (
      [...value].reduce(
        (sum, digit, i) => sum + Number(digit) * (i % 2 ? 3 : 1),
        0,
      ) %
        10 ===
      0
    );
  }
  if (/^\d{9}[\dX]$/.test(value)) {
    return (
      [...value].reduce(
        (sum, digit, i) =>
          sum + (digit === "X" ? 10 : Number(digit)) * (10 - i),
        0,
      ) %
        11 ===
      0
    );
  }
  return false;
}
