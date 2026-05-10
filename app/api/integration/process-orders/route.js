import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function POST(request) {
  try {
    const data = await request.json()
    const { items, source, customerId, notes } = data

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "No items provided" }, { status: 400 })
    }

    const defaultCustomerId = "cmn38ksyq0000vso0u2qzmcud" // Order Processor - Nakson
    const finalCustomerId = customerId || defaultCustomerId
    
    // 1. Resolve SKUs and explode bundles
    const resolvedItems = []
    const unmappedSkus = []

    for (const item of items) {
      const { sku, quantity } = item
      let currentSku = sku
      
      // Step A: Check SkuMapping
      const mapping = await prisma.skuMapping.findUnique({
        where: { externalSku: sku }
      })
      if (mapping) {
        currentSku = mapping.internalSku
      }

      // Step B: Resolve in IMS
      // Check if it's a Bundle first
      const bundle = await prisma.productBundle.findUnique({
        where: { sku: currentSku },
        include: { items: { include: { finishedGood: true } } }
      })

      if (bundle) {
        // Explode bundle
        for (const bundleItem of bundle.items) {
          resolvedItems.push({
            finishedGoodId: bundleItem.finishedGoodId,
            quantity: bundleItem.quantity * quantity,
            unitPrice: bundleItem.finishedGood.price || 0,
            name: bundleItem.finishedGood.name
          })
        }
        continue
      }

      // Check if it's a FinishedGood
      const fg = await prisma.finishedGood.findUnique({
        where: { sku: currentSku }
      })
      if (fg) {
        resolvedItems.push({
          finishedGoodId: fg.id,
          quantity: quantity,
          unitPrice: fg.price || 0,
          name: fg.name
        })
        continue
      }

      // Check if it's a RawMaterial
      const rm = await prisma.rawMaterial.findUnique({
        where: { sku: currentSku }
      })
      if (rm) {
        resolvedItems.push({
          rawMaterialId: rm.id,
          quantity: quantity,
          unitPrice: rm.cost || 0,
          name: rm.name
        })
        continue
      }

      // If we reach here, the SKU is unmapped and unknown
      unmappedSkus.push(sku)
    }

    if (unmappedSkus.length > 0) {
      return NextResponse.json({ 
        error: "Some SKUs are unknown or unmapped", 
        unmappedSkus 
      }, { status: 422 })
    }

    // 2. Create Sales Order
    const timestamp = new Date().toISOString().replace(/[-:T]/g, "").slice(0, 12)
    const soNumber = `EXT-${source || "ESYNC"}-${timestamp}`

    const salesOrder = await prisma.salesOrder.create({
      data: {
        soNumber,
        orderDate: new Date(),
        shipDate: new Date(), // Default to today
        status: "PREPARING",
        priority: "HIGH",
        notes: notes || `Auto-imported from ${source || "eSync"}`,
        customerId: finalCustomerId,
        createdById: "cmozrsym70001k004kbnyocdz", // System / Warehouse User
        items: {
          create: resolvedItems.map(item => ({
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.quantity * item.unitPrice,
            finishedGoodId: item.finishedGoodId || null,
            rawMaterialId: item.rawMaterialId || null
          }))
        }
      },
      include: { items: true }
    })

    return NextResponse.json({ 
      success: true, 
      message: "Order created successfully",
      soNumber: salesOrder.soNumber,
      orderId: salesOrder.id
    })

  } catch (error) {
    console.error("Error processing external order:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
