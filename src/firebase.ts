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

const APP_DATA_DOC = 'global_data_v1';

export interface AppSyncData {
  classes: any[];
  students: any[];
  grades: Record<string, any>;
  timetable: any[];
  weeks: Record<string, any>;
  evals: Record<string, any>;
  years: string[];
  currentYear: string;
  submissions?: any[];
  ownerId?: string;
  updatedAt: string;
}

export function getUserDataDocId(userScope?: string): string {
  const clean = (userScope || 'u_admin').trim().replace(/[^a-zA-Z0-9_-]/g, '_');
  return `user_${clean}`;
}

/**
 * Đẩy toàn bộ dữ liệu của tài khoản hiện tại lên Firebase Firestore độc lập
 */
export async function pushAllDataToFirestore(userScope?: string): Promise<boolean> {
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

  const getStoredClasses = () => {
    try {
      const u = localStorage.getItem(userClassesKey);
      if (u) return JSON.parse(u);
      if (userId === 'u_admin' || userId === 'trungkienkd2025') {
        const v = localStorage.getItem('qllh_classes_v52') || localStorage.getItem('qllh_classes');
        return v ? JSON.parse(v) : [];
      }
      return [];
    } catch { return []; }
  };

  const getStoredStudents = () => {
    try {
      const u = localStorage.getItem(userStudentsKey);
      if (u) return JSON.parse(u);
      if (userId === 'u_admin' || userId === 'trungkienkd2025') {
        const v = localStorage.getItem('qllh_students_v52') || localStorage.getItem('qllh_students');
        return v ? JSON.parse(v) : [];
      }
      return [];
    } catch { return []; }
  };

  const getStoredGrades = () => {
    try {
      const u = localStorage.getItem(userGradesKey);
      if (u) return JSON.parse(u);
      if (userId === 'u_admin' || userId === 'trungkienkd2025') {
        const v = localStorage.getItem('qllh_grade_v52') || localStorage.getItem('qllh_grade');
        return v ? JSON.parse(v) : {};
      }
      return {};
    } catch { return {}; }
  };

  const payload: AppSyncData = {
    classes: getStoredClasses(),
    students: getStoredStudents(),
    grades: getStoredGrades(),
    timetable: JSON.parse(localStorage.getItem(userTimetableKey) || localStorage.getItem(`qllh_timetable_${cleanId}`) || '[]'),
    weeks: JSON.parse(localStorage.getItem(userWeeksKey) || '{}'),
    evals: JSON.parse(localStorage.getItem(userEvalsKey) || '{}'),
    years: JSON.parse(localStorage.getItem(userYearsKey) || '["2026-2027", "2025-2026"]'),
    currentYear: localStorage.getItem(userCurrentYearKey) || '2026-2027',
    submissions: JSON.parse(localStorage.getItem('qllh_quiz_submissions') || '[]'),
    ownerId: userId,
    updatedAt: new Date().toISOString(),
  };

  // Lưu vào tài liệu độc lập của tài khoản
  const userDocRef = doc(db, 'qllh_user_data', getUserDataDocId(userId));
  await setDoc(userDocRef, payload, { merge: true });

  // Nếu là tài khoản Quản trị viên tối cao (Thầy Kiên), cập nhật tài liệu global_data_v1
  if (userId === 'u_admin' || userId === 'trungkienkd2025') {
    const globalDocRef = doc(db, 'qllh_data', APP_DATA_DOC);
    await setDoc(globalDocRef, payload, { merge: true });
  }

  return true;
}

/**
 * Tải toàn bộ dữ liệu từ Firebase Firestore về localStorage của tài khoản hiện tại
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
    // 1. Thử đọc từ tài liệu riêng của user
    const userDocRef = doc(db, 'qllh_user_data', getUserDataDocId(userId));
    let snap = await getDoc(userDocRef);

    // 2. Nếu chưa có và là admin, đọc từ global_data_v1
    if (!snap.exists() && (userId === 'u_admin' || userId === 'trungkienkd2025')) {
      const globalDocRef = doc(db, 'qllh_data', APP_DATA_DOC);
      snap = await getDoc(globalDocRef);
    }

    if (snap.exists()) {
      const data = snap.data() as AppSyncData;
      // Ghi an toàn vào storage riêng của user
      if (data.classes && Array.isArray(data.classes)) {
        localStorage.setItem(userClassesKey, JSON.stringify(data.classes));
        if (userId === 'u_admin') {
          localStorage.setItem('qllh_classes_v52', JSON.stringify(data.classes));
          localStorage.setItem('qllh_classes', JSON.stringify(data.classes));
        }
      }
      if (data.students && Array.isArray(data.students)) {
        localStorage.setItem(userStudentsKey, JSON.stringify(data.students));
        if (userId === 'u_admin') {
          localStorage.setItem('qllh_students_v52', JSON.stringify(data.students));
          localStorage.setItem('qllh_students', JSON.stringify(data.students));
        }
      }
      if (data.grades && typeof data.grades === 'object') {
        localStorage.setItem(userGradesKey, JSON.stringify(data.grades));
        if (userId === 'u_admin') {
          localStorage.setItem('qllh_grade_v52', JSON.stringify(data.grades));
        }
      }
      if (data.timetable && Array.isArray(data.timetable)) {
        localStorage.setItem(userTimetableKey, JSON.stringify(data.timetable));
        localStorage.setItem(`qllh_timetable_${cleanId}`, JSON.stringify(data.timetable));
      }
      if (data.weeks && typeof data.weeks === 'object') {
        localStorage.setItem(userWeeksKey, JSON.stringify(data.weeks));
      }
      if (data.evals && typeof data.evals === 'object') {
        localStorage.setItem(userEvalsKey, JSON.stringify(data.evals));
      }
      if (data.years && Array.isArray(data.years)) {
        localStorage.setItem(userYearsKey, JSON.stringify(data.years));
      }
      if (data.currentYear) {
        localStorage.setItem(userCurrentYearKey, data.currentYear);
      }
      if (data.submissions && data.submissions.length > 0) {
        localStorage.setItem('qllh_quiz_submissions', JSON.stringify(data.submissions));
      }
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
    // 1. Lưu local trước
    const existing: any[] = JSON.parse(localStorage.getItem('qllh_quiz_submissions') || '[]');
    const updated = [submission, ...existing.filter((s) => s.id !== submission.id)];
    localStorage.setItem('qllh_quiz_submissions', JSON.stringify(updated));

    // 2. Đẩy lên Firestore nếu có kết nối
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
 * Lắng nghe thay đổi dữ liệu thời gian thực từ Firestore của tài khoản
 */
export function subscribeToFirestoreData(
  onUpdate: (data: AppSyncData) => void,
  userScope?: string
): (() => void) | null {
  const db = getFirebaseDb();
  if (!db) return null;

  const userId = userScope || 'u_admin';

  try {
    const docRef =
      userId === 'u_admin' || userId === 'trungkienkd2025'
        ? doc(db, 'qllh_data', APP_DATA_DOC)
        : doc(db, 'qllh_user_data', getUserDataDocId(userId));

    const unsubscribe = onSnapshot(
      docRef,
      (snap) => {
        if (snap.exists()) {
          const data = snap.data() as AppSyncData;
          onUpdate(data);
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

