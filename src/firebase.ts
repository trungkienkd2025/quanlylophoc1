import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import {
  getFirestore,
  Firestore,
  doc,
  setDoc,
  getDoc,
  onSnapshot,
  collection,
} from 'firebase/firestore';
import { getAuth, Auth } from 'firebase/auth';

export interface FirebaseConfigType {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId: string;
  measurementId?: string;
}

// Cấu hình chính xác từ dự án khohoclieuso-afa3c của Thầy Trần Trung Kiên
export const DEFAULT_CONFIG: FirebaseConfigType = {
  apiKey: 'AIzaSyA2pkXOtmdirw0TYgNCLpQ4_cgxr429ysQ',
  authDomain: 'khohoclieuso-afa3c.firebaseapp.com',
  projectId: 'khohoclieuso-afa3c',
  storageBucket: 'khohoclieuso-afa3c.firebasestorage.app',
  messagingSenderId: '574661937513',
  appId: '1:574661937513:web:beb0fe44cc43c05bd195f8',
  measurementId: 'G-ZPGJ7PNKN8',
};

export function getStoredFirebaseConfig(): FirebaseConfigType {
  try {
    const saved = localStorage.getItem('qllh_firebase_config');
    if (saved) {
      return { ...DEFAULT_CONFIG, ...JSON.parse(saved) };
    }
  } catch (e) {
    console.error('Error reading firebase config from localStorage:', e);
  }
  return DEFAULT_CONFIG;
}

export function saveFirebaseConfig(config: Partial<FirebaseConfigType>) {
  try {
    const current = getStoredFirebaseConfig();
    const updated = { ...current, ...config };
    localStorage.setItem('qllh_firebase_config', JSON.stringify(updated));
    return updated;
  } catch (e) {
    console.error('Error saving firebase config:', e);
    return null;
  }
}

let appInstance: FirebaseApp | null = null;
let dbInstance: Firestore | null = null;
let authInstance: Auth | null = null;

export function initFirebase(customConfig?: FirebaseConfigType): {
  app: FirebaseApp | null;
  db: Firestore | null;
  auth: Auth | null;
} {
  const config = customConfig || getStoredFirebaseConfig();

  if (!config.apiKey || !config.projectId) {
    return { app: null, db: null, auth: null };
  }

  try {
    if (!getApps().length) {
      appInstance = initializeApp(config);
    } else {
      appInstance = getApp();
    }
    dbInstance = getFirestore(appInstance);
    authInstance = getAuth(appInstance);
    return { app: appInstance, db: dbInstance, auth: authInstance };
  } catch (e) {
    console.warn('Firebase initialization warning:', e);
    return { app: null, db: null, auth: null };
  }
}

export function getFirebaseDb(): Firestore | null {
  if (!dbInstance) {
    const res = initFirebase();
    return res.db;
  }
  return dbInstance;
}

export function isFirebaseConfigured(): boolean {
  const cfg = getStoredFirebaseConfig();
  return Boolean(cfg.apiKey && cfg.projectId);
}

// ========================================================
// CÁC HÀM ĐỒNG BỘ DỮ LIỆU ĐÁM MÂY THỜI GIAN THỰC (FIRESTORE)
// HỖ TRỢ CƠ SỞ DỮ LIỆU ĐỘC LẬP TỪNG TÀI KHOẢN (ISOLATED CLOUD DB)
// ========================================================

// ========================================================
// CÁC HÀM ĐỒNG BỘ CƠ SỞ DỮ LIỆU ĐÁM MÂY THỜI GIAN THỰC (FIRESTORE)
// ĐẢM BẢO TẤT CẢ THIẾT BỊ / MÁY TÍNH CÙNG CHUNG MỘT CSDL THỐNG NHẤT
// ========================================================

const APP_DATA_DOC = 'global_data_v1';

export interface AppSyncData {
  accounts?: any[];
  permissions?: any;
  classes: any[];
  students: any[];
  grades: Record<string, any>;
  timetable: any[];
  weeks: Record<string, any>;
  evals: Record<string, any>;
  years: string[];
  currentYear: string;
  submissions?: any[];
  commentsT?: string[];
  commentsH?: string[];
  quizBank?: any[];
  ownerId?: string;
  updatedAt: string;
  lastUpdatedBy?: string;
}

export function getUserDataDocId(userScope?: string): string {
  const clean = (userScope || 'u_admin').trim().replace(/[^a-zA-Z0-9_-]/g, '_');
  return `user_${clean}`;
}

/**
 * Đẩy riêng danh sách tài khoản người dùng lên Firestore để mọi thiết bị lập tức có chung tài khoản
 */
export async function pushAccountsToFirestore(accounts: any[]): Promise<boolean> {
  const db = getFirebaseDb();
  if (!db || !Array.isArray(accounts)) return false;

  try {
    const payload = {
      accounts,
      updatedAt: new Date().toISOString(),
    };
    // 1. Cập nhật vào global_data_v1
    const globalDocRef = doc(db, 'qllh_data', APP_DATA_DOC);
    await setDoc(globalDocRef, payload, { merge: true });

    // 2. Ghi song song vào tài liệu accounts hệ thống để sao lưu độc lập
    const sysDocRef = doc(db, 'qllh_system', 'accounts');
    await setDoc(sysDocRef, payload, { merge: true });
    return true;
  } catch (err) {
    console.warn('Lỗi pushAccountsToFirestore:', err);
    return false;
  }
}

/**
 * Đẩy toàn bộ dữ liệu (tài khoản, lớp, học sinh, điểm, TKB...) lên Firebase Firestore
 */
export async function pushAllDataToFirestore(userScope?: string, accountsOverride?: any[]): Promise<boolean> {
  const db = getFirebaseDb();
  if (!db) {
    throw new Error('Chưa thể kết nối tới Firebase Firestore.');
  }

  const userId = userScope || 'u_admin';
  const cleanId = userId || 'u_admin';
  const userClassesKey = `qllh_user_${cleanId}_classes`;
  const userStudentsKey = `qllh_user_${cleanId}_students`;
  const userGradesKey = `qllh_user_${cleanId}_grades`;
  const userWeeksKey = `qllh_user_${cleanId}_weeks`;
  const userEvalsKey = `qllh_user_${cleanId}_evals`;
  const userTimetableKey = `qllh_user_${cleanId}_timetable`;
  const userYearsKey = `qllh_user_${cleanId}_years`;
  const userCurrentYearKey = `qllh_user_${cleanId}_current_year`;

  const getStoredAccounts = () => {
    if (accountsOverride && Array.isArray(accountsOverride) && accountsOverride.length > 0) {
      return accountsOverride;
    }
    try {
      const a = localStorage.getItem('qllh_user_accounts');
      if (a) return JSON.parse(a);
    } catch {}
    return [];
  };

  const getStoredClasses = () => {
    try {
      const u = localStorage.getItem(userClassesKey);
      if (u) {
        const p = JSON.parse(u);
        if (Array.isArray(p) && p.length > 0) return p;
      }
    } catch {}
    try {
      const v = localStorage.getItem('qllh_classes_v52') || localStorage.getItem('qllh_classes') || localStorage.getItem('qllh_classes_v50');
      if (v) {
        const p = JSON.parse(v);
        if (Array.isArray(p) && p.length > 0) return p;
      }
    } catch {}
    return [];
  };

  const getStoredStudents = () => {
    try {
      const u = localStorage.getItem(userStudentsKey);
      if (u) {
        const p = JSON.parse(u);
        if (Array.isArray(p) && p.length > 0) return p;
      }
    } catch {}
    try {
      const v = localStorage.getItem('qllh_students_v52') || localStorage.getItem('qllh_students') || localStorage.getItem('qllh_students_v50');
      if (v) {
        const p = JSON.parse(v);
        if (Array.isArray(p) && p.length > 0) return p;
      }
    } catch {}
    return [];
  };

  const getStoredGrades = () => {
    try {
      const u = localStorage.getItem(userGradesKey);
      if (u) return JSON.parse(u);
      const v = localStorage.getItem('qllh_grade_v52') || localStorage.getItem('qllh_grade');
      if (v) return JSON.parse(v);
    } catch {}
    return {};
  };

  let finalAccounts = getStoredAccounts();
  let finalClasses = getStoredClasses();
  let finalStudents = getStoredStudents();
  let finalGrades = getStoredGrades();
  let finalTimetable = JSON.parse(localStorage.getItem(userTimetableKey) || localStorage.getItem(`qllh_timetable_${cleanId}`) || localStorage.getItem('qllh_timetable_matrix') || '[]');
  let finalWeeks = JSON.parse(localStorage.getItem(userWeeksKey) || localStorage.getItem('qllh_weeks_v52') || '{}');
  let finalEvals = JSON.parse(localStorage.getItem(userEvalsKey) || localStorage.getItem('qllh_eval_v52') || '{}');
  let finalYears = JSON.parse(localStorage.getItem(userYearsKey) || localStorage.getItem('qllh_years') || '["2026-2027", "2025-2026"]');
  let finalCurrentYear = localStorage.getItem(userCurrentYearKey) || localStorage.getItem('qllh_current_year') || '2026-2027';
  let finalCommentsT = JSON.parse(localStorage.getItem(`qllh_user_${cleanId}_comments_t`) || localStorage.getItem('qllh_custom_comments_t') || '[]');
  let finalCommentsH = JSON.parse(localStorage.getItem(`qllh_user_${cleanId}_comments_h`) || localStorage.getItem('qllh_custom_comments_h') || '[]');

  // 1. Luôn hợp nhất an toàn với dữ liệu đang có trên Firestore trước khi ghi
  // NGUYÊN TẮC: Lớp và học sinh đã tạo là LƯU VĨNH VIỄN, không bao giờ bị ghi đè làm mất bởi tài khoản hoặc thiết bị khác
  const globalDocRef = doc(db, 'qllh_data', APP_DATA_DOC);
  try {
    const existingSnap = await getDoc(globalDocRef);
    if (existingSnap.exists()) {
      const serverData = existingSnap.data() as AppSyncData;

      // Hợp nhất danh sách lớp: giữ tất cả lớp của mọi tài khoản và máy tính khác
      if (serverData.classes && Array.isArray(serverData.classes)) {
        const classMap = new Map<string, any>();
        serverData.classes.forEach((c: any) => {
          if (c && c.id) classMap.set(c.id, c);
        });
        finalClasses.forEach((c: any) => {
          if (c && c.id) classMap.set(c.id, { ...(classMap.get(c.id) || {}), ...c });
        });
        finalClasses = Array.from(classMap.values());
      }

      // Hợp nhất danh sách học sinh: giữ tất cả học sinh của mọi lớp
      if (serverData.students && Array.isArray(serverData.students)) {
        const studentMap = new Map<string, any>();
        serverData.students.forEach((s: any) => {
          if (s && s.id) studentMap.set(s.id, s);
        });
        finalStudents.forEach((s: any) => {
          if (s && s.id) studentMap.set(s.id, { ...(studentMap.get(s.id) || {}), ...s });
        });
        finalStudents = Array.from(studentMap.values());
      }

      // Hợp nhất danh sách tài khoản
      if (serverData.accounts && Array.isArray(serverData.accounts)) {
        const accMap = new Map<string, any>();
        serverData.accounts.forEach((a: any) => {
          if (a && a.id) accMap.set(a.id, a);
          else if (a && a.username) accMap.set(a.username, a);
        });
        finalAccounts.forEach((a: any) => {
          if (a && a.id) accMap.set(a.id, { ...(accMap.get(a.id) || {}), ...a });
          else if (a && a.username) accMap.set(a.username, { ...(accMap.get(a.username) || {}), ...a });
        });
        finalAccounts = Array.from(accMap.values());
      }

      // Hợp nhất bảng điểm, tuần, đánh giá
      if (serverData.grades && typeof serverData.grades === 'object') {
        finalGrades = { ...serverData.grades, ...finalGrades };
      }
      if (serverData.weeks && typeof serverData.weeks === 'object') {
        finalWeeks = { ...serverData.weeks, ...finalWeeks };
      }
      if (serverData.evals && typeof serverData.evals === 'object') {
        finalEvals = { ...serverData.evals, ...finalEvals };
      }
      if (serverData.years && Array.isArray(serverData.years)) {
        finalYears = Array.from(new Set([...serverData.years, ...finalYears]));
      }
      if (serverData.commentsT && Array.isArray(serverData.commentsT)) {
        finalCommentsT = Array.from(new Set([...serverData.commentsT, ...finalCommentsT]));
      }
      if (serverData.commentsH && Array.isArray(serverData.commentsH)) {
        finalCommentsH = Array.from(new Set([...serverData.commentsH, ...finalCommentsH]));
      }
    }
  } catch (err) {
    console.warn('Lỗi đọc Firestore trước khi hợp nhất:', err);
  }

  const payload: AppSyncData = {
    accounts: finalAccounts,
    permissions: JSON.parse(localStorage.getItem('qllh_student_permissions') || 'null'),
    classes: finalClasses,
    students: finalStudents,
    grades: finalGrades,
    timetable: finalTimetable,
    weeks: finalWeeks,
    evals: finalEvals,
    years: finalYears,
    currentYear: finalCurrentYear,
    submissions: JSON.parse(localStorage.getItem('qllh_quiz_submissions') || '[]'),
    quizBank: JSON.parse(localStorage.getItem('qllh_quiz_bank') || '[]'),
    commentsT: finalCommentsT,
    commentsH: finalCommentsH,
    ownerId: userId,
    updatedAt: new Date().toISOString(),
    lastUpdatedBy: userId,
  };

  // 1. Luôn cập nhật vào tài liệu tập trung toàn trường global_data_v1
  await setDoc(globalDocRef, payload, { merge: true });

  // 2. Đồng thời lưu vào tài liệu riêng của user
  const userDocRef = doc(db, 'qllh_user_data', getUserDataDocId(userId));
  await setDoc(userDocRef, payload, { merge: true });

  return true;
}

/**
 * Xóa vĩnh viễn một lớp học khỏi hệ thống và đồng bộ ngay lên Firestore
 */
export async function deleteClassFromFirestore(classId: string): Promise<boolean> {
  const db = getFirebaseDb();
  if (!db) return false;
  try {
    const globalDocRef = doc(db, 'qllh_data', APP_DATA_DOC);
    const snap = await getDoc(globalDocRef);
    if (snap.exists()) {
      const data = snap.data() as AppSyncData;
      const updatedClasses = (data.classes || []).filter((c: any) => c.id !== classId);
      const updatedStudents = (data.students || []).filter((s: any) => s.classId !== classId);
      await setDoc(
        globalDocRef,
        {
          classes: updatedClasses,
          students: updatedStudents,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
      return true;
    }
  } catch (err) {
    console.error('Lỗi deleteClassFromFirestore:', err);
  }
  return false;
}

/**
 * Xóa vĩnh viễn một học sinh khỏi hệ thống và đồng bộ ngay lên Firestore
 */
export async function deleteStudentFromFirestore(studentId: string): Promise<boolean> {
  const db = getFirebaseDb();
  if (!db) return false;
  try {
    const globalDocRef = doc(db, 'qllh_data', APP_DATA_DOC);
    const snap = await getDoc(globalDocRef);
    if (snap.exists()) {
      const data = snap.data() as AppSyncData;
      const updatedStudents = (data.students || []).filter((s: any) => s.id !== studentId);
      await setDoc(
        globalDocRef,
        {
          students: updatedStudents,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
      return true;
    }
  } catch (err) {
    console.error('Lỗi deleteStudentFromFirestore:', err);
  }
  return false;
}

/**
 * Xóa vĩnh viễn toàn bộ học sinh của một lớp khỏi Firestore
 */
export async function deleteAllStudentsOfClassFromFirestore(classId: string): Promise<boolean> {
  const db = getFirebaseDb();
  if (!db) return false;
  try {
    const globalDocRef = doc(db, 'qllh_data', APP_DATA_DOC);
    const snap = await getDoc(globalDocRef);
    if (snap.exists()) {
      const data = snap.data() as AppSyncData;
      const updatedStudents = (data.students || []).filter((s: any) => s.classId !== classId);
      await setDoc(
        globalDocRef,
        {
          students: updatedStudents,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
      return true;
    }
  } catch (err) {
    console.error('Lỗi deleteAllStudentsOfClassFromFirestore:', err);
  }
  return false;
}

/**
 * Xóa vĩnh viễn một năm học khỏi Firestore
 */
export async function deleteYearFromFirestore(year: string): Promise<boolean> {
  const db = getFirebaseDb();
  if (!db) return false;
  try {
    const globalDocRef = doc(db, 'qllh_data', APP_DATA_DOC);
    const snap = await getDoc(globalDocRef);
    if (snap.exists()) {
      const data = snap.data() as AppSyncData;
      const updatedYears = (data.years || []).filter((y: string) => y !== year);
      const updatedClasses = (data.classes || []).filter((c: any) => c.year !== year);
      const remainingClassIds = new Set(updatedClasses.map((c: any) => c.id));
      const updatedStudents = (data.students || []).filter((s: any) => remainingClassIds.has(s.classId));
      await setDoc(
        globalDocRef,
        {
          years: updatedYears,
          classes: updatedClasses,
          students: updatedStudents,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
      return true;
    }
  } catch (err) {
    console.error('Lỗi deleteYearFromFirestore:', err);
  }
  return false;
}

/**
 * Xóa vĩnh viễn một tài khoản khỏi Firestore
 */
export async function deleteAccountFromFirestore(accountId: string): Promise<boolean> {
  const db = getFirebaseDb();
  if (!db) return false;
  try {
    const globalDocRef = doc(db, 'qllh_data', APP_DATA_DOC);
    const snap = await getDoc(globalDocRef);
    if (snap.exists()) {
      const data = snap.data() as AppSyncData;
      const updatedAccounts = (data.accounts || []).filter((a: any) => a.id !== accountId && a.username !== accountId);
      await setDoc(
        globalDocRef,
        {
          accounts: updatedAccounts,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
      return true;
    }
  } catch (err) {
    console.error('Lỗi deleteAccountFromFirestore:', err);
  }
  return false;
}

/**
 * Tải toàn bộ dữ liệu thống nhất từ Firebase Firestore về thiết bị hiện tại
 */
export async function fetchAllDataFromFirestore(userScope?: string): Promise<AppSyncData | null> {
  const db = getFirebaseDb();
  if (!db) return null;

  const userId = userScope || 'u_admin';
  const cleanId = userId || 'u_admin';
  const userClassesKey = `qllh_user_${cleanId}_classes`;
  const userStudentsKey = `qllh_user_${cleanId}_students`;
  const userGradesKey = `qllh_user_${cleanId}_grades`;
  const userWeeksKey = `qllh_user_${cleanId}_weeks`;
  const userEvalsKey = `qllh_user_${cleanId}_evals`;
  const userTimetableKey = `qllh_user_${cleanId}_timetable`;
  const userYearsKey = `qllh_user_${cleanId}_years`;
  const userCurrentYearKey = `qllh_user_${cleanId}_current_year`;

  try {
    // 1. Ưu tiên đọc từ tài liệu tập trung toàn trường global_data_v1
    const globalDocRef = doc(db, 'qllh_data', APP_DATA_DOC);
    let snap = await getDoc(globalDocRef);

    // 2. Nếu global chưa có, thử đọc từ tài liệu user
    if (!snap.exists()) {
      const userDocRef = doc(db, 'qllh_user_data', getUserDataDocId(userId));
      snap = await getDoc(userDocRef);
    }

    if (snap.exists()) {
      const data = snap.data() as AppSyncData;

      // 1. Đồng bộ tài khoản người dùng
      if (data.accounts && Array.isArray(data.accounts) && data.accounts.length > 0) {
        localStorage.setItem('qllh_user_accounts', JSON.stringify(data.accounts));
        window.dispatchEvent(new CustomEvent('qllh_accounts_updated', { detail: { accounts: data.accounts } }));
      }

      // 2. Đồng bộ phân quyền học sinh
      if (data.permissions && typeof data.permissions === 'object') {
        localStorage.setItem('qllh_student_permissions', JSON.stringify(data.permissions));
      }

      // 3. Đồng bộ danh sách lớp học
      if (data.classes && Array.isArray(data.classes) && data.classes.length > 0) {
        localStorage.setItem(userClassesKey, JSON.stringify(data.classes));
        localStorage.setItem('qllh_classes_v52', JSON.stringify(data.classes));
        localStorage.setItem('qllh_classes', JSON.stringify(data.classes));
        localStorage.setItem('qllh_classes_v50', JSON.stringify(data.classes));
        localStorage.setItem('qllh_user_u_admin_classes', JSON.stringify(data.classes));
      }

      // 4. Đồng bộ danh sách học sinh
      if (data.students && Array.isArray(data.students)) {
        localStorage.setItem(userStudentsKey, JSON.stringify(data.students));
        localStorage.setItem('qllh_students_v52', JSON.stringify(data.students));
        localStorage.setItem('qllh_students', JSON.stringify(data.students));
        localStorage.setItem('qllh_students_v50', JSON.stringify(data.students));
        localStorage.setItem('qllh_user_u_admin_students', JSON.stringify(data.students));
      }

      // 5. Đồng bộ bảng điểm
      if (data.grades && typeof data.grades === 'object') {
        localStorage.setItem(userGradesKey, JSON.stringify(data.grades));
        localStorage.setItem('qllh_grade_v52', JSON.stringify(data.grades));
        localStorage.setItem('qllh_grade', JSON.stringify(data.grades));
      }

      // 6. Đồng bộ thời khóa biểu
      if (data.timetable && Array.isArray(data.timetable)) {
        localStorage.setItem(userTimetableKey, JSON.stringify(data.timetable));
        localStorage.setItem(`qllh_timetable_${cleanId}`, JSON.stringify(data.timetable));
        localStorage.setItem('qllh_timetable_matrix', JSON.stringify(data.timetable));
      }

      // 7. Đồng bộ tuần và đánh giá
      if (data.weeks && typeof data.weeks === 'object') {
        localStorage.setItem(userWeeksKey, JSON.stringify(data.weeks));
        localStorage.setItem('qllh_weeks_v52', JSON.stringify(data.weeks));
      }
      if (data.evals && typeof data.evals === 'object') {
        localStorage.setItem(userEvalsKey, JSON.stringify(data.evals));
        localStorage.setItem('qllh_eval_v52', JSON.stringify(data.evals));
      }

      // 8. Đồng bộ năm học
      if (data.years && Array.isArray(data.years)) {
        localStorage.setItem(userYearsKey, JSON.stringify(data.years));
        localStorage.setItem('qllh_years', JSON.stringify(data.years));
      }
      if (data.currentYear) {
        localStorage.setItem(userCurrentYearKey, data.currentYear);
        localStorage.setItem('qllh_current_year', data.currentYear);
      }

      // 9. Đồng bộ nhận xét & bài nộp
      if (data.commentsT && Array.isArray(data.commentsT)) {
        localStorage.setItem(`qllh_user_${cleanId}_comments_t`, JSON.stringify(data.commentsT));
        localStorage.setItem('qllh_custom_comments_t', JSON.stringify(data.commentsT));
      }
      if (data.commentsH && Array.isArray(data.commentsH)) {
        localStorage.setItem(`qllh_user_${cleanId}_comments_h`, JSON.stringify(data.commentsH));
        localStorage.setItem('qllh_custom_comments_h', JSON.stringify(data.commentsH));
      }
      if (data.quizBank && Array.isArray(data.quizBank)) {
        localStorage.setItem('qllh_quiz_bank', JSON.stringify(data.quizBank));
      }
      if (data.submissions && Array.isArray(data.submissions)) {
        localStorage.setItem('qllh_quiz_submissions', JSON.stringify(data.submissions));
      }

      // Phát sự kiện để toàn bộ giao diện cập nhật ngay lập tức
      window.dispatchEvent(new CustomEvent('qllh_data_updated', { detail: { source: 'cloud_sync', data } }));
      return data;
    }
  } catch (err) {
    console.warn('Lỗi khi đọc Firestore:', err);
  }
  return null;
}

/**
 * Lưu bài nộp trắc nghiệm của học sinh lên Firebase Firestore
 */
export async function syncQuizSubmissionToFirestore(submission: any): Promise<void> {
  try {
    const existing: any[] = JSON.parse(localStorage.getItem('qllh_quiz_submissions') || '[]');
    const updated = [submission, ...existing.filter((s) => s.id !== submission.id)];
    localStorage.setItem('qllh_quiz_submissions', JSON.stringify(updated));

    const db = getFirebaseDb();
    if (db) {
      const docRef = doc(db, 'qllh_data', APP_DATA_DOC);
      await setDoc(docRef, { submissions: updated, updatedAt: new Date().toISOString() }, { merge: true });
    }
  } catch (err) {
    console.warn('Lỗi đồng bộ kết quả bài nộp:', err);
  }
}

/**
 * Lắng nghe thay đổi dữ liệu thời gian thực từ Firestore của toàn bộ hệ thống
 */
export function subscribeToFirestoreData(
  onUpdate: (data: AppSyncData) => void,
  userScope?: string
): (() => void) | null {
  const db = getFirebaseDb();
  if (!db) return null;

  try {
    const globalDocRef = doc(db, 'qllh_data', APP_DATA_DOC);

    const unsubscribe = onSnapshot(
      globalDocRef,
      (snap) => {
        if (snap.exists()) {
          const data = snap.data() as AppSyncData;

          // Cập nhật localStorage cho các dữ liệu quan trọng
          if (data.accounts && Array.isArray(data.accounts) && data.accounts.length > 0) {
            localStorage.setItem('qllh_user_accounts', JSON.stringify(data.accounts));
            window.dispatchEvent(new CustomEvent('qllh_accounts_updated', { detail: { accounts: data.accounts } }));
          }

          if (data.classes && Array.isArray(data.classes) && data.classes.length > 0) {
            localStorage.setItem('qllh_classes_v52', JSON.stringify(data.classes));
            localStorage.setItem('qllh_classes', JSON.stringify(data.classes));
            const cleanId = (userScope || 'u_admin').replace(/[^a-zA-Z0-9_-]/g, '_');
            localStorage.setItem(`qllh_user_${cleanId}_classes`, JSON.stringify(data.classes));
          }

          if (data.students && Array.isArray(data.students)) {
            localStorage.setItem('qllh_students_v52', JSON.stringify(data.students));
            localStorage.setItem('qllh_students', JSON.stringify(data.students));
            const cleanId = (userScope || 'u_admin').replace(/[^a-zA-Z0-9_-]/g, '_');
            localStorage.setItem(`qllh_user_${cleanId}_students`, JSON.stringify(data.students));
          }

          if (data.currentYear) {
            localStorage.setItem('qllh_current_year', data.currentYear);
          }

          // Kích hoạt callback và dispatch event cho các component
          onUpdate(data);
          window.dispatchEvent(new CustomEvent('qllh_data_updated', { detail: { source: 'cloud_sync', data } }));
        }
      },
      (err) => {
        console.warn('Lỗi lắng nghe Firebase realtime:', err);
      }
    );
    return unsubscribe;
  } catch (err) {
    console.warn('Không thể thiết lập lắng nghe Firestore:', err);
    return null;
  }
}

