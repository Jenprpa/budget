// --- CONFIGURATION ---
const SPREADSHEET_ID = '1dFqF8Kt95kCLEiFFH-Y16R4Xn6HRSbfYea7W-4jJVks';
const TRANSACTIONS_SHEET_NAME = 'Transactions';
const LOANS_SHEET_NAME = 'Loans';

// กำหนดหัวข้อคอลัมน์ที่ถูกต้องสำหรับแต่ละชีต
const TRANSACTIONS_HEADERS = ['วันที่', 'เวลา', 'ประเภท', 'จำนวนเงิน', 'หมวดหมู่', 'วิธีการชำระ', 'รายละเอียด', 'สถานะ', 'id', 'timestamp'];
const LOANS_HEADERS = ['id', 'type', 'name', 'amount', 'interestRate', 'term', 'monthlyPayment', 'startDate', 'note', 'timestamp'];

// กำหนดคอลัมน์ที่ใช้เป็น Unique ID สำหรับการค้นหา
const TRANSACTION_ID_COLUMN_NAME = 'id';
const LOAN_ID_COLUMN_NAME = 'id';


// --- MAIN HANDLERS (doGet, doPost) ---

function doGet(e) {
  try {
    const action = e.parameter.action;
    let data;
    switch (action) {
      case 'getTransactions':
        data = getTransactions();
        break;
      case 'getLoans':
        data = getLoans();
        break;
      default:
        throw new Error('Invalid GET action specified.');
    }
    return createJsonResponse({ success: true, data: data });
  } catch (error) {
    Logger.log(`doGet Error: ${error.toString()}`);
    return createJsonResponse({ success: false, error: error.toString() });
  }
}

function doPost(e) {
  try {
    const request = JSON.parse(e.postData.contents);
    const { action, data } = request;
    let resultMessage = '';

    switch (action) {
      case 'addTransaction':
        addTransaction(data);
        resultMessage = 'Transaction added successfully.';
        break;
      case 'editTransaction':
        editTransaction(data);
        resultMessage = 'Transaction edited successfully.';
        break;
      case 'deleteTransaction':
        deleteRowById(TRANSACTIONS_SHEET_NAME, TRANSACTION_ID_COLUMN_NAME, data.id);
        resultMessage = 'Transaction deleted successfully.';
        break;
      case 'addLoan':
        addLoan(data);
        resultMessage = 'Loan added successfully.';
        break;
      case 'deleteLoan':
        deleteRowById(LOANS_SHEET_NAME, LOAN_ID_COLUMN_NAME, data.id);
        resultMessage = 'Loan deleted successfully.';
        break;
      default:
        throw new Error('Invalid POST action specified.');
    }
    return createJsonResponse({ success: true, message: resultMessage });
  } catch (error) {
    Logger.log(`doPost Error: ${error.toString()}`);
    return createJsonResponse({ success: false, error: error.toString() });
  }
}


// --- DATA MANIPULATION FUNCTIONS ---

function addTransaction(data) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = getOrCreateSheet(ss, TRANSACTIONS_SHEET_NAME, TRANSACTIONS_HEADERS);
  const dateObj = new Date(data.timestamp);
  const newRow = {
    'วันที่': data.date,
    'เวลา': dateObj.toLocaleTimeString('th-TH'),
    'ประเภท': data.type === 'income' ? 'รายรับ' : 'รายจ่าย',
    'จำนวนเงิน': data.amount,
    'หมวดหมู่': data.category,
    'วิธีการชำระ': data.payment_method,
    'รายละเอียด': data.description,
    'สถานะ': 'บันทึกแล้ว',
    'id': data.id,
    'timestamp': data.timestamp
  };
  const rowData = TRANSACTIONS_HEADERS.map(header => newRow[header] || '');
  sheet.appendRow(rowData);
}

function editTransaction(data) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(TRANSACTIONS_SHEET_NAME);
  if (!sheet) throw new Error(`Sheet "${TRANSACTIONS_SHEET_NAME}" not found.`);

  const idColumnIndex = TRANSACTIONS_HEADERS.indexOf(TRANSACTION_ID_COLUMN_NAME) + 1;
  if (idColumnIndex === 0) throw new Error('ID column not found in headers.');

  const dataValues = sheet.getRange(2, idColumnIndex, sheet.getLastRow() - 1, 1).getValues();
  let rowToEdit = -1;
  for (let i = 0; i < dataValues.length; i++) {
    if (dataValues[i][0] == data.id) {
      rowToEdit = i + 2; // +2 to account for 1-based index and header row
      break;
    }
  }

  if (rowToEdit === -1) throw new Error(`Transaction with ID "${data.id}" not found.`);

  // สร้าง object ของแถวใหม่ให้ตรงกับ Headers
  const updatedRow = {
    'วันที่': data.date,
    'ประเภท': data.type === 'income' ? 'รายรับ' : 'รายจ่าย',
    'จำนวนเงิน': data.amount,
    'หมวดหมู่': data.category,
    'วิธีการชำระ': data.payment_method,
    'รายละเอียด': data.description,
    'สถานะ': 'แก้ไขแล้ว',
  };

  // อัปเดตเฉพาะคอลัมน์ที่มีการเปลี่ยนแปลง
  TRANSACTIONS_HEADERS.forEach((header, index) => {
    if (updatedRow[header] !== undefined) {
      sheet.getRange(rowToEdit, index + 1).setValue(updatedRow[header]);
    }
  });
}

function deleteRowById(sheetName, idColumnName, id) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) throw new Error(`Sheet "${sheetName}" not found.`);

  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const idColumnIndex = headers.indexOf(idColumnName) + 1;
  if (idColumnIndex === 0) throw new Error(`ID column "${idColumnName}" not found.`);

  const dataValues = sheet.getRange(2, idColumnIndex, sheet.getLastRow() - 1, 1).getValues();
  let rowToDelete = -1;
  for (let i = 0; i < dataValues.length; i++) {
    if (dataValues[i][0] == id) {
      rowToDelete = i + 2;
      break;
    }
  }

  if (rowToDelete !== -1) {
    sheet.deleteRow(rowToDelete);
  } else {
    throw new Error(`Item with ID "${id}" not found in sheet "${sheetName}".`);
  }
}

// Placeholder for addLoan
function addLoan(data) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = getOrCreateSheet(ss, LOANS_SHEET_NAME, LOANS_HEADERS);
  const rowData = LOANS_HEADERS.map(header => data[header] || '');
  sheet.appendRow(rowData);
}

// --- DATA RETRIEVAL FUNCTIONS ---
// getTransactions and getLoans remain the same as the previous version.
function getTransactions() {
  const values = getSheetData(TRANSACTIONS_SHEET_NAME, TRANSACTIONS_HEADERS);
  if (values.length <= 1) return [];

  const headers = values[0];
  const clientKeyMap = {
    'ประเภท': 'type', 'จำนวนเงิน': 'amount', 'หมวดหมู่': 'category',
    'วิธีการชำระ': 'payment_method', 'รายละเอียด': 'description', 'วันที่': 'date',
    'id': 'id', 'timestamp': 'timestamp'
  };

  const jsonData = values.slice(1).map(row => {
    const obj = {};
    headers.forEach((header, index) => {
      const clientKey = clientKeyMap[header];
      if (clientKey) {
        obj[clientKey] = (clientKey === 'type') ? (row[index] === 'รายรับ' ? 'income' : 'expense') :
                         (clientKey === 'amount') ? parseFloat(row[index]) || 0 : row[index];
      }
    });
    return obj;
  });

  return jsonData.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
}

function getLoans() {
    const values = getSheetData(LOANS_SHEET_NAME, LOANS_HEADERS);
    if (values.length <= 1) return [];

    const headers = values[0];
    const jsonData = values.slice(1).map(row => {
        const obj = {};
        headers.forEach((header, index) => {
            const key = header;
            if (['amount', 'interestRate', 'term', 'monthlyPayment'].includes(key)) {
                obj[key] = parseFloat(row[index]) || 0;
            } else {
                obj[key] = row[index];
            }
        });
        return obj;
    });
    return jsonData.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
}


// --- UTILITY FUNCTIONS ---
function getOrCreateSheet(ss, sheetName, headers) {
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    sheet.appendRow(headers);
  }
  return sheet;
}

function getSheetData(sheetName, defaultHeaders) {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = getOrCreateSheet(ss, sheetName, defaultHeaders);
    return sheet.getDataRange().getValues();
}

function createJsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
