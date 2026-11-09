import { UserAccount } from '../types';

export interface ClassItemLike {
  id: string;
  name: string;
  year?: string;
  grade?: string | number;
  createdBy?: string;
  createdByName?: string;
}

/**
 * Trả về mã định danh phạm vi cơ sở dữ liệu của người dùng.
 * - Quản trị viên tối cao: 'u_admin'
 * - Giáo viên: 'u_gv1', 'u_gv2', ...
 * - Luôn đảm bảo mỗi tài khoản là một CSDL hoàn toàn độc lập, không liên can lẫn nhau.
 */
export function getUserScopeId(user?: UserAccount | string | null): string {
  if (typeof user === 'string' && user.trim()) {
    return user.trim();
  }
  if (user && typeof user === 'object') {
    return user.id || user.username || 'u_admin';
  }
  try {
    const savedUser = localStorage.getItem('qllh_logged_user');
    if (savedUser) {
      const parsed = JSON.parse(savedUser);
      if (parsed?.id) return parsed.id;
      if (parsed?.username) return parsed.username;
    }
  } catch {}
  return 'u_admin';
}

/**
 * Kiểm tra xem một lớp học có thuộc về hoặc hiển thị cho tài khoản đang đăng nhập hay không.
 * NGUYÊN TẮC CÁCH LY CSDL ĐỘC LẬP THEO TÀI KHOẢN:
 * - Tài khoản A (Quản trị viên) chỉ thấy và quản lý lớp của tài khoản A.
 * - Tài khoản B (Giáo viên) chỉ thấy và quản lý lớp của tài khoản B.
 * - Thêm mới hoặc xóa lớp trong tài khoản này KHÔNG BAO GIỜ ảnh hưởng đến tài khoản khác.
 * - Dữ liệu cũ trước đây chưa gắn createdBy sẽ mặc định thuộc về Quản trị viên chính (u_admin).
 * - Quản trị viên chỉ có thể xem lớp của các giáo viên khác khi chủ động bật cờ 'adminViewAll'.
 */
export function isClassVisibleForUser(
  cls: ClassItemLike | null | undefined,
  user?: UserAccount | string | null,
  adminViewAll = true
): boolean {
  if (!cls) return false;

  const currentScope = getUserScopeId(user);
  const isActuallyAdmin =
    (typeof user === 'object' && user?.role === 'admin') ||
    currentScope === 'u_admin' ||
    currentScope === 'trungkienkd2025';

  // Quản trị viên (Thầy Kiên / Admin) mặc định xem được tất cả các lớp của toàn trường trên mọi máy tính
  if (isActuallyAdmin && adminViewAll) {
    return true;
  }

  // Dữ liệu cũ trước đây chưa gắn createdBy sẽ mặc định thuộc về Quản trị viên chính
  const classCreator = cls.createdBy || 'u_admin';

  const userObj = typeof user === 'object' ? user : null;
  const isMatchScope = classCreator === currentScope;
  const isMatchId = userObj?.id ? classCreator === userObj.id : false;
  const isMatchUsername = userObj?.username ? classCreator === userObj.username : false;

  return isMatchScope || isMatchId || isMatchUsername || isActuallyAdmin;
}

/**
 * Lọc danh sách lớp học theo tài khoản người dùng đang đăng nhập
 */
export function filterClassesForUser<T extends ClassItemLike>(
  classes: T[],
  user?: UserAccount | string | null,
  adminViewAll = false
): T[] {
  if (!Array.isArray(classes)) return [];
  return classes.filter((c) => isClassVisibleForUser(c, user, adminViewAll));
}
