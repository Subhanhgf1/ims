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
import {
  Plus, Package, Search, Edit, Trash2, ImageIcon, Settings,
  Filter, X, ChevronDown, PencilLine, Tags, MapPin,
  Truck, AlertTriangle, CheckCircle2, XCircle, Download,
  Copy, Archive,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
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
      // { id: "bulk-status",  label: "Change Status",       icon: Tags,          variant: "default" },
      // { id: "bulk-location",label: "Reassign Location",   icon: MapPin,        variant: "default" },
      // { id: "bulk-supplier",label: "Reassign Supplier",   icon: Truck,         variant: "default" },
    ],
  },
  // {
  //   group: "Mark As",
  //   actions: [
  //     { id: "mark-in-stock",   label: "Mark In-Stock",     icon: CheckCircle2, variant: "success" },
  //     { id: "mark-low-stock",  label: "Mark Low-Stock",    icon: AlertTriangle, variant: "warning" },
  //     { id: "mark-out",        label: "Mark Out of Stock", icon: XCircle,       variant: "destructive" },
  //   ],
  // },
  {
    group: "Data",
    actions: [
      { id: "export",   label: "Export to CSV",    icon: Download, variant: "default" },
      // { id: "duplicate",label: "Duplicate Items",  icon: Copy,     variant: "default" },
      // { id: "archive",  label: "Archive Items",    icon: Archive,  variant: "default" },
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
function BulkActionsDropdown({ count, onAction, disabled }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  // Close on outside click
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

  return (
    <div className="relative" ref={ref}>
      <Button
        variant="outline"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 font-medium transition-all duration-150 border-primary/30 hover:border-primary/60 hover:bg-primary/5"
      >
        <Settings className="h-4 w-4" />
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
                {group.actions.map(({ id, label, icon: Icon, variant }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => { onAction(id); setOpen(false) }}
                    className={`w-full flex items-center gap-3 px-3 py-2 text-sm transition-colors duration-100 ${variantStyles[variant]}`}
                  >
                    <Icon className={`h-4 w-4 flex-shrink-0 ${iconStyles[variant]}`} />
                    <span>{label}</span>
                  </button>
                ))}
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
    name: "", sku: "", description: "", unit: "", cost: "", price: "",
    minimumStock: "", supplierId: "", locationId: "", imageUrl: "",
  })

  useEffect(() => { fetchData() }, [])

  useEffect(() => {
    const currentItems = activeTab === "raw-materials" ? filteredRawMaterials : filteredFinishedGoods
    if (selectAll && currentItems.length > 0) {
      setSelectedItems(currentItems.map((item) => item.id))
    } else if (!selectAll) {
      setSelectedItems([])
    }
  }, [selectAll, activeTab])

  const fetchData = async () => {
    try {
      const [rawMaterialsRes, finishedGoodsRes, suppliersRes, locationsRes] = await Promise.all([
        fetch("/api/inventory/raw-materials"),
        fetch("/api/inventory/finished-goods"),
        fetch("/api/suppliers"),
        fetch("/api/locations"),
      ])
      const [rawMaterialsData, finishedGoodsData, suppliersData, locationsData] = await Promise.all([
        rawMaterialsRes.json(), finishedGoodsRes.json(), suppliersRes.json(), locationsRes.json(),
      ])
      setRawMaterials(rawMaterialsData)
      setFinishedGoods(finishedGoodsData)
      setSuppliers(suppliersData)
      setLocations(locationsData)
    } catch (error) {
      toast({ title: "Error", description: "Failed to fetch inventory data", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
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
    }
  }

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this item?")) return
    try {
      const response = await fetch(`/api/inventory/${activeTab}/${id}`, { method: "DELETE" })
      if (!response.ok) throw new Error("Failed to delete item")
      toast({ title: "Success", description: "Item deleted successfully" })
      fetchData()
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete item", variant: "destructive" })
    }
  }

  const resetForm = () => {
    setFormData({ name: "", sku: "", description: "", unit: "", cost: "", price: "",
      minimumStock: "", supplierId: "", locationId: "", imageUrl: "" })
  }

  const openEditDialog = (item) => {
    setEditingItem(item)
    setFormData({
      name: item.name || "", sku: item.sku || "", description: item.description || "",
      unit: item.unit || "", cost: item.cost?.toString() || "", price: item.price?.toString() || "",
      minimumStock: item.minimumStock?.toString() || "", supplierId: item.supplierId || "",
      locationId: item.locationId || "", imageUrl: item.imageUrl || "",
    })
    setIsAddDialogOpen(true)
  }

  const openAdvancedModal = (item) => { setSelectedItem(item); setIsAdvancedModalOpen(true) }

  const getStatusBadge = (item) => {
    if (item.quantity <= 0) return <Badge variant="destructive">Out of Stock</Badge>
    if (item.quantity <= item.minimumStock) return <Badge variant="secondary">Low Stock</Badge>
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
    return matchesSearch && matchesStatusFilter(item) && matchesLocation
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
  const handleBulkAction = (actionId) => {
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
      case "delete":
        if (confirm(`Delete ${selectedItems.length} item${selectedItems.length !== 1 ? "s" : ""}? This cannot be undone.`)) {
          const ids = selectedItemsData.map((item) => item.id)
          fetch(`/api/inventory/${activeTab}`, {
            method: "DELETE",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ ids }),
          })
          .then(() => {
            toast({ title: "Deleted", description: `${selectedItems.length} items deleted` })
            setSelectedItems([])
            setSelectAll(false)
            fetchData()
          }).catch(() => {
            toast({ title: "Error", description: "Some items could not be deleted", variant: "destructive" })
          })
        }
        break
      case "export":
        toast({ title: "Exporting…", description: `Exporting ${selectedItems.length} items to CSV` })
        handleExportItems()
        toast({ title: "Exported", description: `${selectedItems.length} items exported to CSV` })
        break
      case "mark-in-stock":
      case "mark-low-stock":
      case "mark-out":
        toast({ title: "Status Updated", description: `${selectedItems.length} items marked` })
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

  const hasActiveFilters = statusFilters.size > 0 || supplierFilter !== "all" || locationFilter !== "all"
  const clearAllFilters = () => { setStatusFilters(new Set()); setSupplierFilter("all"); setLocationFilter("all") }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading inventory...</div>
      </div>
    )
  }

  const currentItems = activeTab === "raw-materials" ? filteredRawMaterials : filteredFinishedGoods
  const selectedItemsData = currentItems.filter((item) => selectedItems.includes(item.id))

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Inventory Management</h1>
        <div className="flex gap-2 items-center">
          {/* Bulk Actions Dropdown — only shows when items selected */}
          <BulkActionsDropdown
            count={selectedItems.length}
            onAction={handleBulkAction}
            disabled={selectedItems.length === 0}
          />

          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => { resetForm(); setEditingItem(null) }}>
                <Plus className="mr-2 h-4 w-4" />
                Add Item
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {editingItem ? "Edit" : "Add"} {activeTab === "raw-materials" ? "Raw Material" : "Finished Good"}
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
                {activeTab === "finished-goods" && (
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
                  <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
                  <Button type="submit">{editingItem ? "Update" : "Create"}</Button>
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
          </div>
        )}
      </div>

      {/* ── Tabs ── */}
      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList>
          <TabsTrigger value="finished-goods">Finished Goods</TabsTrigger>
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
                      <Button size="sm" variant="outline" onClick={() => openAdvancedModal(item)} title="Advanced Management">
                        <Settings className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => openEditDialog(item)}><Edit className="h-4 w-4" /></Button>
                      <Button size="sm" variant="outline" onClick={() => handleDelete(item.id)}><Trash2 className="h-4 w-4" /></Button>
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
                          <img
                            src={item.imageUrl || "/placeholder.svg"}
                            alt={item.name}
                            className="w-16 h-16 object-cover rounded-md"
                            onError={(e) => { e.target.style.display = "none"; e.target.nextSibling.style.display = "flex" }}
                          />
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
                      <Button size="sm" variant="outline" onClick={() => openAdvancedModal(item)} title="Advanced Management">
                        <Settings className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => openEditDialog(item)}><Edit className="h-4 w-4" /></Button>
                      <Button size="sm" variant="outline" onClick={() => handleDelete(item.id)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
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
      />
    </div>
  )
}