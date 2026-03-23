/*
 * ==========================================================================
 * AD Energia - Solar Health Monitor
 * Google Apps Script: camada de dados (doPost + doGet)
 * ==========================================================================
 *
 * INSTRUCOES DE DEPLOY
 * --------------------
 * 1. Abrir a planilha: https://docs.google.com/spreadsheets/d/1uwVxKzD6xhuxNcE-hMKE1GZYOxdOyLf40dLAgiYxEeY
 * 2. Ir em Extensions > Apps Script
 * 3. Colar todo o conteudo deste arquivo no editor
 * 4. Trocar API_KEY por uma chave segura:
 *    python -c "import secrets; print(secrets.token_hex(32))"
 * 5. Deploy > New deployment
 *    - Type: Web app
 *    - Execute as: Me
 *    - Who has access: Anyone
 * 6. Copiar a URL do deployment (usar como GOOGLE_SCRIPT_URL no .env)
 * 7. A aba "Dados" sera criada automaticamente no primeiro POST
 *    (caso nao exista)
 *
 * ==========================================================================
 */

var API_KEY = "c55852b0b58d112bf49a5de29ab8bf482dacdca986de45254273d7599c723dca";
var SHEET_NAME = "Dados";
var SPREADSHEET_ID = "1uwVxKzD6xhuxNcE-hMKE1GZYOxdOyLf40dLAgiYxEeY";

// ==========================================================================
// doPost — recebe JSON do Python e grava na planilha
// ==========================================================================

function doPost(e) {
  try {
    var payload = JSON.parse(e.postData.contents);

    if (payload.api_key !== API_KEY) {
      return ContentService.createTextOutput(
        JSON.stringify({ error: "Unauthorized" })
      ).setMimeType(ContentService.MimeType.JSON);
    }

    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sheet = ss.getSheetByName(SHEET_NAME);

    if (!sheet) {
      sheet = ss.insertSheet(SHEET_NAME);
      sheet.appendRow([
        "timestamp",
        "sid",
        "cliente",
        "capacidade_kw",
        "status",
        "status_descricao",
      ]);
    }

    var data = payload.data;
    for (var i = 0; i < data.length; i++) {
      var row = data[i];
      sheet.appendRow([
        row.timestamp,
        row.sid,
        row.cliente,
        row.capacidade_kw,
        row.status,
        row.status_descricao,
      ]);
    }

    return ContentService.createTextOutput(
      JSON.stringify({ success: true, rows: data.length })
    ).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(
      JSON.stringify({ error: err.message })
    ).setMimeType(ContentService.MimeType.JSON);
  }
}

// ==========================================================================
// doGet — retorna dados da planilha como JSON com filtros opcionais
// ==========================================================================
//
// Parametros de query string (todos opcionais):
//   ?cliente=NomeCliente   — filtra por nome exato do cliente
//   ?status=1              — filtra por codigo de status (1-4)
//   ?from=2026-03-01       — data minima (inclusive)
//   ?to=2026-03-23         — data maxima (inclusive)
//
// Exemplo: ?cliente=Daniele&status=1&from=2026-03-01

function doGet(e) {
  try {
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sheet = ss.getSheetByName(SHEET_NAME);

    if (!sheet) {
      return ContentService.createTextOutput(
        JSON.stringify({ data: [] })
      ).setMimeType(ContentService.MimeType.JSON);
    }

    var data = sheet.getDataRange().getValues();
    var headers = data[0];
    var rows = [];

    var paramCliente = e.parameter.cliente || null;
    var paramFrom = e.parameter.from || null;
    var paramTo = e.parameter.to || null;
    var paramStatus = e.parameter.status || null;

    for (var i = 1; i < data.length; i++) {
      var row = {};
      for (var j = 0; j < headers.length; j++) {
        row[headers[j]] = data[i][j];
      }

      if (paramCliente && row.cliente !== paramCliente) continue;
      if (paramStatus && String(row.status) !== String(paramStatus)) continue;
      if (paramFrom && row.timestamp < paramFrom) continue;
      if (paramTo && row.timestamp > paramTo) continue;

      rows.push(row);
    }

    return ContentService.createTextOutput(
      JSON.stringify({ data: rows })
    ).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(
      JSON.stringify({ error: err.message })
    ).setMimeType(ContentService.MimeType.JSON);
  }
}
