/* ===========================================================
   script.js - Note App
   ============================================================ */
let appCategories = [];
let WebAppURL = localStorage.getItem('NoteApp_WebUrl') || '';
let selectedCatIndex = -1;

const defaultCategories = [
    { name: 'การเงิน',  icon: '💰', subcategories: ['ยืมเงิน', 'รายรับ', 'รายจ่าย'] },
    { name: 'การเรียน', icon: '📚', subcategories: ['ชีววิทยา', 'คณิตศาสตร์', 'ฟิสิกส์', 'ภาษาอังกฤษ'] },
    { name: 'งาน',      icon: '💼', subcategories: ['โปรเจกต์', 'ประชุม', 'งานบ้าน'] }
];

/* ──────────────────── INIT ──────────────────── */
document.addEventListener('DOMContentLoaded', () => {
    loadCategories();
    setupNavigation();
    setupFormListeners();
    setupModalListeners();
});

function loadCategories() {
    document.getElementById('scriptUrl').value = WebAppURL;
    const cached = localStorage.getItem('NoteApp_Categories');
    appCategories = cached ? JSON.parse(cached) : [...defaultCategories];
    renderCategoryPills();
    if (WebAppURL) fetchCategoriesFromSheet();
}

/* ──────────────────── NAVIGATION ──────────────────── */
function setupNavigation() {
    // Bottom nav buttons
    document.querySelectorAll('.nav-btn[data-view]').forEach(btn => {
        btn.addEventListener('click', () => showView(btn.dataset.view));
    });

    document.getElementById('navSettings').addEventListener('click', () => {
        openModal('settingsModal');
        renderCategoryManager();
    });
}

function showView(viewId) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(viewId)?.classList.add('active');

    const navBtn = document.querySelector(`.nav-btn[data-view="${viewId}"]`);
    if (navBtn) navBtn.classList.add('active');

    if (viewId === 'viewHistory') fetchHistory();
}

/* ──────────────────── CATEGORY PILLS (MAIN) ──────────────────── */
function renderCategoryPills() {
    const container = document.getElementById('categoryPills');
    container.innerHTML = '';
    appCategories.forEach((cat, i) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = `pill-btn ${i === selectedCatIndex ? 'active' : ''}`;
        btn.innerHTML = `<span class="pill-icon">${cat.icon}</span>${cat.name}`;
        btn.onclick = () => selectCategory(i);
        container.appendChild(btn);
    });
}

function selectCategory(index) {
    selectedCatIndex = index;
    renderCategoryPills();

    const cat = appCategories[index];
    const subContainer = document.getElementById('subCategoryPills');
    subContainer.innerHTML = '';
    document.getElementById('subCategorySelected').value = '';
    document.getElementById('customSubCategoryGroup').style.display = 'none';

    cat.subcategories.forEach(sub => {
        subContainer.appendChild(makeSubBtn(sub));
    });
    subContainer.appendChild(makeSubBtn('__other__', '➕ ระบุเอง'));

    document.getElementById('subCategoryGroup').style.display = 'block';
    // re-trigger animation
    document.getElementById('subCategoryGroup').classList.remove('slide-in');
    void document.getElementById('subCategoryGroup').offsetWidth;
    document.getElementById('subCategoryGroup').classList.add('slide-in');
}

function makeSubBtn(value, label) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'pill-btn';
    btn.textContent = label || value;
    btn.onclick = () => selectSubCategory(value, btn);
    return btn;
}

function selectSubCategory(sub, btnEl) {
    document.querySelectorAll('#subCategoryPills .pill-btn').forEach(b => b.classList.remove('active'));
    btnEl.classList.add('active');

    const customGroup = document.getElementById('customSubCategoryGroup');
    if (sub === '__other__') {
        customGroup.style.display = 'block';
        document.getElementById('subCategorySelected').value = '__other__';
    } else {
        customGroup.style.display = 'none';
        document.getElementById('subCategorySelected').value = sub;
    }
}

/* ──────────────────── FORM SUBMIT ──────────────────── */
function setupFormListeners() {
    document.getElementById('recordForm').addEventListener('submit', async e => {
        e.preventDefault();

        if (selectedCatIndex === -1) { showMsg('กรุณาเลือกหัวข้อหลักก่อน', 'error'); return; }

        let subcat = document.getElementById('subCategorySelected').value;
        if (!subcat) { showMsg('กรุณาเลือกหัวข้อย่อย', 'error'); return; }
        if (subcat === '__other__') {
            subcat = document.getElementById('customSubCategory').value.trim();
            if (!subcat) { showMsg('กรุณาระบุหัวข้อย่อย', 'error'); return; }
        }

        if (!WebAppURL) { showMsg('ยังไม่ได้ตั้งค่า Web App URL (กดปุ่ม ตั้งค่า)', 'error'); return; }

        const cat     = appCategories[selectedCatIndex];
        const detail  = document.getElementById('recordDetail').value.trim();
        const amount  = document.getElementById('recordAmount').value;
        const btnEl   = document.getElementById('btnSubmit');
        const origTxt = btnEl.innerHTML;

        btnEl.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> กำลังบันทึก...';
        btnEl.disabled  = true;

        try {
            const payload = { action: 'add_note', category: cat.name, subcategory: subcat, detail, amount };
            const res     = await fetch(WebAppURL, { method: 'POST', body: JSON.stringify(payload) });
            const data    = await res.json();
            if (data.status === 'success') {
                showSuccessModal(cat, subcat, amount);
                resetForm();
            } else {
                showMsg('เกิดข้อผิดพลาด: ' + data.message, 'error');
            }
        } catch (err) {
            // Fallback (CORS no-cors)
            showSuccessModal(appCategories[selectedCatIndex], subcat, amount);
            resetForm();
        } finally {
            btnEl.innerHTML = origTxt;
            btnEl.disabled  = false;
        }
    });
}

function resetForm() {
    document.getElementById('recordForm').reset();
    selectedCatIndex = -1;
    renderCategoryPills();
    document.getElementById('subCategoryGroup').style.display = 'none';
    document.getElementById('customSubCategoryGroup').style.display = 'none';
}

function showSuccessModal(cat, subcat, amount) {
    const detail = document.getElementById('successDetail');
    let msg = `${cat.icon} ${cat.name} > ${subcat}`;
    if (amount) msg += `  —  ฿${Number(amount).toLocaleString()}`;
    detail.textContent = msg;
    openModal('successModal');
}

/* ──────────────────── HISTORY ──────────────────── */
async function fetchHistory() {
    if (!WebAppURL) {
        document.getElementById('historyList').innerHTML =
            '<div class="empty-state"><i class="fa-solid fa-link-slash"></i><p>ยังไม่ได้เชื่อมต่อ Google Sheets<br><small>กด ตั้งค่า แล้วใส่ Web App URL</small></p></div>';
        return;
    }

    document.getElementById('historyList').innerHTML =
        '<div class="empty-state"><i class="fa-solid fa-spinner fa-spin"></i><p>กำลังโหลด...</p></div>';

    try {
        const res  = await fetch(WebAppURL, { method: 'POST', body: JSON.stringify({ action: 'get_history' }) });
        const data = await res.json();
        if (data.status === 'success') renderHistory(data.history);
    } catch {
        document.getElementById('historyList').innerHTML =
            '<div class="empty-state"><i class="fa-solid fa-triangle-exclamation"></i><p>โหลดไม่ได้ (ตรวจสอบ URL)</p></div>';
    }
}

function renderHistory(history) {
    const list = document.getElementById('historyList');
    if (!history?.length) {
        list.innerHTML = '<div class="empty-state"><i class="fa-solid fa-box-open"></i><p>ยังไม่มีประวัติการบันทึก</p></div>';
        return;
    }
    list.innerHTML = '';
    history.forEach(item => {
        const date = item.timestamp
            ? new Date(item.timestamp).toLocaleString('th-TH', { day: '2-digit', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit' })
            : '';
        const div = document.createElement('div');
        div.className = 'history-item';
        div.innerHTML = `
            <div class="history-top">
                <span class="history-cats">${item.category}</span>
                <span class="history-tag">${item.subcategory}</span>
            </div>
            <div class="history-bottom">
                <span class="history-detail-text">${item.detail || '—'}</span>
                <span class="history-amount">${item.amount ? '฿' + Number(item.amount).toLocaleString() : ''}</span>
            </div>
            <div class="history-date">${date}</div>
        `;
        list.appendChild(div);
    });
}

/* ──────────────────── MODALS ──────────────────── */
function openModal(id) { document.getElementById(id).classList.add('show'); }
function closeModal(id) { document.getElementById(id).classList.remove('show'); }

function setupModalListeners() {
    document.getElementById('closeSettings')  .addEventListener('click', () => closeModal('settingsModal'));
    document.getElementById('btnCloseSuccess').addEventListener('click', () => closeModal('successModal'));
    document.getElementById('btnRefreshHistory').addEventListener('click', fetchHistory);

    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', e => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            e.target.classList.add('active');
            document.getElementById(e.target.dataset.target)?.classList.add('active');
        });
    });

    document.getElementById('btnSaveConfig').addEventListener('click', () => {
        const url = document.getElementById('scriptUrl').value.trim();
        if (url) {
            localStorage.setItem('NoteApp_WebUrl', url);
            WebAppURL = url;
            closeModal('settingsModal');
            alert('บันทึก URL เรียบร้อย กำลังโหลดข้อมูลหมวดหมู่...');
            fetchCategoriesFromSheet();
        }
    });

    document.getElementById('btnAddNewCategory').addEventListener('click', () => {
        appCategories.push({ name: '', icon: '📌', subcategories: [] });
        renderCategoryManager();
    });

    document.getElementById('btnSaveCategories').addEventListener('click', async () => {
        const items = document.querySelectorAll('.manage-cat-item');
        const newCats = [];
        items.forEach(item => {
            const icon = item.querySelector('.icon-input').value.trim();
            const name = item.querySelector('.name-input').value.trim();
            const subs = item.querySelector('.subcat-input').value.split(',').map(s => s.trim()).filter(Boolean);
            if (name) newCats.push({ icon: icon || '📌', name, subcategories: subs });
        });
        appCategories = newCats;
        localStorage.setItem('NoteApp_Categories', JSON.stringify(appCategories));
        renderCategoryPills();

        if (WebAppURL) {
            const btn = document.getElementById('btnSaveCategories');
            btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> กำลังบันทึก...';
            try {
                await fetch(WebAppURL, { method: 'POST', body: JSON.stringify({ action: 'save_categories', categories: appCategories }) });
                alert('บันทึกหมวดหมู่เรียบร้อย');
            } catch { alert('บันทึกในเครื่องแล้ว แต่ส่งไป Sheet ไม่ได้'); }
            btn.innerHTML = 'บันทึกหมวดหมู่';
        } else {
            alert('บันทึกลงเครื่องเรียบร้อย');
        }
        closeModal('settingsModal');
    });
}

/* ──────────────────── CATEGORY MANAGER ──────────────────── */
function renderCategoryManager() {
    const list = document.getElementById('categoryManagerList');
    list.innerHTML = '';
    appCategories.forEach((cat, i) => {
        const div = document.createElement('div');
        div.className = 'manage-cat-item';
        div.innerHTML = `
            <div class="manage-cat-header">
                <input class="icon-input" type="text" value="${cat.icon}" placeholder="📌" maxlength="2">
                <input class="name-input" type="text" value="${cat.name}" placeholder="ชื่อหัวข้อ">
                <button class="remove-cat-btn" onclick="removeCategory(${i})"><i class="fa-solid fa-trash"></i></button>
            </div>
            <div class="manage-subcat-area">
                <label>หัวข้อย่อย (คั่นด้วย , )</label>
                <input class="subcat-input" type="text" value="${cat.subcategories.join(', ')}" placeholder="เช่น คณิต, ชีวะ">
            </div>
        `;
        list.appendChild(div);
    });
}

window.removeCategory = i => { appCategories.splice(i, 1); renderCategoryManager(); };

/* ──────────────────── HELPERS ──────────────────── */
function showMsg(msg, type) {
    const el = document.getElementById('statusMessage');
    el.textContent = msg;
    el.className = `status-message ${type}`;
    clearTimeout(el._t);
    el._t = setTimeout(() => { el.className = 'status-message'; }, 5000);
}

async function fetchCategoriesFromSheet() {
    try {
        const res  = await fetch(WebAppURL);
        const data = await res.json();
        if (data.status === 'success' && data.categories?.length) {
            appCategories = data.categories;
            localStorage.setItem('NoteApp_Categories', JSON.stringify(appCategories));
            renderCategoryPills();
        }
    } catch { /* silent */ }
}
