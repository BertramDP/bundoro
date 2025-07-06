import { PrismaClient } from '@prisma/client'

export const prisma = new PrismaClient({
  log: ['error', 'info'],
})

process.on('SIGINT', async () => {
  await prisma.$disconnect()
  process.exit()
})
