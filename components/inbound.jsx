"use client"

import { useState, useEffect, use } from "react"
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
} from "@/components/ui/dialog"
import { RequiredLabel } from "@/components/ui/required-label"
import { ItemSelector } from "@/components/ui/item-selector"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { Plus, Eye, CheckCircle, Clock, Loader2, Package, FileText, Download, Calendar, User } from "lucide-react"
import { getStatusColor, formatCurrency, formatDate } from "@/lib/utils"
import { generateReceivingReportPDF } from "@/lib/pdf-generator"
import { add } from "date-fns"


export default function Inbound() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState("purchase-orders")
  const [purchaseOrders, setPurchaseOrders] = useState([])
  const [inboundReceipts, setInboundReceipts] = useState([])
  const [suppliers, setSuppliers] = useState([])
  const [rawMaterials, setRawMaterials] = useState([])
  const [finishedGoods, setFinishedGoods] = useState([])
  const [locations, setLocations] = useState([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [generatingReport, setGeneratingReport] = useState(false)

  // Dialog states
  const [isCreatePODialogOpen, setIsCreatePODialogOpen] = useState(false)
  const [isCreateReceiptDialogOpen, setIsCreateReceiptDialogOpen] = useState(false)
  const [isReceiveDialogOpen, setIsReceiveDialogOpen] = useState(false)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState(null)

  // Form states
  const [formData, setFormData] = useState({
    supplierId: "",
    expectedDate: new Date().toISOString().split("T")[0],
    notes: "",
    items: [],
  })
  const [receiptData, setReceiptData] = useState({
    supplierId: "",
    receivedDate: new Date().toISOString().split("T")[0],
    notes: "",
    items: [],
  })
  const [receiveData, setReceiveData] = useState([])

  useEffect(() => {
    fetchData()
  }, [activeTab])


  useEffect(() => {
    // Check if redirected from inventory with restock intent
    const params = new URLSearchParams(window.location.search)
    if (params.get("restock") === "true") {
      setActiveTab("purchase-orders")
      setIsCreatePODialogOpen(true)
      // set from data items from local storage and clear it from local storage
      const storedItems = localStorage.getItem("restockItems")
      if (storedItems) {
        const items = JSON.parse(storedItems)
        setFormData((prev) => ({
          ...prev,
          items: items.map((item) => ({
            itemType: item.type === "raw_material" ? "raw_material" : "finished_good", 
            itemId: item.id,
            quantity: (item.minimumStock - item.quantity).toString(),
            unitCost: item.cost ? item.cost.toString() : "0",
          })),
        }))
        // localStorage.removeItem("restockItems")
      }
    }
  }, [])


  const fetchData = async () => {
    try {
      setLoading(true)

      // Use Promise.all for better performance
      const promises = [
        fetch("/api/suppliers"),
        fetch("/api/inventory/raw-materials"),
        fetch("/api/inventory/finished-goods"),
        fetch("/api/locations"),
      ]

      if (activeTab === "purchase-orders") {
        promises.push(fetch("/api/purchase-orders"))
      } else {
        promises.push(fetch("/api/inbound-receipts"))
      }

      const [suppliersRes, materialsRes, goodsRes, locationsRes, ordersRes] = await Promise.all(promises)

      // Process all responses in parallel
      const [suppliersData, materialsData, goodsData, locationsData, ordersData] = await Promise.all([
        suppliersRes.ok ? suppliersRes.json() : [],
        materialsRes.ok ? materialsRes.json() : [],
        goodsRes.ok ? goodsRes.json() : [],
        locationsRes.ok ? locationsRes.json() : [],
        ordersRes.ok ? ordersRes.json() : [],
      ])

      setSuppliers(suppliersData)
      setRawMaterials(materialsData)
      setFinishedGoods(goodsData)
      setLocations(locationsData)

      if (activeTab === "purchase-orders") {
        setPurchaseOrders(ordersData)
      } else {
        setInboundReceipts(ordersData)
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

  const handleCreatePO = async (e) => {
    e.preventDefault()
    if (!formData.supplierId || !formData.expectedDate || !formData.items.length) {
      toast({
        title: "Error",
        description: "Please fill in all required fields and add at least one item",
        variant: "destructive",
      })
      return
    }

    try {
      setSubmitting(true)
      const response = await fetch("/api/purchase-orders", {
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
          description: "Purchase order created successfully",
        })
        setIsCreatePODialogOpen(false)
        resetPOForm()
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

  const handleCreateReceipt = async (e) => {
    e.preventDefault()
    if (!receiptData.supplierId || !receiptData.items.length) {
      toast({
        title: "Error",
        description: "Please select a supplier and add at least one item",
        variant: "destructive",
      })
      return
    }

    try {
      setSubmitting(true)
      const response = await fetch("/api/inbound-receipts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...receiptData,
          createdById: user.id,
        }),
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: "Inbound receipt created successfully",
        })
        setIsCreateReceiptDialogOpen(false)
        resetReceiptForm()
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

  const handleReceiveOrder = async (e) => {
    e.preventDefault()
    if (!receiveData.length) return

    const validItems = receiveData.filter((item) => Number.parseInt(item.receivedQuantity) > 0)
    if (!validItems.length) {
      toast({
        title: "Error",
        description: "Please enter quantities to receive",
        variant: "destructive",
      })
      return
    }

    try {
      setSubmitting(true)
      const response = await fetch(`/api/purchase-orders/${selectedOrder.id}/receive`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: validItems,
          userId: user.id,
        }),
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: "Items received successfully",
        })
        setIsReceiveDialogOpen(false)
        setSelectedOrder(null)
        setReceiveData([])
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

 const generateReceivingReport = async (orderId) => {
    try {
      setGeneratingReport(true)
      const response = await fetch(`/api/reports/receiving/${orderId}`)

      if (response.ok) {
        const reportData = await response.json()
        const pdf = generateReceivingReportPDF(reportData)
        pdf.save(`receiving-report-${reportData.purchaseOrder.poNumber}.pdf`)

        toast({
          title: "Success",
          description: "Receiving report generated successfully",
        })
      } else {
        throw new Error("Failed to generate report")
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate receiving report",
        variant: "destructive",
      })
    } finally {
      setGeneratingReport(false)
    }
  }

  const addPOItem = () => {
    setFormData((prev) => ({
      ...prev,
      items: [...prev.items, { itemType: "finished_good", itemId: "", quantity: "", unitCost: "0" }],
    }))
  }

  const updatePOItem = (index, field, value) => {
 

    setFormData((prev) => ({
      ...prev,
      items: prev.items.map((item, i) => (i === index ? { ...item, [field]: value } : item)),
    }))
       if (field === "itemId") {
      const selectedItem = [...rawMaterials, ...finishedGoods].find((item) => item.id === value)
      if (selectedItem) {
        const reqQuantity = selectedItem.minimumStock - selectedItem.quantity
        setFormData((prev) => ({
          ...prev,
          items: prev.items.map((item, i) =>
            i === index
              ? {
                  ...item,
                  quantity: reqQuantity > 0 ? reqQuantity.toString() : "0",
                }
              : item,
          ),
        }))
      }
    }
  
  }

  const removePOItem = (index) => {
    setFormData((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }))
  }

  const addReceiptItem = () => {
    setReceiptData((prev) => ({
      ...prev,
      items: [...prev.items, { itemType: "raw_material", itemId: "", quantity: "", locationId: "" }],
    }))
  }

  const updateReceiptItem = (index, field, value) => {
    setReceiptData((prev) => ({
      ...prev,
      items: prev.items.map((item, i) => (i === index ? { ...item, [field]: value } : item)),
    }))
  }

  const removeReceiptItem = (index) => {
    setReceiptData((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }))
  }

  const openReceiveDialog = (order) => {
    setSelectedOrder(order)
    setReceiveData(
      order.items.map((item) => ({
        itemId: item.id,
        receivedQuantity: Math.max(0, item.quantity - item.received).toString(),
        notes: "",
      })),
    )
    setIsReceiveDialogOpen(true)
  }

  const openViewDialog = (order) => {
    setSelectedOrder(order)
    setIsViewDialogOpen(true)
  }

  const resetPOForm = () => {
    setFormData({
      supplierId: "",
      expectedDate: "",
      notes: "",
      items: [],
    })
  }

  const resetReceiptForm = () => {
    setReceiptData({
      supplierId: "",
      receivedDate: new Date().toISOString().split("T")[0],
      notes: "",
      items: [],
    })
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case "PENDING":
        return <Clock className="h-4 w-4" />
      case "PARTIALLY_RECEIVED":
        return <Package className="h-4 w-4" />
      case "RECEIVED":
      case "PROCESSED":
        return <CheckCircle className="h-4 w-4" />
      default:
        return <Clock className="h-4 w-4" />
    }
  }

  const getItemOptions = (itemType) => {
    return itemType === "raw_material" ? rawMaterials : finishedGoods
  }

  const canReceive = (order) => {
    return order.status === "PENDING" || order.status === "PARTIALLY_RECEIVED"
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading inbound data...</span>
      </div>
    )
  }

  return (
 <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div className="space-y-1">
          <h2 className="text-3xl font-bold tracking-tight">Inbound Operations</h2>
          <p className="text-gray-500">Manage incoming shipments and direct receipts</p>
        </div>
        <div className="flex gap-3">
          <Button onClick={() => setIsCreatePODialogOpen(true)} className="shadow-sm">
            <Plus className="h-4 w-4 mr-2" />
            Create Purchase Order
          </Button>
          {/* <Button variant="outline" onClick={() => setIsCreateReceiptDialogOpen(true)} className="shadow-sm border-gray-300">
            <Package className="h-4 w-4 mr-2" />
            Direct Receipt
          </Button> */}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="border-gray-200 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Pending Orders</CardTitle>
            <div className="h-10 w-10 rounded-full bg-orange-50 flex items-center justify-center">
              <Clock className="h-5 w-5 text-orange-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">
              {purchaseOrders.filter((order) => order.status === "PENDING").length}
            </div>
            <p className="text-xs text-gray-500 mt-1">Awaiting shipment</p>
          </CardContent>
        </Card>
        <Card className="border-gray-200 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Partially Received</CardTitle>
            <div className="h-10 w-10 rounded-full bg-blue-50 flex items-center justify-center">
              <Package className="h-5 w-5 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">
              {purchaseOrders.filter((order) => order.status === "PARTIALLY_RECEIVED").length}
            </div>
            <p className="text-xs text-gray-500 mt-1">Partial deliveries</p>
          </CardContent>
        </Card>
        <Card className="border-gray-200 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Received Today</CardTitle>
            <div className="h-10 w-10 rounded-full bg-green-50 flex items-center justify-center">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">
              {
                [...purchaseOrders, ...inboundReceipts].filter(
                  (order) =>
                    (order.status === "RECEIVED" || order.status === "PROCESSED") &&
                    new Date(order.updatedAt).toDateString() === new Date().toDateString(),
                ).length
              }
            </div>
            <p className="text-xs text-gray-500 mt-1">Completed today</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="space-y-6">
        <div className="inline-flex gap-1 p-1 bg-gray-100 rounded-lg">
          <button
            onClick={() => setActiveTab("purchase-orders")}
            className={`px-6 py-2.5 rounded-md text-sm font-medium transition-all ${
              activeTab === "purchase-orders" 
                ? "bg-white text-gray-900 shadow-sm" 
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
            }`}
          >
            Purchase Orders
          </button>
          {/* <button
            onClick={() => setActiveTab("direct-receipts")}
            className={`px-6 py-2.5 rounded-md text-sm font-medium transition-all ${
              activeTab === "direct-receipts" 
                ? "bg-white text-gray-900 shadow-sm" 
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
            }`}
          >
            Direct Receipts
          </button> */}
        </div>

        {/* Purchase Orders Table */}
        {activeTab === "purchase-orders" && (
          <Card className="border-gray-200 shadow-sm">
            <CardHeader className="border-b border-gray-100 bg-gray-50/50">
              <CardTitle className="text-lg">Purchase Orders</CardTitle>
              <CardDescription>Track and manage all purchase orders</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50/50 hover:bg-gray-50/50">
                    <TableHead className="font-semibold">PO Number</TableHead>
                    <TableHead className="font-semibold">Supplier</TableHead>
                    <TableHead className="font-semibold">Expected Date</TableHead>
                    <TableHead className="font-semibold">Status</TableHead>
                    <TableHead className="font-semibold">Items</TableHead>
                    <TableHead className="font-semibold">Progress</TableHead>
                    {user?.role === "ADMIN" && <TableHead className="font-semibold">Total Value</TableHead>}
                    <TableHead className="font-semibold">Created By</TableHead>
                    <TableHead className="font-semibold">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {purchaseOrders.map((order) => {
                    const totalOrdered = order.items?.reduce((sum, item) => sum + item.quantity, 0) || 0
                    const totalReceived = order.items?.reduce((sum, item) => sum + item.received, 0) || 0
                    const progressPercent = totalOrdered > 0 ? Math.round((totalReceived / totalOrdered) * 100) : 0

                    return (
                      <TableRow key={order.id} className="hover:bg-gray-50/50">
                        <TableCell className="font-medium text-gray-900">{order.poNumber}</TableCell>
                        <TableCell className="text-gray-700">{order.supplier?.name}</TableCell>
                        <TableCell className="text-gray-700">{formatDate(order.expectedDate)}</TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(order.status)}>
                            <div className="flex items-center gap-1">
                              {getStatusIcon(order.status)}
                              {order.status.replace("_", " ")}
                            </div>
                          </Badge>
                        </TableCell>
                        <TableCell className="text-gray-700">{order.items?.length || 0}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-20 bg-gray-200 rounded-full h-2.5">
                              <div
                                className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                                style={{ width: `${progressPercent}%` }}
                              ></div>
                            </div>
                            <span className="text-xs text-gray-600 font-medium min-w-[3rem]">
                              {totalReceived}/{totalOrdered}
                            </span>
                          </div>
                        </TableCell>
                        {user?.role === "ADMIN" && <TableCell className="text-gray-700">{formatCurrency(order.totalValue)}</TableCell>}
                        <TableCell className="text-gray-700">{order.createdBy?.name}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={() => openViewDialog(order)} className="h-8 w-8 p-0">
                              <Eye className="h-4 w-4" />
                            </Button>
                            {canReceive(order) && (
                              <Button variant="outline" size="sm" onClick={() => openReceiveDialog(order)} className="h-8">
                                Receive
                              </Button>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => generateReceivingReport(order.id)}
                              disabled={generatingReport}
                              className="h-8 w-8 p-0"
                            >
                              {generatingReport ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Download className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Direct Receipts Table */}
        {/* {activeTab === "direct-receipts" && (
          <Card className="border-gray-200 shadow-sm">
            <CardHeader className="border-b border-gray-100 bg-gray-50/50">
              <CardTitle className="text-lg">Direct Receipts</CardTitle>
              <CardDescription>Track and process direct inbound receipts</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50/50 hover:bg-gray-50/50">
                    <TableHead className="font-semibold">Receipt Number</TableHead>
                    <TableHead className="font-semibold">Supplier</TableHead>
                    <TableHead className="font-semibold">Received Date</TableHead>
                    <TableHead className="font-semibold">Status</TableHead>
                    <TableHead className="font-semibold">Items</TableHead>
                    <TableHead className="font-semibold">Created By</TableHead>
                    <TableHead className="font-semibold">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {inboundReceipts.map((receipt) => (
                    <TableRow key={receipt.id} className="hover:bg-gray-50/50">
                      <TableCell className="font-medium text-gray-900">{receipt.receiptNumber}</TableCell>
                      <TableCell className="text-gray-700">{receipt.supplier?.name}</TableCell>
                      <TableCell className="text-gray-700">{formatDate(receipt.receivedDate)}</TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(receipt.status)}>
                          <div className="flex items-center gap-1">
                            {getStatusIcon(receipt.status)}
                            {receipt.status.replace("_", " ")}
                          </div>
                        </Badge>
                      </TableCell>
                      <TableCell className="text-gray-700">{receipt.items?.length || 0}</TableCell>
                      <TableCell className="text-gray-700">{receipt.createdBy?.name}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => openViewDialog(receipt)} className="h-8 w-8 p-0">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )} */}
      </div>

      {/* Create Purchase Order Dialog */}
      <Dialog open={isCreatePODialogOpen} onOpenChange={setIsCreatePODialogOpen}>
        <DialogContent className="sm:max-w-[700px] pointer-events-auto">
          <DialogHeader>
            <DialogTitle className="text-xl">Create Purchase Order</DialogTitle>
            <DialogDescription>Create a new purchase order for incoming goods</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreatePO} className="pointer-events-auto">
            <div className="grid gap-5 py-4 max-h-[60vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <RequiredLabel htmlFor="supplier" required>
                    Supplier
                  </RequiredLabel>
                  <select
                    id="supplier"
                    value={formData.supplierId}
                    onChange={(e) => setFormData((prev) => ({ ...prev, supplierId: e.target.value }))}
                    className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                    required
                    style={{ pointerEvents: 'auto' }}
                  >
                    <option value="">Select supplier</option>
                    {suppliers.map((supplier) => (
                      <option key={supplier.id} value={supplier.id}>
                        {supplier.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <RequiredLabel htmlFor="expectedDate" required>
                    Expected Date
                  </RequiredLabel>
                  <Input
                    id="expectedDate"
                    type="date"
                    value={formData.expectedDate}
                    onChange={(e) => setFormData((prev) => ({ ...prev, expectedDate: e.target.value }))}
                    className="border-gray-300 focus:border-blue-500 focus:ring-blue-500 cursor-pointer"
                    style={{ pointerEvents: 'auto' }}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <RequiredLabel htmlFor="notes">Notes</RequiredLabel>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
                  placeholder="Additional notes or special instructions"
                  className="border-gray-300 h-16 focus:border-blue-500 focus:ring-blue-500"
                  style={{ pointerEvents: 'auto' }}
                />
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <RequiredLabel className="text-base font-semibold">Order Items</RequiredLabel>
                  <Button type="button" variant="outline" onClick={addPOItem} style={{ pointerEvents: 'auto' }}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Item
                  </Button>
                </div>
                <div className="space-y-3">
               {formData.items.map((item, index) => (
  <div key={index} className="grid grid-cols-4 gap-3 items-end p-4 border border-gray-200 rounded-lg bg-gray-50/30" style={{ pointerEvents: 'auto' }}>
    {/* <div className="space-y-1.5">
      <RequiredLabel className="text-xs font-medium" required>
        Type
      </RequiredLabel>
      <select
        value={item.itemType}
        onChange={(e) => updatePOItem(index, "itemType", e.target.value)}
        className="flex h-9 w-full rounded-md border border-gray-300 bg-white px-2 py-1 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
        style={{ pointerEvents: 'auto' }}
      >
        <option value="finished_good">Finished Good</option>
      </select>
    </div> */}
    <div className="space-y-1.5 col-span-2">
      <RequiredLabel className="text-xs font-medium" required>
        Item
      </RequiredLabel>
      <ItemSelector
        items={getItemOptions(item.itemType)}
        value={item.itemId}
        onValueChange={(value) => updatePOItem(index, "itemId", value)}
        placeholder="Select item"
        className="h-9 text-xs"
        style={{ pointerEvents: 'auto' }}
        required
      />
      {/* Selected item details badge */}
      {item.itemId && (() => {
        const selectedItem = getItemOptions(item.itemType).find(i => i.id === item.itemId);
        return selectedItem ? (
          <div className="flex items-center gap-2 px-2 py-1 bg-blue-50 border border-blue-100 rounded-md">
            <span className="text-xs font-mono font-semibold text-blue-700 bg-blue-100 px-1.5 py-0.5 rounded">
              {selectedItem.sku}
            </span>
            <span className="text-xs text-gray-500">
              {selectedItem.quantity} {selectedItem.unit} in stock
            </span>
          </div>
        ) : null;
      })()}
    </div>
    <div className="space-y-1.5">
      <RequiredLabel className="text-xs font-medium" required>
        Quantity
      </RequiredLabel>
      <Input
        type="number"
        value={item.quantity}
        onChange={(e) => updatePOItem(index, "quantity", e.target.value)}
        className="h-9 text-xs border-gray-300"
        placeholder="0"
        style={{ pointerEvents: 'auto' }}
        required
      />
    </div>
    <Button type="button" variant="outline" size="sm" onClick={() => removePOItem(index)} style={{ pointerEvents: 'auto' }} className="h-9">
      Remove
    </Button>
  </div>
))}
                </div>
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => setIsCreatePODialogOpen(false)} style={{ pointerEvents: 'auto' }}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting} style={{ pointerEvents: 'auto' }}>
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

      {/* Create Direct Receipt Dialog */}
      <Dialog open={isCreateReceiptDialogOpen} onOpenChange={setIsCreateReceiptDialogOpen}>
        <DialogContent className="sm:max-w-[700px] pointer-events-auto">
          <DialogHeader>
            <DialogTitle className="text-xl">Create Direct Receipt</DialogTitle>
            <DialogDescription>Record direct receipt of goods without purchase order</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateReceipt} className="pointer-events-auto">
            <div className="grid gap-5 py-4 max-h-[60vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <RequiredLabel htmlFor="receipt-supplier" required>
                    Supplier
                  </RequiredLabel>
                  <select
                    id="receipt-supplier"
                    value={receiptData.supplierId}
                    onChange={(e) => setReceiptData((prev) => ({ ...prev, supplierId: e.target.value }))}
                    className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                    style={{ pointerEvents: 'auto' }}
                    required
                  >
                    <option value="">Select supplier</option>
                    {suppliers.map((supplier) => (
                      <option key={supplier.id} value={supplier.id}>
                        {supplier.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <RequiredLabel htmlFor="receivedDate" required>
                    Received Date
                  </RequiredLabel>
                  <Input
                    id="receivedDate"
                    type="date"
                    value={receiptData.receivedDate}
                    onChange={(e) => setReceiptData((prev) => ({ ...prev, receivedDate: e.target.value }))}
                    className="border-gray-300 focus:border-blue-500 focus:ring-blue-500 cursor-pointer"
                    style={{ pointerEvents: 'auto' }}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <RequiredLabel htmlFor="receipt-notes">Notes</RequiredLabel>
                <Textarea
                  id="receipt-notes"
                  value={receiptData.notes}
                  onChange={(e) => setReceiptData((prev) => ({ ...prev, notes: e.target.value }))}
                  placeholder="Additional notes or special instructions"
                  className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                  style={{ pointerEvents: 'auto' }}
                />
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <RequiredLabel className="text-base font-semibold">Receipt Items</RequiredLabel>
                  <Button type="button" variant="outline" onClick={addReceiptItem} style={{ pointerEvents: 'auto' }}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Item
                  </Button>
                </div>
                <div className="space-y-3">
                  {receiptData.items.map((item, index) => (
                    <div key={index} className="grid grid-cols-5 gap-3 items-end p-4 border border-gray-200 rounded-lg bg-gray-50/30" style={{ pointerEvents: 'auto' }}>
                      <div className="space-y-1.5">
                        <RequiredLabel className="text-xs font-medium" required>
                          Type
                        </RequiredLabel>
                        <select
                          value={item.itemType}
                          onChange={(e) => updateReceiptItem(index, "itemType", e.target.value)}
                          className="flex h-9 w-full rounded-md border border-gray-300 bg-white px-2 py-1 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                          style={{ pointerEvents: 'auto' }}
                        >
                          <option value="raw_material">Raw Material</option>
                          <option value="finished_good">Finished Good</option>
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <RequiredLabel className="text-xs font-medium" required>
                          Item
                        </RequiredLabel>
                        <ItemSelector
                          items={getItemOptions(item.itemType)}
                          value={item.itemId}
                          onValueChange={(value) => updateReceiptItem(index, "itemId", value)}
                          placeholder="Select item"
                          className="h-9 text-xs"
                          style={{ pointerEvents: 'auto' }}
                          required
                        />
                      </div>
                      <div className="space-y-1.5">
                        <RequiredLabel className="text-xs font-medium" required>
                          Quantity
                        </RequiredLabel>
                        <Input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => updateReceiptItem(index, "quantity", e.target.value)}
                          className="h-9 text-xs border-gray-300"
                          placeholder="0"
                          style={{ pointerEvents: 'auto' }}
                          required
                        />
                      </div>
                      <div className="space-y-1.5">
                        <RequiredLabel className="text-xs font-medium" required>
                          Location
                        </RequiredLabel>
                        <select
                          value={item.locationId}
                          onChange={(e) => updateReceiptItem(index, "locationId", e.target.value)}
                          className="flex h-9 w-full rounded-md border border-gray-300 bg-white px-2 py-1 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                          style={{ pointerEvents: 'auto' }}
                          required
                        >
                          <option value="">Select location</option>
                          {locations.map((location) => (
                            <option key={location.id} value={location.id}>
                              {location.code} - {location.zone}
                            </option>
                          ))}
                        </select>
                      </div>
                      <Button type="button" variant="outline" size="sm" onClick={() => removeReceiptItem(index)} style={{ pointerEvents: 'auto' }} className="h-9">
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => setIsCreateReceiptDialogOpen(false)} style={{ pointerEvents: 'auto' }}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting} style={{ pointerEvents: 'auto' }}>
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create Receipt"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Receive Order Dialog */}
      <Dialog open={isReceiveDialogOpen} onOpenChange={setIsReceiveDialogOpen}>
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle className="text-xl">Receive Purchase Order</DialogTitle>
            <DialogDescription>Record the quantities received for PO {selectedOrder?.poNumber}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleReceiveOrder}>
            <div className="grid gap-4 py-4 max-h-[50vh] overflow-y-auto">
              {selectedOrder?.items?.map((item, index) => {
                const itemName = item.rawMaterial?.name || item.finishedGood?.name
                const itemImage = item.finishedGood?.imageUrl
                const remaining = item.quantity - item.received

                return (
                  <div key={item.id} className="grid grid-cols-4 gap-4 items-center p-4 border border-gray-200 rounded-lg bg-gray-50/30">
                    <div className="flex items-center gap-3">
                      {itemImage ? (
                        <img
                          src={itemImage || "/placeholder.svg"}
                          alt={itemName}
                          className="w-12 h-12 object-cover rounded-md border border-gray-200"
                          onError={(e) => {
                            e.target.style.display = "none"
                            e.target.nextSibling.style.display = "flex"
                          }}
                        />
                      ) : null}
                      <div
                        className={`w-12 h-12 bg-gray-100 rounded-md flex items-center justify-center border border-gray-200 ${itemImage ? "hidden" : ""}`}
                      >
                        <Package className="h-6 w-6 text-gray-400" />
                      </div>
                      <div>
                        <RequiredLabel className="text-sm font-medium text-gray-900">{itemName}</RequiredLabel>
                        <p className="text-xs text-gray-500">
                          {item.itemType === "raw_material" ? "Raw Material" : "Finished Good"}
                        </p>
                      </div>
                    </div>
                    <div className="text-center">
                      <RequiredLabel className="text-xs text-gray-500">Ordered</RequiredLabel>
                      <p className="text-sm font-semibold text-gray-900">{item.quantity}</p>
                    </div>
                    <div className="text-center">
                      <RequiredLabel className="text-xs text-gray-500">Already Received</RequiredLabel>
                      <p className="text-sm font-semibold text-gray-900">{item.received}</p>
                    </div>
                    <div className="space-y-2">
                      <RequiredLabel className="text-xs font-medium" required>
                        Receive Now
                      </RequiredLabel>
                      <Input
                        type="number"
                        value={receiveData[index]?.receivedQuantity || ""}
                        onChange={(e) =>
                          setReceiveData((prev) =>
                            prev.map((data, i) => (i === index ? { ...data, receivedQuantity: e.target.value } : data)),
                          )
                        }
                        max={remaining}
                        min="0"
                        className="h-9 border-gray-300"
                        placeholder={`Max: ${remaining}`}
                      />
                      <Input
                        type="text"
                        value={receiveData[index]?.notes || ""}
                        onChange={(e) =>
                          setReceiveData((prev) =>
                            prev.map((data, i) => (i === index ? { ...data, notes: e.target.value } : data)),
                          )
                        }
                        className="h-9 text-xs border-gray-300"
                        placeholder="Notes (optional)"
                      />
                    </div>
                  </div>
                )
              })}
            </div>
            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => setIsReceiveDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Receiving...
                  </>
                ) : (
                  "Receive Items"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle className="text-xl">{selectedOrder?.poNumber ? "Purchase Order Details" : "Receipt Details"}</DialogTitle>
            <DialogDescription className="text-base">{selectedOrder?.poNumber || selectedOrder?.receiptNumber}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-5 py-4 max-h-[60vh] overflow-y-auto">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <RequiredLabel className="text-sm font-semibold text-gray-600">Supplier</RequiredLabel>
                <p className="text-sm text-gray-900 mt-1">{selectedOrder?.supplier?.name}</p>
              </div>
              <div>
                <RequiredLabel className="text-sm font-semibold text-gray-600">
                  {selectedOrder?.expectedDate ? "Expected Date" : "Received Date"}
                </RequiredLabel>
                <p className="text-sm text-gray-900 flex items-center gap-1 mt-1">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  {selectedOrder?.expectedDate && formatDate(selectedOrder.expectedDate)}
                  {selectedOrder?.receivedDate && formatDate(selectedOrder.receivedDate)}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <RequiredLabel className="text-sm font-semibold text-gray-600">Status</RequiredLabel>
                <div className="mt-1">
                  <Badge className={getStatusColor(selectedOrder?.status)}>
                    {selectedOrder?.status?.replace("_", " ")}
                  </Badge>
                </div>
              </div>
              {user?.role === "ADMIN" && selectedOrder?.totalValue && (
                <div>
                  <RequiredLabel className="text-sm font-semibold text-gray-600">Total Value</RequiredLabel>
                  <p className="text-sm text-gray-900 mt-1">{formatCurrency(selectedOrder.totalValue)}</p>
                </div>
              )}
            </div>
            {selectedOrder?.notes && (
              <div>
                <RequiredLabel className="text-sm font-semibold text-gray-600">Notes</RequiredLabel>
                <p className="text-sm text-gray-700 flex items-start gap-2 mt-1 p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <FileText className="h-4 w-4 mt-0.5 text-gray-500" />
                  {selectedOrder.notes}
                </p>
              </div>
            )}
            <div>
              <RequiredLabel className="text-sm font-semibold text-gray-600">Items</RequiredLabel>
              <div className="mt-2 space-y-3">
                {selectedOrder?.items?.map((item) => {
                  const itemName = item.rawMaterial?.name || item.finishedGood?.name
                  const itemImage = item.finishedGood?.imageUrl

                  return (
                    <div key={item.id} className="flex justify-between items-center p-4 border border-gray-200 rounded-lg bg-gray-50/30">
                      <div className="flex items-center gap-3">
                        {itemImage ? (
                          <img
                            src={itemImage || "/placeholder.svg"}
                            alt={itemName}
                            className="w-12 h-12 object-cover rounded-md border border-gray-200"
                            onError={(e) => {
                              e.target.style.display = "none"
                              e.target.nextSibling.style.display = "flex"
                            }}
                          />
                        ) : null}
                        <div
                          className={`w-12 h-12 bg-gray-100 rounded-md flex items-center justify-center border border-gray-200 ${itemImage ? "hidden" : ""}`}
                        >
                          <Package className="h-5 w-5 text-gray-400" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{itemName}</p>
                          <p className="text-xs text-gray-500">
                            {item.itemType === "raw_material" ? "Raw Material" : "Finished Good"}
                          </p>
                          {selectedOrder.poNumber && (
                            <p className="text-xs text-gray-500 mt-1">
                              Ordered: {item.quantity} | Received: {item.received}
                            </p>
                          )}
                          {!selectedOrder.poNumber && (
                            <p className="text-xs text-gray-500 mt-1">Quantity: {item.quantity}</p>
                          )}
                        </div>
                      </div>
                      {user?.role === "ADMIN" && item.totalCost && (
                        <div className="text-right">
                          <p className="text-sm font-semibold text-gray-900">{formatCurrency(item.totalCost)}</p>
                          <p className="text-xs text-gray-500">{formatCurrency(item.unitCost)} each</p>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Receiving History */}
            {selectedOrder?.receivingRecords?.length > 0 && (
              <div>
                <RequiredLabel className="text-sm font-semibold text-gray-600">Receiving History</RequiredLabel>
                <div className="mt-2 space-y-2">
                  {selectedOrder.receivingRecords.map((record) => (
                    <div key={record.id} className="flex justify-between items-center p-3 bg-blue-50 border border-blue-100 rounded-lg">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{record.rawMaterial?.name || record.finishedGood?.name}</p>
                        <p className="text-xs text-gray-600 flex items-center gap-1 mt-1">
                          <User className="h-3 w-3" />
                          Received by {record.user?.name} on {formatDate(record.receivedDate)}
                        </p>
                        {record.notes && <p className="text-xs text-gray-600 italic mt-1">{record.notes}</p>}
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-gray-900">{record.quantity} units</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button onClick={() => setIsViewDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
