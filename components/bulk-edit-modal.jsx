"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import {
  Save, Package, AlertTriangle, SlidersHorizontal,
  ArrowUpDown, TrendingUp, TrendingDown, ChevronRight,
  Loader2, CheckCircle2, Info,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/lib/auth"

const EDITABLE_FIELDS = [
  { key: "price",        label: "Price (PKR)",   type: "number", step: "0.01" },
  { key: "cost",         label: "Cost (PKR)",    type: "number", step: "0.01" },
  { key: "minimumStock", label: "Min Stock",     type: "number", step: "1"    },
  { key: "locationId",   label: "Location",      type: "select"               },
  { key: "categoryId",   label: "Category",      type: "select"               },
  { key: "receivedAs",   label: "Receive As",    type: "select"               },
]

// ─── Small helper: shows PKR for number fields ───────────────────────────────
function FieldInput({ field, value, onChange, locations, categories }) {
  const { key, type, step } = field
  if (type === "select") {
    let options = null
    if (key === "locationId") {
      options = locations.map(l => <SelectItem key={l.id} value={l.id}>{l.code} – {l.zone}</SelectItem>)
    } else if (key === "categoryId") {
      options = [
        <SelectItem key="none" value="none">No Category</SelectItem>,
        ...categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>),
      ]
    } else if (key === "receivedAs") {
      options = [
        <SelectItem key="FINISHED" value="FINISHED">Finished Good</SelectItem>,
        <SelectItem key="RAW"      value="RAW">Raw Material</SelectItem>,
      ]
    }
    return (
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="— select —" /></SelectTrigger>
        <SelectContent>{options}</SelectContent>
      </Select>
    )
  }
  return (
    <div className="relative">
      {(key === "price" || key === "cost") && (
        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground font-medium pointer-events-none">Rs</span>
      )}
      <Input
        type="number"
        step={step}
        min="0"
        className={`h-8 text-xs ${key === "price" || key === "cost" ? "pl-7" : ""}`}
        value={value}
        placeholder="—"
        onChange={e => onChange(e.target.value)}
      />
    </div>
  )
}

// ─── Status pill for qty change preview ──────────────────────────────────────
function QtyDelta({ current, next, unit }) {
  const delta = next - current
  if (delta === 0) return (
    <span className="text-xs text-muted-foreground font-mono">{next} {unit}</span>
  )
  const positive = delta > 0
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-mono font-medium ${positive ? "text-emerald-600" : "text-red-600"}`}>
      {positive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {next} {unit}
      <span className="opacity-70">({positive ? "+" : ""}{delta})</span>
    </span>
  )
}

// ─── Main Component ──────────────────────────────────────────────────────────
export default function BulkEditModal({
  isOpen, onClose, selectedItems, itemType, onUpdate,
  suppliers = [], locations = [], categories = [],
}) {
  const [activeTab,     setActiveTab]     = useState("fields")
  const [globalFields,  setGlobalFields]  = useState({ price: "", cost: "", minimumStock: "", locationId: "", categoryId: "", receivedAs: "" })
  const [perItemFields, setPerItemFields] = useState({})
  const [adjustments,   setAdjustments]   = useState([])
  const [reference,     setReference]     = useState("")
  const [globalReason,  setGlobalReason]  = useState("")
  const [isSubmitting,  setIsSubmitting]  = useState(false)

  const { toast } = useToast()
  const { user }  = useAuth()

  // ── Init ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!selectedItems.length) return

    setAdjustments(selectedItems.map(item => ({
      id:              item.id,
      name:            item.name,
      sku:             item.sku,
      currentQuantity: item.quantity,
      unit:            item.unit,
      type:            "INCREASE",
      quantity:        0,
      reason:          "",
      newQuantity:     item.quantity,
    })))

    const map = {}
    for (const item of selectedItems) {
      map[item.id] = {
        price:        item.price?.toString()        ?? "",
        cost:         item.cost?.toString()         ?? "",
        minimumStock: item.minimumStock?.toString() ?? "",
        locationId:   item.locationId              ?? "",
        categoryId:   item.categoryId              ?? "",
        receivedAs:   item.receivedAs              ?? "",
      }
    }
    setPerItemFields(map)
    setGlobalFields({ price: "", cost: "", minimumStock: "", locationId: "", categoryId: "", receivedAs: "" })
    setReference("")
    setGlobalReason("")
  }, [selectedItems])

  // ── Field helpers ─────────────────────────────────────────────────────────
  const applyGlobalField = (key, value) => {
    setPerItemFields(prev => {
      const next = { ...prev }
      for (const id of Object.keys(next)) next[id] = { ...next[id], [key]: value }
      return next
    })
  }

  const updatePerItemField = (itemId, key, value) => {
    setPerItemFields(prev => ({ ...prev, [itemId]: { ...prev[itemId], [key]: value } }))
  }

  // ── Qty helpers ───────────────────────────────────────────────────────────
  const updateAdjustment = (id, field, value) => {
    setAdjustments(prev => prev.map(adj => {
      if (adj.id !== id) return adj
      const updated = { ...adj, [field]: value }
      if (field === "type" || field === "quantity") {
        const qty  = field === "quantity" ? parseInt(value) || 0 : parseInt(adj.quantity) || 0
        const type = field === "type"     ? value             : adj.type
        updated.newQuantity = type === "INCREASE"
          ? adj.currentQuantity + qty
          : Math.max(0, adj.currentQuantity - qty)
      }
      return updated
    }))
  }

  const applyGlobalReasonToAll = () => {
    if (!globalReason.trim()) return
    setAdjustments(prev => prev.map(adj => ({ ...adj, reason: globalReason })))
  }

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    const payload = selectedItems.map(item => {
      const entry        = { id: item.id }
      const itemFields   = perItemFields[item.id] ?? {}
      const original     = {
        price:        item.price?.toString()        ?? "",
        cost:         item.cost?.toString()         ?? "",
        minimumStock: item.minimumStock?.toString() ?? "",
        locationId:   item.locationId              ?? "",
        categoryId:   item.categoryId              ?? "",
        receivedAs:   item.receivedAs              ?? "",
      }
      const changedFields = {}
      for (const key of Object.keys(original)) {
        if (itemFields[key] !== undefined && itemFields[key] !== original[key]) {
          changedFields[key] = itemFields[key]
        }
      }
      if (Object.keys(changedFields).length > 0) entry.fields = changedFields

      const adj = adjustments.find(a => a.id === item.id)
      if (adj && adj.quantity > 0 && adj.reason.trim()) {
        entry.type     = adj.type
        entry.quantity = parseInt(adj.quantity)
        entry.reason   = adj.reason.trim()
      }
      return entry
    })

    const hasAnyChange = payload.some(e => (e.fields && Object.keys(e.fields).length > 0) || e.quantity)
    if (!hasAnyChange) {
      toast({ title: "Nothing to save", description: "Make at least one field change or quantity adjustment.", variant: "destructive" })
      return
    }

    setIsSubmitting(true)
    try {
      const res = await fetch(`/api/inventory/${itemType}/bulk-adjust`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          adjustments: payload,
          userId:      user.id,
          reference:   reference || `Bulk edit ${new Date().toISOString()}`,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Failed to apply bulk changes")
      }
      const data = await res.json()
      toast({ title: "Saved", description: `Updated ${data.summary?.itemsUpdated ?? selectedItems.length} items successfully` })
      onUpdate()
      onClose()
    } catch (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" })
    } finally {
      setIsSubmitting(false)
    }
  }

  const validAdjustments = adjustments.filter(a => a.quantity > 0 && a.reason.trim())
  const dirtyFields      = selectedItems.filter(item => {
    const f = perItemFields[item.id] ?? {}
    const o = { price: item.price?.toString() ?? "", cost: item.cost?.toString() ?? "", minimumStock: item.minimumStock?.toString() ?? "", locationId: item.locationId ?? "", categoryId: item.categoryId ?? "", receivedAs: item.receivedAs ?? "" }
    return Object.keys(o).some(k => f[k] !== undefined && f[k] !== o[k])
  })

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl max-h-[92vh] overflow-hidden flex flex-col gap-0 p-0">

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Package className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h2 className="text-base font-semibold leading-tight">Bulk Edit</h2>
              <p className="text-xs text-muted-foreground">
                {selectedItems.length} item{selectedItems.length !== 1 ? "s" : ""} selected
              </p>
            </div>
          </div>

          {/* Quick stats */}
          <div className="hidden sm:flex items-center gap-3">
            {dirtyFields.length > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
                <CheckCircle2 className="h-3.5 w-3.5 text-blue-600" />
                <span className="text-xs font-medium text-blue-700 dark:text-blue-400">{dirtyFields.length} field change{dirtyFields.length !== 1 ? "s" : ""}</span>
              </div>
            )}
            {validAdjustments.length > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
                <ArrowUpDown className="h-3.5 w-3.5 text-emerald-600" />
                <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">{validAdjustments.length} qty adjustment{validAdjustments.length !== 1 ? "s" : ""}</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col px-6 py-4 gap-4">

          {/* ── Reference row ── */}
          <div className="flex-shrink-0 flex gap-3 items-end p-3.5 bg-muted/40 rounded-xl border border-border/50">
            <div className="flex-1 max-w-sm">
              <Label htmlFor="reference" className="text-xs font-medium">Reference <span className="text-muted-foreground font-normal">(optional)</span></Label>
              <Input
                id="reference"
                value={reference}
                onChange={e => setReference(e.target.value)}
                placeholder="e.g. Q2 stock correction"
                className="h-8 mt-1 text-sm"
              />
            </div>
            <p className="text-xs text-muted-foreground pb-1.5">
              Changes are logged against this reference
            </p>
          </div>

          {/* ── Tabs ── */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-hidden flex flex-col">
            <TabsList className="flex-shrink-0 w-fit">
              <TabsTrigger value="fields" className="flex items-center gap-1.5 text-xs">
                <SlidersHorizontal className="h-3.5 w-3.5" />
                Field Edits
                {dirtyFields.length > 0 && (
                  <span className="ml-1 inline-flex items-center justify-center h-4 min-w-[16px] px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-semibold">
                    {dirtyFields.length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="quantities" className="flex items-center gap-1.5 text-xs">
                <ArrowUpDown className="h-3.5 w-3.5" />
                Qty Adjustments
                {validAdjustments.length > 0 && (
                  <span className="ml-1 inline-flex items-center justify-center h-4 min-w-[16px] px-1 rounded-full bg-emerald-600 text-white text-[10px] font-semibold">
                    {validAdjustments.length}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>

            {/* ══ FIELD EDITS ══════════════════════════════════════════════ */}
            <TabsContent value="fields" className="flex-1 overflow-hidden flex flex-col gap-3 mt-3">

              {/* Global apply strip */}
              <div className="flex-shrink-0 p-3.5 border rounded-xl bg-muted/30">
                <div className="flex items-center gap-2 mb-2.5">
                  <Info className="h-3.5 w-3.5 text-muted-foreground" />
                  <p className="text-xs font-semibold text-muted-foreground">Apply one value to all items at once</p>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
                  {EDITABLE_FIELDS.map(({ key, label, type, step }) => (
                    <div key={key}>
                      <Label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">{label}</Label>
                      <div className="mt-1">
                        {type === "select" ? (
                          <Select
                            value={globalFields[key]}
                            onValueChange={val => {
                              setGlobalFields(p => ({ ...p, [key]: val }))
                              applyGlobalField(key, val)
                            }}
                          >
                            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="— all —" /></SelectTrigger>
                            <SelectContent>
                              {key === "locationId" && locations.map(l => <SelectItem key={l.id} value={l.id}>{l.code} – {l.zone}</SelectItem>)}
                              {key === "categoryId" && [
                                <SelectItem key="none" value="none">No Category</SelectItem>,
                                ...categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>),
                              ]}
                              {key === "receivedAs" && [
                                <SelectItem key="FINISHED" value="FINISHED">Finished Good</SelectItem>,
                                <SelectItem key="RAW"      value="RAW">Raw Material</SelectItem>,
                              ]}
                            </SelectContent>
                          </Select>
                        ) : (
                          <div className="flex gap-1">
                            <div className="relative flex-1">
                              {(key === "price" || key === "cost") && (
                                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground pointer-events-none">Rs</span>
                              )}
                              <Input
                                type="number"
                                step={step}
                                min="0"
                                className={`h-8 text-xs ${key === "price" || key === "cost" ? "pl-6" : ""}`}
                                value={globalFields[key]}
                                placeholder="—"
                                onChange={e => setGlobalFields(p => ({ ...p, [key]: e.target.value }))}
                              />
                            </div>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="h-8 w-8 p-0 text-xs flex-shrink-0"
                              disabled={!globalFields[key]}
                              onClick={() => applyGlobalField(key, globalFields[key])}
                              title="Apply to all"
                            >
                              <ChevronRight className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Per-item rows */}
              <div className="flex-1 overflow-auto space-y-2 pr-1">
                {selectedItems.map(item => {
                  const fields   = perItemFields[item.id] ?? {}
                  const original = { price: item.price?.toString() ?? "", cost: item.cost?.toString() ?? "", minimumStock: item.minimumStock?.toString() ?? "", locationId: item.locationId ?? "", categoryId: item.categoryId ?? "", receivedAs: item.receivedAs ?? "" }
                  const isDirty  = Object.keys(original).some(k => fields[k] !== undefined && fields[k] !== original[k])

                  return (
                    <div
                      key={item.id}
                      className={`border rounded-xl p-3 transition-colors ${isDirty ? "border-primary/40 bg-primary/[0.02]" : "border-border/60"}`}
                    >
                      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-end">

                        {/* Name col */}
                        <div className="lg:col-span-3 flex items-start gap-2">
                          {isDirty && <div className="mt-1 h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0" />}
                          <div className="min-w-0">
                            <p className="font-medium text-sm leading-snug truncate">{item.name}</p>
                            <p className="text-[11px] text-muted-foreground font-mono">{item.sku}</p>
                          </div>
                        </div>

                        {/* Price */}
                        <div className="lg:col-span-2">
                          <Label className="text-[10px] text-muted-foreground uppercase tracking-wide">Price (PKR)</Label>
                          <div className="relative mt-0.5">
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground pointer-events-none">Rs</span>
                            <Input type="number" step="0.01" min="0" className="h-8 text-xs pl-6" value={fields.price ?? ""} onChange={e => updatePerItemField(item.id, "price", e.target.value)} />
                          </div>
                        </div>

                        {/* Cost */}
                        <div className="lg:col-span-2">
                          <Label className="text-[10px] text-muted-foreground uppercase tracking-wide">Cost (PKR)</Label>
                          <div className="relative mt-0.5">
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground pointer-events-none">Rs</span>
                            <Input type="number" step="0.01" min="0" className="h-8 text-xs pl-6" value={fields.cost ?? ""} onChange={e => updatePerItemField(item.id, "cost", e.target.value)} />
                          </div>
                        </div>

                        {/* Min Stock */}
                        <div className="lg:col-span-1">
                          <Label className="text-[10px] text-muted-foreground uppercase tracking-wide">Min</Label>
                          <Input type="number" min="0" className="h-8 text-xs mt-0.5" value={fields.minimumStock ?? ""} onChange={e => updatePerItemField(item.id, "minimumStock", e.target.value)} />
                        </div>

                        {/* Location */}
                        <div className="lg:col-span-2">
                          <Label className="text-[10px] text-muted-foreground uppercase tracking-wide">Location</Label>
                          <Select value={fields.locationId ?? ""} onValueChange={val => updatePerItemField(item.id, "locationId", val)}>
                            <SelectTrigger className="h-8 text-xs mt-0.5"><SelectValue placeholder="Select…" /></SelectTrigger>
                            <SelectContent>
                              {locations.map(l => <SelectItem key={l.id} value={l.id}>{l.code} – {l.zone}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Category */}
                        <div className="lg:col-span-2">
                          <Label className="text-[10px] text-muted-foreground uppercase tracking-wide">Category</Label>
                          <Select value={fields.categoryId ?? ""} onValueChange={val => updatePerItemField(item.id, "categoryId", val)}>
                            <SelectTrigger className="h-8 text-xs mt-0.5"><SelectValue placeholder="Select…" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">No Category</SelectItem>
                              {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Receive As */}
                        <div className="lg:col-span-2 lg:col-start-11">
                          <Label className="text-[10px] text-muted-foreground uppercase tracking-wide">Recv. as</Label>
                          <Select value={fields.receivedAs ?? ""} onValueChange={val => updatePerItemField(item.id, "receivedAs", val)}>
                            <SelectTrigger className="h-8 text-xs mt-0.5"><SelectValue placeholder="Select…" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="FINISHED">Finished Good</SelectItem>
                              <SelectItem value="RAW">Raw Material</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                      </div>
                    </div>
                  )
                })}
              </div>
            </TabsContent>

            {/* ══ QUANTITY ADJUSTMENTS ════════════════════════════════════ */}
            <TabsContent value="quantities" className="flex-1 overflow-hidden flex flex-col gap-3 mt-3">

              {/* Global reason strip */}
              <div className="flex-shrink-0 flex gap-3 items-end p-3.5 border rounded-xl bg-muted/30">
                <div className="flex-1 max-w-sm">
                  <Label htmlFor="globalReason" className="text-xs font-medium">Apply reason to all rows</Label>
                  <Input
                    id="globalReason"
                    className="h-8 mt-1 text-xs"
                    value={globalReason}
                    onChange={e => setGlobalReason(e.target.value)}
                    placeholder="e.g. Annual stocktake correction"
                  />
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={applyGlobalReasonToAll}
                  disabled={!globalReason.trim()}
                  className="h-8"
                >
                  Apply to all
                </Button>
              </div>

              {/* Column headers */}
              <div className="flex-shrink-0 hidden lg:grid grid-cols-12 gap-3 px-3 pb-1">
                {["Item", "Type", "Qty", "New Qty", "Reason"].map((h, i) => (
                  <div
                    key={h}
                    className={`text-[10px] font-semibold uppercase tracking-wider text-muted-foreground ${
                      i === 0 ? "col-span-3" : i === 1 ? "col-span-2" : i === 2 ? "col-span-1" : i === 3 ? "col-span-2" : "col-span-4"
                    }`}
                  >
                    {h}
                  </div>
                ))}
              </div>

              {/* Per-item rows */}
              <div className="flex-1 overflow-auto space-y-2 pr-1">
                {adjustments.map(adj => {
                  const hasChange = adj.quantity > 0
                  const hasReason = adj.reason.trim().length > 0
                  const isValid   = hasChange && hasReason
                  const delta     = adj.newQuantity - adj.currentQuantity

                  return (
                    <div
                      key={adj.id}
                      className={`border rounded-xl p-3 transition-colors ${
                        isValid   ? "border-emerald-300 bg-emerald-50/40 dark:border-emerald-800 dark:bg-emerald-950/20" :
                        hasChange ? "border-amber-300 bg-amber-50/30 dark:border-amber-800 dark:bg-amber-950/20" :
                        "border-border/60"
                      }`}
                    >
                      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-center">

                        {/* Name */}
                        <div className="lg:col-span-3 flex items-start gap-2">
                          <div className={`mt-1 h-1.5 w-1.5 rounded-full flex-shrink-0 ${isValid ? "bg-emerald-500" : hasChange ? "bg-amber-500" : "bg-muted-foreground/30"}`} />
                          <div className="min-w-0">
                            <p className="font-medium text-sm leading-snug truncate">{adj.name}</p>
                            <p className="text-[11px] text-muted-foreground font-mono">{adj.sku}</p>
                            <span className="inline-block mt-1 text-[10px] px-1.5 py-0.5 rounded-md bg-muted border border-border/50 text-muted-foreground font-mono">
                              {adj.currentQuantity} {adj.unit}
                            </span>
                          </div>
                        </div>

                        {/* Type */}
                        <div className="lg:col-span-2">
                          <Label className="text-[10px] text-muted-foreground uppercase tracking-wide lg:hidden">Type</Label>
                          <Select value={adj.type} onValueChange={val => updateAdjustment(adj.id, "type", val)}>
                            <SelectTrigger className={`h-8 text-xs mt-0.5 ${adj.type === "INCREASE" ? "border-emerald-300 text-emerald-700 dark:text-emerald-400" : "border-red-300 text-red-600 dark:text-red-400"}`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="INCREASE">
                                <span className="flex items-center gap-1.5 text-emerald-600"><TrendingUp className="h-3 w-3" /> Increase</span>
                              </SelectItem>
                              <SelectItem value="DECREASE">
                                <span className="flex items-center gap-1.5 text-red-600"><TrendingDown className="h-3 w-3" /> Decrease</span>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Qty */}
                        <div className="lg:col-span-1">
                          <Label className="text-[10px] text-muted-foreground uppercase tracking-wide lg:hidden">Quantity</Label>
                          <Input
                            type="number"
                            min="0"
                            className="h-8 text-xs mt-0.5"
                            value={adj.quantity}
                            onChange={e => updateAdjustment(adj.id, "quantity", e.target.value)}
                          />
                        </div>

                        {/* New qty preview */}
                        <div className="lg:col-span-2">
                          <Label className="text-[10px] text-muted-foreground uppercase tracking-wide lg:hidden">New Qty</Label>
                          <div className="h-8 px-2.5 flex items-center rounded-lg bg-muted border border-border/50 gap-1.5 mt-0.5">
                            <QtyDelta current={adj.currentQuantity} next={adj.newQuantity} unit={adj.unit} />
                            {adj.newQuantity < 0 && <AlertTriangle className="h-3.5 w-3.5 text-destructive flex-shrink-0" />}
                          </div>
                        </div>

                        {/* Reason */}
                        <div className="lg:col-span-4">
                          <Label className="text-[10px] text-muted-foreground uppercase tracking-wide lg:hidden">
                            Reason <span className="text-red-500">*</span>
                          </Label>
                          <Input
                            className={`h-8 text-xs mt-0.5 ${hasChange && !hasReason ? "border-amber-400 focus-visible:ring-amber-400/30" : ""}`}
                            value={adj.reason}
                            onChange={e => updateAdjustment(adj.id, "reason", e.target.value)}
                            placeholder={hasChange ? "Reason required to log adjustment" : "Reason for adjustment"}
                          />
                        </div>

                      </div>
                    </div>
                  )
                })}
              </div>
            </TabsContent>
          </Tabs>

          {/* ── Footer ── */}
          <div className="flex-shrink-0 flex flex-wrap justify-between items-center gap-3 pt-3 border-t">
            <div className="flex items-center gap-2 text-xs">
              {activeTab === "quantities" ? (
                validAdjustments.length > 0 ? (
                  <span className="flex items-center gap-1.5 text-emerald-600 font-medium">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    {validAdjustments.length} adjustment{validAdjustments.length !== 1 ? "s" : ""} ready to save
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <Info className="h-3.5 w-3.5" />
                    Enter a quantity and reason to log adjustments
                  </span>
                )
              ) : (
                dirtyFields.length > 0 ? (
                  <span className="flex items-center gap-1.5 text-blue-600 font-medium">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    {dirtyFields.length} item{dirtyFields.length !== 1 ? "s" : ""} with field changes
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <Info className="h-3.5 w-3.5" />
                    Unchanged values will be skipped
                  </span>
                )
              )}
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose} disabled={isSubmitting} className="h-9">
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={isSubmitting} className="h-9">
                {isSubmitting
                  ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving…</>
                  : <><Save className="mr-2 h-4 w-4" />Save Changes</>
                }
              </Button>
            </div>
          </div>

        </div>
      </DialogContent>
    </Dialog>
  )
}
