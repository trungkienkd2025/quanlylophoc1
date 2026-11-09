import {
  initFirebase,
  getFirebaseDb,
  pushAllDataToFirestore,
  fetchAllDataFromFirestore,
} from '../firebase';
import { UserAccount } from '../types';
import { getUserScopeId } from './userScope';

export interface SystemBackupData {
  version: string;
  backupDate: string;
  ownerId?: string;
  ownerName?: string;
  currentYear: string;
  years: string[];
  classes: any[];
  students: any[];
  grades: Record<string, any>;
  timetable: any[];
  weeks: Record<string, any>;
  evals: Record<string, any>;
  quizBank?: any[];
  submissions?: any[];
  gradeSortType?: string;
  commentsT?: string[];
  commentsH?: string[];
}

/**
 * Tạo danh sách các khóa lưu trữ cục bộ riêng biệt cho từng tài khoản người dùng
 */
export function getUserStorageKeys(userId: string) {
  const cleanId = userId || 'u_admin';
  return {
    CLASSES: `qllh_user_${cleanId}_classes`,
    STUDENTS: `qllh_user_${cleanId}_students`,
    GRADES: `qllh_user_${cleanId}_grades`,
    WEEKS: `qllh_user_${cleanId}_weeks`,
    EVALS: `qllh_user_${cleanId}_evals`,
    TIMETABLE: `qllh_user_${cleanId}_timetable`,
    YEARS: `qllh_user_${cleanId}_years`,
    CURRENT_YEAR: `qllh_user_${cleanId}_current_year`,
    VAULT: `qllh_user_${cleanId}_vault`,
    COMMENTS_T: `qllh_user_${cleanId}_comments_t`,
    COMMENTS_H: `qllh_user_${cleanId}_comments_h`,
    GRADE_SORT: `qllh_user_${cleanId}_grade_sort`,
  };
}

// Khóa lưu trữ dùng chung cho phiên bản cũ (legacy fallback cho u_admin)
const LEGACY_STORAGE_KEYS = {
  CURRENT_YEAR: 'qllh_current_year',
  YEARS: 'qllh_years',
  CLASSES_CANONICAL: 'qllh_classes',
  CLASSES_V52: 'qllh_classes_v52',
  CLASSES_V50: 'qllh_classes_v50',
  STUDENTS_CANONICAL: 'qllh_students',
  STUDENTS_V52: 'qllh_students_v52',
  STUDENTS_V50: 'qllh_students_v50',
  GRADE_CANONICAL: 'qllh_grade',
  GRADE_V52: 'qllh_grade_v52',
  GRADE_V50: 'qllh_grade_v50',
  WEEKS_V52: 'qllh_weeks_v52',
  EVAL_V52: 'qllh_eval_v52',
  TIMETABLE: 'qllh_timetable_matrix',
  VAULT: 'qllh_permanent_vault',
  LAST_CLOUD_SYNC: 'qllh_last_cloud_sync',
  GRADE_SORT: 'qllh_grade_sort_type',
};

// Dữ liệu lớp mẫu mặc định cho Quản trị viên chính (u_admin)
const DEFAULT_ADMIN_CLASSES = [
  { id: 'c1', year: '2026-2027', name: '1/1 (ĐIỆP)', grade: 'Khối 1', bg: 'bg-indigo-50 border-indigo-200', createdBy: 'u_admin', createdByName: 'Thầy Trần Trung Kiên' },
  { id: 'c_1794239990637', year: '2026-2027', name: '1/2', grade: 'Khối 1', bg: 'bg-indigo-50 border-indigo-200', createdBy: 'u_admin', createdByName: 'Thầy Trần Trung Kiên' },
  { id: 'c_1794240001067', year: '2026-2027', name: '1/3', grade: 'Khối 1', bg: 'bg-indigo-50 border-indigo-200', createdBy: 'u_admin', createdByName: 'Thầy Trần Trung Kiên' },
  { id: 'c_1794240007860', year: '2026-2027', name: '1/4', grade: 'Khối 1', bg: 'bg-indigo-50 border-indigo-200', createdBy: 'u_admin', createdByName: 'Thầy Trần Trung Kiên' },
  { id: 'c_1794240020924', year: '2026-2027', name: '1/5', grade: 'Khối 1', bg: 'bg-indigo-50 border-indigo-200', createdBy: 'u_admin', createdByName: 'Thầy Trần Trung Kiên' },
  { id: 'c3', year: '2026-2027', name: '2/1 (ĐĂNG)', grade: 'Khối 2', bg: 'bg-blue-50 border-blue-200', createdBy: 'u_admin', createdByName: 'Thầy Trần Trung Kiên' },
  { id: 'c_1794240029212', year: '2026-2027', name: '2/2', grade: 'Khối 1', bg: 'bg-indigo-50 border-indigo-200', createdBy: 'u_admin', createdByName: 'Thầy Trần Trung Kiên' },
  { id: 'c_1794240034468', year: '2026-2027', name: '2/3', grade: 'Khối 1', bg: 'bg-indigo-50 border-indigo-200', createdBy: 'u_admin', createdByName: 'Thầy Trần Trung Kiên' },
  { id: 'c_1794240039396', year: '2026-2027', name: '2/4', grade: 'Khối 1', bg: 'bg-indigo-50 border-indigo-200', createdBy: 'u_admin', createdByName: 'Thầy Trần Trung Kiên' },
  { id: 'c2', year: '2026-2027', name: '3/1 (ANH)', grade: 'Khối 3', bg: 'bg-amber-50 border-amber-200', createdBy: 'u_admin', createdByName: 'Thầy Trần Trung Kiên' },
  { id: 'c_1794240048892', year: '2026-2027', name: '3/2', grade: 'Khối 1', bg: 'bg-indigo-50 border-indigo-200', createdBy: 'u_admin', createdByName: 'Thầy Trần Trung Kiên' },
  { id: 'c_1794240058892', year: '2026-2027', name: '3/3', grade: 'Khối 1', bg: 'bg-indigo-50 border-indigo-200', createdBy: 'u_admin', createdByName: 'Thầy Trần Trung Kiên' },
  { id: 'c4', year: '2025-2026', name: '4/1 (HOÀNG)', grade: 'Khối 4', bg: 'bg-teal-50 border-teal-200', createdBy: 'u_admin', createdByName: 'Thầy Trần Trung Kiên' },
];

/**
 * Đọc danh sách lớp học của riêng tài khoản đang đăng nhập
 * - Tự động khử trùng lặp theo Tên lớp và Năm học
 */
export function getSavedClasses(user?: UserAccount | string | null): any[] {
  const userId = getUserScopeId(user);
  const keys = getUserStorageKeys(userId);

  const deduplicateList = (items: any[]) => {
    if (!Array.isArray(items)) return [];
    const map = new Map<string, any>();
    items.forEach((c) => {
      if (!c || !c.name) return;
      const k = (c.name || '').trim().toLowerCase() + '__' + (c.year || '2026-2027').trim();
      if (!map.has(k)) {
        map.set(k, c);
      } else {
        const existing = map.get(k);
        const prefId = (c.id && c.id.startsWith('c_17') && !existing.id.startsWith('c_17')) ? c.id : existing.id;
        map.set(k, { ...existing, ...c, id: prefId });
      }
    });
    return Array.from(map.values());
  };

  try {
    const userClassesJson = localStorage.getItem(keys.CLASSES);
    if (userClassesJson) {
      const parsed = JSON.parse(userClassesJson);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return deduplicateList(parsed);
      }
    }

    // Nếu là Quản trị viên tối cao (u_admin), kiểm tra dữ liệu cũ để tự động chuyển tiếp
    if (userId === 'u_admin' || userId === 'trungkienkd2025') {
      const v52 = localStorage.getItem(LEGACY_STORAGE_KEYS.CLASSES_V52);
      if (v52) {
        const parsed = JSON.parse(v52);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const tagged = deduplicateList(parsed).map((c: any) => ({
            ...c,
            createdBy: c.createdBy || 'u_admin',
            createdByName: c.createdByName || 'Thầy Trần Trung Kiên',
          }));
          localStorage.setItem(keys.CLASSES, JSON.stringify(tagged));
          return tagged;
        }
      }
      const canonical = localStorage.getItem(LEGACY_STORAGE_KEYS.CLASSES_CANONICAL);
      if (canonical) {
        const parsed = JSON.parse(canonical);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const tagged = deduplicateList(parsed).map((c: any) => ({
            ...c,
            createdBy: c.createdBy || 'u_admin',
            createdByName: c.createdByName || 'Thầy Trần Trung Kiên',
          }));
          localStorage.setItem(keys.CLASSES, JSON.stringify(tagged));
          return tagged;
        }
      }
      // Dữ liệu mẫu ban đầu chuẩn hóa cho admin
      localStorage.setItem(keys.CLASSES, JSON.stringify(DEFAULT_ADMIN_CLASSES));
      return DEFAULT_ADMIN_CLASSES;
    }

    // Với tài khoản giáo viên: khôi phục từ kho đám mây đã đồng bộ (qllh_classes_v52 / qllh_classes)
    const sharedClasses = localStorage.getItem(LEGACY_STORAGE_KEYS.CLASSES_V52) || localStorage.getItem(LEGACY_STORAGE_KEYS.CLASSES_CANONICAL);
    if (sharedClasses) {
      const parsed = JSON.parse(sharedClasses);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const myClasses = deduplicateList(parsed).filter((c: any) => {
          return c.createdBy === userId || (typeof user === 'object' && user?.username && c.createdBy === user.username);
        });
        if (myClasses.length > 0) {
          localStorage.setItem(keys.CLASSES, JSON.stringify(myClasses));
          return myClasses;
        }
      }
    }
  } catch (e) {
    console.error('Error reading classes:', e);
  }
  return [];
}

/**
 * Đọc danh sách học sinh của riêng tài khoản đang đăng nhập
 */
export function getSavedStudents(user?: UserAccount | string | null): any[] {
  const userId = getUserScopeId(user);
  const keys = getUserStorageKeys(userId);

  try {
    const userStudentsJson = localStorage.getItem(keys.STUDENTS);
    if (userStudentsJson) {
      const parsed = JSON.parse(userStudentsJson);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }

    // Tự động chuyển tiếp dữ liệu cũ cho tài khoản Quản trị viên chính
    if (userId === 'u_admin' || userId === 'trungkienkd2025') {
      const v52 = localStorage.getItem(LEGACY_STORAGE_KEYS.STUDENTS_V52);
      if (v52) {
        const parsed = JSON.parse(v52);
        if (Array.isArray(parsed) && parsed.length > 0) {
          localStorage.setItem(keys.STUDENTS, JSON.stringify(parsed));
          return parsed;
        }
      }
      const canonical = localStorage.getItem(LEGACY_STORAGE_KEYS.STUDENTS_CANONICAL);
      if (canonical) {
        const parsed = JSON.parse(canonical);
        if (Array.isArray(parsed) && parsed.length > 0) {
          localStorage.setItem(keys.STUDENTS, JSON.stringify(parsed));
          return parsed;
        }
      }
    }

    // Khôi phục học sinh từ kho đám mây chung nếu tài khoản vừa đăng nhập thiết bị mới
    const sharedStudents = localStorage.getItem(LEGACY_STORAGE_KEYS.STUDENTS_V52) || localStorage.getItem(LEGACY_STORAGE_KEYS.STUDENTS_CANONICAL);
    if (sharedStudents) {
      const parsed = JSON.parse(sharedStudents);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const userCls = getSavedClasses(user);
        if (userCls.length > 0) {
          const userClassIds = new Set(userCls.map((c: any) => c.id));
          const myStudents = parsed.filter((s: any) => userClassIds.has(s.classId));
          if (myStudents.length > 0) {
            localStorage.setItem(keys.STUDENTS, JSON.stringify(myStudents));
            return myStudents;
          }
        }
      }
    }
  } catch (e) {
    console.error('Error reading students:', e);
  }
  return [];
}

/**
 * Đọc bảng điểm của riêng tài khoản đang đăng nhập
 */
export function getSavedGrades(user?: UserAccount | string | null): Record<string, any> {
  const userId = getUserScopeId(user);
  const keys = getUserStorageKeys(userId);

  try {
    const userGradesJson = localStorage.getItem(keys.GRADES);
    if (userGradesJson) {
      const parsed = JSON.parse(userGradesJson);
      if (parsed && typeof parsed === 'object') return parsed;
    }

    if (userId === 'u_admin' || userId === 'trungkienkd2025') {
      const v52 = localStorage.getItem(LEGACY_STORAGE_KEYS.GRADE_V52);
      if (v52) {
        const parsed = JSON.parse(v52);
        if (parsed && typeof parsed === 'object') {
          localStorage.setItem(keys.GRADES, JSON.stringify(parsed));
          return parsed;
        }
      }
    }
  } catch (e) {
    console.error('Error reading grades:', e);
  }
  return {};
}

/**
 * Đọc dữ liệu thời gian tuần học của riêng tài khoản
 */
export function getSavedWeeks(user?: UserAccount | string | null): Record<string, any> {
  const userId = getUserScopeId(user);
  const keys = getUserStorageKeys(userId);

  try {
    const json = localStorage.getItem(keys.WEEKS);
    if (json) return JSON.parse(json);
    if (userId === 'u_admin' || userId === 'trungkienkd2025') {
      const v52 = localStorage.getItem(LEGACY_STORAGE_KEYS.WEEKS_V52);
      if (v52) return JSON.parse(v52);
    }
  } catch {}
  return {};
}

/**
 * Đọc dữ liệu đánh giá tuần của riêng tài khoản
 */
export function getSavedEvals(user?: UserAccount | string | null): Record<string, any> {
  const userId = getUserScopeId(user);
  const keys = getUserStorageKeys(userId);

  try {
    const json = localStorage.getItem(keys.EVALS);
    if (json) return JSON.parse(json);
    if (userId === 'u_admin' || userId === 'trungkienkd2025') {
      const v52 = localStorage.getItem(LEGACY_STORAGE_KEYS.EVAL_V52);
      if (v52) return JSON.parse(v52);
    }
  } catch {}
  return {};
}

/**
 * Đọc thời khóa biểu của riêng tài khoản
 */
export function getSavedTimetable(user?: UserAccount | string | null): string[][] {
  const userId = getUserScopeId(user);
  const keys = getUserStorageKeys(userId);

  try {
    const json = localStorage.getItem(keys.TIMETABLE);
    if (json) return JSON.parse(json);
    // Kiểm tra khóa timetable cá nhân
    const userTtKey = `qllh_timetable_${userId}`;
    const userTt = localStorage.getItem(userTtKey);
    if (userTt) return JSON.parse(userTt);

    if (userId === 'u_admin' || userId === 'trungkienkd2025') {
      const legacy = localStorage.getItem(LEGACY_STORAGE_KEYS.TIMETABLE);
      if (legacy) return JSON.parse(legacy);
    }
  } catch {}

  // Ma trận mặc định 7 tiết x 5 ngày
  return [
    ['', '', '', '', ''],
    ['', '', '', '', ''],
    ['', '', '', '', ''],
    ['', '', '', '', ''],
    ['', '', '', '', ''],
    ['', '', '', '', ''],
    ['', '', '', '', ''],
  ];
}

/**
 * Đọc danh sách năm học của tài khoản
 */
export function getSavedYears(user?: UserAccount | string | null): string[] {
  const userId = getUserScopeId(user);
  const keys = getUserStorageKeys(userId);

  try {
    const json = localStorage.getItem(keys.YEARS);
    if (json) return JSON.parse(json);
    const legacy = localStorage.getItem(LEGACY_STORAGE_KEYS.YEARS);
    if (legacy) return JSON.parse(legacy);
  } catch {}
  return ['2026-2027', '2025-2026'];
}

/**
 * Đọc năm học đang chọn của tài khoản
 */
export function getSavedCurrentYear(user?: UserAccount | string | null): string {
  const userId = getUserScopeId(user);
  const keys = getUserStorageKeys(userId);

  try {
    const saved = localStorage.getItem(keys.CURRENT_YEAR);
    if (saved) return saved;
    const legacy = localStorage.getItem(LEGACY_STORAGE_KEYS.CURRENT_YEAR);
    if (legacy) return legacy;
  } catch {}
  return '2026-2027';
}

/**
 * Đọc ngân hàng nhận xét tùy chỉnh
 */
export function getSavedCustomComments(user?: UserAccount | string | null, type: 'T' | 'H' = 'T'): string[] {
  const userId = getUserScopeId(user);
  const keys = getUserStorageKeys(userId);
  const storageKey = type === 'T' ? keys.COMMENTS_T : keys.COMMENTS_H;

  try {
    const json = localStorage.getItem(storageKey);
    if (json) return JSON.parse(json);
    const legacyKey = type === 'T' ? 'qllh_custom_comments_t' : 'qllh_custom_comments_h';
    const legacy = localStorage.getItem(legacyKey);
    if (legacy) return JSON.parse(legacy);
  } catch {}
  return [];
}

/**
 * Đọc cấu hình sắp xếp điểm
 */
export function getSavedGradeSortType(user?: UserAccount | string | null): 'default' | 'alphabet' | 'code' {
  const userId = getUserScopeId(user);
  const keys = getUserStorageKeys(userId);

  try {
    const saved = localStorage.getItem(keys.GRADE_SORT);
    if (saved === 'default' || saved === 'alphabet' || saved === 'code') return saved;
    const legacy = localStorage.getItem(LEGACY_STORAGE_KEYS.GRADE_SORT);
    if (legacy === 'default' || legacy === 'alphabet' || legacy === 'code') return legacy;
  } catch {}
  return 'default';
}

/**
 * Lấy dữ liệu từ Kho lưu trữ vĩnh viễn (Vault) của tài khoản
 */
export function getVaultData(user?: UserAccount | string | null): SystemBackupData | null {
  const userId = getUserScopeId(user);
  const keys = getUserStorageKeys(userId);

  try {
    const saved = localStorage.getItem(keys.VAULT);
    if (saved) return JSON.parse(saved);
    if (userId === 'u_admin' || userId === 'trungkienkd2025') {
      const legacy = localStorage.getItem(LEGACY_STORAGE_KEYS.VAULT);
      if (legacy) return JSON.parse(legacy);
    }
  } catch {}
  return null;
}

// ========================================================
// CÁC HÀM LƯU DỮ LIỆU ĐỘC LẬP THEO TÀI KHOẢN (ISOLATED WRITES)
// ========================================================

/**
 * Lưu danh sách lớp học vào CSDL độc lập của tài khoản
 */
export function saveClassesPermanently(classes: any[], user?: UserAccount | string | null) {
  if (!Array.isArray(classes)) return;
  const userId = getUserScopeId(user);
  const keys = getUserStorageKeys(userId);

  // Đảm bảo mỗi lớp luôn gắn đúng createdBy của tài khoản sở hữu
  const taggedClasses = classes.map((c) => ({
    ...c,
    createdBy: c.createdBy || userId,
  }));

  const jsonStr = JSON.stringify(taggedClasses);
  localStorage.setItem(keys.CLASSES, jsonStr);

  // Nếu là Quản trị viên tối cao, đồng bộ song song khóa canonical
  if (userId === 'u_admin' || userId === 'trungkienkd2025') {
    localStorage.setItem(LEGACY_STORAGE_KEYS.CLASSES_V52, jsonStr);
    localStorage.setItem(LEGACY_STORAGE_KEYS.CLASSES_CANONICAL, jsonStr);
    localStorage.setItem(LEGACY_STORAGE_KEYS.CLASSES_V50, jsonStr);
  }

  updateVault({ classes: taggedClasses }, userId);
  debounceCloudSync(userId);
}

/**
 * Lưu danh sách học sinh vào CSDL độc lập của tài khoản
 */
export function saveStudentsPermanently(students: any[], user?: UserAccount | string | null) {
  if (!Array.isArray(students)) return;
  const userId = getUserScopeId(user);
  const keys = getUserStorageKeys(userId);

  const jsonStr = JSON.stringify(students);
  localStorage.setItem(keys.STUDENTS, jsonStr);

  if (userId === 'u_admin' || userId === 'trungkienkd2025') {
    localStorage.setItem(LEGACY_STORAGE_KEYS.STUDENTS_V52, jsonStr);
    localStorage.setItem(LEGACY_STORAGE_KEYS.STUDENTS_CANONICAL, jsonStr);
    localStorage.setItem(LEGACY_STORAGE_KEYS.STUDENTS_V50, jsonStr);
  }

  updateVault({ students }, userId);
  debounceCloudSync(userId);
}

/**
 * Lưu bảng điểm vào CSDL độc lập của tài khoản
 */
export function saveGradesPermanently(grades: Record<string, any>, user?: UserAccount | string | null) {
  if (!grades || typeof grades !== 'object') return;
  const userId = getUserScopeId(user);
  const keys = getUserStorageKeys(userId);

  const jsonStr = JSON.stringify(grades);
  localStorage.setItem(keys.GRADES, jsonStr);

  if (userId === 'u_admin' || userId === 'trungkienkd2025') {
    localStorage.setItem(LEGACY_STORAGE_KEYS.GRADE_V52, jsonStr);
    localStorage.setItem(LEGACY_STORAGE_KEYS.GRADE_CANONICAL, jsonStr);
    localStorage.setItem(LEGACY_STORAGE_KEYS.GRADE_V50, jsonStr);
  }

  updateVault({ grades }, userId);
  debounceCloudSync(userId);
}

/**
 * Lưu tuần học vào CSDL độc lập của tài khoản
 */
export function saveWeeksPermanently(weeks: Record<string, any>, user?: UserAccount | string | null) {
  const userId = getUserScopeId(user);
  const keys = getUserStorageKeys(userId);
  const jsonStr = JSON.stringify(weeks);
  localStorage.setItem(keys.WEEKS, jsonStr);
  if (userId === 'u_admin' || userId === 'trungkienkd2025') {
    localStorage.setItem(LEGACY_STORAGE_KEYS.WEEKS_V52, jsonStr);
  }
  updateVault({ weeks }, userId);
  debounceCloudSync(userId);
}

/**
 * Lưu đánh giá tuần vào CSDL độc lập của tài khoản
 */
export function saveEvalsPermanently(evals: Record<string, any>, user?: UserAccount | string | null) {
  const userId = getUserScopeId(user);
  const keys = getUserStorageKeys(userId);
  const jsonStr = JSON.stringify(evals);
  localStorage.setItem(keys.EVALS, jsonStr);
  if (userId === 'u_admin' || userId === 'trungkienkd2025') {
    localStorage.setItem(LEGACY_STORAGE_KEYS.EVAL_V52, jsonStr);
  }
  updateVault({ evals }, userId);
  debounceCloudSync(userId);
}

/**
 * Lưu thời khóa biểu vào CSDL độc lập của tài khoản
 */
export function saveTimetablePermanently(timetable: string[][], user?: UserAccount | string | null) {
  const userId = getUserScopeId(user);
  const keys = getUserStorageKeys(userId);
  const jsonStr = JSON.stringify(timetable);
  localStorage.setItem(keys.TIMETABLE, jsonStr);
  localStorage.setItem(`qllh_timetable_${userId}`, jsonStr);

  if (userId === 'u_admin' || userId === 'trungkienkd2025') {
    localStorage.setItem(LEGACY_STORAGE_KEYS.TIMETABLE, jsonStr);
  }
  updateVault({ timetable }, userId);
  debounceCloudSync(userId);
}

/**
 * Lưu danh sách năm học của tài khoản
 */
export function saveYearsPermanently(years: string[], user?: UserAccount | string | null) {
  const userId = getUserScopeId(user);
  const keys = getUserStorageKeys(userId);
  const jsonStr = JSON.stringify(years);
  localStorage.setItem(keys.YEARS, jsonStr);
  if (userId === 'u_admin' || userId === 'trungkienkd2025') {
    localStorage.setItem(LEGACY_STORAGE_KEYS.YEARS, jsonStr);
  }
  updateVault({ years }, userId);
}

/**
 * Lưu năm học đang chọn của tài khoản
 */
export function saveCurrentYearPermanently(currentYear: string, user?: UserAccount | string | null) {
  const userId = getUserScopeId(user);
  const keys = getUserStorageKeys(userId);
  localStorage.setItem(keys.CURRENT_YEAR, currentYear);
  if (userId === 'u_admin' || userId === 'trungkienkd2025') {
    localStorage.setItem(LEGACY_STORAGE_KEYS.CURRENT_YEAR, currentYear);
  }
  updateVault({ currentYear }, userId);
}

/**
 * Lưu ngân hàng nhận xét tùy chỉnh
 */
export function saveCustomCommentsPermanently(
  comments: string[],
  user?: UserAccount | string | null,
  type: 'T' | 'H' = 'T'
) {
  const userId = getUserScopeId(user);
  const keys = getUserStorageKeys(userId);
  const storageKey = type === 'T' ? keys.COMMENTS_T : keys.COMMENTS_H;
  const jsonStr = JSON.stringify(comments);
  localStorage.setItem(storageKey, jsonStr);

  if (userId === 'u_admin' || userId === 'trungkienkd2025') {
    const legacyKey = type === 'T' ? 'qllh_custom_comments_t' : 'qllh_custom_comments_h';
    localStorage.setItem(legacyKey, jsonStr);
  }
}

/**
 * Lưu kiểu sắp xếp Thẻ Điểm của tài khoản
 */
export function saveGradeSortTypePermanently(
  sortType: 'default' | 'alphabet' | 'code',
  user?: UserAccount | string | null
) {
  const userId = getUserScopeId(user);
  const keys = getUserStorageKeys(userId);
  localStorage.setItem(keys.GRADE_SORT, sortType);
  if (userId === 'u_admin' || userId === 'trungkienkd2025') {
    localStorage.setItem(LEGACY_STORAGE_KEYS.GRADE_SORT, sortType);
  }
}

/**
 * Cập nhật Vault lưu trữ an toàn của tài khoản
 */
export function updateVault(partial: Partial<SystemBackupData>, user?: UserAccount | string | null) {
  const userId = getUserScopeId(user);
  const keys = getUserStorageKeys(userId);

  try {
    const existing = getVaultData(userId) || {
      version: '6.0',
      backupDate: new Date().toISOString(),
      ownerId: userId,
      currentYear: getSavedCurrentYear(userId),
      years: getSavedYears(userId),
      classes: getSavedClasses(userId),
      students: getSavedStudents(userId),
      grades: getSavedGrades(userId),
      timetable: getSavedTimetable(userId),
      weeks: getSavedWeeks(userId),
      evals: getSavedEvals(userId),
    };

    const updated: SystemBackupData = {
      ...existing,
      ...partial,
      backupDate: new Date().toISOString(),
      ownerId: userId,
    };

    localStorage.setItem(keys.VAULT, JSON.stringify(updated));

    if (userId === 'u_admin' || userId === 'trungkienkd2025') {
      localStorage.setItem(LEGACY_STORAGE_KEYS.VAULT, JSON.stringify(updated));
    }
  } catch (e) {
    console.error('Error updating vault:', e);
  }
}

let syncTimeout: any = null;
/**
 * Tự động đồng bộ lên Firebase Firestore theo từng tài khoản (debounced 3s)
 */
export function debounceCloudSync(user?: UserAccount | string | null) {
  const userId = getUserScopeId(user);
  if (syncTimeout) clearTimeout(syncTimeout);
  syncTimeout = setTimeout(async () => {
    try {
      const db = getFirebaseDb();
      if (db) {
        await pushAllDataToFirestore(userId);
        localStorage.setItem(LEGACY_STORAGE_KEYS.LAST_CLOUD_SYNC, new Date().toISOString());
        window.dispatchEvent(
          new CustomEvent('qllh_cloud_synced', { detail: { timestamp: new Date().toISOString(), userId } })
        );
      }
    } catch (e) {
      console.warn('Auto cloud sync notice:', e);
    }
  }, 3000);
}

/**
 * Xuất toàn bộ cơ sở dữ liệu của tài khoản hiện tại ra tệp .json để tải về máy cất giữ
 */
export function exportFullBackupFile(user?: UserAccount | string | null): void {
  const userId = getUserScopeId(user);
  const currentYear = getSavedCurrentYear(userId);

  const backup: SystemBackupData = {
    version: '6.0',
    backupDate: new Date().toISOString(),
    ownerId: userId,
    currentYear,
    years: getSavedYears(userId),
    classes: getSavedClasses(userId),
    students: getSavedStudents(userId),
    grades: getSavedGrades(userId),
    timetable: getSavedTimetable(userId),
    weeks: getSavedWeeks(userId),
    evals: getSavedEvals(userId),
    quizBank: JSON.parse(localStorage.getItem('qllh_quiz_bank') || '[]'),
    submissions: JSON.parse(localStorage.getItem('qllh_quiz_submissions') || '[]'),
    gradeSortType: getSavedGradeSortType(userId),
    commentsT: getSavedCustomComments(userId, 'T'),
    commentsH: getSavedCustomComments(userId, 'H'),
  };

  const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(backup, null, 2));
  const dlAnchor = document.createElement('a');
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '_');
  dlAnchor.setAttribute('href', dataStr);
  dlAnchor.setAttribute('download', `Sao_Luu_QLLH_${userId}_${currentYear.replace('-', '_')}_${dateStr}.json`);
  document.body.appendChild(dlAnchor);
  dlAnchor.click();
  dlAnchor.remove();
}

/**
 * Khôi phục toàn bộ cơ sở dữ liệu từ tệp .json vào tài khoản hiện tại
 */
export function restoreFromBackupData(data: SystemBackupData, user?: UserAccount | string | null): boolean {
  try {
    if (!data || typeof data !== 'object') {
      throw new Error('Dữ liệu không đúng định dạng!');
    }

    const userId = getUserScopeId(user);

    if (data.currentYear) {
      saveCurrentYearPermanently(data.currentYear, userId);
    }
    if (data.years && Array.isArray(data.years)) {
      saveYearsPermanently(data.years, userId);
    }
    if (data.classes && Array.isArray(data.classes)) {
      saveClassesPermanently(data.classes, userId);
    }
    if (data.students && Array.isArray(data.students)) {
      saveStudentsPermanently(data.students, userId);
    }
    if (data.grades) {
      saveGradesPermanently(data.grades, userId);
    }
    if (data.timetable && Array.isArray(data.timetable)) {
      saveTimetablePermanently(data.timetable, userId);
    }
    if (data.weeks) {
      saveWeeksPermanently(data.weeks, userId);
    }
    if (data.evals) {
      saveEvalsPermanently(data.evals, userId);
    }
    if (data.commentsT && Array.isArray(data.commentsT)) {
      saveCustomCommentsPermanently(data.commentsT, userId, 'T');
    }
    if (data.commentsH && Array.isArray(data.commentsH)) {
      saveCustomCommentsPermanently(data.commentsH, userId, 'H');
    }

    // Cập nhật lại Vault
    updateVault(data, userId);

    // Bắn event đồng bộ toàn app
    window.dispatchEvent(new Event('qllh_data_updated'));
    window.dispatchEvent(new CustomEvent('qllh_user_switched', { detail: userId }));

    // Tự động đẩy lên Firebase nếu có kết nối
    debounceCloudSync(userId);

    return true;
  } catch (e: any) {
    console.error('Restore error:', e);
    alert('Lỗi khi khôi phục dữ liệu: ' + (e.message || 'File không hợp lệ'));
    return false;
  }
}
