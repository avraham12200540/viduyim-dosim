// script.js - מתוקן עם סיסמת מנהל חדשה שסיפקת
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
import {
  getFirestore, collection, addDoc, doc, getDoc, getDocs,
  query, orderBy, limit, serverTimestamp, runTransaction, onSnapshot, updateDoc, deleteDoc
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

// === CONFIG (העתק/הדבק מכאן את קונפיג ה־Firebase שלך במידת הצורך) ===
const firebaseConfig = {
  apiKey: "AIzaSyBEXKNJ4Bkmx_O1zQIEC3XFUxiGOGo_aEU",
  authDomain: "viduyim-dosim.firebaseapp.com",
  projectId: "viduyim-dosim",
  storageBucket: "viduyim-dosim.firebasestorage.app",
  messagingSenderId: "1080556993415",
  appId: "1:1080556993415:web:f29591b24859675ecfb122",
  measurementId: "G-64R5QVSBE7"
};
// =================================================================

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ========== Configuration you can change ==========
const WHATSAPP_LINK = "https://chat.whatsapp.com/DhgRRIXb4AR3JiizotAckB";
const COUNTERS_DOC = doc(db, "counters", "confessions");
const CONFESSIONS_COL = collection(db, "confessions");
// Admin password set as requested by the user:
const ADMIN_PASSWORD = "12200540"; // <-- changed as requested
// ===================================================

// Utility: create safe text node container for confession display
function createConfessionElement(number, text, timestamp, approved, docId, isAdmin=false){
  const wrap = document.createElement('div');
  wrap.className = 'confession card';
  const h3 = document.createElement('h3');
  h3.textContent = 'וידויים של דוסים';
  wrap.appendChild(h3);

  const meta = document.createElement('div');
  meta.className = 'meta';
  const date = timestamp && timestamp.toDate ? timestamp.toDate() : (timestamp? new Date(timestamp) : null);
  meta.textContent = `#${number}` + (date ? ` • ${date.toLocaleString()}` : '');
  wrap.appendChild(meta);

  const p = document.createElement('p');
  p.textContent = text;
  wrap.appendChild(p);

  const link = document.createElement('a');
  link.href = WHATSAPP_LINK;
  link.className = 'link-like';
  link.textContent = 'קבוצת ווצאפ';
  link.target = '_blank';
  wrap.appendChild(link);

  if (isAdmin){
    const btns = document.createElement('div');
    btns.style.marginTop = '8px';
    btns.style.display = 'flex';
    btns.style.gap = '8px';
    btns.style.justifyContent = 'center';

    const approveBtn = document.createElement('button');
    approveBtn.textContent = approved ? 'מאושר' : 'אשר';
    approveBtn.disabled = approved;
    approveBtn.addEventListener('click', async () => {
      await updateDoc(doc(db, "confessions", docId), { approved: true });
    });

    const deleteBtn = document.createElement('button');
    deleteBtn.style.background = '#c62828';
    deleteBtn.textContent = 'מחק';
    deleteBtn.addEventListener('click', async () => {
      if (!confirm('בטוח שברצונך למחוק את הוידוי הזה?')) return;
      await deleteDoc(doc(db, "confessions", docId));
    });

    const copyBtn = document.createElement('button');
    copyBtn.style.background = '#3949ab';
    copyBtn.textContent = 'העתק לתקשורת';
    copyBtn.addEventListener('click', () => {
      const formatted = `וידויים של דוסים\\n\\n#${number} ${text}\\n\\n${WHATSAPP_LINK}`;
      navigator.clipboard.writeText(formatted).then(()=> alert('הטקסט הועתק!'), ()=>alert('לא הצליח להעתיק'));
    });

    btns.appendChild(approveBtn);
    btns.appendChild(deleteBtn);
    btns.appendChild(copyBtn);
    wrap.appendChild(btns);
  }

  return wrap;
}

// ====== Helper: get next sequential ID using transaction ======
async function getNextId(){
  try{
    const nextId = await runTransaction(db, async (t) => {
      const snap = await t.get(COUNTERS_DOC);
      if (!snap.exists()){
        t.set(COUNTERS_DOC, { nextId: 2 }); // reserve 1 for this write
        return 1;
      } else {
        const current = snap.data().nextId || 1;
        t.update(COUNTERS_DOC, { nextId: current + 1 });
        return current;
      }
    });
    return nextId;
  }catch(e){
    console.error('getNextId error', e);
    return Date.now(); // fallback
  }
}

// ====== Submission logic (index.html) ======
const form = document.getElementById('confessionForm');
if (form){
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const ta = document.getElementById('confessionText');
    const text = ta.value.trim();
    if (!text) { alert('כתבו וידוי לפני שליחה.'); return; }
    // Basic length check
    if (text.length > 2000){ alert('הוידוי ארוך מדי.'); return; }

    // Create entry with approved:false (admin must approve)
    const id = await getNextId();
    await addDoc(CONFESSIONS_COL, {
      idNumber: id,
      text,
      timestamp: serverTimestamp(),
      approved: false
    });
    ta.value = '';
    alert('הוידוי נשלח — המנהל יאשר אותו לפני פרסום.');
  });

  // show latest approved (real-time)
  const latestQuery = query(CONFESSIONS_COL, orderBy('timestamp', 'desc'), limit(3));
  onSnapshot(latestQuery, (snapshot) => {
    const container = document.getElementById('latestConfessions');
    if (!container) return;
    container.innerHTML = '';
    // Filter approved only and take up to 3
    const approvedDocs = snapshot.docs.filter(d => d.data().approved);
    // If Firestore returns less than 3 approved in snapshot due to limit, we should do a separate query:
    // Simpler approach: fetch separately the 3 approved latest:
    (async ()=>{
      const approvedQuery = query(CONFESSIONS_COL, orderBy('timestamp','desc'));
      const allSnap = await getDocs(approvedQuery);
      const approvedOnly = allSnap.docs.filter(d=>d.data().approved).slice(0,3);
      let count = 1;
      approvedOnly.forEach(d=>{
        const data = d.data();
        const el = createConfessionElement(data.idNumber || count, data.text || '', data.timestamp, true, d.id, false);
        container.appendChild(el);
        count++;
      });
      if (approvedOnly.length === 0){
        container.innerHTML = '<p class="small">עדיין אין וידויים מאושרים.</p>';
      }
    })();
  });
}

// ====== Admin logic (admin.html) ======
const adminSection = document.getElementById('adminSection');
const adminPanel = document.getElementById('adminPanel');
const adminList = document.getElementById('adminList');
const adminLoginBtn = document.getElementById('adminLogin');
const adminPasswordInput = document.getElementById('adminPassword');

function showAdminUI(){
  document.getElementById('authSection').style.display = 'none';
  document.getElementById('adminPanel').style.display = 'block';
  // real-time listener for all confessions
  const allQuery = query(CONFESSIONS_COL, orderBy('timestamp','desc'));
  onSnapshot(allQuery, (snapshot)=>{
    adminList.innerHTML = '';
    let counter = 1;
    snapshot.docs.forEach(docSnap=>{
      const data = docSnap.data();
      const el = createConfessionElement(data.idNumber || counter, data.text || '', data.timestamp, !!data.approved, docSnap.id, true);
      adminList.appendChild(el);
      counter++;
    });
    if (snapshot.empty){
      adminList.innerHTML = '<p class="small">אין וידויים.</p>';
    }
  });
}

if (adminLoginBtn){
  adminLoginBtn.addEventListener('click', ()=>{
    const val = adminPasswordInput.value || '';
    if (val === ADMIN_PASSWORD){
      // successful login
      showAdminUI();
    } else {
      alert('סיסמה שגויה.');
    }
  });
}

// ===== Notes =====
// - For safety: submissions are stored with approved:false. Admin must approve them before they appear publicly.
// - Consider using Firebase Authentication for real admin accounts in production.
// - This project intentionally avoids innerHTML when inserting user text to reduce XSS risk.
// - You can modify WHATSAPP_LINK and other constants above.
