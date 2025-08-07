// ID ของ Google Sheet ที่จะใช้เก็บข้อมูล
const SPREADSHEET_ID = '1dFqF8Kt95kCLEiFFH-Y16R4Xn6HRSbfYea7W-4jJVks';

// ชื่อชีตสำหรับเก็บข้อมูลแต่ละประเภท
const TRANSACTIONS_SHEET_NAME = 'Transactions';
const LOANS_SHEET_NAME = 'Loans';

// กำหนดหัวข้อคอลัมน์ที่ถูกต้องสำหรับแต่ละชีต
// หมายเหตุ: เพิ่ม id และ timestamp เข้าไปใน Transactions เพื่อให้แอปทำงานได้ถูกต้อง
const TRANSACTIONS_HEADERS = ['วันที่', 'เวลา', 'ประเภท', 'จำนวนเงิน', 'หมวดหมู่', 'วิธีการชำระ', 'รายละเอียด', 'สถานะ', 'id', 'timestamp'];
const LOANS_HEADERS = ['id', 'type', 'name', 'amount', 'interestRate', 'term', 'monthlyPayment', 'startDate', 'note', 'timestamp'];


// --- ฟังก์ชันหลักสำหรับจัดการคำขอ (doGet/doPost) ---

/**
 * จัดการคำขอแบบ GET (สำหรับดึงข้อมูล)
 */
function doGet(e) {
  try {
    const action = e.parameter.action;
    let data;

    if (action === 'getTransactions') {
      data = getTransactions();
    } else if (action === 'getLoans') {
      data = getLoans();
    } else {
      throw new Error('Invalid GET action specified.');
    }

    return createJsonResponse({ success: true, data: data });
  } catch (error) {
    Logger.log('Error in doGet: ' + error.toString() + ' Stack: ' + error.stack);
    return createJsonResponse({ success: false, error: error.toString() });
  }
}

/**
 * จัดการคำขอแบบ POST (สำหรับเพิ่มข้อมูล)
 */
function doPost(e) {
  try {
    const requestData = JSON.parse(e.postData.contents);
    const action = requestData.action;
    const data = requestData.data;

    if (action === 'addTransaction') {
      addTransaction(data);
    } else if (action === 'addLoan') {
      addLoan(data);
    } else {
      throw new Error('Invalid POST action specified.');
    }

    return createJsonResponse({ success: true, message: 'Data added successfully.' });
  } catch (error) {
    Logger.log('Error in doPost: ' + error.toString() + ' Stack: ' + error.stack);
    return createJsonResponse({ success: false, error: error.toString() });
  }
}


// --- ฟังก์ชันสำหรับเขียนข้อมูลลงชีต ---

/**
 * เพิ่มข้อมูลรายการรับ-จ่าย (Transaction)
 */
function addTransaction(data) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = getOrCreateSheet(ss, TRANSACTIONS_SHEET_NAME, TRANSACTIONS_HEADERS);
  
  const dateObj = new Date(data.timestamp);
  const time = dateObj.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  // สร้าง object ของแถวใหม่ให้ตรงกับ Headers
  const newRow = {
    'วันที่': data.date,
    'เวลา': time,
    'ประเภท': data.type === 'income' ? 'รายรับ' : 'รายจ่าย', // แปลงข้อมูล
    'จำนวนเงิน': data.amount,
    'หมวดหมู่': data.category,
    'วิธีการชำระ': data.payment_method,
    'รายละเอียด': data.description,
    'สถานะ': 'บันทึกแล้ว', // เพิ่มสถานะเริ่มต้น
    'id': data.id,
    'timestamp': data.timestamp
  };
  
  // เรียงข้อมูลตามลำดับของ Headers แล้วเพิ่มลงชีต
  const rowData = TRANSACTIONS_HEADERS.map(header => newRow[header] !== undefined ? newRow[header] : '');
  sheet.appendRow(rowData);
}

/**
 * เพิ่มข้อมูลสินเชื่อ (Loan)
 */
function addLoan(data) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = getOrCreateSheet(ss, LOANS_SHEET_NAME, LOANS_HEADERS);
  
  // เรียงข้อมูลตามลำดับของ Headers แล้วเพิ่มลงชีต
  const rowData = LOANS_HEADERS.map(header => data[header] !== undefined ? data[header] : '');
  sheet.appendRow(rowData);
}


// --- ฟังก์ชันสำหรับอ่านข้อมูลจากชีต ---

/**
 * ดึงข้อมูล Transactions และแปลงให้อยู่ในรูปแบบที่ Client ต้องการ
 */
function getTransactions() {
  const values = getSheetData(TRANSACTIONS_SHEET_NAME, TRANSACTIONS_HEADERS);
  if (values.length <= 1) return []; // ถ้ามีแต่หัวข้อ ให้ return array ว่าง

  const headers = values[0];
  // สร้างตัวแปรสำหรับ map หัวข้อชีต (ภาษาไทย) ไปเป็น key ที่ Client (HTML) ต้องการ (ภาษาอังกฤษ)
  const clientKeyMap = {
    'ประเภท': 'type',
    'จำนวนเงิน': 'amount',
    'หมวดหมู่': 'category',
    'วิธีการชำระ': 'payment_method',
    'รายละเอียด': 'description',
    'วันที่': 'date',
    'id': 'id',
    'timestamp': 'timestamp'
  };

  const jsonData = values.slice(1).map(row => {
    const obj = {};
    headers.forEach((header, index) => {
      const clientKey = clientKeyMap[header];
      if (clientKey) { // ถ้ามี key ที่ตรงกันใน map
        if (clientKey === 'type') {
          // แปลงค่า 'รายรับ'/'รายจ่าย' กลับเป็น 'income'/'expense'
          obj[clientKey] = row[index] === 'รายรับ' ? 'income' : 'expense';
        } else if (clientKey === 'amount') {
          // แปลงค่าที่เป็นข้อความให้เป็นตัวเลข
          obj[clientKey] = parseFloat(row[index]) || 0;
        } else {
          obj[clientKey] = row[index];
        }
      }
    });
    return obj;
  });

  // เรียงข้อมูลจากใหม่ไปเก่าโดยใช้ timestamp
  return jsonData.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
}

/**
 * ดึงข้อมูล Loans และแปลงให้อยู่ในรูปแบบที่ Client ต้องการ
 */
function getLoans() {
    const values = getSheetData(LOANS_SHEET_NAME, LOANS_HEADERS);
    if (values.length <= 1) return [];

    const headers = values[0];
    const jsonData = values.slice(1).map(row => {
        const obj = {};
        headers.forEach((header, index) => {
            const key = header;
            // สำหรับ Loans, key ตรงกับ header อยู่แล้ว แต่ต้องแปลงค่าตัวเลข
            if (['amount', 'interestRate', 'term', 'monthlyPayment'].includes(key)) {
                obj[key] = parseFloat(row[index]) || 0;
            } else {
                obj[key] = row[index];
            }
        });
        return obj;
    });

    // เรียงข้อมูลจากใหม่ไปเก่าโดยใช้ timestamp
    return jsonData.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
}


// --- ฟังก์ชันเสริม (Utilities) ---

/**
 * ตรวจสอบว่ามีชีตที่ต้องการหรือไม่ ถ้าไม่มีให้สร้างใหม่พร้อมหัวข้อ
 */
function getOrCreateSheet(spreadsheet, sheetName, headers) {
  let sheet = spreadsheet.getSheetByName(sheetName);
  if (!sheet) {
    sheet = spreadsheet.insertSheet(sheetName);
    sheet.appendRow(headers);
  } else {
    // ตรวจสอบว่าหัวข้อถูกต้องหรือไม่ ถ้าไม่ถูกต้องให้เขียนทับ
    const currentHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    if (JSON.stringify(currentHeaders) !== JSON.stringify(headers)) {
        sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    }
  }
  return sheet;
}

/**
 * ดึงข้อมูลทั้งหมดจากชีต
 */
function getSheetData(sheetName, defaultHeaders) {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = getOrCreateSheet(ss, sheetName, defaultHeaders);
    return sheet.getDataRange().getValues();
}

/**
 * สร้าง Response กลับไปในรูปแบบ JSON
 */
function createJsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
