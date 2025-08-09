// Google Apps Script v6 - เพิ่ม note ในสินเชื่อ
const SPREADSHEET_ID = '1dFqF8Kt95kCLEiFFH-Y16R4Xn6HRSbfYea7W-4jJVks';

function doGet(e) {
  const action = e.parameter.action;
  try {
    if (action === 'getTransactions') return getSheetDataAsJSON('Transactions');
    if (action === 'getLoans') return getSheetDataAsJSON('Loans');
    throw new Error('Invalid GET action');
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: error.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const action = data.action;
    
    switch (action) {
      case 'addTransaction':
        return addRowToSheet('Transactions', data);
      case 'updateTransaction':
        return updateRowInSheet('Transactions', data);
      case 'deleteTransaction':
        return deleteRowFromSheet('Transactions', data.id);
      case 'addLoan':
        return addRowToSheet('Loans', data);
      default:
        throw new Error('Invalid POST action');
    }
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: error.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}

function getSheetDataAsJSON(sheetName) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(sheetName);
  
  if (!sheet || sheet.getLastRow() < 2) {
    return ContentService.createTextOutput(JSON.stringify({ success: true, data: [] })).setMimeType(ContentService.MimeType.JSON);
  }
  
  const data = sheet.getDataRange().getValues();
  const headers = data.shift();
  
  const jsonData = data.map(row => {
    const obj = {};
    headers.forEach((header, i) => {
      obj[header] = row[i];
    });
    return obj;
  });
  
  return ContentService.createTextOutput(JSON.stringify({ success: true, data: jsonData })).setMimeType(ContentService.MimeType.JSON);
}

function addRowToSheet(sheetName, data) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(sheetName);
  
  const now = new Date();
  data.time = now.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  data.timestamp = now.toISOString();

  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    const headers = (sheetName === 'Loans')
      ? ['id', 'date', 'loanName', 'type', 'amount', 'interestRate', 'term', 'monthlyPayment', 'startDate', 'note', 'time', 'timestamp']
      : ['id', 'date', 'item', 'type', 'category', 'amount', 'note', 'time', 'timestamp'];
    sheet.appendRow(headers);
  }
  
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const newRow = headers.map(header => data[header] || '');
  
  sheet.appendRow(newRow);
  
  return ContentService.createTextOutput(JSON.stringify({ success: true, message: 'Row added' })).setMimeType(ContentService.MimeType.JSON);
}


function updateRowInSheet(sheetName, data) {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(sheetName);
  const dataRange = sheet.getDataRange();
  const values = dataRange.getValues();
  const headers = values[0];
  const idColumnIndex = headers.indexOf('id');

  if (idColumnIndex === -1) throw new Error("'id' column not found");

  for (let i = 1; i < values.length; i++) {
    if (values[i][idColumnIndex] == data.id) {
      data.timestamp = new Date().toISOString();
      const newRow = headers.map(header => data[header] !== undefined ? data[header] : values[i][headers.indexOf(header)]);
      sheet.getRange(i + 1, 1, 1, headers.length).setValues([newRow]);
      return ContentService.createTextOutput(JSON.stringify({ success: true, message: 'Row updated' })).setMimeType(ContentService.MimeType.JSON);
    }
  }
  throw new Error('Row not found for update');
}

function deleteRowFromSheet(sheetName, id) {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(sheetName);
  const dataRange = sheet.getDataRange();
  const values = dataRange.getValues();
  const idColumnIndex = values[0].indexOf('id');

  if (idColumnIndex === -1) throw new Error("'id' column not found");

  for (let i = values.length - 1; i > 0; i--) {
    if (values[i][idColumnIndex] == id) {
      sheet.deleteRow(i + 1);
      return ContentService.createTextOutput(JSON.stringify({ success: true, message: 'Row deleted' })).setMimeType(ContentService.MimeType.JSON);
    }
  }
  throw new Error('Row not found for deletion');
}
