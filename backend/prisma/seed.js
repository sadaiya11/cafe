import prisma from '../lib/prisma.js'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

async function main() {
  console.log('🌱 Seeding initial products to Supabase PostgreSQL database...')

  const catalogPath = fileURLToPath(new URL('../../src/data/products.json', import.meta.url))
  const catalog = JSON.parse(await readFile(catalogPath, 'utf8'))
  const sampleProducts = catalog.map((product) => ({
    slug: product.slug,
    title: product.title,
    category: product.category,
    tag: product.tag,
    description: product.description,
    price: Number(product.variants?.[0]?.price || 0),
    image: product.variants?.[0]?.image || '',
    variants: product.variants || [],
    inStock: true,
  }))

  console.log('🧹 Wiping old non-matching products...')
  const validSlugs = sampleProducts.map((p) => p.slug)
  await prisma.product.deleteMany({
    where: {
      slug: {
        notIn: validSlugs,
      },
    },
  })

  for (const product of sampleProducts) {
    await prisma.product.upsert({
      where: { slug: product.slug },
      update: {
        title: product.title,
        category: product.category,
        tag: product.tag,
        description: product.description,
        price: product.price,
        image: product.image,
        variants: product.variants,
        inStock: true,
      },
      create: product,
    })
  }

  console.log('✅ Supabase Database Seeded successfully!')
}

main()
  .catch((e) => {
    console.error('Seed error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
