import {env} from 'cloudflare:workers';
import {initialProducts,Product} from './catalog';
import {categories,defaultSettings,ShopSettings,Coupon} from './shop-config';
export const E=()=>env as unknown as {DB:D1Database;ADMIN_PASSWORD:string;CASHFREE_CLIENT_ID?:string;CASHFREE_CLIENT_SECRET?:string;CASHFREE_LIVE_ENABLED?:string};
let schemaReady:Promise<void>|null=null;
export async function ensureStoreSchema(){if(schemaReady)return schemaReady;schemaReady=(async()=>{const db=E().DB;if(!db)throw Error('Database binding DB is missing.');for(const statement of [
'CREATE TABLE IF NOT EXISTS products (id TEXT PRIMARY KEY NOT NULL,data TEXT NOT NULL)',
'CREATE TABLE IF NOT EXISTS store_config (id TEXT PRIMARY KEY NOT NULL,data TEXT NOT NULL)',
'CREATE TABLE IF NOT EXISTS media (id TEXT PRIMARY KEY NOT NULL,mime TEXT NOT NULL,data TEXT NOT NULL)',
'CREATE TABLE IF NOT EXISTS shopping_state (user_id TEXT PRIMARY KEY NOT NULL,data TEXT NOT NULL)',
'CREATE TABLE IF NOT EXISTS checkout_sessions (id TEXT PRIMARY KEY NOT NULL,user_id TEXT NOT NULL,gateway_id TEXT NOT NULL,data TEXT NOT NULL,settled INTEGER DEFAULT 0 NOT NULL,created_at TEXT NOT NULL)',
'CREATE TABLE IF NOT EXISTS orders (id TEXT PRIMARY KEY NOT NULL,user_id TEXT NOT NULL,customer TEXT NOT NULL,address TEXT NOT NULL,phone TEXT NOT NULL,pincode TEXT NOT NULL,items TEXT NOT NULL,total INTEGER NOT NULL,status TEXT NOT NULL,created_at TEXT NOT NULL,payment_method TEXT,payment_status TEXT,payment_id TEXT)',
'CREATE TABLE IF NOT EXISTS customers (email TEXT PRIMARY KEY,password TEXT,name TEXT,last_name TEXT,phone TEXT,addresses TEXT,created_at TEXT DEFAULT CURRENT_TIMESTAMP)'
])await db.prepare(statement).run();for(const statement of [
'CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders (created_at)',
'CREATE UNIQUE INDEX IF NOT EXISTS checkout_sessions_gateway_id_unique ON checkout_sessions (gateway_id)'
]){try{await db.prepare(statement).run()}catch{}}for(const statement of [
'ALTER TABLE orders ADD COLUMN payment_method TEXT',
'ALTER TABLE orders ADD COLUMN payment_status TEXT',
'ALTER TABLE orders ADD COLUMN payment_id TEXT',
'ALTER TABLE customers ADD COLUMN phone TEXT',
'ALTER TABLE customers ADD COLUMN last_name TEXT',
'ALTER TABLE customers ADD COLUMN addresses TEXT',
'ALTER TABLE customers ADD COLUMN created_at TEXT DEFAULT CURRENT_TIMESTAMP'
]){try{await db.prepare(statement).run()}catch{}}})();return schemaReady}
export async function config<T>(id:string,fallback:T):Promise<T>{await ensureStoreSchema();const r=await E().DB.prepare('SELECT data FROM store_config WHERE id=?').bind(id).first<{data:string}>();return r?JSON.parse(r.data):fallback}
export async function settings(){const saved=await config<Partial<ShopSettings>&{paymentMode?:string}>('settings',{});return {...defaultSettings,...saved,paymentMode:saved.paymentMode==='test'?'test':'live'} as ShopSettings}
export const coupons=()=>config<Coupon[]>('coupons',[]);
export async function products(){await ensureStoreSchema();const rows=await E().DB.prepare('SELECT data FROM products').all<{data:string}>();const map=new Map(initialProducts.map(p=>[p.id,p]));for(const r of rows.results){try{const p=JSON.parse(r.data) as Product & {deleted?:boolean};if(/^(vase|oven)-/.test(p.id))continue;if((p as any).deleted){map.delete(p.id);continue;}const base=map.get(p.id);map.set(p.id,{...base,...p,image:p.image||base?.image,category:categories.includes(p.category as any)?p.category:(base?.category||p.category),color:p.color||base?.color||'Other',size:p.size||base?.size||'Standard'});}catch{}}return [...map.values()].filter(p=>!(p as any).deleted && categories.includes(p.category as any))}
export async function hmac(v:string,secret=E().ADMIN_PASSWORD){if(!secret)throw Error('Server configuration is missing');const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);return Array.from(new Uint8Array(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(v)))).map(x=>x.toString(16).padStart(2,'0')).join('')}
export async function hmacBase64(v:string,secret:string){const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);const bytes=new Uint8Array(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(v)));let binary='';for(const byte of bytes)binary+=String.fromCharCode(byte);return btoa(binary)}
export function equal(a:string,b:string){if(a.length!==b.length)return false;let n=0;for(let i=0;i<a.length;i++)n|=a.charCodeAt(i)^b.charCodeAt(i);return n===0}
function cookie(req:Request,key:string){return req.headers.get('cookie')?.split('; ').find(x=>x.startsWith(key+'='))?.slice(key.length+1)||''}
export async function admin(req:Request){const [exp,sig]=cookie(req,'aangan_admin').split('.');return !!sig&&Number(exp)>Date.now()&&equal(sig,await hmac(exp))}
export async function user(req:Request){const uid=req.headers.get('oai-authenticated-user-id');if(uid)return uid;const customer=cookie(req,'velto_customer');if(customer){const parts=customer.split('|');if(parts.length>=3){const sig=parts.pop();const exp=parts.pop();const email=parts.join('|');if(email&&exp&&sig&&Number(exp)>Date.now()&&equal(sig,await hmac(email+exp)))return 'customer:'+email}}const [id,sig]=cookie(req,'velto_guest').split('.');if(id&&sig&&equal(sig,await hmac('guest:'+id)))return 'guest:'+id;return null}
export async function guestCookie(){const id=crypto.randomUUID();return `velto_guest=${id}.${await hmac('guest:'+id)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=2592000`}
export function paymentStatus(s:ShopSettings){const e=E();const keys=!!e.CASHFREE_CLIENT_ID&&!!e.CASHFREE_CLIENT_SECRET;const test=keys;const live=keys&&e.CASHFREE_LIVE_ENABLED==='true';return {provider:'Cashfree',mode:s.paymentMode,ready:s.paymentMode==='test'?test:live,testReady:test,liveReady:live}}
export async function quote(items:any,code:unknown){if(!Array.isArray(items)||items.length<1||items.length>20)throw Error('Choose between 1 and 20 products.');const ps=await products();const seen=new Set();const lines=items.map((x:any)=>{const p=ps.find(p=>p.id===x.id);if(!p||seen.has(x.id)||!Number.isInteger(x.qty)||x.qty<1||x.qty>Math.min(p.stock,20))throw Error('An item or quantity is unavailable. Update your bag.');seen.add(x.id);return {id:p.id,name:p.name,qty:x.qty,price:p.price,image:p.image.split(',')[0],color:p.color,size:p.size}});const subtotal=lines.reduce((s:number,x:any)=>s+x.price*x.qty,0);let discount=0;const normalized=typeof code==='string'?code.trim().toUpperCase():'';if(normalized){const c=(await coupons()).find(c=>c.code===normalized&&c.active);if(!c||(c.expires&&new Date(c.expires+'T23:59:59+05:30').getTime()<Date.now()))throw Error('Coupon is invalid or expired.');if(subtotal<c.minOrder)throw Error(`This coupon requires a minimum order of ₹${c.minOrder}.`);discount=Math.min(subtotal-1,c.type==='percent'?Math.floor(subtotal*c.value/100):c.value)}return {items:lines,subtotal,discount,total:subtotal-discount,coupon:normalized}}
export function customer(b:any){if(typeof b.name!=='string'||b.name.trim().length<2||b.name.length>100||typeof b.address!=='string'||b.address.trim().length<10||b.address.length>500||typeof b.phone!=='string'||!/^\d{10}$/.test(b.phone)||typeof b.pincode!=='string'||!/^\d{6}$/.test(b.pincode))throw Error('Check your name, address, 10-digit phone and 6-digit pincode.');return {name:b.name.trim(),address:b.address.trim(),phone:b.phone,pincode:b.pincode}}
