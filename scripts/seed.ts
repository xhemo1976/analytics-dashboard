import { PrismaClient } from '../app/generated/prisma'

const prisma = new PrismaClient()

async function main() {
  const user = await prisma.user.create({
    data: {
      email: 'webdjyoung@gmail.com',
    },
  })

  const website = await prisma.website.create({
    data: {
      domain: 'berlinkassen.de',
      userId: user.id,
    },
  })

  console.log('✅ User erstellt:', user)
  console.log('✅ Website erstellt:', website)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())