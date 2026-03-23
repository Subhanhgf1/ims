"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/lib/auth"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/hooks/use-toast"
import { Plus, Edit, Trash2, Loader2 } from "lucide-react"
import { getStatusColor, formatDate } from "@/lib/utils"

export default function Settings() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [activeSection, setActiveSection] = useState("users")
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  // Data states
  const [users, setUsers] = useState([])
  const [locations, setLocations] = useState([])
  const [suppliers, setSuppliers] = useState([])
  const [customers, setCustomers] = useState([])
  const [inventorySettings, setInventorySettings] = useState({})
  const [systemPreferences, setSystemPreferences] = useState({})
  const [notificationSettings, setNotificationSettings] = useState({})

  // Dialog states
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedItem, setSelectedItem] = useState(null)

  // Form states
  const [formData, setFormData] = useState({})

  useEffect(() => {
    fetchData()
  }, [activeSection])

  const fetchData = async () => {
    try {
      setLoading(true)

      switch (activeSection) {
        case "general":
          await fetchInventorySettings()
          await fetchSystemPreferences()
          break
        case "users":
          await fetchUsers()
          break
        case "locations":
          await fetchLocations()
          break
        case "suppliers":
          await fetchSuppliers()
          break
        case "customers":
          await fetchCustomers()
          break
        case "notifications":
          await fetchNotificationSettings()
          break
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

  const fetchUsers = async () => {
    const response = await fetch("/api/users")
    if (response.ok) {
      const data = await response.json()
      setUsers(data)
    }
  }

  const fetchLocations = async () => {
    const response = await fetch("/api/locations")
    if (response.ok) {
      const data = await response.json()
      setLocations(data)
    }
  }

  const fetchSuppliers = async () => {
    const response = await fetch("/api/suppliers")
    if (response.ok) {
      const data = await response.json()
      setSuppliers(data)
    }
  }

  const fetchCustomers = async () => {
    const response = await fetch("/api/customers")
    if (response.ok) {
      const data = await response.json()
      setCustomers(data)
    }
  }

  const fetchInventorySettings = async () => {
    const response = await fetch("/api/settings/inventory")
    if (response.ok) {
      const data = await response.json()
      setInventorySettings(data)
    }
  }

  const fetchSystemPreferences = async () => {
    const response = await fetch("/api/settings/preferences")
    if (response.ok) {
      const data = await response.json()
      setSystemPreferences(data)
    }
  }

  const fetchNotificationSettings = async () => {
    const response = await fetch("/api/settings/notifications")
    if (response.ok) {
      const data = await response.json()
      setNotificationSettings(data)
    }
  }

  const handleAdd = async (e) => {
    e.preventDefault()

    try {
      setSubmitting(true)
      let endpoint = ""

      switch (activeSection) {
        case "users":
          endpoint = "/api/users"
          break
        case "locations":
          endpoint = "/api/locations"
          break
        case "suppliers":
          endpoint = "/api/suppliers"
          break
        case "customers":
          endpoint = "/api/customers"
          break
      }

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: `${activeSection.slice(0, -1)} added successfully`,
        })
        setIsAddDialogOpen(false)
        resetForm()
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

  const handleEdit = async (e) => {
    e.preventDefault()

    try {
      setSubmitting(true)
      let endpoint = ""

      switch (activeSection) {
        case "users":
          endpoint = `/api/users/${selectedItem.id}`
          break
        case "locations":
          endpoint = `/api/locations/${selectedItem.id}`
          break
        case "suppliers":
          endpoint = `/api/suppliers/${selectedItem.id}`
          break
        case "customers":
          endpoint = `/api/customers/${selectedItem.id}`
          break
      }

      const response = await fetch(endpoint, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: `${activeSection.slice(0, -1)} updated successfully`,
        })
        setIsEditDialogOpen(false)
        resetForm()
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

  const handleDelete = async () => {
    try {
      setSubmitting(true)
      let endpoint = ""

      switch (activeSection) {
        case "users":
          endpoint = `/api/users/${selectedItem.id}`
          break
        case "locations":
          endpoint = `/api/locations/${selectedItem.id}`
          break
        case "suppliers":
          endpoint = `/api/suppliers/${selectedItem.id}`
          break
        case "customers":
          endpoint = `/api/customers/${selectedItem.id}`
          break
      }

      const response = await fetch(endpoint, {
        method: "DELETE",
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: `${activeSection.slice(0, -1)} deleted successfully`,
        })
        setIsDeleteDialogOpen(false)
        setSelectedItem(null)
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

  const handleSaveInventorySettings = async (e) => {
    e.preventDefault()

    try {
      setSubmitting(true)
      const response = await fetch("/api/settings/inventory", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(inventorySettings),
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: "Inventory settings saved successfully",
        })
      } else {
        throw new Error("Failed to save settings")
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

  const handleSavePreferences = async (e) => {
    e.preventDefault()

    try {
      setSubmitting(true)
      const response = await fetch("/api/settings/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(systemPreferences),
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: "System preferences saved successfully",
        })
      } else {
        throw new Error("Failed to save preferences")
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

  const handleSaveNotifications = async (e) => {
    e.preventDefault()

    try {
      setSubmitting(true)
      const response = await fetch("/api/settings/notifications", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(notificationSettings),
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: "Notification settings saved successfully",
        })
      } else {
        throw new Error("Failed to save notification settings")
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

  const openEditDialog = (item) => {
    setSelectedItem(item)
    setFormData({ ...item })
    setIsEditDialogOpen(true)
  }

  const openDeleteDialog = (item) => {
    setSelectedItem(item)
    setIsDeleteDialogOpen(true)
  }

  const resetForm = () => {
    setFormData({})
    setSelectedItem(null)
  }

  const getRoleColor = (role) => {
    switch (role) {
      case "ADMIN":
        return "bg-red-100 text-red-800"
      case "MANAGER":
        return "bg-blue-100 text-blue-800"
      case "OPERATOR":
        return "bg-green-100 text-green-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const renderGeneralSettings = () => (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Inventory Information</CardTitle>
          <CardDescription>Basic inventory configuration</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSaveInventorySettings}>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="inventory-name">Inventory Name</Label>
                  <Input
                    id="inventory-name"
                    value={inventorySettings.name || ""}
                    onChange={(e) => setInventorySettings((prev) => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="inventory-code">Inventory Code</Label>
                  <Input
                    id="inventory-code"
                    value={inventorySettings.code || ""}
                    onChange={(e) => setInventorySettings((prev) => ({ ...prev, code: e.target.value }))}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  value={inventorySettings.address || ""}
                  onChange={(e) => setInventorySettings((prev) => ({ ...prev, address: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="manager">Inventory Manager</Label>
                  <Input
                    id="manager"
                    value={inventorySettings.manager || ""}
                    onChange={(e) => setInventorySettings((prev) => ({ ...prev, manager: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contact">Contact Number</Label>
                  <Input
                    id="contact"
                    value={inventorySettings.contact || ""}
                    onChange={(e) => setInventorySettings((prev) => ({ ...prev, contact: e.target.value }))}
                  />
                </div>
              </div>
              <Button type="submit" disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>System Preferences</CardTitle>
          <CardDescription>Configure system behavior and defaults</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSavePreferences}>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Auto-generate SKUs</Label>
                  <p className="text-sm text-muted-foreground">Automatically generate SKU codes for new items</p>
                </div>
                <Switch
                  checked={systemPreferences.autoGenerateSKU || false}
                  onCheckedChange={(checked) => setSystemPreferences((prev) => ({ ...prev, autoGenerateSKU: checked }))}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Low stock alerts</Label>
                  <p className="text-sm text-muted-foreground">Send notifications when inventory is low</p>
                </div>
                <Switch
                  checked={systemPreferences.lowStockAlerts || false}
                  onCheckedChange={(checked) => setSystemPreferences((prev) => ({ ...prev, lowStockAlerts: checked }))}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Quality check required</Label>
                  <p className="text-sm text-muted-foreground">Require quality checks for all inbound items</p>
                </div>
                <Switch
                  checked={systemPreferences.qualityCheckRequired || false}
                  onCheckedChange={(checked) =>
                    setSystemPreferences((prev) => ({ ...prev, qualityCheckRequired: checked }))
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Barcode scanning</Label>
                  <p className="text-sm text-muted-foreground">Enable barcode scanning for operations</p>
                </div>
                <Switch
                  checked={systemPreferences.barcodeScanning || false}
                  onCheckedChange={(checked) => setSystemPreferences((prev) => ({ ...prev, barcodeScanning: checked }))}
                />
              </div>
              <Button type="submit" disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Preferences"
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )

  const renderUsersSettings = () => (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>User Management</CardTitle>
            <CardDescription>Manage user accounts and permissions</CardDescription>
          </div>
          {user.role === "ADMIN" && (
            <Button onClick={() => setIsAddDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add User
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Last Login</TableHead>
              {user.role === "ADMIN" && <TableHead>Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((userItem) => (
              <TableRow key={userItem.id}>
                <TableCell className="font-medium">{userItem.name}</TableCell>
                <TableCell>{userItem.email}</TableCell>
                <TableCell>
                  <Badge className={getRoleColor(userItem.role)}>{userItem.role}</Badge>
                </TableCell>
                <TableCell>
                  <Badge className={getStatusColor(userItem.status)}>{userItem.status}</Badge>
                </TableCell>
                <TableCell>{userItem.lastLogin ? formatDate(userItem.lastLogin) : "Never"}</TableCell>
                {user.role === "ADMIN" && (
                  <TableCell>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => openEditDialog(userItem)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      {userItem.id !== user.id && (
                        <Button variant="outline" size="sm" onClick={() => openDeleteDialog(userItem)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )

  const renderLocationsSettings = () => (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Location Management</CardTitle>
            <CardDescription>Manage inventory locations and zones</CardDescription>
          </div>
          {(user.role === "ADMIN" || user.role === "MANAGER") && (
       <Button onClick={() => {
  setFormData({ code: Math.random().toString(36).substring(2, 16).toUpperCase() })
  setIsAddDialogOpen(true)
}}>
  <Plus className="h-4 w-4 mr-2" />
  Add Location
</Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Location Code</TableHead>
              <TableHead>Zone</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Capacity</TableHead>
              <TableHead>Occupied</TableHead>
              <TableHead>Utilization</TableHead>
              {(user.role === "ADMIN" || user.role === "MANAGER") && <TableHead>Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {locations.map((location) => (
              <TableRow key={location.id}>
                <TableCell className="font-medium">{location.name}</TableCell>
                <TableCell className="font-medium">{location.code}</TableCell>
                <TableCell>{location.zone}</TableCell>
                <TableCell>{location.type}</TableCell>
                <TableCell>{location.capacity}</TableCell>
                <TableCell>{location.occupied}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className="w-16 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full"
                        style={{ width: `${Math.min((location.occupied / location.capacity) * 100, 100)}%` }}
                      />
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {Math.round((location.occupied / location.capacity) * 100)}%
                    </span>
                  </div>
                </TableCell>
                {(user.role === "ADMIN" || user.role === "MANAGER") && (
                  <TableCell>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => openEditDialog(location)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => openDeleteDialog(location)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )

  const renderSuppliersSettings = () => (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Supplier Management</CardTitle>
            <CardDescription>Manage supplier information and relationships</CardDescription>
          </div>
          {(user.role === "ADMIN" || user.role === "MANAGER") && (
            <Button onClick={() => setIsAddDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Supplier
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Company Name</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Rating</TableHead>
              <TableHead>Status</TableHead>
              {(user.role === "ADMIN" || user.role === "MANAGER") && <TableHead>Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {suppliers.map((supplier) => (
              <TableRow key={supplier.id}>
                <TableCell className="font-medium">{supplier.name}</TableCell>
                <TableCell>{supplier.email}</TableCell>
                <TableCell>{supplier.phone}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <span className="text-yellow-500">★</span>
                    <span>{supplier.rating?.toFixed(1) || "0.0"}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge className={getStatusColor(supplier.status)}>{supplier.status}</Badge>
                </TableCell>
                {(user.role === "ADMIN" || user.role === "MANAGER") && (
                  <TableCell>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => openEditDialog(supplier)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => openDeleteDialog(supplier)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )

  const renderCustomersSettings = () => (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Customer Management</CardTitle>
            <CardDescription>Manage customer information and relationships</CardDescription>
          </div>
          {(user.role === "ADMIN" || user.role === "MANAGER") && (
            <Button onClick={() => setIsAddDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Customer
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Company Name</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Status</TableHead>
              {(user.role === "ADMIN" || user.role === "MANAGER") && <TableHead>Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {customers.map((customer) => (
              <TableRow key={customer.id}>
                <TableCell className="font-medium">{customer.name}</TableCell>
                <TableCell>{customer.email}</TableCell>
                <TableCell>{customer.phone}</TableCell>
                <TableCell>
                  <Badge className={getStatusColor(customer.status)}>{customer.status}</Badge>
                </TableCell>
                {(user.role === "ADMIN" || user.role === "MANAGER") && (
                  <TableCell>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => openEditDialog(customer)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => openDeleteDialog(customer)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )

  const renderNotificationsSettings = () => (
    <Card>
      <CardHeader>
        <CardTitle>Notification Settings</CardTitle>
        <CardDescription>Configure system notifications and alerts</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSaveNotifications}>
          <div className="space-y-6">
            <div className="space-y-4">
              <h4 className="text-sm font-medium">Inventory Alerts</h4>
              <div className="space-y-4">
                {/* <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Low stock notifications</Label>
                    <p className="text-sm text-muted-foreground">Alert when inventory falls below minimum threshold</p>
                  </div>
                  <Switch
                    checked={notificationSettings.lowStockNotifications || false}
                    onCheckedChange={(checked) =>
                      setNotificationSettings((prev) => ({ ...prev, lowStockNotifications: checked }))
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Overstock notifications</Label>
                    <p className="text-sm text-muted-foreground">Alert when inventory exceeds maximum threshold</p>
                  </div>
                  <Switch
                    checked={notificationSettings.overstockNotifications || false}
                    onCheckedChange={(checked) =>
                      setNotificationSettings((prev) => ({ ...prev, overstockNotifications: checked }))
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Expiry date alerts</Label>
                    <p className="text-sm text-muted-foreground">Alert for items approaching expiry</p>
                  </div>
                  <Switch
                    checked={notificationSettings.expiryAlerts || false}
                    onCheckedChange={(checked) =>
                      setNotificationSettings((prev) => ({ ...prev, expiryAlerts: checked }))
                    }
                  />
                </div> */}
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-sm font-medium">Order Notifications</h4>
              <div className="space-y-4">
                {/* <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>New order alerts</Label>
                    <p className="text-sm text-muted-foreground">Notify when new orders are received</p>
                  </div>
                  <Switch
                    checked={notificationSettings.newOrderAlerts || false}
                    onCheckedChange={(checked) =>
                      setNotificationSettings((prev) => ({ ...prev, newOrderAlerts: checked }))
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Shipment updates</Label>
                    <p className="text-sm text-muted-foreground">Notify on shipment status changes</p>
                  </div>
                  <Switch
                    checked={notificationSettings.shipmentUpdates || false}
                    onCheckedChange={(checked) =>
                      setNotificationSettings((prev) => ({ ...prev, shipmentUpdates: checked }))
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Delivery confirmations</Label>
                    <p className="text-sm text-muted-foreground">Notify when deliveries are confirmed</p>
                  </div>
                  <Switch
                    checked={notificationSettings.deliveryConfirmations || false}
                    onCheckedChange={(checked) =>
                      setNotificationSettings((prev) => ({ ...prev, deliveryConfirmations: checked }))
                    }
                  />
                </div> */}
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-sm font-medium">System Notifications</h4>
              <div className="space-y-4">
                {/* <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>System maintenance</Label>
                    <p className="text-sm text-muted-foreground">Notify about scheduled maintenance</p>
                  </div>
                  <Switch
                    checked={notificationSettings.systemMaintenance || false}
                    onCheckedChange={(checked) =>
                      setNotificationSettings((prev) => ({ ...prev, systemMaintenance: checked }))
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Security alerts</Label>
                    <p className="text-sm text-muted-foreground">Notify about security-related events</p>
                  </div>
                  <Switch
                    checked={notificationSettings.securityAlerts || false}
                    onCheckedChange={(checked) =>
                      setNotificationSettings((prev) => ({ ...prev, securityAlerts: checked }))
                    }
                  />
                </div> */}
              </div>
            </div>

            <Button type="submit" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Notification Settings"
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      )
    }

    switch (activeSection) {
      case "general":
        return renderGeneralSettings()
      case "users":
        return renderUsersSettings()
      case "locations":
        return renderLocationsSettings()
      case "suppliers":
        return renderSuppliersSettings()
      case "customers":
        return renderCustomersSettings()
      case "notifications":
        return renderNotificationsSettings()
      default:
        return renderGeneralSettings()
    }
  }

  const getDialogTitle = () => {
    const action = isEditDialogOpen ? "Edit" : "Add"
    switch (activeSection) {
      case "users":
        return `${action} User`
      case "locations":
        return `${action} Location`
      case "suppliers":
        return `${action} Supplier`
      case "customers":
        return `${action} Customer`
      default:
        return `${action} Item`
    }
  }

  const renderDialogContent = () => {
 
    switch (activeSection) {
      case "users":
        return (
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={formData.name || ""}
                  onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email || ""}
                  onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="role">Role *</Label>
                <select
                  id="role"
                  value={formData.role || ""}
                  onChange={(e) => setFormData((prev) => ({ ...prev, role: e.target.value }))}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  required
                >
                  <option value="">Select role</option>
                  <option value="ADMIN">Admin</option>
                  <option value="MANAGER">Manager</option>
                  <option value="OPERATOR">Operator</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status *</Label>
                <select
                  id="status"
                  value={formData.status || ""}
                  onChange={(e) => setFormData((prev) => ({ ...prev, status: e.target.value }))}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  required
                >
                  <option value="">Select status</option>
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                </select>
              </div>
            </div>
            {!isEditDialogOpen && (
              <div className="space-y-2">
                <Label htmlFor="password">Password *</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password || ""}
                  onChange={(e) => setFormData((prev) => ({ ...prev, password: e.target.value }))}
                  required
                />
              </div>
            )}
          </div>
        )
     case "locations":
  return (
    <div className="grid gap-4 py-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">Name *</Label>
          <Input
            id="name"
            value={formData.name || ""}
            onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
            required
          />
        </div>
        {/* <div className="space-y-2">
          <Label htmlFor="code">Location Code *</Label>
          <Input
            id="code"
            className="opacity-50"
            value={formData.code || ""}
            onChange={(e) => setFormData((prev) => ({ ...prev, code: e.target.value }))}
            required
          />
        </div> */}
         <div className="space-y-2">
          <Label htmlFor="zone">Zone *</Label>
          <Input
            id="zone"
            value={formData.zone || ""}
            onChange={(e) => setFormData((prev) => ({ ...prev, zone: e.target.value }))}
            required
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="type">Type *</Label>
          <select
            id="type"
            value={formData.type || ""}
            onChange={(e) => setFormData((prev) => ({ ...prev, type: e.target.value }))}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            required
          >
            <option value="">Select type</option>
            <option value="SHELF">Shelf</option>
            <option value="ROOM">Room</option>
          
            <option value="FLOOR">Floor</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="capacity">Capacity *</Label>
          <Input
            id="capacity"
            type="number"
            value={formData.capacity || ""}
            onChange={(e) => setFormData((prev) => ({ ...prev, capacity: e.target.value }))}
            required
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
       
      </div>
    </div>
  )
      case "suppliers":
        return (
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Company Name *</Label>
                <Input
                  id="name"
                  value={formData.name || ""}
                  onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email || ""}
                  onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={formData.phone || ""}
                  onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rating">Rating</Label>
                <Input
                  id="rating"
                  type="number"
                  step="0.1"
                  min="0"
                  max="5"
                  value={formData.rating || ""}
                  onChange={(e) => setFormData((prev) => ({ ...prev, rating: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                value={formData.address || ""}
                onChange={(e) => setFormData((prev) => ({ ...prev, address: e.target.value }))}
              />
            </div>
          </div>
        )
      case "customers":
        return (
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Company Name *</Label>
                <Input
                  id="name"
                  value={formData.name || ""}
                  onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email || ""}
                  onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={formData.phone || ""}
                onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                value={formData.address || ""}
                onChange={(e) => setFormData((prev) => ({ ...prev, address: e.target.value }))}
              />
            </div>
          </div>
        )
      default:
        return null
    }
  }

  const sections = [
    // { id: "general", label: "General" },
    { id: "users", label: "Users" },
    { id: "locations", label: "Locations" },
    { id: "suppliers", label: "Suppliers" },
    { id: "customers", label: "Customers" },
    // { id: "notifications", label: "Notifications" },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold">Settings</h2>
        <p className="text-muted-foreground">Manage system configuration and user settings</p>
      </div>

      <div className="flex gap-6">
        {/* Sidebar Navigation */}
        <div className="w-64 space-y-2">
          {sections.map((section) => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={`w-full text-left px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeSection === section.id
                  ? "bg-blue-100 text-blue-900"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
              }`}
            >
              {section.label}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="flex-1">{renderContent()}</div>
      </div>

      {/* Add/Edit Dialog */}
      <Dialog
        open={isAddDialogOpen || isEditDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            setIsAddDialogOpen(false)
            setIsEditDialogOpen(false)
            resetForm()
          }
        }}
      >
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{getDialogTitle()}</DialogTitle>
            <DialogDescription>
              {isEditDialogOpen ? "Update the information below" : "Fill in the information below"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={isEditDialogOpen ? handleEdit : handleAdd}>
            {renderDialogContent()}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsAddDialogOpen(false)
                  setIsEditDialogOpen(false)
                  resetForm()
                }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {isEditDialogOpen ? "Updating..." : "Adding..."}
                  </>
                ) : isEditDialogOpen ? (
                  "Update"
                ) : (
                  "Add"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {activeSection.slice(0, -1)}</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{selectedItem?.name || selectedItem?.code}"? This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
