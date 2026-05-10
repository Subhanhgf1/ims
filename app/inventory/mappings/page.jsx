"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Plus, Trash2, Search, ExternalLink, Loader2 } from "lucide-react"
import { toast } from "@/components/ui/use-toast"

export default function SkuMappingsPage() {
  const [mappings, setMappings] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [formData, setFormData] = useState({ externalSku: "", internalSku: "", platform: "", description: "" })

  const fetchMappings = async () => {
    try {
      const res = await fetch("/api/inventory/mappings")
      const data = await res.json()
      setMappings(data)
    } catch (error) {
      toast({ title: "Error", description: "Failed to load mappings", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMappings()
  }, [])

  const handleAddMapping = async (e) => {
    e.preventDefault()
    try {
      const res = await fetch("/api/inventory/mappings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      })
      if (!res.ok) throw new Error("Failed to save mapping")
      
      toast({ title: "Success", description: "SKU Mapping added" })
      setIsAddOpen(false)
      setFormData({ externalSku: "", internalSku: "", platform: "", description: "" })
      fetchMappings()
    } catch (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" })
    }
  }

  const handleDelete = async (id) => {
    if (!confirm("Are you sure?")) return
    try {
      await fetch(`/api/inventory/mappings/${id}`, { method: "DELETE" })
      toast({ title: "Deleted", description: "Mapping removed" })
      fetchMappings()
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete mapping" })
    }
  }

  const filteredMappings = mappings.filter(m => 
    m.externalSku.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.internalSku.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">SKU Mappings</h1>
          <p className="text-muted-foreground">Link marketplace SKUs (Shopify, Daraz) to internal IMS SKUs</p>
        </div>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" /> Add Mapping
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Mapping</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAddMapping} className="space-y-4">
              <div className="space-y-2">
                <Label>External SKU (Marketplace)</Label>
                <Input 
                  placeholder="e.g. SHOPIFY-SKU-123" 
                  value={formData.externalSku} 
                  onChange={e => setFormData({...formData, externalSku: e.target.value})}
                  required 
                />
              </div>
              <div className="space-y-2">
                <Label>Internal SKU (IMS)</Label>
                <Input 
                  placeholder="e.g. WH-ITEM-001" 
                  value={formData.internalSku} 
                  onChange={e => setFormData({...formData, internalSku: e.target.value})}
                  required 
                />
              </div>
              <div className="space-y-2">
                <Label>Platform (Optional)</Label>
                <Input 
                  placeholder="e.g. Shopify" 
                  value={formData.platform} 
                  onChange={e => setFormData({...formData, platform: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Input 
                  value={formData.description} 
                  onChange={e => setFormData({...formData, description: e.target.value})}
                />
              </div>
              <Button type="submit" className="w-full">Save Mapping</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search SKUs..."
                className="pl-8"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center p-8"><Loader2 className="animate-spin h-8 w-8 text-muted-foreground" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Marketplace SKU</TableHead>
                  <TableHead>IMS Internal SKU</TableHead>
                  <TableHead>Platform</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMappings.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                      No mappings found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredMappings.map(m => (
                    <TableRow key={m.id}>
                      <TableCell className="font-mono">{m.externalSku}</TableCell>
                      <TableCell className="font-mono font-bold text-indigo-600">{m.internalSku}</TableCell>
                      <TableCell>{m.platform || "—"}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(m.id)}>
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
