"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Save, Package, AlertTriangle, User } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/lib/auth"

export default function BulkEditModal({
  isOpen,
  onClose,
  selectedItems,
  itemType,
  onUpdate,
  suppliers = [],
  locations = [],
}) {
  const [adjustments, setAdjustments] = useState([])
  const [reference, setReference] = useState("")
  const [globalReason, setGlobalReason] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()
  
    const  {user} = useAuth()

  useEffect(() => {
    if (selectedItems.length > 0) {
      setAdjustments(
        selectedItems.map((item) => ({
          id: item.id,
          name: item.name,
          sku: item.sku,
          currentQuantity: item.quantity,
          unit: item.unit,
          type: "INCREASE",
          quantity: 0,
          reason: "",
          newQuantity: item.quantity,
        })),
      )
    }
  }, [selectedItems])

  const updateAdjustment = (id, field, value) => {
    setAdjustments((prev) =>
      prev.map((adj) => {
        if (adj.id === id) {
          const updated = { ...adj, [field]: value }

          // Calculate new quantity when type or quantity changes
          if (field === "type" || field === "quantity") {
            const qty = field === "quantity" ? Number.parseInt(value) || 0 : Number.parseInt(adj.quantity) || 0
            const type = field === "type" ? value : adj.type

            if (type === "INCREASE") {
              updated.newQuantity = adj.currentQuantity + qty
            } else if (type === "DECREASE") {
              updated.newQuantity = Math.max(0, adj.currentQuantity - qty)
            }
          }

          return updated
        }
        return adj
      }),
    )
  }

  const applyGlobalReason = () => {
    if (!globalReason.trim()) return

    setAdjustments((prev) =>
      prev.map((adj) => ({
        ...adj,
        reason: globalReason,
      })),
    )
  }

  const handleSubmit = async () => {
    // Validate adjustments
    const validAdjustments = adjustments.filter((adj) => adj.quantity > 0 && adj.reason.trim())

    if (validAdjustments.length === 0) {
      toast({
        title: "Error",
        description: "Please add at least one valid adjustment with quantity and reason",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch(`/api/inventory/${itemType}/bulk-adjust`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          adjustments: validAdjustments.map((adj) => ({
            id: adj.id,
            type: adj.type,
            quantity: Number.parseInt(adj.quantity),
            reason: adj.reason,
          })),
          userId: user.id, // Replace with actual user ID
          reference: reference || `Bulk adjustment ${new Date().toISOString()}`,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to apply bulk adjustments")
      }

      toast({
        title: "Success",
        description: `Successfully adjusted ${validAdjustments.length} items`,
      })

      onUpdate()
      onClose()
    } catch (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const hasValidAdjustments = adjustments.some((adj) => adj.quantity > 0 && adj.reason.trim())

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Bulk Edit Inventory ({selectedItems.length} items)
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col gap-4">
          {/* Global Controls */}
          <div className="flex-shrink-0 grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
            <div>
              <Label htmlFor="reference">Reference (Optional)</Label>
              <Input
                id="reference"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="Bulk adjustment reference"
              />
            </div>
            <div>
              <Label htmlFor="globalReason">Apply Reason to All</Label>
              <div className="flex gap-2">
                <Input
                  id="globalReason"
                  value={globalReason}
                  onChange={(e) => setGlobalReason(e.target.value)}
                  placeholder="Enter reason for all items"
                />
                <Button type="button" variant="outline" onClick={applyGlobalReason} disabled={!globalReason.trim()}>
                  Apply
                </Button>
              </div>
            </div>
            <div className="flex items-end">
              <div className="text-sm text-muted-foreground">
                <div>Selected: {selectedItems.length} items</div>
                <div>
                  Valid adjustments: {adjustments.filter((adj) => adj.quantity > 0 && adj.reason.trim()).length}
                </div>
              </div>
            </div>
          </div>

          {/* Items List */}
          <div className="flex-1 overflow-auto">
            <div className="space-y-3">
              {adjustments.map((adjustment) => (
                <div key={adjustment.id} className="border rounded-lg p-4">
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
                    {/* Item Info */}
                    <div className="lg:col-span-3">
                      <div className="font-medium">{adjustment.name}</div>
                      <div className="text-sm text-muted-foreground">SKU: {adjustment.sku}</div>
                      <Badge variant="outline" className="mt-1">
                        Current: {adjustment.currentQuantity} {adjustment.unit}
                      </Badge>
                    </div>

                    {/* Adjustment Type */}
                    <div className="lg:col-span-2">
                      <Label className="text-xs">Type</Label>
                      <Select
                        value={adjustment.type}
                        onValueChange={(value) => updateAdjustment(adjustment.id, "type", value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="INCREASE">Increase</SelectItem>
                          <SelectItem value="DECREASE">Decrease</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Quantity */}
                    <div className="lg:col-span-2">
                      <Label className="text-xs">Quantity</Label>
                      <Input
                        type="number"
                        min="0"
                        value={adjustment.quantity}
                        onChange={(e) => updateAdjustment(adjustment.id, "quantity", e.target.value)}
                        placeholder="0"
                      />
                    </div>

                    {/* New Quantity Preview */}
                    <div className="lg:col-span-2">
                      <Label className="text-xs">New Quantity</Label>
                      <div className="p-2 bg-muted rounded text-sm">
                        {adjustment.newQuantity} {adjustment.unit}
                        {adjustment.newQuantity < 0 && (
                          <AlertTriangle className="inline h-4 w-4 text-destructive ml-1" />
                        )}
                      </div>
                    </div>

                    {/* Reason */}
                    <div className="lg:col-span-3">
                      <Label className="text-xs">Reason</Label>
                      <Input
                        value={adjustment.reason}
                        onChange={(e) => updateAdjustment(adjustment.id, "reason", e.target.value)}
                        placeholder="Reason for adjustment"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex-shrink-0 flex justify-between items-center pt-4 border-t">
            <div className="text-sm text-muted-foreground">
              {hasValidAdjustments ? (
                <span className="text-green-600">Ready to submit adjustments</span>
              ) : (
                <span className="text-amber-600">Add quantities and reasons to proceed</span>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={!hasValidAdjustments || isSubmitting}>
                <Save className="mr-2 h-4 w-4" />
                {isSubmitting ? "Applying..." : "Apply Adjustments"}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
