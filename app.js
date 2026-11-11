const WHATSAPP_NUMBER = "5581988161268";
const OVERLAY_DURATION = 3400;
const INTRO_LOGO_HOLD = 1700;

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const $ = (selector, root = document) => root.querySelector(selector);
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

const state = { menu: [], cart: {}, screen: "inicio", sent: false, showcases: [] };

const el = {
  feed: $("#feed"),
  splash: $("#inicio"),
  minicart: $("#minicart"),
  minicartCount: $("#minicart-count"),
  minicartTotal: $("#minicart-total"),
  ticket: $(".ticket"),
  list: $("#summary-list"),
  total: $("#summary-total"),
  form: $("#form"),
  warn: $("#form-warn"),
  thanks: $("#thanks"),
  thanksTitle: $("#thanks-title"),
  thanksLink: $("#thanks-link"),
  template: $("#showcase"),
  mascotRoot: $("#mascot"),
};

const qtyOf = (id) => state.cart[id] || 0;
const cartItems = () => state.menu.filter((item) => qtyOf(item.id) > 0);
const cartCount = () => cartItems().reduce((sum, item) => sum + qtyOf(item.id), 0);
const cartTotal = () => cartItems().reduce((sum, item) => sum + qtyOf(item.id) * item.preco, 0);
const artMarkup = (item) => `<div class="art art--${item.arte}"></div>`;
const photoMarkup = (item, className, alt = "") =>
  `${artMarkup(item)}<img class="${className}" src="${item.imagem}" alt="${alt}" draggable="false">`;

function bindPhotos(root, selector) {
  root.querySelectorAll(selector).forEach((img) => {
    const show = () => img.parentElement.classList.add("has-photo");
    if (img.complete) {
      if (img.naturalWidth) show();
      else img.remove();
      return;
    }
    img.addEventListener("load", show);
    img.addEventListener("error", () => img.remove());
  });
}

function restart(node, className) {
  node.classList.remove(className);
  void node.offsetWidth;
  node.classList.add(className);
}

function spawnHearts(target, amount = 4) {
  for (let i = 0; i < amount; i++) {
    const heart = document.createElement("span");
    heart.className = "heart";
    heart.style.setProperty("--dx", `${Math.round(Math.random() * 60 - 30)}px`);
    heart.style.setProperty("--rot", `${Math.round(Math.random() * 60 - 30)}deg`);
    heart.style.animationDelay = `${i * 80}ms`;
    heart.addEventListener("animationend", () => heart.remove());
    target.appendChild(heart);
  }
}

function enableSwipe(viewport, track, getIndex, count, goTo) {
  let startX = 0;
  let startY = 0;
  let startTime = 0;
  let dx = 0;
  let axis = null;

  viewport.addEventListener("pointerdown", (e) => {
    startX = e.clientX;
    startY = e.clientY;
    startTime = performance.now();
    dx = 0;
    axis = null;
  });

  viewport.addEventListener("pointermove", (e) => {
    if (e.pointerType === "mouse" && e.buttons !== 1) return;
    const moveX = e.clientX - startX;
    const moveY = e.clientY - startY;

    if (!axis && Math.hypot(moveX, moveY) > 8) {
      axis = Math.abs(moveX) > Math.abs(moveY) ? "x" : "y";
      if (axis === "x") {
        viewport.setPointerCapture(e.pointerId);
        track.classList.add("is-dragging");
      }
    }
    if (axis !== "x") return;

    const index = getIndex();
    const atEdge = (index === 0 && moveX > 0) || (index === count - 1 && moveX < 0);
    dx = atEdge ? moveX * 0.3 : moveX;
    track.style.setProperty("--drag", `${dx}px`);
  });

  const release = () => {
    if (axis !== "x") return;
    const velocity = Math.abs(dx) / (performance.now() - startTime);
    track.classList.remove("is-dragging");
    track.style.setProperty("--drag", "0px");
    if (Math.abs(dx) > viewport.offsetWidth * 0.18 || velocity > 0.5) goTo(getIndex() + (dx < 0 ? 1 : -1));
    axis = null;
  };

  viewport.addEventListener("pointerup", release);
  viewport.addEventListener("pointercancel", release);
}

function createShowcase(section) {
  const items = state.menu.filter((item) => item.categoria === section.dataset.showcase);
  section.append(el.template.content.cloneNode(true));

  const ui = {
    track: $(".carousel__track", section),
    viewport: $(".carousel__viewport", section),
    prev: $(".carousel__arrow--prev", section),
    next: $(".carousel__arrow--next", section),
    pager: $(".pager", section),
    product: $(".product", section),
    name: $(".product__name", section),
    desc: $(".product__desc", section),
    price: $(".product__price", section),
    want: $(".want__btn", section),
    label: $(".want__label", section),
    counter: $(".want__counter", section),
    num: $(".want__num", section),
  };
  let index = 0;

  ui.track.innerHTML = items
    .map((item) => `
      <li class="slide">
        <div class="slide__media">${photoMarkup(item, "slide__photo", item.nome)}</div>
      </li>`)
    .join("");
  ui.pager.innerHTML = items.map(() => "<span></span>").join("");
  bindPhotos(ui.track, ".slide__photo");

  function refresh(animate) {
    const qty = qtyOf(items[index].id);
    const label = qty > 0 ? "quero mais um desse!" : "quero um desse!";
    if (ui.label.textContent !== label) {
      ui.label.textContent = label;
      restart(ui.label, "is-changing");
    }
    ui.num.textContent = qty;
    if (animate) restart(ui.num, "is-pop");
  }

  function goTo(target, animate = true) {
    const next = Math.max(0, Math.min(items.length - 1, target));
    const changed = next !== index;
    index = next;

    ui.track.style.setProperty("--index", next);
    ui.track.querySelectorAll(".slide").forEach((s, i) => s.classList.toggle("is-active", i === next));
    ui.pager.querySelectorAll("span").forEach((s, i) => s.classList.toggle("is-active", i === next));
    ui.prev.disabled = next === 0;
    ui.next.disabled = next === items.length - 1;

    const item = items[next];
    ui.name.textContent = item.nome;
    ui.desc.textContent = item.descricao;
    ui.price.textContent = brl.format(item.preco);
    if (animate && changed) restart(ui.product, "is-swapping");
    refresh(changed);
  }

  ui.prev.addEventListener("click", () => goTo(index - 1));
  ui.next.addEventListener("click", () => goTo(index + 1));
  ui.want.addEventListener("click", () => {
    const { id } = items[index];
    state.cart[id] = qtyOf(id) + 1;
    refresh(true);
    spawnHearts(ui.counter);
    updateCart();
  });
  enableSwipe(ui.viewport, ui.track, () => index, items.length, goTo);

  goTo(0, false);
  return { id: section.id, step: (delta) => goTo(index + delta), refresh: () => refresh(false) };
}

function updateCart() {
  el.minicartCount.textContent = cartCount();
  el.minicartTotal.textContent = brl.format(cartTotal());
  restart(el.minicart, "is-bump");
  syncMinicart();
}

function syncMinicart() {
  const hidden = ["inicio", "resumo"].includes(state.screen);
  el.minicart.classList.toggle("is-shown", cartCount() > 0 && !hidden);
}

function tween(node, to, duration = 600) {
  const from = node._value ?? 0;
  const start = performance.now();
  node._value = to;
  cancelAnimationFrame(node._raf);

  const frame = (now) => {
    const t = Math.min(1, (now - start) / duration);
    node.textContent = brl.format(from + (to - from) * (1 - Math.pow(1 - t, 3)));
    if (t < 1) node._raf = requestAnimationFrame(frame);
  };
  node._raf = requestAnimationFrame(frame);
}

function renderSummary() {
  const items = cartItems();
  el.ticket.classList.toggle("is-empty", items.length === 0);
  el.list.innerHTML = items
    .map((item, i) => `
      <li class="line" data-id="${item.id}" style="--i:${i}">
        <div class="line__art">${photoMarkup(item, "line__photo")}</div>
        <div class="line__info">
          <span class="line__name">${item.nome}</span>
          <span class="line__unit">${brl.format(item.preco)} cada</span>
        </div>
        <div class="line__step">
          <button data-step="-1" aria-label="Remover um ${item.nome}">−</button>
          <span class="line__qty">${qtyOf(item.id)}</span>
          <button data-step="1" aria-label="Adicionar um ${item.nome}">+</button>
        </div>
        <span class="line__total">${brl.format(qtyOf(item.id) * item.preco)}</span>
      </li>`)
    .join("");
  bindPhotos(el.list, ".line__photo");

  el.total._value = 0;
  tween(el.total, cartTotal(), 900);
  syncListFade();
}

function syncListFade() {
  const { scrollTop, scrollHeight, clientHeight } = el.list;
  el.list.classList.toggle("has-more", scrollHeight - scrollTop - clientHeight > 4);
}

function stepLine(line, delta) {
  const item = state.menu.find((m) => m.id === line.dataset.id);
  const qty = Math.max(0, qtyOf(item.id) + delta);
  state.cart[item.id] = qty;

  if (qty === 0) {
    line.classList.add("is-leaving");
    line.addEventListener("animationend", () => {
      line.remove();
      el.ticket.classList.toggle("is-empty", cartItems().length === 0);
      syncListFade();
    }, { once: true });
  } else {
    const qtyNode = $(".line__qty", line);
    qtyNode.textContent = qty;
    restart(qtyNode, "is-pop");
    $(".line__total", line).textContent = brl.format(qty * item.preco);
  }

  tween(el.total, cartTotal());
  updateCart();
  state.showcases.forEach((s) => s.refresh());
}

function setScreen(id) {
  if (state.screen === id) return;
  state.screen = id;
  document.body.dataset.screen = id;
  document.querySelectorAll(".dots__item").forEach((d) => d.classList.toggle("is-active", d.dataset.target === id));
  if (id === "resumo") renderSummary();
  if (id === "dados") setTimeout(() => mascot.setMood("wink", 1200), 700);
  syncMinicart();
}

function scrollToScreen(id) {
  document.getElementById(id).scrollIntoView({ behavior: "smooth" });
}

function observeScreens() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("is-visible");
      setScreen(entry.target.id);
    });
  }, { root: el.feed, threshold: 0.55 });

  document.querySelectorAll(".screen").forEach((s) => observer.observe(s));
}

async function playIntro() {
  const brand = $(".splash__brand", el.splash);
  await Promise.all([document.fonts.ready, $(".splash__logo").decode().catch(() => {})]);

  if (reducedMotion) {
    el.splash.dataset.stage = "text";
    return;
  }

  const rect = brand.getBoundingClientRect();
  const offset = innerHeight / 2 - (rect.top + rect.height / 2);
  el.splash.style.setProperty("--intro-y", `${offset}px`);
  el.feed.classList.add("is-locked");

  requestAnimationFrame(() => requestAnimationFrame(() => { el.splash.dataset.stage = "logo"; }));
  await wait(INTRO_LOGO_HOLD);
  el.splash.dataset.stage = "text";
  await wait(900);
  el.feed.classList.remove("is-locked");
}

function maskPhone(value) {
  const d = value.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : "";
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

const validators = {
  nome: (v) => v.trim().length >= 2,
  telefone: (v) => v.replace(/\D/g, "").length >= 10,
  data: (v) => v !== "",
};

function validate() {
  let firstInvalid = null;
  Object.entries(validators).forEach(([name, isValid]) => {
    const input = el.form.elements[name];
    const field = input.closest(".field");
    field.classList.remove("is-invalid");
    if (!isValid(input.value)) {
      void field.offsetWidth;
      field.classList.add("is-invalid");
      firstInvalid ??= input;
    }
  });
  return firstInvalid;
}

function buildMessage(data) {
  const lines = cartItems().map((item) => {
    const qty = qtyOf(item.id);
    return `• ${qty}x ${item.nome} (${brl.format(item.preco)}) — ${brl.format(qty * item.preco)}`;
  });

  return [
    "Olá, Dudica! 🍪 Quero fazer um pedido:",
    "",
    ...lines,
    "",
    `*Total: ${brl.format(cartTotal())}*`,
    "",
    `*Nome:* ${data.nome.trim()}`,
    `*Telefone:* ${data.telefone}`,
    `*Entrega:* ${formatDate(data.data)}`,
  ].join("\n");
}

function openThanks(origin, url, name) {
  const rect = origin.getBoundingClientRect();
  el.thanks.style.setProperty("--x", `${rect.left + rect.width / 2}px`);
  el.thanks.style.setProperty("--y", `${rect.top + rect.height / 2}px`);
  el.thanksTitle.textContent = `Obrigada, ${name.trim().split(" ")[0]}!`;
  el.thanksLink.href = url;
  el.thanks.setAttribute("aria-hidden", "false");
  el.thanks.classList.add("is-open");

  state.sent = true;
  setTimeout(() => { window.location.href = url; }, OVERLAY_DURATION);
}

function closeThanks() {
  el.thanks.classList.remove("is-open");
  el.thanks.setAttribute("aria-hidden", "true");
  state.sent = false;
  mascot.setMood("idle");
}

const MOOD_BY_FIELD = { nome: "typing", telefone: "focus", data: "think" };

const dateFormat = new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "2-digit", month: "2-digit" });

function formatDate(iso) {
  const [year, month, day] = iso.split("-").map(Number);
  const label = dateFormat.format(new Date(year, month - 1, day));
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function renderDates(dates) {
  const select = el.form.elements.data;
  const now = new Date();
  const today = [now.getFullYear(), String(now.getMonth() + 1).padStart(2, "0"), String(now.getDate()).padStart(2, "0")].join("-");
  const upcoming = dates.filter((iso) => iso >= today).sort();

  select.firstElementChild.textContent = upcoming.length ? "Escolha uma data" : "Sem datas disponíveis no momento";
  select.insertAdjacentHTML("beforeend", upcoming.map((iso) => `<option value="${iso}">${formatDate(iso)}</option>`).join(""));
}

function caretPoint(field) {
  const style = getComputedStyle(field);
  const rect = field.getBoundingClientRect();
  const ctx = caretPoint.ctx ??= document.createElement("canvas").getContext("2d");
  ctx.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;

  const padLeft = parseFloat(style.paddingLeft);
  const padTop = parseFloat(style.paddingTop);
  const inner = rect.width - padLeft - parseFloat(style.paddingRight);
  const lineHeight = parseFloat(style.lineHeight) || parseFloat(style.fontSize) * 1.3;
  const before = field.value.slice(0, field.selectionEnd ?? field.value.length);
  const width = (text) => ctx.measureText(text).width;

  if (field.tagName === "SELECT") return [rect.left + rect.width / 2, rect.top + rect.height / 2];
  if (field.tagName !== "TEXTAREA") {
    return [rect.left + padLeft + Math.min(width(before) - field.scrollLeft, inner), rect.top + rect.height * 0.62];
  }

  const lines = before.split("\n");
  const last = width(lines.at(-1));
  const row = lines.slice(0, -1).reduce((sum, line) => sum + 1 + Math.floor(width(line) / inner), 0) + Math.floor(last / inner);
  return [rect.left + padLeft + (last % inner), rect.top + padTop + row * lineHeight + lineHeight / 2 - field.scrollTop];
}

function createMascot(root) {
  const eyes = [...root.querySelectorAll(".mascot__look")];
  let base = "idle";
  let moodTimer = null;
  let lastLook = 0;

  const setMood = (mood, duration) => {
    clearTimeout(moodTimer);
    moodTimer = null;
    root.dataset.mood = mood;
    if (duration) moodTimer = setTimeout(() => { moodTimer = null; root.dataset.mood = base; }, duration);
  };

  const setBase = (mood) => {
    base = mood;
    if (!moodTimer) root.dataset.mood = mood;
  };

  const lookAt = (x, y) => {
    lastLook = Date.now();
    eyes.forEach((eye) => {
      const r = eye.parentElement.getBoundingClientRect();
      const dx = x - (r.left + r.width / 2);
      const dy = y - (r.top + r.height / 2);
      const pull = Math.min(1, Math.hypot(dx, dy) / 140);
      const angle = Math.atan2(dy, dx);
      eye.style.transform = `translate(${(Math.cos(angle) * 6 * pull).toFixed(2)}px, ${(Math.sin(angle) * 4.5 * pull).toFixed(2)}px)`;
    });
  };

  const blink = () => {
    root.classList.add("is-blinking");
    setTimeout(() => root.classList.remove("is-blinking"), 140);
  };

  const scheduleBlink = () => setTimeout(() => {
    blink();
    if (Math.random() < 0.25) setTimeout(blink, 280);
    scheduleBlink();
  }, 2200 + Math.random() * 3200);
  scheduleBlink();

  if (!reducedMotion) {
    setInterval(() => {
      if (Date.now() - lastLook < 2600 || base !== "idle") return;
      const r = root.getBoundingClientRect();
      if (Math.random() < 0.35) eyes.forEach((eye) => { eye.style.transform = ""; });
      else lookAt(r.left + r.width / 2 + (Math.random() - 0.5) * 420, r.top + r.height / 2 + (Math.random() - 0.5) * 320);
      lastLook = 0;
    }, 1700);
  }

  return {
    setMood,
    setBase,
    lookAt,
    lookAtCaret: (field) => lookAt(...caretPoint(field)),
    bob: () => restart(root, "is-bob"),
  };
}

const mascot = createMascot(el.mascotRoot);

function bindMascot() {
  let frame = 0;
  addEventListener("pointermove", (e) => {
    if (e.pointerType !== "mouse" || frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      mascot.lookAt(e.clientX, e.clientY);
    });
  });
  addEventListener("pointerdown", (e) => {
    if (e.pointerType !== "mouse") mascot.lookAt(e.clientX, e.clientY);
  });

  el.form.addEventListener("focusin", (e) => {
    const mood = MOOD_BY_FIELD[e.target.name];
    if (!mood) return;
    mascot.setBase(mood);
    mascot.lookAtCaret(e.target);
  });

  el.form.addEventListener("input", (e) => {
    if (!MOOD_BY_FIELD[e.target.name]) return;
    mascot.bob();
    mascot.lookAtCaret(e.target);
  });

  ["keyup", "click", "select"].forEach((type) => el.form.addEventListener(type, (e) => {
    if (MOOD_BY_FIELD[e.target.name]) mascot.lookAtCaret(e.target);
  }));

  el.form.addEventListener("focusout", (e) => {
    const isValid = validators[e.target.name];
    if (!isValid) return;
    if (e.target.value && isValid(e.target.value)) mascot.setMood("wink", 1100);
    else if (e.target.value) mascot.setMood("sad", 1400);
    setTimeout(() => {
      if (!el.form.contains(document.activeElement)) mascot.setBase("idle");
    }, 60);
  });
}

const CRUNCH_SRC = "static/crunch-1s.mp3";
const CRUNCH_LENGTH = 1;
const crunch = { ctx: null, buffer: null };

function loadCrunch() {
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx || crunch.ctx) return;
  crunch.ctx = new AudioCtx();
  fetch(CRUNCH_SRC)
    .then((response) => response.arrayBuffer())
    .then((data) => crunch.ctx.decodeAudioData(data))
    .then((buffer) => { crunch.buffer = buffer; })
    .catch(() => {});
}

function playCrunch() {
  const { ctx, buffer } = crunch;
  if (!ctx || !buffer) return;
  ctx.resume();

  const source = ctx.createBufferSource();
  const gain = ctx.createGain();
  const now = ctx.currentTime;
  const length = Math.min(CRUNCH_LENGTH, buffer.duration);

  gain.gain.setValueAtTime(1, now);
  gain.gain.setValueAtTime(1, now + length - 0.12);
  gain.gain.linearRampToValueAtTime(0, now + length);

  source.buffer = buffer;
  source.connect(gain).connect(ctx.destination);
  source.start(now, 0, length);
}

function spawnCrumbs(button, amount = 14) {
  const rect = button.getBoundingClientRect();
  for (let i = 0; i < amount; i++) {
    const crumb = document.createElement("span");
    crumb.className = "crumb";
    crumb.style.left = `${rect.left + rect.width * (0.15 + Math.random() * 0.7)}px`;
    crumb.style.top = `${rect.top + rect.height * 0.35}px`;
    crumb.style.setProperty("--size", `${4 + Math.random() * 7}px`);
    crumb.style.setProperty("--dx", `${Math.round(Math.random() * 120 - 60)}px`);
    crumb.style.setProperty("--dy", `${Math.round(-30 - Math.random() * 60)}px`);
    crumb.style.setProperty("--rot", `${Math.round(Math.random() * 540 - 270)}deg`);
    crumb.addEventListener("animationend", () => crumb.remove());
    document.body.appendChild(crumb);
  }
}

function bindForm() {
  loadCrunch();
  const brownie = $("#brownie-btn");
  brownie.addEventListener("click", () => {
    playCrunch();
    if (!reducedMotion) spawnCrumbs(brownie);
    restart(brownie, "is-crunched");
  });

  const phone = el.form.elements.telefone;
  phone.addEventListener("input", () => { phone.value = maskPhone(phone.value); });

  el.form.addEventListener("input", (e) => {
    if (validators[e.target.name]?.(e.target.value)) e.target.closest(".field").classList.remove("is-invalid");
  });

  el.form.addEventListener("focusin", () => el.feed.classList.add("is-typing"));
  el.form.addEventListener("focusout", () => {
    setTimeout(() => {
      if (!el.form.contains(document.activeElement)) el.feed.classList.remove("is-typing");
    }, 50);
  });

  el.form.addEventListener("submit", (e) => {
    e.preventDefault();
    el.warn.textContent = "";

    const invalid = validate();
    if (invalid) {
      mascot.setMood("sad", 1800);
      invalid.focus();
      return;
    }
    if (cartCount() === 0) {
      mascot.setMood("sad", 1800);
      el.warn.textContent = "Escolha pelo menos um docinho antes 🍪";
      setTimeout(() => scrollToScreen("cookies"), 1200);
      return;
    }

    const data = Object.fromEntries(new FormData(el.form));
    const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(buildMessage(data))}`;
    document.activeElement?.blur();
    mascot.setMood("happy");
    openThanks(e.submitter || el.form, url, data.nome);
  });

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && state.sent) setTimeout(closeThanks, 600);
  });
}

function bindEvents() {
  el.minicart.addEventListener("click", () => scrollToScreen("resumo"));

  document.querySelectorAll("[data-target], [data-goto]").forEach((btn) =>
    btn.addEventListener("click", () => scrollToScreen(btn.dataset.target || btn.dataset.goto)));

  el.list.addEventListener("scroll", syncListFade, { passive: true });
  addEventListener("resize", syncListFade);

  el.list.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-step]");
    if (btn) stepLine(btn.closest(".line"), Number(btn.dataset.step));
  });

  document.addEventListener("keydown", (e) => {
    const showcase = state.showcases.find((s) => s.id === state.screen);
    if (!showcase) return;
    if (e.key === "ArrowLeft") showcase.step(-1);
    if (e.key === "ArrowRight") showcase.step(1);
  });

  bindForm();
  bindMascot();
}

async function init() {
  document.body.dataset.screen = "inicio";
  $('.dots__item[data-target="inicio"]').classList.add("is-active");
  playIntro();

  const [menu, config] = await Promise.all([
    fetch("menu.json").then((r) => r.json()),
    fetch("config.json").then((r) => r.json()),
  ]);
  state.menu = menu;
  renderDates(config.datasEntrega);
  state.showcases = [...document.querySelectorAll("[data-showcase]")].map(createShowcase);

  bindEvents();
  observeScreens();
}

init();
