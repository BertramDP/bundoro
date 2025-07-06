import { randomBytes, createCipheriv, createDecipheriv } from 'crypto'

const ALGO = 'aes-256-gcm'
const KEY = process.env.JWT_SECRET!.slice(0, 32) // reuse for MVP

export function encrypt(text: string) {
  const iv = randomBytes(16)
  const cipher = createCipheriv(ALGO, Buffer.from(KEY), iv)
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return iv.toString('hex') + '.' + tag.toString('hex') + '.' + encrypted.toString('hex')
}

export function decrypt(enc: string) {
  const [ivHex, tagHex, dataHex] = enc.split('.')
  const iv = Buffer.from(ivHex, 'hex')
  const tag = Buffer.from(tagHex, 'hex')
  const decipher = createDecipheriv(ALGO, Buffer.from(KEY), iv)
  decipher.setAuthTag(tag)
  const decrypted = Buffer.concat([decipher.update(Buffer.from(dataHex, 'hex')), decipher.final()])
  return decrypted.toString('utf8')
}
