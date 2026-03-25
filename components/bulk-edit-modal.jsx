"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Save, Package, AlertTriangle, SlidersHorizontal, ArrowUpDown } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/lib/auth"

// Fields that can be bulk-edited
const EDITABLE_FIELDS = [
  { key: "price",        label: "Price",         type: "number", step: "0.01" },
  { key: "cost",         label: "Cost",          type: "number", step: "0.01" },
  { key: "minimumStock", label: "Min Stock",     type: "number", step: "1"    },
  { key: "locationId",   label: "Location",      type: "select"               },
  { key: "categoryId",   label: "Category",      type: "select"               },
]

export default function BulkEditModal({
  isOpen,
  onClose,
  selectedItems,
  itemType,
  onUpdate,
  suppliers = [],
  locations = [],
  categories = [],
}) {
  const [activeTab, setActiveTab]     = useState("fields")

  // ── Field-edit state ──────────────────────────────────────────────────────
  // globalFields: the values the user wants to apply to ALL selected items
  const [globalFields, setGlobalFields] = useState({
    price: "", cost: "", minimumStock: "", locationId: "", categoryId: "",
  })
  // perItemFields: overrides per item (same shape as globalFields)
  const [perItemFields, setPerItemFields] = useState({})

  // ── Quantity-adjustment state ─────────────────────────────────────────────
  const [adjustments, setAdjustments]   = useState([])
  const [reference, setReference]       = useState("")
  const [globalReason, setGlobalReason] = useState("")

  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()
  const { user }  = useAuth()

  // ── Initialise when items change ──────────────────────────────────────────
  useEffect(() => {
    if (!selectedItems.length) return

    setAdjustments(
      selectedItems.map((item) => ({
        id:              item.id,
        name:            item.name,
        sku:             item.sku,
        currentQuantity: item.quantity,
        unit:            item.unit,
        type:            "INCREASE",
        quantity:        0,
        reason:          "",
        newQuantity:     item.quantity,
      }))
    )

    // Build per-item field map pre-filled with current values
    const map = {}
    for (const item of selectedItems) {
      map[item.id] = {
        price:        item.price?.toString()        ?? "",
        cost:         item.cost?.toString()         ?? "",
        minimumStock: item.minimumStock?.toString() ?? "",
        locationId:   item.locationId              ?? "",
        categoryId:   item.categoryId              ?? "",
      }
    }
    setPerItemFields(map)
    setGlobalFields({ price: "", cost: "", minimumStock: "", locationId: "", categoryId: "" })
  }, [selectedItems])

  // ── Field-edit helpers ────────────────────────────────────────────────────
  const applyGlobalField = (key, value) => {
    setPerItemFields((prev) => {
      const next = { ...prev }
      for (const id of Object.keys(next)) {
        next[id] = { ...next[id], [key]: value }
      }
      return next
    })
  }

  const updatePerItemField = (itemId, key, value) => {
    setPerItemFields((prev) => ({
      ...prev,
      [itemId]: { ...prev[itemId], [key]: value },
    }))
  }

  // ── Quantity-adjustment helpers ───────────────────────────────────────────
  const updateAdjustment = (id, field, value) => {
    setAdjustments((prev) =>
      prev.map((adj) => {
        if (adj.id !== id) return adj
        const updated = { ...adj, [field]: value }
        if (field === "type" || field === "quantity") {
          const qty  = field === "quantity" ? parseInt(value) || 0 : parseInt(adj.quantity) || 0
          const type = field === "type"     ? value             : adj.type
          updated.newQuantity =
            type === "INCREASE"
              ? adj.currentQuantity + qty
              : Math.max(0, adj.currentQuantity - qty)
        }
        return updated
      })
    )
  }

  const applyGlobalReasonToAll = () => {
    if (!globalReason.trim()) return
    setAdjustments((prev) => prev.map((adj) => ({ ...adj, reason: globalReason })))
  }

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    // Build unified payload per item
    const payload = selectedItems.map((item) => {
      const entry = { id: item.id }

      // --- field edits ---
      const itemFields = perItemFields[item.id] ?? {}
      const original   = {
        price:        item.price?.toString()        ?? "",
        cost:         item.cost?.toString()         ?? "",
        minimumStock: item.minimumStock?.toString() ?? "",
        locationId:   item.locationId              ?? "",
        categoryId:   item.categoryId              ?? "",
      }
      const changedFields = {}
      for (const key of Object.keys(original)) {
        if (itemFields[key] !== undefined && itemFields[key] !== original[key]) {
          changedFields[key] = itemFields[key]
        }
      }
      if (Object.keys(changedFields).length > 0) {
        entry.fields = changedFields
      }

      // --- quantity adjustment ---
      const adj = adjustments.find((a) => a.id === item.id)
      if (adj && adj.quantity > 0 && adj.reason.trim()) {
        entry.type     = adj.type
        entry.quantity = parseInt(adj.quantity)
        entry.reason   = adj.reason.trim()
      }

      return entry
    })

    // Must have at least one change somewhere
    const hasAnyChange = payload.some(
      (e) => (e.fields && Object.keys(e.fields).length > 0) || e.quantity
    )
    if (!hasAnyChange) {
      toast({
        title:       "Nothing to save",
        description: "Make at least one field change or quantity adjustment.",
        variant:     "destructive",
      })
      return
    }

    setIsSubmitting(true)
    try {
      const response = await fetch(`/api/inventory/${itemType}/bulk-adjust`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          adjustments: payload,
          userId:      user.id,
          reference:   reference || `Bulk edit ${new Date().toISOString()}`,
        }),
      })

      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.error || "Failed to apply bulk changes")
      }

      const data = await response.json()
      toast({
        title:       "Success",
        description: `Updated ${data.summary?.itemsUpdated ?? selectedItems.length} items`,
      })
      onUpdate()
      onClose()
    } catch (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" })
    } finally {
      setIsSubmitting(false)
    }
  }

  const validAdjustments = adjustments.filter((a) => a.quantity > 0 && a.reason.trim())

  const renderSelectOptions = (key) => {
    if (key === "locationId") {
      return locations.map((l) => (
        <SelectItem key={l.id} value={l.id}>{l.code} – {l.zone}</SelectItem>
      ))
    }
    if (key === "categoryId") {
      return [
        <SelectItem key="none" value="none">No Category</SelectItem>,
        ...categories.map((c) => (
          <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
        )),
      ]
    }
    return null
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Bulk Edit — {selectedItems.length} item{selectedItems.length !== 1 ? "s" : ""} selected
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col gap-4">
          {/* ── Reference ── */}
          <div className="flex-shrink-0 grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
            <div className="md:col-span-2">
              <Label htmlFor="reference">Reference (optional)</Label>
              <Input
                id="reference"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="e.g. Q2 stock correction"
              />
            </div>
            <div className="flex items-end">
              <p className="text-sm text-muted-foreground">
                <span className="font-medium">{selectedItems.length}</span> items selected
                {validAdjustments.length > 0 && (
                  <> · <span className="font-medium">{validAdjustments.length}</span> qty adjustments</>
                )}
              </p>
            </div>
          </div>

          {/* ── Tabs ── */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-hidden flex flex-col">
            <TabsList className="flex-shrink-0 w-fit">
              <TabsTrigger value="fields" className="flex items-center gap-1.5">
                <SlidersHorizontal className="h-4 w-4" /> Field Edits
              </TabsTrigger>
              <TabsTrigger value="quantities" className="flex items-center gap-1.5">
                <ArrowUpDown className="h-4 w-4" /> Quantity Adjustments
              </TabsTrigger>
            </TabsList>

            {/* ══ FIELD EDITS TAB ══════════════════════════════════════════ */}
            <TabsContent value="fields" className="flex-1 overflow-hidden flex flex-col gap-3 mt-3">
              {/* Global apply row */}
              <div className="flex-shrink-0 p-3 border rounded-lg bg-muted/30">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Apply a value to ALL items
                </p>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  {EDITABLE_FIELDS.map(({ key, label, type, step }) => (
                    <div key={key}>
                      <Label className="text-xs">{label}</Label>
                      {type === "select" ? (
                        <Select
                          value={globalFields[key]}
                          onValueChange={(val) => {
                            setGlobalFields((p) => ({ ...p, [key]: val }))
                            applyGlobalField(key, val)
                          }}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder="— apply to all —" />
                          </SelectTrigger>
                          <SelectContent>{renderSelectOptions(key)}</SelectContent>
                        </Select>
                      ) : (
                        <div className="flex gap-1">
                          <Input
                            type={type}
                            step={step}
                            min="0"
                            className="h-8 text-xs"
                            value={globalFields[key]}
                            placeholder="—"
                            onChange={(e) => setGlobalFields((p) => ({ ...p, [key]: e.target.value }))}
                          />
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-8 px-2 text-xs"
                            disabled={!globalFields[key]}
                            onClick={() => applyGlobalField(key, globalFields[key])}
                          >
                            ↓
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Per-item rows */}
              <div className="flex-1 overflow-auto space-y-2">
                {selectedItems.map((item) => {
                  const fields = perItemFields[item.id] ?? {}
                  return (
                    <div key={item.id} className="border rounded-lg p-3">
                      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-center">
                        {/* Name */}
                        <div className="lg:col-span-3">
                          <p className="font-medium text-sm">{item.name}</p>
                          <p className="text-xs text-muted-foreground">SKU: {item.sku}</p>
                        </div>

                        {/* Price */}
                        <div className="lg:col-span-2">
                          <Label className="text-xs">Price</Label>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            className="h-8 text-xs"
                            value={fields.price ?? ""}
                            onChange={(e) => updatePerItemField(item.id, "price", e.target.value)}
                          />
                        </div>

                        {/* Cost */}
                        <div className="lg:col-span-2">
                          <Label className="text-xs">Cost</Label>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            className="h-8 text-xs"
                            value={fields.cost ?? ""}
                            onChange={(e) => updatePerItemField(item.id, "cost", e.target.value)}
                          />
                        </div>

                        {/* Min Stock */}
                        <div className="lg:col-span-1">
                          <Label className="text-xs">Min Stock</Label>
                          <Input
                            type="number"
                            min="0"
                            className="h-8 text-xs"
                            value={fields.minimumStock ?? ""}
                            onChange={(e) => updatePerItemField(item.id, "minimumStock", e.target.value)}
                          />
                        </div>

                        {/* Location */}
                        <div className="lg:col-span-2">
                          <Label className="text-xs">Location</Label>
                          <Select
                            value={fields.locationId ?? ""}
                            onValueChange={(val) => updatePerItemField(item.id, "locationId", val)}
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue placeholder="Select…" />
                            </SelectTrigger>
                            <SelectContent>
                              {locations.map((l) => (
                                <SelectItem key={l.id} value={l.id}>{l.code} – {l.zone}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Category */}
                        <div className="lg:col-span-2">
                          <Label className="text-xs">Category</Label>
                          <Select
                            value={fields.categoryId ?? ""}
                            onValueChange={(val) => updatePerItemField(item.id, "categoryId", val)}
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue placeholder="Select…" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">No Category</SelectItem>
                              {categories.map((c) => (
                                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </TabsContent>

            {/* ══ QUANTITY ADJUSTMENTS TAB ════════════════════════════════ */}
            <TabsContent value="quantities" className="flex-1 overflow-hidden flex flex-col gap-3 mt-3">
              {/* Global reason */}
              <div className="flex-shrink-0 flex gap-2 items-end p-3 border rounded-lg bg-muted/30">
                <div className="flex-1">
                  <Label htmlFor="globalReason" className="text-xs">Apply reason to all</Label>
                  <Input
                    id="globalReason"
                    className="h-8 text-xs"
                    value={globalReason}
                    onChange={(e) => setGlobalReason(e.target.value)}
                    placeholder="e.g. Annual stocktake correction"
                  />
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={applyGlobalReasonToAll}
                  disabled={!globalReason.trim()}
                >
                  Apply
                </Button>
              </div>

              {/* Per-item rows */}
              <div className="flex-1 overflow-auto space-y-2">
                {adjustments.map((adj) => (
                  <div key={adj.id} className="border rounded-lg p-3">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-center">
                      {/* Name */}
                      <div className="lg:col-span-3">
                        <p className="font-medium text-sm">{adj.name}</p>
                        <p className="text-xs text-muted-foreground">SKU: {adj.sku}</p>
                        <Badge variant="outline" className="mt-1 text-xs">
                          Current: {adj.currentQuantity} {adj.unit}
                        </Badge>
                      </div>

                      {/* Type */}
                      <div className="lg:col-span-2">
                        <Label className="text-xs">Type</Label>
                        <Select
                          value={adj.type}
                          onValueChange={(val) => updateAdjustment(adj.id, "type", val)}
                        >
                          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="INCREASE">Increase</SelectItem>
                            <SelectItem value="DECREASE">Decrease</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Qty */}
                      <div className="lg:col-span-2">
                        <Label className="text-xs">Quantity</Label>
                        <Input
                          type="number"
                          min="0"
                          className="h-8 text-xs"
                          value={adj.quantity}
                          onChange={(e) => updateAdjustment(adj.id, "quantity", e.target.value)}
                        />
                      </div>

                      {/* New qty preview */}
                      <div className="lg:col-span-2">
                        <Label className="text-xs">New Qty</Label>
                        <div className="h-8 px-2 flex items-center bg-muted rounded text-xs gap-1">
                          {adj.newQuantity} {adj.unit}
                          {adj.newQuantity < 0 && (
                            <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
                          )}
                        </div>
                      </div>

                      {/* Reason */}
                      <div className="lg:col-span-3">
                        <Label className="text-xs">Reason *</Label>
                        <Input
                          className="h-8 text-xs"
                          value={adj.reason}
                          onChange={(e) => updateAdjustment(adj.id, "reason", e.target.value)}
                          placeholder="Reason for adjustment"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>
          </Tabs>

          {/* ── Footer ── */}
          <div className="flex-shrink-0 flex justify-between items-center pt-3 border-t">
            <p className="text-sm text-muted-foreground">
              {activeTab === "quantities" && validAdjustments.length > 0
                ? <span className="text-green-600">{validAdjustments.length} quantity adjustment{validAdjustments.length !== 1 ? "s" : ""} ready</span>
                : activeTab === "quantities"
                ? <span className="text-amber-600">Add quantities and reasons to log adjustments</span>
                : <span className="text-muted-foreground">Edit fields above — unchanged values are skipped</span>
              }
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={isSubmitting}>
                <Save className="mr-2 h-4 w-4" />
                {isSubmitting ? "Saving…" : "Save Changes"}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
