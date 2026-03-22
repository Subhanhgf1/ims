# WMS Pro - Quick Reference Card

## Routes at a Glance

| Route | Purpose | Component | Icon |
|-------|---------|-----------|------|
| `/dashboard` | Overview & KPIs | Dashboard | BarChart3 |
| `/inventory` | Raw & finished goods | Inventory | Package |
| `/inventory-management` | Finished goods + thresholds | InventoryManagement | Boxes |
| `/inbound` | Receiving & inbound | Inbound | TrendingDown |
| `/outbound` | Shipping & outbound | Outbound | TrendingUp |
| `/production` | Manufacturing orders | Production | Factory |
| `/reports` | Analytics & reports | Reports | BarChart3 |
| `/settings` | System configuration | Settings | Settings |

## Common Tasks

### Navigate to a Route
```jsx
// Option 1: Using Link
import Link from "next/link"
<Link href="/inventory">Go to Inventory</Link>

// Option 2: Using useRouter
import { useRouter } from "next/navigation"
const router = useRouter()
router.push("/inventory")
```

### Get Current User
```jsx
import { useAuth } from "@/lib/auth"

export default function MyComponent() {
  const { user, loading } = useAuth()
  
  if (loading) return <div>Loading...</div>
  if (!user) return <div>Not authenticated</div>
  
  return <div>Welcome {user.name}</div>
}
```

### Fetch Data from API
```jsx
import { useEffect, useState } from "react"

export default function MyComponent() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    fetch("/api/inventory/finished-goods")
      .then(res => res.json())
      .then(data => setData(data))
      .finally(() => setLoading(false))
  }, [])
  
  if (loading) return <div>Loading...</div>
  return <div>{/* render data */}</div>
}
```

### Create API Endpoint
```javascript
// app/api/my-endpoint/route.js
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const data = await prisma.model.findMany()
    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const body = await request.json()
    const result = await prisma.model.create({ data: body })
    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
```

### Handle Form Submission
```jsx
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export default function MyForm() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [formData, setFormData] = useState({ name: "" })
  
  const handleSubmit = async (e) => {
    e.preventDefault()
    setError("")
    setLoading(true)
    
    try {
      const response = await fetch("/api/endpoint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error)
      }
      
      const result = await response.json()
      // Handle success
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }
  
  return (
    <form onSubmit={handleSubmit}>
      {error && <div className="text-red-600">{error}</div>}
      <Input
        value={formData.name}
        onChange={(e) => setFormData({ name: e.target.value })}
      />
      <Button type="submit" disabled={loading}>
        {loading ? "Submitting..." : "Submit"}
      </Button>
    </form>
  )
}
```

### Show Loading State
```jsx
import { useState, useEffect } from "react"

export default function MyComponent() {
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    // Simulate loading
    setTimeout(() => setLoading(false), 1000)
  }, [])
  
  return (
    <div>
      {loading ? (
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      ) : (
        <div>Content</div>
      )}
    </div>
  )
}
```

### Show Modal/Dialog
```jsx
import { useState } from "react"
import { Button } from "@/components/ui/button"

export default function MyComponent() {
  const [isOpen, setIsOpen] = useState(false)
  
  return (
    <>
      <Button onClick={() => setIsOpen(true)}>Open</Button>
      
      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-md">
            <h2 className="text-xl font-bold mb-4">Dialog Title</h2>
            <p>Dialog content</p>
            <Button onClick={() => setIsOpen(false)}>Close</Button>
          </div>
        </div>
      )}
    </>
  )
}
```

## Common UI Components

### Button
```jsx
import { Button } from "@/components/ui/button"

<Button>Default</Button>
<Button variant="outline">Outline</Button>
<Button variant="destructive">Delete</Button>
<Button size="sm">Small</Button>
<Button size="lg">Large</Button>
<Button disabled>Disabled</Button>
```

### Card
```jsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
  </CardHeader>
  <CardContent>Content</CardContent>
</Card>
```

### Input
```jsx
import { Input } from "@/components/ui/input"

<Input placeholder="Enter text" />
<Input type="email" placeholder="Email" />
<Input type="password" placeholder="Password" />
<Input disabled placeholder="Disabled" />
```

### Label
```jsx
import { Label } from "@/components/ui/label"

<Label htmlFor="input">Label text</Label>
<Input id="input" />
```

### Alert
```jsx
import { Alert, AlertDescription } from "@/components/ui/alert"

<Alert>
  <AlertDescription>Message</AlertDescription>
</Alert>

<Alert variant="destructive">
  <AlertDescription>Error message</AlertDescription>
</Alert>
```

## Database Queries (Prisma)

### Read
```javascript
// Get all
const users = await prisma.user.findMany()

// Get one
const user = await prisma.user.findUnique({ where: { id: "123" } })

// Get many with filter
const items = await prisma.item.findMany({ where: { status: "active" } })

// With relations
const user = await prisma.user.findUnique({
  where: { id: "123" },
  include: { posts: true }
})
```

### Create
```javascript
const user = await prisma.user.create({
  data: { name: "John", email: "john@example.com" }
})
```

### Update
```javascript
const user = await prisma.user.update({
  where: { id: "123" },
  data: { name: "Jane" }
})
```

### Delete
```javascript
await prisma.user.delete({ where: { id: "123" } })
```

## Tailwind CSS Cheat Sheet

### Layout
```jsx
<div className="flex gap-4">                     {/* Row layout */}
<div className="grid grid-cols-3 gap-4">         {/* 3-column grid */}
<div className="p-4">                            {/* Padding */}
<div className="m-2">                            {/* Margin */}
<div className="rounded-lg">                     {/* Border radius */}
<div className="shadow-md">                      {/* Shadow */}
<div className="bg-blue-600">                    {/* Background color */}
<div className="text-lg font-bold">             {/* Typography */}
```

### Responsive
```jsx
<div className="md:grid-cols-2 lg:grid-cols-3">  {/* Medium: 2 cols, Large: 3 cols */}
<div className="hidden md:block">                {/* Hide on mobile, show on medium+ */}
<div className="block md:hidden">                {/* Show on mobile, hide on medium+ */}
```

### States
```jsx
<div className="hover:bg-blue-700">              {/* Hover state */}
<div className="focus:ring-2 focus:ring-blue-500"> {/* Focus state */}
<div className="disabled:opacity-50">            {/* Disabled state */}
```

## Debugging

### Console Logging
```javascript
console.log("[v0] Variable:", variable)
console.error("Error occurred:", error)
console.warn("Warning:", warning)
```

### Browser DevTools
- **Console**: Check for errors
- **Network**: Check API calls
- **Storage**: Check localStorage
- **Elements**: Inspect DOM

### Common Errors

| Error | Solution |
|-------|----------|
| "Cannot read property 'x' of undefined" | Check if object exists before accessing |
| "Module not found" | Check import path and file exists |
| "useAuth must be used within AuthProvider" | Ensure route is inside dashboard |
| "CORS error" | API endpoint must be same origin |
| "Database connection failed" | Check environment variables |

## Performance Tips

### Do ✅
- Use `next/image` for images
- Use `dynamic()` for heavy components
- Memoize expensive components
- Use `useCallback` for event handlers
- Split into multiple routes

### Don't ❌
- Load all data at once
- Re-fetch same data repeatedly
- Use inline functions in render
- Keep unused components in memory
- Make unnecessary API calls

## Testing (if needed)

### Using Jest
```javascript
// __tests__/component.test.js
import { render, screen } from "@testing-library/react"
import MyComponent from "@/components/my-component"

test("renders component", () => {
  render(<MyComponent />)
  expect(screen.getByText("text")).toBeInTheDocument()
})
```

## Environment Variables

### .env.local
```
DATABASE_URL="postgresql://..."
NEXT_PUBLIC_API_URL="http://localhost:3000"
```

### Usage
```javascript
// Server-side
const url = process.env.DATABASE_URL

// Client-side (must prefix with NEXT_PUBLIC_)
const apiUrl = process.env.NEXT_PUBLIC_API_URL
```

## File Organization

```
Project Root
├── app/                    # Next.js routes
│   ├── (dashboard)/        # Route group
│   ├── api/                # API endpoints
│   ├── layout.jsx          # Root layout
│   ├── page.jsx            # Home page
│   └── globals.css         # Global styles
├── components/             # React components
│   ├── ui/                 # UI component library
│   └── *.jsx               # Page components
├── lib/                    # Utilities
│   ├── auth.js             # Auth context
│   ├── prisma.js           # Database client
│   └── utils.js            # Helper functions
├── prisma/                 # Database
│   ├── schema.prisma       # Database schema
│   └── migrations/         # Database migrations
├── public/                 # Static assets
├── .env.local              # Environment variables
├── tailwind.config.js      # Tailwind config
└── package.json            # Dependencies
```

## Useful Commands

```bash
# Development
npm run dev                 # Start dev server
npm run build               # Build for production
npm run start               # Start production server

# Database
npx prisma migrate dev      # Run migrations
npx prisma studio          # Open Prisma Studio
npx prisma generate        # Generate Prisma client

# Code Quality
npm run lint                # Run linter
npm run format              # Format code

# Deployment
git push origin main        # Push to GitHub (triggers Vercel deploy)
```

## Icons (Lucide)

```jsx
import {
  Package,           // Box/package
  BarChart3,        // Charts
  TrendingUp,       // Up arrow
  TrendingDown,     // Down arrow
  Factory,          // Building/factory
  Settings,         // Gear
  Boxes,            // Multiple boxes
  LogOut,           // Exit
  Menu,             // Hamburger
  X,                // Close
  Plus,             // Add
  Edit,             // Edit
  Trash,            // Delete
  Eye,              // View
  Search,           // Search
  Download,         // Download
  Upload,           // Upload
} from "lucide-react"
```

## Links & Resources

- **Documentation**: [ROUTE_STRUCTURE.md](./ROUTE_STRUCTURE.md)
- **Setup Guide**: [SETUP_GUIDE.md](./SETUP_GUIDE.md)
- **Architecture**: [ARCHITECTURE.md](./ARCHITECTURE.md)
- **Next.js**: https://nextjs.org/docs
- **Prisma**: https://www.prisma.io/docs
- **Tailwind**: https://tailwindcss.com/docs

---

**Pro Tip:** Copy and paste patterns from this guide to get started quickly!
