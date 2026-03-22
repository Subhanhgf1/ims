# IMS Pro - Optimized Route Structure

## Overview
The IMS application has been refactored from a single-page tab-based system to a fully optimized multi-route architecture using Next.js 14 App Router. This provides automatic code splitting, better performance, and cleaner code organization.

## Architecture

### File Structure
```
app/
├── layout.jsx (Root layout with AuthProvider)
├── page.jsx (Redirects to /dashboard)
├── sign-up/page.jsx (Sign up page)
├── (dashboard)/
│   ├── layout.jsx (Dashboard layout with persistent nav)
│   ├── dashboard/page.jsx
│   ├── inventory/page.jsx
│   ├── inventory-management/page.jsx
│   ├── inbound/page.jsx
│   ├── outbound/page.jsx
│   ├── production/page.jsx
│   ├── reports/page.jsx
│   └── settings/page.jsx
├── api/
│   ├── auth/
│   ├── inventory/
│   └── ... (other API routes)
components/
├── dashboard-nav.jsx (Persistent navigation component)
├── dashboard.jsx
├── inventory.jsx
├── inventory-management.jsx
├── inbound.jsx
├── outbound.jsx
├── production.jsx
├── reports.jsx
├── settings.jsx
├── login-form.jsx
├── signup-form.jsx
└── ui/ (UI component library)
```

## Key Features

### 1. Route Group Organization
- Used `(dashboard)` route group to organize dashboard routes
- Persistent layout wrapping all dashboard routes
- Clean separation between auth pages and dashboard

### 2. Persistent Navigation
- `dashboard-nav.jsx` provides consistent navigation across all routes
- Uses `usePathname()` for active route detection
- Mobile-responsive with collapsible sidebar
- No page reload on navigation

### 3. Performance Optimizations
- **Automatic Code Splitting**: Each route loads only required code
- **Lazy Component Loading**: Components are loaded on-demand by route
- **URL as State**: Navigation state comes from URL, not component state
- **No Unnecessary Re-renders**: Parent layout doesn't re-render on route change
- **Static Metadata**: Each route has static metadata for SEO

### 4. Authentication Flow
- `AuthProvider` wraps entire app in root layout
- `useAuth()` hook available in client components
- Login form redirects to `/dashboard` on success
- Logout button available in navigation

### 5. Data Fetching Best Practices
- API routes provide data endpoints
- Client components use fetch for dynamic data
- SWR or React Query recommended for caching
- No prop drilling through route hierarchy

## Routes

### Public Routes
- `/` - Redirects to `/dashboard`
- `/sign-up` - User registration

### Protected Routes (Require Login)
- `/dashboard` - Main dashboard/overview
- `/inventory` - Inventory management
- `/inventory-management` - Finished goods with thresholds
- `/inbound` - Inbound shipments
- `/outbound` - Outbound shipments
- `/production` - Production orders
- `/reports` - Analytics and reports
- `/settings` - System settings

## Navigation Component Features

### DashboardNav (`components/dashboard-nav.jsx`)
- **Header**: Shows IMS Pro branding and user info
- **Sidebar**: Navigation menu with route links
- **Mobile Support**: Collapsible sidebar on small screens
- **Active State**: Visual indicator for current page
- **Logout**: Secure logout button

### Navigation Items
Each nav item contains:
- Unique ID
- Display label
- Lucide icon
- Route path (href)

## Best Practices Implemented

### 1. Code Organization
- ✅ One component per file
- ✅ Clear naming conventions
- ✅ Related files in grouped folders
- ✅ UI components in dedicated `/ui` folder

### 2. Performance
- ✅ No re-renders on tab changes (actual route navigation)
- ✅ Automatic code splitting by route
- ✅ Static metadata for better SEO
- ✅ Client components only where needed

### 3. State Management
- ✅ URL as source of truth for navigation state
- ✅ Auth state in context (single source)
- ✅ Local state for UI controls (modals, filters)
- ✅ No prop drilling through route hierarchy

### 4. Type Safety & Validation
- ✅ PropTypes or TypeScript (optional)
- ✅ API input validation
- ✅ Error boundary protection

### 5. Accessibility
- ✅ Semantic HTML elements
- ✅ ARIA labels where needed
- ✅ Proper heading hierarchy
- ✅ Keyboard navigation support

## API Endpoints

### Inventory Management
- `GET /api/inventory/settings` - Get all settings
- `POST /api/inventory/settings` - Create settings
- `PATCH /api/inventory/settings/[id]` - Update settings
- `DELETE /api/inventory/settings/[id]` - Delete settings
- `GET /api/inventory/inventory-orders` - Get all orders
- `POST /api/inventory/inventory-orders` - Create order
- `PATCH /api/inventory/inventory-orders/[id]` - Update order
- `DELETE /api/inventory/inventory-orders/[id]` - Delete order

## Migration Guide

### From Old Tab System to New Routes
Old: `<button onClick={() => setActiveTab('inventory')}>Inventory</button>`
New: `<Link href="/inventory">Inventory</Link>`

Old: Tab state in useState
New: Navigation state in URL

Old: All components in memory
New: Only active route's component in memory

## Performance Metrics

### Before Refactoring
- Single bundle for entire app
- All components loaded on page load
- Tab switches cause component re-renders
- Memory usage: High (all components in memory)

### After Refactoring
- Separate bundles per route
- Only active route's code loaded
- Route changes use browser's native navigation
- Memory usage: Low (only active page in memory)

## Development Tips

### Adding a New Page
1. Create route folder: `app/(dashboard)/new-page/`
2. Create page component: `page.jsx`
3. Create UI component: `components/new-page.jsx`
4. Add to navigation in `dashboard-nav.jsx`
5. Add API endpoints if needed

### Updating Navigation
Edit `components/dashboard-nav.jsx` NAV_ITEMS array

### Adding UI Components
Create in `components/ui/` following existing patterns

### Working with Auth
Use `useAuth()` hook in client components:
```jsx
const { user, login, logout, loading } = useAuth()
```

## Troubleshooting

### Page Not Loading
- Check route path matches navigation href
- Verify component exists at correct path
- Check browser console for errors

### Navigation Not Working
- Ensure `useRouter` imported from `next/navigation`
- Use `router.push()` for programmatic navigation
- Check layout has client directive if needed

### Auth Not Working
- Verify AuthProvider wraps app in root layout
- Check localStorage for "ims_user"
- Verify login API endpoint works

## Future Improvements
- Add loading skeletons for routes
- Implement route-level error boundaries
- Add breadcrumb navigation
- Implement route transition animations
- Add progressive loading indicators
