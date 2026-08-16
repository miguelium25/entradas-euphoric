const APPS_SCRIPT_WEB_APP_URL = "PASTE_YOUR_WEB_APP_URL_HERE";
const SCAN_COOLDOWN_MS = 1800;

const totalCount = document.getElementById("totalCount");
const checkedCount = document.getElementById("checkedCount");
const pendingCount = document.getElementById("pendingCount");
const statusCard = document.getElementById("statusCard");
const startScanBtn = document.getElementById("startScanBtn");
const manualForm = document.getElementById("manualForm");
const manualCode = document.getElementById("manualCode");

let scanner;
let lastScanned = "";
let lastScanAt = 0;
let scannerStarted = false;

function normalizeCode(raw) {
  return String(raw || "").trim().toUpperCase();
}

function setStatus(type, title, detail) {
  statusCard.className = `status-card ${type}`;
  statusCard.innerHTML = `<p class="status-title">${title}</p><p class="status-detail">${detail}</p>`;
}

async function fetchStats() {
  if (!APPS_SCRIPT_WEB_APP_URL.startsWith("https://")) {
    setStatus("warning", "Missing setup", "Set APPS_SCRIPT_WEB_APP_URL in frontend/app.js first.");
    return;
  }

  try {
    const url = `${APPS_SCRIPT_WEB_APP_URL}?action=stats`;
    const response = await fetch(url);
    const data = await response.json();
    if (!data.ok) {
      throw new Error(data.error || "Could not load stats");
    }

    totalCount.textContent = String(data.total);
    checkedCount.textContent = String(data.checkedIn);
    pendingCount.textContent = String(data.pending);
  } catch (error) {
    setStatus("error", "Stats error", error.message);
  }
}

async function postCheckIn(code, source) {
  if (!APPS_SCRIPT_WEB_APP_URL.startsWith("https://")) {
    setStatus("warning", "Missing setup", "Set APPS_SCRIPT_WEB_APP_URL in frontend/app.js first.");
    return;
  }

  const payload = new URLSearchParams({
    action: "checkin",
    code,
    source
  });

  try {
    const response = await fetch(APPS_SCRIPT_WEB_APP_URL, {
      method: "POST",
      body: payload
    });
    const data = await response.json();

    if (!data.ok) {
      setStatus("error", "Invalid", data.error || "Code not accepted");
      return;
    }

    if (data.status === "checked_in") {
      setStatus(
        "success",
        `Approved: ${data.code}`,
        `${data.guestName || "Guest"} entered at ${data.time}`
      );
    } else if (data.status === "already_checked") {
      setStatus(
        "warning",
        `Duplicate: ${data.code}`,
        `${data.guestName || "Guest"} already entered at ${data.time}`
      );
    } else {
      setStatus("error", "Rejected", `Code ${data.code} is not registered`);
    }

    await fetchStats();
  } catch (error) {
    setStatus("error", "Connection error", error.message);
  }
}

function isScanOnCooldown(code) {
  const now = Date.now();
  if (code === lastScanned && now - lastScanAt < SCAN_COOLDOWN_MS) {
    return true;
  }
  lastScanned = code;
  lastScanAt = now;
  return false;
}

function onScanSuccess(decodedText) {
  const code = normalizeCode(decodedText);
  if (!code || isScanOnCooldown(code)) {
    return;
  }
  postCheckIn(code, "camera");
}

async function startScanner() {
  if (scannerStarted) {
    return;
  }

  try {
    scanner = new Html5Qrcode("reader");
    await scanner.start(
      { facingMode: "environment" },
      { fps: 10, qrbox: { width: 230, height: 230 } },
      onScanSuccess,
      () => {}
    );

    scannerStarted = true;
    startScanBtn.textContent = "Camera ready";
    startScanBtn.disabled = true;
    setStatus("success", "Scanner active", "Point your camera at each QR code.");
  } catch (error) {
    setStatus("error", "Camera unavailable", error.message);
  }
}

startScanBtn.addEventListener("click", startScanner);

manualForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const code = normalizeCode(manualCode.value);
  if (!code) {
    return;
  }

  await postCheckIn(code, "manual");
  manualCode.value = "";
  manualCode.focus();
});

fetchStats();
