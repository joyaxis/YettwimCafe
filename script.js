const ORDER_STATUSES = ["주문요청", "음료준비중", "완료"];
const ITEM_STATUSES = ["주문요청", "제작중", "제작완료"];
const STORAGE_MENU = "cafe_menu_items_v1";
const STORAGE_ORDERS = "cafe_orders_v1";
const STORAGE_NOTIFICATIONS = "cafe_notifications_v1";
const STORAGE_ORDER_SEQ = "cafe_order_seq_v1";
const STORAGE_RECIPE_OPEN = "cafe_recipe_open_v1";
const STORAGE_INVENTORY = "cafe_inventory_v1";
const STORAGE_ADMIN_PASSWORD = "cafe_admin_password_v1";
const STORAGE_ADMIN_SESSION = "cafe_admin_session_v1";
const STORAGE_ADMIN_SESSION_TTL = "cafe_admin_session_ttl_v1";

const defaultMenuItems = [
  {
    id: "americano",
    name: "아메리카노",
    desc: "진한 원두 향이 느껴지는 클래식",
    price: 4500,
    category: "커피",
    image: "",
    recipe: "",
  },
  {
    id: "iced-americano",
    name: "아이스 아메리카노",
    desc: "시원하고 깔끔한 아이스 커피",
    price: 4800,
    category: "커피",
    image: "",
    recipe: "",
  },
  {
    id: "cafe-latte",
    name: "카페라떼",
    desc: "부드러운 우유와 에스프레소",
    price: 5200,
    category: "라떼",
    image: "",
    recipe: "",
  },
  {
    id: "iced-cafe-latte",
    name: "아이스 카페라떼",
    desc: "시원하게 즐기는 라떼",
    price: 5500,
    category: "라떼",
    image: "",
    recipe: "",
  },
  {
    id: "black-sesame-latte",
    name: "흑임자라떼",
    desc: "고소한 흑임자와 크림",
    price: 5800,
    category: "라떼",
    image: "",
    recipe: "",
  },
  {
    id: "cream-latte",
    name: "크림라떼",
    desc: "달콤한 크림이 올라간 라떼",
    price: 5600,
    category: "라떼",
    image: "",
    recipe: "",
  },
];

const state = new Map();
let menuItems = loadMenuItems();
let orders = loadOrders();
let notifications = loadNotifications();
let inventoryItems = loadInventory();
let activeCategory = "전체";
let activeNotifyFilter = "all";
let recipeDefaultOpen = loadRecipeDefaultOpen();
let isAdmin = loadAdminSession();

const menuGrid = document.getElementById("menuGrid");
const orderList = document.getElementById("orderList");
const subtotalEl = document.getElementById("subtotal");
const discountEl = document.getElementById("discount");
const totalEl = document.getElementById("total");
const clearCartBtn = document.getElementById("clearCart");
const placeOrderBtn = document.getElementById("placeOrder");
const orderStatus = document.getElementById("orderStatus");
const categoryTabs = document.getElementById("categoryTabs");
const orderHistory = document.getElementById("orderHistory");
const menuEditor = document.getElementById("menuEditor");
const adminOrders = document.getElementById("adminOrders");
const notifyList = document.getElementById("notifyList");
const exportCsvBtn = document.getElementById("exportCsv");
const notifyFilters = document.getElementById("notifyFilters");
const recipeEditor = document.getElementById("recipeEditor");
const recipeDefaultOpenToggle = document.getElementById("recipeDefaultOpen");
const inventoryList = document.getElementById("inventoryList");
const inventoryCategory = document.getElementById("inventoryCategory");
const inventoryName = document.getElementById("inventoryName");
const inventoryQty = document.getElementById("inventoryQty");
const inventoryPrice = document.getElementById("inventoryPrice");
const addInventoryBtn = document.getElementById("addInventory");
const adminLogin = document.getElementById("adminLogin");
const adminPanel = document.getElementById("adminPanel");
const adminPasswordInput = document.getElementById("adminPassword");
const adminLoginBtn = document.getElementById("adminLoginBtn");
const adminLoginStatus = document.getElementById("adminLoginStatus");
const adminLoginTrigger = document.getElementById("adminLoginTrigger");
const adminNewPassword = document.getElementById("adminNewPassword");
const adminPasswordSave = document.getElementById("adminPasswordSave");
const adminLogout = document.getElementById("adminLogout");

const formatPrice = (value) => value.toLocaleString("ko-KR");

function loadMenuItems() {
  const raw = localStorage.getItem(STORAGE_MENU);
  if (!raw) return defaultMenuItems;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length ? parsed : defaultMenuItems;
  } catch (error) {
    return defaultMenuItems;
  }
}

function saveMenuItems() {
  localStorage.setItem(STORAGE_MENU, JSON.stringify(menuItems));
}

function loadOrders() {
  const raw = localStorage.getItem(STORAGE_ORDERS);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
}

function saveOrders() {
  localStorage.setItem(STORAGE_ORDERS, JSON.stringify(orders));
}

function loadRecipeDefaultOpen() {
  const raw = localStorage.getItem(STORAGE_RECIPE_OPEN);
  return raw === "true";
}

function saveRecipeDefaultOpen() {
  localStorage.setItem(STORAGE_RECIPE_OPEN, String(recipeDefaultOpen));
}

function loadNotifications() {
  const raw = localStorage.getItem(STORAGE_NOTIFICATIONS);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
}

function saveNotifications() {
  localStorage.setItem(STORAGE_NOTIFICATIONS, JSON.stringify(notifications));
}

function loadInventory() {
  const raw = localStorage.getItem(STORAGE_INVENTORY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
}

function saveInventory() {
  localStorage.setItem(STORAGE_INVENTORY, JSON.stringify(inventoryItems));
}

function loadAdminPassword() {
  const raw = localStorage.getItem(STORAGE_ADMIN_PASSWORD);
  if (!raw) return "admin123";
  return raw;
}

function saveAdminPassword(value) {
  localStorage.setItem(STORAGE_ADMIN_PASSWORD, value);
}

function loadAdminSession() {
  return sessionStorage.getItem(STORAGE_ADMIN_SESSION) === "true";
}

function saveAdminSession(value) {
  sessionStorage.setItem(STORAGE_ADMIN_SESSION, String(value));
}

const buildCategories = () => {
  const categories = new Set(menuItems.map((item) => item.category));
  return ["전체", ...Array.from(categories)];
};

const renderTabs = () => {
  categoryTabs.innerHTML = "";
  buildCategories().forEach((category) => {
    const button = document.createElement("button");
    button.className = `tab${category === activeCategory ? " active" : ""}`;
    button.textContent = category;
    button.dataset.category = category;
    categoryTabs.appendChild(button);
  });
};

const renderMenu = () => {
  menuGrid.innerHTML = "";
  const filtered =
    activeCategory === "전체"
      ? menuItems
      : menuItems.filter((item) => item.category === activeCategory);

  filtered.forEach((item) => {
    const qty = state.get(item.id) ?? 0;
    const card = document.createElement("article");
    card.className = "menu-card";
    const imageMarkup = item.image
      ? `<img class="menu-image" src="${item.image}" alt="${item.name}" data-fallback-name="${item.name}" />`
      : `<div class="menu-image placeholder">${item.name}</div>`;
    card.innerHTML = `
      ${imageMarkup}
      <div>
        <p class="menu-title">${item.name}</p>
        <p class="menu-desc">${item.desc}</p>
      </div>
      <div class="menu-footer">
        <span class="price">${formatPrice(item.price)}</span>
        <div class="qty-control">
          <button data-id="${item.id}" data-action="dec">-</button>
          <span class="qty">${qty}</span>
          <button data-id="${item.id}" data-action="inc">+</button>
        </div>
      </div>
    `;
    menuGrid.appendChild(card);
  });
  applyImageFallback(menuGrid);
};

const renderOrder = () => {
  orderList.innerHTML = "";
  let subtotal = 0;

  const selected = menuItems.filter((item) => (state.get(item.id) ?? 0) > 0);

  if (selected.length === 0) {
    orderList.innerHTML = '<p class="menu-desc">아직 담긴 메뉴가 없습니다.</p>';
  } else {
    selected.forEach((item) => {
      const qty = state.get(item.id);
      const itemTotal = qty * item.price;
      subtotal += itemTotal;

      const row = document.createElement("div");
      row.className = "order-item";
      row.innerHTML = `
        <div>
          <strong>${item.name}</strong>
          <span>${formatPrice(item.price)} × ${qty}</span>
        </div>
        <div>${formatPrice(itemTotal)}</div>
        <div class="qty-control">
          <button data-id="${item.id}" data-action="dec">-</button>
          <span class="qty">${qty}</span>
          <button data-id="${item.id}" data-action="inc">+</button>
        </div>
      `;
      orderList.appendChild(row);
    });
  }

  const discount = subtotal >= 20000 ? Math.round(subtotal * 0.1) : 0;
  const total = subtotal - discount;

  subtotalEl.textContent = formatPrice(subtotal);
  discountEl.textContent = formatPrice(discount);
  totalEl.textContent = formatPrice(total);
};

const renderHistory = () => {
  orderHistory.innerHTML = "";
  if (orders.length === 0) {
    orderHistory.innerHTML = '<p class="menu-desc">아직 주문 내역이 없습니다.</p>';
    return;
  }

  orders
    .slice()
    .reverse()
    .forEach((order) => {
      const card = document.createElement("div");
      card.className = "history-card";
      const items = order.items
        .map((item) => {
          const recipe = item.recipe || getMenuRecipe(item.id);
          const recipeBlock = recipe
            ? `
              <div class="recipe-accordion">
                <button class="recipe-toggle" data-recipe-toggle="history">
                  ${recipeDefaultOpen ? "레시피 닫기" : "레시피 보기"}
                </button>
                <div class="recipe-content${recipeDefaultOpen ? " show" : ""}">${recipe.replace(/\n/g, "<br>")}</div>
              </div>
            `
            : "";
          return `${item.name} × ${item.qty} · ${item.status}${recipeBlock}`;
        })
        .join("<br>");
      card.innerHTML = `
        <strong>주문번호 ${order.id}</strong>
        <div class="status-chip">상태: ${order.status}</div>
        <p class="menu-desc">${items}</p>
        <p class="menu-desc">총 결제: ${formatPrice(order.total)} · 픽업: ${order.pickupTime}</p>
      `;
      orderHistory.appendChild(card);
    });
};

const renderNotifications = () => {
  notifyList.innerHTML = "";
  const filtered = notifications.filter((note) => {
    if (activeNotifyFilter === "all") return true;
    return note.type === activeNotifyFilter;
  });
  const recent = filtered.slice(-5).reverse();
  if (recent.length === 0) {
    notifyList.innerHTML = '<p class="menu-desc">새 알림이 없습니다.</p>';
    return;
  }

  recent.forEach((note) => {
    const row = document.createElement("div");
    row.textContent = `${note.message} · ${note.time}`;
    notifyList.appendChild(row);
  });
};

const renderMenuEditor = () => {
  menuEditor.innerHTML = "";
  menuItems.forEach((item) => {
    const row = document.createElement("div");
    row.className = "admin-row";
    const previewMarkup = item.image
      ? `<img class="admin-image-preview" src="${item.image}" alt="${item.name}" data-fallback-name="${item.name}" />`
      : `<div class="menu-image placeholder">${item.name}</div>`;
    row.innerHTML = `
      <h4>${item.name}</h4>
      ${previewMarkup}
      <input class="admin-input" data-id="${item.id}" data-field="name" value="${item.name}" />
      <input class="admin-input" data-id="${item.id}" data-field="desc" value="${item.desc}" />
      <input class="admin-input" data-id="${item.id}" data-field="category" value="${item.category}" />
      <input class="admin-input" data-id="${item.id}" data-field="price" type="number" min="0" value="${item.price}" />
      <input class="admin-input" data-id="${item.id}" data-field="image" placeholder="이미지 URL" value="${item.image ?? ""}" />
      <div class="admin-inline">
        <input class="admin-input" type="file" accept="image/*" data-image-upload="${item.id}" />
        <button class="ghost" data-action="upload" data-id="${item.id}">이미지 업로드</button>
      </div>
      <button class="ghost" data-action="save" data-id="${item.id}">저장</button>
    `;
    menuEditor.appendChild(row);
  });
  applyImageFallback(menuEditor);
};

const renderRecipeEditor = () => {
  recipeEditor.innerHTML = "";
  menuItems.forEach((item) => {
    const row = document.createElement("div");
    row.className = "admin-row";
    row.innerHTML = `
      <h4>${item.name}</h4>
      <textarea class="admin-input admin-textarea" data-id="${item.id}" data-field="recipe" placeholder="레시피를 입력하세요.">${item.recipe ?? ""}</textarea>
      <button class="ghost" data-action="save-recipe" data-id="${item.id}">저장</button>
    `;
    recipeEditor.appendChild(row);
  });
};

const renderInventory = () => {
  inventoryList.innerHTML = "";
  if (inventoryItems.length === 0) {
    inventoryList.innerHTML = '<p class="menu-desc">등록된 재고가 없습니다.</p>';
    return;
  }

  const grouped = inventoryItems.reduce((acc, item) => {
    const key = item.category || "기타";
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});

  Object.keys(grouped)
    .sort((a, b) => a.localeCompare(b))
    .forEach((category) => {
      const group = document.createElement("div");
      group.className = "inventory-group";
      const totals = grouped[category].reduce(
        (acc, item) => ({
          qty: acc.qty + (Number(item.qty) || 0),
          value: acc.value + (Number(item.qty) || 0) * (Number(item.price) || 0),
        }),
        { qty: 0, value: 0 }
      );
      group.innerHTML = `
        <div class="inventory-group-header">
          <div>
            <span class="inventory-group-title">${category}</span>
            <div class="inventory-group-summary">총 수량 ${totals.qty} · 총 금액 ${formatPrice(totals.value)}</div>
          </div>
          <button class="inventory-group-toggle" data-inv-toggle="${category}">접기</button>
        </div>
        <div class="inventory-group-body"></div>
      `;

      const body = group.querySelector(".inventory-group-body");
      grouped[category]
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name))
        .forEach((item) => {
          const row = document.createElement("div");
          row.className = "inventory-row";
          row.innerHTML = `
            <strong>${item.name}</strong>
            <div class="inventory-meta">카테고리: ${item.category}</div>
            <div class="admin-inline">
              <input class="admin-input" type="number" min="0" data-inv-id="${item.id}" data-inv-field="qty" value="${item.qty}" />
              <input class="admin-input" type="number" min="0" data-inv-id="${item.id}" data-inv-field="price" value="${item.price}" />
              <button class="ghost" data-inv-action="save" data-inv-id="${item.id}">저장</button>
              <button class="ghost" data-inv-action="delete" data-inv-id="${item.id}">삭제</button>
            </div>
          `;
          body.appendChild(row);
        });

      inventoryList.appendChild(group);
    });
};

const renderAdminView = () => {
  if (isAdmin) {
    adminLogin.classList.add("hidden");
    adminPanel.classList.remove("hidden");
    adminLoginTrigger.textContent = "관리자 패널";
  } else {
    adminLogin.classList.remove("hidden");
    adminPanel.classList.add("hidden");
    adminLoginTrigger.textContent = "관리자 로그인";
  }
};

const renderAdminOrders = () => {
  adminOrders.innerHTML = "";
  if (orders.length === 0) {
    adminOrders.innerHTML = '<p class="menu-desc">관리할 주문이 없습니다.</p>';
    return;
  }

  orders
    .slice()
    .reverse()
    .forEach((order) => {
      const row = document.createElement("div");
      row.className = "admin-row";
      const itemControls = order.items
        .map((item) => {
          const recipe = item.recipe || getMenuRecipe(item.id);
          const recipeText = recipe
            ? `
              <div class="recipe-accordion">
                <button class="recipe-toggle" data-recipe-toggle="admin">
                  ${recipeDefaultOpen ? "레시피 닫기" : "레시피 보기"}
                </button>
                <div class="recipe-content${recipeDefaultOpen ? " show" : ""}">${recipe.replace(/\n/g, "<br>")}</div>
              </div>
            `
            : "";
          return `
          <label class="menu-desc">
            ${item.name} (${item.qty})
            <select class="admin-input" data-order="${order.id}" data-item="${item.id}">
              ${ITEM_STATUSES.map(
                (status) =>
                  `<option value="${status}" ${status === item.status ? "selected" : ""}>${status}</option>`
              ).join("")}
            </select>
          </label>
          ${recipeText}
        `;
        })
        .join("");

      row.innerHTML = `
        <h4>주문번호 ${order.id}</h4>
        <label class="menu-desc">
          주문 상태
          <select class="admin-input" data-order-status="${order.id}">
            ${ORDER_STATUSES.map(
              (status) =>
                `<option value="${status}" ${status === order.status ? "selected" : ""}>${status}</option>`
            ).join("")}
          </select>
        </label>
        ${itemControls}
      `;
      adminOrders.appendChild(row);
    });
};

const updateQty = (id, action) => {
  const current = state.get(id) ?? 0;
  const next = action === "inc" ? current + 1 : Math.max(0, current - 1);
  state.set(id, next);
  renderMenu();
  renderOrder();
};

const getMenuRecipe = (id) =>
  menuItems.find((item) => item.id === id)?.recipe || "";

const applyImageFallback = (container) => {
  const images = container.querySelectorAll("img[data-fallback-name]");
  images.forEach((img) => {
    img.onerror = () => {
      const placeholder = document.createElement("div");
      placeholder.className = "menu-image placeholder";
      placeholder.textContent = img.dataset.fallbackName || "이미지 없음";
      img.replaceWith(placeholder);
    };
  });
};

const readAndCompressImage = async (file) => {
  const maxFileSize = 5 * 1024 * 1024;
  if (file.size > maxFileSize) {
    throw new Error("이미지 파일은 5MB 이하만 업로드할 수 있습니다.");
  }

  const dataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("이미지 읽기에 실패했습니다."));
    reader.readAsDataURL(file);
  });

  const image = await new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("이미지 로드에 실패했습니다."));
    img.src = dataUrl;
  });

  const maxWidth = 900;
  const maxHeight = 900;
  const scale = Math.min(maxWidth / image.width, maxHeight / image.height, 1);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(image.width * scale);
  canvas.height = Math.round(image.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("이미지 처리에 실패했습니다.");
  }
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

  let quality = 0.85;
  let output = canvas.toDataURL("image/jpeg", quality);
  const maxOutputSize = 750 * 1024;
  const dataSize = (data) => Math.ceil((data.length * 3) / 4);

  while (dataSize(output) > maxOutputSize && quality > 0.5) {
    quality -= 0.08;
    output = canvas.toDataURL("image/jpeg", quality);
  }

  return output;
};

const getTodayStamp = () => {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `${yyyy}${mm}${dd}`;
};

const createOrderId = () => {
  const stamp = getTodayStamp();
  const raw = localStorage.getItem(STORAGE_ORDER_SEQ);
  let seqMap = {};
  if (raw) {
    try {
      seqMap = JSON.parse(raw) || {};
    } catch (error) {
      seqMap = {};
    }
  }
  const nextSeq = (seqMap[stamp] ?? 0) + 1;
  seqMap[stamp] = nextSeq;
  localStorage.setItem(STORAGE_ORDER_SEQ, JSON.stringify(seqMap));
  const seq = String(nextSeq).padStart(4, "0");
  return `JY-${stamp}-${seq}`;
};

const pushNotification = (message, type = "order") => {
  const now = new Date();
  const time = now.toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
  });
  notifications.push({ id: crypto.randomUUID(), message, time, type });
  saveNotifications();
  renderNotifications();
};

menuGrid.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLButtonElement)) return;
  const id = target.dataset.id;
  const action = target.dataset.action;
  if (!id || !action) return;
  updateQty(id, action);
});

orderList.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLButtonElement)) return;
  const id = target.dataset.id;
  const action = target.dataset.action;
  if (!id || !action) return;
  updateQty(id, action);
});

categoryTabs.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLButtonElement)) return;
  const category = target.dataset.category;
  if (!category) return;
  activeCategory = category;
  renderTabs();
  renderMenu();
});

clearCartBtn.addEventListener("click", () => {
  state.clear();
  renderMenu();
  renderOrder();
});

placeOrderBtn.addEventListener("click", () => {
  const totalValue = Number(totalEl.textContent.replace(/,/g, ""));
  if (totalValue === 0) {
    orderStatus.textContent = "메뉴를 선택한 뒤 주문하세요.";
    return;
  }

  const time = document.getElementById("pickupTime").value || "요청 없음";
  const note = document.getElementById("note").value.trim();

  const items = menuItems
    .filter((item) => (state.get(item.id) ?? 0) > 0)
    .map((item) => ({
      id: item.id,
      name: item.name,
      qty: state.get(item.id),
      price: item.price,
      recipe: item.recipe || "",
      status: "주문요청",
    }));

  const subtotal = items.reduce((sum, item) => sum + item.price * item.qty, 0);
  const discount = subtotal >= 20000 ? Math.round(subtotal * 0.1) : 0;
  const total = subtotal - discount;

  const newOrder = {
    id: createOrderId(),
    createdAt: new Date().toISOString(),
    status: "주문요청",
    items,
    pickupTime: time,
    note,
    subtotal,
    discount,
    total,
  };

  orders.push(newOrder);
  saveOrders();
  orderStatus.textContent = `주문 완료! 주문번호: ${newOrder.id}`;
  pushNotification(`주문 ${newOrder.id} 접수됨`, "order");
  state.clear();
  renderMenu();
  renderOrder();
  renderHistory();
  renderAdminOrders();
});

menuEditor.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLButtonElement)) return;
  if (target.dataset.action !== "save" && target.dataset.action !== "upload") {
    return;
  }

  const id = target.dataset.id;
  if (!id) return;

  if (target.dataset.action === "upload") {
    const fileInput = menuEditor.querySelector(
      `input[type="file"][data-image-upload="${id}"]`
    );
    if (!fileInput || !fileInput.files || !fileInput.files[0]) return;
    const file = fileInput.files[0];
    readAndCompressImage(file)
      .then((dataUrl) => {
        menuItems = menuItems.map((item) =>
          item.id === id ? { ...item, image: dataUrl } : item
        );
        saveMenuItems();
        renderMenu();
        renderMenuEditor();
      })
      .catch((error) => {
        alert(error.message);
      });
    return;
  }

  const inputs = menuEditor.querySelectorAll(`[data-id="${id}"]`);
  const updated = { id };
  inputs.forEach((input) => {
    const field = input.dataset.field;
    if (!field) return;
    updated[field] = field === "price" ? Number(input.value) : input.value.trim();
  });

  menuItems = menuItems.map((item) =>
    item.id === id ? { ...item, ...updated } : item
  );

  saveMenuItems();
  renderTabs();
  renderMenu();
  renderMenuEditor();
  renderRecipeEditor();
  renderOrder();
});

recipeEditor.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLButtonElement)) return;
  if (target.dataset.action !== "save-recipe") return;
  const id = target.dataset.id;
  if (!id) return;

  const textarea = recipeEditor.querySelector(
    `textarea[data-id="${id}"][data-field="recipe"]`
  );
  if (!textarea) return;

  menuItems = menuItems.map((item) =>
    item.id === id ? { ...item, recipe: textarea.value.trim() } : item
  );

  saveMenuItems();
  renderRecipeEditor();
});

recipeDefaultOpenToggle.checked = recipeDefaultOpen;
recipeDefaultOpenToggle.addEventListener("change", () => {
  recipeDefaultOpen = recipeDefaultOpenToggle.checked;
  saveRecipeDefaultOpen();
  renderHistory();
  renderAdminOrders();
});

adminLoginBtn.addEventListener("click", () => {
  const input = adminPasswordInput.value.trim();
  const current = loadAdminPassword();
  if (!input) return;
  if (input !== current) {
    adminLoginStatus.textContent = "비밀번호가 올바르지 않습니다.";
    return;
  }
  isAdmin = true;
  saveAdminSession(true);
  adminLoginStatus.textContent = "";
  adminPasswordInput.value = "";
  renderAdminView();
});

adminLoginTrigger.addEventListener("click", () => {
  document.getElementById("admin").scrollIntoView({ behavior: "smooth" });
});

adminPasswordSave.addEventListener("click", () => {
  const value = adminNewPassword.value.trim();
  if (value.length < 4) {
    alert("비밀번호는 4자 이상이어야 합니다.");
    return;
  }
  saveAdminPassword(value);
  adminNewPassword.value = "";
  alert("비밀번호가 변경되었습니다.");
});

adminLogout.addEventListener("click", () => {
  isAdmin = false;
  saveAdminSession(false);
  renderAdminView();
});

addInventoryBtn.addEventListener("click", () => {
  const category = inventoryCategory.value.trim();
  const name = inventoryName.value.trim();
  const qty = Number(inventoryQty.value);
  const price = Number(inventoryPrice.value);
  if (!category || !name || Number.isNaN(qty) || Number.isNaN(price)) return;

  inventoryItems.push({
    id: crypto.randomUUID(),
    category,
    name,
    qty,
    price,
  });

  saveInventory();
  inventoryCategory.value = "";
  inventoryName.value = "";
  inventoryQty.value = "";
  inventoryPrice.value = "";
  renderInventory();
});

inventoryList.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLButtonElement)) return;
  const action = target.dataset.invAction;
  const id = target.dataset.invId;
  const toggleCategory = target.dataset.invToggle;
  if (toggleCategory) {
    const group = target.closest(".inventory-group");
    if (!group) return;
    const body = group.querySelector(".inventory-group-body");
    if (!body) return;
    const isHidden = body.style.display === "none";
    body.style.display = isHidden ? "" : "none";
    target.textContent = isHidden ? "접기" : "펼치기";
    return;
  }
  if (!action || !id) return;

  if (action === "delete") {
    inventoryItems = inventoryItems.filter((item) => item.id !== id);
    saveInventory();
    renderInventory();
    return;
  }

  if (action === "save") {
    const qtyInput = inventoryList.querySelector(
      `input[data-inv-id="${id}"][data-inv-field="qty"]`
    );
    const priceInput = inventoryList.querySelector(
      `input[data-inv-id="${id}"][data-inv-field="price"]`
    );
    if (!qtyInput || !priceInput) return;
    const qty = Number(qtyInput.value);
    const price = Number(priceInput.value);
    if (Number.isNaN(qty) || Number.isNaN(price)) return;
    inventoryItems = inventoryItems.map((item) =>
      item.id === id ? { ...item, qty, price } : item
    );
    saveInventory();
    renderInventory();
  }
});
adminOrders.addEventListener("change", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLSelectElement)) return;

  const orderId = target.dataset.order || target.dataset.orderStatus;
  if (!orderId) return;

  const prevOrder = orders.find((order) => order.id === orderId);

  orders = orders.map((order) => {
    if (order.id !== orderId) return order;

    if (target.dataset.orderStatus) {
      return { ...order, status: target.value };
    }

    if (target.dataset.item) {
      const itemId = target.dataset.item;
      const items = order.items.map((item) =>
        item.id === itemId ? { ...item, status: target.value } : item
      );
      return { ...order, items };
    }

    return order;
  });

  saveOrders();
  renderHistory();
  renderAdminOrders();
  if (prevOrder) {
    if (target.dataset.orderStatus && prevOrder.status !== target.value) {
      pushNotification(
        `주문 ${orderId} 상태: ${prevOrder.status} → ${target.value}`,
        "order"
      );
    }
    if (target.dataset.item) {
      const itemName =
        prevOrder.items.find((item) => item.id === target.dataset.item)?.name || "";
      const prevItemStatus =
        prevOrder.items.find((item) => item.id === target.dataset.item)?.status || "";
      if (prevItemStatus && prevItemStatus !== target.value) {
        pushNotification(
          `주문 ${orderId} · ${itemName} 상태: ${prevItemStatus} → ${target.value}`,
          "item"
        );
      }
    }
  }
});

orderHistory.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLButtonElement)) return;
  if (target.dataset.recipeToggle !== "history") return;
  const content = target.nextElementSibling;
  if (!(content instanceof HTMLElement)) return;
  content.classList.toggle("show");
  target.textContent = content.classList.contains("show")
    ? "레시피 닫기"
    : "레시피 보기";
});

adminOrders.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLButtonElement)) return;
  if (target.dataset.recipeToggle !== "admin") return;
  const content = target.nextElementSibling;
  if (!(content instanceof HTMLElement)) return;
  content.classList.toggle("show");
  target.textContent = content.classList.contains("show")
    ? "레시피 닫기"
    : "레시피 보기";
});

notifyFilters.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLButtonElement)) return;
  const filter = target.dataset.notifyFilter;
  if (!filter) return;
  activeNotifyFilter = filter;
  Array.from(notifyFilters.children).forEach((button) => {
    button.classList.toggle("active", button.dataset.notifyFilter === filter);
  });
  renderNotifications();
});

exportCsvBtn.addEventListener("click", () => {
  if (orders.length === 0) return;
  const header = [
    "주문번호",
    "주문상태",
    "메뉴명",
    "수량",
    "메뉴상태",
    "단가",
    "소계",
    "할인",
    "총액",
    "픽업시간",
    "요청사항",
    "주문시간",
  ];
  const rows = orders.flatMap((order) =>
    order.items.map((item) => [
      order.id,
      order.status,
      item.name,
      item.qty,
      item.status,
      item.price,
      order.subtotal,
      order.discount,
      order.total,
      order.pickupTime,
      order.note || "",
      order.createdAt,
    ])
  );

  const csv = [header, ...rows]
    .map((row) =>
      row
        .map((value) => `"${String(value).replace(/\"/g, '""')}"`)
        .join(",")
    )
    .join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `orders_${getTodayStamp()}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
});

const scrollButtons = document.querySelectorAll("[data-scroll]");
scrollButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const target = document.querySelector(button.dataset.scroll);
    if (!target) return;
    target.scrollIntoView({ behavior: "smooth" });
  });
});

renderTabs();
renderMenu();
renderOrder();
renderHistory();
renderNotifications();
renderMenuEditor();
renderAdminOrders();
renderRecipeEditor();
renderInventory();
renderAdminView();
