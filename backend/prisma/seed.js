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

  for (const product of sampleProducts) {
    const existing = await prisma.product.findUnique({ where: { slug: product.slug } })
    if (!existing) {
      await prisma.product.create({ data: product })
    } else if (!Array.isArray(existing.variants) || !existing.variants.length) {
      // Preserve all existing admin fields, adding only the missing variant data.
      await prisma.product.update({
        where: { slug: product.slug },
        data: {
          variants: product.variants.map((variant, index) => index === 0 ? { ...variant, price: existing.price } : variant),
        },
      })
    }
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
