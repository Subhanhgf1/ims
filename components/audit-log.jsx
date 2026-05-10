"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Loader2, Search, ArrowRight, ArrowLeft } from "lucide-react"
import { format } from "date-fns"
import { toast } from "@/components/ui/use-toast"

export default function AuditLog() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [search, setSearch] = useState("")
  const [typeFilter, setTypeFilter] = useState("ALL")

  const fetchLogs = async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/reports/audit?page=${page}&limit=15&search=${encodeURIComponent(search)}&type=${typeFilter}`)
      if (!res.ok) throw new Error("Failed to fetch audit logs")
      const result = await res.json()
      setLogs(result.data)
      setTotalPages(result.pagination.totalPages)
    } catch (err) {
      console.error(err)
      toast({ title: "Error", description: "Failed to load audit trail", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLogs()
  }, [page, typeFilter])

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (page !== 1) setPage(1)
      else fetchLogs()
    }, 500)
    return () => clearTimeout(timer)
  }, [search])

  const getBadgeColor = (type, qty) => {
    if (type === "INCREASE" || qty > 0) return "bg-green-100 text-green-800"
    if (type === "DECREASE" || qty < 0) return "bg-blue-100 text-blue-800"
    if (type === "DAMAGE") return "bg-red-100 text-red-800"
    if (type === "PRODUCTION") return "bg-purple-100 text-purple-800"
    return "bg-gray-100 text-gray-800"
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">Inventory Audit Trail</h2>
          <p className="text-muted-foreground">100% accurate history of all stock movements for debugging.</p>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <div>
            <CardTitle>Activity Log</CardTitle>
            <CardDescription>View every quantity change made by the system or operators.</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search reason or item..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Types</SelectItem>
                <SelectItem value="INCREASE">Increase</SelectItem>
                <SelectItem value="DECREASE">Decrease</SelectItem>
                <SelectItem value="TRANSFER">Transfer</SelectItem>
                <SelectItem value="PRODUCTION">Production</SelectItem>
                <SelectItem value="DAMAGE">Damage</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date & Time</TableHead>
                  <TableHead>Item</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Change</TableHead>
                  <TableHead>Reason & Reference</TableHead>
                  <TableHead>User</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-32 text-center">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                ) : logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                      No audit logs found.
                    </TableCell>
                  </TableRow>
                ) : (
                  logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="whitespace-nowrap text-xs">
                        {format(new Date(log.createdAt), "MMM d, yyyy HH:mm:ss")}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium text-sm">{log.item?.name || "Unknown"}</span>
                          <span className="text-xs text-muted-foreground">{log.item?.sku || ""}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={getBadgeColor(log.type, log.quantity)}>
                          {log.type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className={`font-bold ${log.quantity > 0 ? "text-green-600" : log.quantity < 0 ? "text-red-600" : ""}`}>
                          {log.quantity > 0 ? "+" : ""}{log.quantity}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col max-w-[300px]">
                          <span className="text-sm truncate" title={log.reason}>{log.reason}</span>
                          {log.reference && (
                            <span className="text-xs text-muted-foreground">Ref: {log.reference}</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{log.user?.name || "System"}</span>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          
          <div className="flex items-center justify-between mt-4">
            <div className="text-sm text-muted-foreground">
              Page {page} of {totalPages || 1}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1 || loading}
              >
                <ArrowLeft className="h-4 w-4 mr-1" /> Prev
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages || totalPages === 0 || loading}
              >
                Next <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
