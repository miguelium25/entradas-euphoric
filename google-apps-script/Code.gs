const SPREADSHEET_ID = "1ZYwtaOf7i7F-EbdQgmgBL7pAnu8J9ZykxMn3lVwiUh0";
const SHEET_NAME = "quieren-entrada";

const TICKET_PRICE_EUR = 10;
const MAX_TICKETS_PER_ORDER = 4;

const COL_CREATED_AT = 1;
const COL_ORDER_ID = 2;
const COL_FULL_NAME = 3;
const COL_PHONE = 4;
const COL_EMAIL = 5;
const COL_QUANTITY = 6;
const COL_TOTAL = 7;
const COL_PAYMENT_STATUS = 8;
const COL_QR_STATUS = 9;
const COL_BIZUM_CONCEPT = 10;
const COL_NOTES = 11;
const COL_ATTENDEE_NAMES = 12;

const PAYMENT_PENDING = "PENDING_PAYMENT";
const QR_PENDING = "QR_PENDING";

function doGet(e) {
  const action = (e && e.parameter && e.parameter.action) || "health";
  if (action === "health") {
    return jsonOutput({ ok: true, service: "solicitudes", status: "ready" });
  }
  return jsonOutput({ ok: false, error: "Unknown action" });
}

function doPost(e) {
  const action = (e && e.parameter && e.parameter.action) || "";
  if (action !== "create_lead") {
    return jsonOutput({ ok: false, error: "Invalid action" });
  }

  const fullName = String(e.parameter.fullName || "").trim();
  const phone = String(e.parameter.phone || "").trim();
  const email = String(e.parameter.email || "").trim();
  const quantity = Number(e.parameter.quantity || 0);
  const attendeeNames = parseAttendeeNames_(e.parameter.attendeeNamesJson);

  if (!fullName || !phone) {
    return jsonOutput({ ok: false, error: "Name and phone are required" });
  }

  if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_TICKETS_PER_ORDER) {
    return jsonOutput({ ok: false, error: "Invalid quantity" });
  }

  if (attendeeNames.length !== Math.max(quantity - 1, 0)) {
    return jsonOutput({ ok: false, error: "Missing attendee names for extra tickets" });
  }

  return jsonOutput(createLead_(fullName, phone, email, quantity, attendeeNames));
}

function setupRequestsSheet() {
  const sheet = getSheet_();
  const headers = [[
    "Created At",
    "Order ID",
    "Full Name",
    "Phone",
    "Email",
    "Quantity",
    "Total EUR",
    "Payment Status",
    "QR Status",
    "Bizum Concept",
    "Notes",
    "Attendee Full Names"
  ]];

  sheet.getRange(1, 1, 1, headers[0].length).setValues(headers);
  if (sheet.getLastRow() < 2) {
    sheet.autoResizeColumns(1, headers[0].length);
  }
}

function createLead_(fullName, phone, email, quantity, attendeeNames) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);

  try {
    const sheet = getSheet_();
    const orderId = nextOrderId_(sheet);
    const total = quantity * TICKET_PRICE_EUR;
    const allAttendees = [fullName].concat(attendeeNames).join(" | ");

    sheet.appendRow([
      new Date(),
      orderId,
      fullName,
      phone,
      email,
      quantity,
      total,
      PAYMENT_PENDING,
      QR_PENDING,
      orderId,
      "",
      allAttendees
    ]);

    return {
      ok: true,
      orderId: orderId,
      totalAmount: total,
      paymentStatus: PAYMENT_PENDING,
      qrStatus: QR_PENDING
    };
  } finally {
    lock.releaseLock();
  }
}

function getSheet_() {
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = spreadsheet.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = spreadsheet.insertSheet(SHEET_NAME);
  }
  return sheet;
}

function nextOrderId_(sheet) {
  const lastRow = sheet.getLastRow();
  let max = 0;

  if (lastRow >= 2) {
    const ids = sheet.getRange(2, COL_ORDER_ID, lastRow - 1, 1).getValues();
    ids.forEach(function (row) {
      const value = String(row[0] || "");
      const match = value.match(/ORD-(\d{4})$/);
      if (match) {
        max = Math.max(max, Number(match[1]));
      }
    });
  }

  const next = String(max + 1).padStart(4, "0");
  return `EVT2026-ORD-${next}`;
}

function jsonOutput(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}

function parseAttendeeNames_(rawJson) {
  if (!rawJson) {
    return [];
  }

  try {
    const parsed = JSON.parse(rawJson);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map(function (value) {
        return String(value || "").trim();
      })
      .filter(function (value) {
        return value.length > 0;
      });
  } catch (error) {
    return [];
  }
}
