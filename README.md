# Web temporal de venta de entradas

Landing de solicitud de compra con registro en Google Sheets + validacion manual de pago por Bizum.

## Incluye

- `index.html`, `styles.css`, `app.js` -> landing de solicitud.
- `google-apps-script/Code.gs` -> endpoint para guardar solicitudes en Google Sheets.
- `qr_entradas/` -> codigos QR para envio manual por WhatsApp al confirmar pago.

## 1) Configurar Google Sheets (obligatorio)

1. Abri tu hoja: `https://docs.google.com/spreadsheets/d/1J_QwQ-chGAnI65HwM5H8CcPrzcL1RkH0CnkxY2jGwXY/edit`
2. `Extensions` -> `Apps Script`.
3. Pega el contenido de `google-apps-script/Code.gs`.
4. Ejecuta `setupRequestsSheet()` una vez.
5. Deploy:
   - `Deploy` -> `New deployment`
   - Tipo: `Web app`
   - Execute as: `Me`
   - Who has access: `Anyone`
   - Copia la URL final (`.../exec`).

## 2) Configuracion rapida de la landing

Edita `app.js` y cambia:

- `APPS_SCRIPT_WEB_APP_URL` -> URL del deployment de Apps Script.
- `BIZUM_TARGET` -> donde te pagan por Bizum (actual: `658441357`).

## 3) Probar local

Servi la carpeta por HTTP:

```powershell
python -m http.server 8080
```

Abri `http://localhost:8080/`.

## 4) Flujo de solicitud y pago

1. La persona completa nombre, telefono y cantidad.
   - Si pide mas de 1 entrada, debe completar un nombre completo por cada entrada adicional.
2. La web guarda la solicitud en la hoja `Solicitudes` y recibe `orderId`.
3. La persona ve inmediatamente los datos para hacer Bizum (importe y referencia obligatoria: nombre y apellidos del pagador).
4. La solicitud queda pendiente: el pago Bizum puede tardar en reflejarse y la validacion es manual.
5. Solo cuando confirmas el pago, envias vos manualmente por WhatsApp los QR correspondientes.

## 5) Apagar la web luego del evento

Tenes dos opciones rapidas:

1. Bajar el deploy del hosting.
2. O reemplazar `index.html` por mensaje "Ventas cerradas".

## Evitar aparicion en Google

Ya quedo configurado en este proyecto:

- `index.html` incluye metadatos `noindex,nofollow` para buscadores.
- `robots.txt` bloquea rastreo completo (`Disallow: /`).

Recomendacion adicional (muy importante): no publicar enlaces en redes abiertas ni indexables, y compartir solo por mensaje directo.
