// Google Apps Script สำหรับบันทึกรายรับรายจ่าย
// **สำคัญ:** แก้ไข SPREADSHEET_ID ให้ตรงกับ Google Sheets ของคุณ
const SPREADSHEET_ID = '1dFqF8Kt95kCLEiFFH-Y16R4Xn6HRSbfYea7W-4jJVks';

function doGet(e) {
  const action = e.parameter.action;
  
  try {
    if (action === 'getTransactions') {
      return getSheetDataAsJSON('Transactions');
    } else if (action === 'getLoans') {
      return getSheetDataAsJSON('Loans');
    }
    
    throw new Error('Invalid GET action');
    
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({success: false, error: error.toString()}))
      .setMimeType(ContentService.MimeType.JSON);
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
    return ContentService
      .createTextOutput(JSON.stringify({success: false, error: error.toString()}))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function getSheetDataAsJSON(sheetName) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(sheetName);
  
  if (!sheet) {
    return ContentService
      .createTextOutput(JSON.stringify({success: true, data: []}))
      .setMimeType(ContentService.MimeType.JSON);
  }
  
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) {
    return ContentService
      .createTextOutput(JSON.stringify({success: true, data: []}))
      .setMimeType(ContentService.MimeType.JSON);
  }

  const headers = data.shift();
  const jsonData = data.map(row => {
    const obj = {};
    headers.forEach((header, i) => {
      obj[header] = row[i];
    });
    return obj;
  });
  
  return ContentService
    .createTextOutput(JSON.stringify({success: true, data: jsonData}))
    .setMimeType(ContentService.MimeType.JSON);
}

function addRowToSheet(sheetName, data) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(sheetName);
  
  // กำหนด Headers ให้ตรงกับชีทของคุณ
  const headers = ['วันที่', 'เวลา', 'ประเภท', 'จำนวนเงิน', 'หมวดหมู่', 'วิธีการชำระ', 'รายละเอียด', 'สถานะ', 'id', 'timestamp'];
  
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    sheet.appendRow(headers);
  }
  
  // สร้างข้อมูลสำหรับแถวใหม่ให้ตรงกับ Headers
  const now = new Date();
  const time = now.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  // แปลงประเภทจากภาษาอังกฤษเป็นไทย
  const typeMap = { 'income': 'รายรับ', 'expense': 'รายจ่าย', 'loan': 'เงินกู้', 'borrow': 'กู้เพิ่ม', 'repay': 'ชำระคืน' };

  const newRowData = {
    'วันที่': data.date,
    'เวลา': time,
    'ประเภท': typeMap[data.type] || data.type,
    'จำนวนเงิน': data.amount,
    'หมวดหมู่': data.category || data.loanName, // ใช้ category หรือ loanName
    'วิธีการชำระ': data.paymentMethod || 'เงินสด', // ใส่ค่าเริ่มต้นถ้าไม่มี
    'รายละเอียด': data.item || data.loanName,
    'สถานะ': data.status || 'สำเร็จ', // ใส่ค่าเริ่มต้นถ้าไม่มี
    'id': data.id,
    'timestamp': now.toISOString()
  };

  const newRow = headers.map(header => newRowData[header] || '');
  sheet.appendRow(newRow);
  
  return ContentService
    .createTextOutput(JSON.stringify({success: true, message: 'Row added'}))
    .setMimeType(ContentService.MimeType.JSON);
}

function updateRowInSheet(sheetName, data) {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(sheetName);
  const dataRange = sheet.getDataRange();
  const values = dataRange.getValues();
  const headers = values[0];
  const idColumnIndex = headers.indexOf('id');

  if (idColumnIndex === -1) {
    throw new Error("'id' column not found in the sheet.");
  }

  for (let i = 1; i < values.length; i++) {
    if (values[i][idColumnIndex] == data.id) {
      const typeMap = { 'income': 'รายรับ', 'expense': 'รายจ่าย', 'loan': 'เงินกู้' };
      const updatedRowData = {
        'วันที่': data.date,
        'เวลา': new Date().toLocaleTimeString('th-TH'), // อัปเดตเวลา
        'ประเภท': typeMap[data.type] || data.type,
        'จำนวนเงิน': data.amount,
        'หมวดหมู่': data.category,
        'วิธีการชำระ': data.paymentMethod || values[i][headers.indexOf('วิธีการชำระ')],
        'รายละเอียด': data.item,
        'สถานะ': data.status || values[i][headers.indexOf('สถานะ')],
        'id': data.id,
        'timestamp': new Date().toISOString()
      };
      
      const newRow = headers.map(header => updatedRowData[header] || '');
      sheet.getRange(i + 1, 1, 1, headers.length).setValues([newRow]);
      return ContentService.createTextOutput(JSON.stringify({success: true, message: 'Row updated'})).setMimeType(ContentService.MimeType.JSON);
    }
  }
  throw new Error('Row not found for update');
}

function deleteRowFromSheet(sheetName, id) {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(sheetName);
  const dataRange = sheet.getDataRange();
  const values = dataRange.getValues();
  const idColumnIndex = values[0].indexOf('id');

  if (idColumnIndex === -1) {
    throw new Error("'id' column not found in the sheet.");
  }

  for (let i = values.length - 1; i > 0; i--) {
    if (values[i][idColumnIndex] == id) {
      sheet.deleteRow(i + 1);
      return ContentService.createTextOutput(JSON.stringify({success: true, message: 'Row deleted'})).setMimeType(ContentService.MimeType.JSON);
    }
  }
  throw new Error('Row not found for deletion');
}
