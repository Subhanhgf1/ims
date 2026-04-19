"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Loader2, Calculator, Save, AlertCircle, TrendingUp } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/lib/auth"

export default function SmartMinStockModal({
  isOpen,
  onClose,
  selectedIds = [], // if empty, applies to all
  onUpdate,
}) {
  const [lookbackDays, setLookbackDays] = useState(30)
  const [targetDays, setTargetDays] = useState(7)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [suggestions, setSuggestions] = useState([])
  const [excludedIds, setExcludedIds] = useState(new Set())
  
  const { toast } = useToast()
  const { user } = useAuth()

  const calculateSuggestions = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/inventory/finished-goods/suggest-min-stock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ids: selectedIds,
          lookbackDays: parseInt(lookbackDays),
          targetDays: parseInt(targetDays),
        }),
      })

      if (!response.ok) throw new Error("Failed to fetch suggestions")
      
      const data = await response.json()
      setSuggestions(data.suggestions || [])
      setExcludedIds(new Set())
    } catch (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    const finalSuggestions = suggestions.filter(s => !excludedIds.has(s.id))
    if (finalSuggestions.length === 0) {
      toast({ title: "No changes", description: "All suggestions are excluded or none were generated." })
      return
    }

    setSaving(true)
    try {
      const adjustments = finalSuggestions.map(s => ({
        id: s.id,
        fields: { 
          minimumStock: s.suggestedMin.toString(),
          targetDays: targetDays.toString(),
          dailyConsumption: s.dailyAvg.toString()
        }
      }))

      const response = await fetch("/api/inventory/finished-goods/bulk-adjust", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          adjustments,
          userId: user.id,
          reference: `Smart Min Stock Automation (${targetDays} days maintenance)`
        }),
      })

      if (!response.ok) throw new Error("Failed to apply changes")

      toast({ title: "Success", description: `Updated ${finalSuggestions.length} items.` })
      onUpdate()
      onClose()
    } catch (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  const toggleExclusion = (id) => {
    setExcludedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5 text-primary" />
            Smart Minimum Stock Automation
          </DialogTitle>
          <DialogDescription>
            {selectedIds.length > 0 
              ? `Calculating for ${selectedIds.length} selected items.`
              : "Calculating for ALL finished goods in inventory."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-6 p-4 bg-muted/40 rounded-lg border border-dashed">
          <div className="space-y-2">
            <Label htmlFor="lookback" className="text-xs">Analysis Period (Look-back Days)</Label>
            <div className="flex gap-2">
              <Input
                id="lookback"
                type="number"
                value={lookbackDays}
                onChange={(e) => setLookbackDays(e.target.value)}
                placeholder="e.g. 30"
              />
              <Badge variant="outline" className="shrink-0 flex items-center justify-center p-2">Days</Badge>
            </div>
            <p className="text-[10px] text-muted-foreground">Historical data period to calculate daily average.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="target" className="text-xs">Stock Maintenance (Target Days)</Label>
            <div className="flex gap-2">
              <Input
                id="target"
                type="number"
                value={targetDays}
                onChange={(e) => setTargetDays(e.target.value)}
                placeholder="e.g. 7"
              />
              <Badge variant="outline" className="shrink-0 flex items-center justify-center p-2">Days</Badge>
            </div>
            <p className="text-[10px] text-muted-foreground">Target days of inventory to keep in stock.</p>
          </div>
        </div>

        <div className="flex justify-center py-2">
          <Button 
            onClick={calculateSuggestions} 
            disabled={loading || !lookbackDays || !targetDays}
            className="w-full md:w-auto px-8"
          >
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <TrendingUp className="mr-2 h-4 w-4" />}
            Run Calculation
          </Button>
        </div>

        <div className="flex-1 overflow-auto border rounded-md mt-2">
          <Table>
            <TableHeader className="sticky top-0 bg-background z-10">
              <TableRow>
                <TableHead className="w-[100px]">Incl.</TableHead>
                <TableHead>Item</TableHead>
                <TableHead className="text-right">30d Total</TableHead>
                <TableHead className="text-right">Daily Avg</TableHead>
                <TableHead className="text-right">Current Min</TableHead>
                <TableHead className="text-right font-bold">New Suggested</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {suggestions.length > 0 ? (
                suggestions.map((s) => {
                  const isExcluded = excludedIds.has(s.id)
                  const hasIncrease = s.suggestedMin > s.currentMin
                  
                  return (
                    <TableRow key={s.id} className={isExcluded ? "opacity-40 grayscale" : ""}>
                      <TableCell>
                        <Input 
                          type="checkbox" 
                          className="h-4 w-4"
                          checked={!isExcluded}
                          onChange={() => toggleExclusion(s.id)}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{s.name}</div>
                        <div className="text-xs text-muted-foreground">{s.sku}</div>
                      </TableCell>
                      <TableCell className="text-right">{s.totalOutbound}</TableCell>
                      <TableCell className="text-right">{s.dailyAvg}</TableCell>
                      <TableCell className="text-right">{s.currentMin}</TableCell>
                      <TableCell className={`text-right font-bold ${hasIncrease ? "text-primary" : "text-muted-foreground"}`}>
                        {s.suggestedMin}
                      </TableCell>
                    </TableRow>
                  )
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                    {loading ? "Analyzing data..." : "Run calculation to see suggested minimum stock levels."}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {suggestions.length > 0 && (
          <div className="p-3 bg-primary/5 rounded-md border border-primary/20 flex items-start gap-3 mt-4">
            <AlertCircle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <p className="text-xs text-primary/80 leading-relaxed">
              <strong>Summary:</strong> You are about to update {suggestions.length - excludedIds.size} items with new minimum stock levels based on a {targetDays}-day maintenance target. 
              Review the suggestions in the table before saving.
            </p>
          </div>
        )}

        <DialogFooter className="mt-4 pt-4 border-t">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || suggestions.length === 0 || excludedIds.size === suggestions.length}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Apply Suggestions
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
