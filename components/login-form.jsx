"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Package, Loader2 } from "lucide-react"

export default function LoginForm() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const router = useRouter()

  const [showChangePassword, setShowChangePassword] = useState(false)
  const [cpForm, setCpForm] = useState({ email: "", oldPassword: "", newPassword: "", confirmPassword: "" })
  const [cpError, setCpError] = useState("")
  const [cpSuccess, setCpSuccess] = useState("")
  const [cpLoading, setCpLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError("")
    setLoading(true)
    try {
      const result = await login(email, password)
      if (result.success) {
        router.push("/dashboard")
      } else {
        setError(result.error)
      }
    } catch {
      setError("An unexpected error occurred")
    } finally {
      setLoading(false)
    }
  }

  const handleChangePassword = async (e) => {
    e.preventDefault()
    setCpError("")
    setCpSuccess("")
    if (cpForm.newPassword !== cpForm.confirmPassword) {
      setCpError("New passwords do not match")
      return
    }
    setCpLoading(true)
    try {
      const loginRes = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: cpForm.email, password: cpForm.oldPassword }),
      })
      if (!loginRes.ok) {
        setCpError("Email or current password is incorrect")
        return
      }
      const { user } = await loginRes.json()
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, oldPassword: cpForm.oldPassword, newPassword: cpForm.newPassword }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setCpSuccess("Password changed successfully. You can now sign in.")
      setCpForm({ email: "", oldPassword: "", newPassword: "", confirmPassword: "" })
    } catch (err) {
      setCpError(err.message)
    } finally {
      setCpLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="flex justify-center">
            <Package className="h-12 w-12 text-blue-600" />
          </div>
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">IMS Pro</h2>
          <p className="mt-2 text-sm text-gray-600">Sign in to your inventory management system</p>
        </div>

        {!showChangePassword ? (
          <Card>
            <CardHeader>
              <CardTitle>Sign In</CardTitle>
              <CardDescription>Enter your credentials to access the system</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required disabled={loading} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required disabled={loading} />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Signing in...</> : "Sign In"}
                </Button>
              </form>
              <div className="mt-4 flex justify-between text-sm text-gray-600">
                <span>New User? <a href="/sign-up" className="font-medium text-blue-600 hover:text-blue-500">Sign up now</a></span>
                <button onClick={() => setShowChangePassword(true)} className="font-medium text-blue-600 hover:text-blue-500">Change Password</button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Change Password</CardTitle>
              <CardDescription>Enter your current password to set a new one</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleChangePassword} className="space-y-4">
                {cpError && <Alert variant="destructive"><AlertDescription>{cpError}</AlertDescription></Alert>}
                {cpSuccess && <Alert><AlertDescription>{cpSuccess}</AlertDescription></Alert>}
                <div className="space-y-2">
                  <Label htmlFor="cp-email">Email</Label>
                  <Input id="cp-email" type="email" value={cpForm.email} onChange={(e) => setCpForm((p) => ({ ...p, email: e.target.value }))} required disabled={cpLoading} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cp-old">Current Password</Label>
                  <Input id="cp-old" type="password" value={cpForm.oldPassword} onChange={(e) => setCpForm((p) => ({ ...p, oldPassword: e.target.value }))} required disabled={cpLoading} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cp-new">New Password</Label>
                  <Input id="cp-new" type="password" value={cpForm.newPassword} onChange={(e) => setCpForm((p) => ({ ...p, newPassword: e.target.value }))} required minLength={6} disabled={cpLoading} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cp-confirm">Confirm New Password</Label>
                  <Input id="cp-confirm" type="password" value={cpForm.confirmPassword} onChange={(e) => setCpForm((p) => ({ ...p, confirmPassword: e.target.value }))} required minLength={6} disabled={cpLoading} />
                </div>
                <Button type="submit" className="w-full" disabled={cpLoading}>
                  {cpLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Changing...</> : "Change Password"}
                </Button>
              </form>
              <div className="mt-4 text-sm text-center">
                <button onClick={() => { setShowChangePassword(false); setCpError(""); setCpSuccess("") }} className="font-medium text-blue-600 hover:text-blue-500">
                  Back to Sign In
                </button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
