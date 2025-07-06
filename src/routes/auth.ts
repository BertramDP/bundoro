import { Router, RequestHandler } from 'express'
import bcrypt from 'bcryptjs'
import { Magic } from '@magic-sdk/admin'
import { ethers } from 'ethers'

import { prisma } from '../db'
import { signJwt, verifyJwt } from '../utils/jwt'
import { encrypt } from '../utils/crypto'

export const authRouter = Router()
const magic = new Magic(process.env.MAGIC_SECRET_KEY!)

/* ---------- Local signup ---------- */
const signupHandler: RequestHandler = async (req, res) => {
  const { email, password } = req.body as { email?: string; password?: string }
  if (!email || !password) {
    res.status(400).json({ error: 'Email & password required' })
    return
  }

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    res.status(409).json({ error: 'User exists' })
    return
  }

  // generate wallet
  const wallet = ethers.Wallet.createRandom()
  const keystore = await wallet.encrypt(password)

  const user = await prisma.user.create({
    data: {
      email,
      authProvider: 'local',
      walletAddress: wallet.address,
      encryptedKey: encrypt(keystore),
      passwordHash: await bcrypt.hash(password, 10),
    },
  })

  res.json({ token: signJwt({ uid: user.id }) })
}
authRouter.post('/signup', signupHandler)

/* ---------- Local login ---------- */
const loginHandler: RequestHandler = async (req, res) => {
  const { email, password } = req.body as { email?: string; password?: string }

  const user = await prisma.user.findUnique({ where: { email } })
  if (!user || !user.passwordHash) {
    res.status(401).json({ error: 'Invalid creds' })
    return
  }

  const ok = await bcrypt.compare(password!, user.passwordHash)
  if (!ok) {
    res.status(401).json({ error: 'Invalid creds' })
    return
  }

  res.json({ token: signJwt({ uid: user.id }) })
}
authRouter.post('/login', loginHandler)

/* ---------- Magic login ---------- */
const magicHandler: RequestHandler = async (req, res) => {
  const didToken = req.headers.authorization?.replace('Bearer ', '')
  if (!didToken) {
    res.status(400).json({ error: 'Missing DID token' })
    return
  }

  magic.token.validate(didToken) // throws if invalid
  const metadata = await magic.users.getMetadataByToken(didToken)
  if (!metadata?.email) {
    res.status(400).json({ error: 'No metadata' })
    return
  }

  let user = await prisma.user.findUnique({ where: { email: metadata.email } })
  if (!user) {
    user = await prisma.user.create({
      data: {
        email: metadata.email,
        authProvider: 'magic',
        walletAddress: metadata.publicAddress ?? '',
        encryptedKey: '',
      },
    })
  }

  res.json({ token: signJwt({ uid: user.id }) })
}
authRouter.post('/magic', magicHandler)

/* ---------- Me ---------- */
const meHandler: RequestHandler = async (req, res) => {
  const auth = req.headers.authorization?.replace('Bearer ', '')
  if (!auth) {
    res.status(401).json({ error: 'No token' })
    return
  }

  try {
    const { uid } = verifyJwt<{ uid: string }>(auth)
    const user = await prisma.user.findUnique({ where: { id: uid } })
    if (!user) {
      res.status(404).json({ error: 'Not found' })
      return
    }
    res.json({ email: user.email, walletAddress: user.walletAddress })
  } catch {
    res.status(401).json({ error: 'Invalid token' })
  }
}
authRouter.get('/me', meHandler)
