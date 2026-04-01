import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

// curl --location 'https://evolution.nakson.services/message/sendText/store_78' \
// --header 'Content-Type: application/json' \
// --header 'apiKey: Q4zcwtKDXGOafq7UTh03plLM' \
// --data '{
//     "number": "923123246683",
//     "text": "teste de envio"
// }'

// send admin notification on whatsapp group id 120363403541469129@g.us 
export async function sendAdminNotificationOnGroup(message) {
  console.log("Sending admin notification with message:", message)
  try {
    const response = await fetch("https://evolution.nakson.services/message/sendText/store_239", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apiKey": process.env.EVOLUTION_API_KEY,
      },
      body: JSON.stringify({
        number: "120363403541469129@g.us",
        text: message
      })
    })
    console.log("WhatsApp API response status:", response.status)
    const data = await response.json()
    console.log("WhatsApp API response:", data)
    return data
  } catch (error) {
    console.error("Error sending admin notification:", error)
    throw error
  }
}


export function getStatusColor(status) {
  switch (status) {
    case "IN_STOCK":
    case "ACTIVE":
    case "RECEIVED":
    case "PROCESSED":
    case "DELIVERED":
    case "COMPLETED":
      return "bg-green-100 text-green-800"
    case "LOW_STOCK":
    case "PENDING":
    case "PREPARING":
    case "IN_PROGRESS":
      return "bg-yellow-100 text-yellow-800"
    case "OUT_OF_STOCK":
    case "CANCELLED":
    case "INACTIVE":
      return "bg-red-100 text-red-800"
    case "IN_TRANSIT":
    case "SHIPPED":
    case "READY":
      return "bg-blue-100 text-blue-800"
    default:
      return "bg-gray-100 text-gray-800"
  }
}


export function generatePONumber() {
  const timestamp = Date.now().toString().slice(-6)
  const random = Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, "0")
  return `PO-${timestamp}-${random}`
}

export function generateSONumber() {
  const timestamp = Date.now().toString().slice(-6)
  const random = Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, "0")
  return `SO-${timestamp}-${random}`
}

export function generateReceiptNumber() {
  const timestamp = Date.now().toString().slice(-6)
  const random = Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, "0")
  return `RCP-${timestamp}-${random}`
}

export function generateShipmentNumber() {
  const timestamp = Date.now().toString().slice(-6)
  const random = Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, "0")
  return `SHP-${timestamp}-${random}`
}

export function generateProductionNumber() {
  const timestamp = Date.now().toString().slice(-6)
  const random = Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, "0")
  return `PROD-${timestamp}-${random}`
}

export function formatCurrency(amount) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "PKR",
  }).format(amount)
}

export function formatDate(date) {
  return new Intl.DateTimeFormat("en-PK", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "Asia/Karachi",
  }).format(new Date(date))
}

export function formatDateTime(date) {
  return new Intl.DateTimeFormat("en-PK", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Karachi",
  }).format(new Date(date))
}

export function calculateInventoryValue(items) {
  return items.reduce((total, item) => total + item.quantity * item.cost, 0)
}

export function getInventoryStatus(quantity, minimumStock) {
  if (quantity <= 0) return "OUT_OF_STOCK"
  if (quantity <= minimumStock) return "LOW_STOCK"
  return "IN_STOCK"
}

export function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export function validateSKU(sku) {
  // SKU should be alphanumeric and can contain hyphens and underscores
  const skuRegex = /^[A-Za-z0-9_-]+$/
  return skuRegex.test(sku) && sku.length >= 3 && sku.length <= 20
}


export function generateSKU(prefix = "SKU") {
  const timestamp = Date.now().toString(36)
  const random = Math.random().toString(36).substring(2, 8)
  return `${prefix}-${timestamp}-${random}`.toUpperCase()
}






