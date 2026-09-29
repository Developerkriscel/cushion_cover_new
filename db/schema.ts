// Intentionally empty by default.
// Add Drizzle tables here when the site actually needs a database.
// See examples/d1/db/schema.ts for an opt-in example.
import { integer, sqliteTable, text, index } from 'drizzle-orm/sqlite-core';
export const products=sqliteTable('products',{id:text('id').primaryKey(),data:text('data').notNull()});
export const storeConfig=sqliteTable('store_config',{id:text('id').primaryKey(),data:text('data').notNull()});
export const media=sqliteTable('media',{id:text('id').primaryKey(),mime:text('mime').notNull(),data:text('data').notNull()});
export const checkoutSessions=sqliteTable('checkout_sessions',{id:text('id').primaryKey(),userId:text('user_id').notNull(),gatewayId:text('gateway_id').notNull().unique(),data:text('data').notNull(),settled:integer('settled').notNull().default(0),createdAt:text('created_at').notNull()});
export const shoppingState=sqliteTable('shopping_state',{userId:text('user_id').primaryKey(),data:text('data').notNull()});
export const orders=sqliteTable('orders',{id:text('id').primaryKey(),userId:text('user_id').notNull(),customer:text('customer').notNull(),address:text('address').notNull(),phone:text('phone').notNull(),pincode:text('pincode').notNull(),items:text('items').notNull(),total:integer('total').notNull(),status:text('status').notNull(),createdAt:text('created_at').notNull(),paymentMethod:text('payment_method'),paymentStatus:text('payment_status'),paymentId:text('payment_id')},t=>[index('idx_orders_created_at').on(t.createdAt)]);
