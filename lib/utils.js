import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs))
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
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(date))
}

export function formatDateTime(date) {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
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






