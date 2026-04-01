"use client"

import { createContext, useContext, useState, useEffect, useCallback } from "react"

const AuthContext = createContext()

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  const syncUser = useCallback(async (userId) => {
    try {
      const res = await fetch("/api/auth/me", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      })
      if (!res.ok) return
      const { user: freshUser } = await res.json()
      setUser(freshUser)
      localStorage.setItem("ims_user", JSON.stringify(freshUser))
    } catch {}
  }, [])

  // On mount: load from localStorage immediately, then sync from DB
  useEffect(() => {
    if (typeof window === "undefined") { setLoading(false); return }
    try {
      const stored = localStorage.getItem("ims_user")
      if (stored) {
        const parsed = JSON.parse(stored)
        setUser(parsed)
        syncUser(parsed.id)
      }
    } catch {
      localStorage.removeItem("ims_user")
    }
    setLoading(false)
  }, [])

  // Re-sync whenever the user focuses the tab — picks up permission changes immediately
  useEffect(() => {
    const handleFocus = () => {
      const stored = localStorage.getItem("ims_user")
      if (!stored) return
      try {
        const { id } = JSON.parse(stored)
        syncUser(id)
      } catch {}
    }
    window.addEventListener("focus", handleFocus)
    return () => window.removeEventListener("focus", handleFocus)
  }, [syncUser])

  const login = async (email, password) => {
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Login failed")
      }

      const userData = await response.json()
      setUser(userData.user)
      localStorage.setItem("ims_user", JSON.stringify(userData.user))
      return { success: true }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  const logout = () => {
    setUser(null)
    localStorage.removeItem("ims_user")
  }

  const refreshUser = async () => {
    const stored = localStorage.getItem("ims_user")
    if (!stored) return
    try {
      const { id } = JSON.parse(stored)
      await syncUser(id)
    } catch {}
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, refreshUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) throw new Error("useAuth must be used within an AuthProvider")
  return context
}
