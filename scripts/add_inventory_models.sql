-- Add InventorySettings table
CREATE TABLE IF NOT EXISTS inventory_settings (
  id TEXT PRIMARY KEY,
  finished_good_id TEXT NOT NULL UNIQUE,
  reorder_point INTEGER NOT NULL,
  reorder_quantity INTEGER NOT NULL,
  max_stock_level INTEGER NOT NULL,
  lead_time_days INTEGER NOT NULL DEFAULT 7,
  status BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (finished_good_id) REFERENCES finished_goods(id) ON DELETE CASCADE
);

-- Add WarehouseOrder table
CREATE TABLE IF NOT EXISTS warehouse_orders (
  id TEXT PRIMARY KEY,
  order_number TEXT NOT NULL UNIQUE,
  finished_good_id TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING',
  requested_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  received_date TIMESTAMP,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (finished_good_id) REFERENCES finished_goods(id) ON DELETE RESTRICT
);

-- Create indexes for better query performance
CREATE INDEX idx_inventory_settings_finished_good_id ON inventory_settings(finished_good_id);
CREATE INDEX idx_warehouse_orders_finished_good_id ON warehouse_orders(finished_good_id);
CREATE INDEX idx_warehouse_orders_status ON warehouse_orders(status);
CREATE INDEX idx_warehouse_orders_requested_date ON warehouse_orders(requested_date);
