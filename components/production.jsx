"use client"

import { useState, useEffect } from "react"
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
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { Plus, Play, CheckCircle, Clock, Factory, Loader2 } from "lucide-react"
import { getStatusColor } from "@/lib/utils"

export default function Production() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [productionOrders, setProductionOrders] = useState([])
  const [finishedGoods, setFinishedGoods] = useState([])
  const [rawMaterials, setRawMaterials] = useState([])
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isCompleteDialogOpen, setIsCompleteDialogOpen] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  // Form states
  const [formData, setFormData] = useState({
    finishedGoodId: "",
    targetQuantity: "",
    notes: "",
    rawMaterials: [],
  })
  const [producedQuantity, setProducedQuantity] = useState("")

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [ordersRes, goodsRes, materialsRes] = await Promise.all([
        fetch("/api/production/orders"),
        fetch("/api/inventory/finished-goods"),
        fetch("/api/inventory/raw-materials"),
      ])

      if (ordersRes.ok) {
        const orders = await ordersRes.json()
        setProductionOrders(orders)
      }

      if (goodsRes.ok) {
        const goods = await goodsRes.json()
        setFinishedGoods(goods)
      }

      if (materialsRes.ok) {
        const materials = await materialsRes.json()
        setRawMaterials(materials)
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

  const handleCreateOrder = async (e) => {
    e.preventDefault()
    if (!formData.finishedGoodId || !formData.targetQuantity || !formData.rawMaterials.length) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      })
      return
    }

    try {
      setSubmitting(true)
      const response = await fetch("/api/production/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: "Production order created successfully",
        })
        setIsCreateDialogOpen(false)
        setFormData({ finishedGoodId: "", targetQuantity: "", notes: "", rawMaterials: [] })
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

  const handleStartProduction = async (orderId) => {
    try {
      const response = await fetch(`/api/production/orders/${orderId}/start`, {
        method: "POST",
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: "Production started successfully",
        })
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
    }
  }

  const handleCompleteProduction = async (e) => {
    e.preventDefault()
    if (!producedQuantity || !selectedOrder) return

    try {
      setSubmitting(true)
      const response = await fetch(`/api/production/orders/${selectedOrder.id}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          producedQuantity: Number.parseInt(producedQuantity),
          userId: user.id,
        }),
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: "Production completed successfully",
        })
        setIsCompleteDialogOpen(false)
        setSelectedOrder(null)
        setProducedQuantity("")
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

  const addRawMaterial = () => {
    setFormData((prev) => ({
      ...prev,
      rawMaterials: [...prev.rawMaterials, { rawMaterialId: "", requiredQuantity: "" }],
    }))
  }

  const updateRawMaterial = (index, field, value) => {
    setFormData((prev) => ({
      ...prev,
      rawMaterials: prev.rawMaterials.map((item, i) => (i === index ? { ...item, [field]: value } : item)),
    }))
  }

  const removeRawMaterial = (index) => {
    setFormData((prev) => ({
      ...prev,
      rawMaterials: prev.rawMaterials.filter((_, i) => i !== index),
    }))
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case "PENDING":
        return <Clock className="h-4 w-4" />
      case "IN_PROGRESS":
        return <Factory className="h-4 w-4" />
      case "COMPLETED":
        return <CheckCircle className="h-4 w-4" />
      default:
        return <Clock className="h-4 w-4" />
    }
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
          <h2 className="text-2xl font-bold">Production Management</h2>
          <p className="text-muted-foreground">Convert raw materials into finished goods</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Production Order
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Create Production Order</DialogTitle>
              <DialogDescription>
                Create a new production order to convert raw materials into finished goods
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateOrder}>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="finished-good">Finished Good</Label>
                    <Select
                      value={formData.finishedGoodId}
                      onValueChange={(value) => setFormData((prev) => ({ ...prev, finishedGoodId: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select finished good" />
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
                  <div className="space-y-2">
                    <Label htmlFor="target-quantity">Target Quantity</Label>
                    <Input
                      id="target-quantity"
                      type="number"
                      value={formData.targetQuantity}
                      onChange={(e) => setFormData((prev) => ({ ...prev, targetQuantity: e.target.value }))}
                      placeholder="Enter quantity"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Raw Materials Required</Label>
                  <div className="space-y-2">
                    {formData.rawMaterials.map((item, index) => (
                      <div key={index} className="grid grid-cols-3 gap-2 items-end">
                        <Select
                          value={item.rawMaterialId}
                          onValueChange={(value) => updateRawMaterial(index, "rawMaterialId", value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select material" />
                          </SelectTrigger>
                          <SelectContent>
                            {rawMaterials.map((material) => (
                              <SelectItem key={material.id} value={material.id}>
                                {material.name} ({material.quantity} available)
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Input
                          type="number"
                          placeholder="Quantity needed"
                          value={item.requiredQuantity}
                          onChange={(e) => updateRawMaterial(index, "requiredQuantity", e.target.value)}
                        />
                        <Button type="button" variant="outline" onClick={() => removeRawMaterial(index)}>
                          Remove
                        </Button>
                      </div>
                    ))}
                    <Button type="button" variant="outline" onClick={addRawMaterial}>
                      Add Raw Material
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
                    placeholder="Additional notes or instructions"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
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
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Orders</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {productionOrders.filter((order) => order.status === "PENDING").length}
            </div>
            <p className="text-xs text-muted-foreground">Awaiting start</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <Factory className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {productionOrders.filter((order) => order.status === "IN_PROGRESS").length}
            </div>
            <p className="text-xs text-muted-foreground">Currently producing</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed Today</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {
                productionOrders.filter(
                  (order) =>
                    order.status === "COMPLETED" &&
                    new Date(order.endDate).toDateString() === new Date().toDateString(),
                ).length
              }
            </div>
            <p className="text-xs text-muted-foreground">Finished today</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Produced</CardTitle>
            <div className="h-4 w-4 text-muted-foreground">#</div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {productionOrders.reduce((sum, order) => sum + order.producedQuantity, 0)}
            </div>
            <p className="text-xs text-muted-foreground">Units this month</p>
          </CardContent>
        </Card>
      </div>

      {/* Production Orders Table */}
      <Card>
        <CardHeader>
          <CardTitle>Production Orders</CardTitle>
          <CardDescription>Track and manage all production orders</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Production #</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Target Qty</TableHead>
                <TableHead>Produced Qty</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Start Date</TableHead>
                <TableHead>End Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {productionOrders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="font-medium">{order.productionNumber}</TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{order.finishedGood.name}</div>
                      <div className="text-sm text-muted-foreground">{order.finishedGood.sku}</div>
                    </div>
                  </TableCell>
                  <TableCell>{order.targetQuantity}</TableCell>
                  <TableCell>{order.producedQuantity}</TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(order.status)}>
                      <div className="flex items-center gap-1">
                        {getStatusIcon(order.status)}
                        {order.status.replace("_", " ")}
                      </div>
                    </Badge>
                  </TableCell>
                  <TableCell>{order.startDate ? new Date(order.startDate).toLocaleDateString() : "-"}</TableCell>
                  <TableCell>{order.endDate ? new Date(order.endDate).toLocaleDateString() : "-"}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      {order.status === "PENDING" && (
                        <Button variant="outline" size="sm" onClick={() => handleStartProduction(order.id)}>
                          <Play className="h-4 w-4 mr-1" />
                          Start
                        </Button>
                      )}
                      {order.status === "IN_PROGRESS" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedOrder(order)
                            setIsCompleteDialogOpen(true)
                          }}
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Complete
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

      {/* Complete Production Dialog */}
      <Dialog open={isCompleteDialogOpen} onOpenChange={setIsCompleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Complete Production Order</DialogTitle>
            <DialogDescription>
              Enter the actual quantity produced for {selectedOrder?.finishedGood.name}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCompleteProduction}>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="produced-quantity">Produced Quantity</Label>
                <Input
                  id="produced-quantity"
                  type="number"
                  value={producedQuantity}
                  onChange={(e) => setProducedQuantity(e.target.value)}
                  placeholder={`Max: ${selectedOrder?.targetQuantity}`}
                  max={selectedOrder?.targetQuantity}
                  required
                />
                <p className="text-sm text-muted-foreground">Target: {selectedOrder?.targetQuantity} units</p>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsCompleteDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Completing...
                  </>
                ) : (
                  "Complete Production"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
