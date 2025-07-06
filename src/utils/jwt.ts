import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET!

export function signJwt(payload: object) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '12h' })
}

export function verifyJwt<T extends object = Record<string, unknown>>(token: string): T {
  return jwt.verify(token, JWT_SECRET) as T
}
