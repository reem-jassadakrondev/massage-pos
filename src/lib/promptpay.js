import { digitsOnly } from './format'

// Thai PromptPay QR (EMVCo merchant-presented). Supports a mobile number (10 digits)
// or a national / tax ID (13 digits), with the amount embedded so the customer cannot mistype it.

const field = (id, value) => `${id}${String(value.length).padStart(2, '0')}${value}`

const crc16 = (text) => {
  let crc = 0xffff
  for (let i = 0; i < text.length; i += 1) {
    crc ^= text.charCodeAt(i) << 8
    for (let bit = 0; bit < 8; bit += 1) {
      crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1
      crc &= 0xffff
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0')
}

export const isValidPromptPayId = (id) => [10, 13].includes(digitsOnly(id).length)

export const promptPayPayload = (id, amount) => {
  const digits = digitsOnly(id)
  const target =
    digits.length >= 13
      ? field('02', digits)
      : field('01', `0000000000000${digits.replace(/^0/, '66')}`.slice(-13))

  const payload = [
    field('00', '01'),
    field('01', amount ? '12' : '11'),
    field('29', field('00', 'A000000677010111') + target),
    field('58', 'TH'),
    field('53', '764'),
    amount ? field('54', Number(amount).toFixed(2)) : '',
  ].join('')

  return `${payload}6304${crc16(`${payload}6304`)}`
}
