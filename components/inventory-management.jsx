"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Plus, Package, Search, Edit, Trash2, Settings, AlertCircle, TrendingDown, Check } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

export default function InventoryManagement() {
  const [finishedGoods, setFinishedGoods] = useState([])
  const [rawMaterials, setRawMaterials] = useState([])
  const [settings, setSettings] = useState([])
  const [warehouseOrders, setWarehouseOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false)
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false)
  const [selectedItem, setSelectedItem] = useState(null)
  const { toast } = useToast()

  const [settingsFormData, setSettingsFormData] = useState({
    finishedGoodId: "",
    reorderPoint: "",
    reorderQuantity: "",
    maxStockLevel: "",
    leadTimeDays: "7",
  })

  const [orderFormData, setOrderFormData] = useState({
    finishedGoodId: "",
    quantity: "",
    notes: "",
  })

  useEffect(() => {
    fetchAllData()
  }, [])

  const fetchAllData = async () => {
    try {
      setLoading(true)
      const [finishedGoodsRes, rawMaterialsRes, settingsRes, ordersRes] = await Promise.all([
        fetch("/api/inventory/finished-goods"),
        fetch("/api/inventory/raw-materials"),
        fetch("/api/inventory/settings"),
        fetch("/api/inventory/warehouse-orders"),
      ])

      const [finishedGoodsData, rawMaterialsData, settingsData, ordersData] = await Promise.all([
        finishedGoodsRes.json(),
        rawMaterialsRes.json(),
        settingsRes.json(),
        ordersRes.json(),
      ])

      setFinishedGoods(finishedGoodsData)
      setRawMaterials(rawMaterialsData)
      setSettings(settingsData)
      setWarehouseOrders(ordersData)
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

  const handleCreateSettings = async (e) => {
    e.preventDefault()
    try {
      const response = await fetch("/api/inventory/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          finishedGoodId: settingsFormData.finishedGoodId,
          reorderPoint: parseInt(settingsFormData.reorderPoint),
          reorderQuantity: parseInt(settingsFormData.reorderQuantity),
          maxStockLevel: parseInt(settingsFormData.maxStockLevel),
          leadTimeDays: parseInt(settingsFormData.leadTimeDays),
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to create settings")
      }

      toast({
        title: "Success",
        description: "Threshold settings created successfully",
      })

      setIsSettingsModalOpen(false)
      setSettingsFormData({
        finishedGoodId: "",
        reorderPoint: "",
        reorderQuantity: "",
        maxStockLevel: "",
        leadTimeDays: "7",
      })
      fetchAllData()
    } catch (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      })
    }
  }

  const handleCreateOrder = async (e) => {
    e.preventDefault()
    try {
      const response = await fetch("/api/inventory/warehouse-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          finishedGoodId: orderFormData.finishedGoodId,
          quantity: parseInt(orderFormData.quantity),
          notes: orderFormData.notes,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to create order")
      }

      toast({
        title: "Success",
        description: "Warehouse order placed successfully",
      })

      setIsOrderModalOpen(false)
      setOrderFormData({
        finishedGoodId: "",
        quantity: "",
        notes: "",
      })
      fetchAllData()
    } catch (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      })
    }
  }

  const handleUpdateOrderStatus = async (orderId, newStatus) => {
    try {
      const response = await fetch(`/api/inventory/warehouse-orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: newStatus,
          ...(newStatus === "RECEIVED" && { receivedDate: new Date().toISOString() }),
        }),
      })

      if (!response.ok) throw new Error("Failed to update order status")

      toast({
        title: "Success",
        description: "Order status updated successfully",
      })

      fetchAllData()
    } catch (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      })
    }
  }

  const getInventorySetting = (finishedGoodId) => {
    return settings.find((s) => s.finishedGoodId === finishedGoodId)
  }

  const getThresholdStatus = (quantity, setting) => {
    if (!setting) return "not-configured"
    if (quantity > setting.maxStockLevel) return "overstock"
    if (quantity <= setting.reorderPoint) return "reorder"
    if (quantity <= setting.reorderPoint * 1.5) return "low"
    return "optimal"
  }

  const getStatusBadge = (status) => {
    switch (status) {
      case "overstock":
        return <Badge variant="secondary">Overstock</Badge>
      case "reorder":
        return <Badge variant="destructive">Reorder Now</Badge>
      case "low":
        return <Badge variant="outline">Low Stock</Badge>
      case "optimal":
        return <Badge variant="default">Optimal</Badge>
      default:
        return <Badge variant="outline">Not Configured</Badge>
    }
  }

  const filteredFinishedGoods = finishedGoods.filter((item) =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.sku.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const filteredRawMaterials = rawMaterials.filter((item) =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.sku.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <p className="text-muted-foreground">Loading inventory data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold">Inventory Management</h2>
          <p className="text-muted-foreground">Manage finished goods and track warehouse orders</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isSettingsModalOpen} onOpenChange={setIsSettingsModalOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Settings className="h-4 w-4" />
                Set Thresholds
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Threshold Settings</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateSettings} className="space-y-4">
                <div>
                  <Label htmlFor="finished-good">Finished Good</Label>
                  <Select
                    value={settingsFormData.finishedGoodId}
                    onValueChange={(value) =>
                      setSettingsFormData({ ...settingsFormData, finishedGoodId: value })
                    }
                  >
                    <SelectTrigger id="finished-good">
                      <SelectValue placeholder="Select a finished good" />
                    </SelectTrigger>
                    <SelectContent>
                      {finishedGoods.map((good) => (
                        <SelectItem key={good.id} value={good.id}>
                          {good.name} ({good.sku})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="reorder-point">Reorder Point</Label>
                    <Input
                      id="reorder-point"
                      type="number"
                      placeholder="Min stock level"
                      value={settingsFormData.reorderPoint}
                      onChange={(e) =>
                        setSettingsFormData({ ...settingsFormData, reorderPoint: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="reorder-qty">Reorder Quantity</Label>
                    <Input
                      id="reorder-qty"
                      type="number"
                      placeholder="Order quantity"
                      value={settingsFormData.reorderQuantity}
                      onChange={(e) =>
                        setSettingsFormData({ ...settingsFormData, reorderQuantity: e.target.value })
                      }
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="max-stock">Max Stock Level</Label>
                    <Input
                      id="max-stock"
                      type="number"
                      placeholder="Maximum stock"
                      value={settingsFormData.maxStockLevel}
                      onChange={(e) =>
                        setSettingsFormData({ ...settingsFormData, maxStockLevel: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="lead-time">Lead Time (Days)</Label>
                    <Input
                      id="lead-time"
                      type="number"
                      placeholder="7"
                      value={settingsFormData.leadTimeDays}
                      onChange={(e) =>
                        setSettingsFormData({ ...settingsFormData, leadTimeDays: e.target.value })
                      }
                    />
                  </div>
                </div>
                <Button type="submit" className="w-full">
                  Create Settings
                </Button>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={isOrderModalOpen} onOpenChange={setIsOrderModalOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Place Warehouse Order
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Place Warehouse Order</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateOrder} className="space-y-4">
                <div>
                  <Label htmlFor="order-item">Finished Good</Label>
                  <Select
                    value={orderFormData.finishedGoodId}
                    onValueChange={(value) =>
                      setOrderFormData({ ...orderFormData, finishedGoodId: value })
                    }
                  >
                    <SelectTrigger id="order-item">
                      <SelectValue placeholder="Select a finished good" />
                    </SelectTrigger>
                    <SelectContent>
                      {finishedGoods.map((good) => (
                        <SelectItem key={good.id} value={good.id}>
                          {good.name} ({good.sku}) - Current: {good.quantity} {good.unit}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="order-qty">Quantity to Order</Label>
                  <Input
                    id="order-qty"
                    type="number"
                    placeholder="0"
                    value={orderFormData.quantity}
                    onChange={(e) =>
                      setOrderFormData({ ...orderFormData, quantity: e.target.value })
                    }
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="order-notes">Notes</Label>
                  <Textarea
                    id="order-notes"
                    placeholder="Any special notes for this order..."
                    value={orderFormData.notes}
                    onChange={(e) =>
                      setOrderFormData({ ...orderFormData, notes: e.target.value })
                    }
                  />
                </div>
                <Button type="submit" className="w-full">
                  Place Order
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Search */}
      <div className="flex items-center gap-2">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by name or SKU..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1"
        />
      </div>

      {/* Finished Goods Section */}
      <div className="space-y-4">
        <h3 className="text-xl font-semibold">Finished Goods Inventory</h3>
        {filteredFinishedGoods.length === 0 ? (
          <Card>
            <CardContent className="py-8">
              <p className="text-center text-muted-foreground">No finished goods found</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {filteredFinishedGoods.map((good) => {
              const setting = getInventorySetting(good.id)
              const status = getThresholdStatus(good.quantity, setting)
              return (
                <Card key={good.id} className="overflow-hidden">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <Package className="h-5 w-5 text-blue-600" />
                          <div>
                            <h4 className="font-semibold">{good.name}</h4>
                            <p className="text-sm text-muted-foreground">SKU: {good.sku}</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-4 gap-4 mt-4">
                          <div>
                            <p className="text-xs text-muted-foreground">Current Stock</p>
                            <p className="text-lg font-semibold">
                              {good.quantity} {good.unit}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Unit Price</p>
                            <p className="text-lg font-semibold">${good.price}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Status</p>
                            <div className="mt-1">{getStatusBadge(status)}</div>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Threshold Status</p>
                            {setting ? (
                              <div className="text-xs mt-1">
                                <p>RP: {setting.reorderPoint}</p>
                                <p>Max: {setting.maxStockLevel}</p>
                              </div>
                            ) : (
                              <p className="text-xs text-orange-600 mt-1">Not configured</p>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2 ml-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedItem(good)
                            setIsSettingsModalOpen(true)
                          }}
                        >
                          <Settings className="h-4 w-4" />
                        </Button>
                        {status === "reorder" && (
                          <Button
                            size="sm"
                            onClick={() => {
                              setOrderFormData({
                                finishedGoodId: good.id,
                                quantity: setting?.reorderQuantity || "",
                                notes: "",
                              })
                              setIsOrderModalOpen(true)
                            }}
                          >
                            <AlertCircle className="h-4 w-4 mr-1" />
                            Order Now
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      {/* Warehouse Orders Section */}
      <div className="space-y-4">
        <h3 className="text-xl font-semibold">Warehouse Orders</h3>
        {warehouseOrders.length === 0 ? (
          <Card>
            <CardContent className="py-8">
              <p className="text-center text-muted-foreground">No warehouse orders yet</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {warehouseOrders.map((order) => (
              <Card key={order.id} className="overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-semibold">{order.orderNumber}</h4>
                        <Badge
                          variant={
                            order.status === "RECEIVED"
                              ? "default"
                              : order.status === "PENDING"
                                ? "secondary"
                                : "outline"
                          }
                        >
                          {order.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{order.finishedGood.name}</p>
                      <div className="grid grid-cols-4 gap-4">
                        <div>
                          <p className="text-xs text-muted-foreground">Quantity</p>
                          <p className="font-semibold">{order.quantity}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Requested</p>
                          <p className="text-sm">{new Date(order.requestedDate).toLocaleDateString()}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Received</p>
                          <p className="text-sm">
                            {order.receivedDate ? new Date(order.receivedDate).toLocaleDateString() : "-"}
                          </p>
                        </div>
                        {order.notes && (
                          <div>
                            <p className="text-xs text-muted-foreground">Notes</p>
                            <p className="text-sm">{order.notes}</p>
                          </div>
                        )}
                      </div>
                    </div>
                    {order.status !== "CANCELLED" && (
                      <div className="flex gap-2 ml-4">
                        {order.status !== "RECEIVED" && (
                          <Button
                            size="sm"
                            onClick={() => handleUpdateOrderStatus(order.id, "RECEIVED")}
                            className="gap-1"
                          >
                            <Check className="h-4 w-4" />
                            Mark Received
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Production Required Section */}
      <div className="space-y-4">
        <h3 className="text-xl font-semibold flex items-center gap-2">
          <TrendingDown className="h-5 w-5 text-orange-600" />
          Production Required
        </h3>
        {filteredRawMaterials.length === 0 ? (
          <Card>
            <CardContent className="py-8">
              <p className="text-center text-muted-foreground">No raw materials requiring production</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {filteredRawMaterials.map((material) => (
              <Card key={material.id} className="border-l-4 border-l-orange-600">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="h-5 w-5 text-orange-600" />
                        <h4 className="font-semibold">{material.name}</h4>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">SKU: {material.sku}</p>
                      <div className="grid grid-cols-3 gap-4 mt-4">
                        <div>
                          <p className="text-xs text-muted-foreground">Current Stock</p>
                          <p className="text-lg font-semibold">
                            {material.quantity} {material.unit}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Unit Cost</p>
                          <p className="text-lg font-semibold">${material.cost}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Status</p>
                          <Badge variant="outline">Raw Material</Badge>
                        </div>
                      </div>
                      <p className="text-sm text-gray-700 mt-3 italic">
                        Raw material in stock. Schedule production to convert to finished goods.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
