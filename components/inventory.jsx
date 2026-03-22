"use client"

import { useState, useEffect } from "react"
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
import { Plus, Package, Search, Edit, Trash2, ImageIcon, Settings, Filter } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import AdvancedInventoryModal from "./advanced-inventory-modal"
import BulkEditModal from "./bulk-edit-modal"

export default function Inventory() {
  const [rawMaterials, setRawMaterials] = useState([])
  const [finishedGoods, setFinishedGoods] = useState([])
  const [suppliers, setSuppliers] = useState([])
  const [locations, setLocations] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [supplierFilter, setSupplierFilter] = useState("all")
  const [locationFilter, setLocationFilter] = useState("all")
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [activeTab, setActiveTab] = useState("raw-materials")
  const [selectedItem, setSelectedItem] = useState(null)
  const [isAdvancedModalOpen, setIsAdvancedModalOpen] = useState(false)
  const [selectedItems, setSelectedItems] = useState([])
  const [isBulkEditOpen, setIsBulkEditOpen] = useState(false)
  const [selectAll, setSelectAll] = useState(false)
  const { toast } = useToast()

  const [formData, setFormData] = useState({
    name: "",
    sku: "",
    description: "",
    unit: "",
    cost: "",
    price: "",
    minimumStock: "",
    supplierId: "",
    locationId: "",
    imageUrl: "",
  })

  useEffect(() => {
    fetchData()
  }, [])

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
        rawMaterialsRes.json(),
        finishedGoodsRes.json(),
        suppliersRes.json(),
        locationsRes.json(),
      ])

      setRawMaterials(rawMaterialsData)
      setFinishedGoods(finishedGoodsData)
      setSuppliers(suppliersData)
      setLocations(locationsData)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch inventory data",
        variant: "destructive",
      })
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

      toast({
        title: "Success",
        description: `Item ${editingItem ? "updated" : "created"} successfully`,
      })

      setIsAddDialogOpen(false)
      setEditingItem(null)
      resetForm()
      fetchData()
    } catch (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      })
    }
  }

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this item?")) return

    try {
      const response = await fetch(`/api/inventory/${activeTab}/${id}`, {
        method: "DELETE",
      })

      if (!response.ok) throw new Error("Failed to delete item")

      toast({
        title: "Success",
        description: "Item deleted successfully",
      })

      fetchData()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete item",
        variant: "destructive",
      })
    }
  }

  const resetForm = () => {
    setFormData({
      name: "",
      sku: "",
      description: "",
      unit: "",
      cost: "",
      price: "",
      minimumStock: "",
      supplierId: "",
      locationId: "",
      imageUrl: "",
    })
  }

  const openEditDialog = (item) => {
    setEditingItem(item)
    setFormData({
      name: item.name || "",
      sku: item.sku || "",
      description: item.description || "",
      unit: item.unit || "",
      cost: item.cost?.toString() || "",
      price: item.price?.toString() || "",
      minimumStock: item.minimumStock?.toString() || "",
      supplierId: item.supplierId || "",
      locationId: item.locationId || "",
      imageUrl: item.imageUrl || "",
    })
    setIsAddDialogOpen(true)
  }

  const openAdvancedModal = (item) => {
    setSelectedItem(item)
    setIsAdvancedModalOpen(true)
  }

  const getStatusBadge = (item) => {
    if (item.quantity <= 0) {
      return <Badge variant="destructive">Out of Stock</Badge>
    } else if (item.quantity <= item.minimumStock) {
      return <Badge variant="secondary">Low Stock</Badge>
    }
    return <Badge variant="default">In Stock</Badge>
  }

  const getItemStatus = (item) => {
    if (item.quantity <= 0) return "out-of-stock"
    if (item.quantity <= item.minimumStock) return "low-stock"
    return "in-stock"
  }

  const filteredRawMaterials = rawMaterials.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.sku.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === "all" || getItemStatus(item) === statusFilter
    const matchesSupplier = supplierFilter === "all" || item.supplierId === supplierFilter
    const matchesLocation = locationFilter === "all" || item.locationId === locationFilter

    return matchesSearch && matchesStatus && matchesSupplier && matchesLocation
  })

  const filteredFinishedGoods = finishedGoods.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.sku.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === "all" || getItemStatus(item) === statusFilter
    const matchesLocation = locationFilter === "all" || item.locationId === locationFilter

    return matchesSearch && matchesStatus && matchesLocation
  })

  const handleItemSelect = (itemId) => {
    setSelectedItems((prev) => {
      if (prev.includes(itemId)) {
        return prev.filter((id) => id !== itemId)
      } else {
        return [...prev, itemId]
      }
    })
  }

  const handleSelectAll = () => {
    setSelectAll(!selectAll)
  }

  const openBulkEdit = () => {
    const currentItems = activeTab === "raw-materials" ? filteredRawMaterials : filteredFinishedGoods
    const selectedItemsData = currentItems.filter((item) => selectedItems.includes(item.id))

    if (selectedItemsData.length === 0) {
      toast({
        title: "No items selected",
        description: "Please select items to bulk edit",
        variant: "destructive",
      })
      return
    }

    setIsBulkEditOpen(true)
  }

  const handleTabChange = (value) => {
    setActiveTab(value)
    setSelectedItems([])
    setSelectAll(false)
  }

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
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Inventory Management</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={openBulkEdit} disabled={selectedItems.length === 0}>
            <Settings className="mr-2 h-4 w-4" />
            Bulk Edit ({selectedItems.length})
          </Button>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button
                onClick={() => {
                  resetForm()
                  setEditingItem(null)
                }}
              >
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
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="sku">SKU *</Label>
                    <Input
                      id="sku"
                      value={formData.sku}
                      onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="unit">Unit *</Label>
                    <Input
                      id="unit"
                      value={formData.unit}
                      onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                      placeholder="e.g., kg, pcs, liters"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="cost">Cost *</Label>
                    <Input
                      id="cost"
                      type="number"
                      step="0.01"
                      value={formData.cost}
                      onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                      required
                    />
                  </div>
                </div>

                {activeTab === "finished-goods" && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="price">Price *</Label>
                      <Input
                        id="price"
                        type="number"
                        step="0.01"
                        value={formData.price}
                        onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="imageUrl">Image URL (Optional)</Label>
                      <Input
                        id="imageUrl"
                        type="url"
                        value={formData.imageUrl}
                        onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                        placeholder="https://example.com/image.jpg"
                      />
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="minimumStock">Minimum Stock</Label>
                    <Input
                      id="minimumStock"
                      type="number"
                      value={formData.minimumStock}
                      onChange={(e) => setFormData({ ...formData, minimumStock: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="locationId">Location *</Label>
                    <Select
                      value={formData.locationId}
                      onValueChange={(value) => setFormData({ ...formData, locationId: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select location" />
                      </SelectTrigger>
                      <SelectContent>
                        {locations.map((location) => (
                          <SelectItem key={location.id} value={location.id}>
                            {location.code} - {location.zone}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {activeTab === "raw-materials" && (
                  <div>
                    <Label htmlFor="supplierId">Supplier *</Label>
                    <Select
                      value={formData.supplierId}
                      onValueChange={(value) => setFormData({ ...formData, supplierId: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select supplier" />
                      </SelectTrigger>
                      <SelectContent>
                        {suppliers.map((supplier) => (
                          <SelectItem key={supplier.id} value={supplier.id}>
                            {supplier.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">{editingItem ? "Update" : "Create"}</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or SKU..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="flex flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            <span className="text-sm font-medium">Filters:</span>
          </div>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="in-stock">In Stock</SelectItem>
              <SelectItem value="low-stock">Low Stock</SelectItem>
              <SelectItem value="out-of-stock">Out of Stock</SelectItem>
            </SelectContent>
          </Select>

          {activeTab === "raw-materials" && (
            <Select value={supplierFilter} onValueChange={setSupplierFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Supplier" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Suppliers</SelectItem>
                {suppliers.map((supplier) => (
                  <SelectItem key={supplier.id} value={supplier.id}>
                    {supplier.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <Select value={locationFilter} onValueChange={setLocationFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Location" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Locations</SelectItem>
              {locations.map((location) => (
                <SelectItem key={location.id} value={location.id}>
                  {location.code} - {location.zone}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {(statusFilter !== "all" || supplierFilter !== "all" || locationFilter !== "all") && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setStatusFilter("all")
                setSupplierFilter("all")
                setLocationFilter("all")
              }}
            >
              Clear Filters
            </Button>
          )}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList>
          <TabsTrigger value="raw-materials">Raw Materials</TabsTrigger>
          <TabsTrigger value="finished-goods">Finished Goods</TabsTrigger>
        </TabsList>

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
                      <Checkbox
                        checked={selectedItems.includes(item.id)}
                        onCheckedChange={() => handleItemSelect(item.id)}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Package className="h-4 w-4" />
                          <h3 className="font-semibold">{item.name}</h3>
                          <Badge variant="outline">{item.sku}</Badge>
                          {getStatusBadge(item)}
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">{item.description}</p>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="font-medium">Quantity:</span> {item.quantity} {item.unit}
                          </div>
                          <div>
                            <span className="font-medium">Min Stock:</span> {item.minimumStock}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openAdvancedModal(item)}
                        title="Advanced Management"
                      >
                        <Settings className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => openEditDialog(item)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleDelete(item.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

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
                      <Checkbox
                        checked={selectedItems.includes(item.id)}
                        onCheckedChange={() => handleItemSelect(item.id)}
                        className="mt-1"
                      />
                      <div className="flex-shrink-0">
                        {item.imageUrl ? (
                          <img
                            src={item.imageUrl || "/placeholder.svg"}
                            alt={item.name}
                            className="w-16 h-16 object-cover rounded-md"
                            onError={(e) => {
                              e.target.style.display = "none"
                              e.target.nextSibling.style.display = "flex"
                            }}
                          />
                        ) : null}
                        <div
                          className={`w-16 h-16 bg-gray-100 rounded-md flex items-center justify-center ${item.imageUrl ? "hidden" : "flex"}`}
                        >
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
                          <div>
                            <span className="font-medium">Quantity:</span> {item.quantity} {item.unit}
                          </div>
                          <div>
                            <span className="font-medium">Price:</span> {item.price}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openAdvancedModal(item)}
                        title="Advanced Management"
                      >
                        <Settings className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => openEditDialog(item)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleDelete(item.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
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
        onClose={() => {
          setIsAdvancedModalOpen(false)
          setSelectedItem(null)
        }}
        onUpdate={fetchData}
        itemType={activeTab}
      />

      <BulkEditModal
        isOpen={isBulkEditOpen}
        onClose={() => {
          setIsBulkEditOpen(false)
          setSelectedItems([])
          setSelectAll(false)
        }}
        selectedItems={selectedItemsData}
        itemType={activeTab}
        onUpdate={fetchData}
        suppliers={suppliers}
        locations={locations}
      />
    </div>
  )
}
