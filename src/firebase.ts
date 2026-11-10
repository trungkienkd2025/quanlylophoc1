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
  deletedClassIds?: string[];
  deletedClassKeys?: string[];
  deletedStudentIds?: string[];
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
 * Hợp nhất an toàn danh sách lớp giữa server và local:
 * - Đồng bộ lệnh xóa từ bất kỳ thiết bị nào qua danh sách deletedClassIds và deletedClassKeys
 * - Tuyệt đối không hồi sinh các lớp mà người dùng đã xóa trên máy khác
 * - KHỬ TRÙNG LẶP TUYỆT ĐỐI theo Tên lớp và Năm học
 */
export function mergeClassesSafely(
  serverClasses: any[],
  userScope?: string,
  serverDeletedIds?: string[],
  serverDeletedKeys?: string[]
): any[] {
  const cleanId = (userScope || 'u_admin').replace(/[^a-zA-Z0-9_-]/g, '_');
  const userClassesKey = `qllh_user_${cleanId}_classes`;

  let localClasses: any[] = [];
  try {
    const raw =
      localStorage.getItem(userClassesKey) ||
      localStorage.getItem('qllh_classes_v52') ||
      localStorage.getItem('qllh_classes');
    if (raw) {
      const p = JSON.parse(raw);
      if (Array.isArray(p)) localClasses = p;
    }
  } catch {}

  // 1. Tổng hợp danh sách đã xóa từ cả local lẫn server
  let deletedIds = new Set<string>();
  let deletedKeys = new Set<string>();
  try {
    const d = localStorage.getItem('qllh_deleted_class_ids');
    if (d) {
      const parsed = JSON.parse(d);
      if (Array.isArray(parsed)) parsed.forEach((id: string) => id && deletedIds.add(id));
    }
    const k = localStorage.getItem('qllh_deleted_class_keys');
    if (k) {
      const parsed = JSON.parse(k);
      if (Array.isArray(parsed)) parsed.forEach((key: string) => key && deletedKeys.add(key.toLowerCase().trim()));
    }
  } catch {}

  if (Array.isArray(serverDeletedIds)) {
    serverDeletedIds.forEach((id) => id && deletedIds.add(id));
  }
  if (Array.isArray(serverDeletedKeys)) {
    serverDeletedKeys.forEach((key) => key && deletedKeys.add(key.toLowerCase().trim()));
  }

  // Lưu lại vào localStorage của máy hiện tại để không bao giờ khôi phục nhầm
  try {
    localStorage.setItem('qllh_deleted_class_ids', JSON.stringify(Array.from(deletedIds)));
    localStorage.setItem('qllh_deleted_class_keys', JSON.stringify(Array.from(deletedKeys)));
  } catch {}

  const isClassDeleted = (c: any) => {
    if (!c) return true;
    if (c.id && deletedIds.has(c.id)) return true;
    const normName = (c.name || '').trim().toLowerCase();
    const normYear = (c.year || '2026-2027').trim();
    const logicKey = `${normName}__${normYear}`;
    if (deletedKeys.has(logicKey)) return true;
    return false;
  };

  // 2. Lọc bỏ các lớp đã bị chủ động xóa trên bất kỳ máy nào
  const validServer = (serverClasses || []).filter((c) => c && c.id && !isClassDeleted(c));
  const validLocal = (localClasses || []).filter((c) => c && c.id && !isClassDeleted(c));

  // 3. Khử trùng lặp đa tầng: theo Logic Key (Tên lớp chuẩn hóa + Năm học)
  const map = new Map<string, any>();

  // Nạp từ server trước (server là cơ sở dữ liệu gốc)
  validServer.forEach((c) => {
    const normName = (c.name || '').trim().toLowerCase();
    const normYear = (c.year || '2026-2027').trim();
    const logicKey = `${normName}__${normYear}`;
    map.set(logicKey, c);
  });

  // Hợp nhất từ local: chỉ thêm lớp nếu lớp chưa bị xóa
  validLocal.forEach((c) => {
    const normName = (c.name || '').trim().toLowerCase();
    const normYear = (c.year || '2026-2027').trim();
    const logicKey = `${normName}__${normYear}`;

    if (deletedKeys.has(logicKey) || (c.id && deletedIds.has(c.id))) {
      return;
    }

    if (!map.has(logicKey)) {
      map.set(logicKey, c);
    } else {
      const existing = map.get(logicKey);
      const preferredId = (c.id && c.id.startsWith('c_17') && !existing.id.startsWith('c_17'))
        ? c.id
        : existing.id;
      map.set(logicKey, {
        ...existing,
        ...c,
        id: preferredId,
        name: existing.name || c.name,
      });
    }
  });

  const merged = Array.from(map.values());

  // Cập nhật ngay vào localStorage của máy hiện tại
  try {
    localStorage.setItem(userClassesKey, JSON.stringify(merged));
    localStorage.setItem('qllh_classes_v52', JSON.stringify(merged));
    localStorage.setItem('qllh_classes', JSON.stringify(merged));
  } catch {}

  return merged;
}

/**
 * Hợp nhất an toàn danh sách học sinh giữa server và local
 */
export function mergeStudentsSafely(
  serverStudents: any[],
  userScope?: string,
  serverDeletedIds?: string[]
): any[] {
  const cleanId = (userScope || 'u_admin').replace(/[^a-zA-Z0-9_-]/g, '_');
  let localStudents: any[] = [];
  try {
    const raw =
      localStorage.getItem(`qllh_user_${cleanId}_students`) ||
      localStorage.getItem('qllh_students_v52') ||
      localStorage.getItem('qllh_students');
    if (raw) {
      const p = JSON.parse(raw);
      if (Array.isArray(p)) localStudents = p;
    }
  } catch {}

  let deletedIds = new Set<string>();
  try {
    const d = localStorage.getItem('qllh_deleted_student_ids');
    if (d) {
      const parsed = JSON.parse(d);
      if (Array.isArray(parsed)) parsed.forEach((id: string) => id && deletedIds.add(id));
    }
  } catch {}

  if (Array.isArray(serverDeletedIds)) {
    serverDeletedIds.forEach((id) => id && deletedIds.add(id));
  }

  try {
    localStorage.setItem('qllh_deleted_student_ids', JSON.stringify(Array.from(deletedIds)));
  } catch {}

  // Lấy danh sách lớp đã xóa để loại bỏ học sinh thuộc lớp đó
  let deletedClassIds = new Set<string>();
  try {
    const dc = localStorage.getItem('qllh_deleted_class_ids');
    if (dc) {
      const parsed = JSON.parse(dc);
      if (Array.isArray(parsed)) parsed.forEach((id: string) => id && deletedClassIds.add(id));
    }
  } catch {}

  const combined = [
    ...(serverStudents || []),
    ...(localStudents || []),
  ].filter((s) => s && s.id && !deletedIds.has(s.id) && !deletedClassIds.has(s.classId));

  const map = new Map<string, any>();
  combined.forEach((s) => {
    const normName = (s.name || '').trim().toLowerCase();
    const classId = (s.classId || '').trim();
    const code = (s.code || '').trim().toLowerCase();
    const key = code ? `${code}__${classId}` : (normName ? `${normName}__${classId}` : s.id);

    if (!map.has(key)) {
      map.set(key, s);
    } else {
      map.set(key, { ...map.get(key), ...s });
    }
  });

  const merged = Array.from(map.values());
  try {
    localStorage.setItem(`qllh_user_${cleanId}_students`, JSON.stringify(merged));
    localStorage.setItem('qllh_students_v52', JSON.stringify(merged));
  } catch {}

  return merged;
}

/**
 * Hợp nhất an toàn danh sách tài khoản
 */
export function mergeAccountsSafely(serverAccounts: any[]): any[] {
  let localAccounts: any[] = [];
  try {
    const raw = localStorage.getItem('qllh_user_accounts');
    if (raw) {
      const p = JSON.parse(raw);
      if (Array.isArray(p)) localAccounts = p;
    }
  } catch {}

  let deletedIds = new Set<string>();
  try {
    const d = localStorage.getItem('qllh_deleted_account_ids');
    if (d) deletedIds = new Set(JSON.parse(d));
  } catch {}

  const map = new Map<string, any>();
  (serverAccounts || []).forEach((a) => {
    const key = a?.id || a?.username;
    if (key && !deletedIds.has(key)) {
      map.set(key, a);
    }
  });
  (localAccounts || []).forEach((a) => {
    const key = a?.id || a?.username;
    if (key && !deletedIds.has(key)) {
      if (!map.has(key)) {
        map.set(key, a);
      } else {
        map.set(key, { ...map.get(key), ...a });
      }
    }
  });
  return Array.from(map.values());
}

/**
 * Tiện ích thực thi Promise với giới hạn thời gian (Timeout), ngăn chặn treo xoay spinner
 */
export function withTimeout<T>(promise: Promise<T>, timeoutMs: number, fallbackValue: T): Promise<T> {
  let timer: any;
  const timeoutPromise = new Promise<T>((resolve) => {
    timer = setTimeout(() => resolve(fallbackValue), timeoutMs);
  });
  return Promise.race([promise, timeoutPromise]).then((res) => {
    clearTimeout(timer);
    return res;
  });
}

export interface PushResult {
  success: boolean;
  data: AppSyncData;
}

/**
 * Đẩy toàn bộ dữ liệu (tài khoản, lớp, học sinh, điểm, TKB...) lên Firebase Firestore
 * Tối ưu hóa: giới hạn thời gian tối đa 1.5s, không bao giờ làm treo giao diện
 */
export async function pushAllDataToFirestore(userScope?: string, accountsOverride?: any[]): Promise<boolean> {
  const res = await pushAllDataToFirestoreEx(userScope, accountsOverride);
  return res.success;
}

export async function pushAllDataToFirestoreEx(userScope?: string, accountsOverride?: any[]): Promise<PushResult> {
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

  const db = getFirebaseDb();
  if (db) {
    const globalDocRef = doc(db, 'qllh_data', APP_DATA_DOC);
    try {
      const existingSnap: any = await withTimeout(getDoc(globalDocRef), 800, null);
      if (existingSnap && existingSnap.exists()) {
        const serverData = existingSnap.data() as AppSyncData;

        finalClasses = mergeClassesSafely(serverData.classes || [], userId, serverData.deletedClassIds, serverData.deletedClassKeys);
        finalStudents = mergeStudentsSafely(serverData.students || [], userId, serverData.deletedStudentIds);
        finalAccounts = mergeAccountsSafely(serverData.accounts || []);

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
      console.warn('Đọc Firestore nhẹ trước hợp nhất:', err);
    }
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
    deletedClassIds: JSON.parse(localStorage.getItem('qllh_deleted_class_ids') || '[]'),
    deletedClassKeys: JSON.parse(localStorage.getItem('qllh_deleted_class_keys') || '[]'),
    deletedStudentIds: JSON.parse(localStorage.getItem('qllh_deleted_student_ids') || '[]'),
  };

  if (!db) {
    return { success: false, data: payload };
  }

  try {
    const globalDocRef = doc(db, 'qllh_data', APP_DATA_DOC);
    const userDocRef = doc(db, 'qllh_user_data', getUserDataDocId(userId));
    const writeTask = Promise.allSettled([
      setDoc(globalDocRef, payload, { merge: true }),
      setDoc(userDocRef, payload, { merge: true }),
    ]);
    await withTimeout(writeTask, 1400, null);
    return { success: true, data: payload };
  } catch (err: any) {
    console.warn('Lỗi ghi Firestore (dữ liệu vẫn an toàn trên thiết bị):', err?.message || err);
    return { success: false, data: payload };
  }
}

/**
 * Xóa vĩnh viễn một lớp học khỏi hệ thống và đồng bộ ngay lên Firestore
 */
/**
 * Xóa vĩnh viễn một lớp học khỏi hệ thống và đồng bộ ngay lên Firestore
 * - Hỗ trợ truyền tên lớp và năm học để tạo khóa logicKey (ví dụ: '1/2__2026-2027')
 * - Đồng bộ lệnh xóa sang tất cả máy tính và thiết bị khác qua deletedClassIds và deletedClassKeys
 */
export async function deleteClassFromFirestore(
  classId: string,
  className?: string,
  classYear?: string,
  userScope?: string
): Promise<boolean> {
  const cleanId = (userScope || 'u_admin').replace(/[^a-zA-Z0-9_-]/g, '_');
  const normName = (className || '').trim().toLowerCase();
  const normYear = (classYear || '2026-2027').trim();
  const logicKey = normName ? `${normName}__${normYear}` : '';

  // 1. Ghi nhận ngay vào danh sách đã xóa trên local storage
  let currentDeletedIds: string[] = [];
  let currentDeletedKeys: string[] = [];
  try {
    currentDeletedIds = JSON.parse(localStorage.getItem('qllh_deleted_class_ids') || '[]');
    if (classId && !currentDeletedIds.includes(classId)) {
      currentDeletedIds.push(classId);
    }
    localStorage.setItem('qllh_deleted_class_ids', JSON.stringify(currentDeletedIds));

    currentDeletedKeys = JSON.parse(localStorage.getItem('qllh_deleted_class_keys') || '[]');
    if (logicKey && !currentDeletedKeys.includes(logicKey)) {
      currentDeletedKeys.push(logicKey);
    }
    localStorage.setItem('qllh_deleted_class_keys', JSON.stringify(currentDeletedKeys));
  } catch {}

  // 2. Xóa triệt để khỏi TẤT CẢ các khóa local storage trên máy tính này
  const purgeClassesFromLocal = (key: string) => {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return;
      const list = JSON.parse(raw);
      if (Array.isArray(list)) {
        const filtered = list.filter((c: any) => {
          if (!c) return false;
          if (c.id === classId) return false;
          if (logicKey) {
            const k = (c.name || '').trim().toLowerCase() + '__' + (c.year || '2026-2027').trim();
            if (k === logicKey) return false;
          }
          return true;
        });
        localStorage.setItem(key, JSON.stringify(filtered));
      }
    } catch {}
  };

  purgeClassesFromLocal(`qllh_user_${cleanId}_classes`);
  purgeClassesFromLocal('qllh_classes_v52');
  purgeClassesFromLocal('qllh_classes');
  purgeClassesFromLocal('qllh_classes_v50');
  purgeClassesFromLocal('qllh_user_u_admin_classes');

  // Xóa học sinh của lớp khỏi local
  const purgeStudentsFromLocal = (key: string) => {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return;
      const list = JSON.parse(raw);
      if (Array.isArray(list)) {
        const filtered = list.filter((s: any) => s && s.classId !== classId);
        localStorage.setItem(key, JSON.stringify(filtered));
      }
    } catch {}
  };
  purgeStudentsFromLocal(`qllh_user_${cleanId}_students`);
  purgeStudentsFromLocal('qllh_students_v52');
  purgeStudentsFromLocal('qllh_students');

  // 3. Cập nhật ngay lên Firestore
  const db = getFirebaseDb();
  if (!db) return false;
  try {
    const globalDocRef = doc(db, 'qllh_data', APP_DATA_DOC);
    const userDocRef = doc(db, 'qllh_user_data', getUserDataDocId(cleanId));

    const snap: any = await withTimeout(getDoc(globalDocRef), 800, null);
    if (snap && snap.exists()) {
      const data = snap.data() as AppSyncData;
      const updatedClasses = (data.classes || []).filter((c: any) => {
        if (!c) return false;
        if (c.id === classId) return false;
        if (logicKey) {
          const k = (c.name || '').trim().toLowerCase() + '__' + (c.year || '2026-2027').trim();
          if (k === logicKey) return false;
        }
        return true;
      });
      const updatedStudents = (data.students || []).filter((s: any) => s && s.classId !== classId);

      const mergedDeletedIds = Array.from(new Set([...(data.deletedClassIds || []), ...currentDeletedIds, classId]));
      const mergedDeletedKeys = Array.from(new Set([...(data.deletedClassKeys || []), ...currentDeletedKeys, ...(logicKey ? [logicKey] : [])]));

      const payload = {
        classes: updatedClasses,
        students: updatedStudents,
        deletedClassIds: mergedDeletedIds,
        deletedClassKeys: mergedDeletedKeys,
        updatedAt: new Date().toISOString(),
      };

      await Promise.allSettled([
        setDoc(globalDocRef, payload, { merge: true }),
        setDoc(userDocRef, payload, { merge: true }),
      ]);
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
  let currentDeletedStudentIds: string[] = [];
  try {
    currentDeletedStudentIds = JSON.parse(localStorage.getItem('qllh_deleted_student_ids') || '[]');
    if (!currentDeletedStudentIds.includes(studentId)) {
      currentDeletedStudentIds.push(studentId);
      localStorage.setItem('qllh_deleted_student_ids', JSON.stringify(currentDeletedStudentIds));
    }
  } catch {}

  const db = getFirebaseDb();
  if (!db) return false;
  try {
    const globalDocRef = doc(db, 'qllh_data', APP_DATA_DOC);
    const snap: any = await withTimeout(getDoc(globalDocRef), 800, null);
    if (snap && snap.exists()) {
      const data = snap.data() as AppSyncData;
      const updatedStudents = (data.students || []).filter((s: any) => s.id !== studentId);
      const mergedDeletedStudentIds = Array.from(new Set([...(data.deletedStudentIds || []), ...currentDeletedStudentIds, studentId]));
      await setDoc(
        globalDocRef,
        {
          students: updatedStudents,
          deletedStudentIds: mergedDeletedStudentIds,
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
  try {
    const d: string[] = JSON.parse(localStorage.getItem('qllh_deleted_account_ids') || '[]');
    if (!d.includes(accountId)) {
      d.push(accountId);
      localStorage.setItem('qllh_deleted_account_ids', JSON.stringify(d));
    }
  } catch {}

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
    // 1. Ưu tiên đọc từ tài liệu tập trung toàn trường global_data_v1 (tối đa 1.2s)
    const globalDocRef = doc(db, 'qllh_data', APP_DATA_DOC);
    let snap: any = await withTimeout(getDoc(globalDocRef), 1200, null);

    // 2. Nếu global chưa có, thử đọc từ tài liệu user
    if (!snap || !snap.exists()) {
      const userDocRef = doc(db, 'qllh_user_data', getUserDataDocId(userId));
      snap = await withTimeout(getDoc(userDocRef), 1200, null);
    }

    if (snap && snap.exists()) {
      const data = snap.data() as AppSyncData;

      // 1. Đồng bộ tài khoản người dùng
      if (data.accounts && Array.isArray(data.accounts) && data.accounts.length > 0) {
        const mergedAccounts = mergeAccountsSafely(data.accounts);
        localStorage.setItem('qllh_user_accounts', JSON.stringify(mergedAccounts));
        data.accounts = mergedAccounts;
        window.dispatchEvent(new CustomEvent('qllh_accounts_updated', { detail: { accounts: mergedAccounts } }));
      }

      // 2. Đồng bộ phân quyền học sinh
      if (data.permissions && typeof data.permissions === 'object') {
        localStorage.setItem('qllh_student_permissions', JSON.stringify(data.permissions));
      }

      // 3. Đồng bộ danh sách lớp học (Hợp nhất an toàn, không bao giờ mất lớp khi F5)
      if (data.classes && Array.isArray(data.classes)) {
        const mergedClasses = mergeClassesSafely(data.classes, userId, data.deletedClassIds, data.deletedClassKeys);
        localStorage.setItem(userClassesKey, JSON.stringify(mergedClasses));
        localStorage.setItem('qllh_classes_v52', JSON.stringify(mergedClasses));
        localStorage.setItem('qllh_classes', JSON.stringify(mergedClasses));
        localStorage.setItem('qllh_classes_v50', JSON.stringify(mergedClasses));
        localStorage.setItem('qllh_user_u_admin_classes', JSON.stringify(mergedClasses));
        data.classes = mergedClasses;
      }

      // 4. Đồng bộ danh sách học sinh (Hợp nhất an toàn)
      if (data.students && Array.isArray(data.students)) {
        const mergedStudents = mergeStudentsSafely(data.students, userId, data.deletedStudentIds);
        localStorage.setItem(userStudentsKey, JSON.stringify(mergedStudents));
        localStorage.setItem('qllh_students_v52', JSON.stringify(mergedStudents));
        localStorage.setItem('qllh_students', JSON.stringify(mergedStudents));
        localStorage.setItem('qllh_students_v50', JSON.stringify(mergedStudents));
        localStorage.setItem('qllh_user_u_admin_students', JSON.stringify(mergedStudents));
        data.students = mergedStudents;
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
          const rawData = snap.data() as AppSyncData;
          const cleanId = (userScope || 'u_admin').replace(/[^a-zA-Z0-9_-]/g, '_');

          // Hợp nhất tài khoản an toàn
          let finalAccounts = rawData.accounts || [];
          if (Array.isArray(rawData.accounts) && rawData.accounts.length > 0) {
            finalAccounts = mergeAccountsSafely(rawData.accounts);
            localStorage.setItem('qllh_user_accounts', JSON.stringify(finalAccounts));
            window.dispatchEvent(new CustomEvent('qllh_accounts_updated', { detail: { accounts: finalAccounts } }));
          }

          // Hợp nhất lớp học an toàn (KHÔNG BAO GIỜ XÓA MẤT LỚP MỚI TẠO CỦA USER KHI F5 HOẶC SNAPSHOT)
          let finalClasses = rawData.classes || [];
          if (Array.isArray(rawData.classes)) {
            finalClasses = mergeClassesSafely(rawData.classes, userScope, rawData.deletedClassIds, rawData.deletedClassKeys);
            localStorage.setItem('qllh_classes_v52', JSON.stringify(finalClasses));
            localStorage.setItem('qllh_classes', JSON.stringify(finalClasses));
            localStorage.setItem(`qllh_user_${cleanId}_classes`, JSON.stringify(finalClasses));
            localStorage.setItem('qllh_user_u_admin_classes', JSON.stringify(finalClasses));
          }

          // Hợp nhất học sinh an toàn
          let finalStudents = rawData.students || [];
          if (Array.isArray(rawData.students)) {
            finalStudents = mergeStudentsSafely(rawData.students, userScope, rawData.deletedStudentIds);
            localStorage.setItem('qllh_students_v52', JSON.stringify(finalStudents));
            localStorage.setItem('qllh_students', JSON.stringify(finalStudents));
            localStorage.setItem(`qllh_user_${cleanId}_students`, JSON.stringify(finalStudents));
            localStorage.setItem('qllh_user_u_admin_students', JSON.stringify(finalStudents));
          }

          if (rawData.currentYear) {
            localStorage.setItem('qllh_current_year', rawData.currentYear);
          }

          const safeData: AppSyncData = {
            ...rawData,
            accounts: finalAccounts,
            classes: finalClasses,
            students: finalStudents,
          };

          // Kích hoạt callback và dispatch event cho các component
          onUpdate(safeData);
          window.dispatchEvent(new CustomEvent('qllh_data_updated', { detail: { source: 'cloud_sync', data: safeData } }));
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

