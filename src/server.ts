import 'dotenv/config'
import express, { Request, Response } from 'express'
import cors from 'cors'
import helmet from 'helmet'

import { prisma } from './db'
import { authRouter } from './routes/auth'

/* -------------------------------------------------------- */
/*  Express app                                             */
/* -------------------------------------------------------- */
const app = express()

app.use(helmet())
app.use(cors({ origin: true, credentials: true }))
app.use(express.json())

/* ---------- routes ---------- */
app.use('/auth', authRouter)

app.get('/health', (_req: Request, res: Response) => {
  res.json({ ok: true })
})

/* ---------- start server ---------- */
const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`)
})

/* ---------- graceful shutdown ---------- */
process.on('SIGINT', async () => {
  await prisma.$disconnect()
  process.exit(0)
})
