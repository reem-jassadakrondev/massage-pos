// All money is whole baht. Price and commission scale with the minutes actually massaged,
// using the service's own rate (price / duration), so the screen and the saved bill always agree.

export const priceFor = (service, minutes) =>
  service ? Math.round((Number(service.price) * minutes) / Number(service.duration_minutes)) : 0

export const commissionFor = (service, minutes) =>
  service ? Math.round((Number(service.therapist_commission) * minutes) / Number(service.duration_minutes)) : 0

/** discount: { type: 'none' | 'percent' | 'baht', value } */
export const discountAmount = (price, discount) => {
  if (!discount || discount.type === 'none') return 0
  const value = Number(discount.value) || 0
  const amount = discount.type === 'percent' ? Math.round((price * value) / 100) : Math.round(value)
  return Math.min(Math.max(amount, 0), price)
}

export const billTotals = (price, discount, tip) => {
  const discountBaht = discountAmount(price, discount)
  const net = price - discountBaht
  const tipBaht = Math.max(0, Math.round(Number(tip) || 0))
  return { price, discount: discountBaht, net, tip: tipBaht, total: net + tipBaht }
}

export const discountLabel = (discount) => {
  if (!discount || discount.type === 'none' || !Number(discount.value)) return ''
  return discount.type === 'percent' ? `ลด ${discount.value}%` : `ลด ${discount.value} บาท`
}
