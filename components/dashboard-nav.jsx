"use client"

import { usePathname, useRouter } from "next/navigation"
import { Package, TrendingUp, TrendingDown, BarChart3, Settings, Factory, Boxes, LogOut, Menu, X } from "lucide-react"
import { useAuth } from "@/lib/auth"
import { usePermissions } from "@/hooks/use-permissions"
import { PERMISSIONS } from "@/lib/permissions"
import { useState } from "react"

const NAV_ITEMS = [
  { id: "dashboard", label: "Dashboard", icon: BarChart3, href: "/dashboard" },
  { id: "inventory", label: "Inventory", icon: Package, href: "/inventory", permission: PERMISSIONS.INVENTORY_VIEW },
  { id: "inbound", label: "Inbound", icon: TrendingDown, href: "/inbound", permission: PERMISSIONS.INBOUND_VIEW },
  { id: "outbound", label: "Outbound", icon: TrendingUp, href: "/outbound", permission: PERMISSIONS.OUTBOUND_VIEW },
  { id: "returns", label: "Failed Delivery", icon: Boxes, href: "/returns", permission: PERMISSIONS.FAILED_DELIVERY_VIEW },
  { id: "settings", label: "Settings", icon: Settings, href: "/settings", permission: PERMISSIONS.SETTINGS_VIEW },
]

export default function DashboardNav() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, logout } = useAuth()
  const { can } = usePermissions()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const filteredNavItems = NAV_ITEMS.filter(item => 
    !item.permission || can(item.permission)
  )

  const handleLogout = async () => {
    await logout()
    router.push("/")
  }

  return (
    <>
      {/* Header */}
      <header className="fixed top-0 left-0 w-full h-16 bg-white border-b shadow-sm z-50">
        <div className="h-full px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden p-2 rounded-md hover:bg-gray-100"
            >
              {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>

            <Package className="h-7 w-7 text-blue-600" />
            <h1 className="text-xl font-bold text-gray-900">IMS Pro</h1>
          </div>

          <div className="flex items-center gap-4">
            <span className="hidden sm:block text-sm text-gray-500">
              Welcome, {user?.name}
            </span>

            <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded-full">
              {user?.role}
            </span>

            <button
              onClick={handleLogout}
              className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>

            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
              <span className="text-white text-sm font-medium">
                {user?.name?.charAt(0).toUpperCase()}
              </span>
            </div>
          </div>

        </div>
      </header>

      {/* Sidebar */}
      <aside
        className={`fixed top-16 left-0 h-[calc(100vh-4rem)] w-64 bg-gray-50 border-r transform transition-transform duration-300 z-40
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
        lg:translate-x-0`}
      >
        <nav className="p-4 space-y-2">
          {filteredNavItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href || (pathname === "/" && item.href === "/dashboard")

            return (
              <button
                key={item.id}
                onClick={() => {
                  router.push(item.href)
                  setSidebarOpen(false)
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition
                ${
                  isActive
                    ? "bg-white text-blue-600 shadow border-l-4 border-blue-600"
                    : "text-gray-600 hover:bg-white hover:text-gray-900"
                }`}
              >
                <Icon className="h-5 w-5" />
                {item.label}
              </button>
            )
          })}
        </nav>
      </aside>

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </>
  )
}