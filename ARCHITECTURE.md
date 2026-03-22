# IMS Pro - System Architecture

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    User Browser                              │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                   Next.js 14 App Router                      │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Root Layout (app/layout.jsx)                         │   │
│  │  - AuthProvider                                       │   │
│  │  - Global styles (globals.css)                        │   │
│  └──────────────────────────────────────────────────────┘   │
│                            ↓                                  │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Route Handler (app/page.jsx)                         │   │
│  │  - Redirects to /dashboard                            │   │
│  └──────────────────────────────────────────────────────┘   │
│                            ↓                                  │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Dashboard Route Group (app/(dashboard)/layout.jsx)  │   │
│  │  - DashboardNav (persistent)                          │   │
│  │  - Auth check & loading state                         │   │
│  │  - Main content area (children)                       │   │
│  └──────────────────────────────────────────────────────┘   │
│                            ↓                                  │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Individual Routes (auto code-split)                   │   │
│  │ - /dashboard                                          │   │
│  │ - /inventory                                          │   │
│  │ - /inventory-management                               │   │
│  │ - /inbound, /outbound, /production                    │   │
│  │ - /reports, /settings                                 │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            ↓
                    ┌───────────────┐
                    │  API Routes   │
                    │  (/api/...)   │
                    └───────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    Backend Services                          │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │          Prisma ORM                                 │   │
│  │  - Connection pooling                               │   │
│  │  - Type safety                                       │   │
│  └─────────────────────────────────────────────────────┘   │
│                            ↓                                  │
│  ┌─────────────────────────────────────────────────────┐   │
│  │      PostgreSQL Database                            │   │
│  │  - Users, Inventory, Orders                          │   │
│  │  - Production, Settings                              │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## Component Architecture

### Layout Hierarchy
```
RootLayout
│
└── AuthProvider (Context)
    │
    └── AuthCheck (Loading & Protection)
        │
        ├── LoginForm (if not authenticated)
        │
        └── DashboardLayout (if authenticated)
            │
            ├── DashboardNav (persistent)
            │   ├── Header
            │   └── Sidebar Navigation
            │
            └── Content Area
                ├── Dashboard
                ├── Inventory
                ├── Inventory Management
                ├── Inbound
                ├── Outbound
                ├── Production
                ├── Reports
                └── Settings
```

## Data Flow Architecture

### Authentication Flow
```
User Input
    ↓
LoginForm Component
    ↓
login() method (from useAuth)
    ↓
POST /api/auth/login
    ↓
Validate credentials
    ↓
Return user data
    ↓
Store in AuthContext + localStorage
    ↓
Redirect to /dashboard
    ↓
DashboardLayout checks auth
    ↓
Render dashboard with user data
```

### Page Navigation Flow
```
User clicks navigation link
    ↓
router.push('/route') or <Link href="/route">
    ↓
Next.js App Router
    ↓
Load route-specific code chunk
    ↓
Render page component
    ↓
No full page reload
    ↓
Browser history updated
```

### Data Fetching Flow
```
Component mounts
    ↓
useEffect hook
    ↓
Fetch data from API
    ↓
Update component state
    ↓
Re-render with data
    ↓
(Optional: Cache with SWR/React Query)
```

## State Management Architecture

```
Global State (Context)
│
├── AuthContext
│   ├── user (current user object)
│   ├── loading (auth loading state)
│   ├── login() (login method)
│   └── logout() (logout method)
│
└── Component Local State
    ├── Modal visibility (isOpen)
    ├── Form inputs
    ├── Filters & sorting
    └── Temporary UI state
```

## API Architecture

### Route Structure
```
/api
├── /auth
│   └── /login (POST)
├── /inventory
│   ├── /finished-goods (GET, POST, PATCH, DELETE)
│   ├── /raw-materials (GET, POST, PATCH, DELETE)
│   ├── /settings (GET, POST, PATCH, DELETE)
│   └── /inventory-orders (GET, POST, PATCH, DELETE)
├── /inbound-receipts (GET, POST, PATCH)
├── /outbound-shipments (GET, POST, PATCH)
├── /production
│   └── /orders (GET, POST, PATCH)
├── /purchase-orders (GET, POST, PATCH)
├── /sales-orders (GET, POST, PATCH)
├── /settings
│   ├── /inventory (GET, POST)
│   ├── /notifications (GET, POST)
│   └── /preferences (GET, POST)
├── /dashboard
│   └── /stats (GET)
├── /users (GET, POST, PATCH, DELETE)
├── /locations (GET, POST, PATCH, DELETE)
├── /suppliers (GET, POST, PATCH, DELETE)
└── /customers (GET, POST, PATCH, DELETE)
```

### API Request/Response Pattern
```
Client Request
    ↓
Next.js API Route Handler
    ↓
Input Validation
    ↓
Prisma Database Query
    ↓
Error Handling
    ↓
JSON Response
    ↓
NextResponse.json()
```

## Database Schema (Key Models)

```
FinishedGood
├── id (PK)
├── name
├── sku (UNIQUE)
├── quantity
├── minimumStock
├── locationId (FK)
├── inventoryOrders (Relation)
└── inventorySettings (Relation)

InventorySettings
├── id (PK)
├── finishedGoodId (UNIQUE, FK)
├── reorderPoint
├── reorderQuantity
├── maxStockLevel
├── leadTimeDays
└── status

InventoryOrder
├── id (PK)
├── orderNumber (UNIQUE)
├── finishedGoodId (FK)
├── quantity
├── status (PENDING, RECEIVED, CANCELLED)
├── requestedDate
├── receivedDate
└── notes

User
├── id (PK)
├── name
├── email (UNIQUE)
├── password (hashed)
├── role
└── createdAt

... (other models)
```

## Code Splitting Strategy

### Automatic
Next.js automatically creates separate bundles for:
- Each route in `/app/(dashboard)/*/page.jsx`
- Each API route in `/app/api/*/route.js`

### Manual (if needed)
```javascript
// Dynamic imports for large components
const HeavyComponent = dynamic(() => import('@/components/heavy'), {
  loading: () => <div>Loading...</div>
})
```

### Bundle Composition
```
Initial (index.html)
├── React runtime
├── Next.js runtime
├── Root layout
├── Navigation component
└── Auth context

Route: /dashboard
├── Dashboard component
└── Its dependencies

Route: /inventory
├── Inventory component
└── Its dependencies

... (each route has its own bundle)
```

## Performance Optimization

### 1. Code Splitting
- Routes split automatically
- Only loaded code is for current page

### 2. Lazy Loading
```javascript
// Load component on-demand
const Component = dynamic(() => import('@/components/component'))
```

### 3. Image Optimization
```jsx
<Image
  src="/image.jpg"
  alt="Description"
  width={800}
  height={600}
  priority={false} // lazy load
/>
```

### 4. Caching Strategies
- **Browser Cache**: Static assets (images, fonts)
- **Server Cache**: API responses (if implemented)
- **SWR Cache**: Client-side data caching (optional)

### 5. Production Build
```bash
npm run build  # Creates optimized bundles
npm run start  # Runs production server
```

## Security Architecture

### Authentication
- JWT or session-based
- Stored in localStorage (client)
- Validated on server

### Authorization
- Role-based access control (RBAC)
- Checked in API routes
- Verified in database queries

### Data Protection
- Sensitive data encrypted
- API validation on all inputs
- SQL injection prevention (Prisma)

## Error Handling Architecture

### Client-Side
```javascript
try {
  // operation
} catch (error) {
  // User-friendly error message
  // Log to console
}
```

### Server-Side
```javascript
try {
  // database operation
} catch (error) {
  console.error('Error:', error)
  return NextResponse.json(
    { error: 'User message' },
    { status: 500 }
  )
}
```

### Components
- Error boundaries (optional)
- Error states in forms
- Validation messages

## Deployment Architecture

### Development
```
Local Machine
    ↓
npm run dev
    ↓
http://localhost:3000
```

### Production
```
GitHub Repository
    ↓
Vercel/Hosting Provider
    ↓
Build Process
    ↓
Static Generation
    ↓
Deployment
    ↓
Live URL (https://...)
```

## Monitoring & Analytics

### Available Tools
- Browser DevTools
- Server logs (console)
- Error tracking (optional: Sentry)
- Analytics (optional: Google Analytics)

### Key Metrics
- Page load time
- API response time
- Error rate
- User engagement

## Future Architecture Enhancements

1. **Real-time Updates**
   - WebSocket integration
   - Server-sent events (SSE)

2. **Advanced Caching**
   - Redis for session storage
   - SWR/React Query for data

3. **Background Jobs**
   - Email notifications
   - Data exports
   - Scheduled tasks

4. **Microservices** (if needed)
   - Inventory service
   - Order service
   - Payment service

5. **Mobile App**
   - React Native
   - Shared API layer
   - Offline support

---

**Note:** This architecture follows Next.js 14+ best practices and is optimized for performance, maintainability, and scalability.
