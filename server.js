require('dotenv').config();
const express = require('express');
const session = require('express-session');
const SQLiteStore = require('connect-sqlite3')(session);
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');

const app = express();
const port = Number(process.env.PORT || 3000);
const dataDir = path.join(__dirname, 'data');
fs.mkdirSync(dataDir, { recursive: true });
const db = new Database(path.join(dataDir, 'med.sqlite'));
db.pragma('journal_mode = WAL');
db.exec(`
CREATE TABLE IF NOT EXISTS products (
 id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, category TEXT NOT NULL,
 price REAL NOT NULL, old_price REAL DEFAULT 0, image TEXT DEFAULT '', description TEXT DEFAULT '',
 stock INTEGER DEFAULT 0, featured INTEGER DEFAULT 0, active INTEGER DEFAULT 1,
 created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS orders (
 id INTEGER PRIMARY KEY AUTOINCREMENT, customer_name TEXT NOT NULL, phone TEXT NOT NULL,
 address TEXT NOT NULL, items_json TEXT NOT NULL, total REAL NOT NULL,
 status TEXT DEFAULT 'নতুন', created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
`);
const count = db.prepare('SELECT COUNT(*) AS n FROM products').get().n;
if (!count) {
 const demo = [
  ['Wireless Bluetooth Earbuds','ইলেকট্রনিক্স',1290,1790,'https://images.unsplash.com/photo-1606220945770-b5b6c2c55bf1?w=700','দৈনন্দিন ব্যবহারের জন্য আরামদায়ক ওয়্যারলেস ইয়ারবাডস।',25,1],
  ['Smart Watch Series','ইলেকট্রনিক্স',2190,2990,'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=700','স্টাইলিশ স্মার্ট ওয়াচ।',18,1],
  ['Everyday Backpack','ফ্যাশন',990,1290,'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=700','হালকা ও টেকসই ব্যাকপ্যাক।',30,1],
  ['Skincare Essentials','বিউটি ও কসমেটিকস',750,950,'https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?w=700','প্রতিদিনের স্কিনকেয়ার রুটিনের জন্য।',20,0],
  ['Classic Sneakers','জুতা',1890,2390,'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=700','ক্যাজুয়াল ব্যবহারের জন্য স্নিকার্স।',14,1],
  ['Home Desk Lamp','হোম ও লিভিং',850,1100,'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=700','ঘর বা ডেস্কের জন্য মিনিমাল ল্যাম্প।',12,0],
  ['Cotton Casual Shirt','পোশাক',690,890,'https://images.unsplash.com/photo-1598033129183-c4f50c736f10?w=700','আরামদায়ক কটন ক্যাজুয়াল শার্ট।',22,0],
  ['Portable Mini Speaker','ইলেকট্রনিক্স',1490,1890,'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=700','ছোট আকারে দারুণ সাউন্ড।',16,1]
 ];
 const ins = db.prepare('INSERT INTO products(name,category,price,old_price,image,description,stock,featured) VALUES(?,?,?,?,?,?,?,?)');
 demo.forEach(p => ins.run(...p));
}
const adminHash = process.env.ADMIN_PASSWORD ? bcrypt.hashSync(process.env.ADMIN_PASSWORD, 12) : null;
if (!process.env.ADMIN_PASSWORD || !process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32) {
 console.warn('WARNING: Set ADMIN_PASSWORD and a SESSION_SECRET of at least 32 characters in .env before production.');
}
app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false }));
app.use(session({
 store: new SQLiteStore({ db: 'sessions.sqlite', dir: dataDir }),
 secret: process.env.SESSION_SECRET || 'development-only-change-this-secret-now',
 resave: false, saveUninitialized: false,
 cookie: { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: 8 * 60 * 60 * 1000 }
}));
app.use(express.static(path.join(__dirname, 'public')));
const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 8, standardHeaders: 'draft-7', legacyHeaders: false });
const adminOnly = (req,res,next) => req.session && req.session.admin ? next() : res.status(401).json({error:'অনুমতি নেই'});

app.get('/api/config', (req,res) => res.json({ storeName:'MED', whatsapp:process.env.WHATSAPP_NUMBER || '8801610236116' }));
app.get('/api/products', (req,res) => {
 const rows = db.prepare('SELECT id,name,category,price,old_price,image,description,stock,featured FROM products WHERE active=1 ORDER BY featured DESC,id DESC').all();
 res.json(rows);
});
app.post('/api/orders', (req,res) => {
 const {name,phone,address,items} = req.body || {};
 if (!name || !phone || !address || !Array.isArray(items) || !items.length || items.length > 30) return res.status(400).json({error:'সব তথ্য সঠিকভাবে দিন'});
 let total = 0; const clean = [];
 for (const item of items) {
  const p = db.prepare('SELECT id,name,price,stock FROM products WHERE id=? AND active=1').get(Number(item.id));
  const qty = Math.max(1, Math.min(20, Number(item.qty)||1));
  if (!p || p.stock < qty) return res.status(400).json({error:'একটি পণ্য পর্যাপ্ত স্টকে নেই'});
  total += p.price * qty; clean.push({id:p.id,name:p.name,price:p.price,qty});
 }
 const tx = db.transaction(() => {
  const info = db.prepare('INSERT INTO orders(customer_name,phone,address,items_json,total) VALUES(?,?,?,?,?)').run(String(name).slice(0,100),String(phone).slice(0,30),String(address).slice(0,500),JSON.stringify(clean),total);
  const upd = db.prepare('UPDATE products SET stock=stock-? WHERE id=?');
  clean.forEach(i=>upd.run(i.qty,i.id)); return info.lastInsertRowid;
 });
 const orderId = tx(); res.status(201).json({ok:true,orderId,total});
});
app.post('/api/admin/login', loginLimiter, (req,res) => {
 if (!adminHash) return res.status(503).json({error:'.env ফাইলে ADMIN_PASSWORD সেট করুন'});
 const ok = typeof req.body.password === 'string' && bcrypt.compareSync(req.body.password, adminHash);
 if (!ok) return res.status(401).json({error:'পাসওয়ার্ড সঠিক নয়'});
 req.session.regenerate(err => { if(err) return res.status(500).json({error:'লগইন করা যায়নি'}); req.session.admin = true; res.json({ok:true}); });
});
app.post('/api/admin/logout', adminOnly, (req,res) => req.session.destroy(()=>res.json({ok:true})));
app.get('/api/admin/me', (req,res) => res.json({loggedIn:!!(req.session && req.session.admin)}));
app.get('/api/admin/orders', adminOnly, (req,res) => res.json(db.prepare('SELECT * FROM orders ORDER BY id DESC LIMIT 300').all().map(o=>({...o,items:JSON.parse(o.items_json)}))));
app.patch('/api/admin/orders/:id', adminOnly, (req,res) => {
 const allowed = ['নতুন','নিশ্চিত','পাঠানো হয়েছে','সম্পন্ন','বাতিল'];
 if (!allowed.includes(req.body.status)) return res.status(400).json({error:'স্ট্যাটাস সঠিক নয়'});
 const info=db.prepare('UPDATE orders SET status=? WHERE id=?').run(req.body.status,Number(req.params.id)); res.json({ok:info.changes>0});
});
app.post('/api/admin/products', adminOnly, (req,res) => {
 const p=req.body||{}; if(!p.name||!p.category||!(Number(p.price)>0)) return res.status(400).json({error:'নাম, ক্যাটাগরি ও সঠিক দাম দিন'});
 const info=db.prepare('INSERT INTO products(name,category,price,old_price,image,description,stock,featured) VALUES(?,?,?,?,?,?,?,?)').run(String(p.name).slice(0,120),String(p.category).slice(0,80),Number(p.price),Number(p.old_price)||0,String(p.image||'').slice(0,1000),String(p.description||'').slice(0,1000),Math.max(0,Number(p.stock)||0),p.featured?1:0);
 res.status(201).json({id:info.lastInsertRowid});
});
app.put('/api/admin/products/:id', adminOnly, (req,res) => {
 const p=req.body||{}; if(!p.name||!p.category||!(Number(p.price)>0)) return res.status(400).json({error:'নাম, ক্যাটাগরি ও সঠিক দাম দিন'});
 const info=db.prepare('UPDATE products SET name=?,category=?,price=?,old_price=?,image=?,description=?,stock=?,featured=?,active=? WHERE id=?').run(String(p.name).slice(0,120),String(p.category).slice(0,80),Number(p.price),Number(p.old_price)||0,String(p.image||'').slice(0,1000),String(p.description||'').slice(0,1000),Math.max(0,Number(p.stock)||0),p.featured?1:0,p.active===false?0:1,Number(req.params.id)); res.json({ok:info.changes>0});
});
app.delete('/api/admin/products/:id', adminOnly, (req,res) => { const info=db.prepare('UPDATE products SET active=0 WHERE id=?').run(Number(req.params.id)); res.json({ok:info.changes>0}); });
app.get('/api/admin/stats', adminOnly, (req,res) => res.json({products:db.prepare('SELECT COUNT(*) n FROM products WHERE active=1').get().n,orders:db.prepare('SELECT COUNT(*) n FROM orders').get().n,revenue:db.prepare("SELECT COALESCE(SUM(total),0) n FROM orders WHERE status!='বাতিল'").get().n}));
app.get('*', (req,res) => res.sendFile(path.join(__dirname,'public','index.html')));
app.listen(port,()=>console.log(`MED store running on http://localhost:${port}`));
