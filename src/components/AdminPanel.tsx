import React, { useState } from 'react';
import {
  ShieldCheck,
  Users,
  Key,
  Eye,
  EyeOff,
  UserPlus,
  Lock,
  Unlock,
  Trash2,
  Check,
  AlertCircle,
  Save,
  Wrench,
  BookOpen,
  GraduationCap,
  Video,
  Gamepad2,
  Sparkles,
  RefreshCw,
  Database,
  Cloud,
  CloudUpload,
  CloudDownload,
  Flame,
  Pencil,
} from 'lucide-react';
import { Classroom, Student, StudentPermissions, UserAccount, UserRole } from '../types';
import { soundManager } from '../utils/audio';
import confetti from 'canvas-confetti';
import {
  initFirebase,
  saveFirebaseConfig,
  getStoredFirebaseConfig,
  pushAllDataToFirestore,
  pushAccountsToFirestore,
  deleteAccountFromFirestore,
} from '../firebase';
import { getSavedClasses, getSavedStudents } from '../utils/dbStorage';
import { collection, doc, setDoc, getDocs } from 'firebase/firestore';

interface AdminPanelProps {
  accounts: UserAccount[];
  setAccounts: React.Dispatch<React.SetStateAction<UserAccount[]>>;
  permissions: StudentPermissions;
  setPermissions: React.Dispatch<React.SetStateAction<StudentPermissions>>;
  classrooms: Classroom[];
  students: Student[];
  currentUserId: string;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  accounts,
  setAccounts,
  permissions,
  setPermissions,
  classrooms,
  students,
  currentUserId,
}) => {
  const [activeTab, setActiveTab] = useState<'permissions' | 'accounts' | 'security' | 'firebase'>('permissions');
  const [showAddAccountModal, setShowAddAccountModal] = useState(false);
  const [saveToast, setSaveToast] = useState(false);

  // Firebase integration state in AdminPanel
  const [firebaseRawSnippet, setFirebaseRawSnippet] = useState('');
  const [firebaseApiKey, setFirebaseApiKey] = useState(() => {
    try {
      const saved = localStorage.getItem('qllh_firebase_config');
      return saved ? JSON.parse(saved).apiKey || '' : '';
    } catch {
      return '';
    }
  });
  const [firebaseProjectId, setFirebaseProjectId] = useState(() => {
    try {
      const saved = localStorage.getItem('qllh_firebase_config');
      return saved ? JSON.parse(saved).projectId || 'khohoclieuso-afa3c' : 'khohoclieuso-afa3c';
    } catch {
      return 'khohoclieuso-afa3c';
    }
  });
  const [firebaseAppId, setFirebaseAppId] = useState(() => {
    try {
      const saved = localStorage.getItem('qllh_firebase_config');
      return saved ? JSON.parse(saved).appId || '' : '';
    } catch {
      return '';
    }
  });
  const [firebaseStatusMsg, setFirebaseStatusMsg] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  // New account form
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('123');
  const [newFullName, setNewFullName] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('teacher');
  const [newClassId, setNewClassId] = useState('c1');
  const [newMustChangePassword, setNewMustChangePassword] = useState(true);

  // Edit account state & form
  const [editingAccount, setEditingAccount] = useState<UserAccount | null>(null);
  const [editUsername, setEditUsername] = useState('');
  const [editFullName, setEditFullName] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editRole, setEditRole] = useState<UserRole>('teacher');
  const [editClassId, setEditClassId] = useState('c1');
  const [editStatus, setEditStatus] = useState<'active' | 'locked'>('active');
  const [editMustChangePassword, setEditMustChangePassword] = useState(false);

  // Change admin password state
  const [adminOldPassword, setAdminOldPassword] = useState('');
  const [adminNewPassword, setAdminNewPassword] = useState('');
  const [adminConfirmPassword, setAdminConfirmPassword] = useState('');
  const [passwordChangeMsg, setPasswordChangeMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const handleTogglePermission = (key: keyof StudentPermissions) => {
    setPermissions((prev) => {
      const updated = { ...prev, [key]: !prev[key] };
      localStorage.setItem('qllh_student_permissions', JSON.stringify(updated));
      return updated;
    });
    setSaveToast(true);
    soundManager.playTick();
    setTimeout(() => setSaveToast(false), 2000);
  };

  const handleToggleAccountStatus = (id: string) => {
    setAccounts((prev) => {
      const updated: UserAccount[] = prev.map((acc) =>
        acc.id === id ? { ...acc, status: acc.status === 'active' ? 'locked' : 'active' } : acc
      );
      localStorage.setItem('qllh_user_accounts', JSON.stringify(updated));
      pushAccountsToFirestore(updated);
      return updated;
    });
  };

  const handleDeleteAccount = (id: string) => {
    if (id === 'u_admin' || id === currentUserId) {
      alert('Không thể xóa tài khoản Quản trị viên tối cao đang đăng nhập!');
      return;
    }
    const target = accounts.find((a) => a.id === id);
    if (window.confirm(`Bạn có chắc chắn muốn xóa tài khoản "${target?.fullName || id}" (${target?.username}) không?`)) {
      setAccounts((prev) => {
        const updated = prev.filter((acc) => acc.id !== id);
        localStorage.setItem('qllh_user_accounts', JSON.stringify(updated));
        pushAccountsToFirestore(updated);
        deleteAccountFromFirestore(id).catch(() => {});
        return updated;
      });
      soundManager.playTick();
    }
  };

  const handleStartEditAccount = (acc: UserAccount) => {
    setEditingAccount(acc);
    setEditUsername(acc.username);
    setEditFullName(acc.fullName);
    setEditPassword(acc.password || '123');
    setEditRole(acc.role);
    setEditClassId(acc.classId || 'c1');
    setEditStatus(acc.status);
    setEditMustChangePassword(Boolean(acc.mustChangePassword));
  };

  const handleSaveEditAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAccount || !editUsername.trim() || !editFullName.trim()) return;

    // Check duplicate username (ignoring itself)
    const isDup = accounts.some(
      (a) => a.id !== editingAccount.id && a.username.toLowerCase() === editUsername.trim().toLowerCase()
    );
    if (isDup) {
      alert('Tên đăng nhập này đã được sử dụng bởi một tài khoản khác!');
      return;
    }

    setAccounts((prev) => {
      const updated = prev.map((acc) => {
        if (acc.id === editingAccount.id) {
          const avatarIcon = editRole === 'admin' ? '👨‍🏫' : editRole === 'teacher' ? '👩‍🏫' : (acc.avatar || '👦');
          return {
            ...acc,
            username: editUsername.trim().toLowerCase(),
            fullName: editFullName.trim(),
            password: editPassword.trim() || acc.password,
            role: editRole,
            classId: editRole === 'student' ? editClassId : undefined,
            status: editStatus,
            mustChangePassword: editMustChangePassword,
            avatar: avatarIcon,
          };
        }
        return acc;
      });
      localStorage.setItem('qllh_user_accounts', JSON.stringify(updated));
      pushAccountsToFirestore(updated);
      return updated;
    });

    setEditingAccount(null);
    soundManager.playFanfare();
  };

  const handleCreateAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername.trim() || !newFullName.trim()) return;

    // Check duplicate
    if (accounts.some((a) => a.username.toLowerCase() === newUsername.trim().toLowerCase())) {
      alert('Tên đăng nhập này đã tồn tại! Vui lòng chọn tên khác.');
      return;
    }

    const avatarIcon = newRole === 'admin' ? '👨‍🏫' : newRole === 'teacher' ? '👩‍🏫' : '👦';

    const created: UserAccount = {
      id: `u_${Date.now()}`,
      username: newUsername.trim().toLowerCase(),
      password: newPassword.trim() || '123',
      fullName: newFullName.trim(),
      role: newRole,
      classId: newRole === 'student' ? newClassId : undefined,
      avatar: avatarIcon,
      status: 'active',
      mustChangePassword: newMustChangePassword,
      createdAt: new Date().toISOString().split('T')[0]
    };

    setAccounts((prev) => {
      const updated = [created, ...prev];
      localStorage.setItem('qllh_user_accounts', JSON.stringify(updated));
      pushAccountsToFirestore(updated);
      return updated;
    });

    setShowAddAccountModal(false);
    setNewUsername('');
    setNewFullName('');
    setNewPassword('123');
    setNewMustChangePassword(true);
    soundManager.playStarSound();
  };


  // 1-Click: Generate accounts for all students in selected class
  const handleGenerateClassAccounts = (classId: string) => {
    const classToGen = classrooms.find((c) => c.id === classId);
    const studentsInClass = students.filter((s) => s.classId === classId);

    if (studentsInClass.length === 0) {
      alert('Lớp học này chưa có học sinh để tạo tài khoản.');
      return;
    }

    if (!window.confirm(`Hệ thống sẽ tự động tạo tài khoản đăng nhập cho toàn bộ ${studentsInClass.length} học sinh của ${classToGen?.name || 'lớp'} với mật khẩu mặc định là "123"?`)) {
      return;
    }

    const newAccounts: UserAccount[] = studentsInClass.map((st) => {
      const usernameClean = `hs_${st.code.toLowerCase()}`;
      return {
        id: `u_gen_${st.id}`,
        username: usernameClean,
        password: '123',
        fullName: st.name,
        role: 'student',
        classId: st.classId,
        studentId: st.id,
        avatar: st.avatar,
        status: 'active',
        createdAt: new Date().toISOString().split('T')[0]
      };
    });

    // Merge without duplicates
    setAccounts((prev) => {
      const existingUsernames = new Set(prev.map((a) => a.username));
      const filteredNew = newAccounts.filter((a) => !existingUsernames.has(a.username));
      const updated = [...filteredNew, ...prev];
      localStorage.setItem('qllh_user_accounts', JSON.stringify(updated));
      pushAccountsToFirestore(updated);
      return updated;
    });

    soundManager.playFanfare();
    confetti({ particleCount: 60, spread: 60, origin: { y: 0.6 } });
    alert(`Đã tạo thành công tài khoản cho học sinh lớp ${classToGen?.name}! Tên đăng nhập có dạng hs_hs001, hs_hs002... Mật khẩu là: 123`);
  };

  const handleChangeAdminPassword = (e: React.FormEvent) => {
    e.preventDefault();
    const adminAcc = accounts.find((a) => a.role === 'admin');
    if (!adminAcc) return;

    if (adminOldPassword !== adminAcc.password) {
      setPasswordChangeMsg({ text: 'Mật khẩu cũ không chính xác!', type: 'error' });
      return;
    }
    if (adminNewPassword.length < 3) {
      setPasswordChangeMsg({ text: 'Mật khẩu mới phải có ít nhất 3 ký tự!', type: 'error' });
      return;
    }
    if (adminNewPassword !== adminConfirmPassword) {
      setPasswordChangeMsg({ text: 'Xác nhận mật khẩu mới không khớp!', type: 'error' });
      return;
    }

    setAccounts((prev) => {
      const updated = prev.map((a) => (a.role === 'admin' ? { ...a, password: adminNewPassword } : a));
      localStorage.setItem('qllh_user_accounts', JSON.stringify(updated));
      pushAccountsToFirestore(updated);
      return updated;
    });

    setPasswordChangeMsg({ text: 'Đổi mật khẩu Quản trị viên thành công!', type: 'success' });
    setAdminOldPassword('');
    setAdminNewPassword('');
    setAdminConfirmPassword('');
    soundManager.playStarSound();
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md">
              Khu vực Quản trị tối cao
            </span>
            <span className="text-xs text-slate-400">·</span>
            <span className="text-xs text-slate-500">Chỉ Thầy Trần Trung Kiên có quyền</span>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mt-1 flex items-center gap-2">
            <span>Bảng Quản trị & Phân quyền</span>
            <ShieldCheck className="w-6 h-6 text-rose-600" />
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Tạo tài khoản giáo viên, phân quyền truy cập các mục cho Giáo viên
          </p>
        </div>

        {/* Tab selector */}
        <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('permissions')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'permissions' ? 'bg-white text-rose-600 shadow-2xs font-bold' : 'text-slate-600'
            }`}
          >
            Quyền xem của Giáo viên
          </button>
          <button
            onClick={() => setActiveTab('accounts')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'accounts' ? 'bg-white text-blue-600 shadow-2xs font-bold' : 'text-slate-600'
            }`}
          >
            Quản lý tài khoản ({accounts.length})
          </button>
          <button
            onClick={() => setActiveTab('security')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'security' ? 'bg-white text-amber-600 shadow-2xs font-bold' : 'text-slate-600'
            }`}
          >
            Đổi mật khẩu Admin
          </button>
          <button
            onClick={() => setActiveTab('firebase')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
              activeTab === 'firebase' ? 'bg-white text-orange-600 shadow-2xs font-bold' : 'text-slate-600'
            }`}
          >
            <Flame className="w-3.5 h-3.5 text-orange-500" />
            <span>Đồng bộ Firebase</span>
          </button>
        </div>
      </div>

      {saveToast && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-semibold text-emerald-700 flex items-center gap-2 animate-in fade-in">
          <Check className="w-4 h-4 text-emerald-600" />
          <span>Đã lưu cài đặt phân quyền cho Giáo viên thành công! Thay đổi có hiệu lực ngay lập tức.</span>
        </div>
      )}

      {/* TAB 1: PERMISSION MATRIX CHO GIÁO VIÊN */}
      {activeTab === 'permissions' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-2xs space-y-6">
          <div>
            <span className="text-xs font-bold text-rose-600 uppercase tracking-wider">
              MA TRẬN PHÂN QUYỀN TRUY CẬP GIÁO VIÊN
            </span>
            <h3 className="text-xl font-bold text-slate-900 mt-1">
              Chỉ định các mục Giáo viên được phép xem và sử dụng khi truy cập
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Khi tài khoản Giáo viên đăng nhập, các mục bạn TẮT ở đây sẽ bị ẩn khỏi thanh menu. Quản trị viên (Thầy Kiên) <strong>luôn có toàn quyền truy cập tất cả các mục</strong>.
            </p>
          </div>

          <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden">
            {/* Permission item 1 */}
            <div className="p-4 sm:p-5 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
              <div className="flex items-start gap-3.5 max-w-xl">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 mt-0.5">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-800 text-sm">
                    Quản lý lớp học & Bảng sao thi đua
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Cho phép giáo viên truy cập danh sách lớp, sơ đồ lớp học, điểm danh, cộng/trừ sao thi đua và quản lý điểm số.
                  </p>
                </div>
              </div>
              <button
                onClick={() => handleTogglePermission('canViewClassroom')}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                  permissions.canViewClassroom ? 'bg-blue-600' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                    permissions.canViewClassroom ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Permission item 2 */}
            <div className="p-4 sm:p-5 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
              <div className="flex items-start gap-3.5 max-w-xl">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
                  <GraduationCap className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-800 text-sm">
                    Câu hỏi trắc nghiệm Tin học
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Cho phép giáo viên quản lý ngân hàng câu hỏi, trình chiếu bài tập trên lớp và theo dõi lịch sử kết quả làm bài của học sinh.
                  </p>
                </div>
              </div>
              <button
                onClick={() => handleTogglePermission('canViewQuiz')}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                  permissions.canViewQuiz ? 'bg-emerald-600' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                    permissions.canViewQuiz ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Permission item 3 */}
            <div className="p-4 sm:p-5 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
              <div className="flex items-start gap-3.5 max-w-xl">
                <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 mt-0.5">
                  <Video className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-800 text-sm">
                    Học liệu số (Video bài giảng Khối 1 - 5)
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Cho phép giáo viên truy cập thư viện video bài giảng điện tử và tải tài liệu/phiếu bài tập giảng dạy.
                  </p>
                </div>
              </div>
              <button
                onClick={() => handleTogglePermission('canViewResources')}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                  permissions.canViewResources ? 'bg-purple-600' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                    permissions.canViewResources ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Permission item 4 */}
            <div className="p-4 sm:p-5 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
              <div className="flex items-start gap-3.5 max-w-xl">
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 mt-0.5">
                  <Gamepad2 className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-800 text-sm">
                    Khu giải trí & Trò chơi lớp học
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Cho phép giáo viên mở vòng quay may mắn, hộp quà bí mật và các trò chơi vận động giải trí cho học sinh trên lớp.
                  </p>
                </div>
              </div>
              <button
                onClick={() => handleTogglePermission('canViewGames')}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                  permissions.canViewGames ? 'bg-amber-500' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                    permissions.canViewGames ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Permission item 5 */}
            <div className="p-4 sm:p-5 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
              <div className="flex items-start gap-3.5 max-w-xl">
                <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 mt-0.5">
                  <Wrench className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-800 text-sm">
                    Tiện ích giảng dạy (Đồng hồ chiếu bảng & Chia nhóm)
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Cho phép giáo viên sử dụng tiện ích đồng hồ đếm ngược chiếu bảng, bộ chia nhóm ngẫu nhiên và bốc thăm học sinh.
                  </p>
                </div>
              </div>
              <button
                onClick={() => handleTogglePermission('canViewUtilities')}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                  permissions.canViewUtilities ? 'bg-rose-600' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                    permissions.canViewUtilities ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: ACCOUNTS MANAGEMENT */}
      {activeTab === 'accounts' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-2xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">
                DANH SÁCH TÀI KHOẢN NGƯỜI DÙNG
              </span>
              <h3 className="text-xl font-bold text-slate-900 mt-1">
                Tạo và quản lý tài khoản Giáo viên & Quản trị viên
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Cấp tài khoản có tên đăng nhập và mật khẩu riêng cho các thầy cô bộ môn
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setShowAddAccountModal(true)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
              >
                <UserPlus className="w-4 h-4" />
                <span>Thêm tài khoản Giáo viên</span>
              </button>
            </div>
          </div>

          {/* Accounts Table */}
          <div className="border border-slate-200 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                    <th className="py-3 px-4">Tên đăng nhập</th>
                    <th className="py-3 px-4">Họ và tên</th>
                    <th className="py-3 px-4">Vai trò</th>
                    <th className="py-3 px-4">Mật khẩu</th>
                    <th className="py-3 px-4 text-center">Trạng thái</th>
                    <th className="py-3 px-4 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {accounts.map((acc) => (
                    <tr key={acc.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-800">
                        {acc.username}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <span className="text-base select-none">{acc.avatar || '👤'}</span>
                          <span className="font-semibold text-slate-900">{acc.fullName}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[11px] font-bold inline-flex items-center gap-1 ${
                            acc.role === 'admin'
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : acc.role === 'teacher'
                              ? 'bg-purple-50 text-purple-700 border border-purple-200'
                              : 'bg-blue-50 text-blue-700 border border-blue-200'
                          }`}
                        >
                          {acc.role === 'admin'
                            ? 'Quản trị viên'
                            : acc.role === 'teacher'
                            ? 'Giáo viên'
                            : 'Học sinh'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-700">
                        <div className="flex flex-col gap-0.5">
                          <span className="font-bold text-slate-800">{acc.password || '123'}</span>
                          {acc.mustChangePassword && (
                            <span className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.2 rounded font-sans font-semibold inline-block w-fit">
                              🔑 Đổi MK lần đầu
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <button
                          onClick={() => handleToggleAccountStatus(acc.id)}
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold transition-colors cursor-pointer ${
                            acc.status === 'active'
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-rose-50 text-rose-700'
                          }`}
                        >
                          {acc.status === 'active' ? <Unlock className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                          <span>{acc.status === 'active' ? 'Đang mở' : 'Đã khóa'}</span>
                        </button>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleStartEditAccount(acc)}
                            className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                            title="Sửa tài khoản này"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          {acc.id !== currentUserId && acc.id !== 'u_admin' && (
                            <button
                              onClick={() => handleDeleteAccount(acc.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              title="Xóa tài khoản này"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: ADMIN SECURITY */}
      {activeTab === 'security' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-2xs max-w-xl mx-auto space-y-6">
          <div className="text-center space-y-1">
            <div className="w-12 h-12 bg-amber-100 text-amber-700 rounded-2xl flex items-center justify-center mx-auto mb-2">
              <Key className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-slate-900">Đổi mật khẩu Quản trị viên</h3>
            <p className="text-xs text-slate-500">
              Bảo vệ tài khoản Thầy Trần Trung Kiên khi chia sẻ trang web cho học sinh
            </p>
          </div>

          {passwordChangeMsg && (
            <div
              className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${
                passwordChangeMsg.type === 'success'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-rose-50 text-rose-700 border border-rose-200'
              }`}
            >
              {passwordChangeMsg.type === 'success' ? (
                <Check className="w-4 h-4 text-emerald-600" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600" />
              )}
              <span>{passwordChangeMsg.text}</span>
            </div>
          )}

          <form onSubmit={handleChangeAdminPassword} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Mật khẩu hiện tại (mặc định: 123)
              </label>
              <input
                type="password"
                value={adminOldPassword}
                onChange={(e) => setAdminOldPassword(e.target.value)}
                className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:ring-1 focus:ring-amber-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Mật khẩu mới của bạn
              </label>
              <input
                type="password"
                value={adminNewPassword}
                onChange={(e) => setAdminNewPassword(e.target.value)}
                className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:ring-1 focus:ring-amber-500"
                placeholder="Nhập ít nhất 3 ký tự..."
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Xác nhận lại mật khẩu mới
              </label>
              <input
                type="password"
                value={adminConfirmPassword}
                onChange={(e) => setAdminConfirmPassword(e.target.value)}
                className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:ring-1 focus:ring-amber-500"
                required
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 px-4 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
            >
              Cập nhật mật khẩu Quản trị
            </button>
          </form>
        </div>
      )}

      {/* TAB 4: FIREBASE INTEGRATION & CLOUD SYNC */}
      {activeTab === 'firebase' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-2xs space-y-6 animate-in fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-orange-600 uppercase tracking-wider bg-orange-50 px-2 py-0.5 rounded-md flex items-center gap-1">
                  <Flame className="w-3.5 h-3.5" /> Firebase Firestore
                </span>
                <span className="text-xs text-slate-400">·</span>
                <span className="text-xs text-slate-500">Dự án: khohoclieuso-afa3c</span>
              </div>
              <h3 className="text-xl font-bold text-slate-900 mt-1">
                Kết nối & Đồng bộ dữ liệu trực tuyến
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Đồng bộ tự động danh sách học sinh, điểm số, thời khóa biểu giữa máy tính và điện thoại qua Google Firebase.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className={`px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5 ${
                firebaseApiKey ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'
              }`}>
                <span className={`w-2 h-2 rounded-full ${firebaseApiKey ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                <span>{firebaseApiKey ? 'Đã có cấu hình kết nối' : 'Chưa cấu hình API Key'}</span>
              </span>
            </div>
          </div>

          {/* Quick paste helper */}
          <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wide flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span>Dán nhanh mã cấu hình từ Firebase Console (Dự án: khohoclieuso)</span>
              </h4>
              <span className="text-[11px] text-slate-400 font-medium">Hệ thống sẽ tự động trích xuất các trường</span>
            </div>

            <textarea
              rows={4}
              value={firebaseRawSnippet}
              onChange={(e) => setFirebaseRawSnippet(e.target.value)}
              placeholder='Dán đoạn mã firebaseConfig vào đây, ví dụ:&#10;const firebaseConfig = {&#10;  apiKey: "AIzaSy...",&#10;  authDomain: "khohoclieuso-afa3c.firebaseapp.com",&#10;  projectId: "khohoclieuso-afa3c", ...&#10;};'
              className="w-full p-3 font-mono text-xs border border-slate-200 rounded-xl bg-white focus:outline-hidden focus:ring-1 focus:ring-orange-500"
            />

            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  if (!firebaseRawSnippet.trim()) return;
                  try {
                    // Extract with regex
                    const apiKeyMatch = firebaseRawSnippet.match(/apiKey:\s*["']([^"']+)["']/);
                    const authDomainMatch = firebaseRawSnippet.match(/authDomain:\s*["']([^"']+)["']/);
                    const projectIdMatch = firebaseRawSnippet.match(/projectId:\s*["']([^"']+)["']/);
                    const appIdMatch = firebaseRawSnippet.match(/appId:\s*["']([^"']+)["']/);

                    const extractedKey = apiKeyMatch ? apiKeyMatch[1] : '';
                    const extractedDomain = authDomainMatch ? authDomainMatch[1] : 'khohoclieuso-afa3c.firebaseapp.com';
                    const extractedProject = projectIdMatch ? projectIdMatch[1] : 'khohoclieuso-afa3c';
                    const extractedAppId = appIdMatch ? appIdMatch[1] : '';

                    if (extractedKey) setFirebaseApiKey(extractedKey);
                    if (extractedProject) setFirebaseProjectId(extractedProject);
                    if (extractedAppId) setFirebaseAppId(extractedAppId);

                    saveFirebaseConfig({
                      apiKey: extractedKey,
                      authDomain: extractedDomain,
                      projectId: extractedProject,
                      appId: extractedAppId,
                    });

                    setFirebaseStatusMsg({
                      text: 'Đã trích xuất và lưu cấu hình Firebase thành công!',
                      type: 'success',
                    });
                    soundManager.playStarSound();
                    confetti({ particleCount: 40, spread: 50, origin: { y: 0.6 } });
                  } catch (err) {
                    setFirebaseStatusMsg({
                      text: 'Không trích xuất được. Vui lòng kiểm tra lại đoạn mã!',
                      type: 'error',
                    });
                  }
                }}
                className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Tự động phân tích & Lưu cấu hình</span>
              </button>

              <span className="text-[11px] text-slate-500">
                Lấy từ: Firebase Console &gt; Project settings &gt; Your apps &gt; &lt;/&gt;
              </span>
            </div>
          </div>

          {/* Detailed field inputs */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                API Key (apiKey)
              </label>
              <input
                type="text"
                value={firebaseApiKey}
                onChange={(e) => setFirebaseApiKey(e.target.value)}
                placeholder="AIzaSy..."
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl font-mono focus:outline-hidden focus:ring-1 focus:ring-orange-500 bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Project ID (projectId)
              </label>
              <input
                type="text"
                value={firebaseProjectId}
                onChange={(e) => setFirebaseProjectId(e.target.value)}
                placeholder="khohoclieuso-afa3c"
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl font-mono focus:outline-hidden focus:ring-1 focus:ring-orange-500 bg-white"
              />
            </div>
          </div>

          {/* Action buttons: Test connection & Sync Data */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                const saved = saveFirebaseConfig({
                  apiKey: firebaseApiKey.trim(),
                  projectId: firebaseProjectId.trim(),
                  authDomain: `${firebaseProjectId.trim()}.firebaseapp.com`,
                  appId: firebaseAppId.trim(),
                });
                if (!saved || !saved.apiKey) {
                  setFirebaseStatusMsg({
                    text: 'Vui lòng nhập API Key để kiểm tra kết nối!',
                    type: 'error',
                  });
                  return;
                }
                const res = initFirebase(saved);
                if (res.app) {
                  setFirebaseStatusMsg({
                    text: `Kết nối thành công tới dự án Firebase: ${saved.projectId}!`,
                    type: 'success',
                  });
                  soundManager.playStarSound();
                } else {
                  setFirebaseStatusMsg({
                    text: 'Khởi tạo thất bại, vui lòng kiểm tra lại API Key hoặc Project ID!',
                    type: 'error',
                  });
                }
              }}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors flex items-center gap-2"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Kiểm tra kết nối</span>
            </button>

            <button
              type="button"
              disabled={isSyncing || !firebaseApiKey}
              onClick={async () => {
                if (!firebaseApiKey) {
                  alert('Vui lòng lưu API Key trước khi đồng bộ!');
                  return;
                }
                setIsSyncing(true);
                setFirebaseStatusMsg({ text: 'Đang đẩy dữ liệu lên Firebase Firestore...', type: 'info' });

                try {
                  const saved = getStoredFirebaseConfig();
                  const { db } = initFirebase(saved);
                  if (!db) {
                    throw new Error('Chưa thể kết nối tới cơ sở dữ liệu Firestore.');
                  }

                  await pushAllDataToFirestore(currentUserId);
                  const classes = getSavedClasses(currentUserId);
                  const stds = getSavedStudents(currentUserId);

                  setFirebaseStatusMsg({
                    text: `Đồng bộ thành công ${classes.length} lớp và ${stds.length} học sinh của tài khoản lên đám mây Firebase!`,
                    type: 'success',
                  });
                  soundManager.playFanfare();
                  confetti({ particleCount: 60, spread: 70, origin: { y: 0.6 } });
                } catch (e: any) {
                  console.error(e);
                  setFirebaseStatusMsg({
                    text: `Lỗi đồng bộ: ${e.message || 'Kiểm tra Firestore Rules hoặc kết nối mạng'}.`,
                    type: 'error',
                  });
                } finally {
                  setIsSyncing(false);
                }
              }}
              className={`px-5 py-2.5 rounded-xl text-xs font-bold text-white shadow-xs transition-colors flex items-center gap-2 cursor-pointer ${
                firebaseApiKey ? 'bg-orange-600 hover:bg-orange-700' : 'bg-slate-300 cursor-not-allowed'
              }`}
            >
              <CloudUpload className="w-4 h-4" />
              <span>{isSyncing ? 'Đang tải lên...' : 'Đẩy toàn bộ dữ liệu lên Firebase'}</span>
            </button>
          </div>

          {/* Feedback message */}
          {firebaseStatusMsg && (
            <div className={`p-3.5 rounded-xl text-xs font-semibold flex items-center gap-2 ${
              firebaseStatusMsg.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : firebaseStatusMsg.type === 'error'
                ? 'bg-rose-50 text-rose-800 border border-rose-200'
                : 'bg-blue-50 text-blue-800 border border-blue-200'
            }`}>
              {firebaseStatusMsg.type === 'success' && <Check className="w-4 h-4 text-emerald-600 shrink-0" />}
              {firebaseStatusMsg.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />}
              {firebaseStatusMsg.type === 'info' && <RefreshCw className="w-4 h-4 text-blue-600 animate-spin shrink-0" />}
              <span>{firebaseStatusMsg.text}</span>
            </div>
          )}

          {/* Guide box */}
          <div className="border-t border-slate-100 pt-5 space-y-2 text-xs text-slate-500">
            <h5 className="font-bold text-slate-700 uppercase tracking-wider text-[11px]">
              Hướng dẫn lấy khóa nhanh từ Firebase Console:
            </h5>
            <ol className="list-decimal pl-5 space-y-1">
              <li>Truy cập <a href="https://console.firebase.google.com/" target="_blank" rel="noreferrer" className="text-blue-600 underline font-bold">console.firebase.google.com</a> và bấm vào dự án <strong>khohoclieuso</strong>.</li>
              <li>Bấm biểu tượng bánh răng ⚙️ <strong>Project settings</strong> &gt; Cuộn xuống phần <strong>Your apps</strong>.</li>
              <li>Bấm vào biểu tượng <strong>Web (&lt;/&gt;)</strong> để tạo ứng dụng và sao chép đoạn mã <code>firebaseConfig</code>.</li>
              <li>Dán đoạn mã vào ô trên và bấm <strong>"Tự động phân tích & Lưu cấu hình"</strong>.</li>
            </ol>
          </div>
        </div>
      )}

      {/* Add Account Modal */}
      {showAddAccountModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-3xl shadow-xl border border-slate-200 w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-blue-600" />
                <span>Thêm tài khoản người dùng mới</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowAddAccountModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateAccount} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Tên đăng nhập <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: gv_ngoc, gv_minh, hs005..."
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-xl font-mono focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Họ và tên người dùng <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: Cô Nguyễn Hồng Ngọc"
                  value={newFullName}
                  onChange={(e) => setNewFullName(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-xl"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Mật khẩu ban đầu <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-xl font-mono"
                  required
                />
                <span className="text-[11px] text-slate-400 mt-0.5 block">
                  Mặc định: 123 (người dùng sẽ được yêu cầu đổi mật khẩu khi đăng nhập lần đầu)
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Phân quyền & Vai trò <span className="text-rose-500">*</span>
                </label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as UserRole)}
                  className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-xl bg-white font-medium"
                >
                  <option value="teacher">👨‍🏫 Giáo viên (Quản lý lớp, trắc nghiệm, bài giảng, tiện ích)</option>
                  <option value="admin">🛡️ Quản trị viên (Toàn quyền hệ thống & phân quyền)</option>
                </select>
                <p className="text-[11px] text-slate-500 mt-1 leading-normal">
                  {newRole === 'admin' && 'Quản trị viên có toàn quyền kiểm soát thẻ Quản trị tối cao, sửa/xóa tài khoản và cấu hình hệ thống.'}
                  {newRole === 'teacher' && 'Giáo viên chỉ được thao tác các nội dung giảng dạy: Lớp học, Điểm danh, Trắc nghiệm, Học liệu, Trò chơi, Tiện ích theo phân quyền. Không được vào thẻ Quản trị.'}
                </p>
              </div>

              {/* Must change password checkbox */}
              <div className="p-3 bg-amber-50/80 rounded-xl border border-amber-200 flex items-start gap-2.5">
                <input
                  type="checkbox"
                  id="newMustChange"
                  checked={newMustChangePassword}
                  onChange={(e) => setNewMustChangePassword(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded mt-0.5"
                />
                <label htmlFor="newMustChange" className="text-xs text-amber-900 cursor-pointer">
                  <strong>Bắt buộc đổi mật khẩu khi đăng nhập lần đầu</strong>
                  <span className="block text-[11px] text-amber-800/80 mt-0.5">
                    Hệ thống sẽ tự động hiện khung đổi mật khẩu ngay sau khi người dùng này đăng nhập.
                  </span>
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddAccountModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors shadow-2xs cursor-pointer"
                >
                  Tạo tài khoản ngay
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Account Modal */}
      {editingAccount && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-3xl shadow-xl border border-slate-200 w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
                <Pencil className="w-5 h-5 text-blue-600" />
                <span>Chỉnh sửa tài khoản người dùng</span>
              </h3>
              <button
                type="button"
                onClick={() => setEditingAccount(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEditAccount} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Tên đăng nhập <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={editUsername}
                  onChange={(e) => setEditUsername(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-xl font-mono focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Họ và tên người dùng <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={editFullName}
                  onChange={(e) => setEditFullName(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-xl"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Mật khẩu tài khoản
                </label>
                <input
                  type="text"
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                  placeholder="Để trống nếu không đổi..."
                  className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-xl font-mono"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Vai trò
                  </label>
                  <select
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value as UserRole)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white font-medium"
                  >
                    <option value="teacher">👨‍🏫 Giáo viên</option>
                    <option value="admin">🛡️ Quản trị viên</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Trạng thái
                  </label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as 'active' | 'locked')}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white font-medium"
                  >
                    <option value="active">Đang mở (Hoạt động)</option>
                    <option value="locked">Đã khóa</option>
                  </select>
                </div>
              </div>

              {/* Must change password checkbox */}
              <div className="p-3 bg-amber-50/80 rounded-xl border border-amber-200 flex items-start gap-2.5">
                <input
                  type="checkbox"
                  id="editMustChange"
                  checked={editMustChangePassword}
                  onChange={(e) => setEditMustChangePassword(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded mt-0.5"
                />
                <label htmlFor="editMustChange" className="text-xs text-amber-900 cursor-pointer">
                  <strong>Yêu cầu đổi mật khẩu ở lần đăng nhập tiếp theo</strong>
                  <span className="block text-[11px] text-amber-800/80 mt-0.5">
                    Hệ thống sẽ bắt buộc người dùng này đổi mật khẩu mới ngay khi đăng nhập.
                  </span>
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingAccount(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors shadow-2xs cursor-pointer"
                >
                  Lưu thay đổi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

