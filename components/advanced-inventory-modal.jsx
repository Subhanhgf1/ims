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
import { Package, TrendingUp, TrendingDown, History, MapPin, RotateCcw, Truck, Factory, X, Calendar, Info, BarChart3 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/lib/auth"
import { format, subDays, isSameDay } from "date-fns"
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

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
          quantity: Math.abs(Number.parseInt(adjustmentData.quantity)),
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to adjust inventory")
      }

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

  // Generate chart data from history
  const chartData = [...history.adjustments]
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
    .map(adj => ({
      date: format(new Date(adj.createdAt), "MMM dd"),
      stock: adj.balanceAfter,
      timestamp: new Date(adj.createdAt).getTime()
    }))

  // Unified timeline
  const timelineEvents = [
    ...history.adjustments.map(a => ({ ...a, eventType: 'ADJUSTMENT', date: new Date(a.createdAt) })),
    ...history.receiving.map(r => ({ ...r, eventType: 'RECEIVING', date: new Date(r.receivedDate || r.createdAt) })),
    ...history.usage.map(u => ({ ...u, eventType: 'USAGE', date: new Date(u.salesOrder?.shipDate || u.createdAt) }))
  ].sort((a, b) => b.date - a.date)

  const getEstimatedStockout = () => {
    if (!stats.totalUsed || stats.totalUsed === 0) return "N/A"
    const dailyUsage = stats.totalUsed / 30
    if (dailyUsage <= 0) return "Stable"
    const daysLeft = Math.floor(item.quantity / dailyUsage)
    return `${daysLeft} days`
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
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="md:col-span-3">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <BarChart3 className="h-4 w-4 text-blue-500" />
                      Stock Level Trend
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[200px] w-full">
                      {chartData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={chartData}>
                            <defs>
                              <linearGradient id="colorStock" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                            <XAxis 
                              dataKey="date" 
                              fontSize={10} 
                              tickLine={false} 
                              axisLine={false} 
                            />
                            <YAxis 
                              fontSize={10} 
                              tickLine={false} 
                              axisLine={false}
                              tickFormatter={(val) => `${val}`}
                            />
                            <Tooltip 
                              contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                            />
                            <Area 
                              type="monotone" 
                              dataKey="stock" 
                              stroke="#3b82f6" 
                              strokeWidth={2}
                              fillOpacity={1} 
                              fill="url(#colorStock)" 
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                          No stock movement history yet
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-blue-50/50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-800">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-blue-800 dark:text-blue-300">Quick Actions</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full justify-start gap-2 bg-white dark:bg-slate-950"
                      onClick={() => setActiveTab("adjustments")}
                    >
                      <TrendingUp className="h-3.5 w-3.5" />
                      Adjust Stock
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full justify-start gap-2 bg-white dark:bg-slate-950"
                      onClick={() => setActiveTab("history")}
                    >
                      <History className="h-3.5 w-3.5" />
                      View Log
                    </Button>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Basic Information */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                      <Package className="h-4 w-4 text-blue-500" />
                      Identification
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <Label className="text-[10px] uppercase text-muted-foreground">Product Name</Label>
                      <p className="text-sm font-semibold">{item.name}</p>
                    </div>
                    <div>
                      <Label className="text-[10px] uppercase text-muted-foreground">SKU Code</Label>
                      <p className="text-sm font-mono bg-muted/50 px-2 py-1 rounded inline-block">{item.sku}</p>
                    </div>
                    <div>
                      <Label className="text-[10px] uppercase text-muted-foreground">Status</Label>
                      <div className="mt-1">{getStatusBadge(item.quantity, item.minimumStock)}</div>
                    </div>
                  </CardContent>
                </Card>

                {/* Stock Information */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-green-500" />
                      Inventory Levels
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between items-end">
                      <div>
                        <Label className="text-[10px] uppercase text-muted-foreground">On Hand</Label>
                        <p className="text-2xl font-black text-blue-600">
                          {item.quantity} <span className="text-xs text-muted-foreground font-normal">{item.unit}</span>
                        </p>
                      </div>
                      <div className="text-right">
                        <Label className="text-[10px] uppercase text-muted-foreground">Safety Stock</Label>
                        <p className="text-sm font-bold text-orange-600">
                          {item.minimumStock} {item.unit}
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 pt-2 border-t">
                      <div>
                        <Label className="text-[10px] uppercase text-muted-foreground">Unit Cost</Label>
                        <p className="text-sm font-semibold text-emerald-600">${item.cost}</p>
                      </div>
                      {item.price && (
                        <div>
                          <Label className="text-[10px] uppercase text-muted-foreground">MSRP</Label>
                          <p className="text-sm font-semibold text-blue-600">${item.price}</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Logistics */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-red-500" />
                      Warehouse Logistics
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <Label className="text-[10px] uppercase text-muted-foreground">Storage Location</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="secondary" className="font-mono">
                          {item.location?.code || "UNASSIGNED"}
                        </Badge>
                        <span className="text-xs text-muted-foreground">{item.location?.zone}</span>
                      </div>
                    </div>
                    {item.supplier && (
                      <div>
                        <Label className="text-[10px] uppercase text-muted-foreground">Primary Supplier</Label>
                        <p className="text-sm font-medium">{item.supplier.name}</p>
                      </div>
                    )}
                    <div className="pt-2 border-t flex justify-between">
                      <div>
                        <Label className="text-[10px] uppercase text-muted-foreground">Last Received</Label>
                        <p className="text-[11px]">{stats.lastReceived ? format(new Date(stats.lastReceived), "MMM dd, yyyy") : "Never"}</p>
                      </div>
                      <div className="text-right">
                        <Label className="text-[10px] uppercase text-muted-foreground">Last Order</Label>
                        <p className="text-[11px]">{stats.lastUsed ? format(new Date(stats.lastUsed), "MMM dd, yyyy") : "Never"}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Quick Stats */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">30-Day Operational Velocity</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-3 rounded-lg bg-green-50 dark:bg-green-900/10 border border-green-100 dark:border-green-800">
                      <p className="text-xl font-black text-green-600">{stats.totalReceived || 0}</p>
                      <p className="text-[10px] uppercase text-muted-foreground font-bold">Inbound Volume</p>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-800">
                      <p className="text-xl font-black text-red-600">{stats.totalUsed || 0}</p>
                      <p className="text-[10px] uppercase text-muted-foreground font-bold">Outbound Volume</p>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800">
                      <p className="text-xl font-black text-blue-600">{getEstimatedStockout()}</p>
                      <p className="text-[10px] uppercase text-muted-foreground font-bold">Est. Runway</p>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-purple-50 dark:bg-purple-900/10 border border-purple-100 dark:border-purple-800">
                      <p className="text-xl font-black text-purple-600">${stats.averageCost || item.cost}</p>
                      <p className="text-[10px] uppercase text-muted-foreground font-bold">Weighted Cost</p>
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
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <History className="h-5 w-5 text-blue-500" />
                    Unified Transaction Timeline
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="max-h-[500px] overflow-auto">
                    <Table>
                      <TableHeader className="bg-muted/50 sticky top-0 z-10">
                        <TableRow>
                          <TableHead>Event Type</TableHead>
                          <TableHead>Activity Details</TableHead>
                          <TableHead className="text-right">Quantity Change</TableHead>
                          <TableHead className="text-right">Balance After</TableHead>
                          <TableHead className="text-right">Timestamp</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {timelineEvents.map((event, idx) => (
                          <TableRow key={idx} className="hover:bg-muted/30">
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {event.eventType === 'ADJUSTMENT' && getAdjustmentIcon(event.type)}
                                {event.eventType === 'RECEIVING' && <Truck className="h-4 w-4 text-green-500" />}
                                {event.eventType === 'USAGE' && <TrendingDown className="h-4 w-4 text-red-500" />}
                                <span className="text-xs font-bold uppercase">{event.eventType}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col">
                                <span className="text-sm font-medium">
                                  {event.reason || event.purchaseOrder?.poNumber || event.salesOrder?.customer?.name || "Inventory Update"}
                                </span>
                                {event.reference && <span className="text-[10px] text-muted-foreground">Ref: {event.reference}</span>}
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <span className={`font-bold ${event.quantity > 0 || event.eventType === 'RECEIVING' ? "text-green-600" : "text-red-600"}`}>
                                {(event.quantity > 0 || event.eventType === 'RECEIVING') ? "+" : ""}
                                {event.quantity || (event.eventType === 'USAGE' ? -event.shipped : event.shipped)}
                              </span>
                            </TableCell>
                            <TableCell className="text-right font-mono font-bold">
                              {event.balanceAfter || "—"}
                            </TableCell>
                            <TableCell className="text-right text-xs text-muted-foreground whitespace-nowrap">
                              {format(event.date, "MMM dd, HH:mm")}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
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
