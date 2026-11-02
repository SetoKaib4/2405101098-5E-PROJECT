/* REIONIA Web Store — UTS Pemrograman Web Dasar
   Single-page website menggunakan HTML, CSS, dan JavaScript. */
'use strict';

const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];

/* Foto referensi produk per varian warna. Gambar dimuat dari URL sumber eksternal.
   Admin dapat mengganti foto produk dari dashboard. */
const PRODUCT_COLOR_IMAGES = {
  1: {
    Black: 'https://lomalab.store/cdn/shop/files/JETBLACK_60ecf8aa-a9ed-451f-88e1-2a53d02efdb7.png?v=1715933139&width=2048',
    White: 'https://down-tw.img.susercontent.com/file/tw-11134207-7qul4-lfmw90p6s1yi84',
  },
  2: {
    Black: 'https://cdn.mfs.ua/source/1/pxo7nCjhAPbd2iEZsGbw086j8yyELYPj.jpg',
    Charcoal: 'https://shbamovement.com/cdn/shop/files/Untitled_Instagram_Post_54_1000x.png?v=1732671371',
  },
  3: {
    Black: 'https://cdn.shopify.com/s/files/1/0656/6631/8569/files/tactical-hoodie-for-men-azuno-black-m-techwear-storm-530.webp',
    Red: 'https://cubbystores.com/cdn/shop/files/red_m_fr.jpg?v=1746537828&width=1946',
  },
  4: {
    Black: 'https://media.endclothing.com/media/catalog/product/1/3/13-01-2023-JB_GOOP-ACRYP-A05G-BLK_1_1.jpg',
    Olive: 'https://techwearstorm.com/cdn/shop/files/tech-cargo-pants-urayasu-green-m-techwear-storm-602.webp?v=1716779820&width=930',
  },
  5: {
    Black: 'https://www.orbitgear.id/cdn/shop/files/S352_Full_3.jpg?v=1709621426',
  },
};
const PRODUCT_IMAGES = {
  1: PRODUCT_COLOR_IMAGES[1].Black,
  2: PRODUCT_COLOR_IMAGES[2].Black,
  3: PRODUCT_COLOR_IMAGES[3].Black,
  4: PRODUCT_COLOR_IMAGES[4].Olive,
  5: PRODUCT_COLOR_IMAGES[5].Black,
};
const productImage = (product, color = product?.colors?.[0]) =>
  product?.photoByColor?.[color] || PRODUCT_COLOR_IMAGES[product?.id]?.[color] || product?.photo || PRODUCT_IMAGES[product?.id] || '';
const COURIERS = { JNE: 20000, 'J&T': 18000, SiCepat: 15000 };
const STATUS = ['Menunggu Pembayaran', 'Menunggu Verifikasi', 'Diproses', 'Dikirim', 'Selesai'];
const KEY = 'reionia_db_v1';
const $ = (s) => document.querySelector(s);
const rp = (n) => 'Rp' + Number(n).toLocaleString('id-ID');
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const stk = (n) => Object.fromEntries(SIZES.map((s, i) => [s, n[i] ?? 0]));

/* ---------- Data aplikasi ---------- */
const seed = () => ({
  cats: ['Tees', 'Hoodie', 'Pants', 'Bags'],
  products: [
    { id: 1, name: 'REIONIA Essential Tee', cat: 'Tees', price: 189000, colors: ['Black', 'White'], stock: stk([5, 12, 15, 10, 6, 2]), active: true, sold: 24, desc: 'Kaos cotton combed 24s, potongan boxy, sablon rubber minimalis di dada.' },
    { id: 2, name: 'REIONIA Oversized Graphic Tee', cat: 'Tees', price: 229000, colors: ['Black', 'Charcoal'], stock: stk([0, 8, 10, 10, 4, 0]), active: true, sold: 31, desc: 'Oversized fit, cotton 20s heavyweight, grafis eksperimental di bagian punggung.' },
    { id: 3, name: 'REIONIA Signature Hoodie', cat: 'Hoodie', price: 459000, colors: ['Black', 'Red'], stock: stk([0, 4, 6, 6, 3, 1]), active: true, sold: 18, desc: 'Hoodie fleece 320gsm, bordir logo REIONIA, kantong kanguru dan hood dua lapis.' },
    { id: 4, name: 'REIONIA Cargo Pants', cat: 'Pants', price: 389000, colors: ['Black', 'Olive'], stock: stk([0, 5, 8, 8, 5, 0]), active: true, sold: 12, desc: 'Celana cargo ripstop dengan enam kantong, pinggang adjustable, potongan relaxed.' },
    { id: 5, name: 'REIONIA Utility Bag', cat: 'Bags', price: 279000, colors: ['Black'], stock: stk([0, 0, 9, 0, 0, 0]), active: true, sold: 20, desc: 'Tas selempang utility water-resistant dengan tiga kompartemen dan strap adjustable.' },
  ],
  users: [
    { id: 1, name: 'Admin REIONIA', email: 'admin@reionia.id', phone: '081200000000', pass: 'admin123', role: 'admin', addresses: [] },
  ],
  orders: [], cart: [], cartOwner: null, session: null,
});
function loadDatabase() {
  try {
    const stored = JSON.parse(localStorage.getItem(KEY) || 'null');
    return stored && typeof stored === 'object' ? { ...seed(), ...stored } : seed();
  } catch (error) {
    console.warn('Data REIONIA tidak dapat dibaca. Data awal digunakan.', error);
    return seed();
  }
}
let db = loadDatabase();
if (!Array.isArray(db.users)) db.users = seed().users;
if (!Array.isArray(db.products)) db.products = seed().products;
if (!Array.isArray(db.cats)) db.cats = seed().cats;
if (!Array.isArray(db.orders)) db.orders = [];
if (!Array.isArray(db.cart)) db.cart = [];
if (db.cartOwner !== db.session) { db.cart = []; db.cartOwner = db.session ?? null; }
for (const product of db.products) {
  product.colors = Array.isArray(product.colors) && product.colors.length ? [...new Set(product.colors)] : ['Black'];
  if (!product.stockByColor) {
    const legacyStock = product.stock || stk([]);
    const colorCount = product.colors.length;
    product.stockByColor = Object.fromEntries(product.colors.map((color, index) => [color,
      Object.fromEntries(SIZES.map((size) => {
        const qty = Math.max(0, Number(legacyStock[size]) || 0);
        const each = Math.floor(qty / colorCount);
        const remainder = qty % colorCount;
        return [size, each + (index < remainder ? 1 : 0)];
      }))
    ]));
  } else {
    for (const color of product.colors) if (!product.stockByColor[color]) product.stockByColor[color] = stk([]);
  }
}
const save = () => {
  try { localStorage.setItem(KEY, JSON.stringify(db)); }
  catch (error) { console.error('Data tidak dapat disimpan pada browser ini.', error); toast('Penyimpanan browser penuh atau tidak tersedia.'); }
  updateNav();
};
const me = () => db.users.find((u) => u.id === db.session);
const isAdmin = () => me()?.role === 'admin';
const prod = (id) => db.products.find((p) => p.id == id);
const stockFor = (p, color) => p?.stockByColor?.[color] || p?.stock || stk([]);
const totalStock = (p) => Object.values(p.stockByColor || { default: p.stock || stk([]) })
  .reduce((sum, inventory) => sum + Object.values(inventory).reduce((a, b) => a + (Number(b) || 0), 0), 0);

function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('show'), 2200);
}
function updateNav() {
  const count = db.cart.reduce((a, i) => a + i.qty, 0);
  $('#cartCount').textContent = count;
  const u = me();
  const admin = isAdmin();
  $('#navAcc').href = !u ? '#/login' : admin ? '#/admin' : '#/account';
  $('#navAcc').setAttribute('aria-label', !u ? 'Masuk' : admin ? 'Dashboard Admin' : 'Akun Saya');
  $('#navAcc').title = !u ? 'Masuk' : admin ? 'Dashboard Admin' : 'Akun Saya';
}

/* ---------- Komponen ---------- */
const card = (p) => {
  const out = totalStock(p) === 0;
  const photo = productImage(p, p.colors?.[0]);
  return `<a class="card" href="#/product/${p.id}">
    <div class="img">${photo ? `<img src="${esc(photo)}" alt="${esc(p.name)}" loading="lazy">` : '<b>FOTO PRODUK BELUM TERSEDIA</b>'}${out ? '<span class="tag out">HABIS</span>' : p.sold > 25 ? '<span class="tag">BEST SELLER</span>' : ''}</div>
    <h3>${esc(p.name)}</h3><div class="price">${rp(p.price)} · ${out ? 'Stok habis' : 'Stok ' + totalStock(p)}</div></a>`;
};
const badge = (s) => `<span class="badge ${s === 'Selesai' || s === 'Diproses' || s === 'Dikirim' ? 'ok' : s === 'Ditolak' ? 'bad' : 'warn'}">${esc(s)}</span>`;
const timeline = (st) => { const i = STATUS.indexOf(st); return `<div class="timeline">${STATUS.map((s, k) => `<div class="${k <= i ? 'done' : ''}">${s}</div>`).join('')}</div>`; };
const needLogin = (admin) => {
  const u = me();
  if (!u) return `<section class="wrap"><h2>Silakan masuk</h2><p class="muted">Anda harus login untuk membuka halaman ini.</p><br><a class="btn" href="#/login">Login</a></section>`;
  if (admin && u.role !== 'admin') return `<section class="wrap"><h2>Akses ditolak</h2><p class="muted">Halaman ini khusus admin.</p></section>`;
  return null;
};

/* ---------- Halaman publik ---------- */
const pages = {};

pages.home = () => {
  const act = db.products.filter((p) => p.active);
  const best = [...act].sort((a, b) => b.sold - a.sold).slice(0, 4);
  return `
  <section class="hero"><h1>Beyond<br>The <span>Ordinary.</span></h1>
    <p>An independent apparel label exploring identity, individuality, and contemporary street culture.</p>
    <div><a class="btn" href="#/shop">Belanja Koleksi</a></div></section>
  <section class="wrap"><div class="sec-head"><h2>Kategori</h2></div>
    <div class="cats">${db.cats.map((c) => `<a href="#/shop/${encodeURIComponent(c)}">${esc(c)} →</a>`).join('')}</div></section>
  <section class="wrap"><div class="sec-head"><h2>New Arrivals</h2><a href="#/shop">Lihat semua →</a></div>
    <div class="grid">${act.slice(-4).reverse().map(card).join('')}</div></section>
  <section class="wrap"><div class="sec-head"><h2>Best Sellers</h2></div><div class="grid">${best.map(card).join('')}</div></section>
  <section class="statement"><h2>Identity is not<br>a template.</h2><p>REIONIA lahir dari budaya jalanan dan keinginan untuk tampil berbeda. Minimalis, gelap, dan tanpa kompromi.</p></section>
  <section class="wrap"><div class="sec-head"><h2>Newsletter</h2></div><p class="muted">Dapatkan info terbaru lebih dulu.</p>
    <form class="news" onsubmit="event.preventDefault();toast('Terima kasih, email terdaftar');this.reset()"><input type="email" placeholder="Email Anda" required><button class="btn">Daftar</button></form></section>`;
};

pages.shop = (cat) => {
  cat = cat ? decodeURIComponent(cat) : '';
  return `<section class="wrap"><div class="sec-head"><h2>Shop</h2><span class="muted" id="resCount"></span></div>
  <div class="toolbar">
    <input id="fQ" type="search" placeholder="Cari produk...">
    <select id="fCat"><option value="">Semua kategori</option>${db.cats.map((c) => `<option ${c === cat ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select>
    <select id="fSize"><option value="">Semua ukuran</option>${SIZES.map((s) => `<option>${s}</option>`).join('')}</select>
    <select id="fSort"><option value="">Urutkan</option><option value="asc">Harga terendah</option><option value="desc">Harga tertinggi</option></select>
  </div><div class="grid" id="shopGrid"></div></section>`;
};
function filterShop() {
  const q = $('#fQ').value.toLowerCase(), c = $('#fCat').value, s = $('#fSize').value, o = $('#fSort').value;
  let list = db.products.filter((p) => p.active && p.name.toLowerCase().includes(q) && (!c || p.cat === c) && (!s || p.colors.some((color) => stockFor(p, color)[s] > 0)));
  if (o) list.sort((a, b) => (o === 'asc' ? a.price - b.price : b.price - a.price));
  $('#shopGrid').innerHTML = list.map(card).join('') || '<p class="muted">Produk tidak ditemukan.</p>';
  $('#resCount').textContent = list.length + ' produk';
}

let pick = { size: '', color: '' };
pages.product = (id) => {
  const p = prod(id);
  if (!p || !p.active) return '<section class="wrap"><h2>Produk tidak ditemukan</h2></section>';
  pick = { size: '', color: p.colors[0] };
  const photo = productImage(p, pick.color);
  const rel = db.products.filter((x) => x.active && x.id !== p.id && x.cat === p.cat).concat(db.products.filter((x) => x.active && x.id !== p.id && x.cat !== p.cat)).slice(0, 4);
  return `<section class="wrap"><div class="detail">
    <div class="gallery">${photo ? `<div class="img" id="productPhotoFrame"><img id="productMainPhoto" src="${esc(photo)}" alt="${esc(p.name)} - ${esc(pick.color)}" loading="lazy"></div>` : `<div class="img" id="productPhotoFrame">FOTO PRODUK BELUM TERSEDIA</div>`}</div>
    <div><p class="muted">${esc(p.cat)}</p><h1>${esc(p.name)}</h1><p class="price" style="font-size:22px;margin:10px 0">${rp(p.price)}</p>
      <p class="muted">${esc(p.desc)}</p>
      <label>Warna</label><div class="sizes">${p.colors.map((c, i) => `<button class="size ${i ? '' : 'on'}" data-color="${esc(c)}">${esc(c)}</button>`).join('')}</div>
      <label>Ukuran</label><div class="sizes">${SIZES.map((s) => `<button class="size" data-size="${s}" ${stockFor(p, pick.color)[s] ? '' : 'disabled'}>${s}</button>`).join('')}</div>
      <p id="stockInfo" class="muted" style="margin:10px 0">Pilih ukuran untuk melihat stok.</p>
      <label>Panduan ukuran</label><p class="muted" style="font-size:13px">XS 48 · S 50 · M 52 · L 54 · XL 56 · XXL 58 (lebar dada, cm)</p><br>
      <button class="btn" id="addBtn">Tambah ke Keranjang</button></div></div>
    <div class="sec-head" style="margin-top:70px"><h2>Produk Terkait</h2></div><div class="grid">${rel.map(card).join('')}</div></section>`;
};

pages.cart = () => {
  if (!db.cart.length) return '<section class="wrap"><h2>Keranjang kosong</h2><br><a class="btn" href="#/shop">Mulai Belanja</a></section>';
  const sub = cartSub();
  return `<section class="wrap"><div class="sec-head"><h2>Keranjang</h2></div><div class="two"><div class="tbl"><table>
    <tr><th>Produk</th><th>Ukuran</th><th>Jumlah</th><th>Harga</th><th></th></tr>
    ${db.cart.map((i, k) => { const p = prod(i.pid); return `<tr><td>${esc(p.name)}<br><small class="muted">${esc(i.color)}</small></td><td>${i.size}</td>
      <td><div class="qty"><button data-q="${k}" data-d="-1">−</button><span>${i.qty}</span><button data-q="${k}" data-d="1">+</button></div></td>
      <td>${rp(p.price * i.qty)}</td><td><button class="btn ghost sm" data-rm="${k}">Hapus</button></td></tr>`; }).join('')}
    </table></div>
    <div class="box"><h3>Ringkasan</h3><div class="row"><span>Subtotal</span><span>${rp(sub)}</span></div>
      <div class="row"><span>Ongkir</span><span class="muted">Dihitung saat checkout</span></div><br>
      <a class="btn" href="#/checkout">Checkout</a></div></div></section>`;
};
const cartSub = () => db.cart.reduce((a, i) => a + prod(i.pid).price * i.qty, 0);
const shipCost = (c) => (cartSub() >= 500000 ? 0 : COURIERS[c]);

pages.checkout = () => {
  const g = needLogin(); if (g) return g;
  if (!db.cart.length) return '<section class="wrap"><h2>Keranjang kosong</h2></section>';
  const addresses = me().addresses || [];
  const a = addresses[0] || {};
  return `<section class="wrap"><div class="sec-head"><h2>Checkout</h2></div><div class="two">
  <form id="coForm" class="box"><h3>Alamat Pengiriman</h3>${addresses.length > 1 ? `<label>Pilih alamat tersimpan</label><select id="savedAddress">${addresses.map((item, index) => `<option value="${index}">${esc(item.nama)} — ${esc(item.kota)}</option>`).join('')}</select>` : ''}<div class="form-grid">
    <div><label>Nama penerima</label><input name="nama" required value="${esc(a.nama || me().name)}"></div>
    <div><label>No. HP</label><input name="hp" required pattern="08[0-9]{8,12}" title="Format 08xxxxxxxxxx" value="${esc(a.hp || me().phone)}"></div></div>
    <label>Alamat lengkap</label><textarea name="alamat" rows="2" required>${esc(a.alamat || '')}</textarea>
    <div class="form-grid"><div><label>Kota/Kabupaten</label><input name="kota" required value="${esc(a.kota || '')}"></div>
    <div><label>Provinsi</label><input name="prov" required value="${esc(a.prov || '')}"></div></div>
    <label>Kode pos</label><input name="pos" required pattern="[0-9]{5}" title="5 digit" value="${esc(a.pos || '')}">
    <label>Kurir</label><select name="kurir" id="courier">${Object.keys(COURIERS).map((c) => `<option>${c}</option>`).join('')}</select>
    <label>Metode pembayaran</label><select name="bayar"><option>Transfer Bank (BCA)</option><option>Transfer Bank (BRI)</option></select><br>
    <button class="btn">Buat Pesanan</button></form>
  <div class="box"><h3>Ringkasan</h3>${db.cart.map((i) => `<div class="row"><span>${esc(prod(i.pid).name)} (${i.size}) ×${i.qty}</span><span>${rp(prod(i.pid).price * i.qty)}</span></div>`).join('')}
    <div class="row"><span>Subtotal</span><span>${rp(cartSub())}</span></div>
    <div class="row"><span>Ongkir</span><span id="shipV">${rp(shipCost('JNE'))}</span></div>
    <div class="row total"><span>Total</span><span id="totV">${rp(cartSub() + shipCost('JNE'))}</span></div></div></div></section>`;
};

pages.pay = (id) => {
  const g = needLogin(); if (g) return g;
  const o = db.orders.find((x) => x.id === id && (x.uid === me().id || me().role === 'admin'));
  if (!o) return '<section class="wrap"><h2>Pesanan tidak ditemukan</h2></section>';
  const can = o.status === 'Menunggu Pembayaran';
  return `<section class="wrap"><div class="sec-head"><h2>Pembayaran</h2>${badge(o.status)}</div><div class="box form">
    <p class="muted">Kode pesanan</p><h3>${o.id}</h3>
    <div class="row total"><span>Total bayar</span><span>${rp(o.total)}</span></div>
    <p class="muted" style="margin:14px 0">Transfer ke rekening ${esc(o.bayar)}: <b>1234567890</b> a.n. REIONIA (contoh/simulasi).</p>
    ${can ? `<form id="payForm"><label>Unggah bukti transfer</label><input type="file" id="proof" accept="image/*,.pdf" required><br><button class="btn">Kirim Bukti</button></form>`
      : `<p>Bukti pembayaran: <b>${esc(o.proof || '-')}</b></p><br><a class="btn" href="#/orders/${o.id}">Lihat Pesanan</a>`}</div></section>`;
};

pages.login = () => `<section class="wrap"><div class="sec-head"><h2>Login</h2></div><form id="loginForm" class="box form">
  <label>Email</label><input type="email" name="email" required><label>Kata sandi</label><input type="password" name="pass" required>
  <p class="err" id="err"></p><br><button class="btn">Masuk</button>
  <p class="muted" style="margin-top:14px">Belum punya akun? <a href="#/register" style="color:var(--red)">Daftar</a></p></form></section>`;

pages.register = () => `<section class="wrap"><div class="sec-head"><h2>Registrasi</h2></div><form id="regForm" class="box form">
  <label>Nama lengkap</label><input name="name" required><label>Email</label><input type="email" name="email" required>
  <label>No. HP</label><input name="phone" required pattern="08[0-9]{8,12}" title="Format 08xxxxxxxxxx">
  <label>Kata sandi (min. 6 karakter)</label><input type="password" name="pass" minlength="6" required>
  <p class="err" id="err"></p><br><button class="btn">Daftar</button></form></section>`;

pages.account = () => {
  const g = needLogin(); if (g) return g;
  const u = me(), mine = db.orders.filter((o) => o.uid === u.id).reverse();
  const addresses = u.addresses || [];
  return `<section class="wrap"><div class="sec-head"><h2>Akun Saya</h2><button class="btn ghost sm" id="logout">Logout</button></div><div class="two">
  <div><div class="box"><h3>Riwayat Pesanan</h3>${mine.length ? `<div class="tbl"><table><tr><th>Kode</th><th>Tanggal</th><th>Total</th><th>Status</th><th></th></tr>
    ${mine.map((o) => `<tr><td>${o.id}</td><td>${o.date}</td><td>${rp(o.total)}</td><td>${badge(o.status)}</td><td><a class="btn ghost sm" href="#/orders/${o.id}">Detail</a></td></tr>`).join('')}</table></div>` : '<p class="muted">Belum ada pesanan.</p>'}</div></div>
  <form id="profForm" class="box"><h3>Profil</h3><label>Nama</label><input name="name" value="${esc(u.name)}" required>
    <label>Email</label><input value="${esc(u.email)}" disabled><label>No. HP</label><input name="phone" value="${esc(u.phone)}" required pattern="08[0-9]{8,12}"><br><button class="btn">Simpan Profil</button></form></div>
    <div class="box address-book"><h3>Buku Alamat</h3>${addresses.length ? addresses.map((a, i) => `<div class="address-item"><div><b>${esc(a.nama || u.name)}</b><p class="muted">${esc(a.hp || '')}<br>${esc(a.alamat || '')}, ${esc(a.kota || '')}, ${esc(a.prov || '')} ${esc(a.pos || '')}</p></div><button class="btn ghost sm" data-deladdr="${i}" type="button">Hapus</button></div>`).join('') : '<p class="muted">Belum ada alamat tersimpan.</p>'}
    <form id="addrForm"><h3>Tambah Alamat</h3><div class="form-grid"><div><label>Nama penerima</label><input name="nama" required></div><div><label>No. HP</label><input name="hp" required pattern="08[0-9]{8,12}"></div></div><label>Alamat lengkap</label><textarea name="alamat" required rows="2"></textarea><div class="form-grid"><div><label>Kota/Kabupaten</label><input name="kota" required></div><div><label>Provinsi</label><input name="prov" required></div></div><label>Kode pos</label><input name="pos" required pattern="[0-9]{5}"><br><button class="btn">Simpan Alamat</button></form></div></section>`;
};

pages.order = (id) => {
  const g = needLogin(); if (g) return g;
  const o = db.orders.find((x) => x.id === id && (x.uid === me().id || me().role === 'admin'));
  if (!o) return '<section class="wrap"><h2>Pesanan tidak ditemukan</h2></section>';
  return `<section class="wrap"><div class="sec-head"><h2>${o.id}</h2>${badge(o.status)}</div>${o.status === 'Ditolak' ? '' : timeline(o.status)}
  <div class="two"><div class="box"><h3>Item</h3>${o.items.map((i) => `<div class="row"><span>${esc(i.name)} (${i.size}, ${esc(i.color)}) ×${i.qty}</span><span>${rp(i.price * i.qty)}</span></div>`).join('')}
    <div class="row"><span>Ongkir (${o.kurir})</span><span>${rp(o.ongkir)}</span></div><div class="row total"><span>Total</span><span>${rp(o.total)}</span></div></div>
  <div class="box"><h3>Pengiriman</h3><p>${esc(o.addr.nama)} · ${esc(o.addr.hp)}<br>${esc(o.addr.alamat)}, ${esc(o.addr.kota)}, ${esc(o.addr.prov)} ${esc(o.addr.pos)}</p>
    <p style="margin-top:12px">Nomor resi: <b>${esc(o.resi || 'Belum tersedia')}</b></p>
    ${o.status === 'Menunggu Pembayaran' ? `<br><a class="btn" href="#/pay/${o.id}">Bayar Sekarang</a>` : ''}</div></div></section>`;
};

pages.about = () => `<section class="wrap"><div class="sec-head"><h2>Tentang REIONIA</h2></div><div class="two"><div>
  <p style="font-size:20px">REIONIA adalah label apparel independen yang mengeksplorasi identitas, individualitas, dan budaya jalanan kontemporer.</p>
  <p class="muted" style="margin-top:16px">Website ini menjadi toko resmi REIONIA sehingga pelanggan tidak lagi bergantung pada media sosial untuk memesan.</p>
  <p style="margin-top:16px"><b>Ketentuan pesanan:</b> pembayaran via transfer bank, bukti bayar diverifikasi admin, pesanan diproses setelah pembayaran terverifikasi.</p></div>
  <div class="box"><h3>Kontak</h3><p>Email: hello@reionia.id<br>WhatsApp: 0812-0000-0000<br>Instagram / TikTok: @reionia.official</p></div></div></section>`;

/* ---------- Admin ---------- */
const ATABS = { '': 'Dashboard', kategori: 'Kategori', produk: 'Produk', stok: 'Stok', pesanan: 'Pesanan', pembayaran: 'Pembayaran', pelanggan: 'Pelanggan', laporan: 'Laporan' };
const paid = () => db.orders.filter((o) => ['Diproses', 'Dikirim', 'Selesai'].includes(o.status));

pages.admin = (tab = '') => {
  const g = needLogin(true); if (g) return g;
  const tabs = `<div class="tabs">${Object.entries(ATABS).map(([k, v]) => `<a href="#/admin/${k}" class="${k === tab ? 'on' : ''}">${v}</a>`).join('')}</div>`;
  let body = '';
  if (tab === '') {
    const low = db.products.flatMap((p) => p.colors.flatMap((color) => SIZES.filter((s) => stockFor(p, color)[s] > 0 && stockFor(p, color)[s] <= 3).map((s) => `${p.name} / ${color} (${s}): ${stockFor(p, color)[s]}`)));
    body = `<div class="stats">
      <div class="stat"><b>${db.orders.filter((o) => o.status === 'Menunggu Pembayaran').length}</b><small>Pesanan baru</small></div>
      <div class="stat"><b>${db.orders.filter((o) => o.status === 'Menunggu Verifikasi').length}</b><small>Menunggu verifikasi</small></div>
      <div class="stat"><b>${rp(paid().reduce((a, o) => a + o.total, 0))}</b><small>Pendapatan</small></div>
      <div class="stat"><b>${low.length}</b><small>Stok menipis (≤3)</small></div></div>
      <div class="box"><h3>Stok Menipis</h3>${low.length ? low.map((l) => `<p>${esc(l)}</p>`).join('') : '<p class="muted">Semua stok aman.</p>'}</div>`;
  }
  if (tab === 'kategori') body = `<form id="catForm" class="news" style="margin-bottom:20px"><input name="c" placeholder="Nama kategori baru" required><button class="btn">Tambah</button></form>
    <div class="tbl"><table><tr><th>Kategori</th><th>Jumlah produk</th><th></th></tr>${db.cats.map((c, k) => `<tr><td>${esc(c)}</td><td>${db.products.filter((p) => p.cat === c).length}</td>
    <td><button class="btn ghost sm" data-ec="${k}">Ubah</button> <button class="btn ghost sm" data-dc="${k}">Hapus</button></td></tr>`).join('')}</table></div>`;
  if (tab === 'produk') body = `<form id="prodForm" class="box" style="margin-bottom:24px"><h3 id="pfTitle">Tambah Produk</h3><input type="hidden" name="id">
    <div class="form-grid"><div><label>Nama</label><input name="name" required></div><div><label>Harga (Rp)</label><input type="number" name="price" min="1000" required></div>
    <div><label>Kategori</label><select name="cat">${db.cats.map((c) => `<option>${esc(c)}</option>`).join('')}</select></div><div><label>Warna (pisah koma)</label><input name="colors" value="Black" required></div></div>
    <label>Deskripsi</label><textarea name="desc" rows="2" required></textarea><label>Foto produk (maks. 1,5 MB)</label><input type="file" name="photo" accept="image/*"><br><button class="btn">Simpan Produk</button></form>
    <div class="tbl"><table><tr><th>Produk</th><th>Kategori</th><th>Harga</th><th>Status</th><th></th></tr>${db.products.map((p) => `<tr><td>${esc(p.name)}</td><td>${esc(p.cat)}</td><td>${rp(p.price)}</td>
    <td>${p.active ? '<span class="badge ok">Aktif</span>' : '<span class="badge">Nonaktif</span>'}</td>
    <td><button class="btn ghost sm" data-ep="${p.id}">Ubah</button> <button class="btn ghost sm" data-tp="${p.id}">${p.active ? 'Nonaktifkan' : 'Aktifkan'}</button> <button class="btn ghost sm" data-dp="${p.id}">Hapus</button></td></tr>`).join('')}</table></div>`;
  if (tab === 'stok') body = `<div class="tbl"><table><tr><th>Produk</th><th>Warna</th>${SIZES.map((s) => `<th>${s}</th>`).join('')}<th>SKU</th></tr>${db.products.map((p) => p.colors.map((color) => `<tr><td>${esc(p.name)}</td><td>${esc(color)}</td>
    ${SIZES.map((s) => `<td><input type="number" min="0" style="width:64px" value="${stockFor(p, color)[s]}" data-st="${p.id}|${encodeURIComponent(color)}|${s}"></td>`).join('')}<td class="muted">RNA-${String(p.id).padStart(3, '0')}-${esc(color.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5))}</td></tr>`).join('')).join('')}</table></div>`;
  if (tab === 'pesanan') body = `<div class="tbl"><table><tr><th>Kode</th><th>Pelanggan</th><th>Total</th><th>Status</th><th>Ubah status</th><th>Resi</th></tr>${[...db.orders].reverse().map((o) => `<tr><td><a href="#/orders/${o.id}">${o.id}</a></td><td>${esc(o.addr.nama)}</td><td>${rp(o.total)}</td><td>${badge(o.status)}</td>
    <td><select data-os="${o.id}">${[...STATUS, 'Ditolak'].map((s) => `<option ${s === o.status ? 'selected' : ''}>${s}</option>`).join('')}</select></td>
    <td><input data-resi="${o.id}" value="${esc(o.resi || '')}" placeholder="No. resi"></td></tr>`).join('') || '<tr><td colspan="6" class="muted">Belum ada pesanan.</td></tr>'}</table></div>`;
  if (tab === 'pembayaran') { const w = db.orders.filter((o) => o.status === 'Menunggu Verifikasi'); body = `<div class="tbl"><table><tr><th>Kode</th><th>Nominal</th><th>Bukti</th><th></th></tr>${w.map((o) => `<tr><td>${o.id}</td><td>${rp(o.total)}</td><td>${o.proofData ? `<a href="${esc(o.proofData)}" target="_blank" rel="noopener">Lihat ${esc(o.proof || 'bukti')}</a>` : esc(o.proof || '-')}</td>
    <td><button class="btn sm" data-vp="${o.id}|ok">Terima</button> <button class="btn ghost sm" data-vp="${o.id}|no">Tolak</button></td></tr>`).join('') || '<tr><td colspan="4" class="muted">Tidak ada pembayaran menunggu.</td></tr>'}</table></div>`; }
  if (tab === 'pelanggan') body = `<div class="tbl"><table><tr><th>Nama</th><th>Email</th><th>HP</th><th>Pesanan</th></tr>${db.users.filter((u) => u.role === 'customer').map((u) => `<tr><td>${esc(u.name)}</td><td>${esc(u.email)}</td><td>${esc(u.phone)}</td>
    <td>${db.orders.filter((o) => o.uid === u.id).map((o) => `<a href="#/orders/${o.id}">${o.id}</a>`).join(', ') || '-'}</td></tr>`).join('') || '<tr><td colspan="4" class="muted">Belum ada pelanggan.</td></tr>'}</table></div>`;
  if (tab === 'laporan') body = `<div class="toolbar"><div><label>Dari</label><input type="date" id="rFrom"></div><div><label>Sampai</label><input type="date" id="rTo"></div></div><div id="report"></div>`;
  return `<section class="wrap"><div class="sec-head"><h2>Admin</h2><button class="btn ghost sm" id="logout" type="button">Logout</button></div>${tabs}${body}</section>`;
};
function renderReport() {
  const f = $('#rFrom').value, t = $('#rTo').value;
  const list = paid().filter((o) => (!f || o.date >= f) && (!t || o.date <= t));
  const top = {}; list.forEach((o) => o.items.forEach((i) => (top[i.name] = (top[i.name] || 0) + i.qty)));
  $('#report').innerHTML = `<div class="stats"><div class="stat"><b>${rp(list.reduce((a, o) => a + o.total, 0))}</b><small>Total pendapatan</small></div><div class="stat"><b>${list.length}</b><small>Transaksi</small></div></div>
  <div class="box"><h3>Produk Terlaris</h3>${Object.entries(top).sort((a, b) => b[1] - a[1]).map(([n, q]) => `<div class="row"><span>${esc(n)}</span><span>${q} pcs</span></div>`).join('') || '<p class="muted">Tidak ada data.</p>'}</div>
  <br><div class="tbl"><table><tr><th>Kode</th><th>Tanggal</th><th>Total</th></tr>${list.map((o) => `<tr><td>${o.id}</td><td>${o.date}</td><td>${rp(o.total)}</td></tr>`).join('')}</table></div>`;
}

/* ---------- Router ---------- */
function route() {
  const [, name = '', arg] = location.hash.replace('#', '').split('/');
  if (name === 'admin' && !isAdmin()) {
    const destination = me() ? '#/' : '#/login';
    if (me()) toast('Akses admin hanya tersedia untuk akun admin.');
    location.hash = destination;
    return;
  }
  const map = { '': 'home', shop: 'shop', product: 'product', cart: 'cart', checkout: 'checkout', pay: 'pay', login: 'login', register: 'register', account: 'account', orders: 'order', about: 'about', admin: 'admin' };
  $('#app').innerHTML = (pages[map[name] || 'home'])(arg);
  $('#menu').classList.remove('open'); window.scrollTo(0, 0); updateNav();
  if (name === 'shop') { filterShop(); ['#fQ', '#fCat', '#fSize', '#fSort'].forEach((s) => $(s).addEventListener('input', filterShop)); }
  if (name === 'admin' && arg === 'laporan') { $('#rFrom').oninput = $('#rTo').oninput = renderReport; renderReport(); }
}
window.addEventListener('hashchange', route);

/* ---------- Event delegation ---------- */
document.addEventListener('click', (e) => {
  const t = e.target.closest('button, a'); if (!t) return;
  const d = t.dataset;
  const adminAction = ['dc', 'ec', 'tp', 'dp', 'ep', 'vp'].some((key) => d[key] !== undefined);
  if (adminAction && !isAdmin()) { toast('Akses ditolak.'); return; }
  if (d.size !== undefined) { pick.size = d.size; document.querySelectorAll('[data-size]').forEach((b) => b.classList.toggle('on', b === t));
    const id = location.hash.split('/')[2]; $('#stockInfo').textContent = 'Stok tersedia: ' + stockFor(prod(id), pick.color)[d.size]; }
  if (d.color !== undefined) {
    pick.color = d.color; pick.size = '';
    document.querySelectorAll('[data-color]').forEach((b) => b.classList.toggle('on', b === t));
    const p = prod(location.hash.split('/')[2]);
    document.querySelectorAll('[data-size]').forEach((b) => { b.disabled = !(stockFor(p, pick.color)[b.dataset.size] > 0); b.classList.remove('on'); });
    const variantPhoto = productImage(p, pick.color);
    const mainPhoto = $('#productMainPhoto');
    if (mainPhoto && variantPhoto) { mainPhoto.src = variantPhoto; mainPhoto.alt = p.name + ' - ' + pick.color; }
    $('#stockInfo').textContent = 'Pilih ukuran untuk melihat stok warna ' + pick.color + '.';
  }
  if (t.id === 'addBtn') {
    if (!pick.size) return toast('Pilih ukuran dulu');
    const id = +location.hash.split('/')[2], p = prod(id);
    const ex = db.cart.find((i) => i.pid === id && i.size === pick.size && i.color === pick.color);
    if ((ex ? ex.qty : 0) + 1 > stockFor(p, pick.color)[pick.size]) return toast('Stok tidak cukup');
    ex ? ex.qty++ : db.cart.push({ pid: id, size: pick.size, color: pick.color, qty: 1 });
    save(); toast('Ditambahkan ke keranjang');
  }
  if (d.q !== undefined) { const i = db.cart[d.q], n = i.qty + +d.d;
    if (n > stockFor(prod(i.pid), i.color)[i.size]) return toast('Stok tidak cukup');
    if (n < 1) return; i.qty = n; save(); route(); }
  if (d.rm !== undefined) { db.cart.splice(d.rm, 1); save(); route(); }
  if (t.id === 'logout') { db.session = null; db.cart = []; db.cartOwner = null; save(); location.hash = '#/'; toast('Anda berhasil logout.'); }
  /* admin actions */
  if (d.dc !== undefined) { const c = db.cats[d.dc]; if (db.products.some((p) => p.cat === c)) return toast('Kategori masih dipakai produk'); db.cats.splice(d.dc, 1); save(); route(); }
  if (d.ec !== undefined) { const n = prompt('Nama kategori baru:', db.cats[d.ec]); if (n) { db.products.forEach((p) => p.cat === db.cats[d.ec] && (p.cat = n)); db.cats[d.ec] = n; save(); route(); } }
  if (d.tp !== undefined) { const p = prod(d.tp); p.active = !p.active; save(); route(); }
  if (d.dp !== undefined && confirm('Hapus produk ini?')) { db.products = db.products.filter((p) => p.id != d.dp); db.cart = db.cart.filter((i) => i.pid != d.dp); save(); route(); }
  if (d.deladdr !== undefined) { const u = me(); u.addresses.splice(Number(d.deladdr), 1); save(); route(); toast('Alamat dihapus.'); }
  if (d.ep !== undefined) { const p = prod(d.ep), f = $('#prodForm');
    f.elements.namedItem('id').value = p.id;
    f.elements.namedItem('name').value = p.name;
    f.elements.namedItem('price').value = p.price;
    f.elements.namedItem('cat').value = p.cat;
    f.elements.namedItem('colors').value = p.colors.join(',');
    f.elements.namedItem('desc').value = p.desc;
    $('#pfTitle').textContent = 'Ubah Produk'; f.scrollIntoView({ behavior: 'smooth' }); }
  if (d.vp !== undefined) { const [id, a] = d.vp.split('|'), o = db.orders.find((x) => x.id === id);
    if (a === 'ok') o.status = 'Diproses';
    else { o.status = 'Menunggu Pembayaran'; o.proof = ''; toast('Pembayaran ditolak, pelanggan diminta unggah ulang'); }
    save(); route(); }
});

document.addEventListener('change', (e) => {
  const t = e.target, d = t.dataset;
  const adminAction = d.st !== undefined || d.os !== undefined || d.resi !== undefined;
  if (adminAction && !isAdmin()) { toast('Akses ditolak.'); route(); return; }
  if (t.id === 'courier') { $('#shipV').textContent = rp(shipCost(t.value)); $('#totV').textContent = rp(cartSub() + shipCost(t.value)); }
  if (t.id === 'savedAddress') { const a = me()?.addresses?.[Number(t.value)]; if (a) { ['nama', 'hp', 'alamat', 'kota', 'prov', 'pos'].forEach((key) => { const field = document.querySelector(`#coForm [name=\"${key}\"]`); if (field) field.value = a[key] || ''; }); } }
  if (d.st) { const [id, color, size] = d.st.split('|'); stockFor(prod(id), decodeURIComponent(color))[size] = Math.max(0, +t.value || 0); save(); toast('Stok varian diperbarui'); }
  if (d.os) { const o = db.orders.find((x) => x.id === d.os); o.status = t.value; save(); route(); }
  if (d.resi) { db.orders.find((x) => x.id === d.resi).resi = t.value.trim(); save(); toast('Resi disimpan'); }
});

document.addEventListener('submit', (e) => {
  const f = e.target;
  const formId = f.getAttribute('id');
  const v = (n) => (f.elements[n]?.value ?? '').trim();
  if (!formId) return;
  const adminForm = formId === 'catForm' || formId === 'prodForm';
  if (adminForm && !isAdmin()) { e.preventDefault(); toast('Akses ditolak.'); route(); return; }
  e.preventDefault();
  if (formId === 'regForm') {
    if (db.users.some((u) => u.email === v('email').toLowerCase())) return ($('#err').textContent = 'Email sudah terdaftar.');
    const u = { id: Date.now(), name: v('name'), email: v('email').toLowerCase(), phone: v('phone'), pass: v('pass'), role: 'customer', addresses: [] };
    db.users.push(u); db.session = u.id; db.cart = []; db.cartOwner = u.id; save(); toast('Registrasi berhasil'); location.hash = '#/account';
  }
  if (formId === 'loginForm') {
    const u = db.users.find((x) => x.email === v('email').toLowerCase() && x.pass === v('pass'));
    if (!u) return ($('#err').textContent = 'Email atau kata sandi salah.');
    if (db.session !== u.id && db.session !== null) db.cart = [];
    db.session = u.id; db.cartOwner = u.id; save(); location.hash = u.role === 'admin' ? '#/admin' : '#/account';
  }
  if (formId === 'profForm') { const u = me(); u.name = v('name'); u.phone = v('phone'); save(); toast('Profil disimpan'); }
  if (formId === 'addrForm') { const u = me(); u.addresses = u.addresses || []; u.addresses.push({ nama: v('nama'), hp: v('hp'), alamat: v('alamat'), kota: v('kota'), prov: v('prov'), pos: v('pos') }); save(); toast('Alamat berhasil disimpan.'); route(); }
  if (formId === 'coForm') {
    for (const i of db.cart) if (i.qty > stockFor(prod(i.pid), i.color)[i.size]) return toast('Stok ' + prod(i.pid).name + ' (' + i.color + ' / ' + i.size + ') tidak cukup');
    const addr = { nama: v('nama'), hp: v('hp'), alamat: v('alamat'), kota: v('kota'), prov: v('prov'), pos: v('pos') };
    const sub = cartSub(), ongkir = shipCost(v('kurir'));
    const o = { id: 'RNA-' + String(db.orders.length + 1).padStart(4, '0'), uid: me().id, date: new Date().toISOString().slice(0, 10), addr, kurir: v('kurir'), bayar: v('bayar'),
      items: db.cart.map((i) => ({ name: prod(i.pid).name, price: prod(i.pid).price, size: i.size, color: i.color, qty: i.qty })), ongkir, total: sub + ongkir, status: 'Menunggu Pembayaran', resi: '', proof: '' };
    db.cart.forEach((i) => { const p = prod(i.pid); stockFor(p, i.color)[i.size] -= i.qty; p.sold += i.qty; });
    me().addresses = me().addresses || [];
    me().addresses = [addr, ...me().addresses.filter((saved) => JSON.stringify(saved) !== JSON.stringify(addr))];
    db.orders.push(o); db.cart = []; db.cartOwner = me().id; save(); location.hash = '#/pay/' + o.id;
  }
  if (formId === 'payForm') {
    const id = location.hash.split('/')[2], o = db.orders.find((x) => x.id === id && x.uid === me()?.id);
    const file = $('#proof').files[0];
    if (!o || !file) return toast('Pilih file bukti pembayaran.');
    if (file.size > 2 * 1024 * 1024) return toast('Ukuran bukti pembayaran maksimal 2 MB.');
    if (!(file.type.startsWith('image/') || file.type === 'application/pdf')) return toast('Gunakan file gambar atau PDF.');
    const reader = new FileReader();
    reader.onload = () => { o.proof = file.name; o.proofData = reader.result; o.status = 'Menunggu Verifikasi'; save(); toast('Bukti terkirim, menunggu verifikasi admin.'); route(); };
    reader.onerror = () => toast('File bukti tidak dapat dibaca.');
    reader.readAsDataURL(file);
    return;
  }
  if (formId === 'catForm') { const c = v('c'); if (!db.cats.includes(c)) db.cats.push(c); save(); route(); }
  if (formId === 'prodForm') {
    const colors = [...new Set(v('colors').split(',').map((color) => color.trim()).filter(Boolean))];
    if (!colors.length) return toast('Tambahkan minimal satu warna.');
    const data = { name: v('name'), price: +v('price'), cat: v('cat'), colors, desc: v('desc') };
    const photoFile = f.elements.namedItem('photo')?.files?.[0];
    const existingProduct = v('id') ? prod(v('id')) : null;
    const saveProduct = (photo = existingProduct?.photo || '') => {
      if (photo) data.photo = photo;
      const currentStock = existingProduct?.stockByColor || {};
      data.stockByColor = Object.fromEntries(colors.map((color) => [color, currentStock[color] || stk([])]));
      if (existingProduct) Object.assign(existingProduct, data);
      else db.products.push({ id: Date.now(), ...data, stock: stk([]), active: true, sold: 0 });
      save(); toast('Produk berhasil disimpan.'); route();
    };
    if (photoFile) {
      if (!photoFile.type.startsWith('image/')) return toast('File foto harus berupa gambar.');
      if (photoFile.size > 1.5 * 1024 * 1024) return toast('Ukuran foto maksimal 1,5 MB.');
      const reader = new FileReader();
      reader.onload = () => saveProduct(reader.result);
      reader.onerror = () => toast('Foto produk tidak dapat dibaca.');
      reader.readAsDataURL(photoFile);
      return;
    }
    saveProduct();
  }
});

updateNav(); route();
