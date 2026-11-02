/* REIONIA Web Store — Multi-page HTML + Vanilla JavaScript
   Setiap halaman memiliki file HTML sendiri. JavaScript menangani interaksi dan data demo. */
'use strict';

const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
const COURIERS = { JNE: 20000, 'J&T': 18000, SiCepat: 15000 };
const STATUS = ['Menunggu Pembayaran', 'Menunggu Verifikasi', 'Diproses', 'Dikirim', 'Selesai'];
const KEY = 'reionia_db_v1';
const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const rp = (value) => 'Rp' + Number(value || 0).toLocaleString('id-ID');
const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const params = new URLSearchParams(location.search);
const page = document.body.dataset.page || 'home';
const SIZES_STOCK = (values = []) => Object.fromEntries(SIZES.map((size, index) => [size, Number(values[index] || 0)]));

/* Foto produk per varian warna. URL gambar bersifat eksternal dan memerlukan internet. */
const PRODUCT_COLOR_IMAGES = {
  1: {
    Black: 'assets/images/products/essential-tee-black.jpg',
    White: 'assets/images/products/essential-tee-white.jpg',
  },
  2: {
    Black: 'assets/images/products/graphic-tee-black.jpg',
    Charcoal: 'assets/images/products/graphic-tee-charcoal.jpg',
  },
  3: {
    Black: 'assets/images/products/hoodie-black.jpg',
    Red: 'assets/images/products/hoodie-red.jpg',
  },
  4: {
    Black: 'assets/images/products/cargo-black.jpg',
    Olive: 'assets/images/products/cargo-olive.jpg',
  },
  5: { Black: 'assets/images/products/utility-bag-black.jpg' },
};
const PRODUCT_IMAGES = Object.fromEntries(Object.entries(PRODUCT_COLOR_IMAGES).map(([id, variants]) => [id, Object.values(variants)[0]]));
const productImage = (product, color = product?.colors?.[0]) => product?.photoByColor?.[color] || PRODUCT_COLOR_IMAGES[product?.id]?.[color] || product?.photo || PRODUCT_IMAGES[product?.id] || '';

const seed = () => ({
  cats: ['Tees', 'Hoodie', 'Pants', 'Bags'],
  products: [
    { id: 1, name: 'REIONIA Essential Tee', cat: 'Tees', price: 189000, colors: ['Black', 'White'], stock: SIZES_STOCK([5, 12, 15, 10, 6, 2]), active: true, sold: 24, desc: 'Kaos cotton combed 24s, potongan boxy, sablon rubber minimalis di dada.' },
    { id: 2, name: 'REIONIA Oversized Graphic Tee', cat: 'Tees', price: 229000, colors: ['Black', 'Charcoal'], stock: SIZES_STOCK([0, 8, 10, 10, 4, 0]), active: true, sold: 31, desc: 'Oversized fit, cotton 20s heavyweight, grafis eksperimental di bagian punggung.' },
    { id: 3, name: 'REIONIA Signature Hoodie', cat: 'Hoodie', price: 459000, colors: ['Black', 'Red'], stock: SIZES_STOCK([0, 4, 6, 6, 3, 1]), active: true, sold: 18, desc: 'Hoodie fleece 320gsm, bordir logo REIONIA, kantong kanguru dan hood dua lapis.' },
    { id: 4, name: 'REIONIA Cargo Pants', cat: 'Pants', price: 389000, colors: ['Black', 'Olive'], stock: SIZES_STOCK([0, 5, 8, 8, 5, 0]), active: true, sold: 12, desc: 'Celana cargo ripstop dengan enam kantong, pinggang adjustable, potongan relaxed.' },
    { id: 5, name: 'REIONIA Utility Bag', cat: 'Bags', price: 279000, colors: ['Black'], stock: SIZES_STOCK([0, 0, 9, 0, 0, 0]), active: true, sold: 20, desc: 'Tas selempang utility water-resistant dengan tiga kompartemen dan strap adjustable.' },
  ],
  users: [{ id: 1, name: 'Admin REIONIA', email: 'admin@reionia.id', phone: '081200000000', pass: 'admin123', role: 'admin', addresses: [] }],
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
    const legacy = product.stock || SIZES_STOCK();
    product.stockByColor = Object.fromEntries(product.colors.map((color, index) => [color, Object.fromEntries(SIZES.map((size) => {
      const qty = Math.max(0, Number(legacy[size]) || 0);
      const each = Math.floor(qty / product.colors.length);
      return [size, each + (index < qty % product.colors.length ? 1 : 0)];
    }))]));
  } else {
    product.colors.forEach((color) => { if (!product.stockByColor[color]) product.stockByColor[color] = SIZES_STOCK(); });
  }
}

const save = () => {
  try { localStorage.setItem(KEY, JSON.stringify(db)); }
  catch (error) { console.error('Data tidak dapat disimpan pada browser ini.', error); toast('Penyimpanan browser tidak tersedia atau penuh.'); }
  updateNav();
};
const me = () => db.users.find((user) => user.id === db.session) || null;
const isAdmin = () => me()?.role === 'admin';
const prod = (id) => db.products.find((product) => String(product.id) === String(id));
const stockFor = (product, color) => product?.stockByColor?.[color] || product?.stock || SIZES_STOCK();
const totalStock = (product) => Object.values(product.stockByColor || { default: product.stock || SIZES_STOCK() }).reduce((sum, inventory) => sum + Object.values(inventory).reduce((a, b) => a + (Number(b) || 0), 0), 0);
const cartSub = () => db.cart.reduce((sum, item) => sum + (prod(item.pid)?.price || 0) * item.qty, 0);
const shipCost = (courier) => cartSub() >= 500000 ? 0 : COURIERS[courier] || 0;

function toast(message) {
  const box = $('#toast');
  if (!box) return;
  box.textContent = message;
  box.classList.add('show');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => box.classList.remove('show'), 2300);
}
function updateNav() {
  const count = db.cart.reduce((sum, item) => sum + item.qty, 0);
  const cartCount = $('#cartCount');
  if (cartCount) cartCount.textContent = count;
  const accountLink = $('#navAcc');
  if (accountLink) {
    accountLink.href = !me() ? 'login.html' : isAdmin() ? 'admin.html' : 'account.html';
    accountLink.setAttribute('aria-label', !me() ? 'Masuk' : isAdmin() ? 'Dashboard Admin' : 'Akun Saya');
    accountLink.title = !me() ? 'Masuk' : isAdmin() ? 'Dashboard Admin' : 'Akun Saya';
  }
}
function guardPage() {
  const protectedPages = ['account', 'checkout', 'payment', 'order'];
  const adminPages = ['admin', 'admin-categories', 'admin-products', 'admin-stock', 'admin-orders', 'admin-payments', 'admin-customers', 'admin-reports'];
  if (protectedPages.includes(page) && !me()) { location.href = 'login.html'; return false; }
  if (adminPages.includes(page) && !isAdmin()) {
    toast('Halaman ini khusus admin.');
    location.href = me() ? 'index.html' : 'login.html';
    return false;
  }
  if (page === 'account' && isAdmin()) { location.href = 'admin.html'; return false; }
  return true;
}
function card(product) {
  const out = totalStock(product) === 0;
  const photo = productImage(product, product.colors?.[0]);
  return `<a class="card" href="product.html?id=${encodeURIComponent(product.id)}">
    <div class="img">${photo ? `<img src="${esc(photo)}" alt="${esc(product.name)}" loading="lazy">` : '<b>FOTO PRODUK BELUM TERSEDIA</b>'}${out ? '<span class="tag out">HABIS</span>' : product.sold > 25 ? '<span class="tag">BEST SELLER</span>' : ''}</div>
    <h3>${esc(product.name)}</h3><div class="price">${rp(product.price)} · ${out ? 'Stok habis' : 'Stok ' + totalStock(product)}</div></a>`;
}
const badge = (status) => `<span class="badge ${['Selesai', 'Diproses', 'Dikirim'].includes(status) ? 'ok' : status === 'Ditolak' ? 'bad' : 'warn'}">${esc(status)}</span>`;
const timeline = (status) => { const index = STATUS.indexOf(status); return `<div class="timeline">${STATUS.map((item, key) => `<div class="${key <= index ? 'done' : ''}">${item}</div>`).join('')}</div>`; };
const paidOrders = () => db.orders.filter((order) => ['Diproses', 'Dikirim', 'Selesai'].includes(order.status));

/* ---------- Halaman publik: konten diisi ke elemen HTML yang sudah tersedia ---------- */
function initHome() {
  const products = db.products.filter((product) => product.active);
  const categories = $('#homeCategories');
  if (categories) categories.innerHTML = db.cats.map((category) => `<a href="shop.html?category=${encodeURIComponent(category)}">${esc(category)} →</a>`).join('');
  const featured = $('#newArrivals');
  if (featured) featured.innerHTML = [...products].slice(-4).reverse().map(card).join('');
  const best = $('#bestSellers');
  if (best) best.innerHTML = [...products].sort((a, b) => b.sold - a.sold).slice(0, 4).map(card).join('');
}
function initShop() {
  const category = params.get('category') || '';
  const categorySelect = $('#fCat');
  if (!categorySelect) return;
  categorySelect.innerHTML = '<option value="">Semua kategori</option>' + db.cats.map((item) => `<option value="${esc(item)}">${esc(item)}</option>`).join('');
  categorySelect.value = category;
  const filter = () => {
    const query = ($('#fQ')?.value || '').toLowerCase();
    const cat = categorySelect.value;
    const size = $('#fSize')?.value || '';
    const sort = $('#fSort')?.value || '';
    let list = db.products.filter((product) => product.active && product.name.toLowerCase().includes(query) && (!cat || product.cat === cat) && (!size || product.colors.some((color) => stockFor(product, color)[size] > 0)));
    if (sort) list.sort((a, b) => sort === 'asc' ? a.price - b.price : b.price - a.price);
    const grid = $('#shopGrid');
    if (grid) grid.innerHTML = list.map(card).join('') || '<p class="muted">Produk tidak ditemukan.</p>';
    const count = $('#resCount');
    if (count) count.textContent = `${list.length} produk`;
  };
  ['#fQ', '#fCat', '#fSize', '#fSort'].forEach((selector) => $(selector)?.addEventListener('input', filter));
  filter();
}
let selectedVariant = { size: '', color: '' };
function initProduct() {
  const product = prod(params.get('id'));
  const host = $('#productContent');
  if (!host) return;
  if (!product || !product.active) { host.innerHTML = '<div class="wrap"><h2>Produk tidak ditemukan</h2><a class="btn" href="shop.html">Kembali ke Shop</a></div>'; return; }
  selectedVariant = { size: '', color: product.colors[0] };
  $('#productCategory').textContent = product.cat;
  $('#productName').textContent = product.name;
  $('#productPrice').textContent = rp(product.price);
  $('#productDesc').textContent = product.desc;
  const photo = productImage(product, selectedVariant.color);
  const image = $('#productMainPhoto');
  if (image) { image.src = photo; image.alt = `${product.name} - ${selectedVariant.color}`; }
  $('#colorOptions').innerHTML = product.colors.map((color, index) => `<button type="button" class="size ${index === 0 ? 'on' : ''}" data-color="${esc(color)}">${esc(color)}</button>`).join('');
  $('#sizeOptions').innerHTML = SIZES.map((size) => `<button type="button" class="size" data-size="${size}" ${stockFor(product, selectedVariant.color)[size] > 0 ? '' : 'disabled'}>${size}</button>`).join('');
  const related = db.products.filter((item) => item.active && item.id !== product.id && item.cat === product.cat).concat(db.products.filter((item) => item.active && item.id !== product.id && item.cat !== product.cat)).slice(0, 4);
  $('#relatedProducts').innerHTML = related.map(card).join('') || '<p class="muted">Belum ada produk terkait.</p>';
}
function initCart() {
  const empty = $('#cartEmpty');
  const view = $('#cartView');
  if (!empty || !view) return;
  const isEmpty = db.cart.length === 0;
  empty.hidden = !isEmpty;
  view.hidden = isEmpty;
  if (isEmpty) return;
  const rows = $('#cartRows');
  if (rows) rows.innerHTML = db.cart.map((item, index) => {
    const product = prod(item.pid);
    return `<tr><td>${esc(product?.name || 'Produk')}<br><small class="muted">${esc(item.color)}</small></td><td>${esc(item.size)}</td><td><div class="qty"><button type="button" data-qty="${index}" data-delta="-1">−</button><span>${item.qty}</span><button type="button" data-qty="${index}" data-delta="1">+</button></div></td><td>${rp((product?.price || 0) * item.qty)}</td><td><button class="btn ghost sm" type="button" data-remove="${index}">Hapus</button></td></tr>`;
  }).join('');
  const subtotal = $('#cartSubtotal');
  if (subtotal) subtotal.textContent = rp(cartSub());
}
function initCheckout() {
  const form = $('#checkoutForm');
  if (!form) return;
  if (!db.cart.length) { $('#checkoutContent').innerHTML = '<section class="wrap"><h2>Keranjang kosong</h2><a class="btn" href="shop.html">Kembali belanja</a></section>'; return; }
  const user = me();
  const addresses = user.addresses || [];
  const first = addresses[0] || {};
  const fields = ['nama', 'hp', 'alamat', 'kota', 'prov', 'pos'];
  fields.forEach((key) => { const input = form.elements.namedItem(key); if (input) input.value = first[key] || (key === 'nama' ? user.name : key === 'hp' ? user.phone : ''); });
  const saved = $('#savedAddress');
  const savedField = $('#savedAddressField');
  if (saved && addresses.length) saved.innerHTML = addresses.map((address, index) => `<option value="${index}">${esc(address.nama)} — ${esc(address.kota)}</option>`).join('');
  if (savedField) savedField.hidden = addresses.length < 2;
  const summary = $('#checkoutSummary');
  if (summary) summary.innerHTML = db.cart.map((item) => `<div class="row"><span>${esc(prod(item.pid)?.name)} (${esc(item.size)}, ${esc(item.color)}) ×${item.qty}</span><span>${rp((prod(item.pid)?.price || 0) * item.qty)}</span></div>`).join('') + `<div class="row"><span>Subtotal</span><span>${rp(cartSub())}</span></div><div class="row"><span>Ongkir</span><span id="shipV">${rp(shipCost('JNE'))}</span></div><div class="row total"><span>Total</span><span id="totV">${rp(cartSub() + shipCost('JNE'))}</span></div>`;
}
function initPayment() {
  const order = db.orders.find((item) => item.id === params.get('id') && (item.uid === me()?.id || isAdmin()));
  if (!order) { const host = $('main'); if (host) host.innerHTML = '<section class="wrap"><h2>Pesanan tidak ditemukan</h2></section>'; return; }
  const canPay = order.status === 'Menunggu Pembayaran' && !isAdmin();
  $('#paymentStatus').innerHTML = badge(order.status);
  $('#paymentOrderId').textContent = order.id;
  $('#paymentTotal').textContent = rp(order.total);
  $('#paymentBank').innerHTML = `Transfer ke rekening ${esc(order.bayar)}: <b>1234567890</b> a.n. REIONIA (contoh/simulasi).`;
  $('#paymentForm').hidden = !canPay;
  $('#paymentDone').hidden = canPay;
  $('#paymentOrderLink').href = `order.html?id=${encodeURIComponent(order.id)}`;
}
function initAccount() {
  if (!me()) return;
  const user = me();
  const orders = db.orders.filter((order) => order.uid === user.id).reverse();
  $('#profileName').value = user.name || '';
  $('#profileEmail').value = user.email || '';
  $('#profilePhone').value = user.phone || '';
  const rows = $('#accountOrderRows');
  if (rows) rows.innerHTML = orders.map((order) => `<tr><td>${esc(order.id)}</td><td>${esc(order.date)}</td><td>${rp(order.total)}</td><td>${badge(order.status)}</td><td><a class="btn ghost sm" href="order.html?id=${encodeURIComponent(order.id)}">Detail</a></td></tr>`).join('');
  $('#emptyOrders').hidden = orders.length > 0;
  $('#addressList').innerHTML = renderAddresses(user.addresses || [], user);
}
function renderAddresses(addresses, user) {
  if (!addresses.length) return '<p class="muted">Belum ada alamat tersimpan.</p>';
  return addresses.map((address, index) => `<div class="address-item"><div><b>${esc(address.nama || user.name)}</b><p class="muted">${esc(address.hp || '')}<br>${esc(address.alamat || '')}, ${esc(address.kota || '')}, ${esc(address.prov || '')} ${esc(address.pos || '')}</p></div><button class="btn ghost sm" data-deladdr="${index}" type="button">Hapus</button></div>`).join('');
}
function initOrder() {
  const order = db.orders.find((item) => item.id === params.get('id') && (item.uid === me()?.id || isAdmin()));
  if (!order) { const host = $('main'); if (host) host.innerHTML = '<section class="wrap"><h2>Pesanan tidak ditemukan</h2></section>'; return; }
  $('#orderTitle').textContent = order.id;
  $('#orderStatus').innerHTML = badge(order.status);
  $('#orderTimeline').innerHTML = order.status === 'Ditolak' ? '' : timeline(order.status);
  $('#orderItems').innerHTML = order.items.map((item) => `<div class="row"><span>${esc(item.name)} (${esc(item.size)}, ${esc(item.color)}) ×${item.qty}</span><span>${rp(item.price * item.qty)}</span></div>`).join('');
  $('#orderShippingLabel').textContent = `Ongkir (${order.kurir})`;
  $('#orderShipping').textContent = rp(order.ongkir);
  $('#orderTotal').textContent = rp(order.total);
  $('#orderAddress').innerHTML = `${esc(order.addr.nama)} · ${esc(order.addr.hp)}<br>${esc(order.addr.alamat)}, ${esc(order.addr.kota)}, ${esc(order.addr.prov)} ${esc(order.addr.pos)}`;
  $('#orderTracking').textContent = order.resi || 'Belum tersedia';
  const payLink = $('#orderPayLink');
  payLink.hidden = !(order.status === 'Menunggu Pembayaran' && !isAdmin());
  payLink.href = `payment.html?id=${encodeURIComponent(order.id)}`;
}

/* ---------- Admin: masing-masing bagian admin memiliki file HTML sendiri ---------- */
function adminTabs(active) {
  const tabs = [
    ['admin.html', 'Dashboard', 'admin'], ['admin-categories.html', 'Kategori', 'admin-categories'], ['admin-products.html', 'Produk', 'admin-products'],
    ['admin-stock.html', 'Stok', 'admin-stock'], ['admin-orders.html', 'Pesanan', 'admin-orders'], ['admin-payments.html', 'Pembayaran', 'admin-payments'],
    ['admin-customers.html', 'Pelanggan', 'admin-customers'], ['admin-reports.html', 'Laporan', 'admin-reports'],
  ];
  const host = $('#adminTabs');
  if (host) host.innerHTML = tabs.map(([href, label, key]) => `<a href="${href}" class="${key === active ? 'on' : ''}">${label}</a>`).join('');
}
function initAdminDashboard() {
  adminTabs('admin');
  const low = db.products.flatMap((product) => product.colors.flatMap((color) => SIZES.filter((size) => stockFor(product, color)[size] > 0 && stockFor(product, color)[size] <= 3).map((size) => `${product.name} / ${color} (${size}): ${stockFor(product, color)[size]}`)));
  const stats = $('#adminStats');
  if (stats) stats.innerHTML = `<div class="stat"><b>${db.orders.filter((order) => order.status === 'Menunggu Pembayaran').length}</b><small>Pesanan baru</small></div><div class="stat"><b>${db.orders.filter((order) => order.status === 'Menunggu Verifikasi').length}</b><small>Menunggu verifikasi</small></div><div class="stat"><b>${rp(paidOrders().reduce((sum, order) => sum + order.total, 0))}</b><small>Pendapatan</small></div><div class="stat"><b>${low.length}</b><small>Stok menipis (≤3)</small></div>`;
  const lowList = $('#lowStockList');
  if (lowList) lowList.innerHTML = low.length ? low.map((item) => `<p>${esc(item)}</p>`).join('') : '<p class="muted">Semua stok aman.</p>';
}
function initAdminCategories() {
  adminTabs('admin-categories');
  const rows = $('#categoryRows');
  if (rows) rows.innerHTML = db.cats.map((category, index) => `<tr><td>${esc(category)}</td><td>${db.products.filter((product) => product.cat === category).length}</td><td><button class="btn ghost sm" type="button" data-edit-category="${index}">Ubah</button> <button class="btn ghost sm" type="button" data-delete-category="${index}">Hapus</button></td></tr>`).join('') || '<tr><td colspan="3">Belum ada kategori.</td></tr>';
}
function initAdminProducts() {
  adminTabs('admin-products');
  const category = $('#productCategory');
  if (category) category.innerHTML = db.cats.map((item) => `<option>${esc(item)}</option>`).join('');
  const rows = $('#productRows');
  if (rows) rows.innerHTML = db.products.map((product) => `<tr><td>${esc(product.name)}</td><td>${esc(product.cat)}</td><td>${rp(product.price)}</td><td>${product.active ? '<span class="badge ok">Aktif</span>' : '<span class="badge">Nonaktif</span>'}</td><td><button class="btn ghost sm" type="button" data-edit-product="${product.id}">Ubah</button> <button class="btn ghost sm" type="button" data-toggle-product="${product.id}">${product.active ? 'Nonaktifkan' : 'Aktifkan'}</button> <button class="btn ghost sm" type="button" data-delete-product="${product.id}">Hapus</button></td></tr>`).join('');
}
function initAdminStock() {
  adminTabs('admin-stock');
  const rows = $('#stockRows');
  if (rows) rows.innerHTML = db.products.map((product) => product.colors.map((color) => `<tr><td>${esc(product.name)}</td><td>${esc(color)}</td>${SIZES.map((size) => `<td><input type="number" min="0" class="stock-input" value="${stockFor(product, color)[size]}" data-stock="${product.id}|${encodeURIComponent(color)}|${size}"></td>`).join('')}<td class="muted">RNA-${String(product.id).padStart(3, '0')}-${esc(color.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5))}</td></tr>`).join('')).join('');
}
function initAdminOrders() {
  adminTabs('admin-orders');
  const rows = $('#orderRows');
  if (rows) rows.innerHTML = [...db.orders].reverse().map((order) => `<tr><td><a href="order.html?id=${encodeURIComponent(order.id)}">${esc(order.id)}</a></td><td>${esc(order.addr.nama)}</td><td>${rp(order.total)}</td><td>${badge(order.status)}</td><td><select data-order-status="${esc(order.id)}">${[...STATUS, 'Ditolak'].map((status) => `<option ${status === order.status ? 'selected' : ''}>${status}</option>`).join('')}</select></td><td><input data-order-resi="${esc(order.id)}" value="${esc(order.resi || '')}" placeholder="No. resi"></td></tr>`).join('') || '<tr><td colspan="6" class="muted">Belum ada pesanan.</td></tr>';
}
function initAdminPayments() {
  adminTabs('admin-payments');
  const waiting = db.orders.filter((order) => order.status === 'Menunggu Verifikasi');
  const rows = $('#paymentRows');
  if (rows) rows.innerHTML = waiting.map((order) => `<tr><td>${esc(order.id)}</td><td>${rp(order.total)}</td><td>${order.proofData ? `<a href="${esc(order.proofData)}" target="_blank" rel="noopener">Lihat ${esc(order.proof || 'bukti')}</a>` : esc(order.proof || '-')}</td><td><button class="btn sm" type="button" data-verify="${esc(order.id)}|ok">Terima</button> <button class="btn ghost sm" type="button" data-verify="${esc(order.id)}|no">Tolak</button></td></tr>`).join('') || '<tr><td colspan="4" class="muted">Tidak ada pembayaran menunggu.</td></tr>';
}
function initAdminCustomers() {
  adminTabs('admin-customers');
  const rows = $('#customerRows');
  if (rows) rows.innerHTML = db.users.filter((user) => user.role === 'customer').map((user) => `<tr><td>${esc(user.name)}</td><td>${esc(user.email)}</td><td>${esc(user.phone)}</td><td>${db.orders.filter((order) => order.uid === user.id).map((order) => `<a href="order.html?id=${encodeURIComponent(order.id)}">${esc(order.id)}</a>`).join(', ') || '-'}</td></tr>`).join('') || '<tr><td colspan="4" class="muted">Belum ada pelanggan.</td></tr>';
}
function renderReport() {
  const from = $('#rFrom')?.value || '';
  const to = $('#rTo')?.value || '';
  const list = paidOrders().filter((order) => (!from || order.date >= from) && (!to || order.date <= to));
  const topProducts = {};
  list.forEach((order) => order.items.forEach((item) => { topProducts[item.name] = (topProducts[item.name] || 0) + item.qty; }));
  const host = $('#reportContent');
  if (!host) return;
  host.innerHTML = `<div class="stats"><div class="stat"><b>${rp(list.reduce((sum, order) => sum + order.total, 0))}</b><small>Total pendapatan</small></div><div class="stat"><b>${list.length}</b><small>Transaksi</small></div></div><div class="box"><h3>Produk Terlaris</h3>${Object.entries(topProducts).sort((a, b) => b[1] - a[1]).map(([name, qty]) => `<div class="row"><span>${esc(name)}</span><span>${qty} pcs</span></div>`).join('') || '<p class="muted">Tidak ada data.</p>'}</div><br><div class="tbl"><table><thead><tr><th>Kode</th><th>Tanggal</th><th>Total</th></tr></thead><tbody>${list.map((order) => `<tr><td>${esc(order.id)}</td><td>${esc(order.date)}</td><td>${rp(order.total)}</td></tr>`).join('')}</tbody></table></div>`;
}
function initAdminReports() {
  adminTabs('admin-reports');
  $('#rFrom')?.addEventListener('input', renderReport);
  $('#rTo')?.addEventListener('input', renderReport);
  renderReport();
}

/* ---------- Event handlers ---------- */
document.addEventListener('click', (event) => {
  const target = event.target.closest('button, a');
  if (!target) return;
  const data = target.dataset;
  if (data.color !== undefined) {
    const product = prod(params.get('id'));
    if (!product) return;
    selectedVariant.color = data.color;
    selectedVariant.size = '';
    $$('[data-color]').forEach((button) => button.classList.toggle('on', button === target));
    $$('[data-size]').forEach((button) => { button.disabled = !(stockFor(product, selectedVariant.color)[button.dataset.size] > 0); button.classList.remove('on'); });
    const photo = productImage(product, selectedVariant.color);
    const mainPhoto = $('#productMainPhoto');
    if (mainPhoto && photo) { mainPhoto.src = photo; mainPhoto.alt = `${product.name} - ${selectedVariant.color}`; }
    const info = $('#stockInfo');
    if (info) info.textContent = `Pilih ukuran untuk melihat stok warna ${selectedVariant.color}.`;
  }
  if (data.size !== undefined) {
    selectedVariant.size = data.size;
    $$('[data-size]').forEach((button) => button.classList.toggle('on', button === target));
    const product = prod(params.get('id'));
    const info = $('#stockInfo');
    if (info && product) info.textContent = `Stok tersedia: ${stockFor(product, selectedVariant.color)[data.size]}`;
  }
  if (target.id === 'addBtn') {
    if (!selectedVariant.size) return toast('Pilih ukuran terlebih dahulu.');
    const id = params.get('id');
    const product = prod(id);
    const existing = db.cart.find((item) => item.pid === product.id && item.size === selectedVariant.size && item.color === selectedVariant.color);
    if ((existing?.qty || 0) + 1 > stockFor(product, selectedVariant.color)[selectedVariant.size]) return toast('Stok tidak cukup.');
    if (existing) existing.qty += 1;
    else db.cart.push({ pid: product.id, size: selectedVariant.size, color: selectedVariant.color, qty: 1 });
    save(); toast('Produk ditambahkan ke keranjang.');
  }
  if (data.qty !== undefined) {
    const item = db.cart[Number(data.qty)];
    if (!item) return;
    const nextQty = item.qty + Number(data.delta || 0);
    if (nextQty > stockFor(prod(item.pid), item.color)[item.size]) return toast('Stok tidak cukup.');
    if (nextQty < 1) return;
    item.qty = nextQty; save(); initCart();
  }
  if (data.remove !== undefined) { db.cart.splice(Number(data.remove), 1); save(); initCart(); }
  if (target.id === 'logout') { db.session = null; db.cart = []; db.cartOwner = null; save(); location.href = 'index.html'; }
  if (data.deladdr !== undefined && me()) { me().addresses.splice(Number(data.deladdr), 1); save(); initAccount(); toast('Alamat dihapus.'); }
  if (data.editCategory !== undefined && isAdmin()) {
    const index = Number(data.editCategory); const oldName = db.cats[index];
    const newName = prompt('Nama kategori baru:', oldName);
    if (newName?.trim() && newName.trim() !== oldName) { db.products.forEach((product) => { if (product.cat === oldName) product.cat = newName.trim(); }); db.cats[index] = newName.trim(); save(); initAdminCategories(); }
  }
  if (data.deleteCategory !== undefined && isAdmin()) {
    const index = Number(data.deleteCategory); const name = db.cats[index];
    if (db.products.some((product) => product.cat === name)) return toast('Kategori masih digunakan oleh produk.');
    db.cats.splice(index, 1); save(); initAdminCategories(); initAdminProducts();
  }
  if (data.editProduct !== undefined && isAdmin()) {
    const product = prod(data.editProduct); const form = $('#prodForm');
    if (!product || !form) return;
    form.elements.namedItem('id').value = product.id;
    form.elements.namedItem('name').value = product.name;
    form.elements.namedItem('price').value = product.price;
    form.elements.namedItem('cat').value = product.cat;
    form.elements.namedItem('colors').value = product.colors.join(', ');
    form.elements.namedItem('desc').value = product.desc;
    $('#productFormTitle').textContent = 'Ubah Produk';
    form.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  if (data.toggleProduct !== undefined && isAdmin()) { const product = prod(data.toggleProduct); if (product) product.active = !product.active; save(); initAdminProducts(); }
  if (data.deleteProduct !== undefined && isAdmin() && confirm('Hapus produk ini?')) {
    db.products = db.products.filter((product) => String(product.id) !== String(data.deleteProduct));
    db.cart = db.cart.filter((item) => String(item.pid) !== String(data.deleteProduct));
    save(); initAdminProducts();
  }
  if (data.verify !== undefined && isAdmin()) {
    const [id, action] = data.verify.split('|'); const order = db.orders.find((item) => item.id === id);
    if (!order) return;
    if (action === 'ok') order.status = 'Diproses';
    else { order.status = 'Menunggu Pembayaran'; order.proof = ''; order.proofData = ''; }
    save(); initAdminPayments(); toast(action === 'ok' ? 'Pembayaran diverifikasi.' : 'Pembayaran ditolak.');
  }
});

document.addEventListener('change', (event) => {
  const target = event.target;
  if (target.id === 'courier') {
    const shipping = $('#shipV'); const total = $('#totV');
    if (shipping) shipping.textContent = rp(shipCost(target.value));
    if (total) total.textContent = rp(cartSub() + shipCost(target.value));
  }
  if (target.id === 'savedAddress' && me()) {
    const address = me().addresses?.[Number(target.value)];
    if (address) ['nama', 'hp', 'alamat', 'kota', 'prov', 'pos'].forEach((key) => { const field = $('#checkoutForm')?.elements.namedItem(key); if (field) field.value = address[key] || ''; });
  }
  if (target.dataset.stock !== undefined && isAdmin()) {
    const [id, color, size] = target.dataset.stock.split('|');
    const product = prod(id); if (!product) return;
    stockFor(product, decodeURIComponent(color))[size] = Math.max(0, Number(target.value) || 0);
    save(); toast('Stok varian diperbarui.');
  }
  if (target.dataset.orderStatus && isAdmin()) {
    const order = db.orders.find((item) => item.id === target.dataset.orderStatus);
    if (order) { order.status = target.value; save(); initAdminOrders(); }
  }
  if (target.dataset.orderResi && isAdmin()) {
    const order = db.orders.find((item) => item.id === target.dataset.orderResi);
    if (order) { order.resi = target.value.trim(); save(); toast('Nomor resi disimpan.'); }
  }
});

document.addEventListener('submit', (event) => {
  const form = event.target;
  const formId = form.id;
  if (!formId) return;
  event.preventDefault();
  const value = (name) => (form.elements.namedItem(name)?.value || '').trim();
  if (formId === 'loginForm') {
    const user = db.users.find((item) => item.email === value('email').toLowerCase() && item.pass === value('pass'));
    if (!user) { $('#loginError').textContent = 'Email atau kata sandi salah.'; return; }
    if (db.session !== user.id) db.cart = [];
    db.session = user.id; db.cartOwner = user.id; save();
    location.href = user.role === 'admin' ? 'admin.html' : 'account.html';
  }
  if (formId === 'registerForm') {
    if (db.users.some((user) => user.email === value('email').toLowerCase())) { $('#registerError').textContent = 'Email sudah terdaftar.'; return; }
    const user = { id: Date.now(), name: value('name'), email: value('email').toLowerCase(), phone: value('phone'), pass: value('pass'), role: 'customer', addresses: [] };
    db.users.push(user); db.session = user.id; db.cart = []; db.cartOwner = user.id; save(); location.href = 'account.html';
  }
  if (formId === 'profileForm' && me()) { me().name = value('name'); me().phone = value('phone'); save(); toast('Profil disimpan.'); }
  if (formId === 'addressForm' && me()) {
    me().addresses = me().addresses || [];
    me().addresses.push({ nama: value('nama'), hp: value('hp'), alamat: value('alamat'), kota: value('kota'), prov: value('prov'), pos: value('pos') });
    save(); initAccount(); toast('Alamat berhasil disimpan.');
  }
  if (formId === 'checkoutForm' && me()) {
    for (const item of db.cart) if (item.qty > stockFor(prod(item.pid), item.color)[item.size]) return toast(`Stok ${prod(item.pid)?.name} (${item.color} / ${item.size}) tidak cukup.`);
    const address = { nama: value('nama'), hp: value('hp'), alamat: value('alamat'), kota: value('kota'), prov: value('prov'), pos: value('pos') };
    const subtotal = cartSub(); const shipping = shipCost(value('kurir'));
    const order = { id: 'RNA-' + String(db.orders.length + 1).padStart(4, '0'), uid: me().id, date: new Date().toISOString().slice(0, 10), addr: address, kurir: value('kurir'), bayar: value('bayar'), items: db.cart.map((item) => ({ name: prod(item.pid).name, price: prod(item.pid).price, size: item.size, color: item.color, qty: item.qty })), ongkir: shipping, total: subtotal + shipping, status: 'Menunggu Pembayaran', resi: '', proof: '' };
    db.cart.forEach((item) => { const product = prod(item.pid); stockFor(product, item.color)[item.size] -= item.qty; product.sold += item.qty; });
    me().addresses = [address, ...(me().addresses || []).filter((saved) => JSON.stringify(saved) !== JSON.stringify(address))];
    db.orders.push(order); db.cart = []; db.cartOwner = me().id; save(); location.href = `payment.html?id=${encodeURIComponent(order.id)}`;
  }
  if (formId === 'paymentForm') {
    const order = db.orders.find((item) => item.id === params.get('id') && item.uid === me()?.id);
    const file = $('#proofFile')?.files?.[0];
    if (!order || !file) return toast('Pilih file bukti pembayaran.');
    if (file.size > 2 * 1024 * 1024) return toast('Ukuran bukti pembayaran maksimal 2 MB.');
    if (!(file.type.startsWith('image/') || file.type === 'application/pdf')) return toast('Gunakan file gambar atau PDF.');
    const reader = new FileReader();
    reader.onload = () => { order.proof = file.name; order.proofData = reader.result; order.status = 'Menunggu Verifikasi'; save(); toast('Bukti terkirim, menunggu verifikasi admin.'); initPayment(); };
    reader.onerror = () => toast('File bukti tidak dapat dibaca.');
    reader.readAsDataURL(file);
  }
  if (formId === 'categoryForm' && isAdmin()) {
    const category = value('category');
    if (category && !db.cats.includes(category)) { db.cats.push(category); save(); initAdminCategories(); initAdminProducts(); }
    form.reset();
  }
  if (formId === 'prodForm' && isAdmin()) {
    const colors = [...new Set(value('colors').split(',').map((color) => color.trim()).filter(Boolean))];
    if (!colors.length) return toast('Tambahkan minimal satu warna.');
    const existing = value('id') ? prod(value('id')) : null;
    const data = { name: value('name'), price: Number(value('price')), cat: value('cat'), colors, desc: value('desc') };
    const photoFile = form.elements.namedItem('photo')?.files?.[0];
    const saveProduct = (photo = existing?.photo || '') => {
      if (photo) data.photo = photo;
      const currentStock = existing?.stockByColor || {};
      data.stockByColor = Object.fromEntries(colors.map((color) => [color, currentStock[color] || SIZES_STOCK()]));
      if (existing) Object.assign(existing, data);
      else db.products.push({ id: Date.now(), ...data, stock: SIZES_STOCK(), active: true, sold: 0 });
      save(); form.reset(); $('#productFormTitle').textContent = 'Tambah Produk'; initAdminProducts(); toast('Produk berhasil disimpan.');
    };
    if (photoFile) {
      if (!photoFile.type.startsWith('image/')) return toast('File foto harus berupa gambar.');
      if (photoFile.size > 1.5 * 1024 * 1024) return toast('Ukuran foto maksimal 1,5 MB.');
      const reader = new FileReader(); reader.onload = () => saveProduct(reader.result); reader.onerror = () => toast('Foto produk tidak dapat dibaca.'); reader.readAsDataURL(photoFile);
    } else saveProduct();
  }
  if (formId === 'newsletterForm') { toast('Terima kasih, email berhasil didaftarkan.'); form.reset(); }
});

/* ---------- Inisialisasi sesuai file HTML yang sedang dibuka ---------- */
updateNav();
if (guardPage()) {
  const initializers = {
    home: initHome, shop: initShop, product: initProduct, cart: initCart, checkout: initCheckout,
    payment: initPayment, account: initAccount, order: initOrder, admin: initAdminDashboard,
    'admin-categories': initAdminCategories, 'admin-products': initAdminProducts, 'admin-stock': initAdminStock,
    'admin-orders': initAdminOrders, 'admin-payments': initAdminPayments, 'admin-customers': initAdminCustomers,
    'admin-reports': initAdminReports,
  };
  initializers[page]?.();
}
$('#menuToggle')?.addEventListener('click', () => {
  const menu = $('#menu'); const opened = menu?.classList.toggle('open');
  $('#menuToggle')?.setAttribute('aria-expanded', String(Boolean(opened)));
});
