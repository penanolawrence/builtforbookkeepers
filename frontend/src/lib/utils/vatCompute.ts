export function computeVat(gross: number): { net: number; vat: number } {
  const vat = Math.round(gross * (12 / 112) * 100) / 100
  const net = Math.round((gross - vat) * 100) / 100
  return { net, vat }
}
