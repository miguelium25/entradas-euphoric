const APPS_SCRIPT_WEB_APP_URL = "https://script.google.com/macros/s/AKfycbzQB5PRFrZN9UeLBIJUoVhreUAYVlKAXjvAn3_pNXWnkXbGpiGfdRF0lWqUifXIeRKtoA/exec";
const TICKET_PRICE_EUR = 10;
const BIZUM_TARGET = "658441357";

const form = document.getElementById("orderForm");
const submitBtn = document.getElementById("submitBtn");
const statusCard = document.getElementById("statusCard");
const statusMessage = document.getElementById("statusMessage");
const quantitySelect = document.getElementById("quantity");
const extraAttendeesEl = document.getElementById("extraAttendees");
const statusModal = document.getElementById("statusModal");
const modalMessage = document.getElementById("modalMessage");
const closeModalBtn = document.getElementById("closeModalBtn");

function setStatus(type, text, asHtml) {
  statusCard.className = `card status ${type}`;
  if (asHtml) {
    statusMessage.innerHTML = text;
    return;
  }
  statusMessage.textContent = text;
}

function hasBackendConfigured() {
  return APPS_SCRIPT_WEB_APP_URL.startsWith("https://");
}

function openStatusModal(messageHtml) {
  modalMessage.innerHTML = messageHtml;
  statusModal.classList.add("open");
  statusModal.setAttribute("aria-hidden", "false");
}

function closeStatusModal() {
  statusModal.classList.remove("open");
  statusModal.setAttribute("aria-hidden", "true");
}

async function createLead(payload) {
  const body = new URLSearchParams({
    action: "create_lead",
    fullName: payload.fullName,
    phone: payload.phone,
    email: payload.email,
    quantity: String(payload.quantity),
    attendeeNamesJson: JSON.stringify(payload.attendeeNames)
  });

  const response = await fetch(APPS_SCRIPT_WEB_APP_URL, {
    method: "POST",
    body
  });

  return response.json();
}

function renderExtraAttendeeFields() {
  const quantity = Number(quantitySelect.value || 1);
  const extraCount = Math.max(quantity - 1, 0);

  if (extraCount === 0) {
    extraAttendeesEl.innerHTML = "";
    return;
  }

  const fields = [];
  fields.push(`<p>Nombre completo de ${extraCount} asistente(s) adicional(es)</p>`);

  for (let i = 1; i <= extraCount; i += 1) {
    fields.push(`<label for="extraName${i}">Entrada adicional ${i}</label>`);
    fields.push(`<input id="extraName${i}" name="extraName${i}" type="text" required>`);
  }

  extraAttendeesEl.innerHTML = fields.join("");
}

function collectExtraAttendeeNames(quantity) {
  const names = [];
  const extraCount = Math.max(quantity - 1, 0);

  for (let i = 1; i <= extraCount; i += 1) {
    const input = document.getElementById(`extraName${i}`);
    const value = String((input && input.value) || "").trim();
    if (!value) {
      throw new Error(`Falta el nombre completo de la entrada adicional ${i}.`);
    }
    names.push(value);
  }

  return names;
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!hasBackendConfigured()) {
    setStatus("warn", "Falta configurar APPS_SCRIPT_WEB_APP_URL en app.js para guardar en Google Sheet.");
    return;
  }

  submitBtn.disabled = true;
  setStatus("", "Guardando solicitud...");

  const formData = new FormData(form);
  const payload = {
    fullName: String(formData.get("fullName") || "").trim(),
    phone: String(formData.get("phone") || "").trim(),
    email: "",
    quantity: Number(formData.get("quantity") || 1),
    attendeeNames: []
  };

  try {
    payload.attendeeNames = collectExtraAttendeeNames(payload.quantity);

    const data = await createLead(payload);
    if (!data.ok) {
      throw new Error(data.error || "No se pudo registrar la solicitud");
    }

    const order = {
      orderId: data.orderId,
      fullName: payload.fullName,
      phone: payload.phone,
      quantity: payload.quantity,
      attendeeNames: payload.attendeeNames,
      totalAmount: data.totalAmount
    };

    const successHtml = `<span class="status-badge">SOLICITUD GUARDADA</span><br><strong>Bizum:</strong> ${order.totalAmount} EUR a <strong>${BIZUM_TARGET}</strong><br><strong>Referencia obligatoria:</strong> nombre y apellidos del pagador<br><strong>Entrega:</strong> QR por WhatsApp enviado manualmente por el equipo Euphoric tras validar el pago.`;

    setStatus(
      "ok",
      successHtml,
      true
    );
    window.alert("No te olvides de hacer el bizum para recibir tu codigo QR");
    openStatusModal(successHtml);
    form.reset();
  } catch (error) {
    setStatus("err", error.message);
  } finally {
    submitBtn.disabled = false;
  }
});

closeModalBtn.addEventListener("click", closeStatusModal);

statusModal.addEventListener("click", (event) => {
  if (event.target === statusModal) {
    closeStatusModal();
  }
});

window.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && statusModal.classList.contains("open")) {
    closeStatusModal();
  }
});

quantitySelect.addEventListener("change", renderExtraAttendeeFields);
renderExtraAttendeeFields();
