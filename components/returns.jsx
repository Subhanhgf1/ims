"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useAuth } from "@/lib/auth"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import {
  RotateCcw,
  ScanLine,
  Package,
  CheckCircle,
  Clock,
  Loader2,
  AlertCircle,
  Plus,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Barcode,
  X,
  Search,
  Link2,
  Calendar,
  User as UserIcon,
  PackageCheck,
  TrendingDown,
  ArrowUpDown
} from "lucide-react"
import { PERMISSIONS } from "@/lib/permissions"
import { usePermissions } from "@/hooks/use-permissions"
import { formatDate } from "@/lib/utils"

const PLATFORM_STORE_ID = "nakson.myshopify.com"

const RETURN_REASONS = [
  "Courier didn't attempt",
  "Customer refused",
  "Customer unavailable",
  "Wrong address",
  "Customer changed mind",
]

const STATUS_COLORS = {
  PENDING: "bg-yellow-100 text-yellow-800",
  PROCESSING: "bg-blue-100 text-blue-800",
  COMPLETED: "bg-green-100 text-green-800",
  REJECTED: "bg-red-100 text-red-800",
}

export default function Returns() {
  const { user } = useAuth()
  const { can } = usePermissions()
  const { toast } = useToast()

  // ── State ──────────────────────────────────────────────────────────────
  const [returns, setReturns] = useState([])
  const [imsItems, setImsItems] = useState([]) // finished goods + raw materials
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  // Scan session
  const [scanInput, setScanInput] = useState("")
  const [scanLoading, setScanLoading] = useState(false)
  const [scanQueue, setScanQueue] = useState([]) 
  const scanInputRef = useRef(null)

  // Bulk scan mode
  const [bulkMode, setBulkMode] = useState(false)
  const [bulkText, setBulkText] = useState("")

  // Process dialog
  const [isProcessDialogOpen, setIsProcessDialogOpen] = useState(false)
  const [processingEntry, setProcessingEntry] = useState(null)
  const [processMappings, setProcessMappings] = useState([])
  const [imsSearchQueries, setImsSearchQueries] = useState({})

  // View dialog
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [selectedReturn, setSelectedReturn] = useState(null)

  // Bulk processing
  const [selectedParcels, setSelectedParcels] = useState([])
  const [isBulkDialogOpen, setIsBulkDialogOpen] = useState(false)
  const [bulkConfig, setBulkConfig] = useState({ reason: RETURN_REASONS[1], condition: "GOOD" })
  const [bulkMappings, setBulkMappings] = useState([]) // unique items: { sku, name, imsItemId, imsItemName }

  const [searchQuery, setSearchQuery] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState({ total: 0, totalPages: 0, page: 1, limit: 10 })
  const [sortConfig, setSortConfig] = useState({ key: "createdAt", order: "desc" })

  // ── Fetch IMS inventory + existing returns on mount ────────────────────
  useEffect(() => {
    fetchPageData()
    fetchScanQueue()
  }, [user, page, debouncedSearch, sortConfig])

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery)
      setPage(1) // Reset to first page on new search
    }, 500)
    return () => clearTimeout(timer)
  }, [searchQuery])

  const fetchScanQueue = async () => {
    if (!user) return
    try {
      const res = await fetch("/api/scanned-parcels", {
        headers: { "x-user-id": user.id }
      })
      if (res.ok) {
        const data = await res.json()
        const transformed = data.map(item => ({
          trackingNumber: item.trackingNumber,
          status: "fetched",
          orderData: item.orderData,
          isFlagged: item.isFlagged,
          scannedBy: item.user?.name,
          scannedAt: item.createdAt,
          dbId: item.id
        }))
        setScanQueue(transformed)
      }
    } catch (err) {
      console.error("Failed to fetch scan queue:", err)
    }
  }

  // Focus scan input whenever not in a dialog
  useEffect(() => {
    if (!isProcessDialogOpen && !isViewDialogOpen && !bulkMode) {
      setTimeout(() => scanInputRef.current?.focus(), 100)
    }
  }, [isProcessDialogOpen, isViewDialogOpen, bulkMode])

  const fetchPageData = async () => {
    try {
      setLoading(true)
      
      const queryParams = new URLSearchParams({
        page: page.toString(),
        search: debouncedSearch,
        sortBy: sortConfig.key,
        sortOrder: sortConfig.order,
      }).toString()

      const [returnsRes, rawMaterialsRes, finishedGoodsRes, bundlesRes] = await Promise.all([
        fetch(`/api/returns?${queryParams}`),
        fetch("/api/inventory/raw-materials"),
        fetch("/api/inventory/finished-goods"),
        fetch("/api/inventory/bundles"),
      ])

      const combined = []
      if (finishedGoodsRes.ok) {
        const data = await finishedGoodsRes.json()
        combined.push(...data.map((i) => ({ ...i, imsType: "finished_good" })))
      }
      if (rawMaterialsRes.ok) {
        const data = await rawMaterialsRes.json()
        combined.push(...data.map((i) => ({ ...i, imsType: "raw_material" })))
      }
      if (bundlesRes.ok) {
        const data = await bundlesRes.json()
        combined.push(...data.map((i) => ({ ...i, imsType: "bundle" })))
      }
      setImsItems(combined)

      if (returnsRes.ok) {
        const result = await returnsRes.json()
        setReturns(result.data)
        setPagination(result.pagination)
      }
    } catch (err) {
      console.error("Fetch error:", err)
      toast({ title: "Error", description: "Failed to load page data", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  const toggleSort = (key) => {
    setSortConfig(prev => ({
      key,
      order: prev.key === key && prev.order === "desc" ? "asc" : "desc"
    }))
    setPage(1)
  }

  // ── Auto-match IMS item by SKU ─────────────────────────────────────────
  const autoMatchSku = useCallback(
    (sku) => {
      if (!sku) return null
      const normalized = sku.trim().toLowerCase()
      return (
        imsItems.find(
          (i) =>
            i.sku?.toLowerCase() === normalized ||
            i.name?.toLowerCase().includes(normalized) ||
            normalized.includes(i.sku?.toLowerCase()),
        ) || null
      )
    },
    [imsItems],
  )

  // ── Scan a single tracking number ─────────────────────────────────────
  const fetchOrderByTracking = async (trackingNumber) => {
    const trimmed = trackingNumber.trim()
    if (!trimmed) return

    if (!can(PERMISSIONS.FAILED_DELIVERY_SCAN)) {
      toast({ title: "Permission Denied", description: "You do not have permission to scan parcels", variant: "destructive" })
      return
    }

    // Prevent duplicate
    if (scanQueue.find((e) => e.trackingNumber === trimmed)) {
      toast({ title: "Already in queue", description: `${trimmed} is already scanned`, variant: "destructive" })
      return
    }

    setScanLoading(true)
    try {
      const res = await fetch(
        `https://esync2-backend.nakson.services/api/system/get-order-by-tracking?tracking_number=${encodeURIComponent(trimmed)}&platform_store_id=${PLATFORM_STORE_ID}`,
      )
      const json = await res.json()

      if (!res.ok || !json.success || !json.data?.length) {
        throw new Error(json.message || "Order not found for this tracking number")
      }

      const orderData = json.data[0]
      const totalAmount = parseFloat(orderData.total_amount || 0)
      const isFlagged = totalAmount > 1000

      // Persist to DB
      const dbRes = await fetch("/api/scanned-parcels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          trackingNumber: trimmed,
          orderData,
          isFlagged,
          userId: user.id
        })
      })

      if (!dbRes.ok) {
        const dbErr = await dbRes.json()
        throw new Error(dbErr.error || "Failed to save to database")
      }

      const savedParcel = await dbRes.json()

      setScanQueue((prev) => [
        ...prev,
        {
          trackingNumber: trimmed,
          orderData,
          status: "fetched",
          isFlagged,
          scannedBy: user.name,
          scannedAt: new Date().toISOString(),
          dbId: savedParcel.id
        },
      ])

      toast({
        title: isFlagged ? "⚠️ Scanned (High COD)" : "Scanned",
        description: `Order ${orderData.order_number} added to ${isFlagged ? "Call List" : "queue"}`,
      })
    } catch (err) {
      // We don't persist "error" scans to the DB
      setScanQueue((prev) => [
        ...prev,
        {
          trackingNumber: trimmed,
          orderData: null,
          status: "error",
          error: err.message,
        },
      ])
      toast({ title: "Scan Failed", description: err.message, variant: "destructive" })
    } finally {
      setScanLoading(false)
      setScanInput("")
      scanInputRef.current?.focus()
    }
  }

  const handleScanKeyDown = (e) => {
    if (e.key === "Enter") {
      fetchOrderByTracking(scanInput)
    }
  }

  // ── Bulk scan ──────────────────────────────────────────────────────────
  const processBulkScan = async () => {
    const lines = bulkText
      .split(/[\n,]+/)
      .map((l) => l.trim())
      .filter(Boolean)

    if (!lines.length) return

    setScanLoading(true)
    for (const line of lines) {
      if (!scanQueue.find((e) => e.trackingNumber === line)) {
        await fetchOrderByTracking(line)
      }
    }
    setScanLoading(false)
    setBulkMode(false)
    setBulkText("")
  }

  // ── Open process dialog for a scanned entry ────────────────────────────
  const openProcessDialog = (entry) => {
    setProcessingEntry(entry)

    const order = entry.orderData || { order_items: [] }
    const mappings = []

    order.order_items.forEach((item) => {
      const matched = autoMatchSku(item.sku)
      
      // If auto-matched item is a bundle, explode it into components
      if (matched?.imsType === "bundle" && matched.items?.length > 0) {
        matched.items.forEach((bundleItem) => {
          const component = bundleItem.finishedGood
          const totalQty = item.quantity * bundleItem.quantity
          
          mappings.push({
            orderItemId: item.id,
            orderItemName: `${item.name} > ${component.name}`,
            orderItemSku: component.sku,
            orderItemQty: totalQty,
            imageUrl: item.image_url,
            imsItemId: component.id,
            imsItemName: component.name,
            quantity: totalQty,
            reason: RETURN_REASONS[0],
            condition: "GOOD",
            notes: `BOM: ${bundleItem.quantity}x per bundle`,
            autoMatched: true,
            isBundleComponent: true
          })
        })
      } else {
        mappings.push({
          orderItemId: item.id,
          orderItemName: item.name,
          orderItemSku: item.sku,
          orderItemQty: item.quantity,
          imageUrl: item.image_url,
          imsItemId: matched?.id || "",
          imsItemName: matched?.name || "",
          quantity: item.quantity,
          reason: RETURN_REASONS[0],
          condition: "GOOD",
          notes: "",
          autoMatched: !!matched,
        })
      }
    })

    setProcessMappings(mappings)
    setImsSearchQueries({})
    setIsProcessDialogOpen(true)
  }

  const updateMapping = (idx, field, value) => {
    setProcessMappings((prev) => prev.map((m, i) => (i === idx ? { ...m, [field]: value } : m)))
  }

  const selectImsItem = (idx, item) => {
    setProcessMappings((prev) =>
      prev.map((m, i) =>
        i === idx ? { ...m, imsItemId: item.id, imsItemName: item.name, autoMatched: false } : m,
      ),
    )
    setImsSearchQueries((prev) => ({ ...prev, [idx]: "" }))
  }

  const getFilteredIms = (query) => {
    if (!query) return imsItems.slice(0, 8)
    const q = query.toLowerCase()
    return imsItems.filter(
      (i) =>
        i.name?.toLowerCase().includes(q) ||
        i.sku?.toLowerCase().includes(q),
    ).slice(0, 8)
  }

  // ── Submit return ──────────────────────────────────────────────────────
  const handleSubmitReturn = async () => {
    const unmapped = processMappings.filter((m) => !m.imsItemId)
    if (unmapped.length) {
      toast({
        title: "Incomplete Mapping",
        description: `${unmapped.length} item(s) not mapped to IMS. Please map all items before processing.`,
        variant: "destructive",
      })
      return
    }

    try {
      setSubmitting(true)
      const order = processingEntry.orderData

      const payload = {
        trackingNumber: processingEntry.trackingNumber,
        orderNumber: order.order_number,
        orderId: order.id,
        customerId: order.customer_id,
        platformStoreId: order.store_id,
        items: processMappings.map((m) => ({
          orderItemId: m.orderItemId,
          imsItemId: m.imsItemId,
          quantity: Number(m.quantity),
          reason: m.reason,
          condition: m.condition,
          notes: m.notes,
        })),
        createdById: user?.id,
      }

      const res = await fetch("/api/returns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Failed to create failed delivery record")
      }

      // ── Remove from persistent queue ──
      const delRes = await fetch(`/api/scanned-parcels?trackingNumber=${encodeURIComponent(processingEntry.trackingNumber)}`, {
        method: "DELETE",
        headers: { "x-user-id": user.id }
      })
      if (!delRes.ok) {
        console.error("Failed to remove from database queue, but delivery was created.")
      }

      toast({ title: "Success", description: `Failed Delivery for ${order.order_number} processed successfully` })
      setIsProcessDialogOpen(false)
      setProcessingEntry(null)
      setProcessMappings([])
      setScanQueue((prev) => prev.filter((e) => e.trackingNumber !== processingEntry.trackingNumber))
      fetchPageData()
    } catch (err) {
      toast({ title: "Error", description: err.message, variant: "destructive" })
    } finally {
      setSubmitting(false)
    }
  }

  const removeFromQueue = async (trackingNumber) => {
    if (!can(PERMISSIONS.FAILED_DELIVERY_DELETE)) {
      toast({ title: "Permission Denied", description: "You do not have permission to remove items from the queue", variant: "destructive" })
      return
    }

    try {
      const res = await fetch(`/api/scanned-parcels?trackingNumber=${encodeURIComponent(trackingNumber)}`, {
        method: "DELETE",
        headers: { "x-user-id": user.id }
      })
      if (res.ok) {
        setScanQueue((prev) => prev.filter((e) => e.trackingNumber !== trackingNumber))
      } else {
        const err = await res.json()
        toast({ title: "Error", description: err.message || "Failed to remove from database", variant: "destructive" })
      }
    } catch (err) {
      console.error("Deletion failed:", err)
    }
  }

  // ── Stats ──────────────────────────────────────────────────────────────
  const stats = {
    total: returns.length,
    pending: returns.filter((r) => r.status === "PENDING").length,
    completed: returns.filter((r) => r.status === "COMPLETED").length,
    inQueue: scanQueue.filter((e) => e.status === "fetched").length,
    flagged: scanQueue.filter((e) => e.isFlagged && e.status === "fetched").length,
  }

  // ── Bulk Actions ───────────────────────────────────────────────────────
  const toggleParcelSelection = (trackingNumber) => {
    setSelectedParcels((prev) =>
      prev.includes(trackingNumber)
        ? prev.filter((id) => id !== trackingNumber)
        : [...prev, trackingNumber],
    )
  }

  const openBulkRestock = () => {
    const selectedEntries = scanQueue.filter((e) => selectedParcels.includes(e.trackingNumber))
    const uniqueItemsMap = {}

    selectedEntries.forEach(entry => {
      const items = entry.orderData?.order_items || []
      items.forEach(item => {
        if (!uniqueItemsMap[item.sku]) {
          const matched = autoMatchSku(item.sku)
          uniqueItemsMap[item.sku] = {
            sku: item.sku,
            name: item.name,
            imsItemId: matched?.id || "",
            imsItemName: matched?.name || "",
          }
        }
      })
    })

    setBulkMappings(Object.values(uniqueItemsMap))
    setImsSearchQueries({})
    setIsBulkDialogOpen(true)
  }

  const selectImsBulkItem = (sku, item) => {
    setBulkMappings(prev => prev.map(m => 
      m.sku === sku ? { ...m, imsItemId: item.id, imsItemName: item.name } : m
    ))
    setImsSearchQueries(prev => ({ ...prev, [sku]: "" }))
  }

  const handleBulkSubmit = async () => {
    if (!can(PERMISSIONS.FAILED_DELIVERY_PROCESS)) {
      toast({ title: "Permission Denied", description: "You do not have permission to process failed deliveries", variant: "destructive" })
      return
    }

    try {
      setSubmitting(true)
      const selectedEntries = scanQueue.filter((e) => selectedParcels.includes(e.trackingNumber))
      
      let successCount = 0
      for (const entry of selectedEntries) {
        const order = entry.orderData
        const mappings = (order.order_items || []).map((item) => {
          // Use the bulk resolved mapping for this SKU
          const bulkMap = bulkMappings.find(m => m.sku === item.sku)
          
          return {
            orderItemId: item.id,
            imsItemId: bulkMap?.imsItemId || null,
            quantity: item.quantity,
            reason: bulkConfig.reason,
            condition: bulkConfig.condition,
            notes: "Processed via Bulk Restock",
          }
        })

        // At this point, everything SHOULD be mapped because of the dialog validation,
        // but we keep the safety check.
        if (mappings.some(m => !m.imsItemId)) {
          console.warn(`Skipping ${entry.trackingNumber} due to missing IMS mapping`)
          continue
        }

        const payload = {
          trackingNumber: entry.trackingNumber,
          orderNumber: order.order_number,
          orderId: order.id,
          customerId: order.customer_id,
          platformStoreId: order.store_id,
          items: mappings,
          createdById: user?.id,
        }

        const res = await fetch("/api/returns", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })

        if (res.ok) {
          successCount++
          // ── Cleanup DB queue ──
          await fetch(`/api/scanned-parcels?trackingNumber=${encodeURIComponent(entry.trackingNumber)}`, {
            method: "DELETE",
            headers: { "x-user-id": user.id }
          })
        }
      }

      toast({
        title: "Bulk Process Complete",
        description: `Successfully processed ${successCount} of ${selectedEntries.length} selected parcels.`,
      })
      
      setIsBulkDialogOpen(false)
      setSelectedParcels([])
      fetchPageData()
      setScanQueue(prev => prev.filter(e => !selectedParcels.includes(e.trackingNumber)))
    } catch (err) {
      toast({ title: "Bulk Error", description: err.message, variant: "destructive" })
    } finally {
      setSubmitting(false)
    }
  }

  const renderQueueSection = (title, items, isHighCod = false) => {
    if (items.length === 0) return null

    return (
      <Card className={isHighCod ? "border-red-200 bg-red-50/10" : ""}>
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              {isHighCod ? <AlertCircle className="h-4 w-4 text-red-500" /> : <Package className="h-4 w-4" />}
              {title}
              <Badge variant={isHighCod ? "destructive" : "secondary"} className="ml-1">
                {items.length}
              </Badge>
            </CardTitle>
            <CardDescription>
              {isHighCod ? "Requires call before processing" : "Standard failed deliveries"}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              size="sm" 
              variant="outline"
              disabled={items.length === 0}
              onClick={() => {
                const ids = items.map(i => i.trackingNumber)
                const allSelected = ids.every(id => selectedParcels.includes(id))
                if (allSelected) {
                  setSelectedParcels(prev => prev.filter(id => !ids.includes(id)))
                } else {
                  setSelectedParcels(prev => [...new Set([...prev, ...ids])])
                }
              }}
            >
              {items.map(i => i.trackingNumber).every(id => selectedParcels.includes(id)) ? "Deselect Section" : "Select Section"}
            </Button>
            {can(PERMISSIONS.FAILED_DELIVERY_PROCESS) && (
              <Button 
                size="sm"
                disabled={!items.some(i => selectedParcels.includes(i.trackingNumber))}
                onClick={openBulkRestock}
              >
                Bulk Restock
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {items.map((entry) => (
              <div
                key={entry.trackingNumber}
                className={`flex items-center gap-4 p-4 rounded-lg border bg-white ${
                  entry.status === "error" ? "border-red-200" : "border-gray-200 shadow-sm"
                }`}
              >
                <div className="shrink-0 flex items-center h-full">
                  <input
                    type="checkbox"
                    checked={selectedParcels.includes(entry.trackingNumber)}
                    onChange={() => toggleParcelSelection(entry.trackingNumber)}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-600 cursor-pointer"
                  />
                </div>

                <div className="shrink-0">
                  {entry.status === "error" ? (
                    <AlertCircle className="h-8 w-8 text-red-500" />
                  ) : (
                    <div className="relative">
                      <PackageCheck className={`h-8 w-8 ${isHighCod ? "text-red-600" : "text-green-600"}`} />
                      {isHighCod && (
                        <div className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 animate-pulse">
                          <AlertCircle className="h-3 w-3" />
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                   <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-sm font-semibold">{entry.trackingNumber}</span>
                    {entry.orderData && (
                      <Badge className="bg-gray-100 text-gray-700 text-xs">
                        {entry.orderData.order_number}
                      </Badge>
                    )}
                    {isHighCod && <Badge className="bg-red-100 text-red-700 text-xs">HIGH COD</Badge>}
                  </div>
                  {entry.status === "error" ? (
                    <p className="text-sm text-red-600 mt-0.5">{entry.error}</p>
                  ) : (
                    <div className="space-y-1 mt-1">
                      <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                        <span className="font-medium text-gray-900">
                          {entry.orderData?.customer?.first_name} {entry.orderData?.customer?.last_name}
                        </span>
                        <span>·</span>
                        <span className="text-red-600 font-bold">
                          {entry.orderData?.currency} {entry.orderData?.total_amount}
                        </span>
                        <span>·</span>
                        <span>{entry.orderData?.order_items?.length || 0} item(s)</span>
                      </div>
                      <div className="flex items-center gap-3 text-[10px] text-muted-foreground/70">
                        {entry.scannedBy && (
                          <span className="flex items-center gap-1">
                            <UserIcon className="h-2.5 w-2.5" /> Scanned by {entry.scannedBy}
                          </span>
                        )}
                        {entry.scannedAt && (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-2.5 w-2.5" /> {formatDate(entry.scannedAt)}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {entry.status === "fetched" && can(PERMISSIONS.FAILED_DELIVERY_PROCESS) && (
                    <Button size="sm" onClick={() => openProcessDialog(entry)}>
                      Process <ChevronRight className="h-3 w-3 ml-1" />
                    </Button>
                  )}
                  {can(PERMISSIONS.FAILED_DELIVERY_DELETE) && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-gray-400 hover:text-red-600"
                      onClick={() => removeFromQueue(entry.trackingNumber)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* ── Header ────────────────────────────────────────────────────── */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Failed Delivery Management</h2>
          <p className="text-muted-foreground">Scan parcels to inbound failed delivery inventory</p>
        </div>
      </div>

      {/* ── Stats ─────────────────────────────────────────────────────── */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Failed Deliveries</CardTitle>
            <RotateCcw className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pending}</div>
            <p className="text-xs text-muted-foreground">Awaiting action</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completed}</div>
            <p className="text-xs text-muted-foreground">Restocked / resolved</p>
          </CardContent>
        </Card>
        <Card className="bg-red-50/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-red-800">High COD Parcels</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-700">{stats.flagged}</div>
            <p className="text-xs text-red-600">Need call list logging</p>
          </CardContent>
        </Card>
      </div>

      {/* ── Scan Section ──────────────────────────────────────────────── */}
      <Card className="border-2 border-dashed border-gray-200 bg-gray-50/50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Barcode className="h-5 w-5 text-gray-600" />
              <CardTitle className="text-base">Barcode Scanner</CardTitle>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setBulkMode((v) => !v)}
            >
              {bulkMode ? (
                <><X className="h-4 w-4 mr-1" /> Cancel Bulk</>
              ) : (
                <><Plus className="h-4 w-4 mr-1" /> Bulk Scan</>
              )}
            </Button>
          </div>
          <CardDescription>
            Scan a parcel barcode or enter tracking number manually — press Enter to add
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {!bulkMode ? (
            <div className="relative">
              <ScanLine className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                ref={scanInputRef}
                value={scanInput}
                onChange={(e) => setScanInput(e.target.value)}
                onKeyDown={handleScanKeyDown}
                placeholder="Scan or type tracking number, then press Enter…"
                className="pl-9 pr-24 h-11 text-sm bg-white"
                disabled={scanLoading}
              />
              <Button
                size="sm"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-9"
                onClick={() => fetchOrderByTracking(scanInput)}
                disabled={scanLoading || !scanInput.trim()}
              >
                {scanLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Scan"}
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              <Textarea
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
                placeholder={"Enter tracking numbers separated by newlines or commas:\nHD1234567\nHD7654321\nHD9999999"}
                rows={5}
                className="font-mono text-sm bg-white"
              />
              <Button onClick={processBulkScan} disabled={scanLoading || !bulkText.trim()}>
                {scanLoading ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Scanning…</> : "Process Bulk Scan"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Scan Queue ────────────────────────────────────────────────── */}
      <div className="space-y-6">
        {renderQueueSection("Call List (High COD > 1,000)", scanQueue.filter(e => e.isFlagged), true)}
        {renderQueueSection("Standard Processing Queue", scanQueue.filter(e => !e.isFlagged), false)}
      </div>

      {/* ── Bulk Process Dialog ───────────────────────────────────────── */}
      <Dialog open={isBulkDialogOpen} onOpenChange={setIsBulkDialogOpen}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Bulk Restock Selected Parcels</DialogTitle>
            <DialogDescription>
              Applying common reason and condition to {selectedParcels.length} selected parcels.
            </DialogDescription>
          </DialogHeader>

          <div className="overflow-y-auto flex-1 pr-1 py-4 space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Delivery Failure Reason</Label>
                <select
                  value={bulkConfig.reason}
                  onChange={(e) => setBulkConfig(prev => ({ ...prev, reason: e.target.value }))}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  {RETURN_REASONS.map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Item Condition</Label>
                <select
                  value={bulkConfig.condition}
                  onChange={(e) => setBulkConfig(prev => ({ ...prev, condition: e.target.value }))}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="GOOD">Good — Restock</option>
                  <option value="DAMAGED">Damaged</option>
                  <option value="DEFECTIVE">Defective</option>
                </select>
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-bold flex items-center gap-2">
                <Link2 className="h-4 w-4" />
                Inventory Mapping Resolution
              </Label>
              <p className="text-xs text-muted-foreground">
                Resolve mappings for unique items found in selection.
              </p>
              <div className="space-y-3 border rounded-lg p-3 bg-gray-50/50">
                {bulkMappings.map((item) => (
                  <div key={item.sku} className="space-y-2 pb-2 border-b last:border-0 last:pb-0">
                    <div className="flex justify-between items-start gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{item.name}</p>
                        <p className="text-[10px] text-muted-foreground font-mono">SKU: {item.sku}</p>
                      </div>
                    </div>

                    {item.imsItemId ? (
                      <div className="flex items-center gap-2 p-2 bg-blue-50 border border-blue-100 rounded-md">
                        <CheckCircle className="h-3 w-3 text-blue-600 shrink-0" />
                        <p className="text-xs font-medium truncate flex-1">{item.imsItemName}</p>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-[10px]"
                          onClick={() => setBulkMappings(prev => prev.map(m => m.sku === item.sku ? { ...m, imsItemId: "", imsItemName: "" } : m))}
                        >
                          Change
                        </Button>
                      </div>
                    ) : (
                      <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-gray-400" />
                        <Input
                          value={imsSearchQueries[item.sku] || ""}
                          onChange={(e) => setImsSearchQueries(prev => ({ ...prev, [item.sku]: e.target.value }))}
                          placeholder="Search IMS to map..."
                          className="pl-8 h-8 text-xs"
                        />
                        {imsSearchQueries[item.sku] && (
                          <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-40 overflow-y-auto">
                            {getFilteredIms(imsSearchQueries[item.sku]).map(ims => (
                              <button
                                key={ims.id}
                                className="w-full flex items-center justify-between px-3 py-2 text-xs hover:bg-gray-50 text-left"
                                onClick={() => selectImsBulkItem(item.sku, ims)}
                              >
                                <div>
                                  <p className="font-medium">{ims.name}</p>
                                  <p className="opacity-70 font-mono">{ims.sku}</p>
                                </div>
                                <div className="text-right">
                                  <p className="opacity-70">{ims.quantity} {ims.unit}</p>
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter className="border-t pt-4">
            <Button variant="outline" onClick={() => setIsBulkDialogOpen(false)}>Cancel</Button>
            <Button 
              onClick={handleBulkSubmit} 
              disabled={submitting || bulkMappings.some(m => !m.imsItemId)}
            >
              {submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Processing…</> : "Confirm Bulk Restock"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Failed Delivery Log Table ─────────────────────────────────── */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div className="space-y-1">
            <CardTitle>Failed Delivery Log</CardTitle>
            <CardDescription>All processed failed delivery records</CardDescription>
          </div>
          <div className="relative w-64">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search Order or Tracking..."
              className="pl-9 h-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {loading && returns.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary opacity-50 mb-4" />
              <p className="text-sm text-muted-foreground">Loading logs...</p>
            </div>
          ) : returns.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <TrendingDown className="h-10 w-10 mb-3 opacity-30" />
              <p className="text-sm">No failed deliveries found</p>
            </div>
          ) : (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="w-[140px]">
                        <button 
                          className="flex items-center gap-1 hover:text-foreground transition-colors"
                          onClick={() => toggleSort("returnNumber")}
                        >
                          Delivery #
                          <ArrowUpDown className="h-3 w-3" />
                        </button>
                      </TableHead>
                      <TableHead>
                        <button 
                          className="flex items-center gap-1 hover:text-foreground transition-colors"
                          onClick={() => toggleSort("orderNumber")}
                        >
                          Order
                          <ArrowUpDown className="h-3 w-3" />
                        </button>
                      </TableHead>
                      <TableHead>
                        <button 
                          className="flex items-center gap-1 hover:text-foreground transition-colors"
                          onClick={() => toggleSort("trackingNumber")}
                        >
                          Tracking
                          <ArrowUpDown className="h-3 w-3" />
                        </button>
                      </TableHead>
                      <TableHead>Items</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>
                        <button 
                          className="flex items-center gap-1 hover:text-foreground transition-colors"
                          onClick={() => toggleSort("createdAt")}
                        >
                          Date
                          <ArrowUpDown className="h-3 w-3" />
                        </button>
                      </TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {returns.map((ret) => (
                      <TableRow key={ret.id}>
                        <TableCell className="font-medium font-mono text-xs">{ret.returnNumber}</TableCell>
                        <TableCell className="font-medium">{ret.orderNumber}</TableCell>
                        <TableCell className="font-mono text-xs opacity-70">{ret.trackingNumber}</TableCell>
                        <TableCell>{ret.items?.length || 0} items</TableCell>
                        <TableCell>
                          <Badge className={`${STATUS_COLORS[ret.status] || "bg-gray-100 text-gray-700"} border-0 hover:${STATUS_COLORS[ret.status]}`}>
                            {ret.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {formatDate(ret.createdAt)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8"
                            onClick={() => { setSelectedReturn(ret); setIsViewDialogOpen(true) }}
                          >
                            Details
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination controls */}
              <div className="flex items-center justify-between px-2 py-4">
                <p className="text-sm text-muted-foreground">
                  Showing <span className="font-medium">{returns.length}</span> of{" "}
                  <span className="font-medium">{pagination.total}</span> results
                </p>
                <div className="flex items-center space-x-2">
                  <div className="flex items-center justify-center text-sm font-medium">
                    Page {pagination.page} of {pagination.totalPages || 1}
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      className="h-8 w-8 p-0"
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1 || loading}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      className="h-8 w-8 p-0"
                      onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
                      disabled={page >= pagination.totalPages || loading}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* ══════════════════════════════════════════════════════════════════
          Process Return Dialog
      ══════════════════════════════════════════════════════════════════ */}
      <Dialog
        open={isProcessDialogOpen}
        onOpenChange={(open) => {
          if (!open) { setIsProcessDialogOpen(false); setProcessingEntry(null); setProcessMappings([]) }
        }}
      >
        <DialogContent className="sm:max-w-[750px] max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Process Failed Delivery
            </DialogTitle>
            {processingEntry?.orderData && (
              <DialogDescription>
                Order <span className="font-semibold">{processingEntry.orderData.order_number}</span>
                &nbsp;·&nbsp;Tracking: <span className="font-mono">{processingEntry.trackingNumber}</span>
                &nbsp;·&nbsp;{processingEntry.orderData.customer?.first_name} {processingEntry.orderData.customer?.last_name}
              </DialogDescription>
            )}
          </DialogHeader>

          <div className="overflow-y-auto flex-1 pr-1">
            {/* Call List Requirement Warning */}
            {processingEntry?.isFlagged && (
              <div className="flex items-center gap-3 p-3 bg-red-100 border border-red-200 text-red-800 rounded-lg mb-4">
                <AlertCircle className="h-5 w-5 shrink-0" />
                <div>
                  <p className="font-bold text-sm">CALL LIST REQUIRED</p>
                  <p className="text-xs">This parcel has COD {processingEntry.orderData.total_amount}. Log call results below.</p>
                </div>
              </div>
            )}

            {/* Order summary bar */}
            {processingEntry?.orderData && (
              <div className="flex gap-4 p-3 bg-gray-50 border rounded-lg mb-4 text-xs flex-wrap">
                <div>
                  <span className="text-muted-foreground">Store:</span>{" "}
                  <span className="font-medium">{processingEntry.orderData.store?.name}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Payment:</span>{" "}
                  <span className="font-medium">{processingEntry.orderData.payment_method}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Total:</span>{" "}
                  <span className="font-medium">
                    {processingEntry.orderData.currency} {processingEntry.orderData.total_amount}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Carrier:</span>{" "}
                  <span className="font-medium">
                    {processingEntry.orderData.shipments?.[0]?.carrier_name || "—"}
                  </span>
                </div>
              </div>
            )}

            {/* Per-item mapping */}
            <div className="space-y-4">
              {processMappings.map((mapping, idx) => (
                <div key={mapping.orderItemId} className="border rounded-lg p-4 space-y-3">
                  {/* Item header */}
                  <div className="flex items-start gap-3">
                    {mapping.imageUrl && (
                      <img
                        src={mapping.imageUrl}
                        alt={mapping.orderItemName}
                        className="w-12 h-12 object-cover rounded-md border flex-shrink-0"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-sm leading-tight">{mapping.orderItemName}</p>
                        {mapping.autoMatched && (
                          <Badge className="bg-green-50 text-green-700 border-green-200 text-xs">
                            <Link2 className="h-3 w-3 mr-1" /> Auto-matched
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground font-mono mt-0.5">SKU: {mapping.orderItemSku}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-xs text-muted-foreground">Order Qty</p>
                      <p className="font-bold">{mapping.orderItemQty}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {/* IMS Item mapping */}
                    <div className="col-span-2 space-y-1.5">
                      <Label className="text-xs font-medium">
                        Map to IMS Item{" "}
                        {!mapping.imsItemId && (
                          <span className="text-red-500 ml-1">* Required</span>
                        )}
                      </Label>
                      {mapping.imsItemId ? (
                        <div className="flex items-center gap-2 p-2 bg-blue-50 border border-blue-100 rounded-md">
                          <CheckCircle className="h-4 w-4 text-blue-600 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{mapping.imsItemName}</p>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-xs"
                            onClick={() => updateMapping(idx, "imsItemId", "")}
                          >
                            Change
                          </Button>
                        </div>
                      ) : (
                        <div className="relative">
                          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                          <Input
                            value={imsSearchQueries[idx] || ""}
                            onChange={(e) =>
                              setImsSearchQueries((prev) => ({ ...prev, [idx]: e.target.value }))
                            }
                            placeholder="Search by name or SKU…"
                            className="pl-8 h-9 text-sm"
                          />
                          {(imsSearchQueries[idx] !== undefined && imsSearchQueries[idx] !== null) && (
                            <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-48 overflow-y-auto">
                              {getFilteredIms(imsSearchQueries[idx]).length === 0 ? (
                                <p className="text-xs text-muted-foreground p-3 text-center">No items found</p>
                              ) : (
                                getFilteredIms(imsSearchQueries[idx]).map((item) => (
                                  <button
                                    key={item.id}
                                    type="button"
                                    className="w-full flex items-center justify-between gap-2 px-3 py-2 text-sm hover:bg-gray-50 text-left"
                                    onClick={() => selectImsItem(idx, item)}
                                  >
                                    <div>
                                      <p className="font-medium">{item.name}</p>
                                      <p className="text-xs text-muted-foreground font-mono">{item.sku}</p>
                                    </div>
                                    <div className="text-right shrink-0">
                                      <p className="text-xs text-muted-foreground">Stock</p>
                                      <p className="text-xs font-medium">{item.quantity} {item.unit}</p>
                                    </div>
                                  </button>
                                ))
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Return quantity */}
                    <div className="space-y-1.5">
                      <Label className="text-xs">Return Quantity</Label>
                      <Input
                        type="number"
                        min={1}
                        max={mapping.orderItemQty}
                        value={mapping.quantity}
                        onChange={(e) => updateMapping(idx, "quantity", e.target.value)}
                        className="h-9 text-sm"
                      />
                    </div>

                    {/* Condition */}
                    <div className="space-y-1.5">
                      <Label className="text-xs">Condition</Label>
                      <select
                        value={mapping.condition}
                        onChange={(e) => updateMapping(idx, "condition", e.target.value)}
                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                      >
                        <option value="GOOD">Good — Restock</option>
                        <option value="DAMAGED">Damaged</option>
                        <option value="DEFECTIVE">Defective</option>
                        <option value="EXPIRED">Expired</option>
                        <option value="USED">Used / Opened</option>
                      </select>
                    </div>

                    {/* Reason */}
                    <div className="space-y-1.5 col-span-2">
                      <Label className="text-xs">Delivery Failure Reason</Label>
                      <select
                        value={mapping.reason}
                        onChange={(e) => updateMapping(idx, "reason", e.target.value)}
                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                      >
                        {RETURN_REASONS.map((r) => (
                          <option key={r} value={r}>{r}</option>
                        ))}
                      </select>
                    </div>

                    {/* Notes */}
                    <div className="space-y-1.5 col-span-2">
                      <Label className="text-xs">Item Notes (optional)</Label>
                      <Input
                        value={mapping.notes}
                        onChange={(e) => updateMapping(idx, "notes", e.target.value)}
                        placeholder="Any additional notes for this item…"
                        className="h-9 text-sm"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <DialogFooter className="mt-4 border-t pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => { setIsProcessDialogOpen(false); setProcessingEntry(null); setProcessMappings([]) }}
            >
              Cancel
            </Button>
            <Button onClick={handleSubmitReturn} disabled={submitting}>
              {submitting ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Processing…</>
              ) : (
                <><CheckCircle className="mr-2 h-4 w-4" />Confirm Failed Delivery</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ══════════════════════════════════════════════════════════════════
          View Return Dialog
      ══════════════════════════════════════════════════════════════════ */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="sm:max-w-[580px]">
          <DialogHeader>
            <DialogTitle>Return Details</DialogTitle>
            <DialogDescription>{selectedReturn?.returnNumber}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <Label className="text-xs text-muted-foreground">Order Number</Label>
                <p className="font-medium">{selectedReturn?.orderNumber}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Tracking</Label>
                <p className="font-mono">{selectedReturn?.trackingNumber}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Status</Label>
                <Badge className={STATUS_COLORS[selectedReturn?.status] || "bg-gray-100 text-gray-700"}>
                  {selectedReturn?.status}
                </Badge>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Date</Label>
                <p>{selectedReturn?.createdAt && formatDate(selectedReturn.createdAt)}</p>
              </div>
            </div>
            {selectedReturn?.items?.length > 0 && (
              <div>
                <Label className="text-sm font-medium mb-2 block">Items</Label>
                <div className="space-y-2">
                  {selectedReturn.items.map((item) => (
                    <div key={item.id} className="flex justify-between items-center p-3 border rounded-md text-sm">
                      <div>
                        <p className="font-medium">{item.imsItem?.name || item.imsItemId}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.reason} · {item.condition}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">×{item.quantity}</p>
                        {item.notes && <p className="text-xs text-muted-foreground">{item.notes}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button onClick={() => setIsViewDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}