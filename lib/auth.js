"use client"

import { createContext, useContext, useState, useEffect } from "react"

const AuthContext = createContext()

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const storedUser = localStorage.getItem("ims_user")
        if (storedUser) {
          const parsed = JSON.parse(storedUser)
          setUser(parsed)
          // Silently refresh permissions from DB in the background
          fetch("/api/auth/me", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId: parsed.id }),
          })
            .then((res) => res.ok ? res.json() : null)
            .then((data) => {
              if (data?.user) {
                setUser(data.user)
                localStorage.setItem("ims_user", JSON.stringify(data.user))
              }
            })
            .catch(() => {})
        }
      } catch (error) {
        console.error("Error parsing stored user:", error)
        localStorage.removeItem("ims_user")
      }
    }
    setLoading(false)
  }, [])

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

      if (typeof window !== "undefined") {
        localStorage.setItem("ims_user", JSON.stringify(userData.user))
      }

      return { success: true }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  const logout = () => {
    setUser(null)
    if (typeof window !== "undefined") {
      localStorage.removeItem("ims_user")
    }
  }

  const refreshUser = async () => {
    if (typeof window === "undefined") return
    try {
      const stored = localStorage.getItem("ims_user")
      if (!stored) return
      const { id } = JSON.parse(stored)
      const res = await fetch("/api/auth/me", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: id }),
      })
      if (!res.ok) return
      const { user: freshUser } = await res.json()
      setUser(freshUser)
      localStorage.setItem("ims_user", JSON.stringify(freshUser))
    } catch (error) {
      console.error("Failed to refresh user:", error)
    }
  }

  return <AuthContext.Provider value={{ user, login, logout, loading, refreshUser }}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
