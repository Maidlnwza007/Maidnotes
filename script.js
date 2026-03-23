/* ===========================================================
   script.js - Note App (localStorage only — no Google Sheets)
   ============================================================ */
let appCategories = [];
let selectedCatIndex = -1;

const STORAGE_KEY_CATS    = 'NoteApp_Categories';
const STORAGE_KEY_HISTORY = 'NoteApp_History';

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
    const cached = localStorage.getItem(STORAGE_KEY_CATS);
    appCategories = cached ? JSON.parse(cached) : [...defaultCategories];
    renderCategoryPills();
}

/* ──────────────────── LOCAL HISTORY ──────────────────── */
function getHistory() {
    const raw = localStorage.getItem(STORAGE_KEY_HISTORY);
    return raw ? JSON.parse(raw) : [];
}

function saveHistory(history) {
    localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(history));
}

function addHistoryEntry(entry) {
    const history = getHistory();
    history.unshift({ ...entry, timestamp: new Date().toISOString() });
    saveHistory(history);
}

/* ──────────────────── NAVIGATION ──────────────────── */
function setupNavigation() {
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

    if (viewId === 'viewHistory') renderHistory(getHistory());
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

        const cat    = appCategories[selectedCatIndex];
        const detail = document.getElementById('recordDetail').value.trim();
        const amount = document.getElementById('recordAmount').value;

        const entry = { category: cat.name, icon: cat.icon, subcategory: subcat, detail, amount };
        addHistoryEntry(entry);

        showSuccessModal(cat, subcat, amount);
        resetForm();
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
                <span class="history-cats">${item.icon || ''} ${item.category}</span>
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

/* ──────────────────── CLEAR DATA ──────────────────── */
function clearAllData() {
    if (!confirm('ต้องการลบประวัติทั้งหมดใช่ไหม?\nการดำเนินการนี้ไม่สามารถย้อนกลับได้')) return;
    localStorage.removeItem(STORAGE_KEY_HISTORY);
    renderHistory([]);
    showMsg('ล้างประวัติเรียบร้อยแล้ว', 'success');
}

/* ──────────────────── MODALS ──────────────────── */
function openModal(id)  { document.getElementById(id).classList.add('show'); }
function closeModal(id) { document.getElementById(id).classList.remove('show'); }

function setupModalListeners() {
    document.getElementById('closeSettings')  .addEventListener('click', () => closeModal('settingsModal'));
    document.getElementById('btnCloseSuccess').addEventListener('click', () => closeModal('successModal'));
    document.getElementById('btnRefreshHistory').addEventListener('click', () => renderHistory(getHistory()));
    document.getElementById('btnClearHistory').addEventListener('click', clearAllData);

    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', e => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            e.target.classList.add('active');
            document.getElementById(e.target.dataset.target)?.classList.add('active');
        });
    });

    document.getElementById('btnAddNewCategory').addEventListener('click', () => {
        appCategories.push({ name: '', icon: '📌', subcategories: [] });
        renderCategoryManager();
    });

    document.getElementById('btnSaveCategories').addEventListener('click', () => {
        const items = document.querySelectorAll('.manage-cat-item');
        const newCats = [];
        items.forEach(item => {
            const icon = item.querySelector('.icon-input').value.trim();
            const name = item.querySelector('.name-input').value.trim();
            const subs = item.querySelector('.subcat-input').value.split(',').map(s => s.trim()).filter(Boolean);
            if (name) newCats.push({ icon: icon || '📌', name, subcategories: subs });
        });
        appCategories = newCats;
        localStorage.setItem(STORAGE_KEY_CATS, JSON.stringify(appCategories));
        renderCategoryPills();
        alert('บันทึกหมวดหมู่เรียบร้อย');
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
