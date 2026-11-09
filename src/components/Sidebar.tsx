import React, { useState, useEffect } from 'react';
import {
  Home,
  BookOpen,
  GraduationCap,
  Video,
  Gamepad2,
  Wrench,
  ChevronDown,
  LogOut,
  Copy,
  Check,
  QrCode,
  Sparkles,
  Menu,
  X,
  Download,
  ShieldCheck,
  Key,
  BarChart3,
  Edit,
  Trash2,
  Plus,
} from 'lucide-react';
import { isClassVisibleForUser, getUserScopeId } from '../utils/userScope';
import { getSavedClasses, getSavedYears } from '../utils/dbStorage';
import { ActiveTab, StudentPermissions, UserAccount } from '../types';

interface SidebarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  roomCode: string;
  onOpenRoomModal: () => void;
  isMobileOpen: boolean;
  setIsMobileOpen: (open: boolean) => void;
  teacherName: string;
  username: string;
  selectedYear: string;
  setSelectedYear: (year: string) => void;
  onOpenDownloadGuide: () => void;
  currentUser: UserAccount;
  isAdmin: boolean;
  permissions: StudentPermissions;
  onOpenLogin: () => void;
  onLogout?: () => void;
  selectedClassId?: string;
  onSelectClass?: (classId: string, subTab?: 'week' | 'student' | 'grade') => void;
  targetSubTab?: 'week' | 'student' | 'grade';
  onSwitchToStudentPortal?: () => void;
  onEditClass?: (classId: string) => void;
  onDeleteClass?: (classId: string) => void;
  onDeleteYear?: (year: string) => void;
  onOpenBackup?: () => void;
}


export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  roomCode,
  onOpenRoomModal,
  isMobileOpen,
  setIsMobileOpen,
  selectedYear,
  setSelectedYear,
  onOpenDownloadGuide,
  currentUser,
  isAdmin,
  permissions,
  onOpenLogin,
  onLogout,
  selectedClassId,
  onSelectClass,
  targetSubTab = 'week',
  onSwitchToStudentPortal,
  onEditClass,
  onDeleteClass,
  onDeleteYear,
  onOpenBackup,
}) => {
  const [copied, setCopied] = useState(false);
  const [isYearDropdownOpen, setIsYearDropdownOpen] = useState(true);

  // Read years & classes from local storage to keep sidebar updated dynamically
  const [sidebarYears, setSidebarYears] = useState<string[]>(['2026-2027', '2025-2026']);
  const [sidebarClasses, setSidebarClasses] = useState<Array<{ id: string; year: string; name: string; grade: string }>>([]);

  useEffect(() => {
    const updateSidebarData = () => {
      try {
        const storedYears = getSavedYears(currentUser);
        setSidebarYears(storedYears);
        const storedClasses = getSavedClasses(currentUser);
        setSidebarClasses(storedClasses);
      } catch {
        // fallback
      }
    };

    updateSidebarData();
    window.addEventListener('storage', updateSidebarData);
    window.addEventListener('qllh_data_updated', updateSidebarData);
    return () => {
      window.removeEventListener('storage', updateSidebarData);
      window.removeEventListener('qllh_data_updated', updateSidebarData);
    };
  }, [activeTab, selectedYear, currentUser?.id, currentUser?.username]);

  const userFilteredClasses = sidebarClasses.filter((c) => isClassVisibleForUser(c, currentUser));
  const classesInCurrentYear = userFilteredClasses.filter((c) => c.year === selectedYear);

  const handleCopyCode = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const rawNavItems: {
    id: ActiveTab;
    label: string;
    icon: React.ReactNode;
    isDropdown?: boolean;
    permissionKey?: keyof StudentPermissions;
  }[] = [
    { id: 'home', label: 'Trang chủ', icon: <Home className="w-5 h-5" /> },
    {
      id: 'classroom',
      label: 'Năm học',
      icon: <BookOpen className="w-5 h-5" />,
      isDropdown: true,
      permissionKey: 'canViewClassroom',
    },
    { id: 'reports', label: 'Báo cáo', icon: <BarChart3 className="w-5 h-5" /> },
    { id: 'quiz', label: 'Trắc nghiệm', icon: <GraduationCap className="w-5 h-5" />, permissionKey: 'canViewQuiz' },
    { id: 'resources', label: 'Học liệu số', icon: <Video className="w-5 h-5" />, permissionKey: 'canViewResources' },
    { id: 'games', label: 'Giải trí', icon: <Gamepad2 className="w-5 h-5" />, permissionKey: 'canViewGames' },
    { id: 'utilities', label: 'Tiện ích', icon: <Wrench className="w-5 h-5" />, permissionKey: 'canViewUtilities' },
  ];

  if (isAdmin) {
    rawNavItems.push({
      id: 'admin',
      label: 'Quản trị & Phân quyền',
      icon: <ShieldCheck className="w-5 h-5 text-rose-500" />,
    });
  }

  // Filter based on roles and teacher permissions
  const navItems = rawNavItems.filter((item) => {
    if (isAdmin) return true;
    if (currentUser.role === 'teacher') {
      if (item.id === 'admin') return false;
      if (item.id === 'home' || (item.id as string) === 'reports') return true;
      if (item.permissionKey) return permissions[item.permissionKey];
      return true;
    }
    if (item.id === 'home' || (item.id as string) === 'reports') return true;
    if (item.permissionKey) return permissions[item.permissionKey];
    return false;
  });

  const handleNavClick = (item: (typeof navItems)[0]) => {
    if (item.isDropdown) {
      if (onSelectClass) onSelectClass('', 'week');
      setActiveTab('classroom');
      setIsYearDropdownOpen(!isYearDropdownOpen);
    } else if ((item.id as string) === 'reports') {
      setActiveTab('reports');
      setIsMobileOpen(false);
    } else {
      setActiveTab(item.id);
      setIsMobileOpen(false);
    }
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-slate-900/40 z-40 lg:hidden backdrop-blur-xs transition-opacity"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-[260px] bg-white border-r border-slate-200/90 flex flex-col transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand / Logo Header */}
        <div className="h-16 px-5 flex items-center justify-between border-b border-slate-100 shrink-0">
          <div
            onClick={() => {
              setActiveTab('home');
              setIsMobileOpen(false);
            }}
            className="flex items-center gap-1.5 cursor-pointer select-none group"
          >
            <span className="text-2xl font-black tracking-tight text-[#0070f3]">
              QLLH
            </span>
          </div>

          <button
            onClick={() => setIsMobileOpen(false)}
            className="lg:hidden p-1.5 rounded-lg text-slate-700 hover:bg-slate-100 transition-colors"
            title="Đóng menu"
          >
            <X className="w-5 h-5" />
          </button>

          <button
            onClick={() => setActiveTab('home')}
            className="hidden lg:flex p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors"
            title="Menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Items */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;

            return (
              <div key={item.label}>
                <button
                  onClick={() => handleNavClick(item)}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-bold transition-all ${
                    isActive
                      ? 'bg-blue-50 text-[#0070f3] font-black shadow-xs'
                      : 'text-slate-900 hover:text-[#0070f3] hover:bg-slate-50'
                  }`}
                >
                  <span className={isActive ? 'text-[#0070f3]' : 'text-slate-700'}>
                    {item.icon}
                  </span>
                  <span className="truncate">{item.label}</span>
                  {item.isDropdown && (
                    <ChevronDown
                      className={`w-4 h-4 ml-auto text-slate-600 transition-transform ${
                        isYearDropdownOpen ? 'rotate-180 text-[#0070f3]' : ''
                      }`}
                    />
                  )}
                </button>

                {/* Submenu for Năm học (matching reference code structure) */}
                {item.isDropdown && isYearDropdownOpen && (
                  <div className="pl-4 pr-1 py-2 space-y-2.5 text-xs bg-slate-50/80 rounded-xl my-1 border border-slate-200">
                    {/* Year select row */}
                    <div className="flex justify-between items-center text-xs font-black text-slate-950 px-2 pt-1">
                      <select
                        value={selectedYear}
                        onChange={(e) => {
                          setSelectedYear(e.target.value);
                          localStorage.setItem('qllh_current_year', e.target.value);
                          setActiveTab('classroom');
                        }}
                        className="bg-transparent outline-none cursor-pointer text-slate-950 text-xs font-black"
                      >
                        {sidebarYears.map((y) => (
                          <option key={y} value={y}>
                            {y.replace('-', '–')}
                          </option>
                        ))}
                      </select>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] text-slate-700 font-black bg-white px-2 py-0.5 rounded-full border border-slate-200">
                          {classesInCurrentYear.length}
                        </span>
                        {isAdmin && sidebarYears.length > 1 && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (onDeleteYear) onDeleteYear(selectedYear);
                              setActiveTab('classroom');
                            }}
                            className="p-1 text-slate-400 hover:text-rose-600 transition cursor-pointer"
                            title="Xóa năm học này"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Quick class select dropdown with prominent blue border */}
                    <div className="border border-[#0070f3] rounded-[1rem] p-1 bg-white relative shadow-2xs transition-all duration-200 mx-1">
                      <select
                        value={selectedClassId || ''}
                        onChange={(e) => {
                          if (e.target.value && onSelectClass) {
                            onSelectClass(e.target.value, 'week');
                            setActiveTab('classroom');
                            setIsMobileOpen(false);
                          }
                        }}
                        className="w-full py-1.5 px-3 text-[13px] font-bold outline-none text-[#0070f3] bg-transparent cursor-pointer appearance-none truncate pr-6"
                      >
                        <option value="">Chọn lớp nhanh...</option>
                        {classesInCurrentYear.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name} · {c.grade}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="w-3.5 h-3.5 absolute top-3 right-3 text-[#0070f3] pointer-events-none" />
                    </div>

                    {classesInCurrentYear.length === 0 && (
                      <div className="px-1 pt-1">
                        <button
                          type="button"
                          onClick={() => {
                            if (onSelectClass) onSelectClass('', 'week');
                            setActiveTab('classroom');
                            setIsMobileOpen(false);
                          }}
                          className="w-full py-1.5 px-2.5 bg-blue-50 hover:bg-blue-100 text-[#0070f3] border border-blue-200 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>+ Tạo lớp mới</span>
                        </button>
                      </div>
                    )}

                    {/* Sửa lớp & Xóa lớp button pills */}
                    {selectedClassId && (
                      <div className="flex items-center gap-1.5 px-1">
                        <button
                          type="button"
                          onClick={() => {
                            if (onEditClass && selectedClassId) {
                              onEditClass(selectedClassId);
                            }
                            setActiveTab('classroom');
                            setIsMobileOpen(false);
                          }}
                          className="flex-1 py-1 px-2 bg-white hover:bg-blue-50 border border-slate-200 hover:border-blue-300 rounded-lg text-[11px] font-bold text-slate-800 hover:text-[#0070f3] transition shadow-2xs cursor-pointer text-center flex items-center justify-center gap-1"
                        >
                          <Edit className="w-3 h-3 text-[#0070f3]" />
                          <span>Sửa lớp</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (onDeleteClass && selectedClassId) {
                              onDeleteClass(selectedClassId);
                            }
                            setActiveTab('classroom');
                            setIsMobileOpen(false);
                          }}
                          className="flex-1 py-1 px-2 bg-white hover:bg-rose-50 border border-slate-200 hover:border-rose-300 rounded-lg text-[11px] font-bold text-slate-800 hover:text-rose-600 transition shadow-2xs cursor-pointer text-center flex items-center justify-center gap-1"
                        >
                          <Trash2 className="w-3 h-3 text-rose-500" />
                          <span>Xóa lớp</span>
                        </button>
                      </div>
                    )}

                    {/* Sub-tabs when class is selected (Tuần, Học sinh, Điểm) */}
                    {selectedClassId && (
                      <div className="space-y-1 pt-1 px-1">
                        <button
                          onClick={() => {
                            if (onSelectClass) onSelectClass(selectedClassId, 'week');
                            setActiveTab('classroom');
                            setIsMobileOpen(false);
                          }}
                          className={`w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                            activeTab === 'classroom' && targetSubTab === 'week'
                              ? 'bg-blue-100/90 text-[#0070f3] font-black'
                              : 'text-slate-800 hover:bg-slate-100'
                          }`}
                        >
                          <i className="fas fa-clipboard-check w-3.5 text-center text-[#0070f3]"></i>
                          <span>Tuần</span>
                        </button>
                        <button
                          onClick={() => {
                            if (onSelectClass) onSelectClass(selectedClassId, 'student');
                            setActiveTab('classroom');
                            setIsMobileOpen(false);
                          }}
                          className={`w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                            activeTab === 'classroom' && targetSubTab === 'student'
                              ? 'bg-blue-100/90 text-[#0070f3] font-black'
                              : 'text-slate-800 hover:bg-slate-100'
                          }`}
                        >
                          <i className="fas fa-user-friends w-3.5 text-center text-[#0070f3]"></i>
                          <span>Học sinh</span>
                        </button>
                        <button
                          onClick={() => {
                            if (onSelectClass) onSelectClass(selectedClassId, 'grade');
                            setActiveTab('classroom');
                            setIsMobileOpen(false);
                          }}
                          className={`w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                            activeTab === 'classroom' && targetSubTab === 'grade'
                              ? 'bg-blue-100/90 text-[#0070f3] font-black'
                              : 'text-slate-800 hover:bg-slate-100'
                          }`}
                        >
                          <i className="fas fa-graduation-cap w-3.5 text-center text-[#0070f3]"></i>
                          <span>Điểm</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          <div className="pt-2 px-2 space-y-1.5">
            <button
              onClick={() => {
                setActiveTab('classroom');
                setIsMobileOpen(false);
              }}
              className="w-full py-2 px-3 text-xs font-semibold text-slate-600 hover:text-blue-600 hover:bg-blue-50/50 rounded-lg flex items-center gap-2 transition-colors border border-dashed border-slate-200"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Vào lớp học đang dạy</span>
            </button>

            <button
              onClick={() => {
                onOpenDownloadGuide();
                setIsMobileOpen(false);
              }}
              className="w-full py-2 px-3 text-xs font-semibold text-indigo-600 bg-indigo-50/70 hover:bg-indigo-100 rounded-lg flex items-center gap-2 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-indigo-600" />
              <span>Cài đặt / Tải ứng dụng</span>
            </button>

            {onOpenBackup && (
              <button
                type="button"
                onClick={() => {
                  onOpenBackup();
                  setIsMobileOpen(false);
                }}
                className="w-full py-2 px-3 text-xs font-semibold text-emerald-700 bg-emerald-50/80 hover:bg-emerald-100 rounded-lg flex items-center gap-2 transition-colors border border-emerald-200/60 cursor-pointer"
                title="Sao lưu toàn bộ học sinh, điểm số và bảo vệ cơ sở dữ liệu qua từng năm"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Sao lưu & Bảo vệ CSDL</span>
              </button>
            )}
          </div>
        </div>

        {/* Bottom Section: Mã phòng học & User info */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50 space-y-3">
          {/* Room Code Box */}
          <div
            onClick={onOpenRoomModal}
            className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs hover:border-blue-300 transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                MÃ PHÒNG HỌC
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handleCopyCode}
                  className="p-1 rounded text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                  title="Sao chép mã phòng"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
                <QrCode className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 transition-colors" />
              </div>
            </div>

            <div className="mt-1 flex items-center justify-between">
              <div className="border-l-3 border-blue-600 pl-2">
                <span className="text-xl font-extrabold text-blue-600 tracking-wider font-mono">
                  {roomCode}
                </span>
              </div>
              <span className="text-[10px] text-emerald-600 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded-full">
                Đang mở
              </span>
            </div>

            {onSwitchToStudentPortal && (
              <button
                type="button"
                onClick={onSwitchToStudentPortal}
                className="mt-2.5 w-full py-1.5 px-2 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white rounded-xl text-xs font-bold shadow-2xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                <span>👁️ Xem Cổng Học sinh</span>
              </button>
            )}
          </div>


          {/* Nút Đăng xuất thay thế chữ thông tin tài khoản */}
          <div className="pt-1 px-1">
            <button
              type="button"
              onClick={onLogout || onOpenLogin}
              className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-rose-50/90 hover:bg-rose-100 text-rose-700 border border-rose-200/90 shadow-2xs transition-all cursor-pointer group"
              title="Đăng xuất và mở trang đăng nhập"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs shrink-0 select-none bg-rose-200/80 text-rose-700">
                  {currentUser.avatar || '👨‍🏫'}
                </div>
                <span className="text-xs font-bold text-slate-800 group-hover:text-rose-700 transition-colors">
                  Đăng xuất
                </span>
              </div>
              <LogOut className="w-4 h-4 text-rose-600 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
