"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { BarChart3, Download, TrendingUp, TrendingDown, Package, DollarSign } from "lucide-react"

export default function Reports() {
  const inventoryTurnover = [
    { product: "Product Alpha", turnover: 8.5, status: "excellent" },
    { product: "Product Beta", turnover: 6.2, status: "good" },
    { product: "Product Gamma", turnover: 3.1, status: "average" },
    { product: "Raw Material A", turnover: 12.3, status: "excellent" },
    { product: "Raw Material B", turnover: 2.8, status: "poor" },
  ]

  const monthlyMetrics = [
    { month: "Jan", inbound: 125000, outbound: 98000, profit: 27000 },
    { month: "Feb", inbound: 142000, outbound: 115000, profit: 27000 },
    { month: "Mar", inbound: 138000, outbound: 122000, profit: 16000 },
    { month: "Apr", inbound: 156000, outbound: 134000, profit: 22000 },
    { month: "May", inbound: 148000, outbound: 128000, profit: 20000 },
    { month: "Jun", inbound: 162000, outbound: 145000, profit: 17000 },
  ]

  const getStatusColor = (status) => {
    switch (status) {
      case "excellent":
        return "bg-green-100 text-green-800"
      case "good":
        return "bg-blue-100 text-blue-800"
      case "average":
        return "bg-yellow-100 text-yellow-800"
      case "poor":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Reports & Analytics</h2>
          <p className="text-muted-foreground">Comprehensive inventory performance insights</p>
        </div>
        <div className="flex gap-2">
          <Select defaultValue="last-30-days">
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="last-7-days">Last 7 days</SelectItem>
              <SelectItem value="last-30-days">Last 30 days</SelectItem>
              <SelectItem value="last-90-days">Last 90 days</SelectItem>
              <SelectItem value="last-year">Last year</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$847,392</div>
            <p className="text-xs text-green-600 flex items-center">
              <TrendingUp className="h-3 w-3 mr-1" />
              +12.5% from last month
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Orders Processed</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2,847</div>
            <p className="text-xs text-green-600 flex items-center">
              <TrendingUp className="h-3 w-3 mr-1" />
              +8.2% from last month
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Processing Time</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2.4h</div>
            <p className="text-xs text-red-600 flex items-center">
              <TrendingDown className="h-3 w-3 mr-1" />
              +0.3h from last month
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Accuracy Rate</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">99.2%</div>
            <p className="text-xs text-green-600 flex items-center">
              <TrendingUp className="h-3 w-3 mr-1" />
              +0.5% from last month
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Inventory Turnover */}
        <Card>
          <CardHeader>
            <CardTitle>Inventory Turnover Analysis</CardTitle>
            <CardDescription>Product performance and turnover rates</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {inventoryTurnover.map((item, index) => (
              <div key={index} className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">{item.product}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">{item.turnover}x</span>
                    <Badge className={getStatusColor(item.status)}>{item.status}</Badge>
                  </div>
                </div>
                <Progress value={Math.min(item.turnover * 8, 100)} className="h-2" />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Monthly Performance */}
        <Card>
          <CardHeader>
            <CardTitle>Monthly Performance</CardTitle>
            <CardDescription>Inbound vs Outbound value trends</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {monthlyMetrics.map((metric, index) => (
                <div key={index} className="grid grid-cols-4 gap-4 items-center">
                  <div className="font-medium">{metric.month}</div>
                  <div className="text-sm">
                    <div className="text-blue-600">${(metric.inbound / 1000).toFixed(0)}k</div>
                    <div className="text-xs text-muted-foreground">Inbound</div>
                  </div>
                  <div className="text-sm">
                    <div className="text-green-600">${(metric.outbound / 1000).toFixed(0)}k</div>
                    <div className="text-xs text-muted-foreground">Outbound</div>
                  </div>
                  <div className="text-sm">
                    <div className="text-purple-600">${(metric.profit / 1000).toFixed(0)}k</div>
                    <div className="text-xs text-muted-foreground">Profit</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Reports */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Stock Movement Report</CardTitle>
            <CardDescription>Detailed inventory movements</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm">Items Received</span>
                <span className="text-sm font-medium">1,247</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Items Shipped</span>
                <span className="text-sm font-medium">1,156</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Items Adjusted</span>
                <span className="text-sm font-medium">23</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Net Change</span>
                <span className="text-sm font-medium text-green-600">+91</span>
              </div>
            </div>
            <Button variant="outline" className="w-full mt-4 bg-transparent">
              View Full Report
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quality Control Report</CardTitle>
            <CardDescription>Quality metrics and issues</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm">Items Inspected</span>
                <span className="text-sm font-medium">2,847</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Passed QC</span>
                <span className="text-sm font-medium text-green-600">2,823</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Failed QC</span>
                <span className="text-sm font-medium text-red-600">24</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Pass Rate</span>
                <span className="text-sm font-medium">99.2%</span>
              </div>
            </div>
            <Button variant="outline" className="w-full mt-4 bg-transparent">
              View Full Report
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Supplier Performance</CardTitle>
            <CardDescription>Supplier delivery and quality metrics</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm">On-Time Delivery</span>
                <span className="text-sm font-medium">94.5%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Quality Score</span>
                <span className="text-sm font-medium">97.8%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Active Suppliers</span>
                <span className="text-sm font-medium">12</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Top Performer</span>
                <span className="text-sm font-medium">Steel Corp</span>
              </div>
            </div>
            <Button variant="outline" className="w-full mt-4 bg-transparent">
              View Full Report
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
