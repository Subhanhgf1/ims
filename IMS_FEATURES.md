# IMS — Inventory Management System
### Complete Feature Reference
> **Generated:** 2026-05-20 · **Stack:** Next.js · Prisma · PostgreSQL · TailwindCSS · Shadcn/UI

---

## 📋 Table of Contents
1. [Authentication & Access Control](#1-authentication--access-control)
2. [Dashboard](#2-dashboard)
3. [Inventory](#3-inventory)
4. [Inbound Operations](#4-inbound-operations)
5. [Outbound Operations](#5-outbound-operations)
6. [Production Management](#6-production-management)
7. [Returns / Failed Delivery](#7-returns--failed-delivery)
8. [Reports & Analytics](#8-reports--analytics)
9. [Settings](#9-settings)
10. [AI Assistant](#10-ai-assistant)

---

## 1. Authentication & Access Control

### User Authentication
- Email + password login
- OTP-based registration verification
- Session persistence via auth context
- Protected routes — unauthenticated users redirected to login
- Last login timestamp tracking

### Role-Based Access Control (RBAC)
Three built-in roles with default permission sets:

| Role | Default Access |
|------|----------------|
| `ADMIN` | Full system access, financial data visible |
| `MANAGER` | Broad access, can manage locations/suppliers |
| `OPERATOR` | Operational access, no financial data |

### Granular Permission Overrides
Admins can grant or deny individual permissions per user, overriding their role defaults. Permission scopes:

| Module | Permissions |
|--------|-------------|
| **Inbound** | View, Create, Edit, Receive Items |
| **Outbound** | View, Create, Edit, Ship, Delete |
| **Inventory** | View, Edit / Add / Delete |
| **Production** | View, Create / Start / Complete |
| **Reports** | View Reports, View Financials |
| **Failed Delivery** | View, Scan Parcels, Process/Restock, Delete from Queue |
| **System** | Access Settings, Manage Users |

---

## 2. Dashboard

### KPI Cards
- **Total Inventory Items** — combined count of raw materials + finished goods
- **Low Stock Alerts** — count of items at or below minimum stock, with a direct link to filter the inventory list
- **Pending Orders** — sum of pending purchase orders + pending production orders
- **Inventory Value** — total PKR value (visible to ADMIN only; masked for other roles)

### Alerts Banner
- Prominent orange alert banner appears automatically when any items are below minimum stock, prompting purchase order creation

### Today's Activity
- Orders received today (inbound completions)
- Orders shipped today (outbound completions)
- Daily progress bar (based on combined inbound + outbound vs. a 20-operation daily target)

### Recent Activities Feed
- Chronological feed of the latest inventory operations (INBOUND, OUTBOUND, RETURN)
- Shows: operation type, description, order number reference, user who performed it, timestamp

### Quick Actions
- One-click shortcut to **Create Inbound Order** (navigates to `/inbound`)

### Data Refresh
- Manual refresh button with animated spinner; re-fetches all dashboard stats on demand

---

## 3. Inventory

### Item Types
The inventory is divided into three tabs:
1. **Finished Goods** — sellable products with image, retail price, cost, and stock levels
2. **Raw Materials** — input materials with supplier, unit cost, and safety minimum
3. **Product Bundles** — groups of finished goods sold together; shows component pills and total cost

### Inventory Summary Strip
- Live counts at the top: Total Items | In Stock | Low Stock | Out of Stock

### Per-Item Data Fields
- Name, SKU (monospace badge), description
- Unit of measure, quantity, cost, retail price
- Minimum safety stock
- `targetDays` — days of stock to maintain (for Smart Min Stock)
- `dailyConsumption` — used to compute "days left" badge
- Category, supplier (raw materials), warehouse location
- Product image URL (finished goods & bundles)
- `receivedAs` — how an item enters inventory (RAW / FINISHED)

### Status Badges
- **In Stock** (green), **Low Stock** (amber), **Out of Stock** (red)
- **Days Left** badge — shows "`Ends in 1 day`" / "`2d left`" when stock will run out in ≤ 3 days based on daily consumption

### Search & Filtering
- Free-text search across name, SKU, description
- **Status filter** — multi-select: In Stock / Low Stock / Out of Stock
- **Supplier filter** (raw materials tab)
- **Location filter** (warehouse zone)
- **Category filter**
- **Received As filter** (RAW / FINISHED)
- Active filter chips with individual clear buttons
- "Clear All Filters" button
- URL query param support: `/inventory?lowStock=true&outStock=true` pre-applies filters (used by Dashboard)

### Sorting
- Sort by: Name A→Z, Name Z→A, Quantity (High→Low, Low→High), Cost (High→Low, Low→High)

### Item Actions
- **Edit** — opens pre-filled dialog with all item fields
- **Delete** — with hard confirmation warning about cascading data loss
- **Advanced** (non-bundle items) — opens the Advanced Inventory Modal

### Advanced Inventory Modal
- Manual stock adjustments with reason & reference tracking
- Each adjustment is written to the audit log automatically

### Add / Edit Item Dialog
- Full form covering all item fields
- For **bundles**: component selector with quantity per component
- For **raw materials**: supplier dropdown

### Bulk Operations
Multi-select checkboxes with "Select All" bar. Bulk action dropdown grouped into:

| Group | Action |
|-------|--------|
| **Edit** | Edit Selected (opens Bulk Edit Modal) |
| **Edit** | Smart Min Stock (opens Smart Min Stock Modal) |
| **Edit** | Restock Selected (redirects to Inbound with pre-filled items) |
| **Data** | Export to CSV |
| **Danger** | Delete Selected (with hard confirmation) |

### Bulk Edit Modal
- Edit shared fields (cost, price, minimum stock, category, location, supplier, unit) across multiple selected items in one operation

### Smart Min Stock Modal
- Calculates recommended minimum stock levels for selected items based on daily consumption rate × target days
- Applies new `minimumStock` values in bulk

### Auto-Replenish (ADMIN/MANAGER)
- Scans all finished goods for items below their target maintenance days
- Automatically creates inbound purchase orders for those items
- Reports created PO numbers on success

### Export to CSV
- Exports selected items with columns: Name, SKU, Description, Unit, Cost (PKR), Price (PKR), Quantity, Minimum Stock, Supplier, Location

---

## 4. Inbound Operations

### Purchase Orders (Inbound Orders)
- Create PO with: supplier, expected date, notes, and line items
- Each line item: item type (Raw Material / Finished Good), item, quantity, unit cost
- **Auto-fill quantity**: when selecting an item, auto-calculates `minimumStock - currentQuantity` as the suggested order quantity
- Edit pending/partially-received POs
- Delete pending POs

### PO Statuses
`PENDING` → `PARTIALLY_RECEIVED` → `RECEIVED`

### Receive Items Flow
- Per-line-item receive dialog showing ordered vs. already-received quantities
- Partial receiving supported
- Over-receive protection: client-side validation prevents receiving more than the pending quantity
- On completion, inventory quantities are incremented automatically

### Inbound Stats Cards
- Pending Orders count
- Partially Received count
- Received Today count

### PO Progress Bar
- Visual per-PO progress bar showing `received / total ordered` units

### Receiving Report PDF
- One-click PDF download for any PO via `/api/reports/receiving/:id`
- Generated client-side using the `pdf-generator` library

### Restock from Inventory
- When the user clicks "Restock Selected" from the Inventory page, the selected items are stored in `localStorage` and the inbound page auto-opens the Create PO dialog with those items pre-populated

---

## 5. Outbound Operations

### Sales Orders (Outbound Orders)
- Create SO with: customer, ship date, priority, shipping address, notes, and line items
- Each line item: item type (Finished Good / Raw Material), item, quantity, unit price
- Edit preparing/ready SOs
- Delete non-shipped, non-delivered SOs

### SO Statuses
`PREPARING` → `READY` → `SHIPPED`

### Priority Levels
`LOW` (green) | `MEDIUM` (yellow) | `HIGH` / `URGENT` (red)

### Ship Order Flow
- Ship dialog pre-fills quantities (ordered − already shipped) per line item
- Partial shipping supported

### Outbound Stats Cards
- Preparing count
- Ready to Ship count
- Outbounded Today (shipped today)

### Shipping Report PDF
- One-click PDF download for any SO via `/api/reports/shipping/:id`

---

## 6. Production Management

### Production Orders
- Create production order specifying:
  - Target finished good
  - Target quantity
  - Raw materials required (material + quantity per material)
  - Notes / instructions
- Start production (status: PENDING → IN_PROGRESS)
- Complete production — enter actual produced quantity; inventory is updated automatically

### Production Statuses
`PENDING` → `IN_PROGRESS` → `COMPLETED`

### Production Stats Cards
- Pending Orders (awaiting start)
- In Progress (currently producing)
- Completed Today
- Total Units Produced (all-time)

---

## 7. Returns / Failed Delivery

> This module handles **courier failed delivery returns** — parcels that couldn't be delivered and need to be restocked into inventory.

### Parcel Scanning
- Dedicated barcode/tracking-number input field (auto-focused, Enter to submit)
- Looks up order data from the eSync2 backend API via tracking number
- **Bulk scan mode** — paste multiple tracking numbers (newline or comma separated) for batch processing

### Scan Queue (Persistent)
- Scanned parcels saved to the database per user (survive page refresh)
- Queue displays: tracking number, order number, customer name, COD amount, item count, scanned by, scanned at
- Two queue sections:
  - **Standard queue** — normal failed deliveries
  - **High COD Call List** — parcels with order value > 1,000 PKR, flagged with a pulsing red alert badge (requires call before processing)

### Process Return (Single Parcel)
- Opens a dialog listing all items in the order
- Auto-matches order items to IMS inventory items by SKU
- For **bundle SKUs**: automatically explodes into individual component items
- For unmatched items: searchable dropdown to manually select the IMS item
- Per-item fields: quantity, return reason, item condition, notes
- On submit: creates a return record, increments inventory quantities, removes parcel from the queue

### Return Reasons
- Courier didn't attempt
- Customer refused
- Customer unavailable
- Wrong address
- Customer changed mind

### Item Conditions Tracked
- GOOD, DAMAGED, DEFECTIVE, OPEN_BOX, MISSING_PARTS

### Bulk Restock
- Select multiple parcels from the queue (by section or individually)
- Opens a bulk dialog with one global reason + condition
- Unique-SKU mapping: user maps each unique SKU to an IMS item once; all selected parcels with that SKU use the same mapping
- Processes all selected parcels in sequence

### Returns History Table
- Paginated list (10/page) of all processed returns
- Columns: tracking number, order number, customer, items, status, processed by, date
- Filtering: by status, date range (start/end), search (tracking number / order number)
- Sortable columns with ascending/descending toggle
- View return details dialog

### Global Stats Cards
- Total Returns | Pending | Processing | Completed | Rejected

---

## 8. Reports & Analytics

### Period Selector
- Filter all metrics by: Last 7 days | Last 30 days | Last 90 days | Last year

### KPI Cards
| Metric | Description |
|--------|-------------|
| Avg Return Speed | Hours from parcel arrival to completed restock |
| Supplier On-Time Rate | % of inbound shipments that arrived on or before expected date |
| Total Operations | Combined inbound + outbound + return count |
| Avg Inbound Processing | Hours from order creation to all items received |

### Charts
- **Team Throughput** — Stacked area chart (inbound / outbound / returns) over time
- **Work Distribution** — Donut/pie chart showing % split across logistics tracks
- **Supplier Reliability** — Progress bar per supplier showing on-time delivery rate and total shipments analyzed
- **Failed Delivery Reasons** — Pie chart of return reasons with legend
- **Item Conditions** — Donut chart of condition distribution on returned items
- **Top 5 Most Returned Items** — Horizontal bar chart

### Performance Insights Panel
- Auto-generated text summaries for inbound efficiency, supplier health, and return handling based on current metrics

### Item Movement & Usage Table
- All inventory items with columns: SKU, Name, Type, Inbounded, Outbounded, Returned, Adjusted, Total Movement
- Search by SKU or Name
- Link to full Audit Log

### Audit Log (sub-page `/reports/audit`)
- Complete, paginated history of every inventory quantity change
- Columns: Date & Time, Item (name + SKU), Type, Change (±quantity color-coded), Balance After, Reason & Reference, User
- Filter by type: ALL | INCREASE | DECREASE | TRANSFER | PRODUCTION | DAMAGE
- Debounced search by reason or item name

### Export
- Full CSV export of all metrics, throughput trends, delivery reasons, conditions, and item movement data

---

## 9. Settings

### General Settings
- **Inventory Information**: name, code, address, manager name, contact number
- **System Preferences** (toggle switches + inputs):
  - Auto-generate SKUs for new items
  - Low stock alerts (notifications)
  - Quality check required for inbound items
  - Barcode scanning enabled
  - Default Stock Maintenance Days (used by Smart Min Stock auto-calculations)

### User Management
- List all users with name, email, role badge, status badge, last login
- Add new user (name, email, password, role)
- Edit user profile
- Delete user (cannot delete own account)
- **Per-user permission editor** — 3-state toggle per permission: Allow / Deny / Use Role Default

### Location Management
- Warehouse zones/shelves: name, auto-generated code, zone, type, capacity, occupied units
- Add / Edit / Delete locations
- Locations referenced by inventory items and inbound receipts

### Supplier Management
- Name, contact person, email, phone, address
- Add / Edit / Delete suppliers
- Suppliers referenced by raw materials and purchase orders

### Customer Management
- Name, email, phone, address
- Add / Edit / Delete customers
- Customers referenced by sales orders

### Category Management
- Flat list of item categories
- Add / Delete categories
- Categories referenced by inventory items

### Notification Settings
- Configurable notification preferences

---

## 10. AI Assistant

> Floating chat widget powered by **Google Gemini 2.0 Flash** via the Vercel AI SDK.

### Interface
- Fixed bottom-right floating button with expand text animation on hover
- Slide-in/out animation (Framer Motion)
- Minimizable to header bar only
- Live "active stats" status indicator

### Real-Time Tool Calls
The AI can query live inventory data mid-conversation:

| Tool | What it fetches |
|------|----------------|
| `getLowStockItems` | Current low-stock finished goods and raw materials |
| `getInventorySummary` | Total item counts and inventory value |
| `getRecentOrders` | Recent purchase orders (inbound) and sales orders (outbound) with statuses |
| `getItemDetails` | Specific item by name or SKU |

### Quick Suggestion Prompts
- "Low stock items?" — pre-built prompt
- "Recent order stats" — pre-built prompt

---

## Tech Stack Summary

| Layer | Technology |
|-------|-----------|
| **Framework** | Next.js 15 (App Router) |
| **Database ORM** | Prisma |
| **Database** | PostgreSQL |
| **UI Library** | Shadcn/UI + Tailwind CSS |
| **Charts** | Recharts |
| **PDF Generation** | Custom lib (jsPDF) |
| **AI** | Vercel AI SDK + Google Gemini 2.0 Flash |
| **Animation** | Framer Motion |
| **Auth** | Custom session-based auth context |
| **Deployment** | Vercel |
