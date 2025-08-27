// net -> markup -> gross
export function applyMarkup({ net, percentage }) {
  const pct = Number(percentage || 0);
  const gross = Number(net) * (1 + pct / 100);
  return {
    net: round2(net),
    markupAmount: round2(gross - Number(net)),
    gross: round2(gross),
  };
}

export function round2(v) {
  return Math.round(Number(v) * 100) / 100;
}

/**
 * Resolve markup for a given (b2bAccountId?, productId?) by precedence.
 * Pass prisma instance.
 */
export async function resolveMarkupPercentage(prisma, { b2bAccountId, productId }) {
  // 1) specific rule: (b2b + product)
  if (b2bAccountId && productId) {
    const r = await prisma.markupRule.findFirst({
      where: { b2bAccountId, productId, isActive: true },
      select: { percentage: true },
    });
    if (r) return r.percentage;
  }
  // 2) product-wide rule
  if (productId) {
    const r = await prisma.markupRule.findFirst({
      where: { productId, b2bAccountId: null, isActive: true },
      select: { percentage: true },
    });
    if (r) return r.percentage;
  }
  // 3) account-wide rule
  if (b2bAccountId) {
    const r = await prisma.markupRule.findFirst({
      where: { b2bAccountId, productId: null, isActive: true },
      select: { percentage: true },
    });
    if (r) return r.percentage;
  }
  // 4) default on B2B account
  if (b2bAccountId) {
    const acc = await prisma.b2BAccount.findUnique({
      where: { id: b2bAccountId },
      select: { defaultMarkup: true },
    });
    if (acc) return acc.defaultMarkup || 0;
  }
  // 5) public pricing (no b2b)
  return 0;
}
 