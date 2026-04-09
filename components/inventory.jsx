"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Switch } from "@/components/ui/switch"
import {
  Plus, Package, Search, Edit, Trash2, ImageIcon, Settings,
  Filter, X, ChevronDown, PencilLine, Tags, MapPin,
  Truck, AlertTriangle, CheckCircle2, XCircle, Download,
  Copy, Archive, Loader2, Link as LinkIcon, Layers
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { usePermissions } from "@/hooks/use-permissions"
import { PERMISSIONS } from "@/lib/permissions"
import AdvancedInventoryModal from "./advanced-inventory-modal"
import BulkEditModal from "./bulk-edit-modal"

const STATUS_OPTIONS = [
  { value: "in-stock", label: "In Stock" },
  { value: "low-stock", label: "Low Stock" },
  { value: "out-of-stock", label: "Out of Stock" },
]

// ─── Bulk Actions Definition ────────────────────────────────────────────────
const BULK_ACTIONS = [
  {
    group: "Edit",
    actions: [
      { id: "bulk-edit",    label: "Edit Selected",       icon: PencilLine,    variant: "default" },
      { id: "restock",       label: "Restock Selected",    icon: Truck,         variant: "success" },
    ],
  },
  {
    group: "Data",
    actions: [
      { id: "export",   label: "Export to CSV",    icon: Download, variant: "default" },
    ],
  },
  {
    group: "Danger",
    actions: [
      { id: "delete", label: "Delete Selected", icon: Trash2, variant: "destructive" },
    ],
  },
]

// ─── Bulk Actions Dropdown Component ────────────────────────────────────────
function BulkActionsDropdown({ count, onAction, disabled, loadingAction }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    function handle(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener("mousedown", handle)
    return () => document.removeEventListener("mousedown", handle)
  }, [])

  const variantStyles = {
    default:      "text-foreground hover:bg-accent hover:text-accent-foreground",
    success:      "text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40",
    warning:      "text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40",
    destructive:  "text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40",
  }

  const iconStyles = {
    default:      "text-muted-foreground",
    success:      "text-emerald-500",
    warning:      "text-amber-500",
    destructive:  "text-red-500",
  }

  const isLoading = !!loadingAction

  return (
    <div className="relative" ref={ref}>
      <Button
        variant="outline"
        disabled={disabled || isLoading}
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 font-medium transition-all duration-150 border-primary/30 hover:border-primary/60 hover:bg-primary/5"
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Settings className="h-4 w-4" />
        )}
        <span>Actions</span>
        {count > 0 && (
          <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-primary text-primary-foreground text-xs font-semibold leading-none">
            {count}
          </span>
        )}
        <ChevronDown
          className={`h-3.5 w-3.5 text-muted-foreground transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </Button>

      {open && (
        <div
          className="absolute left-0 top-full mt-2 z-50 min-w-[220px] rounded-xl border border-border bg-popover shadow-xl shadow-black/10 overflow-hidden animate-in fade-in-0 zoom-in-95 duration-150"
          style={{ transformOrigin: "top left" }}
        >
          {/* Header */}
          <div className="px-3 py-2.5 border-b border-border bg-muted/40">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {count} item{count !== 1 ? "s" : ""} selected
            </p>
          </div>

          {/* Action Groups */}
          <div className="py-1 max-h-[420px] overflow-y-auto">
            {BULK_ACTIONS.map((group, gi) => (
              <div key={group.group}>
                {gi > 0 && <div className="my-1 border-t border-border/60" />}
                <p className="px-3 pt-2 pb-1 text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-widest">
                  {group.group}
                </p>
                {group.actions.map(({ id, label, icon: Icon, variant }) => {
                  const actionLoading = loadingAction === id
                  return (
                    <button
                      key={id}
                      type="button"
                      disabled={isLoading}
                      onClick={() => { onAction(id); setOpen(false) }}
                      className={`w-full flex items-center gap-3 px-3 py-2 text-sm transition-colors duration-100 disabled:opacity-50 disabled:cursor-not-allowed ${variantStyles[variant]}`}
                    >
                      {actionLoading ? (
                        <Loader2 className={`h-4 w-4 flex-shrink-0 animate-spin ${iconStyles[variant]}`} />
                      ) : (
                        <Icon className={`h-4 w-4 flex-shrink-0 ${iconStyles[variant]}`} />
                      )}
                      <span>{actionLoading ? "Processing…" : label}</span>
                    </button>
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Main Component ──────────────────────────────────────────────────────────
export default function Inventory() {
  const { can } = usePermissions()
  const [rawMaterials, setRawMaterials] = useState([])
  const [finishedGoods, setFinishedGoods] = useState([])
  const [suppliers, setSuppliers] = useState([])
  const [locations, setLocations] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilters, setStatusFilters] = useState(new Set())
  const [supplierFilter, setSupplierFilter] = useState("all")
  const [locationFilter, setLocationFilter] = useState("all")
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [activeTab, setActiveTab] = useState("finished-goods")
  const [selectedItem, setSelectedItem] = useState(null)
  const [isAdvancedModalOpen, setIsAdvancedModalOpen] = useState(false)
  const [selectedItems, setSelectedItems] = useState([])
  const [isBulkEditOpen, setIsBulkEditOpen] = useState(false)
  const [selectAll, setSelectAll] = useState(false)

  // ─── Loading States ───────────────────────────────────────────────────────
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [deletingItemId, setDeletingItemId] = useState(null)   // id of single item being deleted
  const [loadingAdvancedId, setLoadingAdvancedId] = useState(null) // id of item opening advanced modal
  const [loadingEditId, setLoadingEditId] = useState(null)     // id of item opening edit dialog
  const [bulkLoadingAction, setBulkLoadingAction] = useState(null) // bulk action in progress
  const [compResults, setCompResults] = useState([]) // BOM item search results
  const [productBundles, setProductBundles] = useState([]) // New independent bundles state

  const { toast } = useToast()

  const searchParams = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "")
  const lowStockQuery = searchParams.get("lowStock")
  const outStockQuery = searchParams.get("outStock")

  useEffect(() => {
    setStatusFilters((prev) => {
      let updated = new Set(prev)
      if (lowStockQuery === "true") updated.add("low-stock")
      if (outStockQuery === "true") updated.add("out-of-stock")
      return updated
    })
  }, [lowStockQuery, outStockQuery])

  const [formData, setFormData] = useState({
    name: "", sku: "", description: "", unit: "", cost: "0", price: "0",
    minimumStock: "0", supplierId: "", locationId: "", imageUrl: "", categoryId: "",
    components: [] // [{finishedGoodId, quantity}]
  })

  const [categories, setCategories] = useState([])
const [categoryFilter, setCategoryFilter] = useState("all")

  useEffect(() => { fetchData() }, [])

  useEffect(() => {
    const currentItems = 
      activeTab === "raw-materials" ? filteredRawMaterials : 
      activeTab === "bundles" ? filteredBundles : 
      filteredFinishedGoods

    if (selectAll && currentItems.length > 0) {
      setSelectedItems(currentItems.map((item) => item.id))
    } else if (!selectAll) {
      setSelectedItems([])
    }
  }, [selectAll, activeTab])

  const fetchData = async () => {
    try {
      const [rawMaterialsRes, finishedGoodsRes, suppliersRes, locationsRes, categoriesRes, bundlesRes] = await Promise.all([
        fetch("/api/inventory/raw-materials"),
        fetch("/api/inventory/finished-goods"),
        fetch("/api/suppliers"),
        fetch("/api/locations"),
        fetch("/api/categories"),
        fetch("/api/inventory/bundles"),
      ])
      const [rawMaterialsData, finishedGoodsData, suppliersData, locationsData, categoriesData, bundlesData] = await Promise.all([
        rawMaterialsRes.json(), finishedGoodsRes.json(), suppliersRes.json(), locationsRes.json(), categoriesRes.json(), bundlesRes.json()
      ])
      setRawMaterials(rawMaterialsData)
      setFinishedGoods(finishedGoodsData)
      setProductBundles(bundlesData)
      setSuppliers(suppliersData)
      setLocations(locationsData)
      setCategories(categoriesData.data || [])
    } catch (error) {
      toast({ title: "Error", description: "Failed to fetch inventory data", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      const url = editingItem ? `/api/inventory/${activeTab}/${editingItem.id}` : `/api/inventory/${activeTab}`
      const method = editingItem ? "PUT" : "POST"
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to save item")
      }
      toast({ title: "Success", description: `Item ${editingItem ? "updated" : "created"} successfully` })
      setIsAddDialogOpen(false)
      setEditingItem(null)
      resetForm()
      fetchData()
    } catch (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this item?")) return
    setDeletingItemId(id)
    try {
      const response = await fetch(`/api/inventory/${activeTab}/${id}`, { method: "DELETE" })
      if (!response.ok) throw new Error("Failed to delete item")
      toast({ title: "Success", description: "Item deleted successfully" })
      fetchData()
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete item", variant: "destructive" })
    } finally {
      setDeletingItemId(null)
    }
  }

  const resetForm = () => {
    setFormData({ name: "", sku: "", description: "", unit: "", cost: "0", price: "0",
      minimumStock: "0", supplierId: "", locationId: "", imageUrl: "", categoryId: "",
      components: []
    })
  }

 const openEditDialog = (item) => {
  setLoadingEditId(item.id)
  setEditingItem(item)
  setFormData({
    name: item.name || "", sku: item.sku || "", description: item.description || "",
    unit: item.unit || "", cost: item.cost?.toString() || "", price: item.price?.toString() || "",
    minimumStock: item.minimumStock?.toString() || "", supplierId: item.supplierId || "",
    locationId: item.locationId || "", imageUrl: item.imageUrl || "",
    categoryId: item.categoryId || "",
    components: item.items?.map(c => ({
      finishedGoodId: c.finishedGood.id,
      name: c.finishedGood.name,
      sku: c.finishedGood.sku,
      quantity: c.quantity
    })) || []
  })
  setIsAddDialogOpen(true)
  setTimeout(() => setLoadingEditId(null), 300)
}

  const openAdvancedModal = (item) => {
    setLoadingAdvancedId(item.id)
    setSelectedItem(item)
    setIsAdvancedModalOpen(true)
    setTimeout(() => setLoadingAdvancedId(null), 300)
  }

  const getStatusBadge = (item) => {
    if (activeTab === "bundles") return <Badge variant="outline" className="border-blue-200 text-blue-600 bg-blue-50">Bundle</Badge>
    if (item.quantity <= 0) return <Badge variant="destructive">Out of Stock</Badge>
    if (item.quantity <= (item.minimumStock || 0)) return <Badge variant="secondary">Low Stock</Badge>
    return <Badge variant="default">In Stock</Badge>
  }

  const getItemStatus = (item) => {
    if (item.quantity <= 0) return "out-of-stock"
    if (item.quantity <= item.minimumStock) return "low-stock"
    return "in-stock"
  }

  const toggleStatusFilter = (value) => {
    setStatusFilters((prev) => {
      const next = new Set(prev)
      next.has(value) ? next.delete(value) : next.add(value)
      return next
    })
  }

  const removeStatusFilter = (value) => {
    setStatusFilters((prev) => { const next = new Set(prev); next.delete(value); return next })
  }

  const matchesStatusFilter = (item) => statusFilters.size === 0 || statusFilters.has(getItemStatus(item))

  const filteredRawMaterials = rawMaterials.filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.sku.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesSupplier = supplierFilter === "all" || item.supplierId === supplierFilter
    const matchesLocation = locationFilter === "all" || item.locationId === locationFilter
    return matchesSearch && matchesStatusFilter(item) && matchesSupplier && matchesLocation
  })

const filteredFinishedGoods = finishedGoods.filter((item) => {
  const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.sku.toLowerCase().includes(searchTerm.toLowerCase())
  const matchesLocation = locationFilter === "all" || item.locationId === locationFilter
  const matchesCategory = categoryFilter === "all" || item.categoryId === categoryFilter
  return matchesSearch && matchesStatusFilter(item) && matchesLocation && matchesCategory
})

const filteredBundles = productBundles.filter((item) => {
  const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.sku.toLowerCase().includes(searchTerm.toLowerCase())
  return matchesSearch && matchesStatusFilter(item)
})

  const handleItemSelect = (itemId) => {
    setSelectedItems((prev) => prev.includes(itemId) ? prev.filter((id) => id !== itemId) : [...prev, itemId])
  }

  const handleSelectAll = () => setSelectAll(!selectAll)

  const handleExportItems = () => {
    const currentItems = activeTab === "raw-materials" ? filteredRawMaterials : filteredFinishedGoods
    const itemsToExport = currentItems.filter((item) => selectedItems.includes(item.id))
    const csvContent = [
      ["Name", "SKU", "Description", "Unit", "Cost", "Price", "Quantity", "Minimum Stock", "Supplier", "Location"].join(","),
      ...itemsToExport.map((item) => [
        `"${item.name}"`,
        `"${item.sku}"`,
        `"${item.description || ""}"`,
        `"${item.unit}"`,
        item.cost ?? "",
        item.price ?? "",
        item.quantity,
        item.minimumStock ?? "",
        `"${suppliers.find((s) => s.id === item.supplierId)?.name || ""}"`,
        `"${locations.find((l) => l.id === item.locationId)?.code || ""}"`,
      ].join(",")),
    ].join("\n")
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.setAttribute("href", url)
    link.setAttribute("download", `${activeTab}-${new Date().toISOString()}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // ─── Bulk Action Handler ─────────────────────────────────────────────────
  const handleBulkAction = async (actionId) => {
    const currentItems = activeTab === "raw-materials" ? filteredRawMaterials : filteredFinishedGoods
    const selectedItemsData = currentItems.filter((item) => selectedItems.includes(item.id))

    switch (actionId) {
      case "bulk-edit":
        if (selectedItemsData.length === 0) {
          toast({ title: "No items selected", description: "Please select items to bulk edit", variant: "destructive" })
          return
        }
        setIsBulkEditOpen(true)
        break

        case "restock":
          localStorage.setItem("restockItems", JSON.stringify(selectedItemsData))
          // send user to /inbound with restock = true param
          toast({ title: "Restock", description: "Redirecting to inbound...", variant: "info" })
          const query = new URLSearchParams({ restock: "true" }).toString()
          window.location.href = `/inbound?${query}`
          break
      case "delete":
        if (!confirm(`Delete ${selectedItems.length} item${selectedItems.length !== 1 ? "s" : ""}? This cannot be undone.`)) return
        setBulkLoadingAction("delete")
        try {
          const ids = selectedItemsData.map((item) => item.id)
          await fetch(`/api/inventory/${activeTab}`, {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ids }),
          })
          toast({ title: "Deleted", description: `${selectedItems.length} items deleted` })
          setSelectedItems([])
          setSelectAll(false)
          fetchData()
        } catch {
          toast({ title: "Error", description: "Some items could not be deleted", variant: "destructive" })
        } finally {
          setBulkLoadingAction(null)
        }
        break

      case "export":
        setBulkLoadingAction("export")
        try {
          // Small async delay to let the spinner render before the synchronous CSV work
          await new Promise((r) => setTimeout(r, 50))
          handleExportItems()
          toast({ title: "Exported", description: `${selectedItems.length} items exported to CSV` })
        } finally {
          setBulkLoadingAction(null)
        }
        break

      default:
        toast({ title: `Action: ${actionId}`, description: `Applied to ${selectedItems.length} items` })
    }
  }

  const handleTabChange = (value) => {
    setActiveTab(value)
    setSelectedItems([])
    setSelectAll(false)
  }

const hasActiveFilters = statusFilters.size > 0 || supplierFilter !== "all" || locationFilter !== "all" || categoryFilter !== "all"

const clearAllFilters = () => {
  setStatusFilters(new Set())
  setSupplierFilter("all")
  setLocationFilter("all")
  setCategoryFilter("all")
}
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin mr-2 text-muted-foreground" />
        <div className="text-lg text-muted-foreground">Loading inventory...</div>
      </div>
    )
  }

  const currentItems = 
    activeTab === "raw-materials" ? filteredRawMaterials : 
    activeTab === "bundles" ? filteredBundles :
    filteredFinishedGoods
  
  const selectedItemsData = currentItems.filter((item) => selectedItems.includes(item.id))

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Inventory Management</h1>
        <div className="flex gap-2 items-center">
          <BulkActionsDropdown
            count={selectedItems.length}
            onAction={handleBulkAction}
            disabled={selectedItems.length === 0 || !can(PERMISSIONS.INVENTORY_EDIT)}
            loadingAction={bulkLoadingAction}
          />

          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              {can(PERMISSIONS.INVENTORY_EDIT) && (
                <Button onClick={() => { resetForm(); setEditingItem(null) }}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Item
                </Button>
              )}
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {editingItem ? "Edit" : "Add"} {
                    activeTab === "raw-materials" ? "Raw Material" : 
                    activeTab === "bundles" ? "Product Bundle" : 
                    "Finished Good"
                  }
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Name *</Label>
                    <Input id="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
                  </div>
                  <div>
                    <Label htmlFor="sku">SKU *</Label>
                    <Input id="sku" value={formData.sku} onChange={(e) => setFormData({ ...formData, sku: e.target.value })} required />
                  </div>
                </div>
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea id="description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="unit">Unit *</Label>
                    <Input id="unit" value={formData.unit} onChange={(e) => setFormData({ ...formData, unit: e.target.value })} placeholder="e.g., kg, pcs, liters" required />
                  </div>
                  <div>
                    <Label htmlFor="cost">Cost *</Label>
                    <Input id="cost" type="number" step="0.01" value={formData.cost} onChange={(e) => setFormData({ ...formData, cost: e.target.value })} required />
                  </div>
                </div>
                {(activeTab === "finished-goods" || activeTab === "bundles") && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="price">Price *</Label>
                      <Input id="price" type="number" step="0.01" value={formData.price} onChange={(e) => setFormData({ ...formData, price: e.target.value })} required />
                    </div>
                    <div>
                      <Label htmlFor="imageUrl">Image URL (Optional)</Label>
                      <Input id="imageUrl" type="url" value={formData.imageUrl} onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })} placeholder="https://example.com/image.jpg" />
                    </div>
                  </div>
                )}
               <div className="grid grid-cols-2 gap-4">
  <div>
    <Label htmlFor="minimumStock">Minimum Stock</Label>
    <Input id="minimumStock" type="number" value={formData.minimumStock} onChange={(e) => setFormData({ ...formData, minimumStock: e.target.value })} />
  </div>
  <div>
    <Label htmlFor="locationId">Location *</Label>
    <Select value={formData.locationId} onValueChange={(value) => setFormData({ ...formData, locationId: value })}>
      <SelectTrigger><SelectValue placeholder="Select location" /></SelectTrigger>
      <SelectContent>
        {locations.map((location) => (
          <SelectItem key={location.id} value={location.id}>{location.code} - {location.zone}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  </div>
</div>

{activeTab === "bundles" && (
  <div className="space-y-4 pt-2 border-t mt-4">
    <div className="space-y-0.5">
      <Label className="text-base font-semibold">Bundle Composition (BOM)</Label>
      <p className="text-xs text-muted-foreground">Select the finished goods that make up this bundle</p>
    </div>

    <div className="space-y-3 bg-muted/40 p-4 rounded-lg border border-dashed">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input 
          placeholder="Search items to add to bundle..." 
          className="pl-9 h-9"
          onChange={(e) => {
            const term = e.target.value.toLowerCase()
            if (term.length < 2) { setCompResults([]); return }
            const results = finishedGoods.filter(i => 
              (i.name.toLowerCase().includes(term) || i.sku.toLowerCase().includes(term)) &&
              !formData.components.some(c => c.finishedGoodId === i.id)
            ).slice(0, 5)
            setCompResults(results)
          }}
        />
        {compResults.length > 0 && (
          <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border rounded-md shadow-lg overflow-hidden">
            {compResults.map(item => (
              <button
                key={item.id}
                type="button"
                className="w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-accent text-left"
                onClick={() => {
                  setFormData({
                    ...formData,
                    components: [...formData.components, { finishedGoodId: item.id, name: item.name, sku: item.sku, quantity: 1 }]
                  })
                  setCompResults([])
                }}
              >
                <div>
                  <p className="font-medium">{item.name}</p>
                  <p className="text-xs text-muted-foreground font-mono">{item.sku}</p>
                </div>
                <Plus className="h-4 w-4 text-muted-foreground" />
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
        {formData.components.length === 0 ? (
          <p className="text-center text-xs text-muted-foreground py-4 italic">No items added yet</p>
        ) : (
          formData.components.map((comp, idx) => (
            <div key={comp.finishedGoodId} className="flex items-center gap-3 bg-background p-2 rounded-md border text-sm">
              <Layers className="h-4 w-4 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{comp.name}</p>
                <p className="text-[10px] text-muted-foreground font-mono truncate">{comp.sku}</p>
              </div>
              <div className="w-20">
                <Input 
                  type="number" 
                  min={1} 
                  value={comp.quantity} 
                  onChange={(e) => {
                    const newComps = [...formData.components]
                    newComps[idx].quantity = parseInt(e.target.value) || 1
                    setFormData({ ...formData, components: newComps })
                  }}
                  className="h-8 text-xs"
                />
              </div>
              <Button 
                type="button" 
                variant="ghost" 
                size="sm" 
                className="h-7 w-7 p-0 text-red-500 hover:text-red-600 hover:bg-red-50"
                onClick={() => {
                  setFormData({
                    ...formData,
                    components: formData.components.filter((_, i) => i !== idx)
                  })
                }}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))
        )}
      </div>
    </div>
  </div>
)}
                {activeTab === "raw-materials" && (
                  <div>
                    <Label htmlFor="supplierId">Supplier *</Label>
                    <Select value={formData.supplierId} onValueChange={(value) => setFormData({ ...formData, supplierId: value })}>
                      <SelectTrigger><SelectValue placeholder="Select supplier" /></SelectTrigger>
                      <SelectContent>
                        {suppliers.map((supplier) => (
                          <SelectItem key={supplier.id} value={supplier.id}>{supplier.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="flex justify-end space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isSubmitting}
                    onClick={() => setIsAddDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {editingItem ? "Updating…" : "Creating…"}
                      </>
                    ) : (
                      editingItem ? "Update" : "Create"
                    )}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* ── Filters ── */}
      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by name or SKU..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
        </div>

        <div className="flex flex-wrap gap-4 items-start">
          <div className="flex items-center gap-2 mt-1">
            <Filter className="h-4 w-4" />
            <span className="text-sm font-medium">Filters:</span>
          </div>
          <div className="flex flex-col gap-1">
            <div className="flex flex-wrap gap-1">
              {STATUS_OPTIONS.map(({ value, label }) => {
                const active = statusFilters.has(value)
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => toggleStatusFilter(value)}
                    className={`inline-flex items-center px-3 py-1.5 rounded-md text-sm font-medium border transition-colors
                      ${active ? "bg-primary text-primary-foreground border-primary" : "bg-background text-foreground border-input hover:bg-muted"}`}
                  >
                    {active && <span className="mr-1">✓</span>}
                    {label}
                  </button>
                )
              })}
            </div>
          </div>
          {activeTab === "raw-materials" && (
            <Select value={supplierFilter} onValueChange={setSupplierFilter}>
              <SelectTrigger className="w-40"><SelectValue placeholder="Supplier" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Suppliers</SelectItem>
                {suppliers.map((supplier) => (
                  <SelectItem key={supplier.id} value={supplier.id}>{supplier.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Select value={locationFilter} onValueChange={setLocationFilter}>
            <SelectTrigger className="w-40"><SelectValue placeholder="Location" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Locations</SelectItem>
              {locations.map((location) => (
                <SelectItem key={location.id} value={location.id}>{location.code} - {location.zone}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {activeTab === "finished-goods" && (
  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
    <SelectTrigger className="w-40"><SelectValue placeholder="Category" /></SelectTrigger>
    <SelectContent>
      <SelectItem value="all">All Categories</SelectItem>
      {categories.map((cat) => (
        <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
      ))}
    </SelectContent>
  </Select>
)}
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearAllFilters}>Clear Filters</Button>
          )}
        </div>

        {hasActiveFilters && (
          <div className="flex flex-wrap gap-2">
            {Array.from(statusFilters).map((status) => {
              const label = STATUS_OPTIONS.find((o) => o.value === status)?.label
              return (
                <Badge key={status} variant="secondary" className="flex items-center gap-1 pr-1">
                  {label}
                  <button type="button" onClick={() => removeStatusFilter(status)} className="ml-1 rounded-full hover:bg-muted-foreground/20 p-0.5">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )
            })}
            {supplierFilter !== "all" && (
              <Badge variant="secondary" className="flex items-center gap-1 pr-1">
                {suppliers.find((s) => s.id === supplierFilter)?.name}
                <button type="button" onClick={() => setSupplierFilter("all")} className="ml-1 rounded-full hover:bg-muted-foreground/20 p-0.5">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            {locationFilter !== "all" && (
              <Badge variant="secondary" className="flex items-center gap-1 pr-1">
                {locations.find((l) => l.id === locationFilter)?.code}
                <button type="button" onClick={() => setLocationFilter("all")} className="ml-1 rounded-full hover:bg-muted-foreground/20 p-0.5">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            {categoryFilter !== "all" && (
  <Badge variant="secondary" className="flex items-center gap-1 pr-1">
    {categories.find((c) => c.id === categoryFilter)?.name}
    <button type="button" onClick={() => setCategoryFilter("all")} className="ml-1 rounded-full hover:bg-muted-foreground/20 p-0.5">
      <X className="h-3 w-3" />
    </button>
  </Badge>
)}
          </div>
        )}
      </div>

      {/* ── Tabs ── */}
      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="mb-4">
          <TabsTrigger value="finished-goods">Finished Goods</TabsTrigger>
          {/* <TabsTrigger value="raw-materials">Raw Materials</TabsTrigger> */}
          <TabsTrigger value="bundles">Product Bundles</TabsTrigger>
        </TabsList>

        {/* Raw Materials */}
        <TabsContent value="raw-materials">
          {filteredRawMaterials.length > 0 && (
            <div className="flex items-center gap-4 mb-4 p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center space-x-2">
                <Checkbox id="select-all" checked={selectAll} onCheckedChange={handleSelectAll} />
                <label htmlFor="select-all" className="text-sm font-medium">
                  Select All ({filteredRawMaterials.length})
                </label>
              </div>
              {selectedItems.length > 0 && <Badge variant="secondary">{selectedItems.length} selected</Badge>}
            </div>
          )}
          <div className="grid gap-4">
            {filteredRawMaterials.map((item) => (
              <Card key={item.id}>
                <CardContent className="p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex items-start gap-3 flex-1">
                      <Checkbox checked={selectedItems.includes(item.id)} onCheckedChange={() => handleItemSelect(item.id)} className="mt-1" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Package className="h-4 w-4" />
                          <h3 className="font-semibold">{item.name}</h3>
                          <Badge variant="outline">{item.sku}</Badge>
                          {getStatusBadge(item)}
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">{item.description}</p>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div><span className="font-medium">Quantity:</span> {item.quantity} {item.unit}</div>
                          <div><span className="font-medium">Min Stock:</span> {item.minimumStock}</div>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {can(PERMISSIONS.INVENTORY_EDIT) && (
                      <Button size="sm" variant="outline" disabled={loadingAdvancedId === item.id || deletingItemId === item.id} onClick={() => openAdvancedModal(item)} title="Advanced Management">
                        {loadingAdvancedId === item.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Settings className="h-4 w-4" />}
                      </Button>
                      )}
                      {can(PERMISSIONS.INVENTORY_EDIT) && (
                        <Button size="sm" variant="outline" disabled={loadingEditId === item.id || deletingItemId === item.id} onClick={() => openEditDialog(item)}>
                          {loadingEditId === item.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Edit className="h-4 w-4" />}
                        </Button>
                      )}
                      {can(PERMISSIONS.INVENTORY_EDIT) && (
                        <Button size="sm" variant="outline" disabled={deletingItemId === item.id} onClick={() => handleDelete(item.id)}>
                          {deletingItemId === item.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Finished Goods */}
        <TabsContent value="finished-goods">
          {filteredFinishedGoods.length > 0 && (
            <div className="flex items-center gap-4 mb-4 p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center space-x-2">
                <Checkbox id="select-all-fg" checked={selectAll} onCheckedChange={handleSelectAll} />
                <label htmlFor="select-all-fg" className="text-sm font-medium">
                  Select All ({filteredFinishedGoods.length})
                </label>
              </div>
              {selectedItems.length > 0 && <Badge variant="secondary">{selectedItems.length} selected</Badge>}
            </div>
          )}
          <div className="grid gap-4">
            {filteredFinishedGoods.map((item) => (
              <Card key={item.id}>
                <CardContent className="p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex gap-4 flex-1">
                      <Checkbox checked={selectedItems.includes(item.id)} onCheckedChange={() => handleItemSelect(item.id)} className="mt-1" />
                      <div className="flex-shrink-0">
                        {item.imageUrl ? (
                          <img src={item.imageUrl || "/placeholder.svg"} alt={item.name} className="w-16 h-16 object-cover rounded-md" onError={(e) => { e.target.style.display = "none"; e.target.nextSibling.style.display = "flex" }} />
                        ) : null}
                        <div className={`w-16 h-16 bg-gray-100 rounded-md flex items-center justify-center ${item.imageUrl ? "hidden" : "flex"}`}>
                          <ImageIcon className="h-6 w-6 text-gray-400" />
                        </div>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Package className="h-4 w-4" />
                          <h3 className="font-semibold">{item.name}</h3>
                          <Badge variant="outline">{item.sku}</Badge>
                          {item.category && <Badge variant="secondary" className="text-xs">{item.category.name}</Badge>}
                          {getStatusBadge(item)}
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">{item.description}</p>
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                          <div><span className="font-medium">Quantity:</span> {item.quantity} {item.unit}</div>
                          <div><span className="font-medium">Price:</span> {item.price}</div>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" disabled={loadingAdvancedId === item.id || deletingItemId === item.id} onClick={() => openAdvancedModal(item)} title="Advanced Management">
                        {loadingAdvancedId === item.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Settings className="h-4 w-4" />}
                      </Button>
                      {can(PERMISSIONS.INVENTORY_EDIT) && (
                        <Button size="sm" variant="outline" disabled={loadingEditId === item.id || deletingItemId === item.id} onClick={() => openEditDialog(item)}>
                          {loadingEditId === item.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Edit className="h-4 w-4" />}
                        </Button>
                      )}
                      {can(PERMISSIONS.INVENTORY_EDIT) && (
                        <Button size="sm" variant="outline" disabled={deletingItemId === item.id} onClick={() => handleDelete(item.id)}>
                          {deletingItemId === item.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Product Bundles */}
        <TabsContent value="bundles">
          {filteredBundles.length > 0 && (
            <div className="flex items-center gap-4 mb-4 p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center space-x-2">
                <Checkbox id="select-all-bundles" checked={selectAll} onCheckedChange={handleSelectAll} />
                <label htmlFor="select-all-bundles" className="text-sm font-medium">
                  Select All ({filteredBundles.length})
                </label>
              </div>
              {selectedItems.length > 0 && <Badge variant="secondary">{selectedItems.length} selected</Badge>}
            </div>
          )}
          <div className="grid gap-4">
            {filteredBundles.length === 0 ? (
              <div className="text-center py-12 border rounded-xl bg-muted/20">
                <Layers className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                <h3 className="text-lg font-medium">No bundles found</h3>
                <p className="text-muted-foreground">Create your first bundle to get started</p>
              </div>
            ) : (
              filteredBundles.map((item) => (
                <Card key={item.id} className="overflow-hidden hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex gap-4 flex-1">
                        <Checkbox checked={selectedItems.includes(item.id)} onCheckedChange={() => handleItemSelect(item.id)} className="mt-1" />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Layers className="h-4 w-4 text-blue-500" />
                            <h3 className="font-semibold">{item.name}</h3>
                            <Badge variant="outline" className="font-mono">{item.sku}</Badge>
                            {getStatusBadge(item)}
                          </div>
                          <p className="text-sm text-muted-foreground mb-3">{item.description || "No description provided."}</p>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-sm">
                            <div className="space-y-1">
                              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Components</p>
                              <p className="font-semibold flex items-center gap-1.5">
                                <LinkIcon className="h-3.5 w-3.5 text-muted-foreground" />
                                {item.items?.length || 0} items
                              </p>
                            </div>
                            <div className="space-y-1">
                              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Sales Price</p>
                              <p className="font-semibold text-emerald-600">PKR {item.price?.toLocaleString() || 0}</p>
                            </div>
                            <div className="space-y-1">
                              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Total Cost</p>
                              <p className="font-semibold">PKR {item.cost?.toLocaleString() || 0}</p>
                            </div>
                          </div>
                          
                          {item.items?.length > 0 && (
                            <div className="mt-4 flex flex-wrap gap-2">
                              {item.items.slice(0, 3).map(bi => (
                                <Badge key={bi.id} variant="secondary" className="bg-muted/50 text-[10px] font-normal">
                                  {bi.quantity}x {bi.finishedGood.sku}
                                </Badge>
                              ))}
                              {item.items.length > 3 && (
                                <Badge variant="secondary" className="bg-muted/50 text-[10px] font-normal">
                                  +{item.items.length - 3} more
                                </Badge>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {can(PERMISSIONS.INVENTORY_EDIT) && (
                          <Button size="sm" variant="outline" disabled={loadingEditId === item.id || deletingItemId === item.id} onClick={() => openEditDialog(item)}>
                            {loadingEditId === item.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Edit className="h-4 w-4 text-muted-foreground" />}
                          </Button>
                        )}
                        {can(PERMISSIONS.INVENTORY_EDIT) && (
                          <Button size="sm" variant="outline" className="text-red-500 hover:text-red-600 hover:bg-red-50" disabled={deletingItemId === item.id} onClick={() => handleDelete(item.id)}>
                            {deletingItemId === item.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>

      <AdvancedInventoryModal
        item={selectedItem}
        isOpen={isAdvancedModalOpen}
        onClose={() => { setIsAdvancedModalOpen(false); setSelectedItem(null) }}
        onUpdate={fetchData}
        itemType={activeTab}
      />

      <BulkEditModal
        isOpen={isBulkEditOpen}
        onClose={() => { setIsBulkEditOpen(false); setSelectedItems([]); setSelectAll(false) }}
        selectedItems={selectedItemsData}
        itemType={activeTab}
        onUpdate={fetchData}
        suppliers={suppliers}
        locations={locations}
        categories={categories}
      />
    </div>
  )
}