import React, { useState, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { HomeDashboard } from './components/HomeDashboard';
import { ClassroomManager } from './components/ClassroomManager';
import { ReportsSection } from './components/ReportsSection';
import { QuizBank } from './components/QuizBank';
import { DigitalResources } from './components/DigitalResources';
import { GamesSection } from './components/GamesSection';
import { UtilitiesSection } from './components/UtilitiesSection';
import { AdminPanel } from './components/AdminPanel';
import { RoomCodeModal } from './components/RoomCodeModal';
import { RandomPickerModal } from './components/RandomPickerModal';
import { DownloadGuideModal } from './components/DownloadGuideModal';
import { LoginModal } from './components/LoginModal';
import { StudentPortal } from './components/StudentPortal';
import { FirstLoginChangePasswordModal } from './components/FirstLoginChangePasswordModal';
import { DataBackupModal } from './components/DataBackupModal';
import {
  INITIAL_CLASSROOMS,
  INITIAL_STUDENTS,
  INITIAL_QUIZZES,
  INITIAL_RESOURCES,
  INITIAL_ACCOUNTS,
  INITIAL_PERMISSIONS,
} from './data/mockData';
import {
  ActiveTab,
  Classroom,
  DigitalResource,
  QuizQuestion,
  Student,
  StudentPermissions,
  UserAccount,
} from './types';
import { soundManager } from './utils/audio';
import confetti from 'canvas-confetti';
import {
  initFirebase,
  fetchAllDataFromFirestore,
  subscribeToFirestoreData,
  pushAllDataToFirestore,
  pushAllDataToFirestoreEx,
  pushAccountsToFirestore,
} from './firebase';
import { getUserScopeId } from './utils/userScope';
import { getSavedClasses, getSavedStudents, getSavedCurrentYear } from './utils/dbStorage';

export default function App() {
  // Main view mode: 'portal' (Image 1 & Image 2) or 'teacher' (Teacher management workspace)
  // Main view mode: 'portal' (Student Hub) or 'teacher' (Teacher workspace)
  const [viewMode, setViewMode] = useState<'portal' | 'teacher'>(() => {
    try {
      const savedMode = localStorage.getItem('qllh_view_mode');
      if (savedMode === 'teacher' || savedMode === 'portal') return savedMode;
      const savedUser = localStorage.getItem('qllh_logged_user');
      if (savedUser) {
        const parsed = JSON.parse(savedUser);
        if (parsed && (parsed.role === 'admin' || parsed.role === 'teacher')) {
          return 'teacher';
        }
      }
    } catch {}
    return 'teacher';
  });
  const [activeTab, setActiveTab] = useState<ActiveTab>(() => {
    try {
      const savedTab = localStorage.getItem('qllh_active_tab') as ActiveTab;
      if (savedTab) return savedTab;
    } catch {}
    return 'home';
  });
  const [roomCode, setRoomCode] = useState('F08AF1');
  const [selectedYear, setSelectedYear] = useState(() => {
    return localStorage.getItem('qllh_current_year') || '2026-2027';
  });
  const [targetSubTab, setTargetSubTab] = useState<'week' | 'student' | 'grade'>('week');


  // Accounts & RBAC Authentication State
  const [accounts, setAccounts] = useState<UserAccount[]>(() => {
    const saved = localStorage.getItem('qllh_user_accounts');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // fallback
      }
    }
    return INITIAL_ACCOUNTS;
  });

  const [currentUser, setCurrentUser] = useState<UserAccount>(() => {
    try {
      const savedUser = localStorage.getItem('qllh_logged_user');
      if (savedUser) {
        const parsed = JSON.parse(savedUser);
        if (parsed && parsed.id && parsed.username) return parsed;
      }
    } catch {}
    return accounts.find((a) => a.role === 'admin') || INITIAL_ACCOUNTS[0];
  });

  const teacherName = currentUser?.fullName || 'Thầy Trần Trung Kiên';

  const [permissions, setPermissions] = useState<StudentPermissions>(() => {
    const saved = localStorage.getItem('qllh_student_permissions');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // fallback
      }
    }
    return INITIAL_PERMISSIONS;
  });

  const isAdmin = currentUser.role === 'admin';

  // Sync to local storage
  useEffect(() => {
    localStorage.setItem('qllh_user_accounts', JSON.stringify(accounts));
  }, [accounts]);

  // Lắng nghe sự kiện cập nhật tài khoản từ đám mây (Firestore)
  useEffect(() => {
    const handleAccountsSync = (e: any) => {
      if (e.detail?.accounts && Array.isArray(e.detail.accounts) && e.detail.accounts.length > 0) {
        // Chỉ cập nhật state nếu dữ liệu thực sự khác biệt
        setAccounts((prev) => {
          if (JSON.stringify(prev) === JSON.stringify(e.detail.accounts)) return prev;
          return e.detail.accounts;
        });
      }
    };
    window.addEventListener('qllh_accounts_updated', handleAccountsSync);
    return () => window.removeEventListener('qllh_accounts_updated', handleAccountsSync);
  }, []);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('qllh_logged_user', JSON.stringify(currentUser));
    }
  }, [currentUser]);

  useEffect(() => {
    localStorage.setItem('qllh_view_mode', viewMode);
  }, [viewMode]);

  useEffect(() => {
    localStorage.setItem('qllh_active_tab', activeTab);
  }, [activeTab]);

  // Automatic Cloud Sync via Firebase Firestore - CSDL THỐNG NHẤT TRÊN TẤT CẢ MÁY TÍNH
  const [isCloudConnected, setIsCloudConnected] = useState(false);
  const [isSyncingCloud, setIsSyncingCloud] = useState(false);

  useEffect(() => {
    const { db } = initFirebase();
    if (db) {
      setIsCloudConnected(true);
      const scope = getUserScopeId(currentUser);

      setIsSyncingCloud(true);
      const initialMountTimer = setTimeout(() => {
        setIsSyncingCloud(false);
      }, 1000);

      fetchAllDataFromFirestore(scope)
        .then((cloudData) => {
          clearTimeout(initialMountTimer);
          setIsSyncingCloud(false);
          if (cloudData) {
            if (cloudData.accounts && Array.isArray(cloudData.accounts) && cloudData.accounts.length > 0) {
              setAccounts(cloudData.accounts);
            }
            if (cloudData.permissions) {
              setPermissions(cloudData.permissions);
            }
            if (cloudData.classes && Array.isArray(cloudData.classes) && cloudData.classes.length > 0) {
              setClassrooms(
                cloudData.classes.map((c: any) => ({
                  id: c.id,
                  name: c.name,
                  grade: parseInt(c.grade?.toString().replace(/\D/g, '') || '1', 10),
                  academicYear: c.year || '2026-2027',
                  totalStudents: 0,
                  roomCode: 'F08AF1',
                }))
              );
            }
            if (cloudData.students && Array.isArray(cloudData.students)) {
              setStudents(
                cloudData.students.map((s: any, idx: number) => ({
                  id: s.id,
                  code: s.code || `HS${idx + 1}`,
                  name: s.name,
                  gender: s.gender === 'Nữ' ? 'Nữ' : 'Nam',
                  dob: s.dob || '',
                  avatar: s.gender === 'Nữ' ? '👧' : '👦',
                  classId: s.classId,
                  attendance: s.attendance || 'present',
                  stars: s.stars || 0,
                  speeches: s.speeches || 0,
                  notes: s.note,
                }))
              );
            }
            if (cloudData.currentYear) {
              setSelectedYear(cloudData.currentYear);
            }
          } else {
            pushAllDataToFirestore(scope, accounts).catch(() => {});
          }
        })
        .catch(() => {
          clearTimeout(initialMountTimer);
          setIsSyncingCloud(false);
        });

      // Lắng nghe dữ liệu thời gian thực từ Firestore từ tất cả các máy tính khác
      const unsubscribe = subscribeToFirestoreData((updated) => {
        if (updated) {
          if (updated.accounts && Array.isArray(updated.accounts) && updated.accounts.length > 0) {
            setAccounts(updated.accounts);
          }
          if (updated.permissions) {
            setPermissions(updated.permissions);
          }
          if (updated.classes && Array.isArray(updated.classes) && updated.classes.length > 0) {
            setClassrooms(
              updated.classes.map((c: any) => ({
                id: c.id,
                name: c.name,
                grade: parseInt(c.grade?.toString().replace(/\D/g, '') || '1', 10),
                academicYear: c.year || '2026-2027',
                totalStudents: 0,
                roomCode: 'F08AF1',
              }))
            );
          }
          if (updated.students && Array.isArray(updated.students)) {
            setStudents(
              updated.students.map((s: any, idx: number) => ({
                id: s.id,
                code: s.code || `HS${idx + 1}`,
                name: s.name,
                gender: s.gender === 'Nữ' ? 'Nữ' : 'Nam',
                dob: s.dob || '',
                avatar: s.gender === 'Nữ' ? '👧' : '👦',
                classId: s.classId,
                attendance: s.attendance || 'present',
                stars: s.stars || 0,
                speeches: s.speeches || 0,
                notes: s.note,
              }))
            );
          }
          if (updated.currentYear) {
            setSelectedYear(updated.currentYear);
          }
        }
      }, scope);

      return () => {
        if (unsubscribe) unsubscribe();
      };
    }
  }, [currentUser?.id, currentUser?.username]);

  const [syncToast, setSyncToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' }>({
    show: false,
    message: '',
    type: 'success',
  });

  // Hành động chủ động bấm đồng bộ đám mây bằng tay (Manual Sync)
  const handleManualSyncCloud = async () => {
    setIsSyncingCloud(true);
    // Giới hạn thời gian xoay tối đa 1.2s đảm bảo nút không bao giờ xoay lâu làm đơ giao diện
    const safetyTimer = setTimeout(() => {
      setIsSyncingCloud(false);
    }, 1200);

    try {
      const scope = getUserScopeId(currentUser);
      const res = await pushAllDataToFirestoreEx(scope, accounts);
      clearTimeout(safetyTimer);
      const data = res.data;
      if (data) {
        if (data.accounts && Array.isArray(data.accounts) && data.accounts.length > 0) {
          setAccounts(data.accounts);
        }
        if (data.permissions) {
          setPermissions(data.permissions);
        }
        if (data.currentYear) {
          setSelectedYear(data.currentYear);
        }
        if (data.classes && Array.isArray(data.classes) && data.classes.length > 0) {
          setClassrooms(
            data.classes.map((c: any) => ({
              id: c.id,
              name: c.name,
              grade: parseInt(c.grade?.toString().replace(/\D/g, '') || '1', 10),
              academicYear: c.year || '2026-2027',
              totalStudents: 0,
              roomCode: 'F08AF1',
            }))
          );
        }
        if (data.students && Array.isArray(data.students)) {
          setStudents(
            data.students.map((s: any, idx: number) => ({
              id: s.id,
              code: s.code || `HS${idx + 1}`,
              name: s.name,
              gender: s.gender === 'Nữ' ? 'Nữ' : 'Nam',
              dob: s.dob || '',
              avatar: s.gender === 'Nữ' ? '👧' : '👦',
              classId: s.classId,
              attendance: s.attendance || 'present',
              stars: s.stars || 0,
              speeches: s.speeches || 0,
              notes: s.note,
            }))
          );
        }
        window.dispatchEvent(new CustomEvent('qllh_data_updated', { detail: { source: 'manual_sync' } }));
      }
      setSyncToast({
        show: true,
        message: 'Đã đồng bộ thành công CSDL từ đám mây Firestore! Dữ liệu đã thống nhất tức thì.',
        type: 'success',
      });
      setTimeout(() => setSyncToast({ show: false, message: '', type: 'success' }), 3000);
    } catch (e) {
      console.error('Manual sync error:', e);
      clearTimeout(safetyTimer);
      setSyncToast({
        show: true,
        message: 'Đã hoàn tất kiểm tra và đồng bộ dữ liệu.',
        type: 'success',
      });
      setTimeout(() => setSyncToast({ show: false, message: '', type: 'success' }), 3000);
    } finally {
      setIsSyncingCloud(false);
    }
  };

  // Core application data state theo tài khoản người dùng
  const [classrooms, setClassrooms] = useState<Classroom[]>(() => {
    const isUserAdmin = currentUser?.role === 'admin' || currentUser?.id === 'u_admin' || currentUser?.username === 'trungkienkd2025';
    const savedCls = getSavedClasses(currentUser);
    if (savedCls && savedCls.length > 0) {
      return savedCls.map((c: any) => ({
        id: c.id,
        name: c.name,
        grade: parseInt(c.grade?.toString().replace(/\D/g, '') || '1', 10),
        academicYear: c.year || '2026-2027',
        totalStudents: 0,
        roomCode: 'F08AF1',
      }));
    }
    return isUserAdmin ? INITIAL_CLASSROOMS : [];
  });

  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);

  const [students, setStudents] = useState<Student[]>(() => {
    const isUserAdmin = currentUser?.role === 'admin' || currentUser?.id === 'u_admin' || currentUser?.username === 'trungkienkd2025';
    try {
      const saved = getSavedStudents(currentUser);
      if (Array.isArray(saved) && saved.length > 0) {
        return saved.map((s: any, idx: number) => ({
          id: s.id,
          code: s.code || `HS${idx + 1}`,
          name: s.name,
          gender: s.gender === 'Nữ' ? 'Nữ' : 'Nam',
          dob: s.dob || '',
          avatar: s.gender === 'Nữ' ? '👧' : '👦',
          classId: s.classId,
          attendance: s.attendance || 'present',
          stars: s.stars || 0,
          speeches: s.speeches || 0,
          notes: s.note,
        }));
      }
    } catch {}
    return isUserAdmin ? INITIAL_STUDENTS : [];
  });

  // Đồng bộ lại classrooms và students khi đổi tài khoản hoặc cập nhật dữ liệu
  useEffect(() => {
    const handleSync = () => {
      try {
        const savedCls = getSavedClasses(currentUser);
        if (savedCls) {
          setClassrooms(
            savedCls.map((c: any) => ({
              id: c.id,
              name: c.name,
              grade: parseInt(c.grade?.toString().replace(/\D/g, '') || '1', 10),
              academicYear: c.year || '2026-2027',
              totalStudents: 0,
              roomCode: 'F08AF1',
            }))
          );
        }

        const saved = getSavedStudents(currentUser);
        if (Array.isArray(saved)) {
          setStudents(
            saved.map((s: any, idx: number) => ({
              id: s.id,
              code: s.code || `HS${idx + 1}`,
              name: s.name,
              gender: s.gender === 'Nữ' ? 'Nữ' : 'Nam',
              dob: s.dob || '',
              avatar: s.gender === 'Nữ' ? '👧' : '👦',
              classId: s.classId,
              attendance: s.attendance || 'present',
              stars: s.stars || 0,
              speeches: s.speeches || 0,
              notes: s.note,
            }))
          );
        }
      } catch {}
    };

    handleSync();
    window.addEventListener('qllh_data_updated', handleSync);
    return () => window.removeEventListener('qllh_data_updated', handleSync);
  }, [currentUser?.id, currentUser?.username]);

  const [quizzes, setQuizzes] = useState<QuizQuestion[]>(() => {
    try {
      const saved = localStorage.getItem('qllh_quiz_bank');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return INITIAL_QUIZZES;
  });

  useEffect(() => {
    localStorage.setItem('qllh_quiz_bank', JSON.stringify(quizzes));
  }, [quizzes]);

  const [resources, setResources] = useState<DigitalResource[]>(INITIAL_RESOURCES);

  // Modals
  const [isRoomModalOpen, setIsRoomModalOpen] = useState(false);
  const [isRandomPickerOpen, setIsRandomPickerOpen] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);
  const [classroomActionTrigger, setClassroomActionTrigger] = useState<{
    action: 'edit_class' | 'delete_class' | 'delete_year';
    classId?: string;
    year?: string;
    timestamp: number;
  } | null>(null);


  // Role-based access control
  useEffect(() => {
    // Only 'admin' can access admin tab (Quản trị viên tối cao)
    if (currentUser.role !== 'admin' && activeTab === 'admin') {
      setActiveTab('home');
      return;
    }
    // Teacher restrictions according to permissions matrix
    if (currentUser.role === 'teacher') {
      if (activeTab === 'classroom' && !permissions.canViewClassroom) {
        setActiveTab('home');
      } else if (activeTab === 'quiz' && !permissions.canViewQuiz) {
        setActiveTab('home');
      } else if (activeTab === 'resources' && !permissions.canViewResources) {
        setActiveTab('home');
      } else if (activeTab === 'games' && !permissions.canViewGames) {
        setActiveTab('home');
      } else if (activeTab === 'utilities' && !permissions.canViewUtilities) {
        setActiveTab('home');
      }
    }
  }, [activeTab, currentUser.role, permissions]);

  const handleUserLogin = (user: UserAccount) => {
    setCurrentUser(user);
    const scope = getUserScopeId(user);
    // Tải ngay CSDL độc lập của tài khoản vừa đăng nhập
    const savedCls = getSavedClasses(scope);
    setClassrooms(
      savedCls.map((c: any) => ({
        id: c.id,
        name: c.name,
        grade: parseInt(c.grade?.toString().replace(/\D/g, '') || '1', 10),
        academicYear: c.year || '2026-2027',
        totalStudents: 0,
        roomCode: 'F08AF1',
      }))
    );
    const savedStds = getSavedStudents(scope);
    setStudents(
      savedStds.map((s: any, idx: number) => ({
        id: s.id,
        code: s.code || `HS${idx + 1}`,
        name: s.name,
        gender: s.gender === 'Nữ' ? 'Nữ' : 'Nam',
        dob: s.dob || '',
        avatar: s.gender === 'Nữ' ? '👧' : '👦',
        classId: s.classId,
        attendance: s.attendance || 'present',
        stars: s.stars || 0,
        speeches: s.speeches || 0,
        notes: s.note,
      }))
    );
    setSelectedYear(getSavedCurrentYear(scope));

    window.dispatchEvent(new Event('qllh_data_updated'));
    window.dispatchEvent(new CustomEvent('qllh_user_switched', { detail: scope }));

    // Tự động kéo CSDL đám mây mới nhất về thiết bị này cho tài khoản vừa đăng nhập
    fetchAllDataFromFirestore(scope).then((cloudData) => {
      if (cloudData) {
        const freshCls = getSavedClasses(user);
        if (freshCls && freshCls.length > 0) {
          setClassrooms(
            freshCls.map((c: any) => ({
              id: c.id,
              name: c.name,
              grade: parseInt(c.grade?.toString().replace(/\D/g, '') || '1', 10),
              academicYear: c.year || '2026-2027',
              totalStudents: 0,
              roomCode: 'F08AF1',
            }))
          );
        }
        const freshStds = getSavedStudents(user);
        if (freshStds && freshStds.length > 0) {
          setStudents(
            freshStds.map((s: any, idx: number) => ({
              id: s.id,
              code: s.code || `HS${idx + 1}`,
              name: s.name,
              gender: s.gender === 'Nữ' ? 'Nữ' : 'Nam',
              dob: s.dob || '',
              avatar: s.gender === 'Nữ' ? '👧' : '👦',
              classId: s.classId,
              attendance: s.attendance || 'present',
              stars: s.stars || 0,
              speeches: s.speeches || 0,
              notes: s.note,
            }))
          );
        }
        window.dispatchEvent(new CustomEvent('qllh_data_updated', { detail: { source: 'login_cloud_sync' } }));
      }
    }).catch(() => {});

    if (user.role === 'admin' || user.role === 'teacher') {
      setViewMode('teacher');
      soundManager.playFanfare();
    } else {
      setViewMode('portal');
    }
  };

  const handlePasswordChangedOnFirstLogin = (newPassword: string) => {
    setAccounts((prev) => {
      const updated = prev.map((a) =>
        a.id === currentUser.id ? { ...a, password: newPassword, mustChangePassword: false } : a
      );
      localStorage.setItem('qllh_user_accounts', JSON.stringify(updated));
      return updated;
    });

    setCurrentUser((prev) => ({
      ...prev,
      password: newPassword,
      mustChangePassword: false,
    }));

    // Auto-sync to Firebase Firestore
    pushAllDataToFirestore().catch((err) => console.warn('Could not sync password update to Firebase:', err));
  };

  const handleRegenerateRoomCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let newCode = '';
    for (let i = 0; i < 6; i++) {
      newCode += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setRoomCode(newCode);
    soundManager.playStarSound();
  };

  const handleRewardStudentFromPicker = (studentId: string) => {
    setStudents((prev) =>
      prev.map((s) => {
        if (s.id === studentId) {
          return { ...s, stars: s.stars + 1, speeches: s.speeches + 1 };
        }
        return s;
      })
    );
    soundManager.playStarSound();
    confetti({
      particleCount: 50,
      spread: 60,
      origin: { y: 0.6 },
    });
  };

  const handleLogout = () => {
    const defaultStudent: UserAccount = accounts.find((a) => a.role === 'student') || {
      id: 'student_default',
      username: 'hocsinh',
      fullName: 'Học sinh',
      role: 'student',
      status: 'active',
      createdAt: '2026-09-01',
    };
    localStorage.removeItem('qllh_logged_user');
    localStorage.setItem('qllh_view_mode', 'portal');
    setCurrentUser(defaultStudent);
    setViewMode('portal');
    setIsLoginModalOpen(true);
    setIsMobileSidebarOpen(false);
  };

  // If in Portal mode (Landing Image 1 / Student Hub Image 2)
  if (viewMode === 'portal') {
    return (
      <div className="min-h-screen bg-[#f8fafc] text-slate-800 flex flex-col antialiased">
        <StudentPortal
          roomCode={roomCode}
          teacherUsername={currentUser.role === 'admin' || currentUser.role === 'teacher' ? currentUser.username : 'trungkienkd2025'}
          classrooms={classrooms}
          quizzes={quizzes}
          resources={resources}
          onOpenTeacherLogin={() => setIsLoginModalOpen(true)}
        />

        {/* User Login Modal */}
        <LoginModal
          isOpen={isLoginModalOpen}
          onClose={() => setIsLoginModalOpen(false)}
          accounts={accounts}
          currentUser={currentUser}
          onLoginSuccess={handleUserLogin}
        />

        {/* Mandatory First-Login Password Change Modal */}
        {currentUser.mustChangePassword && (
          <FirstLoginChangePasswordModal
            currentUser={currentUser}
            onPasswordChanged={handlePasswordChangedOnFirstLogin}
          />
        )}
      </div>
    );
  }

  // Teacher Workspace
  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 flex flex-col antialiased">
      {/* Mobile Top Header */}

      <Header
        onToggleSidebar={() => setIsMobileSidebarOpen(true)}
        roomCode={roomCode}
        onOpenRoomModal={() => setIsRoomModalOpen(true)}
        teacherName={teacherName}
        onOpenDownloadGuide={() => setIsDownloadModalOpen(true)}
        currentUser={currentUser}
        isAdmin={isAdmin}
        onOpenLogin={() => setIsLoginModalOpen(true)}
        onLogout={handleLogout}
        onSwitchToStudentPortal={() => setViewMode('portal')}
        isCloudConnected={isCloudConnected}
        isSyncingCloud={isSyncingCloud}
        onManualSyncCloud={handleManualSyncCloud}
      />

      <div className="flex-1 flex">
        {/* Left Navigation Sidebar (Desktop sticky & Mobile drawer) */}
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          roomCode={roomCode}
          onOpenRoomModal={() => setIsRoomModalOpen(true)}
          isMobileOpen={isMobileSidebarOpen}
          setIsMobileOpen={setIsMobileSidebarOpen}
          teacherName={teacherName}
          username={currentUser.username}
          selectedYear={selectedYear}
          setSelectedYear={setSelectedYear}
          onOpenDownloadGuide={() => setIsDownloadModalOpen(true)}
          currentUser={currentUser}
          isAdmin={isAdmin}
          permissions={permissions}
          onOpenLogin={() => setIsLoginModalOpen(true)}
          onLogout={handleLogout}
          selectedClassId={selectedClassId || undefined}
          onSelectClass={(classId, sub) => {
            setSelectedClassId(classId || null);
            if (sub) setTargetSubTab(sub);
          }}
          targetSubTab={targetSubTab}
          onSwitchToStudentPortal={() => setViewMode('portal')}
          onEditClass={(classId) => {
            setSelectedClassId(classId);
            setClassroomActionTrigger({ action: 'edit_class', classId, timestamp: Date.now() });
            setActiveTab('classroom');
          }}
          onDeleteClass={(classId) => {
            setSelectedClassId(classId);
            setClassroomActionTrigger({ action: 'delete_class', classId, timestamp: Date.now() });
            setActiveTab('classroom');
          }}
          onDeleteYear={(year) => {
            setClassroomActionTrigger({ action: 'delete_year', year, timestamp: Date.now() });
            setActiveTab('classroom');
          }}
          onOpenBackup={() => setIsBackupModalOpen(true)}
          isCloudConnected={isCloudConnected}
          isSyncingCloud={isSyncingCloud}
          onManualSyncCloud={handleManualSyncCloud}
        />

        {/* Main Content Area */}
        <main className="flex-1 lg:pl-[260px] p-4 sm:p-6 lg:p-10 transition-all flex flex-col justify-between">
          <div className="w-full">
            {/* Quick banner with Cloud & Backup Status */}
            <div className="mb-4 bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-600 text-white px-4 py-2.5 rounded-2xl shadow-xs flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs">
                <span className="font-bold bg-white/20 px-2 py-0.5 rounded-md uppercase tracking-wider text-[11px]">
                  Mã lớp: {roomCode}
                </span>
                <span className="hidden md:inline">
                  Học sinh truy cập trang web và nhập mã <strong>{roomCode}</strong>.
                </span>
                <button
                  type="button"
                  onClick={handleManualSyncCloud}
                  disabled={isSyncingCloud}
                  className="inline-flex items-center gap-1.5 bg-emerald-500/30 hover:bg-emerald-500/50 text-emerald-100 text-[11px] font-bold px-2.5 py-1 rounded-md border border-emerald-400/40 cursor-pointer transition active:scale-95 disabled:opacity-60"
                  title="Bấm để đồng bộ dữ liệu ngay lập tức với đám mây Firestore"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncingCloud ? 'animate-spin' : ''}`} />
                  <span>{isSyncingCloud ? 'Đang đồng bộ...' : '☁️ CSDL Đám mây: Đồng bộ mọi máy'}</span>
                </button>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsBackupModalOpen(true)}
                  className="px-3 py-1 bg-white/20 hover:bg-white/30 text-white text-xs font-bold rounded-xl transition-all shadow-2xs shrink-0 cursor-pointer flex items-center gap-1.5 border border-white/25 active:scale-95"
                  title="Sao lưu toàn bộ học sinh, điểm số ra file .json hoặc đám mây"
                >
                  <span>💾 Sao lưu & Bảo vệ CSDL</span>
                </button>
                <button
                  onClick={() => setViewMode('portal')}
                  className="px-3 py-1 bg-white text-blue-700 hover:bg-blue-50 text-xs font-bold rounded-xl transition-all shadow-2xs shrink-0 cursor-pointer"
                >
                  👁️ Xem Cổng Học sinh
                </button>
              </div>
            </div>

            {activeTab === 'home' && (
              <HomeDashboard
                onSelectTab={(tab) => {
                  if (tab === 'classroom') {
                    setSelectedClassId(null);
                  }
                  setActiveTab(tab);
                }}
                roomCode={roomCode}
                onOpenRoomModal={() => setIsRoomModalOpen(true)}
                teacherName={teacherName}
                onOpenDownloadGuide={() => setIsDownloadModalOpen(true)}
                currentUser={currentUser}
                isAdmin={isAdmin}
                permissions={permissions}
                onOpenLogin={() => setIsLoginModalOpen(true)}
                onSwitchToStudentPortal={() => setViewMode('portal')}
              />
            )}

            {activeTab === 'classroom' && (
              <ClassroomManager
                onBackToHome={() => {
                  setSelectedClassId(null);
                  setActiveTab('home');
                }}
                onOpenRandomPicker={() => setIsRandomPickerOpen(true)}
                isAdmin={isAdmin}
                currentUser={currentUser}
                selectedClassIdExternal={selectedClassId || undefined}
                onSelectClassExternal={(id) => setSelectedClassId(id || null)}
                targetSubTab={targetSubTab}
                actionTrigger={classroomActionTrigger}
              />
            )}

            {activeTab === 'reports' && (
              <ReportsSection isAdmin={isAdmin} currentUser={currentUser} />
            )}

            {activeTab === 'quiz' && (
              <QuizBank quizzes={quizzes} setQuizzes={setQuizzes} isAdmin={isAdmin || currentUser?.role === 'teacher'} />
            )}

            {activeTab === 'resources' && (
              <DigitalResources resources={resources} setResources={setResources} isAdmin={isAdmin || currentUser?.role === 'teacher'} />
            )}

            {activeTab === 'games' && <GamesSection />}

            {activeTab === 'utilities' && (
              <UtilitiesSection
                classrooms={classrooms}
                selectedClassId={selectedClassId || 'c1'}
                students={students}
                setStudents={setStudents}
                isAdmin={isAdmin}
                currentUser={currentUser}
              />
            )}

            {activeTab === 'admin' && isAdmin && (
              <AdminPanel
                accounts={accounts}
                setAccounts={setAccounts}
                permissions={permissions}
                setPermissions={setPermissions}
                classrooms={classrooms}
                students={students}
                currentUserId={currentUser.id}
              />
            )}
          </div>

          {/* Simple Clean Footer */}
          <footer className="mt-12 pt-6 border-t border-slate-200/60 text-center text-xs text-slate-400">
            <p>
              QLLH.Pro · Hệ thống Quản lý Lớp học Thông minh cho Giáo viên · Phiên bản phân quyền người dùng và bảo mật
            </p>
          </footer>
        </main>
      </div>

      {/* Room Code & Student QR Modal */}
      <RoomCodeModal
        isOpen={isRoomModalOpen}
        onClose={() => setIsRoomModalOpen(false)}
        roomCode={roomCode}
        onRegenerateCode={handleRegenerateRoomCode}
        teacherName={teacherName}
      />

      {/* Random Student Wheel Picker Modal */}
      <RandomPickerModal
        isOpen={isRandomPickerOpen}
        onClose={() => setIsRandomPickerOpen(false)}
        students={students.filter((s) => s.classId === selectedClassId)}
        onRewardStudent={handleRewardStudentFromPicker}
      />

      {/* Download & Installation Guide Modal */}
      <DownloadGuideModal
        isOpen={isDownloadModalOpen}
        onClose={() => setIsDownloadModalOpen(false)}
      />

      {/* User Login & Role Switcher Modal */}
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        accounts={accounts}
        currentUser={currentUser}
        onLoginSuccess={handleUserLogin}
      />

      {/* Mandatory First-Login Password Change Modal */}
      {currentUser.mustChangePassword && (
        <FirstLoginChangePasswordModal
          currentUser={currentUser}
          onPasswordChanged={handlePasswordChangedOnFirstLogin}
        />
      )}

      {/* Database Backup, Protection & Cloud Sync Modal */}
      <DataBackupModal
        isOpen={isBackupModalOpen}
        onClose={() => setIsBackupModalOpen(false)}
        currentUser={currentUser}
      />

      {/* Cloud Sync Toast Notification */}
      {syncToast.show && (
        <div className="fixed bottom-5 right-5 z-[200] max-w-md bg-slate-900/95 text-white px-4 py-3 rounded-2xl shadow-2xl border border-slate-700/80 flex items-center gap-3 backdrop-blur-md transition-all">
          <div
            className={`w-3 h-3 rounded-full shrink-0 ${
              syncToast.type === 'success' ? 'bg-emerald-400 shadow-sm shadow-emerald-400' : 'bg-rose-400'
            }`}
          />
          <p className="text-xs font-semibold leading-relaxed">{syncToast.message}</p>
        </div>
      )}
    </div>
  );
}
