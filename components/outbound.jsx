"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/lib/auth"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ItemSelector } from "@/components/ui/item-selector"
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
import { Plus, Eye, Package, Truck, CheckCircle, Clock, Loader2, Send } from "lucide-react"
import { getStatusColor, formatCurrency, formatDate } from "@/lib/utils"

export default function Outbound() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState("sales-orders")
  const [salesOrders, setSalesOrders] = useState([])
  const [outboundShipments, setOutboundShipments] = useState([])
  const [customers, setCustomers] = useState([])
  const [rawMaterials, setRawMaterials] = useState([])
  const [finishedGoods, setFinishedGoods] = useState([])
  const [locations, setLocations] = useState([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  // Dialog states
  const [isCreateSODialogOpen, setIsCreateSODialogOpen] = useState(false)
  const [isCreateShipmentDialogOpen, setIsCreateShipmentDialogOpen] = useState(false)
  const [isProcessDialogOpen, setIsProcessDialogOpen] = useState(false)
  const [isShipDialogOpen, setIsShipDialogOpen] = useState(false)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState(null)

  // Form states
  const [formData, setFormData] = useState({
    customerId: "",
    shipDate: "",
    priority: "MEDIUM",
    shippingAddress: "",
    notes: "",
    items: [],
  })
  const [shipmentData, setShipmentData] = useState({
    customerId: "",
    shipDate: new Date().toISOString().split("T")[0],
    shippingAddress: "",
    notes: "",
    items: [],
  })
  const [processData, setProcessData] = useState([])
  const [shipData, setShipData] = useState([])

  useEffect(() => {
    fetchData()
  }, [activeTab])
  

    useEffect(() => {
    console.log("FormData",formData)
  }, [formData])

  const fetchData = async () => {
    try {
      setLoading(true)
      const promises = [
        fetch("/api/customers"),
        fetch("/api/inventory/raw-materials"),
        fetch("/api/inventory/finished-goods"),
        fetch("/api/locations"),
      ]

      if (activeTab === "sales-orders") {
        promises.push(fetch("/api/sales-orders"))
      } else {
        promises.push(fetch("/api/outbound-shipments"))
      }

      const [customersRes, materialsRes, goodsRes, locationsRes, ordersRes] = await Promise.all(promises)

      if (customersRes.ok) {
        const customersData = await customersRes.json()
        setCustomers(customersData)
      }

      if (materialsRes.ok) {
        const materialsData = await materialsRes.json()
        setRawMaterials(materialsData)
      }

      if (goodsRes.ok) {
        const goodsData = await goodsRes.json()
        setFinishedGoods(goodsData)
      }

      if (locationsRes.ok) {
        const locationsData = await locationsRes.json()
        setLocations(locationsData)
      }

      if (ordersRes.ok) {
        const ordersData = await ordersRes.json()
        if (activeTab === "sales-orders") {
          setSalesOrders(ordersData)
        } else {
          setOutboundShipments(ordersData)
        }
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch data",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCreateSO = async (e) => {
    e.preventDefault()
    if (!formData.customerId || !formData.shipDate || !formData.items.length) {
      toast({
        title: "Error",
        description: "Please fill in all required fields and add at least one item",
        variant: "destructive",
      })
      return
    }

    try {
      setSubmitting(true)
      const response = await fetch("/api/sales-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          createdById: user.id,
        }),
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: "Sales order created successfully",
        })
        setIsCreateSODialogOpen(false)
        resetSOForm()
        fetchData()
      } else {
        const error = await response.json()
        throw new Error(error.error)
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleCreateShipment = async (e) => {
    e.preventDefault()
    if (!shipmentData.customerId || !shipmentData.items.length) {
      toast({
        title: "Error",
        description: "Please select a customer and add at least one item",
        variant: "destructive",
      })
      return
    }

    try {
      setSubmitting(true)
      const response = await fetch("/api/outbound-shipments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...shipmentData,
          createdById: user.id,
        }),
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: "Outbound shipment created successfully",
        })
        setIsCreateShipmentDialogOpen(false)
        resetShipmentForm()
        fetchData()
      } else {
        const error = await response.json()
        throw new Error(error.error)
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleProcessOrder = async (e) => {
    e.preventDefault()
    if (!processData.length) return

    try {
      setSubmitting(true)
      const response = await fetch(`/api/sales-orders/${selectedOrder.id}/process`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: processData,
          userId: user.id,
        }),
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: "Order processed successfully",
        })
        setIsProcessDialogOpen(false)
        setSelectedOrder(null)
        setProcessData([])
        fetchData()
      } else {
        const error = await response.json()
        throw new Error(error.error)
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleShipOrder = async (e) => {
    e.preventDefault()
    if (!shipData.length) return

    try {
      setSubmitting(true)
      const endpoint =
        activeTab === "sales-orders"
          ? `/api/sales-orders/${selectedOrder.id}/ship`
          : `/api/outbound-shipments/${selectedOrder.id}/ship`

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: shipData,
          userId: user.id,
        }),
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: "Items shipped successfully",
        })
        setIsShipDialogOpen(false)
        setSelectedOrder(null)
        setShipData([])
        fetchData()
      } else {
        const error = await response.json()
        throw new Error(error.error)
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  const addSOItem = () => {
    setFormData((prev) => ({
      ...prev,
      items: [...prev.items, { itemType: "finished_good", itemId: "", quantity: "", unitPrice: "" }],
    }))
  }

  const updateSOItem = (index, field, value) => {
    setFormData((prev) => ({
      ...prev,
      items: prev.items.map((item, i) => (i === index ? { ...item, [field]: value } : item)),
    }))
  }

  const removeSOItem = (index) => {
    setFormData((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }))
  }

  const addShipmentItem = () => {
    setShipmentData((prev) => ({
      ...prev,
      items: [...prev.items, { itemType: "finished_good", itemId: "", quantity: "", locationId: "" }],
    }))
  }

  const updateShipmentItem = (index, field, value) => {
    setShipmentData((prev) => ({
      ...prev,
      items: prev.items.map((item, i) => (i === index ? { ...item, [field]: value } : item)),
    }))
  }

  const removeShipmentItem = (index) => {
    setShipmentData((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }))
  }

  const openProcessDialog = (order) => {
    setSelectedOrder(order)
    setProcessData(
      order.items.map((item) => ({
        itemId: item.id,
        processedQuantity: item.quantity,
        locationId: "",
      })),
    )
    setIsProcessDialogOpen(true)
  }

  const openShipDialog = (order) => {
    setSelectedOrder(order)
    const itemsToShip =
      activeTab === "sales-orders"
        ? order.items.map((item) => ({
            itemId: item.id,
            shippedQuantity: Math.max(0, item.quantity - item.shipped),
          }))
        : order.items.map((item) => ({
            itemId: item.id,
            shippedQuantity: item.quantity,
          }))

    setShipData(itemsToShip)
    setIsShipDialogOpen(true)
  }

  const openViewDialog = (order) => {
    setSelectedOrder(order)
    setIsViewDialogOpen(true)
  }

  const resetSOForm = () => {
    setFormData({
      customerId: "",
      shipDate: "",
      priority: "MEDIUM",
      shippingAddress: "",
      notes: "",
      items: [],
    })
  }

  const resetShipmentForm = () => {
    setShipmentData({
      customerId: "",
      shipDate: new Date().toISOString().split("T")[0],
      shippingAddress: "",
      notes: "",
      items: [],
    })
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case "PREPARING":
        return <Package className="h-4 w-4" />
      case "READY":
        return <CheckCircle className="h-4 w-4" />
      case "SHIPPED":
        return <Truck className="h-4 w-4" />
      case "DELIVERED":
        return <CheckCircle className="h-4 w-4" />
      default:
        return <Clock className="h-4 w-4" />
    }
  }

  const getPriorityColor = (priority) => {
    switch (priority) {
      case "HIGH":
      case "URGENT":
        return "bg-red-100 text-red-800"
      case "MEDIUM":
        return "bg-yellow-100 text-yellow-800"
      case "LOW":
        return "bg-green-100 text-green-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getItemOptions = (itemType) => {
    return itemType === "raw_material" ? rawMaterials : finishedGoods
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
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Outbound Operations</h2>
          <p className="text-muted-foreground">Manage outgoing shipments and sales orders</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setIsCreateSODialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Sales Order
          </Button>
          <Button variant="outline" onClick={() => setIsCreateShipmentDialogOpen(true)}>
            <Send className="h-4 w-4 mr-2" />
            Direct Shipment
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Preparing</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {[...salesOrders, ...outboundShipments].filter((order) => order.status === "PREPARING").length}
            </div>
            <p className="text-xs text-muted-foreground">Orders being prepared</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ready to Ship</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {[...salesOrders, ...outboundShipments].filter((order) => order.status === "READY").length}
            </div>
            <p className="text-xs text-muted-foreground">Ready for pickup</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Transit</CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {[...salesOrders, ...outboundShipments].filter((order) => order.status === "SHIPPED").length}
            </div>
            <p className="text-xs text-muted-foreground">Currently shipping</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenue Today</CardTitle>
            <div className="h-4 w-4 text-muted-foreground">$</div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {user.role === "ADMIN"
                ? formatCurrency(
                    [...salesOrders, ...outboundShipments]
                      .filter(
                        (order) =>
                          order.status === "DELIVERED" &&
                          new Date(order.updatedAt).toDateString() === new Date().toDateString(),
                      )
                      .reduce((sum, order) => sum + (order.totalValue || 0), 0),
                  )
                : "***"}
            </div>
            <p className="text-xs text-muted-foreground">Delivered today</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="space-y-4">
        <div className="flex gap-2 p-1 bg-gray-100 rounded-lg w-fit">
          <button
            onClick={() => setActiveTab("sales-orders")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === "sales-orders" ? "bg-white text-gray-900 shadow-sm" : "text-gray-600 hover:text-gray-900"
            }`}
          >
            Sales Orders
          </button>
          <button
            onClick={() => setActiveTab("direct-shipments")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === "direct-shipments"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            Direct Shipments
          </button>
        </div>

        {/* Sales Orders Table */}
        {activeTab === "sales-orders" && (
          <Card>
            <CardHeader>
              <CardTitle>Sales Orders</CardTitle>
              <CardDescription>Track and manage all sales orders</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>SO Number</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Order Date</TableHead>
                    <TableHead>Ship Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Items</TableHead>
                    {user.role === "ADMIN" && <TableHead>Total Value</TableHead>}
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {salesOrders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium">{order.soNumber}</TableCell>
                      <TableCell>{order.customer?.name}</TableCell>
                      <TableCell>{formatDate(order.orderDate)}</TableCell>
                      <TableCell>{formatDate(order.shipDate)}</TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(order.status)}>
                          <div className="flex items-center gap-1">
                            {getStatusIcon(order.status)}
                            {order.status.replace("_", " ")}
                          </div>
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={getPriorityColor(order.priority)}>{order.priority}</Badge>
                      </TableCell>
                      <TableCell>{order.items?.length || 0}</TableCell>
                      {user.role === "ADMIN" && <TableCell>{formatCurrency(order.totalValue)}</TableCell>}
                      <TableCell>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => openViewDialog(order)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          {order.status === "PREPARING" && (
                            <Button variant="outline" size="sm" onClick={() => openProcessDialog(order)}>
                              Process
                            </Button>
                          )}
                          {order.status === "READY" && (
                            <Button variant="outline" size="sm" onClick={() => openShipDialog(order)}>
                              Ship
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Direct Shipments Table */}
        {activeTab === "direct-shipments" && (
          <Card>
            <CardHeader>
              <CardTitle>Direct Shipments</CardTitle>
              <CardDescription>Track and manage direct outbound shipments</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Shipment Number</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Ship Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead>Created By</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {outboundShipments.map((shipment) => (
                    <TableRow key={shipment.id}>
                      <TableCell className="font-medium">{shipment.shipmentNumber}</TableCell>
                      <TableCell>{shipment.customer?.name}</TableCell>
                      <TableCell>{formatDate(shipment.shipDate)}</TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(shipment.status)}>
                          <div className="flex items-center gap-1">
                            {getStatusIcon(shipment.status)}
                            {shipment.status.replace("_", " ")}
                          </div>
                        </Badge>
                      </TableCell>
                      <TableCell>{shipment.items?.length || 0}</TableCell>
                      <TableCell>{shipment.createdBy?.name}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => openViewDialog(shipment)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          {shipment.status === "PREPARING" && (
                            <Button variant="outline" size="sm" onClick={() => openShipDialog(shipment)}>
                              Ship
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Create Sales Order Dialog */}
      <Dialog open={isCreateSODialogOpen} onOpenChange={setIsCreateSODialogOpen}>
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle>Create Sales Order</DialogTitle>
            <DialogDescription>Create a new sales order for outgoing goods</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateSO}>
            <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="customer">Customer *</Label>
                  <select
                    id="customer"
                    value={formData.customerId}
                    onChange={(e) => setFormData((prev) => ({ ...prev, customerId: e.target.value }))}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    required
                  >
                    <option value="">Select customer</option>
                    {customers.map((customer) => (
                      <option key={customer.id} value={customer.id}>
                        {customer.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="shipDate">Ship Date *</Label>
                  <Input
                    id="shipDate"
                    type="date"
                    value={formData.shipDate}
                    onChange={(e) => setFormData((prev) => ({ ...prev, shipDate: e.target.value }))}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="priority">Priority</Label>
                  <select
                    id="priority"
                    value={formData.priority}
                    onChange={(e) => setFormData((prev) => ({ ...prev, priority: e.target.value }))}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="shippingAddress">Shipping Address</Label>
                <Textarea
                  id="shippingAddress"
                  value={formData.shippingAddress}
                  onChange={(e) => setFormData((prev) => ({ ...prev, shippingAddress: e.target.value }))}
                  placeholder="Enter complete shipping address"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
                  placeholder="Additional notes or special instructions"
                />
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <Label>Order Items</Label>
                  <Button type="button" variant="outline" onClick={addSOItem}>
                    Add Item
                  </Button>
                </div>
                <div className="space-y-2">
                  {formData.items.map((item, index) => (
                    <div key={index} className="grid grid-cols-5 gap-2 items-end p-2 border rounded">
                      <div className="space-y-1">
                        <Label className="text-xs">Type</Label>
                        <select
                          value={item.itemType}
                          onChange={(e) => updateSOItem(index, "itemType", e.target.value)}
                          className="flex h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-xs"
                        >
                          <option value="finished_good">Finished Good</option>
                          <option value="raw_material">Raw Material</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Item</Label>
                        <ItemSelector
  items={getItemOptions(item.itemType)}
  value={item.itemId}
  onValueChange={(value) => updateSOItem(index, "itemId", value)}
  placeholder="Select item"
  className="h-8 text-xs"
/>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Quantity</Label>
                        <Input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => updateSOItem(index, "quantity", e.target.value)}
                          className="h-8 text-xs"
                          placeholder="0"
                        />
                      </div>
                      {/* <div className="space-y-1">
                        <Label className="text-xs">Unit Price</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={item.unitPrice}
                          onChange={(e) => updateSOItem(index, "unitPrice", e.target.value)}
                          className="h-8 text-xs"
                          placeholder="0.00"
                        />
                      </div> */}
                      <Button type="button" variant="outline" size="sm" onClick={() => removeSOItem(index)}>
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsCreateSODialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create Order"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Create Direct Shipment Dialog */}
      <Dialog open={isCreateShipmentDialogOpen} onOpenChange={setIsCreateShipmentDialogOpen}>
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle>Create Direct Shipment</DialogTitle>
            <DialogDescription>Create a direct shipment without sales order</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateShipment}>
            <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="shipment-customer">Customer *</Label>
                  <select
                    id="shipment-customer"
                    value={shipmentData.customerId}
                    onChange={(e) => setShipmentData((prev) => ({ ...prev, customerId: e.target.value }))}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    required
                  >
                    <option value="">Select customer</option>
                    {customers.map((customer) => (
                      <option key={customer.id} value={customer.id}>
                        {customer.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="shipment-date">Ship Date *</Label>
                  <Input
                    id="shipment-date"
                    type="date"
                    value={shipmentData.shipDate}
                    onChange={(e) => setShipmentData((prev) => ({ ...prev, shipDate: e.target.value }))}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="shipment-address">Shipping Address</Label>
                <Textarea
                  id="shipment-address"
                  value={shipmentData.shippingAddress}
                  onChange={(e) => setShipmentData((prev) => ({ ...prev, shippingAddress: e.target.value }))}
                  placeholder="Enter complete shipping address"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="shipment-notes">Notes</Label>
                <Textarea
                  id="shipment-notes"
                  value={shipmentData.notes}
                  onChange={(e) => setShipmentData((prev) => ({ ...prev, notes: e.target.value }))}
                  placeholder="Additional notes or special instructions"
                />
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <Label>Shipment Items</Label>
                  <Button type="button" variant="outline" onClick={addShipmentItem}>
                    Add Item
                  </Button>
                </div>
                <div className="space-y-2">
                  {shipmentData.items.map((item, index) => (
                    <div key={index} className="grid grid-cols-5 gap-2 items-end p-2 border rounded">
                      <div className="space-y-1">
                        <Label className="text-xs">Type</Label>
                        <select
                          value={item.itemType}
                          onChange={(e) => updateShipmentItem(index, "itemType", e.target.value)}
                          className="flex h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-xs"
                        >
                          <option value="finished_good">Finished Good</option>
                          <option value="raw_material">Raw Material</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Item</Label>
                     <ItemSelector
  items={getItemOptions(item.itemType)}
  value={item.itemId}
  onValueChange={(value) => updateShipmentItem(index, "itemId", value)}
  placeholder="Select item"
  className="h-8 text-xs"
/>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Quantity</Label>
                        <Input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => updateShipmentItem(index, "quantity", e.target.value)}
                          className="h-8 text-xs"
                          placeholder="0"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">From Location</Label>
                        <select
                          value={item.locationId}
                          onChange={(e) => updateShipmentItem(index, "locationId", e.target.value)}
                          className="flex h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-xs"
                        >
                          <option value="">Select location</option>
                          {locations.map((location) => (
                            <option key={location.id} value={location.id}>
                              {location.code} - {location.zone}
                            </option>
                          ))}
                        </select>
                      </div>
                      <Button type="button" variant="outline" size="sm" onClick={() => removeShipmentItem(index)}>
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsCreateShipmentDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create Shipment"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Process Order Dialog */}
      <Dialog open={isProcessDialogOpen} onOpenChange={setIsProcessDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Process Sales Order</DialogTitle>
            <DialogDescription>Allocate inventory and prepare order for shipping</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleProcessOrder}>
            <div className="grid gap-4 py-4 max-h-[50vh] overflow-y-auto">
              {selectedOrder?.items?.map((item, index) => (
                <div key={item.id} className="grid grid-cols-3 gap-4 items-center p-2 border rounded">
                  <div>
                    <Label className="text-sm font-medium">{item.finishedGood?.name || item.rawMaterial?.name}</Label>
                    <p className="text-xs text-muted-foreground">Quantity: {item.quantity}</p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Process Quantity</Label>
                    <Input
                      type="number"
                      value={processData[index]?.processedQuantity || ""}
                      onChange={(e) =>
                        setProcessData((prev) =>
                          prev.map((data, i) => (i === index ? { ...data, processedQuantity: e.target.value } : data)),
                        )
                      }
                      max={item.quantity}
                      className="h-8"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">From Location</Label>
                    <select
                      value={processData[index]?.locationId || ""}
                      onChange={(e) =>
                        setProcessData((prev) =>
                          prev.map((data, i) => (i === index ? { ...data, locationId: e.target.value } : data)),
                        )
                      }
                      className="flex h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-xs"
                    >
                      <option value="">Select location</option>
                      {locations.map((location) => (
                        <option key={location.id} value={location.id}>
                          {location.code} - {location.zone}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              ))}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsProcessDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  "Process Order"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Ship Order Dialog */}
      <Dialog open={isShipDialogOpen} onOpenChange={setIsShipDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Ship Order</DialogTitle>
            <DialogDescription>
              Record the quantities shipped for {selectedOrder?.soNumber || selectedOrder?.shipmentNumber}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleShipOrder}>
            <div className="grid gap-4 py-4 max-h-[50vh] overflow-y-auto">
              {selectedOrder?.items?.map((item, index) => (
                <div key={item.id} className="grid grid-cols-3 gap-4 items-center p-2 border rounded">
                  <div>
                    <Label className="text-sm font-medium">{item.finishedGood?.name || item.rawMaterial?.name}</Label>
                    <p className="text-xs text-muted-foreground">
                      {activeTab === "sales-orders" ? (
                        <>
                          Ordered: {item.quantity} | Shipped: {item.shipped || 0}
                        </>
                      ) : (
                        <>Quantity: {item.quantity}</>
                      )}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Ship Quantity</Label>
                    <Input
                      type="number"
                      value={shipData[index]?.shippedQuantity || ""}
                      onChange={(e) =>
                        setShipData((prev) =>
                          prev.map((data, i) => (i === index ? { ...data, shippedQuantity: e.target.value } : data)),
                        )
                      }
                      max={activeTab === "sales-orders" ? item.quantity - (item.shipped || 0) : item.quantity}
                      className="h-8"
                    />
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {activeTab === "sales-orders"
                      ? `Remaining: ${item.quantity - (item.shipped || 0)}`
                      : `Available: ${item.quantity}`}
                  </div>
                </div>
              ))}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsShipDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Shipping...
                  </>
                ) : (
                  "Ship Items"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{selectedOrder?.soNumber ? "Sales Order Details" : "Shipment Details"}</DialogTitle>
            <DialogDescription>{selectedOrder?.soNumber || selectedOrder?.shipmentNumber}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium">Customer</Label>
                <p className="text-sm">{selectedOrder?.customer?.name}</p>
              </div>
              <div>
                <Label className="text-sm font-medium">Ship Date</Label>
                <p className="text-sm">{selectedOrder?.shipDate && formatDate(selectedOrder.shipDate)}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium">Status</Label>
                <Badge className={getStatusColor(selectedOrder?.status)}>
                  {selectedOrder?.status?.replace("_", " ")}
                </Badge>
              </div>
              {selectedOrder?.priority && (
                <div>
                  <Label className="text-sm font-medium">Priority</Label>
                  <Badge className={getPriorityColor(selectedOrder.priority)}>{selectedOrder.priority}</Badge>
                </div>
              )}
            </div>
            {user.role === "ADMIN" && selectedOrder?.totalValue && (
              <div>
                <Label className="text-sm font-medium">Total Value</Label>
                <p className="text-sm">{formatCurrency(selectedOrder.totalValue)}</p>
              </div>
            )}
            {selectedOrder?.shippingAddress && (
              <div>
                <Label className="text-sm font-medium">Shipping Address</Label>
                <p className="text-sm">{selectedOrder.shippingAddress}</p>
              </div>
            )}
            {selectedOrder?.notes && (
              <div>
                <Label className="text-sm font-medium">Notes</Label>
                <p className="text-sm">{selectedOrder.notes}</p>
              </div>
            )}
            <div>
              <Label className="text-sm font-medium">Items</Label>
              <div className="mt-2 space-y-2">
                {selectedOrder?.items?.map((item) => (
                  <div key={item.id} className="flex justify-between items-center p-2 border rounded">
                    <div>
                      <p className="text-sm font-medium">{item.finishedGood?.name || item.rawMaterial?.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {selectedOrder.soNumber ? (
                          <>
                            Ordered: {item.quantity} | Shipped: {item.shipped || 0}
                          </>
                        ) : (
                          <>Quantity: {item.quantity}</>
                        )}
                      </p>
                    </div>
                    {user.role === "ADMIN" && item.totalPrice && (
                      <div className="text-right">
                        <p className="text-sm">{formatCurrency(item.totalPrice)}</p>
                        <p className="text-xs text-muted-foreground">{formatCurrency(item.unitPrice)} each</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setIsViewDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
