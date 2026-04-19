"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  AreaChart, Area, PieChart, Pie, Cell
} from "recharts"
import { 
  Clock, CheckCircle, Truck, RefreshCcw, Loader2, Download, 
  TrendingUp, Activity, UserCheck, AlertTriangle, Search, Package2
} from "lucide-react"
import { toast } from "@/components/ui/use-toast"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Input } from "@/components/ui/input"

export default function Reports() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState("last-30-days")
  const [searchTerm, setSearchTerm] = useState("")

  const fetchData = async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/reports/stats?period=${period}`)
      if (!res.ok) throw new Error("Failed to fetch statistics")
      const result = await res.json()
      setData(result)
    } catch (err) {
      console.error(err)
      toast({ title: "Error", description: "Failed to load operational metrics", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [period])

  const handleExport = () => {
    if (!data) return
    const csvContent = [
      ["Metric", "Value"],
      ["Avg Return Processing (Hrs)", data.metrics.avgReturnTime],
      ["Avg Inbound Processing (Hrs)", data.metrics.avgInboundTime],
      ["Supplier On-Time Rate (%)", data.metrics.inboundOnTimeRate],
      ["Total Operations Handled", data.metrics.teamThroughput],
      [],
      ["Date", "Inbound", "Outbound", "Returns"],
      ...data.throughputTrends.map(t => [t.date, t.inbound, t.outbound, t.returns]),
      [],
      ["Failed Delivery Reasons"],
      ["Reason", "Count"],
      ...(data.failedDeliveryStats?.reasons || []).map(r => [r.name, r.value]),
      [],
      ["Item Conditions"],
      ["Condition", "Count"],
      ...(data.failedDeliveryStats?.conditions || []).map(c => [c.name, c.value]),
      [],
      ["Item Movement Details"],
      ["SKU", "Name", "Type", "Inbounded", "Outbounded", "Returned", "Total Movement"],
      ...(data.itemUsage || []).map(i => [i.sku, i.name, i.type, i.inbounded, i.outbounded, i.returned, i.totalMovement])
    ].map(row => row.join(",")).join("\n")

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    link.href = URL.createObjectURL(blob)
    link.setAttribute("download", `operational-report-${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  if (loading && !data) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground animate-pulse">Calculating efficiency metrics...</p>
      </div>
    )
  }

  const { metrics, throughputTrends, supplierPerformance, distribution } = data || {}
  const COLORS = ['#3b82f6', '#10b981', '#f59e0b']

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">Team Efficiency & Logistics</h2>
          <p className="text-muted-foreground">Insights into processing speed and supply chain reliability</p>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-full md:w-48">
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="last-7-days">Last 7 days</SelectItem>
              <SelectItem value="last-30-days">Last 30 days</SelectItem>
              <SelectItem value="last-90-days">Last 90 days</SelectItem>
              <SelectItem value="last-year">Last year</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button variant="ghost" size="icon" onClick={fetchData} disabled={loading}>
            <RefreshCcw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Return Speed</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.avgReturnTime.toFixed(1)} hrs</div>
            <p className="text-xs text-muted-foreground mt-1">
              From arrival to completed restock
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Supplier On-Time Rate</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.inboundOnTimeRate}%</div>
            <p className="text-xs text-green-600 flex items-center mt-1">
              Compared to expected dates
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Operations</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.teamThroughput}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Combined team activity
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inbound Processing</CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.avgInboundTime.toFixed(1)} hrs</div>
            <p className="text-xs text-muted-foreground mt-1">
              Time to scan and locate stock
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
        {/* Throughput Trends */}
        <Card>
          <CardHeader>
            <CardTitle>Team Throughput</CardTitle>
            <CardDescription>Daily volume of processed operations</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={throughputTrends}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} fontSize={12} />
                  <YAxis axisLine={false} tickLine={false} fontSize={12} />
                  <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                  <Legend verticalAlign="top" height={36}/>
                  <Area type="monotone" dataKey="inbound" stackId="1" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.6} name="Inbound" />
                  <Area type="monotone" dataKey="outbound" stackId="1" stroke="#10b981" fill="#10b981" fillOpacity={0.6} name="Outbound" />
                  <Area type="monotone" dataKey="returns" stackId="1" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.6} name="Returns" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Operational Mix */}
        <Card>
          <CardHeader>
            <CardTitle>Work Distribution</CardTitle>
            <CardDescription>Division of labor across logistics tracks</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center">
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={distribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {distribution?.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="w-full mt-4 space-y-2">
              <p className="text-sm font-medium text-center text-muted-foreground italic">
                Team is spending {Math.round((distribution?.[2]?.value / metrics?.teamThroughput) * 100 || 0)}% of time on Returns
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Supplier Reliability */}
        <Card>
          <CardHeader>
            <CardTitle>Top Supplier Reliability</CardTitle>
            <CardDescription>Suppliers ranked by on-time delivery rate</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {supplierPerformance?.length > 0 ? (
                supplierPerformance.map((supplier, idx) => (
                  <div key={idx} className="space-y-2">
                    <div className="flex justify-between items-center text-sm">
                      <span className="font-medium">{supplier.name}</span>
                      <span className="text-muted-foreground">{Math.round(supplier.onTimeRate)}% On-Time</span>
                    </div>
                    <Progress value={supplier.onTimeRate} className="h-2 bg-muted">
                      <div 
                        className="h-full bg-blue-500 rounded-full transition-all" 
                        style={{ width: `${supplier.onTimeRate}%` }} 
                      />
                    </Progress>
                    <p className="text-[10px] text-muted-foreground uppercase text-right">
                      {supplier.totalOrders} Shipments analyzed
                    </p>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <AlertTriangle className="h-8 w-8 mb-2 opacity-20" />
                  <p>No supplier data found for this period</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Detailed Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Performance Insights</CardTitle>
            <CardDescription>Automated observations for this period</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 rounded-lg bg-blue-50 border border-blue-100 dark:bg-blue-900/10 dark:border-blue-800">
              <h4 className="text-sm font-semibold flex items-center gap-2 text-blue-800 dark:text-blue-300">
                <TrendingUp className="h-4 w-4" />
                Inbound Efficiency
              </h4>
              <p className="text-sm text-blue-700/80 dark:text-blue-400/80 mt-1">
                Your team takes an average of {metrics?.avgInboundTime.toFixed(1)} hours to move items from the loading dock to their assigned shelves.
              </p>
            </div>
            <div className="p-4 rounded-lg bg-green-50 border border-green-100 dark:bg-green-900/10 dark:border-green-800">
              <h4 className="text-sm font-semibold flex items-center gap-2 text-green-800 dark:text-green-300">
                <CheckCircle className="h-4 w-4" />
                Supplier Health
              </h4>
              <p className="text-sm text-green-700/80 dark:text-green-400/80 mt-1">
                {metrics?.inboundOnTimeRate}% of your inbound shipments arrived on time. {supplierPerformance?.[0]?.name || 'N/A'} is your most reliable supplier.
              </p>
            </div>
            <div className="p-4 rounded-lg bg-orange-50 border border-orange-100 dark:bg-orange-900/10 dark:border-orange-800">
              <h4 className="text-sm font-semibold flex items-center gap-2 text-orange-800 dark:text-orange-300">
                <RefreshCcw className="h-4 w-4" />
                Return Handling
              </h4>
              <p className="text-sm text-orange-700/80 dark:text-orange-400/80 mt-1">
                Return processing speed is currently at {metrics?.avgReturnTime.toFixed(1)} hours per parcel. This accounts for {Math.round((distribution?.[2]?.value / metrics?.teamThroughput) * 100 || 0)}% of logistics workload.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Failed Deliveries Analysis */}
      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center gap-2">
              <RefreshCcw className="h-5 w-5 text-orange-500" />
              <CardTitle>Failed Delivery Reasons</CardTitle>
            </div>
            <CardDescription>Primary reasons for delivery failure in this period</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4 items-center">
              <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data?.failedDeliveryStats?.reasons}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {data?.failedDeliveryStats?.reasons?.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={['#3b82f6', '#ef4444', '#f59e0b', '#8b5cf6', '#10b981'][index % 5]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-3">
                {data?.failedDeliveryStats?.reasons?.map((r, idx) => (
                  <div key={idx} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: ['#3b82f6', '#ef4444', '#f59e0b', '#8b5cf6', '#10b981'][idx % 5] }} />
                      <span className="text-muted-foreground">{r.name}</span>
                    </div>
                    <span className="font-bold">{r.value}</span>
                  </div>
                ))}
                {(!data?.failedDeliveryStats?.reasons || data.failedDeliveryStats.reasons.length === 0) && (
                  <p className="text-xs text-center text-muted-foreground opacity-50 py-8">No return reason data available</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              <CardTitle>Item Conditions</CardTitle>
            </div>
            <CardDescription>Condition of items upon return</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[200px] w-full mb-4">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data?.failedDeliveryStats?.conditions}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={60}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {data?.failedDeliveryStats?.conditions?.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={['#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#6b7280'][index % 5]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              {data?.failedDeliveryStats?.conditions?.map((c, idx) => (
                <div key={idx} className="flex items-center gap-1.5 p-1.5 rounded border bg-gray-50/50">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: ['#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#6b7280'][idx % 5] }} />
                  <span className="truncate">{c.name}</span>
                  <span className="ml-auto font-bold">{c.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Package2 className="h-5 w-5 text-blue-500" />
              <CardTitle>Top 5 Most Returned Items</CardTitle>
            </div>
            <CardDescription>Products with the highest return frequency</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data?.failedDeliveryStats?.topItems} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                  <XAxis type="number" hide />
                  <YAxis 
                    dataKey="name" 
                    type="category" 
                    width={150} 
                    fontSize={11} 
                    axisLine={false} 
                    tickLine={false} 
                  />
                  <Tooltip 
                    cursor={{ fill: '#f3f4f6' }}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} 
                  />
                  <Bar dataKey="quantity" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Item Movement & Usage */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Item Movement & Usage</CardTitle>
            <CardDescription>Detailed quantity tracking for each item in the selected period</CardDescription>
          </div>
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search by SKU or Name..."
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Inbounded</TableHead>
                  <TableHead className="text-right">Outbounded</TableHead>
                  <TableHead className="text-right">Returned</TableHead>
                  <TableHead className="text-right font-bold">Total Movement</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.itemUsage?.filter(item => 
                  item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                  item.sku.toLowerCase().includes(searchTerm.toLowerCase())
                ).length > 0 ? (
                  data.itemUsage
                    .filter(item => 
                      item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                      item.sku.toLowerCase().includes(searchTerm.toLowerCase())
                    )
                    .map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium">{item.name}</span>
                            <span className="text-xs text-muted-foreground">{item.sku}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[10px] uppercase">
                            {item.type}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">{item.inbounded}</TableCell>
                        <TableCell className="text-right">{item.outbounded}</TableCell>
                        <TableCell className="text-right">{item.returned}</TableCell>
                        <TableCell className="text-right font-bold">{item.totalMovement}</TableCell>
                      </TableRow>
                    ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                      No items found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
