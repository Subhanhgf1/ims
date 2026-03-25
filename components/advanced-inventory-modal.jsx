"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Package, TrendingUp, TrendingDown, History, MapPin, RotateCcw, Truck, Factory, X } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/lib/auth"
import { format } from "date-fns"

export default function AdvancedInventoryModal({ item, isOpen, onClose, onUpdate, itemType }) {
  
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState("overview")
  const [adjustmentData, setAdjustmentData] = useState({
    type: "",
    quantity: "",
    reason: "",
    reference: "",
  })
  const [history, setHistory] = useState({
    adjustments: [],
    receiving: [],
    usage: [],
    movements: [],
  })
  const [stats, setStats] = useState({
    totalReceived: 0,
    totalUsed: 0,
    totalAdjustments: 0,
    averageCost: 0,
    lastReceived: null,
    lastUsed: null,
  })
  const { toast } = useToast()

  useEffect(() => {
    if (item && isOpen) {
      fetchItemHistory()
      fetchItemStats()
    }
  }, [item, isOpen])
  
  const { user } = useAuth()
  const fetchItemHistory = async () => {
    try {
      setLoading(true)
      const [adjustmentsRes, receivingRes, usageRes] = await Promise.all([
        fetch(`/api/inventory/${itemType}/${item.id}/adjustments`),
        fetch(`/api/inventory/${itemType}/${item.id}/receiving-history`),
        fetch(`/api/inventory/${itemType}/${item.id}/usage-history`),
      ])

      const [adjustments, receiving, usage] = await Promise.all([
        adjustmentsRes.json(),
        receivingRes.json(),
        usageRes.json(),
      ])

      console.log("usage", usage)

      setHistory({ adjustments, receiving, usage })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch item history",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchItemStats = async () => {
    try {
      const response = await fetch(`/api/inventory/${itemType}/${item.id}/stats`)
      const statsData = await response.json()
      setStats(statsData)
    } catch (error) {
      console.error("Failed to fetch stats:", error)
    }
  }

  const handleAdjustment = async (e) => {
    e.preventDefault()
    if (!adjustmentData.type || !adjustmentData.quantity || !adjustmentData.reason) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      })
      return
    }

    try {
      setLoading(true)
      const response = await fetch(`/api/inventory/${itemType}/${item.id}/adjust`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...adjustmentData,
          userId: user.id,
          quantity: Number.parseInt(adjustmentData.quantity),
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to adjust inventory")
      }

      const result = await response.json()

      toast({
        title: "Success",
        description: "Inventory adjusted successfully",
      })

      // Reset form
      setAdjustmentData({
        type: "",
        quantity: "",
        reason: "",
        reference: "",
      })

      // Refresh data
      fetchItemHistory()
      fetchItemStats()
      onUpdate()
    } catch (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (quantity, minimumStock) => {
    if (quantity <= 0) {
      return <Badge variant="destructive">Out of Stock</Badge>
    } else if (quantity <= minimumStock) {
      return <Badge variant="secondary">Low Stock</Badge>
    }
    return <Badge variant="default">In Stock</Badge>
  }

  const getAdjustmentIcon = (type) => {
    switch (type) {
      case "INCREASE":
        return <TrendingUp className="h-4 w-4 text-green-500" />
      case "DECREASE":
        return <TrendingDown className="h-4 w-4 text-red-500" />
      case "TRANSFER":
        return <RotateCcw className="h-4 w-4 text-blue-500" />
      case "DAMAGE":
        return <X className="h-4 w-4 text-orange-500" />
      case "PRODUCTION":
        return <Factory className="h-4 w-4 text-purple-500" />
      default:
        return <History className="h-4 w-4" />
    }
  }

  if (!item) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Advanced Inventory Management - {item.name}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-auto">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="adjustments">Adjustments</TabsTrigger>
              <TabsTrigger value="history">History</TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Basic Information */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Package className="h-4 w-4" />
                      Item Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label className="text-sm font-medium">Name</Label>
                      <p className="text-sm">{item.name}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">SKU</Label>
                      <p className="text-sm font-mono">{item.sku}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Description</Label>
                      <p className="text-sm text-muted-foreground">{item.description || "No description"}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Status</Label>
                      <div className="mt-1">{getStatusBadge(item.quantity, item.minimumStock)}</div>
                    </div>
                  </CardContent>
                </Card>

                {/* Stock Information */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4" />
                      Stock Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label className="text-sm font-medium">Current Quantity</Label>
                      <p className="text-2xl font-bold">
                        {item.quantity} {item.unit}
                      </p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Minimum Stock</Label>
                      <p className="text-sm">
                        {item.minimumStock} {item.unit}
                      </p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Unit Cost</Label>
                      <p className="text-sm">${item.cost}</p>
                    </div>
                    {item.price && (
                      <div>
                        <Label className="text-sm font-medium">Unit Price</Label>
                        <p className="text-sm">${item.price}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Location & Supplier */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      Location & Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label className="text-sm font-medium">Location</Label>
                      <p className="text-sm">
                        {item.location?.code} - {item.location?.zone}
                      </p>
                    </div>
                    {item.supplier && (
                      <div>
                        <Label className="text-sm font-medium">Supplier</Label>
                        <p className="text-sm">{item.supplier.name}</p>
                      </div>
                    )}
                    <div>
                      <Label className="text-sm font-medium">Created</Label>
                      <p className="text-sm">{item?.createdAt ? format(new Date(item.createdAt), "PPpp") : "—"}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Last Updated</Label>
                      <p className="text-sm">{item?.updatedAt ? format(new Date(item.updatedAt), "PPpp") : "—"}</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Quick Stats */}
              <Card>
                <CardHeader>
                  <CardTitle>Quick Statistics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-green-600">{stats.totalReceived}</p>
                      <p className="text-sm text-muted-foreground">Total Received</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-red-600">{stats.totalUsed}</p>
                      <p className="text-sm text-muted-foreground">Total Used</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-blue-600">{stats.totalAdjustments}</p>
                      <p className="text-sm text-muted-foreground">Adjustments</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold">${stats.averageCost}</p>
                      <p className="text-sm text-muted-foreground">Avg Cost</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="adjustments" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Make Inventory Adjustment</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleAdjustment} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="type">Adjustment Type *</Label>
                        <Select
                          value={adjustmentData.type}
                          onValueChange={(value) => setAdjustmentData({ ...adjustmentData, type: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="INCREASE">Increase Stock</SelectItem>
                            <SelectItem value="DECREASE">Decrease Stock</SelectItem>
                            <SelectItem value="TRANSFER">Transfer</SelectItem>
                            <SelectItem value="DAMAGE">Damage/Loss</SelectItem>
                            <SelectItem value="PRODUCTION">Production Use</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="quantity">Quantity *</Label>
                        <Input
                          id="quantity"
                          type="number"
                          value={adjustmentData.quantity}
                          onChange={(e) => setAdjustmentData({ ...adjustmentData, quantity: e.target.value })}
                          placeholder="Enter quantity"
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="reason">Reason *</Label>
                      <Textarea
                        id="reason"
                        value={adjustmentData.reason}
                        onChange={(e) => setAdjustmentData({ ...adjustmentData, reason: e.target.value })}
                        placeholder="Explain the reason for this adjustment"
                      />
                    </div>
                    <div>
                      <Label htmlFor="reference">Reference (Optional)</Label>
                      <Input
                        id="reference"
                        value={adjustmentData.reference}
                        onChange={(e) => setAdjustmentData({ ...adjustmentData, reference: e.target.value })}
                        placeholder="Reference number or document"
                      />
                    </div>
                    <Button type="submit" disabled={loading}>
                      {loading ? "Processing..." : "Make Adjustment"}
                    </Button>
                  </form>
                </CardContent>
              </Card>

              {/* Recent Adjustments */}
              <Card>
                <CardHeader>
                  <CardTitle>Recent Adjustments</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Type</TableHead>
                        <TableHead>Quantity</TableHead>
                        <TableHead>Reason</TableHead>
                        <TableHead>User</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {history.adjustments.slice(0, 10).map((adjustment) => (
                        <TableRow key={adjustment.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {getAdjustmentIcon(adjustment.type)}
                              {adjustment.type}
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className={adjustment.type === "INCREASE" ? "text-green-600" : "text-red-600"}>
                              {adjustment.type === "INCREASE" ? "+" : "-"}
                              {adjustment.quantity}
                            </span>
                          </TableCell>
                          <TableCell>{adjustment.reason}</TableCell>
                          <TableCell>{adjustment.user?.name}</TableCell>
                          <TableCell>{format(new Date(adjustment.createdAt), "MMM dd, yyyy HH:mm")}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="history" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Receiving History */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Truck className="h-4 w-4" />
                      Receiving History
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3 max-h-64 overflow-auto">
                      {history.receiving.map((record) => (
                        <div key={record.id} className="border-l-2 border-green-500 pl-3">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-medium">
                                +{record.quantity} {item.unit}
                              </p>
                              <p className="text-sm text-muted-foreground">PO: {record.purchaseOrder?.poNumber}</p>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(record.receivedDate), "MMM dd")}
                            </p>
                          </div>
                          {record.notes && <p className="text-xs text-muted-foreground mt-1">{record.notes}</p>}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Usage History */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Factory className="h-4 w-4" />
                      Usage History
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3 max-h-64 overflow-auto">
                      {history.usage.map((record) => (
                        <div key={record.id} className="border-l-2 border-red-500 pl-3">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-medium">
                                -{record.shipped} {item.unit}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                Received By: {record.salesOrder?.customer?.name}
                              </p>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(record.salesOrder?.shipDate), "MMM dd")}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="analytics" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Stock Movement Trends</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span>Stock Turnover Rate</span>
                        <span className="font-bold">
                          {stats.totalUsed > 0 ? ((stats.totalUsed / item.quantity) * 100).toFixed(1) : 0}%
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>Days Since Last Received</span>
                        <span className="font-bold">
                          {stats.lastReceived
                            ? Math.floor((new Date() - new Date(stats.lastReceived)) / (1000 * 60 * 60 * 24))
                            : "N/A"}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>Days Since Last Used</span>
                        <span className="font-bold">
                          {stats.lastUsed
                            ? Math.floor((new Date() - new Date(stats.lastUsed)) / (1000 * 60 * 60 * 24))
                            : "N/A"}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Value Analysis</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span>Current Stock Value</span>
                        <span className="font-bold">${(item.quantity * item.cost).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>Average Cost</span>
                        <span className="font-bold">${stats.averageCost}</span>
                      </div>
                      {item.price && (
                        <div className="flex justify-between items-center">
                          <span>Potential Revenue</span>
                          <span className="font-bold">${(item.quantity * item.price).toFixed(2)}</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  )
}
