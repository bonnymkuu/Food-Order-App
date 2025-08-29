/******************************
 * Food Ordering – Single Restaurant
 * Frontend only (HTML/CSS/JS)
 * Data: TheMealDB (public API)
 ******************************/

/* ---------- DOM ELEMENTS ---------- */
const mealListEl   = document.getElementById("meal-list");
const cartItemsEl  = document.getElementById("cart-items");
const cartTotalEl  = document.getElementById("cart-total");
const checkoutBtn  = document.getElementById("checkout-btn");

/* ---------- STATE ---------- */
let cart = loadCart(); // [{id, name, img, price, qty}]
let lastQuery = { type: "category", value: "Seafood" }; // default feed

/* ---------- UTILITIES ---------- */
// Deterministic price from a string id so the same meal always has same price
function priceFromId(id) {
  // Simple hash → 500–2500 (i.e., 5.00–25.00)
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  const cents = 500 + (hash % 2001); // 500..2501
  return (cents / 100).toFixed(2);
}

function saveCart() {
  localStorage.setItem("cart", JSON.stringify(cart));
}
function loadCart() {
  try {
    return JSON.parse(localStorage.getItem("cart")) || [];
  } catch {
    return [];
  }
}
function fmtMoney(n) {
  return `$${Number(n).toFixed(2)}`;
}

/* ---------- CONTROLS (Injected UI) ---------- */
function injectControls() {
  const menuSection = document.getElementById("menu");
  // Wrapper
  const controls = document.createElement("div");
  controls.style.maxWidth = "1100px";
  controls.style.margin = "0 auto 20px";
  controls.style.display = "grid";
  controls.style.gridTemplateColumns = "1fr 1fr auto";
  controls.style.gap = "10px";

  // Search input
  const searchInput = document.createElement("input");
  searchInput.type = "text";
  searchInput.placeholder = "Search meals (e.g. chicken, pasta, curry)";
  searchInput.id = "meal-search";
  searchInput.style.padding = "10px";
  searchInput.style.border = "1px solid #ddd";
  searchInput.style.borderRadius = "6px";

  // Category select
  const catSelect = document.createElement("select");
  catSelect.id = "meal-category";
  catSelect.style.padding = "10px";
  catSelect.style.border = "1px solid #ddd";
  catSelect.style.borderRadius = "6px";
  // placeholder option
  const opt = document.createElement("option");
  opt.value = "";
  opt.textContent = "Loading categories…";
  catSelect.appendChild(opt);

  // Buttons wrapper
  const btnWrap = document.createElement("div");
  btnWrap.style.display = "flex";
  btnWrap.style.gap = "10px";

  const searchBtn = document.createElement("button");
  searchBtn.textContent = "Search";
  searchBtn.style.padding = "10px 14px";
  searchBtn.style.border = "none";
  searchBtn.style.borderRadius = "6px";
  searchBtn.style.cursor = "pointer";
  searchBtn.style.background = "#ff6347";
  searchBtn.style.color = "#fff";

  const resetBtn = document.createElement("button");
  resetBtn.textContent = "Reset";
  resetBtn.style.padding = "10px 14px";
  resetBtn.style.border = "none";
  resetBtn.style.borderRadius = "6px";
  resetBtn.style.cursor = "pointer";
  resetBtn.style.background = "#555";
  resetBtn.style.color = "#fff";

  btnWrap.appendChild(searchBtn);
  btnWrap.appendChild(resetBtn);

  controls.appendChild(searchInput);
  controls.appendChild(catSelect);
  controls.appendChild(btnWrap);

  // Insert controls before meal list
  menuSection.insertBefore(controls, mealListEl);

  // Events
  searchBtn.addEventListener("click", () => {
    const q = searchInput.value.trim();
    if (q) {
      lastQuery = { type: "search", value: q };
      fetchMealsBySearch(q);
    }
  });
  resetBtn.addEventListener("click", () => {
    searchInput.value = "";
    if (catSelect.value) {
      lastQuery = { type: "category", value: catSelect.value };
      fetchMealsByCategory(catSelect.value);
    } else {
      lastQuery = { type: "category", value: "Seafood" };
      fetchMealsByCategory("Seafood");
    }
  });
  catSelect.addEventListener("change", () => {
    if (catSelect.value) {
      lastQuery = { type: "category", value: catSelect.value };
      fetchMealsByCategory(catSelect.value);
    }
  });

  // Load categories
  fetchCategories(catSelect);
}

/* ---------- API CALLS (TheMealDB) ---------- */
async function fetchCategories(selectEl) {
  try {
    const res = await fetch("https://www.themealdb.com/api/json/v1/1/list.php?c=list");
    const data = await res.json();
    const cats = (data.meals || []).map(c => c.strCategory).sort();
    selectEl.innerHTML = ""; // clear
    // Add default choices
    const def1 = document.createElement("option");
    def1.value = "Seafood";
    def1.textContent = "Seafood (default)";
    selectEl.appendChild(def1);
    cats.forEach(c => {
      const o = document.createElement("option");
      o.value = c;
      o.textContent = c;
      selectEl.appendChild(o);
    });
    selectEl.value = "Seafood";
  } catch (e) {
    console.error("Failed to load categories", e);
    selectEl.innerHTML = `<option value="Seafood">Seafood (default)</option>`;
  }
}

async function fetchMealsByCategory(category) {
  try {
    mealListEl.innerHTML = "<p>Loading meals…</p>";
    const res = await fetch(`https://www.themealdb.com/api/json/v1/1/filter.php?c=${encodeURIComponent(category)}`);
    const data = await res.json();
    displayMeals(data.meals || []);
  } catch (e) {
    console.error("Error fetching category meals:", e);
    mealListEl.innerHTML = "<p>⚠️ Failed to load meals.</p>";
  }
}

async function fetchMealsBySearch(query) {
  try {
    mealListEl.innerHTML = "<p>Searching…</p>";
    const res = await fetch(`https://www.themealdb.com/api/json/v1/1/search.php?s=${encodeURIComponent(query)}`);
    const data = await res.json();
    displayMeals(data.meals || []);
  } catch (e) {
    console.error("Error searching meals:", e);
    mealListEl.innerHTML = "<p>⚠️ Failed to search meals.</p>";
  }
}

async function fetchMealDetails(id) {
  const res = await fetch(`https://www.themealdb.com/api/json/v1/1/lookup.php?i=${encodeURIComponent(id)}`);
  const data = await res.json();
  return data.meals ? data.meals[0] : null;
}

/* ---------- RENDER MEALS ---------- */
function displayMeals(meals) {
  mealListEl.innerHTML = "";
  if (!meals.length) {
    mealListEl.innerHTML = "<p>No meals found. Try another search or category.</p>";
    return;
  }

  meals.forEach(meal => {
    const card = document.createElement("div");
    card.className = "meal";

    const price = Number(priceFromId(meal.idMeal));

    card.innerHTML = `
      <img src="${meal.strMealThumb}" alt="${meal.strMeal}">
      <h3>${meal.strMeal}</h3>
      <p style="margin:6px 0 10px;">${fmtMoney(price)}</p>
      <div style="display:flex; gap:8px; justify-content:center;">
        <button class="btn-add">Add to Cart</button>
        <button class="btn-details">Details</button>
      </div>
    `;

    const addBtn = card.querySelector(".btn-add");
    const detBtn = card.querySelector(".btn-details");

    addBtn.addEventListener("click", () => addToCart({
      id: meal.idMeal,
      name: meal.strMeal,
      img: meal.strMealThumb,
      price
    }));

    detBtn.addEventListener("click", async () => {
      const details = await fetchMealDetails(meal.idMeal);
      if (details) openMealModal(details, price);
    });

    mealListEl.appendChild(card);
  });
}

/* ---------- MODALS ---------- */
function openMealModal(meal, price) {
  const modal = document.createElement("div");
  modal.className = "meal-modal";
  Object.assign(modal.style, {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.55)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "20px",
    zIndex: 1000
  });

  const content = document.createElement("div");
  Object.assign(content.style, {
    background: "#fff",
    borderRadius: "12px",
    maxWidth: "800px",
    width: "100%",
    maxHeight: "90vh",
    overflowY: "auto",
    padding: "20px",
    boxShadow: "0 10px 30px rgba(0,0,0,0.2)"
  });

  const close = document.createElement("button");
  close.textContent = "×";
  Object.assign(close.style, {
    border: "none",
    background: "transparent",
    fontSize: "28px",
    lineHeight: 1,
    cursor: "pointer",
    float: "right"
  });
  close.addEventListener("click", () => modal.remove());

  const title = document.createElement("h2");
  title.textContent = meal.strMeal;

  const img = document.createElement("img");
  img.src = meal.strMealThumb;
  img.alt = meal.strMeal;
  Object.assign(img.style, { width: "100%", borderRadius: "10px", margin: "10px 0" });

  const meta = document.createElement("p");
  meta.innerHTML = `<strong>Category:</strong> ${meal.strCategory || "-"} &nbsp; | &nbsp; <strong>Area:</strong> ${meal.strArea || "-"}`;
  const priceEl = document.createElement("p");
  priceEl.innerHTML = `<strong>Price:</strong> ${fmtMoney(price)}`;

  const instr = document.createElement("p");
  instr.style.whiteSpace = "pre-wrap";
  instr.style.marginTop = "10px";
  instr.textContent = meal.strInstructions || "No instructions.";

  const addBtn = document.createElement("button");
  addBtn.textContent = "Add to Cart";
  Object.assign(addBtn.style, {
    padding: "10px 16px",
    border: "none",
    borderRadius: "8px",
    background: "#ff6347",
    color: "#fff",
    cursor: "pointer",
    marginTop: "10px"
  });
  addBtn.addEventListener("click", () => {
    addToCart({ id: meal.idMeal, name: meal.strMeal, img: meal.strMealThumb, price: Number(price) });
    modal.remove();
  });

  if (meal.strYoutube) {
    const a = document.createElement("a");
    a.href = meal.strYoutube;
    a.target = "_blank";
    a.rel = "noopener";
    a.textContent = "Watch recipe video";
    Object.assign(a.style, { display: "inline-block", marginLeft: "12px" });
    addBtn.after(a);
  }

  content.appendChild(close);
  content.appendChild(title);
  content.appendChild(img);
  content.appendChild(meta);
  content.appendChild(priceEl);
  content.appendChild(instr);
  content.appendChild(addBtn);
  modal.appendChild(content);
  document.body.appendChild(modal);
}

function openCheckoutModal(totalAmount) {
  const modal = document.createElement("div");
  modal.className = "checkout-modal";
  Object.assign(modal.style, {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.55)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "20px",
    zIndex: 1000
  });

  const form = document.createElement("form");
  Object.assign(form.style, {
    background: "#fff",
    borderRadius: "12px",
    maxWidth: "600px",
    width: "100%",
    padding: "20px",
    boxShadow: "0 10px 30px rgba(0,0,0,0.2)"
  });

  form.innerHTML = `
    <h2 style="margin-bottom:10px;">Checkout</h2>
    <p style="margin-bottom:16px;">Total: <strong>${fmtMoney(totalAmount)}</strong></p>

    <label>Full Name</label>
    <input type="text" name="name" required placeholder="Your name" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:8px;margin:6px 0 12px;"/>

    <label>Phone</label>
    <input type="tel" name="phone" required placeholder="07xx xxx xxx" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:8px;margin:6px 0 12px;"/>

    <label>Delivery Address</label>
    <textarea name="address" required placeholder="Street, building, apartment"
      style="width:100%;padding:10px;border:1px solid #ddd;border-radius:8px;margin:6px 0 12px;min-height:80px;"></textarea>

    <label>Notes (optional)</label>
    <input type="text" name="notes" placeholder="E.g., no onions"
      style="width:100%;padding:10px;border:1px solid #ddd;border-radius:8px;margin:6px 0 12px;"/>

    <label>Payment Method</label>
    <select name="payment" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:8px;margin:6px 0 16px;">
      <option value="cash">Cash on Delivery</option>
      <option value="card">Card on Delivery</option>
    </select>

    <div style="display:flex; gap:10px; justify-content:flex-end;">
      <button type="button" id="cancelCheckout" style="padding:10px 16px;border:none;border-radius:8px;background:#888;color:#fff;cursor:pointer;">Cancel</button>
      <button type="submit" style="padding:10px 16px;border:none;border-radius:8px;background:#28a745;color:#fff;cursor:pointer;">Place Order</button>
    </div>
  `;

  form.querySelector("#cancelCheckout").addEventListener("click", () => modal.remove());

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const order = buildOrderObject({
      name: fd.get("name"),
      phone: fd.get("phone"),
      address: fd.get("address"),
      notes: fd.get("notes"),
      payment: fd.get("payment"),
    });
    saveOrder(order);
    cart = [];
    saveCart();
    updateCartUI();
    modal.remove();
    alert(`✅ Order placed!\nOrder No: ${order.orderNo}\nTotal: ${fmtMoney(order.total)}`);
  });

  modal.appendChild(form);
  document.body.appendChild(modal);
}

/* ---------- CART LOGIC ---------- */
function addToCart({ id, name, img, price }) {
  const found = cart.find(i => i.id === id);
  if (found) {
    found.qty += 1;
  } else {
    cart.push({ id, name, img, price: Number(price), qty: 1 });
  }
  saveCart();
  updateCartUI();
}

function removeFromCart(id) {
  cart = cart.filter(i => i.id !== id);
  saveCart();
  updateCartUI();
}

function setQty(id, qty) {
  const item = cart.find(i => i.id === id);
  if (!item) return;
  item.qty = Math.max(1, qty);
  saveCart();
  updateCartUI();
}

function calcTotal() {
  return cart.reduce((sum, i) => sum + i.price * i.qty, 0);
}

function updateCartUI() {
  cartItemsEl.innerHTML = "";
  if (cart.length === 0) {
    cartItemsEl.innerHTML = `<li style="list-style:none;">Your cart is empty.</li>`;
    cartTotalEl.textContent = `Total: ${fmtMoney(0)}`;
    return;
  }

  cart.forEach(item => {
    const li = document.createElement("li");
    // compact image & title block
    li.innerHTML = `
      <span style="display:flex; align-items:center; gap:8px;">
        <img src="${item.img}" alt="" style="width:34px;height:34px;object-fit:cover;border-radius:4px;">
        ${item.name}
      </span>
      <span>
        <button class="qty-minus" aria-label="Decrease">−</button>
        <input class="qty" type="number" min="1" value="${item.qty}" style="width:48px; text-align:center;">
        <button class="qty-plus" aria-label="Increase">+</button>
        <span style="margin:0 8px; display:inline-block; min-width:70px; text-align:right;">${fmtMoney(item.price * item.qty)}</span>
        <button class="remove" aria-label="Remove">❌</button>
      </span>
    `;

    const minus = li.querySelector(".qty-minus");
    const plus  = li.querySelector(".qty-plus");
    const qtyIn = li.querySelector(".qty");
    const rm    = li.querySelector(".remove");

    minus.style.border = plus.style.border = rm.style.border = "none";
    minus.style.cursor = plus.style.cursor = rm.style.cursor = "pointer";
    minus.style.padding = plus.style.padding = rm.style.padding = "4px 8px";
    minus.style.borderRadius = plus.style.borderRadius = rm.style.borderRadius = "4px";
    minus.style.background = plus.style.background = "#eee";

    minus.addEventListener("click", () => setQty(item.id, item.qty - 1));
    plus.addEventListener("click",  () => setQty(item.id, item.qty + 1));
    qtyIn.addEventListener("change", () => setQty(item.id, parseInt(qtyIn.value || "1", 10)));
    rm.addEventListener("click", () => removeFromCart(item.id));

    cartItemsEl.appendChild(li);
  });

  cartTotalEl.textContent = `Total: ${fmtMoney(calcTotal())}`;
}

/* ---------- ORDERS (stored locally for admin view later) ---------- */
function buildOrderObject(customer) {
  const orderNo = "ORD-" + Date.now().toString().slice(-6) + "-" + Math.floor(100 + Math.random() * 900);
  const items = cart.map(i => ({ id: i.id, name: i.name, price: i.price, qty: i.qty }));
  const total = calcTotal();
  return {
    orderNo,
    createdAt: new Date().toISOString(),
    items,
    total,
    customer, // {name, phone, address, notes, payment}
    status: "Pending"
  };
}
function saveOrder(order) {
  const key = "orders";
  let arr = [];
  try { arr = JSON.parse(localStorage.getItem(key)) || []; } catch {}
  arr.push(order);
  localStorage.setItem(key, JSON.stringify(arr));
}

/* ---------- EVENTS ---------- */
checkoutBtn.addEventListener("click", () => {
  if (cart.length === 0) {
    alert("Your cart is empty!");
    return;
  }
  openCheckoutModal(calcTotal());
});

/* ---------- INIT ---------- */
document.addEventListener("DOMContentLoaded", () => {
  injectControls();
  updateCartUI();
  // initial load
  fetchMealsByCategory("Seafood");
});
