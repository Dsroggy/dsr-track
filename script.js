
// DSR Exchange – Pro Lite FINAL v2
// Login + autosave + multi-symbol + RR + margin + add funds + sounds + hotkeys

let currentSymbol = "BINANCE:BTCUSDT";
let currentTF = "15";

let tvWidget = null;
let currentPrice = 50000;

// Account state
let balance = 100000;
let realizedPnl = 0;
let positions = [];   // each position has {id, side, qty, entry, sl, tp, margin}
let closedTrades = [];
let currentUser = null;

// DOM
const symbolSelect = document.getElementById("symbolSelect");
const tfSelect = document.getElementById("tfSelect");

const rrRiskEl = document.getElementById("rrRisk");
const rrRewardEl = document.getElementById("rrReward");
const rrRatioEl = document.getElementById("rrRatio");
const rrRiskPctEl = document.getElementById("rrRiskPct");

const orderbookEl = document.getElementById("orderbook");
const tradesEl = document.getElementById("trades");
const qtyInput = document.getElementById("qty");
const levInput = document.getElementById("leverage");
const slInput = document.getElementById("sl");
const tpInput = document.getElementById("tp");
const buyBtn = document.getElementById("buyBtn");
const sellBtn = document.getElementById("sellBtn");
const fsBtn = document.getElementById("fsBtn");

const balanceEl = document.getElementById("balance");
const equityEl = document.getElementById("equity");
const realizedPnlEl = document.getElementById("realizedPnl");
const positionsBody = document.getElementById("positionsBody");
const historyBody = document.getElementById("historyBody");

const addFundsInput = document.getElementById("addFundsAmount");
const addFundsBtn = document.getElementById("addFundsBtn");

const loginOverlay = document.getElementById("loginOverlay");
const loginUserInput = document.getElementById("loginUser");
const loginBtn = document.getElementById("loginBtn");
const userLabel = document.getElementById("userLabel");
const logoutBtn = document.getElementById("logoutBtn");
const notifEl = document.getElementById("notif");
const chartContainer = document.getElementById("chartContainer");
const marketsScreen = document.getElementById("marketsScreen");
const tradeScreen = document.getElementById("tradeScreen");
const navMarkets = document.getElementById("navMarkets");
const navTrade = document.getElementById("navTrade");
const marketsBody = document.getElementById("marketsBody");


// --- TradingView Chart init ---
function initChart() {
  if (typeof TradingView === "undefined") {
    setTimeout(initChart, 500);
    return;
  }

  tvWidget = new TradingView.widget({
    autosize: true,
    symbol: currentSymbol,
    interval: currentTF,
    timezone: "Etc/UTC",
    theme: "dark",
    style: "1",
    locale: "en",
    container_id: "chart",
    hide_side_toolbar: false,
    hide_top_toolbar: false,
    toolbar_bg: "#020617",
    allow_symbol_change: true
  });
}

// --- Audio (simple beep via Web Audio) ---
function playBeep(type) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === "win") osc.frequency.value = 880;
    else if (type === "loss") osc.frequency.value = 220;
    else osc.frequency.value = 440;

    gain.gain.value = 0.05;
    osc.start();
    setTimeout(() => {
      osc.stop();
      ctx.close();
    }, 200);
  } catch (e) {
    // ignore
  }
}

// --- Notification ---
function showNotif(text, kind = "info") {
  notifEl.textContent = text;
  notifEl.classList.remove("hidden");
  notifEl.style.borderColor =
    kind === "win"
      ? "#22c55e"
      : kind === "loss"
      ? "#f97316"
      : "#38bdf8";
  setTimeout(() => {
    notifEl.classList.add("hidden");
  }, 2000);
}

// --- Local Storage keys ---
function stateKey() {
  return currentUser ? "dsr_exchange_state_" + currentUser : null;
}

function saveState() {
  const key = stateKey();
  if (!key) return;
  const state = {
    balance,
    realizedPnl,
    positions,
    closedTrades
  };
  try {
    localStorage.setItem(key, JSON.stringify(state));
  } catch (e) {
    console.warn("Cannot save state", e);
  }
}

function loadState() {
  const key = stateKey();
  if (!key) return;
  const raw = localStorage.getItem(key);
  if (!raw) return;
  try {
    const data = JSON.parse(raw);
    balance = typeof data.balance === "number" ? data.balance : balance;
    realizedPnl =
      typeof data.realizedPnl === "number" ? data.realizedPnl : realizedPnl;
    positions = Array.isArray(data.positions) ? data.positions : [];
    closedTrades = Array.isArray(data.closedTrades) ? data.closedTrades : [];
  } catch (e) {
    console.warn("Cannot load state", e);
  }
}


// --- Markets list data ---
const marketsData = [
  { symbol: "BINANCE:BTCUSDT", name: "BTCUSDT", lev: "200x", price: 91454, change: 1.14, vol: "$669.2M" },
  { symbol: "BINANCE:ETHUSDT", name: "ETHUSDT", lev: "200x", price: 3040.55, change: 2.38, vol: "$609.1M" },
  { symbol: "BINANCE:SOLUSDT", name: "SOLUSDT", lev: "100x", price: 138.48, change: 1.71, vol: "$146.7M" },
  { symbol: "BINANCE:AVAXUSDT", name: "AVAXUSDT", lev: "100x", price: 14.204, change: -3.20, vol: "$4.0M" },
  { symbol: "BINANCE:BCHUSDT", name: "BCHUSDT", lev: "100x", price: 558.29, change: 6.95, vol: "$4.56M" },
  { symbol: "BINANCE:XRPUSDT", name: "XRPUSDT", lev: "100x", price: 2.2001, change: 0.10, vol: "$44.4M" },
  { symbol: "BINANCE:BNBUSDT", name: "BNBUSDT", lev: "100x", price: 897.83, change: 2.81, vol: "$10.8M" },
  { symbol: "BINANCE:LTCUSDT", name: "LTCUSDT", lev: "100x", price: 84.26, change: 0.91, vol: "$3.61M" },
  { symbol: "BINANCE:SHIBUSDT", name: "SHIBUSDT", lev: "20x", price: 0.00000851, change: 1.07, vol: "$33.1M" },
  { symbol: "BINANCE:DOTUSDT", name: "DOTUSDT", lev: "100x", price: 2.276, change: 1.74, vol: "$582.2M" },
  { symbol: "BINANCE:ADAUSDT", name: "ADAUSDT", lev: "100x", price: 0.4249, change: 2.58, vol: "$1.32M" },
  { symbol: "BINANCE:DOGEUSDT", name: "DOGEUSDT", lev: "100x", price: 0.14994, change: 1.51, vol: "$2.35M" }
];

function renderMarkets() {
  if (!marketsBody) return;
  marketsBody.innerHTML = "";
  marketsData.forEach((m) => {
    const tr = document.createElement("tr");
    const changeClass = m.change >= 0 ? "change-pos" : "change-neg";
    tr.innerHTML = `
      <td class="sym-cell">
        <span>★</span>
        <div>
          <div>${m.name}</div>
          <div class="leverage-badge">${m.lev}</div>
        </div>
      </td>
      <td class="price-cell">$${m.price.toFixed(4)}</td>
      <td class="change-cell ${changeClass}">${m.change.toFixed(2)}%</td>
    `;
    tr.addEventListener("click", () => {
      currentSymbol = m.symbol;
      if (symbolSelect) {
        symbolSelect.value = m.symbol;
      }
      initChart();
      switchScreen("trade");
    });
    marketsBody.appendChild(tr);
  });
}

function updateMarketsPrices() {
  marketsData.forEach((m) => {
    const move = (Math.random() - 0.5) * (m.price * 0.002);
    m.price = Math.max(m.price * 0.98, Math.max(0.0000001, m.price + move));
    m.change += (Math.random() - 0.5) * 0.2;
  });
  renderMarkets();
}

// --- Price engine ---

function updateMarket() {
  const move = (Math.random() - 0.5) * 20;
  currentPrice = Math.max(1, currentPrice + move);

  updateOrderbook();
  addTick(move);
  revaluePositions();
  updateRR();
  renderAll();
  updateMarketsPrices();
}


function updateOrderbook() {
  let obHtml = "<h2>Orderbook</h2>";
  for (let i = 0; i < 15; i++) {
    const bidPrice = currentPrice - i * 2;
    const askPrice = currentPrice + i * 2;
    obHtml += `<div>Bid: ${bidPrice.toFixed(2)}</div>`;
    obHtml += `<div>Ask: ${askPrice.toFixed(2)}</div>`;
  }
  orderbookEl.innerHTML = obHtml;
}

function addTick(move) {
  const color = move >= 0 ? "#22c55e" : "#f97316";
  const row = document.createElement("div");
  row.style.color = color;
  row.textContent = currentPrice.toFixed(2);

  const heading = tradesEl.querySelector("h2");
  if (heading && heading.nextSibling) {
    tradesEl.insertBefore(row, heading.nextSibling);
  } else {
    tradesEl.appendChild(row);
  }

  const maxRows = 40;
  while (tradesEl.children.length > maxRows + 1) {
    tradesEl.removeChild(tradesEl.lastChild);
  }
}

// --- Margin & PnL helpers ---
function calcMargin(qty, price, lev) {
  return (qty * price) / Math.max(1, lev);
}

function calcUnrealized(pos) {
  const lev = Number(levInput.value) || 1;
  const diff =
    pos.side === "LONG"
      ? currentPrice - pos.entry
      : pos.entry - currentPrice;
  return diff * pos.qty * lev;
}

// --- Close position ---
function closePosition(pos, exitPrice) {
  const lev = Number(levInput.value) || 1;
  const diff =
    pos.side === "LONG"
      ? exitPrice - pos.entry
      : pos.entry - exitPrice;
  const pnl = diff * pos.qty * lev;

  // return margin + pnl
  balance += pos.margin + pnl;
  realizedPnl += pnl;

  closedTrades.unshift({
    time: new Date().toISOString(),
    side: pos.side,
    qty: pos.qty,
    entry: pos.entry,
    exit: exitPrice,
    pnl
  });

  positions = positions.filter((p) => p.id !== pos.id);

  if (pnl >= 0) {
    playBeep("win");
    showNotif("Profit: " + pnl.toFixed(2) + " ₹", "win");
  } else {
    playBeep("loss");
    showNotif("Loss: " + pnl.toFixed(2) + " ₹", "loss");
  }
}

// --- Revalue + SL/TP check ---
function revaluePositions() {
  positions.slice().forEach((pos) => {
    // SL hit
    if (pos.sl != null) {
      if (
        pos.side === "LONG" &&
        pos.sl < pos.entry &&
        currentPrice <= pos.sl
      ) {
        closePosition(pos, pos.sl);
        return;
      } else if (
        pos.side === "SHORT" &&
        pos.sl > pos.entry &&
        currentPrice >= pos.sl
      ) {
        closePosition(pos, pos.sl);
        return;
      }
    }
    // TP hit
    if (pos.tp != null) {
      if (
        pos.side === "LONG" &&
        pos.tp > pos.entry &&
        currentPrice >= pos.tp
      ) {
        closePosition(pos, pos.tp);
        return;
      } else if (
        pos.side === "SHORT" &&
        pos.tp < pos.entry &&
        currentPrice <= pos.tp
      ) {
        closePosition(pos, pos.tp);
        return;
      }
    }
  });
}

// --- RR Calculator ---
function updateRR() {
  const qty = Number(qtyInput.value) || 1;
  const lev = Number(levInput.value) || 1;
  const slVal = slInput.value ? Number(slInput.value) : null;
  const tpVal = tpInput.value ? Number(tpInput.value) : null;
  const entry = currentPrice;

  if (!slVal || !tpVal) {
    rrRiskEl.textContent = "-";
    rrRewardEl.textContent = "-";
    rrRatioEl.textContent = "-";
    rrRiskPctEl.textContent = "-";
    return;
  }

  const riskPerUnit = Math.abs(entry - slVal);
  const rewardPerUnit = Math.abs(tpVal - entry);

  const riskAbs = riskPerUnit * qty * lev;
  const rewardAbs = rewardPerUnit * qty * lev;

  rrRiskEl.textContent = riskAbs.toFixed(2) + " ₹";
  rrRewardEl.textContent = rewardAbs.toFixed(2) + " ₹";

  if (riskAbs === 0) {
    rrRatioEl.textContent = "-";
    rrRiskPctEl.textContent = "-";
    return;
  }

  const ratio = rewardAbs / riskAbs;
  rrRatioEl.textContent = ratio.toFixed(2) + " R";

  const riskPct = (riskAbs / Math.max(1, balance + totalMargin())) * 100;
  rrRiskPctEl.textContent = riskPct.toFixed(2) + " %";
}

// total locked margin
function totalMargin() {
  return positions.reduce((sum, p) => sum + (p.margin || 0), 0);
}

// --- UI render ---
function renderAll() {
  let unreal = 0;
  positions.forEach((p) => {
    unreal += calcUnrealized(p);
  });

  const marginLocked = totalMargin();
  const equity = balance + marginLocked + unreal;

  balanceEl.textContent = balance.toFixed(2) + " ₹";
  equityEl.textContent = equity.toFixed(2) + " ₹";
  realizedPnlEl.textContent = realizedPnl.toFixed(2) + " ₹";
  realizedPnlEl.className =
    realizedPnl >= 0 ? "gain" : "loss";

  // positions table
  positionsBody.innerHTML = "";
  positions.forEach((pos) => {
    const unr = calcUnrealized(pos);
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${pos.id}</td>
      <td>${pos.side}</td>
      <td>${pos.qty}</td>
      <td>${pos.entry.toFixed(2)}</td>
      <td>${pos.sl != null ? pos.sl.toFixed(2) : "-"}</td>
      <td>${pos.tp != null ? pos.tp.toFixed(2) : "-"}</td>
      <td class="${unr >= 0 ? "gain" : "loss"}">${unr.toFixed(2)}</td>
      <td><button data-id="${pos.id}" class="close-btn">X</button></td>
    `;
    positionsBody.appendChild(tr);
  });

  // closed trades table
  historyBody.innerHTML = "";
  closedTrades.forEach((t) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${new Date(t.time).toLocaleTimeString()}</td>
      <td>${t.side}</td>
      <td>${t.qty}</td>
      <td>${t.entry.toFixed(2)}</td>
      <td>${t.exit.toFixed(2)}</td>
      <td class="${t.pnl >= 0 ? "gain" : "loss"}">${t.pnl.toFixed(2)}</td>
    `;
    historyBody.appendChild(tr);
  });

  saveState();
}

// --- Place order ---
function placeTrade(side) {
  if (!currentUser) {
    showNotif("Pehle login karo!", "loss");
    return;
  }
  const qty = Number(qtyInput.value) || 1;
  const lev = Number(levInput.value) || 1;
  const entry = currentPrice;

  const sl = slInput.value ? Number(slInput.value) : null;
  const tp = tpInput.value ? Number(tpInput.value) : null;

  const margin = calcMargin(qty, entry, lev);

  if (balance < margin) {
    showNotif("Balance kam hai, trade nahi lag sakta.", "loss");
    playBeep("loss");
    return;
  }

  balance -= margin;

  const pos = {
    id: Date.now(),
    side,
    qty,
    entry,
    sl,
    tp,
    margin
  };

  positions.push(pos);
  renderAll();
  updateRR();
  showNotif(
    `Opened ${side} x${qty} @ ${entry.toFixed(2)} (lev ${lev}x) margin ${margin.toFixed(2)} ₹`,
    "info"
  );
}

// --- Symbol / TF events ---
if (symbolSelect) {
  symbolSelect.addEventListener("change", () => {
    currentSymbol = symbolSelect.value;
    initChart();
  });
}
if (tfSelect) {
  tfSelect.addEventListener("change", () => {
    currentTF = tfSelect.value;
    initChart();
  });
}

// --- Add Funds ---
if (addFundsBtn) {
  addFundsBtn.addEventListener("click", () => {
    const val = Number(addFundsInput.value);
    if (!val || val <= 0) return;
    balance += val;
    addFundsInput.value = "";
    renderAll();
    showNotif("Funds added: " + val.toFixed(2) + " ₹", "win");
    playBeep("win");
  });
}

// --- Events ---
buyBtn.addEventListener("click", () => placeTrade("LONG"));
sellBtn.addEventListener("click", () => placeTrade("SHORT"));

// close button handler
positionsBody.addEventListener("click", (e) => {
  if (e.target.classList.contains("close-btn")) {
    const id = Number(e.target.getAttribute("data-id"));
    const pos = positions.find((p) => p.id === id);
    if (pos) {
      closePosition(pos, currentPrice);
      renderAll();
      updateRR();
    }
  }
});

// fullscreen
fsBtn.addEventListener("click", () => {
  if (!document.fullscreenElement) {
    chartContainer.requestFullscreen?.();
  } else {
    document.exitFullscreen?.();
  }
});

// hotkeys: B=buy, S=sell, F=fullscreen
window.addEventListener("keydown", (e) => {
  const tag = (e.target && e.target.tagName) || "";
  if (tag === "INPUT" || tag === "TEXTAREA") return;

  if (e.key === "b" || e.key === "B") {
    placeTrade("LONG");
  } else if (e.key === "s" || e.key === "S") {
    placeTrade("SHORT");
  } else if (e.key === "f" || e.key === "F") {
    fsBtn.click();
  }
});


function switchScreen(target) {
  if (marketsScreen && tradeScreen) {
    marketsScreen.classList.remove("active");
    tradeScreen.classList.remove("active");
    if (target === "markets") {
      marketsScreen.classList.add("active");
    } else {
      tradeScreen.classList.add("active");
    }
  }
  if (navMarkets && navTrade) {
    navMarkets.classList.toggle("active", target === "markets");
    navTrade.classList.toggle("active", target === "trade");
  }
}

if (navMarkets) {
  navMarkets.addEventListener("click", () => switchScreen("markets"));
}
if (navTrade) {
  navTrade.addEventListener("click", () => switchScreen("trade"));
}

// default screen
switchScreen("markets");

// login
loginBtn.addEventListener("click", () => {
  const name = loginUserInput.value.trim();
  if (!name) return;
  currentUser = name;
  userLabel.textContent = "User: " + currentUser;
  loginOverlay.classList.add("hidden");

  try {
    localStorage.setItem("dsr_exchange_last_user", currentUser);
  } catch (e) {}

  balance = 100000;
  realizedPnl = 0;
  positions = [];
  closedTrades = [];
  loadState();
  renderAll();
  updateRR();
  showNotif("Welcome " + currentUser, "info");
});


// logout
if (logoutBtn) {
  logoutBtn.addEventListener("click", () => {
    if (!currentUser) {
      showNotif("Already logged out", "info");
      return;
    }
    try {
      localStorage.removeItem("dsr_exchange_last_user");
    } catch (e) {}
    currentUser = null;
    userLabel.textContent = "Not logged in";
    loginOverlay.classList.remove("hidden");
    showNotif("Logged out", "info");
  });
}


// --- Auto-login if user exists ---
(function autoLogin() {
  try {
    const last = localStorage.getItem("dsr_exchange_last_user");
    if (last) {
      currentUser = last;
      userLabel.textContent = "User: " + currentUser;
      loginOverlay.classList.add("hidden");
      loadState();
      renderAll();
      updateRR();
      showNotif("Welcome back " + currentUser, "info");
    }
  } catch (e) {
    // ignore
  }
})();

// inputs update RR
[qtyInput, levInput, slInput, tpInput].forEach((el) => {
  el.addEventListener("input", updateRR);
});

// start engine
initChart();
setInterval(updateMarket, 500);
updateOrderbook();
updateRR();
renderAll();
