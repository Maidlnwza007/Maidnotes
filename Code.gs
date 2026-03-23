function setupSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // 1. Create Notes sheet if not exists
  let notesSheet = ss.getSheetByName('Notes');
  if (!notesSheet) {
    notesSheet = ss.insertSheet('Notes');
    notesSheet.appendRow(['Timestamp', 'Type', 'Category', 'SubCategory', 'Detail', 'Amount']);
    notesSheet.getRange("A1:F1").setFontWeight("bold");
    notesSheet.setFrozenRows(1);
  }
  
  // 2. Create Categories sheet if not exists
  let catSheet = ss.getSheetByName('Categories');
  if (!catSheet) {
    catSheet = ss.insertSheet('Categories');
    catSheet.appendRow(['Type', 'Name', 'Icon', 'SubCategories']); 
    catSheet.getRange("A1:D1").setFontWeight("bold");
    catSheet.setFrozenRows(1);
    
    // Default data
    catSheet.appendRow(['main', 'การเงิน', '💰', 'ยืมเงิน,รายรับ,รายจ่าย']);
    catSheet.appendRow(['main', 'การเรียน', '📚', 'ชีววิทยา,คณิตศาสตร์,ฟิสิกส์']);
    catSheet.appendRow(['main', 'งาน', '💼', 'โปรเจกต์,ประชุม']);
  }
}

// GET Request: ส่งข้อมูลหมวดหมู่กลับไปที่ Web App
function doGet(e) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let catSheet = ss.getSheetByName('Categories');
  
  // หากรันครั้งแรก จะสร้างชีตตั้งต้นให้
  if (!catSheet) {
    setupSheets();
    catSheet = ss.getSheetByName('Categories');
  }
  
  const data = catSheet.getDataRange().getValues();
  const rows = data.slice(1);
  
  let categories = [];
  rows.forEach(row => {
    if (row[0] === 'main' && row[1] !== '') {
      let subs = row[3] ? row[3].toString().split(',') : [];
      categories.push({
        name: row[1],
        icon: row[2],
        subcategories: subs
      });
    }
  });
  
  const result = JSON.stringify({
    status: 'success',
    categories: categories
  });
  
  return ContentService.createTextOutput(result)
    .setMimeType(ContentService.MimeType.JSON);
}

// POST Request: รับข้อมูลบันทึกลงตาราง และ รับข้อมูลแก้ไขหมวดหมู่
function doPost(e) {
  try {
    const postData = JSON.parse(e.postData.contents);
    const action = postData.action;
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    
    // 1. กรณีบันทึกโน้ต
    if (action === 'add_note') {
      let notesSheet = ss.getSheetByName('Notes');
      if (!notesSheet) {
        setupSheets();
        notesSheet = ss.getSheetByName('Notes');
      }
      
      const ts = new Date();
      notesSheet.appendRow([
        ts, 
        'note', 
        postData.category || '', 
        postData.subcategory || '', 
        postData.detail || '', 
        postData.amount || ''
      ]);
      
      return ContentService.createTextOutput(JSON.stringify({status: 'success', message: 'Note added'}))
        .setMimeType(ContentService.MimeType.JSON);
    } 
    // 2. กรณีแก้ไขหมวดหมู่จากหน้าเว็บ
    else if (action === 'save_categories') {
      let catSheet = ss.getSheetByName('Categories');
      if (!catSheet) {
        setupSheets();
        catSheet = ss.getSheetByName('Categories');
      }
      
      // ลบข้อมูลเดิมยกเว้นหัวตาราง
      if (catSheet.getLastRow() > 1) {
        catSheet.getRange(2, 1, catSheet.getLastRow() - 1, 4).clearContent();
      }
      
      // ใส่ข้อมูลใหม่ที่แก้จากแอป
      const newCats = postData.categories; 
      newCats.forEach(cat => {
        catSheet.appendRow(['main', cat.name, cat.icon || '📌', cat.subcategories.join(',')]);
      });
      
      return ContentService.createTextOutput(JSON.stringify({status: 'success', message: 'Categories saved'}))
        .setMimeType(ContentService.MimeType.JSON);
    }
    // 3. กรณีดึงประวัติข้อมูล
    else if (action === 'get_history') {
      let notesSheet = ss.getSheetByName('Notes');
      if (!notesSheet) {
        return ContentService.createTextOutput(JSON.stringify({status: 'success', history: []}))
          .setMimeType(ContentService.MimeType.JSON);
      }
      
      const data = notesSheet.getDataRange().getValues();
      const rows = data.slice(1).reverse(); // ล่าสุดอยู่บน
      
      const history = rows.map(row => ({
        timestamp: row[0],
        category: row[2],
        subcategory: row[3],
        detail: row[4],
        amount: row[5]
      })).slice(0, 50); // เอาแค่ 50 รายการล่าสุด
      
      return ContentService.createTextOutput(JSON.stringify({status: 'success', history: history}))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    return ContentService.createTextOutput(JSON.stringify({status: 'error', message: 'Unknown action'}))
      .setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({status: 'error', message: error.toString()}))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ฟังก์ชันเปิดให้ CORS ใช้งานได้ต้องทำผ่านรูปแบบการ Deploy Web App เป็น "ท่านใดก็ได้" (Anyone)
