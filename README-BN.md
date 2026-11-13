# MED অনলাইন শপ — প্রাথমিক ওয়েবসাইট

এটি MED-এর জন্য একটি responsive e-commerce starter project। কাস্টমার অ্যাকাউন্ট ছাড়াই পণ্য দেখতে, কার্টে যোগ করতে এবং নাম/ফোন/ঠিকানা দিয়ে অর্ডার করতে পারবেন। অ্যাডমিন লগইন করে পণ্য ও অর্ডার ম্যানেজ করতে পারবেন।

## এই সংস্করণে আছে
- সব ধরনের পণ্যের জন্য ক্যাটাগরি, সার্চ ও প্রোডাক্ট কার্ড
- Guest checkout (কাস্টমার অ্যাকাউন্ট নেই)
- Cash on Delivery ভিত্তিক অর্ডার রেকর্ড
- WhatsApp যোগাযোগ বাটন: 01610236116
- Admin password login, product add/remove, order status update
- SQLite ডাটাবেসে পণ্য ও অর্ডার সংরক্ষণ

## নিজের কম্পিউটারে চালানো
1. Node.js 20 বা তার নতুন সংস্করণ ইনস্টল করুন।
2. এই ফোল্ডারে টার্মিনাল খুলে `npm install` চালান।
3. `.env.example` কপি করে `.env` নাম দিন।
4. `.env` ফাইলে `ADMIN_PASSWORD`-এ শক্তিশালী নতুন পাসওয়ার্ড দিন এবং `SESSION_SECRET`-এ কমপক্ষে ৩২ অক্ষরের random secret দিন।
5. `npm start` চালান।
6. ব্রাউজারে `http://localhost:3000` খুলুন। অ্যাডমিন: উপরের ডানদিকের Admin লিংক।

## অনলাইনে প্রকাশের আগে জরুরি
- `.env` কখনো GitHub বা কারও সঙ্গে শেয়ার করবেন না।
- Production-এ HTTPS বাধ্যতামূলক; `NODE_ENV=production` সেট করুন।
- হোস্টিংয়ে persistent disk/volume যুক্ত করে `data/` ফোল্ডার সংরক্ষণ করুন, না হলে SQLite ডেটা হারাতে পারে।
- ব্যাকআপ চালু করুন এবং ডেমো পণ্য বদলে নিজের পণ্য/ছবি দিন।
- WhatsApp নম্বর পরিবর্তন করতে `.env`-এর `WHATSAPP_NUMBER` আন্তর্জাতিক ফরম্যাটে দিন (বাংলাদেশের 016... নম্বরের আগে 88, যেমন `8801610236116`)।

## গুরুত্বপূর্ণ সীমাবদ্ধতা
এটি একটি প্রথম কার্যকর starter build, এখনো public hosting-এ deploy করা হয়নি এবং কোনো live domain নেই। অনলাইন পেমেন্ট gateway, courier API, invoice/receipt, image upload service, advanced editing, stock refund-on-cancel এবং production deployment configuration পরবর্তী ধাপে যোগ করতে হবে। ডেমো পণ্যের ছবি external image URLs থেকে লোড হয়।
