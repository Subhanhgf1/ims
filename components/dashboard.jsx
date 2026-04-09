"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/lib/auth"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import {
  Package,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  DollarSign,
  Activity,
  Loader2,
  RefreshCw,
  RotateCcw,
} from "lucide-react"
import { formatCurrency, formatDate } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"

export default function Dashboard() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/dashboard/stats")

      if (response.ok) {
        const data = await response.json()
        setStats(data)
      } else {
        throw new Error("Failed to fetch dashboard stats")
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load dashboard data",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleViewStock = () => {
    // Redirect to low stock items 
    console.log("Redirecting to low stock items page...")
    window.location.href = "/inventory?lowStock=true&outStock=true"

  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchStats()
    setRefreshing(false)
    toast({
      title: "Success",
      description: "Dashboard data refreshed",
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading dashboard...</span>
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <p className="text-muted-foreground">Failed to load dashboard data</p>
          <Button onClick={fetchStats} className="mt-2">
            Try Again
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Dashboard</h2>
          <p className="text-muted-foreground">Welcome back, {user?.name}</p>
        </div>
        <Button
          variant="outline"
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-2 bg-transparent"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

  {/* Alerts */}
      {stats.inventory.lowStockItems > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-800">
              <AlertTriangle className="h-5 w-5" />
              Inventory Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-orange-700">
              You have {stats.inventory.lowStockItems} items running low on stock. Consider creating purchase orders to
              restock these items.
            </p>
     
          </CardContent>
        </Card>
      )}

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Inventory Items</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.inventory.totalRawMaterials + stats.inventory.totalFinishedGoods}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.inventory.totalRawMaterials} raw materials, {stats.inventory.totalFinishedGoods} finished goods
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock Alerts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.inventory.lowStockItems}</div>
            {/* <p className="text-xs text-muted-foreground">Items need restocking</p> */}
            {/* redirect to a page where low stock items are can be seen /inventory?lowStock=true */}
             <Button onClick={handleViewStock} variant="outline" className="mt-2 bg-transparent" size="sm">
              View These Items
            </Button>
          </CardContent>

        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Orders</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.operations.pendingPurchaseOrders + stats.operations.pendingProductionOrders}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.operations.pendingPurchaseOrders} purchase, {stats.operations.pendingProductionOrders} production
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inventory Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {user?.role === "ADMIN" ? formatCurrency(stats.inventory.totalValue) : "***"}
            </div>
            <p className="text-xs text-muted-foreground">Total inventory worth</p>
          </CardContent>
        </Card>
      </div>

      {/* Today's Activity */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Today's Activity
            </CardTitle>
            <CardDescription>Operations completed today</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm">Orders Received</span>
              </div>
              <Badge variant="secondary">{stats.operations.todayReceived}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-blue-600" />
                <span className="text-sm">Orders Shipped</span>
              </div>
              <Badge variant="secondary">{stats.operations.todayShipped}</Badge>
            </div>
            <div className="pt-2">
              <div className="text-sm text-muted-foreground mb-2">Daily Progress</div>
              <Progress
                value={Math.min(((stats.operations.todayReceived + stats.operations.todayShipped) / 20) * 100, 100)}
                className="h-2"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Activities</CardTitle>
            <CardDescription>Latest inventory operations</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.recentActivities.length > 0 ? (
                stats.recentActivities.map((activity) => (
                  <div key={activity.id} className="flex items-start gap-4 p-3 rounded-lg border bg-white/50">
                    <div className={`mt-1 p-2 rounded-full ${
                      activity.type === "INBOUND" ? "bg-green-100 text-green-600" :
                      activity.type === "OUTBOUND" ? "bg-blue-100 text-blue-600" :
                      "bg-orange-100 text-orange-600"
                    }`}>
                      {activity.type === "INBOUND" ? <CheckCircle className="h-4 w-4" /> :
                       activity.type === "OUTBOUND" ? <TrendingUp className="h-4 w-4" /> :
                       <RotateCcw className="h-4 w-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold truncate capitalize">
                          {activity.type.replace("_", " ").toLowerCase()}
                        </p>
                        <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                          {formatDate(activity.timestamp)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 leading-tight my-1">
                        {activity.description}
                      </p>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px] font-mono px-1.5 h-5">
                          #{activity.orderNumber}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground italic">
                          by {activity.user}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-6">No recent activities</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

 

    


           {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common inventory operations</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <Button onClick={() => { 
              console.log("Redirecting to create inbound order page...")
              window.location.href = "/inbound"
            
            }} variant="outline" className="h-20 flex-col gap-2 bg-transparent">
              <Package className="h-6 w-6" />
              <span>Create Inbound Order</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
