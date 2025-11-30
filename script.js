// DSR Trade TV Pro v2
// TradingView chart + paper trading engine (fake price), positions, history, stats, RR, risk%

// === TradingView chart setup ===
let tvWidget = null;
let currentSymbol = "BINANCE:BTCUSDT";
let currentInterval = "15";

function createWidget() {
  if (typeof TradingView === "undefined") {
    setTimeout(createWidget, 500);
    return;
  }
  const containerId = "tv_chart";
  document.getElementById(containerId).innerHTML = "";
  tvWidget = new TradingView.widget({
    autosize: true,
    symbol: currentSymbol,
    interval: currentInterval,
    timezone: "Etc/UTC",
    theme: "dark",
    style: "1",
    locale: "en",
    toolbar_bg: "#020617",
    hide_side_toolbar: false,
    allow_symbol_change: true,
    container_id: containerId
  });
}

// === Paper trading state ===
let balance = 100000;
let equity = 100000;
let realizedPnl = 0;
let todayPnl = 0;
let positions = [];
let closedTrades = [];
let currentPrice = 100000; // will be adjusted per symbol
let priceTimer = null;

const balanceEl = document.getElementById("balance");
const equityEl = document.getElementById("equity");
const realizedPnlEl = document.getElementById("realizedPnl");
const todayPnlEl = document.getElementById("todayPnl");
const currentPriceEl = document.getElementById("currentPrice");
const openCountEl = document.getElementById("openCount");

const positionsBody = document.getElementById("positionsBody");
const ordersBody = document.getElementById("ordersBody");
const portfolioBody = document.getElementById("portfolioBody");

const statTotalTradesEl = document.getElementById("statTotalTrades");
const statWinRateEl = document.getElementById("statWinRate");
const statBestTradeEl = document.getElementById("statBestTrade");
const statWorstTradeEl = document.getElementById("statWorstTrade");

// controls
const addFundsBtn = document.getElementById("addFundsBtn");
const withdrawFundsBtn = document.getElementById("withdrawFundsBtn");
const symbolSelect = document.getElementById("symbolSelect");
const intervalSelect = document.getElementById("intervalSelect");

// order ticket
const sideSelect = document.getElementById("sideSelect");
const qtyInput = document.getElementById("qtyInput");
const orderTypeSelect = document.getElementById("orderTypeSelect");
const entryPriceInput = document.getElementById("entryPriceInput");
const slInput = document.getElementById("slInput");
const tpInput = document.getElementById("tpInput");
const riskPercentInput = document.getElementById("riskPercentInput");
const trailingCheckbox = document.getElementById("trailingCheckbox");
const buyBtn = document.getElementById("buyBtn");
const sellBtn = document.getElementById("sellBtn");

// RR
const longEntry = document.getElementById("longEntry");
const longSl = document.getElementById("longSl");
const longTarget = document.getElementById("longTarget");
const longRREl = document.getElementById("longRR");
const shortEntry = document.getElementById("shortEntry");
const shortSl = document.getElementById("shortSl");
const shortTarget = document.getElementById("shortTarget");
const shortRREl = document.getElementById("shortRR");

// tabs
const tabButtons = document.querySelectorAll(".tab");
const tabContents = document.querySelectorAll(".tab-content");

// === Price simulation (for PnL only) ===
function resetPriceForSymbol(sym) {
  if (sym.includes("BTC")) currentPrice = 50000;
  else if (sym.includes("ETH")) currentPrice = 3000;
  else if (sym.includes("NIFTY")) currentPrice = 22000;
  else if (sym.includes("BANKNIFTY")) currentPrice = 48000;
  else currentPrice = 10000;
}

function priceStep() {
  let vol;
  if (currentSymbol.includes("BTC")) vol = 40;
  else if (currentSymbol.includes("ETH")) vol = 5;
  else if (currentSymbol.includes("NIFTY")) vol = 8;
  else if (currentSymbol.includes("BANKNIFTY")) vol = 20;
  else vol = 10;

  const change = (Math.random() - 0.5) * vol;
  currentPrice = Math.max(1, currentPrice + change);
  updateAfterTick();
}

function updateAfterTick() {
  currentPriceEl.textContent = currentPrice.toFixed(2);
  revaluePositions();
  updateUI();
}

// === Trading logic ===
function calcUnrealizedPnl(pos) {
  if (pos.side === "LONG") {
    return (currentPrice - pos.entry) * pos.qty;
  } else {
    return (pos.entry - currentPrice) * pos.qty;
  }
}

function placeOrder(sideFromBtn) {
  const side = sideFromBtn || sideSelect.value;
  const qty = parseInt(qtyInput.value, 10);
  if (!qty || qty <= 0) {
    alert("Enter valid quantity");
    return;
  }

  const orderType = orderTypeSelect.value;
  let entryPrice = currentPrice;

  if (orderType === "LIMIT") {
    const val = parseFloat(entryPriceInput.value);
    if (!val || val <= 0) {
      alert("Enter entry price for LIMIT order");
      return;
    }
    entryPrice = val;
  }

  let sl = parseFloat(slInput.value);
  if (Number.isNaN(sl)) sl = null;
  let tp = parseFloat(tpInput.value);
  if (Number.isNaN(tp)) tp = null;

  const riskPercent = parseFloat(riskPercentInput.value);
  if (!Number.isNaN(riskPercent) && riskPercent > 0 && sl !== null) {
    const maxRiskMoney = (balance * riskPercent) / 100;
    const dist = Math.abs(entryPrice - sl);
    if (dist > 0) {
      const autoQty = Math.floor(maxRiskMoney / dist);
      if (autoQty >= 1) {
        qtyInput.value = autoQty;
      }
    }
  }

  const finalQty = parseInt(qtyInput.value, 10);
  if (!finalQty || finalQty <= 0) {
    alert("Qty after risk calc invalid");
    return;
  }

  const trailing = trailingCheckbox.checked && sl !== null;

  const pos = {
    id: Date.now(),
    side,
    qty: finalQty,
    entry: entryPrice,
    sl,
    tp,
    trailing,
    highest: entryPrice,
    lowest: entryPrice,
    initialSLDistance: sl !== null ? Math.abs(entryPrice - sl) : null,
    openTime: new Date()
  };

  positions.push(pos);
  updateUI();
}

function closePosition(pos, reason, priceOverride) {
  const exit = priceOverride != null ? priceOverride : currentPrice;
  const pnl =
    pos.side === "LONG"
      ? (exit - pos.entry) * pos.qty
      : (pos.entry - exit) * pos.qty;

  balance += pnl;
  realizedPnl += pnl;
  todayPnl += pnl;

  const trade = {
    time: new Date(),
    side: pos.side,
    qty: pos.qty,
    entry: pos.entry,
    exit,
    pnl
  };
  closedTrades.unshift(trade);

  positions = positions.filter(p => p.id !== pos.id);
}

function revaluePositions() {
  positions.forEach(pos => {
    if (pos.trailing && pos.initialSLDistance != null && pos.sl != null) {
      if (pos.side === "LONG") {
        if (currentPrice > pos.highest) pos.highest = currentPrice;
        const idealSL = pos.highest - pos.initialSLDistance;
        if (idealSL > pos.sl) pos.sl = idealSL;
      } else {
        if (currentPrice < pos.lowest) pos.lowest = currentPrice;
        const idealSL = pos.lowest + pos.initialSLDistance;
        if (idealSL < pos.sl) pos.sl = idealSL;
      }
    }

    if (pos.sl != null) {
      // Only trigger SL if it is on the correct side of entry
      if (
        pos.side === "LONG" &&
        pos.sl < pos.entry &&
        currentPrice <= pos.sl
      ) {
        closePosition(pos, "SL", pos.sl);
      } else if (
        pos.side === "SHORT" &&
        pos.sl > pos.entry &&
        currentPrice >= pos.sl
      ) {
        closePosition(pos, "SL", pos.sl);
      }
    }
    if (pos.tp != null) {
      // Only trigger TP if it is on the correct side of entry
      if (
        pos.side === "LONG" &&
        pos.tp > pos.entry &&
        currentPrice >= pos.tp
      ) {
        closePosition(pos, "TP", pos.tp);
      } else if (
        pos.side === "SHORT" &&
        pos.tp < pos.entry &&
        currentPrice <= pos.tp
      ) {
        closePosition(pos, "TP", pos.tp);
      }
    }
  });
}

// === UI rendering ===
function updateUI() {
  let unrealized = 0;
  positions.forEach(p => {
    unrealized += calcUnrealizedPnl(p);
  });
  equity = balance + unrealized;

  balanceEl.textContent = balance.toFixed(2) + " ₹";
  equityEl.textContent = equity.toFixed(2) + " ₹";
  realizedPnlEl.textContent = realizedPnl.toFixed(2) + " ₹";
  realizedPnlEl.style.color = realizedPnl >= 0 ? "#22c55e" : "#f97316";
  todayPnlEl.textContent = todayPnl.toFixed(2) + " ₹";
  todayPnlEl.style.color = todayPnl >= 0 ? "#22c55e" : "#f97316";

  openCountEl.textContent = positions.length;
  renderPositions();
  renderOrders();
  renderPortfolio();
  updateStats();
}

function renderPositions() {
  positionsBody.innerHTML = "";
  positions.forEach(pos => {
    const pnl = calcUnrealizedPnl(pos);
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${pos.id}</td>
      <td>${pos.side}</td>
      <td>${pos.qty}</td>
      <td>${pos.entry.toFixed(2)}</td>
      <td>${pos.sl != null ? pos.sl.toFixed(2) : "-"}</td>
      <td>${pos.tp != null ? pos.tp.toFixed(2) : "-"}</td>
      <td style="color:${pnl >= 0 ? "#22c55e" : "#f97316"}">${pnl.toFixed(2)}</td>
      <td><button class="close-pos-btn" data-id="${pos.id}">Close</button></td>
    `;
    positionsBody.appendChild(tr);
  });
}

function renderOrders() {
  ordersBody.innerHTML = "";
  closedTrades.forEach(trade => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${trade.time.toLocaleTimeString()}</td>
      <td>${trade.side}</td>
      <td>${trade.qty}</td>
      <td>${trade.entry.toFixed(2)}</td>
      <td>${trade.exit.toFixed(2)}</td>
      <td style="color:${trade.pnl >= 0 ? "#22c55e" : "#f97316"}">${trade.pnl.toFixed(2)}</td>
    `;
    ordersBody.appendChild(tr);
  });
}

function renderPortfolio() {
  portfolioBody.innerHTML = "";
  if (!positions.length) return;
  let netQty = 0;
  let weighted = 0;
  positions.forEach(p => {
    const dir = p.side === "LONG" ? 1 : -1;
    netQty += p.qty * dir;
    weighted += p.entry * p.qty * dir;
  });
  if (netQty === 0) return;
  const avgPrice = weighted / netQty;
  const unrealized = (currentPrice - avgPrice) * netQty;
  const tr = document.createElement("tr");
  tr.innerHTML = `
    <td>${netQty}</td>
    <td>${avgPrice.toFixed(2)}</td>
    <td style="color:${unrealized >= 0 ? "#22c55e" : "#f97316"}">${unrealized.toFixed(2)}</td>
  `;
  portfolioBody.appendChild(tr);
}

function updateStats() {
  const total = closedTrades.length;
  statTotalTradesEl.textContent = total;
  if (!total) {
    statWinRateEl.textContent = "0%";
    statBestTradeEl.textContent = "0.00 ₹";
    statWorstTradeEl.textContent = "0.00 ₹";
    return;
  }
  let wins = 0;
  let best = -Infinity;
  let worst = Infinity;
  closedTrades.forEach(t => {
    if (t.pnl >= 0) wins++;
    if (t.pnl > best) best = t.pnl;
    if (t.pnl < worst) worst = t.pnl;
  });
  statWinRateEl.textContent = ((wins / total) * 100).toFixed(1) + "%";
  statBestTradeEl.textContent = best.toFixed(2) + " ₹";
  statWorstTradeEl.textContent = worst.toFixed(2) + " ₹";
}

// === Funds ===
function addFunds() {
  const amt = parseFloat(prompt("Add funds (₹):"));
  if (!amt || amt <= 0) return;
  balance += amt;
  updateUI();
}

function withdrawFunds() {
  const amt = parseFloat(prompt("Withdraw amount (₹):"));
  if (!amt || amt <= 0) return;
  if (amt > balance) {
    alert("Not enough balance");
    return;
  }
  balance -= amt;
  updateUI();
}

// === RR calculator ===
function updateRR() {
  const le = parseFloat(longEntry.value);
  const ls = parseFloat(longSl.value);
  const lt = parseFloat(longTarget.value);
  if (le && ls && lt) {
    const risk = Math.abs(le - ls);
    const reward = Math.abs(lt - le);
    if (risk > 0) longRREl.textContent = (reward / risk).toFixed(2) + " R";
  } else {
    longRREl.textContent = "-";
  }

  const se = parseFloat(shortEntry.value);
  const ss = parseFloat(shortSl.value);
  const st = parseFloat(shortTarget.value);
  if (se && ss && st) {
    const riskS = Math.abs(se - ss);
    const rewardS = Math.abs(se - st);
    if (riskS > 0) shortRREl.textContent = (rewardS / riskS).toFixed(2) + " R";
  } else {
    shortRREl.textContent = "-";
  }
}

// === Tabs ===
function switchTab(name) {
  tabButtons.forEach(btn => {
    btn.classList.toggle("active", btn.dataset.tab === name);
  });
  tabContents.forEach(c => {
    c.classList.toggle("active", c.id === "tab-" + name);
  });
}

// === Events ===
window.addEventListener("load", () => {
  // TV widget
  symbolSelect.addEventListener("change", () => {
    currentSymbol = symbolSelect.value;
    resetPriceForSymbol(currentSymbol);
    createWidget();
  });
  intervalSelect.addEventListener("change", () => {
    currentInterval = intervalSelect.value;
    createWidget();
  });
  createWidget();
  resetPriceForSymbol(currentSymbol);

  // Funds
  addFundsBtn.addEventListener("click", addFunds);
  withdrawFundsBtn.addEventListener("click", withdrawFunds);

  // RR
  [longEntry, longSl, longTarget, shortEntry, shortSl, shortTarget].forEach(inp => {
    inp.addEventListener("input", updateRR);
  });

  // Ticket
  buyBtn.addEventListener("click", () => placeOrder("LONG"));
  sellBtn.addEventListener("click", () => placeOrder("SHORT"));

  // Positions table close buttons
  positionsBody.addEventListener("click", e => {
    if (e.target.matches(".close-pos-btn")) {
      const id = Number(e.target.dataset.id);
      const pos = positions.find(p => p.id === id);
      if (pos) {
        closePosition(pos, "MANUAL", null);
        updateUI();
      }
    }
  });

  // Tabs
  tabButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      switchTab(btn.dataset.tab);
    });
  });

  // Start price sim
  priceTimer = setInterval(priceStep, 1000);
  updateAfterTick();
});
