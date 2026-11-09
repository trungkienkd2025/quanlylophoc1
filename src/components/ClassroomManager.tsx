import React, { useState, useEffect, useRef, useMemo } from 'react';
import * as XLSX from 'xlsx';
import {
  Calendar,
  Users,
  GraduationCap,
  Plus,
  Trash2,
  Edit,
  Download,
  Upload,
  FileSpreadsheet,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowLeft,
  ChevronDown,
  UserPlus,
  Save,
  Check,
  Shuffle,
  Sparkles,
  ShieldAlert,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Student, UserAccount } from '../types';
import {
  pushAllDataToFirestore,
  deleteClassFromFirestore,
  deleteStudentFromFirestore,
  deleteAllStudentsOfClassFromFirestore,
  deleteYearFromFirestore,
} from '../firebase';
import { RandomPickerModal } from './RandomPickerModal';
import { isClassVisibleForUser, filterClassesForUser, getUserScopeId } from '../utils/userScope';
import {
  getSavedClasses,
  getSavedStudents,
  getSavedGrades,
  getSavedWeeks,
  getSavedEvals,
  getSavedTimetable,
  getSavedYears,
  getSavedCurrentYear,
  saveClassesPermanently,
  saveStudentsPermanently,
  saveGradesPermanently,
  saveWeeksPermanently,
  saveEvalsPermanently,
  saveTimetablePermanently,
  saveYearsPermanently,
  saveCurrentYearPermanently,
  updateVault,
  debounceCloudSync,
} from '../utils/dbStorage';

export interface ClassItem {
  id: string;
  year: string;
  name: string;
  grade: string;
  bg?: string;
  createdBy?: string;
  createdByName?: string;
}

export interface StudentRecord {
  id: string;
  classId: string;
  code: string;
  name: string;
  dob?: string;
  gender?: string;
  note?: string;
  attendance?: 'present' | 'absent' | 'late';
  stars?: number;
  speeches?: number;
  orderIndex?: number;
}

export interface WeekDateRecord {
  start: string;
  end: string;
}

export interface EvalRecord {
  status: 'Có mặt' | 'Vắng' | 'Để trống';
  rank: 'Tốt' | 'Khá' | 'Trung bình' | 'Yếu' | '';
  note: string;
}

export interface GradeRecord {
  lt: string;
  th: string;
  total: string;
  rank: string;
}

interface ClassroomManagerProps {
  onBackToHome?: () => void;
  onOpenRandomPicker?: () => void;
  isAdmin?: boolean;
  currentUser?: UserAccount;
  selectedClassIdExternal?: string;
  onSelectClassExternal?: (id: string) => void;
  targetSubTab?: 'week' | 'student' | 'grade';
  actionTrigger?: {
    action: 'edit_class' | 'delete_class' | 'delete_year';
    classId?: string;
    year?: string;
    timestamp: number;
  } | null;
}

export const ClassroomManager: React.FC<ClassroomManagerProps> = ({
  onBackToHome,
  onOpenRandomPicker,
  isAdmin = true,
  currentUser,
  selectedClassIdExternal,
  onSelectClassExternal,
  targetSubTab = 'week',
  actionTrigger,
}) => {
  // Quyền quản lý: Quản trị viên HOẶC Giáo viên đều có đầy đủ chức năng quản lý lớp học, học sinh, điểm số, TKB
  const isRealAdmin = Boolean(isAdmin || currentUser?.role === 'admin');
  const canManage = Boolean(isRealAdmin || currentUser?.role === 'teacher');
  // Years state theo tài khoản
  const [yearsData, setYearsData] = useState<string[]>(() => getSavedYears(currentUser));
  const [currentYear, setCurrentYear] = useState<string>(() => getSavedCurrentYear(currentUser));

  // Classes state (sử dụng getSavedClasses theo tài khoản đăng nhập)
  const [classesData, setClassesData] = useState<ClassItem[]>(() => getSavedClasses(currentUser));

  // Students state (sử dụng getSavedStudents theo tài khoản đăng nhập)
  const [studentsData, setStudentsData] = useState<StudentRecord[]>(() => getSavedStudents(currentUser));

  // Weeks data (dates for each class + week number) theo tài khoản
  const [weeksData, setWeeksData] = useState<Record<string, WeekDateRecord>>(() => getSavedWeeks(currentUser));

  // Evaluation data theo tài khoản
  const [evalData, setEvalData] = useState<Record<string, EvalRecord>>(() => getSavedEvals(currentUser));

  // Grades data theo tài khoản
  const [gradeData, setGradeData] = useState<Record<string, GradeRecord>>(() => getSavedGrades(currentUser));

  // Timetable state theo tài khoản
  const [timetable, setTimetable] = useState<string[][]>(() => getSavedTimetable(currentUser));

  // Tự động chuyển đổi toàn bộ cơ sở dữ liệu khi đổi tài khoản (Admin <-> Giáo viên)
  useEffect(() => {
    const scope = getUserScopeId(currentUser);
    const cls = getSavedClasses(scope);
    setClassesData(cls);
    const std = getSavedStudents(scope);
    setStudentsData(std);
    const grd = getSavedGrades(scope);
    setGradeData(grd);
    const wks = getSavedWeeks(scope);
    setWeeksData(wks);
    const evl = getSavedEvals(scope);
    setEvalData(evl);
    const yrs = getSavedYears(scope);
    setYearsData(yrs);
    const cy = getSavedCurrentYear(scope);
    setCurrentYear(cy);
    setTimetable(getSavedTimetable(scope));

    // Reset selection
    if (cls.length > 0) {
      setCurrentClassId(cls[0].id);
      if (onSelectClassExternal) onSelectClassExternal(cls[0].id);
    } else {
      setCurrentClassId('');
      if (onSelectClassExternal) onSelectClassExternal('');
      setCurrentView('list');
    }
  }, [currentUser?.id, currentUser?.username]);

  // Current view and selection
  const [currentView, setCurrentView] = useState<'list' | 'detail'>('list');
  const [currentClassId, setCurrentClassId] = useState<string>(() => selectedClassIdExternal || '');
  const [subTab, setSubTab] = useState<'week' | 'student' | 'grade'>('week');
  const [currentWeek, setCurrentWeek] = useState<number>(9);
  const [currentTerm, setCurrentTerm] = useState<'hk1' | 'hk2'>('hk1');

  // Eval subtab state
  const [evalStudentSearch, setEvalStudentSearch] = useState('');
  const [isEvalDropdownOpen, setIsEvalDropdownOpen] = useState(false);
  const [selectedEvalStudentId, setSelectedEvalStudentId] = useState<string>('');
  const [currentAttVal, setCurrentAttVal] = useState<'Có mặt' | 'Vắng' | 'Để trống'>('Để trống');
  const [currentRankVal, setCurrentRankVal] = useState<'Tốt' | 'Khá' | 'Trung bình' | 'Yếu' | ''>('');
  const [evalCustomText, setEvalCustomText] = useState('');
  const [saveEvalSuccess, setSaveEvalSuccess] = useState(false);
  const [saveWeekDateSuccess, setSaveWeekDateSuccess] = useState(false);

  // Week Dates
  const [weekStartDate, setWeekStartDate] = useState('');
  const [weekEndDate, setWeekEndDate] = useState('');
  const [isAutoDateHint, setIsAutoDateHint] = useState(false);

  // Student subtab state
  const [studentSortType, setStudentSortType] = useState<'default' | 'code' | 'alphabet'>('default');

  // Grade subtab state
  const [gradeSortType, setGradeSortType] = useState<'default' | 'alphabet' | 'code'>(() => {
    try {
      const saved = localStorage.getItem('qllh_grade_sort_type');
      if (saved === 'default' || saved === 'alphabet' || saved === 'code') return saved;
    } catch {}
    return 'default';
  });
  const [saveGradeSuccess, setSaveGradeSuccess] = useState(false);

  useEffect(() => {
    localStorage.setItem('qllh_grade_sort_type', gradeSortType);
    window.dispatchEvent(new CustomEvent('qllh_grade_sort_changed', { detail: gradeSortType }));
  }, [gradeSortType]);

  // Modals state
  const [showClassModal, setShowClassModal] = useState(false);
  const [isEditingClass, setIsEditingClass] = useState(false);
  const [editingClassId, setEditingClassId] = useState<string | null>(null);
  const [classFormName, setClassFormName] = useState('');
  const [classFormGrade, setClassFormGrade] = useState('1');
  const [classFormYear, setClassFormYear] = useState('');

  const [showStudentModal, setShowStudentModal] = useState(false);
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  const [studentFormName, setStudentFormName] = useState('');
  const [studentFormCode, setStudentFormCode] = useState('');
  const [studentFormDob, setStudentFormDob] = useState('');
  const [studentFormGender, setStudentFormGender] = useState<'Nam' | 'Nữ' | ''>('');
  const [studentFormNote, setStudentFormNote] = useState('');

  const [showAddYearModal, setShowAddYearModal] = useState(false);
  const [newYearInput, setNewYearInput] = useState('');

  // Import Excel modal state & ref
  const [showImportExcelModal, setShowImportExcelModal] = useState(false);
  const excelFileInputRef = useRef<HTMLInputElement>(null);

  // Random picker modal state
  const [isLocalRandomPickerOpen, setIsLocalRandomPickerOpen] = useState(false);

  // Sync state to local storage theo từng tài khoản
  useEffect(() => {
    saveYearsPermanently(yearsData, currentUser);
  }, [yearsData, currentUser?.id]);

  useEffect(() => {
    saveCurrentYearPermanently(currentYear, currentUser);
  }, [currentYear, currentUser?.id]);

  useEffect(() => {
    saveClassesPermanently(classesData, currentUser);
  }, [classesData, currentUser?.id]);

  useEffect(() => {
    saveStudentsPermanently(studentsData, currentUser);
  }, [studentsData, currentUser?.id]);

  useEffect(() => {
    saveGradesPermanently(gradeData, currentUser);
  }, [gradeData, currentUser?.id]);

  useEffect(() => {
    saveWeeksPermanently(weeksData, currentUser);
  }, [weeksData, currentUser?.id]);

  useEffect(() => {
    saveEvalsPermanently(evalData, currentUser);
  }, [evalData, currentUser?.id]);

  useEffect(() => {
    saveTimetablePermanently(timetable, currentUser);
  }, [timetable, currentUser?.id]);

  // Lắng nghe sự kiện khôi phục dữ liệu để cập nhật tức thì
  useEffect(() => {
    const handleGlobalSync = (e: Event) => {
      // Tránh đọc đè localStorage nếu sự kiện do chính ClassroomManager kích hoạt
      if ((e as CustomEvent)?.detail?.source === 'ClassroomManager') return;
      const cls = getSavedClasses(currentUser);
      if (cls) {
        setClassesData((prev) => (JSON.stringify(prev) === JSON.stringify(cls) ? prev : cls));
      }
      const std = getSavedStudents(currentUser);
      if (std) {
        setStudentsData((prev) => (JSON.stringify(prev) === JSON.stringify(std) ? prev : std));
      }
      const grd = getSavedGrades(currentUser);
      if (grd) {
        setGradeData((prev) => (JSON.stringify(prev) === JSON.stringify(grd) ? prev : grd));
      }
    };
    window.addEventListener('qllh_data_updated', handleGlobalSync);
    return () => window.removeEventListener('qllh_data_updated', handleGlobalSync);
  }, [currentUser?.id]);

  // Handle external selection
  useEffect(() => {
    if (selectedClassIdExternal) {
      setCurrentClassId(selectedClassIdExternal);
      setCurrentView('detail');
      if (targetSubTab) {
        setSubTab(targetSubTab);
      }
    } else {
      setCurrentView('list');
    }
  }, [selectedClassIdExternal, targetSubTab]);

  // Handle action triggers from Sidebar or external controls
  useEffect(() => {
    if (!actionTrigger) return;
    if (actionTrigger.action === 'edit_class') {
      const targetId = actionTrigger.classId || currentClassId;
      const cls = classesData.find((c) => c.id === targetId);
      if (cls) {
        handleOpenEditClassModal(cls);
      }
    } else if (actionTrigger.action === 'delete_class') {
      const targetId = actionTrigger.classId || currentClassId;
      if (targetId) {
        handleDeleteClass(targetId);
      }
    } else if (actionTrigger.action === 'delete_year') {
      handleDeleteCurrentYear(actionTrigger.year || currentYear);
    }
  }, [actionTrigger]);

  // Calculate Auto Dates (from reference code)
  const calculateAutoDates = (targetWeekNum: number, clsId: string) => {
    let closestWeekData: WeekDateRecord | null = null;
    let weekDifference = 0;

    for (let i = targetWeekNum - 1; i >= 1; i--) {
      const key = `${clsId}_${i}`;
      if (weeksData[key] && weeksData[key].start && weeksData[key].end) {
        closestWeekData = weeksData[key];
        weekDifference = targetWeekNum - i;
        break;
      }
    }

    if (!closestWeekData) {
      for (let i = targetWeekNum + 1; i <= 35; i++) {
        const key = `${clsId}_${i}`;
        if (weeksData[key] && weeksData[key].start && weeksData[key].end) {
          closestWeekData = weeksData[key];
          weekDifference = targetWeekNum - i;
          break;
        }
      }
    }

    if (closestWeekData) {
      const startObj = new Date(closestWeekData.start);
      const endObj = new Date(closestWeekData.end);
      startObj.setDate(startObj.getDate() + weekDifference * 7);
      endObj.setDate(endObj.getDate() + weekDifference * 7);

      const formatDate = (d: Date) => {
        let month = '' + (d.getMonth() + 1);
        let day = '' + d.getDate();
        const year = d.getFullYear();
        if (month.length < 2) month = '0' + month;
        if (day.length < 2) day = '0' + day;
        return [year, month, day].join('-');
      };

      return { start: formatDate(startObj), end: formatDate(endObj) };
    }
    return null;
  };

  // Sync week date inputs when week or class changes
  useEffect(() => {
    if (!currentClassId) return;
    const weekKey = `${currentClassId}_${currentWeek}`;
    const saved = weeksData[weekKey];
    if (saved && saved.start && saved.end) {
      setWeekStartDate(saved.start);
      setWeekEndDate(saved.end);
      setIsAutoDateHint(false);
    } else {
      const autoDates = calculateAutoDates(currentWeek, currentClassId);
      if (autoDates) {
        setWeekStartDate(autoDates.start);
        setWeekEndDate(autoDates.end);
        setIsAutoDateHint(true);
      } else {
        setWeekStartDate('');
        setWeekEndDate('');
        setIsAutoDateHint(false);
      }
    }
  }, [currentWeek, currentClassId, weeksData]);

  // Sync eval data when student or week changes
  useEffect(() => {
    if (!selectedEvalStudentId) {
      setCurrentAttVal('Để trống');
      setCurrentRankVal('');
      setEvalCustomText('');
      return;
    }
    const evalKey = `${selectedEvalStudentId}_${currentWeek}`;
    const rec = evalData[evalKey];
    if (rec) {
      setCurrentAttVal(rec.status || 'Để trống');
      setCurrentRankVal(rec.rank || '');
      setEvalCustomText(rec.note || '');
    } else {
      setCurrentAttVal('Để trống');
      setCurrentRankVal('');
      setEvalCustomText('');
    }
  }, [selectedEvalStudentId, currentWeek, evalData]);

  // Admin toggle to view all teachers' classes or only personal classes (mặc định xem tất cả để đồng nhất trên mọi máy tính)
  const [adminViewAll, setAdminViewAll] = useState(true);

  // Chuẩn hóa dữ liệu lớp cũ chưa có createdBy
  const normalizedClasses = useMemo(() => {
    return classesData.map((c: ClassItem) => {
      if (!c.createdBy) {
        return {
          ...c,
          createdBy: 'u_admin',
          createdByName: 'Thầy Trần Trung Kiên',
        };
      }
      return c;
    });
  }, [classesData]);

  // Lọc chỉ các lớp thuộc về tài khoản người dùng đang đăng nhập
  const visibleClasses = useMemo(() => {
    return normalizedClasses.filter((c: ClassItem) => isClassVisibleForUser(c, currentUser, adminViewAll));
  }, [normalizedClasses, currentUser, adminViewAll]);

  // Lớp theo năm học đang chọn
  const visibleClassesInCurrentYear = useMemo(() => {
    return visibleClasses.filter((c: ClassItem) => c.year === currentYear);
  }, [visibleClasses, currentYear]);

  // Danh sách lớp trong năm học
  const filteredClasses = useMemo(() => {
    return [...visibleClassesInCurrentYear].sort((a: ClassItem, b: ClassItem) =>
      a.name.localeCompare(b.name, 'vi', { numeric: true })
    );
  }, [visibleClassesInCurrentYear]);

  // Tự động đồng bộ currentClassId khi đổi tài khoản hoặc đổi năm học
  useEffect(() => {
    if (visibleClassesInCurrentYear.length > 0) {
      const exists = visibleClassesInCurrentYear.some((c: ClassItem) => c.id === currentClassId);
      if (!exists) {
        const nextId = visibleClassesInCurrentYear[0].id;
        setCurrentClassId(nextId);
        if (onSelectClassExternal) onSelectClassExternal(nextId);
      }
    } else {
      if (currentClassId !== '') {
        setCurrentClassId('');
        if (onSelectClassExternal) onSelectClassExternal('');
      }
      if (currentView === 'detail') {
        setCurrentView('list');
      }
    }
  }, [visibleClassesInCurrentYear, currentYear, currentUser?.id]);

  // Tổng số học sinh của các lớp thuộc tài khoản này
  const currentYearStudentsCount = useMemo(() => {
    return studentsData.filter((s: StudentRecord) =>
      visibleClassesInCurrentYear.some((c: ClassItem) => c.id === s.classId)
    ).length;
  }, [studentsData, visibleClassesInCurrentYear]);

  const currentClass = useMemo(() => {
    return (
      visibleClassesInCurrentYear.find((c: ClassItem) => c.id === currentClassId) ||
      visibleClassesInCurrentYear[0] ||
      null
    );
  }, [visibleClassesInCurrentYear, currentClassId]);

  const classStudents = useMemo(() => {
    if (!currentClass) return [];
    return studentsData.filter((s: StudentRecord) => s.classId === currentClass.id);
  }, [studentsData, currentClass]);

  // Tự động khôi phục các học sinh từng bị mất mã lớp (classId rỗng) vào lớp đang hiển thị
  useEffect(() => {
    if (!currentClass?.id) return;
    const orphans = studentsData.filter((s) => !s.classId || s.classId === '');
    if (orphans.length > 0) {
      const fixed = studentsData.map((s) =>
        !s.classId || s.classId === '' ? { ...s, classId: currentClass.id } : s
      );
      setStudentsData(fixed);
      saveStudentsPermanently(fixed, currentUser);
    }
  }, [currentClass?.id, studentsData]);

  // Danh sách học sinh phục vụ cho RandomPickerModal
  const pickerStudents: Student[] = classStudents.map((s: StudentRecord, idx: number) => ({
    id: s.id,
    code: s.code || `HS${idx + 1}`,
    name: s.name,
    gender: (s.gender === 'Nữ' ? 'Nữ' : 'Nam') as 'Nam' | 'Nữ',
    dob: s.dob || '',
    avatar: s.gender === 'Nữ' ? '👧' : '👦',
    classId: s.classId,
    attendance: s.attendance || 'present',
    stars: s.stars || 0,
    speeches: s.speeches || 0,
  }));

  const handleRewardStudentFromPicker = (studentId: string) => {
    setStudentsData((prev) =>
      prev.map((s) => (s.id === studentId ? { ...s, stars: (s.stars || 0) + 1 } : s))
    );
    window.dispatchEvent(new Event('qllh_data_updated'));
    pushAllDataToFirestore(getUserScopeId(currentUser)).catch(() => {});
  };

  // Sorted students list for Student SubTab
  const sortedStudents = [...classStudents].sort((a, b) => {
    if (studentSortType === 'alphabet') {
      const nameA = a.name.trim().split(' ').pop() || '';
      const nameB = b.name.trim().split(' ').pop() || '';
      return nameA.localeCompare(nameB, 'vi');
    }
    if (studentSortType === 'code') {
      return a.code.localeCompare(b.code, 'vi', { numeric: true });
    }
    // studentSortType === 'default' (Chuẩn): giữ nguyên thứ tự ban đầu khi đưa vào
    if (a.orderIndex !== undefined && b.orderIndex !== undefined) {
      return a.orderIndex - b.orderIndex;
    }
    return 0;
  });

  // Sorted students list for Grade SubTab
  const sortedGradeStudents = [...classStudents].sort((a, b) => {
    if (gradeSortType === 'alphabet') {
      const nameA = a.name.trim().split(' ').pop() || '';
      const nameB = b.name.trim().split(' ').pop() || '';
      return nameA.localeCompare(nameB, 'vi');
    }
    if (gradeSortType === 'code') {
      return a.code.localeCompare(b.code, 'vi', { numeric: true });
    }
    // gradeSortType === 'default' (Chuẩn): giữ nguyên thứ tự ban đầu khi đưa vào
    if (a.orderIndex !== undefined && b.orderIndex !== undefined) {
      return a.orderIndex - b.orderIndex;
    }
    return 0;
  });

  // Action: Open Class Detail
  const handleOpenClassDetail = (clsId: string) => {
    setCurrentClassId(clsId);
    setCurrentView('detail');
    if (onSelectClassExternal) {
      onSelectClassExternal(clsId);
    }
    // Select first student if available
    const firstStudent = studentsData.find((s) => s.classId === clsId);
    if (firstStudent) {
      setSelectedEvalStudentId(firstStudent.id);
      setEvalStudentSearch(`${firstStudent.name} (${firstStudent.code})`);
    } else {
      setSelectedEvalStudentId('');
      setEvalStudentSearch('');
    }
  };

  // Action: Save Week Dates
  const handleSaveWeekDates = () => {
    if (!currentClassId) return;
    const key = `${currentClassId}_${currentWeek}`;
    setWeeksData((prev) => ({
      ...prev,
      [key]: { start: weekStartDate, end: weekEndDate },
    }));
    setIsAutoDateHint(false);
    setSaveWeekDateSuccess(true);
    setTimeout(() => setSaveWeekDateSuccess(false), 1500);
  };

  // Action: Save Student Evaluation
  const handleSaveStudentEval = () => {
    if (!selectedEvalStudentId) return;
    const key = `${selectedEvalStudentId}_${currentWeek}`;
    setEvalData((prev) => ({
      ...prev,
      [key]: {
        status: currentAttVal,
        rank: currentRankVal,
        note: evalCustomText,
      },
    }));
    setSaveEvalSuccess(true);
    pushAllDataToFirestore(getUserScopeId(currentUser)).catch(() => {});
    setTimeout(() => setSaveEvalSuccess(false), 1500);
  };

  // Action: Timetable cell update
  const handleTimetableChange = (rowIdx: number, colIdx: number, value: string) => {
    if (!canManage) return;
    setTimetable((prev) => {
      const next = prev.map((row) => [...row]);
      next[rowIdx][colIdx] = value;
      return next;
    });
  };

  // Action: Add / Edit Class Modal
  const handleOpenCreateClassModal = () => {
    setIsEditingClass(false);
    setEditingClassId(null);
    setClassFormName('');
    setClassFormGrade('1');
    setClassFormYear(currentYear);
    setShowClassModal(true);
  };

  const handleOpenEditClassModal = (cls: ClassItem) => {
    setIsEditingClass(true);
    setEditingClassId(cls.id);
    setCurrentClassId(cls.id);
    setClassFormName(cls.name);
    setClassFormGrade(cls.grade.replace(/[^0-9]/g, '') || '1');
    setClassFormYear(cls.year || currentYear);
    setShowClassModal(true);
  };

  const handleSubmitClass = (e: React.FormEvent) => {
    e.preventDefault();
    const name = classFormName.trim().toUpperCase();
    const gradeVal = classFormGrade.trim();
    if (!name || !gradeVal) {
      alert('Vui lòng điền tên lớp và số Khối!');
      return;
    }

    let bgClass = 'bg-gray-50';
    if (gradeVal === '1' || gradeVal === '2') bgClass = 'bg-indigo-50 border-indigo-200';
    else if (gradeVal === '3') bgClass = 'bg-amber-50 border-amber-200';
    else if (gradeVal === '4' || gradeVal === '5') bgClass = 'bg-teal-50 border-teal-200';
    else bgClass = 'bg-blue-50 border-blue-200';

    const targetYear = classFormYear || currentYear;

    if (isEditingClass && (editingClassId || currentClassId)) {
      const targetId = (editingClassId || currentClassId)!;
      const updatedList = classesData.map((c) =>
        c.id === targetId
          ? { ...c, name, grade: `Khối ${gradeVal}`, year: targetYear, bg: bgClass }
          : c
      );
      setClassesData(updatedList);
      saveClassesPermanently(updatedList, currentUser);
    } else {
      // Đảm bảo thông tin người tạo luôn gắn đúng với tài khoản giáo viên đang đăng nhập
      const creatorId = getUserScopeId(currentUser);
      const creatorName = currentUser?.fullName || currentUser?.username || 'Giáo viên';

      const newClass: ClassItem = {
        id: `c_${Date.now()}`,
        year: targetYear,
        name,
        grade: `Khối ${gradeVal}`,
        bg: bgClass,
        createdBy: creatorId,
        createdByName: creatorName,
      };

      const updatedList = [...classesData, newClass];
      setClassesData(updatedList);
      saveClassesPermanently(updatedList, currentUser);
      setCurrentClassId(newClass.id);
      if (onSelectClassExternal) onSelectClassExternal(newClass.id);

      // Nếu năm học của lớp khác với năm học đang xem, tự động đồng bộ sang năm học đó
      if (targetYear !== currentYear) {
        setCurrentYear(targetYear);
        saveCurrentYearPermanently(targetYear, currentUser);
      }

      try {
        confetti({ particleCount: 40, spread: 70, origin: { y: 0.6 } });
      } catch {}
    }
    setShowClassModal(false);
    window.dispatchEvent(new Event('qllh_data_updated'));
    pushAllDataToFirestore(getUserScopeId(currentUser)).catch(() => {});
  };

  // Action: Delete Class (CHỈ XÓA TRONG TÀI KHOẢN NÀY, CSDL TÀI KHOẢN KHÁC KHÔNG BỊ ẢNH HƯỞNG)
  const handleDeleteClass = (clsId?: string) => {
    const targetId = clsId || currentClassId;
    if (!targetId) return;
    const cls = classesData.find((c) => c.id === targetId);
    if (!cls) {
      alert('Không tìm thấy lớp học cần xóa!');
      return;
    }
    const count = studentsData.filter((s) => s.classId === targetId).length;
    const confirmed = confirm(
      `Xác nhận xóa LỚP ${cls.name} (${cls.grade})?\n\n` +
      `- Lớp đang có: ${count} học sinh\n` +
      `- Toàn bộ học sinh và dữ liệu điểm danh, điểm số của lớp này trong tài khoản của bạn sẽ bị xóa.\n` +
      `- Các tài khoản khác sẽ hoàn toàn KHÔNG bị ảnh hưởng.\n\n` +
      `Bạn có chắc chắn muốn xóa không?`
    );
    if (!confirmed) return;

    const nextClasses = classesData.filter((c) => c.id !== targetId);
    setClassesData(nextClasses);
    saveClassesPermanently(nextClasses, currentUser);
    const nextStudents = studentsData.filter((s) => s.classId !== targetId);
    setStudentsData(nextStudents);
    saveStudentsPermanently(nextStudents, currentUser);

    if (currentClassId === targetId) {
      setCurrentClassId('');
      if (onSelectClassExternal) onSelectClassExternal('');
      setCurrentView('list');
    }
    deleteClassFromFirestore(targetId).catch(() => {});
    window.dispatchEvent(new Event('qllh_data_updated'));
    pushAllDataToFirestore(getUserScopeId(currentUser)).catch(() => {});
  };

  // Action: Add / Edit Student Modal
  const handleOpenAddStudentModal = (studentId?: string) => {
    if (studentId) {
      const st = studentsData.find((s) => s.id === studentId);
      if (st) {
        setEditingStudentId(st.id);
        setStudentFormName(st.name);
        setStudentFormCode(st.code);
        setStudentFormDob(st.dob || '');
        setStudentFormGender((st.gender as 'Nam' | 'Nữ') || '');
        setStudentFormNote(st.note || '');
        setShowStudentModal(true);
        return;
      }
    }
    setEditingStudentId(null);
    setStudentFormName('');
    const nextIdx = classStudents.length + 1;
    setStudentFormCode(`HS${nextIdx < 10 ? '0' + nextIdx : nextIdx}`);
    setStudentFormDob('');
    setStudentFormGender('Nam');
    setStudentFormNote('');
    setShowStudentModal(true);
  };

  const handleSubmitStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentFormName.trim() || !studentFormCode.trim()) {
      alert('Vui lòng điền đủ Họ tên và Mã học sinh!');
      return;
    }

    if (editingStudentId) {
      const targetClassId = currentClass?.id || currentClassId;
      const updated = studentsData.map((s) =>
        s.id === editingStudentId
          ? {
              ...s,
              name: studentFormName.trim(),
              code: studentFormCode.trim(),
              dob: studentFormDob,
              gender: studentFormGender,
              note: studentFormNote,
            }
          : s
      );
      setStudentsData(updated);
      saveStudentsPermanently(updated, currentUser);
      window.dispatchEvent(new CustomEvent('qllh_data_updated', { detail: { source: 'ClassroomManager' } }));
      if (selectedEvalStudentId === editingStudentId) {
        setEvalStudentSearch(`${studentFormName.trim()} (${studentFormCode.trim()})`);
      }
    } else {
      const targetClassId = currentClass?.id || currentClassId;
      const newSt: StudentRecord = {
        id: `s_${Date.now()}`,
        classId: targetClassId,
        code: studentFormCode.trim(),
        name: studentFormName.trim(),
        dob: studentFormDob,
        gender: studentFormGender,
        note: studentFormNote,
        attendance: 'present',
        stars: 0,
        speeches: 0,
        orderIndex: classStudents.length + 1,
      };
      const updated = [...studentsData, newSt];
      setStudentsData(updated);
      saveStudentsPermanently(updated, currentUser);
      window.dispatchEvent(new CustomEvent('qllh_data_updated', { detail: { source: 'ClassroomManager' } }));
      if (!selectedEvalStudentId) {
        setSelectedEvalStudentId(newSt.id);
        setEvalStudentSearch(`${newSt.name} (${newSt.code})`);
      }
    }
    setShowStudentModal(false);
  };

  // Action: Delete Single Student
  const handleDeleteStudent = (stId: string) => {
    if (confirm('Thầy/Cô có chắc chắn muốn xóa học sinh này khỏi lớp?')) {
      const updated = studentsData.filter((s) => s.id !== stId);
      setStudentsData(updated);
      saveStudentsPermanently(updated, currentUser);
      if (selectedEvalStudentId === stId) {
        setSelectedEvalStudentId('');
        setEvalStudentSearch('');
      }
      deleteStudentFromFirestore(stId).catch(() => {});
      window.dispatchEvent(new CustomEvent('qllh_data_updated', { detail: { source: 'ClassroomManager' } }));
      pushAllDataToFirestore(getUserScopeId(currentUser)).catch(() => {});
    }
  };

  // Action: Delete All Students in current class
  const handleDeleteAllStudentsInClass = () => {
    if (classStudents.length === 0) {
      alert('Lớp chưa có học sinh nào để xóa!');
      return;
    }
    const targetClass = currentClass || visibleClassesInCurrentYear.find((c) => c.id === currentClassId);
    const targetClassId = targetClass?.id || currentClassId;
    if (confirm(`Bạn chắc chắn muốn xóa TOÀN BỘ ${classStudents.length} học sinh của lớp ${targetClass?.name || ''}?`)) {
      const updated = studentsData.filter((s) => s.classId !== targetClassId);
      setStudentsData(updated);
      saveStudentsPermanently(updated, currentUser);
      setSelectedEvalStudentId('');
      setEvalStudentSearch('');
      deleteAllStudentsOfClassFromFirestore(targetClassId).catch(() => {});
      window.dispatchEvent(new CustomEvent('qllh_data_updated', { detail: { source: 'ClassroomManager' } }));
      pushAllDataToFirestore(getUserScopeId(currentUser)).catch(() => {});
    }
  };

  // Action: Update Student Field inline
  const handleUpdateStudentInline = (stId: string, field: keyof StudentRecord, val: string) => {
    if (!canManage) return;
    const updated = studentsData.map((s) => (s.id === stId ? { ...s, [field]: val } : s));
    setStudentsData(updated);
    saveStudentsPermanently(updated, currentUser);
  };

  // Action: Grade change handler
  const handleGradeChange = (stId: string, type: 'lt' | 'th', value: string) => {
    if (!canManage) return;
    const stObj = studentsData.find((s) => s.id === stId);
    const key = `${stId}_${currentTerm}`;
    const keyCode = stObj?.code ? `${stObj.code}_${currentTerm}` : null;
    const existing = gradeData[key] || (keyCode ? gradeData[keyCode] : null) || { lt: '', th: '', total: '', rank: '' };
    const updated = { ...existing, [type]: value };

    const ltStr = (updated.lt || '').trim();
    const thStr = (updated.th || '').trim();

    if (ltStr === '' && thStr === '') {
      updated.total = '';
      updated.rank = '';
    } else {
      const ltNum = parseFloat(ltStr);
      const thNum = parseFloat(thStr);

      if (!isNaN(ltNum) || !isNaN(thNum)) {
        const rawSum = (!isNaN(ltNum) ? ltNum : 0) + (!isNaN(thNum) ? thNum : 0);
        // Làm tròn cột tổng (ví dụ 7.5 sẽ thành 8)
        const roundedTotal = Math.round(rawSum);
        updated.total = roundedTotal.toString();
        // Nếu điểm tổng từ 9, 10 thì T, ngược lại H
        updated.rank = roundedTotal >= 9 ? 'T' : 'H';
      } else {
        updated.total = '';
        updated.rank = '';
      }
    }

    setGradeData((prev) => {
      const next = {
        ...prev,
        [key]: updated,
        ...(keyCode ? { [keyCode]: updated } : {}),
      };
      // Lưu vĩnh viễn và đồng bộ ngay lập tức để không bị mất khi sao lưu
      saveGradesPermanently(next);
      return next;
    });
  };

  const handleSaveAllGrades = () => {
    saveGradesPermanently(gradeData);
    setSaveGradeSuccess(true);
    pushAllDataToFirestore(getUserScopeId(currentUser)).catch(() => {});
    setTimeout(() => setSaveGradeSuccess(false), 1500);
  };

  // Action: Export Student List to Excel
  const handleExportStudentsExcel = () => {
    if (classStudents.length === 0) {
      alert('Lớp chưa có học sinh để xuất file! Hệ thống sẽ tải file mẫu để thầy cô điền dữ liệu.');
      handleExportSampleExcel();
      return;
    }
    const dataRows = sortedStudents.map((st, idx) => ({
      STT: idx + 1,
      'Mã học sinh': st.code,
      'Họ và tên': st.name,
      'Ngày sinh': st.dob || '',
      'Giới tính': st.gender || '',
      'Ghi chú': st.note || '',
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataRows);
    worksheet['!cols'] = [
      { wch: 8 },
      { wch: 15 },
      { wch: 25 },
      { wch: 15 },
      { wch: 12 },
      { wch: 20 },
    ];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Danh_sach_lop');
    const fileName = `Danh_Sach_Lop_${currentClass?.name?.replace(/[^a-zA-Z0-9]/g, '_') || 'Lop'}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  // Action: Export Sample Template Excel (Ảnh 2)
  const handleExportSampleExcel = () => {
    const sampleRows = [
      {
        'Mã học sinh': 'HS01',
        'Họ và tên': 'Nguyễn Văn An',
        'Ngày sinh': '15/04/2016',
        'Giới tính': 'Nam',
        'Ghi chú': 'Lớp trưởng',
      },
      {
        'Mã học sinh': 'HS02',
        'Họ và tên': 'Trần Thị Mai',
        'Ngày sinh': '20/09/2016',
        'Giới tính': 'Nữ',
        'Ghi chú': '',
      },
      {
        'Mã học sinh': 'HS03',
        'Họ và tên': 'Lê Hoàng Long',
        'Ngày sinh': '08/11/2016',
        'Giới tính': 'Nam',
        'Ghi chú': '',
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(sampleRows);
    worksheet['!cols'] = [
      { wch: 16 },
      { wch: 26 },
      { wch: 16 },
      { wch: 14 },
      { wch: 20 },
    ];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Mau_Hoc_Sinh');
    const classNameClean = currentClass?.name?.replace(/[^a-zA-Z0-9]/g, '_') || 'Lop';
    XLSX.writeFile(workbook, `Mau_Danh_Sach_Hoc_Sinh_${classNameClean}.xlsx`);
  };

  // Action: Import Students from Excel file (Ảnh 2)
  const handleImportExcelFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input so same file can be re-selected if edited
    e.target.value = '';

    // Xác định chính xác lớp học mục tiêu
    const targetClass =
      currentClass ||
      (currentClassId ? visibleClassesInCurrentYear.find((c) => c.id === currentClassId) : null) ||
      visibleClassesInCurrentYear[0];

    if (!targetClass) {
      alert('Chưa có lớp học được chọn! Vui lòng tạo lớp học trước khi nhập danh sách học sinh.');
      return;
    }

    const targetClassId = targetClass.id;

    // Validate size (max 2 MB)
    if (file.size > 2 * 1024 * 1024) {
      alert('File quá lớn! Dung lượng file tối đa là 2 MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const buffer = evt.target?.result;
        if (!buffer) {
          alert('Không thể đọc nội dung file Excel!');
          return;
        }

        const workbook = XLSX.read(buffer, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        if (!worksheet) {
          alert('File Excel không có trang tính (Sheet)!');
          return;
        }

        // Tự động tìm dòng tiêu đề (Header row) - phòng trường hợp file có dòng tiêu đề trường/lớp ở các dòng 1, 2, 3
        const rawSheetData = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1, defval: '' });
        let headerRowIndex = 0;
        for (let r = 0; r < Math.min(rawSheetData.length, 10); r++) {
          const rowArr = (rawSheetData[r] || []).map((c: any) => String(c).trim().toLowerCase());
          const hasName = rowArr.some((c: string) => c.includes('họ') || c.includes('tên') || c.includes('name'));
          const hasCodeOrStt = rowArr.some(
            (c: string) => c.includes('mã') || c.includes('stt') || c.includes('code') || c.includes('ngày sinh')
          );
          if (hasName || hasCodeOrStt) {
            headerRowIndex = r;
            break;
          }
        }

        // Convert worksheet to JSON rows từ dòng tiêu đề tìm được
        const rawRows = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, {
          range: headerRowIndex,
          defval: '',
        });

        if (!rawRows || rawRows.length === 0) {
          alert('File Excel trống, không có dòng dữ liệu học sinh nào!');
          return;
        }

        // Limit to 200 students as per prompt in image 2
        const rows = rawRows.slice(0, 200);
        const newStudents: StudentRecord[] = [];
        const existingClassStudents = studentsData.filter((s) => s.classId === targetClassId);
        let startIdx = existingClassStudents.length + 1;

        for (const row of rows) {
          const keys = Object.keys(row);
          const findVal = (keywords: string[]) => {
            const matchedKey = keys.find((k) => {
              const lower = k.trim().toLowerCase();
              return keywords.some((kw) => lower.includes(kw));
            });
            return matchedKey ? String(row[matchedKey] ?? '').trim() : '';
          };

          // Hỗ trợ cả 2 trường hợp: 1 cột Họ và tên HOẶC tách 2 cột (Họ đệm + Tên)
          const hoDemKey = keys.find((k) => {
            const l = k.trim().toLowerCase();
            return (
              l.includes('họ đệm') ||
              l.includes('họ và đệm') ||
              l.includes('họ và tên đệm') ||
              l.includes('họ và chữ đệm') ||
              l.includes('họ lót') ||
              l === 'họ' ||
              l === 'ho'
            );
          });

          const tenKey = keys.find((k) => {
            const l = k.trim().toLowerCase();
            return (
              l === 'tên' ||
              l === 'ten' ||
              l === 'tên hs' ||
              l === 'tên học sinh' ||
              l.endsWith(' tên')
            ) && k !== hoDemKey;
          });

          let name = '';
          if (hoDemKey && tenKey && row[hoDemKey] && row[tenKey]) {
            name = `${String(row[hoDemKey]).trim()} ${String(row[tenKey]).trim()}`.trim();
          }
          if (!name) {
            name = findVal([
              'họ và tên',
              'họ và tên học sinh',
              'họ tên',
              'ho va ten',
              'ho ten',
              'họ và tên hs',
              'full name',
              'tên',
              'ten',
              'name',
            ]);
          }

          if (!name) continue; // Bắt buộc phải có họ và tên

          let code = findVal([
            'mã học sinh',
            'mã định danh',
            'mã hs',
            'ma hoc sinh',
            'ma dinh danh',
            'ma hs',
            'code',
            'số định danh',
            'so dinh danh',
          ]);
          if (!code) {
            code = `HS${startIdx < 10 ? '0' + startIdx : startIdx}`;
            startIdx++;
          }

          // Xử lý ngày sinh đa định dạng (Date object, serial number, dd/mm/yyyy, yyyy-mm-dd)
          const dobKey = keys.find((k) => {
            const l = k.trim().toLowerCase();
            return l.includes('ngày sinh') || l.includes('ngay sinh') || l.includes('dob') || l.includes('birth');
          });

          let dob = '';
          if (dobKey && row[dobKey] !== undefined && row[dobKey] !== '') {
            const rawVal = row[dobKey];
            if (rawVal instanceof Date) {
              dob = rawVal.toISOString().split('T')[0];
            } else if (typeof rawVal === 'number' && rawVal > 1000) {
              try {
                const dateObj = XLSX.SSF.parse_date_code(rawVal);
                if (dateObj) {
                  const yyyy = dateObj.y;
                  const mm = String(dateObj.m).padStart(2, '0');
                  const dd = String(dateObj.d).padStart(2, '0');
                  dob = `${yyyy}-${mm}-${dd}`;
                }
              } catch {}
            } else {
              const str = String(rawVal).trim();
              if (str.includes('/')) {
                const parts = str.split('/');
                if (parts.length === 3) {
                  const d = parts[0].padStart(2, '0');
                  const m = parts[1].padStart(2, '0');
                  const y = parts[2].length === 2 ? `20${parts[2]}` : parts[2];
                  dob = `${y}-${m}-${d}`;
                }
              } else if (str.includes('-')) {
                const parts = str.split('-');
                if (parts.length === 3) {
                  if (parts[0].length === 4) {
                    dob = str;
                  } else {
                    const d = parts[0].padStart(2, '0');
                    const m = parts[1].padStart(2, '0');
                    const y = parts[2].length === 2 ? `20${parts[2]}` : parts[2];
                    dob = `${y}-${m}-${d}`;
                  }
                }
              } else if (/^\d{8}$/.test(str)) {
                if (parseInt(str.substring(0, 4), 10) > 1900) {
                  dob = `${str.substring(0, 4)}-${str.substring(4, 6)}-${str.substring(6, 8)}`;
                } else {
                  dob = `${str.substring(4, 8)}-${str.substring(2, 4)}-${str.substring(0, 2)}`;
                }
              }
            }
          }

          // Xử lý giới tính (hỗ trợ cả cột chung 'Giới tính' và 2 cột riêng 'Nam' / 'Nữ')
          let gender = '';
          const namCol = keys.find((k) => k.trim().toLowerCase() === 'nam');
          const nuCol = keys.find((k) => k.trim().toLowerCase() === 'nữ' || k.trim().toLowerCase() === 'nu');
          if (namCol && nuCol) {
            const vNu = String(row[nuCol] || '').trim().toLowerCase();
            const vNam = String(row[namCol] || '').trim().toLowerCase();
            if (vNu === 'x' || vNu === '1' || vNu === 'v') gender = 'Nữ';
            else if (vNam === 'x' || vNam === '1' || vNam === 'v') gender = 'Nam';
          }
          if (!gender) {
            const gVal = findVal(['giới tính', 'gioi tinh', 'gender', 'phái']).toLowerCase();
            if (gVal.includes('nam') || gVal === 'm' || gVal === 'male' || gVal === '1') gender = 'Nam';
            else if (gVal.includes('nữ') || gVal.includes('nu') || gVal === 'f' || gVal === 'female' || gVal === '0')
              gender = 'Nữ';
          }

          const note = findVal(['ghi chú', 'ghi chu', 'note']);

          newStudents.push({
            id: `st_${Date.now()}_${newStudents.length + 1}_${Math.random().toString(36).substring(2, 6)}`,
            classId: targetClassId,
            code,
            name,
            dob,
            gender: (gender as 'Nam' | 'Nữ') || '',
            note,
            attendance: 'present',
            stars: 0,
            speeches: 0,
            orderIndex: existingClassStudents.length + newStudents.length + 1,
          });
        }

        if (newStudents.length === 0) {
          alert('Không tìm thấy dữ liệu học sinh hợp lệ! File cần có cột "Họ và tên" (và "Mã học sinh").');
          return;
        }

        // Tự động khôi phục các học sinh từng bị mất mã lớp (classId rỗng) vào lớp này
        const cleanedExisting = studentsData.map((s) => {
          if (!s.classId || s.classId === '') {
            return { ...s, classId: targetClassId };
          }
          return s;
        });

        const updatedStudents = [...cleanedExisting, ...newStudents];

        // 1. Cập nhật state
        setStudentsData(updatedStudents);
        setStudentSortType('default');
        setGradeSortType('default');
        setCurrentView('detail');
        setSubTab('student');

        // 2. Đồng bộ currentClassId nếu cần
        setCurrentClassId(targetClassId);
        if (onSelectClassExternal) onSelectClassExternal(targetClassId);

        // 3. Tự động chọn học sinh đầu tiên cho phần đánh giá nếu chưa có
        if (!selectedEvalStudentId && newStudents.length > 0) {
          setSelectedEvalStudentId(newStudents[0].id);
          setEvalStudentSearch(`${newStudents[0].name} (${newStudents[0].code})`);
        }

        // 4. LƯU NGAY LẬP TỨC VÀO LOCALSTORAGE TRƯỚC KHI BẮN EVENT
        saveStudentsPermanently(updatedStudents, currentUser);

        // 5. Đóng modal và thông báo thành công
        setShowImportExcelModal(false);
        alert(`✅ Đã nhập thành công ${newStudents.length} học sinh vào lớp ${targetClass.name}!`);

        // 6. Phát sự kiện đồng bộ cho toàn bộ ứng dụng
        window.dispatchEvent(new CustomEvent('qllh_data_updated', { detail: { source: 'ClassroomManager' } }));
        pushAllDataToFirestore(getUserScopeId(currentUser)).catch(() => {});
      } catch (err) {
        console.error('Import excel error:', err);
        alert('Đã xảy ra lỗi khi đọc file Excel! Vui lòng kiểm tra file đúng định dạng .xlsx hoặc .xls.');
      }
    };

    reader.readAsArrayBuffer(file);
  };

  // Action: Export Grades to Excel
  const handleExportGradesExcel = () => {
    if (classStudents.length === 0) {
      alert('Lớp chưa có học sinh để xuất bảng điểm!');
      return;
    }
    const dataRows = sortedGradeStudents.map((st, idx) => {
      const key = `${st.id}_${currentTerm}`;
      const keyCode = st.code ? `${st.code}_${currentTerm}` : '';
      const rec = gradeData[key] || (keyCode ? gradeData[keyCode] : null) || { lt: '', th: '', total: '', rank: '' };
      return {
        STT: idx + 1,
        'Mã HS': st.code,
        'Họ và tên': st.name,
        'Điểm Lý Thuyết': rec.lt,
        'Điểm Thực Hành': rec.th,
        'Tổng Điểm': rec.total,
        'Xếp Loại': rec.rank,
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(dataRows);
    const workbook = XLSX.utils.book_new();
    const sheetName = currentTerm === 'hk1' ? 'Diem_Hoc_Ky_1' : 'Diem_Cuoi_Nam';
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    const fileName = `Bang_Diem_${currentClass?.name?.replace(/[^a-zA-Z0-9]/g, '_')}_${currentTerm}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  // Action: Add Academic Year
  const handleAddYear = () => {
    if (!newYearInput.trim()) return;
    const trimmed = newYearInput.trim();
    if (!yearsData.includes(trimmed)) {
      setYearsData((prev) => [...prev, trimmed]);
      setCurrentYear(trimmed);
      localStorage.setItem('qllh_current_year', trimmed);
    }
    setNewYearInput('');
    setShowAddYearModal(false);
    window.dispatchEvent(new Event('qllh_data_updated'));
    pushAllDataToFirestore(getUserScopeId(currentUser)).catch(() => {});
  };

  // Action: Delete Academic Year
  const handleDeleteCurrentYear = (yearToDelete?: string) => {
    const targetYear = yearToDelete || currentYear;
    if (yearsData.length <= 1) {
      alert('Không thể xóa năm học duy nhất! Vui lòng tạo thêm năm học khác trước khi xóa năm học này.');
      return;
    }
    const classesInYear = classesData.filter((c) => c.year === targetYear);
    const confirmed = confirm(
      `Xác nhận xóa NĂM HỌC ${targetYear}?\n\n` +
      `- Số lớp trong năm học này: ${classesInYear.length} lớp\n` +
      `- Toàn bộ lớp học, học sinh, điểm danh và bảng điểm thuộc năm học ${targetYear} sẽ bị xóa vĩnh viễn.\n\n` +
      `Bạn có chắc chắn muốn xóa không?`
    );
    if (!confirmed) return;

    const remainingClasses = classesData.filter((c) => c.year !== targetYear);
    const remainingClassIds = new Set(remainingClasses.map((c) => c.id));
    setClassesData(remainingClasses);
    setStudentsData((prev) => prev.filter((s) => remainingClassIds.has(s.classId)));
    const remainingYears = yearsData.filter((y) => y !== targetYear);
    setYearsData(remainingYears);
    const nextYear = remainingYears[0];
    setCurrentYear(nextYear);
    localStorage.setItem('qllh_current_year', nextYear);
    setCurrentClassId('');
    if (onSelectClassExternal) onSelectClassExternal('');
    setCurrentView('list');
    deleteYearFromFirestore(targetYear).catch(() => {});
    window.dispatchEvent(new Event('qllh_data_updated'));
    pushAllDataToFirestore(getUserScopeId(currentUser)).catch(() => {});
  };

  // Calculate attendance summary for current week
  const presentWeekCount = classStudents.filter((s: StudentRecord) => {
    const key = `${s.id}_${currentWeek}`;
    return evalData[key]?.status === 'Có mặt';
  }).length;
  const absentWeekCount = classStudents.filter((s: StudentRecord) => {
    const key = `${s.id}_${currentWeek}`;
    return evalData[key]?.status === 'Vắng';
  }).length;

  const goodRankCount = classStudents.filter((s: StudentRecord) => {
    const key = `${s.id}_${currentWeek}`;
    return evalData[key]?.rank === 'Tốt';
  }).length;

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 antialiased">
      {/* Student Mode Notice Banner */}
      {!canManage && (
        <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex items-center justify-between text-xs text-amber-900 shadow-2xs">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <p className="font-bold text-sm">Chế độ xem Học sinh · Quản lý lớp học</p>
              <p className="text-amber-700">
                Bạn đang ở chế độ xem thông tin thời khóa biểu, danh sách lớp và điểm số. Quyền chỉnh sửa thuộc về Thầy cô.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* VIEW 1: TAB CLASS LIST (DANH SÁCH LỚP HỌC & THỜI KHÓA BIỂU) */}
      {/* ======================================================== */}
      {currentView === 'list' && (
        <div className="space-y-8 animate-fadeIn">
          {/* Top navigation row */}
          <div>
            {onBackToHome && (
              <button
                onClick={onBackToHome}
                className="text-slate-500 text-sm font-medium hover:text-blue-600 flex items-center gap-1.5 mb-1.5 transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" /> <span>Trang chủ</span>
              </button>
            )}
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">Quản lý lớp học</h2>
          </div>

          {/* Thời khóa biểu cá nhân */}
          <div className="bg-white p-6 shadow-sm border border-slate-200 rounded-2xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
              <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-600" />
                <span>Thời khóa biểu cá nhân</span>
              </h3>
              <span className="inline-flex items-center gap-1.5 text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1 rounded-full font-bold">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Đã bật tự động lưu</span>
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="border-collapse border border-slate-300 text-center text-sm font-medium text-slate-700 w-full max-w-4xl mx-auto shadow-2xs rounded-lg overflow-hidden">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 uppercase text-xs tracking-wider">
                    <th className="border border-slate-300 px-3 py-3 w-14 font-bold">STT</th>
                    <th className="border border-slate-300 px-3 py-3 w-24 font-bold">BUỔI</th>
                    <th className="border border-slate-300 px-4 py-3 font-bold">Thứ 2</th>
                    <th className="border border-slate-300 px-4 py-3 font-bold">Thứ 3</th>
                    <th className="border border-slate-300 px-4 py-3 font-bold">Thứ 4</th>
                    <th className="border border-slate-300 px-4 py-3 font-bold">Thứ 5</th>
                    <th className="border border-slate-300 px-4 py-3 font-bold">Thứ 6</th>
                  </tr>
                </thead>
                <tbody>
                  {/* SÁNG (Tiết 1 -> 4) */}
                  {[0, 1, 2, 3].map((periodIdx) => (
                    <tr key={`morning_${periodIdx}`} className="hover:bg-slate-50 transition-colors">
                      <td className="border border-slate-300 py-2.5 font-bold text-slate-600">{periodIdx + 1}</td>
                      {periodIdx === 0 && (
                        <td
                          className="border border-slate-300 py-2.5 font-bold text-slate-800 bg-white"
                          rowSpan={4}
                        >
                          SÁNG
                        </td>
                      )}
                      {[0, 1, 2, 3, 4].map((dayIdx) => (
                        <td key={`cell_${periodIdx}_${dayIdx}`} className="border border-slate-300 p-1">
                          <input
                            type="text"
                            value={timetable[periodIdx]?.[dayIdx] || ''}
                            onChange={(e) => handleTimetableChange(periodIdx, dayIdx, e.target.value)}
                            disabled={!canManage}
                            className={`w-full py-1.5 px-2 text-center text-xs font-semibold rounded outline-none transition-colors ${
                              timetable[periodIdx]?.[dayIdx]
                                ? 'bg-blue-50/70 text-blue-900 font-bold'
                                : 'bg-transparent text-slate-700'
                            } ${canManage ? 'focus:bg-blue-100/60 focus:ring-1 focus:ring-blue-400 cursor-text' : 'cursor-default'}`}
                          />
                        </td>
                      ))}
                    </tr>
                  ))}

                  {/* CHIỀU (Tiết 5 -> 7) */}
                  {[4, 5, 6].map((periodIdx, i) => (
                    <tr key={`afternoon_${periodIdx}`} className="hover:bg-slate-50 transition-colors">
                      <td className="border border-slate-300 py-2.5 font-bold text-slate-600">{periodIdx + 1}</td>
                      {i === 0 && (
                        <td
                          className="border border-slate-300 py-2.5 font-bold text-slate-800 bg-white"
                          rowSpan={3}
                        >
                          CHIỀU
                        </td>
                      )}
                      {[0, 1, 2, 3, 4].map((dayIdx) => (
                        <td key={`cell_${periodIdx}_${dayIdx}`} className="border border-slate-300 p-1">
                          <input
                            type="text"
                            value={timetable[periodIdx]?.[dayIdx] || ''}
                            onChange={(e) => handleTimetableChange(periodIdx, dayIdx, e.target.value)}
                            disabled={!canManage}
                            className={`w-full py-1.5 px-2 text-center text-xs font-semibold rounded outline-none transition-colors ${
                              timetable[periodIdx]?.[dayIdx]
                                ? 'bg-amber-50/70 text-amber-900 font-bold'
                                : 'bg-transparent text-slate-700'
                            } ${canManage ? 'focus:bg-amber-100/60 focus:ring-1 focus:ring-amber-400 cursor-text' : 'cursor-default'}`}
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Stat Cards (3 cards) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 font-bold uppercase mb-1">NĂM HỌC HIỆN TẠI</p>
                <div className="flex items-center gap-2">
                  <select
                    value={currentYear}
                    onChange={(e) => setCurrentYear(e.target.value)}
                    className="text-2xl font-black text-[#0070f3] bg-transparent outline-none cursor-pointer"
                  >
                    {yearsData.map((yr) => (
                      <option key={yr} value={yr}>
                        {yr}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-[#0070f3] text-xl shadow-2xs">
                <Calendar className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 font-bold uppercase mb-1">TỔNG SỐ LỚP</p>
                <p className="text-2xl font-black text-emerald-600">{filteredClasses.length}</p>
              </div>
              <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 text-xl shadow-2xs">
                <Users className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 font-bold uppercase mb-1">TỔNG HỌC SINH</p>
                <p className="text-2xl font-black text-amber-500">{currentYearStudentsCount}</p>
              </div>
              <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-500 text-xl shadow-2xs">
                <GraduationCap className="w-6 h-6" />
              </div>
            </div>
          </div>

          {/* Action Header for Classes Grid */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between border-b border-slate-200 pb-4 gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h3 className="font-black text-slate-900 text-2xl tracking-tight">{currentYear}</h3>
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  CSDL độc lập: {currentUser?.fullName || 'Giáo viên'} ({currentUser?.role === 'admin' ? 'Quản trị viên' : 'Giáo viên'})
                </span>
              </div>
              <p className="text-xs font-bold text-slate-500 uppercase">TUẦN HIỆN TẠI: {currentWeek}/35</p>

              <div className="flex flex-wrap items-center gap-2 mt-4">
                {canManage && (
                  <button
                    onClick={handleOpenCreateClassModal}
                    className="px-5 py-2.5 bg-[#0070f3] text-white rounded-xl text-sm font-bold hover:bg-blue-700 flex items-center gap-2 transition-all shadow-md active:scale-95 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" /> Tạo lớp mới
                  </button>
                )}

                {/* Quản trị viên: Tùy chọn xem lớp của tôi hoặc xem tất cả giáo viên */}
                {currentUser?.role === 'admin' && (
                  <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold border border-slate-200">
                    <button
                      type="button"
                      onClick={() => setAdminViewAll(false)}
                      className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                        !adminViewAll
                          ? 'bg-white text-blue-700 shadow-2xs font-bold'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      📁 Chỉ lớp của tôi ({normalizedClasses.filter((c: ClassItem) => isClassVisibleForUser(c, currentUser, false) && c.year === currentYear).length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setAdminViewAll(true)}
                      className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                        adminViewAll
                          ? 'bg-white text-purple-700 shadow-2xs font-bold'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      🌐 Tất cả giáo viên ({normalizedClasses.filter((c: ClassItem) => c.year === currentYear).length})
                    </button>
                  </div>
                )}
              </div>
            </div>

            {isRealAdmin && (
              <button
                onClick={() => handleDeleteCurrentYear(currentYear)}
                className="text-slate-400 hover:text-red-500 transition-colors p-2.5 bg-white border border-slate-200 rounded-xl shadow-2xs cursor-pointer self-start sm:self-end"
                title="Xóa năm học này"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Classes Cards Grid / Empty State */}
          {filteredClasses.length === 0 ? (
            <div className="bg-white border-2 border-dashed border-slate-200 rounded-3xl p-10 text-center space-y-4 shadow-2xs">
              <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto text-3xl shadow-xs">
                🏫
              </div>
              <div className="max-w-md mx-auto">
                <h4 className="text-base font-bold text-slate-800">
                  Chưa có lớp học nào do bạn tạo trong năm học {currentYear}
                </h4>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Hệ thống phân quyền độc lập: Mỗi tài khoản giáo viên chỉ nhìn thấy và quản lý những lớp học do chính mình tạo ra. Dữ liệu điểm số và học sinh hoàn toàn bảo mật theo tài khoản.
                </p>
              </div>
              {canManage && (
                <button
                  onClick={handleOpenCreateClassModal}
                  className="px-5 py-2.5 bg-[#0070f3] hover:bg-blue-700 text-white font-bold text-sm rounded-xl shadow-xs transition-all inline-flex items-center gap-2 cursor-pointer"
                >
                  <Plus className="w-4 h-4" /> Tạo lớp học đầu tiên của bạn
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 pb-4">
              {filteredClasses.map((cls: ClassItem) => {
                const hsCount = studentsData.filter((s: StudentRecord) => s.classId === cls.id).length;
                return (
                  <div
                    key={cls.id}
                    className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs hover:shadow-md transition-all relative group"
                  >
                    {canManage && (
                      <div className="absolute top-4 right-4 flex gap-1.5 transition-opacity">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenEditClassModal(cls);
                          }}
                          className="w-8 h-8 bg-white hover:bg-blue-50 text-slate-600 hover:text-[#0070f3] border border-slate-200 hover:border-blue-300 rounded-full flex items-center justify-center shadow-xs transition-colors cursor-pointer"
                          title="Sửa lớp"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteClass(cls.id);
                          }}
                          className="w-8 h-8 bg-white hover:bg-rose-50 text-slate-600 hover:text-red-500 border border-slate-200 hover:border-rose-300 rounded-full flex items-center justify-center shadow-xs transition-colors cursor-pointer"
                          title="Xóa lớp"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}

                    <div className="flex justify-between items-start mb-4 pr-14">
                      <div>
                        <h4 className="font-black text-slate-900 text-lg">{cls.name}</h4>
                        <div className="flex items-center gap-1.5 mt-1">
                          <p className="text-xs text-slate-500 font-bold uppercase">{cls.grade}</p>
                          {adminViewAll && cls.createdByName && (
                            <span className="text-[10px] bg-slate-100 text-slate-600 font-medium px-1.5 py-0.5 rounded">
                              Tạo: {cls.createdByName}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between mt-4">
                      <p className="text-sm font-medium text-slate-600 bg-white/80 border border-slate-200/60 px-3 py-1.5 rounded-lg flex items-center gap-2">
                        <Users className="w-3.5 h-3.5 text-[#0070f3]" />
                        <span>{hsCount} HS</span>
                      </p>
                      <button
                        onClick={() => handleOpenClassDetail(cls.id)}
                        className="text-sm font-bold text-white bg-[#0070f3] px-4 py-2 rounded-lg hover:bg-blue-700 transition-all shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95"
                      >
                        <span>Mở lớp</span>
                        <span className="text-xs font-mono">→</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Add Year button */}
          {canManage && (
            <div>
              <button
                onClick={() => setShowAddYearModal(true)}
                className="px-5 py-2.5 border-2 border-dashed border-slate-300 text-slate-600 font-bold rounded-xl hover:border-blue-500 hover:text-blue-600 transition-all flex items-center gap-2 bg-white cursor-pointer"
              >
                <Plus className="w-4 h-4" /> + Thêm năm học
              </button>
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* VIEW 2: TAB CLASS DETAIL (BÊN TRONG LỚP HỌC VỚI 3 SUB-TABS) */}
      {/* ======================================================== */}
      {currentView === 'detail' && (
        <div className="space-y-6 animate-fadeIn pb-12">
          {/* Header & Sub-Tab Navigation Bar */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <button
                  onClick={() => {
                    setCurrentView('list');
                    if (onSelectClassExternal) {
                      onSelectClassExternal('');
                    }
                  }}
                  className="text-slate-900 font-bold hover:text-[#0070f3] flex items-center gap-2 mb-2 text-sm transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4 text-slate-900" /> <span>Tất cả năm học / lớp</span>
                </button>
                <div className="flex flex-wrap items-center gap-2.5">
                  <h2 className="text-2xl sm:text-3xl font-black text-slate-950 uppercase tracking-tight">
                    NĂM HỌC {currentYear?.replace('-', ' – ') || '2026 – 2027'}
                  </h2>
                </div>
                <div className="flex flex-wrap items-center gap-3 mt-1.5">
                  <h3 className="text-2xl sm:text-3xl font-black text-slate-950 uppercase tracking-tight flex items-center gap-2">
                    <span>LỚP {currentClass?.name}</span>
                    <span className="font-extrabold text-slate-950 normal-case">
                      ( {classStudents.length} Học sinh )
                    </span>
                  </h3>
                </div>
              </div>

              {/* Dropdown chuyển lớp gọn gàng, không bị tràn khi có nhiều lớp */}
              {filteredClasses.length > 1 && (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-700 hidden sm:inline">Chuyển lớp:</span>
                  <div className="relative">
                    <select
                      value={currentClassId}
                      onChange={(e) => handleOpenClassDetail(e.target.value)}
                      className="py-1.5 pl-3 pr-8 text-xs font-bold text-[#0070f3] bg-white border border-blue-300 hover:border-blue-500 rounded-xl shadow-2xs outline-none cursor-pointer appearance-none transition-all"
                    >
                      {filteredClasses.map((cls: ClassItem) => (
                        <option key={cls.id} value={cls.id}>
                          {cls.name} ({cls.grade})
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 text-[#0070f3] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>
              )}
            </div>

            {/* Sub-tab Switcher buttons */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSubTab('week')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-extrabold transition-all ${
                    subTab === 'week'
                      ? 'bg-blue-50 text-[#0070f3] border-2 border-blue-300 shadow-2xs'
                      : 'text-slate-800 hover:bg-slate-100 font-bold'
                  }`}
                >
                  <Calendar className="w-4 h-4 text-[#0070f3]" />
                  <span>Tuần</span>
                </button>
                <button
                  onClick={() => setSubTab('student')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-extrabold transition-all ${
                    subTab === 'student'
                      ? 'bg-blue-50 text-[#0070f3] border-2 border-blue-300 shadow-2xs'
                      : 'text-slate-800 hover:bg-slate-100 font-bold'
                  }`}
                >
                  <Users className="w-4 h-4 text-[#0070f3]" />
                  <span>Học sinh</span>
                </button>
                <button
                  onClick={() => setSubTab('grade')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-extrabold transition-all ${
                    subTab === 'grade'
                      ? 'bg-blue-50 text-[#0070f3] border-2 border-blue-300 shadow-2xs'
                      : 'text-slate-800 hover:bg-slate-100 font-bold'
                  }`}
                >
                  <GraduationCap className="w-4 h-4 text-[#0070f3]" />
                  <span>Điểm</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (classStudents.length === 0) {
                    alert('Lớp chưa có học sinh nào để gọi tên ngẫu nhiên! Vui lòng thêm học sinh hoặc nhập file Excel trước.');
                    return;
                  }
                  setIsLocalRandomPickerOpen(true);
                }}
                className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold shadow-2xs transition-all active:scale-95 cursor-pointer"
                title="Quay bốc thăm học sinh ngẫu nhiên"
              >
                <Shuffle className="w-4 h-4" />
                <span>Gọi tên ngẫu nhiên</span>
              </button>
            </div>
          </div>

          {/* ==================================================== */}
          {/* SUB-TAB 1: TUẦN (QUẢN LÝ TUẦN, ĐIỂM DANH, ĐÁNH GIÁ) */}
          {/* ==================================================== */}
          {subTab === 'week' && (
            <div className="space-y-6">
              {/* Box 1: Week Selector & Date Management */}
              <div className="bg-white rounded-2xl p-6 shadow-2xs border border-slate-200">
                <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-4 border-b border-slate-100 pb-4 mb-5">
                  <h3 className="text-lg font-black text-[#0070f3] uppercase tracking-wide">
                    TUẦN {currentWeek}/35
                  </h3>
                  <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-2.5">
                      <label className="text-sm font-black text-slate-950 whitespace-nowrap">Từ ngày</label>
                      <input
                        type="date"
                        value={weekStartDate}
                        onChange={(e) => setWeekStartDate(e.target.value)}
                        disabled={!canManage}
                        className="border border-slate-300 bg-white rounded-xl px-3 py-2 outline-none focus:border-[#0070f3] text-sm font-black text-slate-950 w-[145px] transition shadow-2xs"
                      />
                    </div>
                    <div className="flex items-center gap-2.5">
                      <label className="text-sm font-black text-slate-950 whitespace-nowrap">Đến ngày</label>
                      <input
                        type="date"
                        value={weekEndDate}
                        onChange={(e) => setWeekEndDate(e.target.value)}
                        disabled={!canManage}
                        className="border border-slate-300 bg-white rounded-xl px-3 py-2 outline-none focus:border-[#0070f3] text-sm font-black text-slate-950 w-[145px] transition shadow-2xs"
                      />
                    </div>
                    {canManage && (
                      <div className="relative flex flex-col items-center">
                        <button
                          onClick={handleSaveWeekDates}
                          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                            saveWeekDateSuccess
                              ? 'bg-emerald-600 text-white'
                              : 'bg-[#0070f3] hover:bg-blue-700 text-white'
                          }`}
                        >
                          {saveWeekDateSuccess ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
                          <span>{saveWeekDateSuccess ? 'Đã lưu' : 'Lưu'}</span>
                        </button>
                        {isAutoDateHint && (
                          <div className="absolute top-full mt-1 text-[11px] text-emerald-600 font-bold whitespace-nowrap">
                            <Sparkles className="w-3 h-3 inline mr-0.5" /> Đã tự tính
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* 35 Circular Week Selector Buttons */}
                <div className="flex flex-wrap gap-2 pt-1">
                  {Array.from({ length: 35 }, (_, i) => i + 1).map((weekNum) => {
                    const isActive = weekNum === currentWeek;
                    const weekKey = `${currentClassId}_${weekNum}`;
                    const hasData = weeksData[weekKey] && (weeksData[weekKey].start || weeksData[weekKey].end);

                    return (
                      <button
                        key={weekNum}
                        onClick={() => setCurrentWeek(weekNum)}
                        className={`w-[40px] h-[40px] rounded-full flex flex-col justify-center items-center text-sm cursor-pointer transition border relative shrink-0 ${
                          isActive
                            ? 'bg-[#0070f3] text-white font-black border-[#0070f3] shadow-xs'
                            : 'bg-white text-slate-950 font-bold hover:bg-slate-100 border-slate-300'
                        }`}
                      >
                        <span className={hasData ? 'mb-[3px]' : ''}>{weekNum}</span>
                        {hasData && (
                          <div
                            className={`absolute bottom-[3px] w-1.5 h-1.5 rounded-full ${
                              isActive ? 'bg-white' : 'bg-[#0070f3]'
                            }`}
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2 Stat Boxes for current week */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs">
                  <h5 className="text-sm font-black text-slate-950 uppercase tracking-wider mb-2">
                    Điểm danh Tuần {currentWeek}
                  </h5>
                  <p className="text-slate-950 font-black text-sm">
                    {presentWeekCount > 0 || absentWeekCount > 0
                      ? `Có mặt: ${presentWeekCount} · Vắng: ${absentWeekCount} / ${classStudents.length} HS`
                      : 'Chưa lưu điểm danh tuần này.'}
                  </p>
                </div>
                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs">
                  <h5 className="text-sm font-black text-slate-950 uppercase tracking-wider mb-2">
                    Đánh giá Tuần {currentWeek}
                  </h5>
                  <p className="text-slate-950 font-black text-sm">
                    {goodRankCount > 0
                      ? `Đã đánh giá mức Tốt cho ${goodRankCount} học sinh.`
                      : 'Chưa có đánh giá tuần này.'}
                  </p>
                </div>
              </div>

              {/* Box 2: Attendance & Student Evaluation Area */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs min-h-[380px]">
                {/* Search student autocomplete */}
                <div className="mb-6 relative">
                  <label className="block text-sm font-bold text-slate-900 mb-2">Học sinh</label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Gõ tên để tìm kiếm (VD: Nguyễn Văn A)..."
                      value={evalStudentSearch}
                      onChange={(e) => {
                        setEvalStudentSearch(e.target.value);
                        setIsEvalDropdownOpen(true);
                      }}
                      onFocus={() => setIsEvalDropdownOpen(true)}
                      className="w-full border border-slate-300 rounded-xl px-4 py-3 outline-none focus:border-[#0070f3] focus:ring-2 focus:ring-blue-100 text-sm font-bold text-blue-900 transition"
                    />
                    <Search className="w-4 h-4 absolute top-4 right-4 text-slate-400" />
                  </div>

                  {/* Dropdown list */}
                  {isEvalDropdownOpen && (
                    <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-60 overflow-y-auto divide-y divide-slate-100">
                      {classStudents
                        .filter((s: StudentRecord) =>
                          s.name.toLowerCase().includes(evalStudentSearch.toLowerCase()) ||
                          s.code.toLowerCase().includes(evalStudentSearch.toLowerCase())
                        )
                        .map((st: StudentRecord) => (
                          <div
                            key={st.id}
                            onClick={() => {
                              setSelectedEvalStudentId(st.id);
                              setEvalStudentSearch(`${st.name} (${st.code})`);
                              setIsEvalDropdownOpen(false);
                            }}
                            className="px-5 py-3 hover:bg-blue-50 cursor-pointer text-sm font-medium text-slate-800 transition-colors flex items-center justify-between"
                          >
                            <span>{st.name}</span>
                            <span className="text-xs font-mono text-slate-400">({st.code})</span>
                          </div>
                        ))}
                    </div>
                  )}
                </div>

                {/* Selected Student Evaluation Card */}
                {selectedEvalStudentId ? (
                  <div className="space-y-6">
                    {(() => {
                      const st = studentsData.find((s) => s.id === selectedEvalStudentId);
                      if (!st) return null;
                      return (
                        <>
                          <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 border-b border-slate-100 pb-5">
                            <div className="flex items-center gap-3 flex-wrap">
                              <h3 className="text-xl font-black text-slate-900 tracking-tight">
                                {st.name}{' '}
                                <span className="font-normal text-slate-500 text-base">({st.code})</span>
                              </h3>
                              {canManage && (
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => handleOpenAddStudentModal(st.id)}
                                    className="text-xs font-semibold text-slate-600 hover:text-blue-600 flex items-center gap-1 bg-slate-100 hover:bg-blue-50 px-2.5 py-1 rounded-lg transition"
                                  >
                                    <Edit className="w-3 h-3" /> Sửa
                                  </button>
                                  <button
                                    onClick={() => handleDeleteStudent(st.id)}
                                    className="text-xs font-semibold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 px-2.5 py-1 rounded-lg flex items-center gap-1 transition"
                                  >
                                    <Trash2 className="w-3 h-3" /> Xóa
                                  </button>
                                </div>
                              )}
                            </div>

                            {canManage && (
                              <button
                                onClick={handleSaveStudentEval}
                                className={`text-sm font-bold px-5 py-2 rounded-xl transition-all flex items-center justify-center gap-2 shadow-xs whitespace-nowrap shrink-0 ${
                                  saveEvalSuccess
                                    ? 'bg-emerald-600 text-white'
                                    : 'bg-[#0070f3] hover:bg-blue-700 text-white'
                                }`}
                              >
                                {saveEvalSuccess ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                                <span>{saveEvalSuccess ? 'Đã lưu đánh giá' : 'Lưu đánh giá'}</span>
                              </button>
                            )}
                          </div>

                          {/* Điểm danh */}
                          <div>
                            <label className="block text-sm font-bold text-slate-900 mb-3">Điểm danh</label>
                            <div className="flex flex-wrap gap-2">
                              {(['Có mặt', 'Vắng', 'Để trống'] as const).map((opt) => (
                                <button
                                  key={opt}
                                  onClick={canManage ? () => setCurrentAttVal(opt) : undefined}
                                  className={`btn-option ${currentAttVal === opt ? 'selected' : ''}`}
                                >
                                  {opt}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Đánh giá */}
                          <div>
                            <label className="block text-sm font-bold text-slate-900 mb-3">Đánh giá</label>
                            <div className="flex flex-wrap gap-2 mb-3">
                              {(['Tốt', 'Khá', 'Trung bình', 'Yếu'] as const).map((rank) => (
                                <button
                                  key={rank}
                                  onClick={canManage ? () => setCurrentRankVal(rank) : undefined}
                                  className={`btn-option ${currentRankVal === rank ? 'selected' : ''}`}
                                >
                                  {rank}
                                </button>
                              ))}
                            </div>

                            <div className="flex flex-col md:flex-row gap-3">
                              <input
                                type="text"
                                value="Mức đánh giá (tuỳ chỉnh)"
                                readOnly
                                className="w-full md:w-1/3 border border-slate-300 rounded-xl px-4 py-2.5 bg-slate-50 text-slate-700 font-bold text-xs outline-none"
                              />
                              <input
                                type="text"
                                placeholder="gõ nhận xét (VD: tốt, cần cố gắng)..."
                                value={evalCustomText}
                                onChange={(e) => setEvalCustomText(e.target.value)}
                                disabled={!canManage}
                                className="w-full md:w-2/3 border border-slate-300 rounded-xl px-4 py-2.5 outline-none focus:border-[#0070f3] focus:ring-2 focus:ring-blue-100 text-sm font-medium text-slate-800"
                              />
                            </div>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                ) : (
                  <div className="text-center py-12 mt-6 border-2 border-dashed border-slate-200 rounded-2xl">
                    <Search className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-500 font-medium text-sm">
                      Hãy gõ tên và chọn học sinh ở ô tìm kiếm phía trên để điểm danh và đánh giá.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ==================================================== */}
          {/* SUB-TAB 2: HỌC SINH (QUẢN LÝ DANH SÁCH & XUẤT EXCEL) */}
          {/* ==================================================== */}
          {subTab === 'student' && (
            <div className="bg-white rounded-2xl shadow-2xs border border-slate-200 p-6 space-y-6">
              <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-4 border-b border-slate-100 pb-5">
                <div>
                  <h3 className="text-2xl font-bold text-slate-900 mb-1">Danh sách học sinh</h3>
                  <p className="text-sm text-slate-600 font-medium">Thêm học sinh mới để quản lý.</p>
                </div>
                <div className="flex flex-wrap items-center gap-2.5">
                  <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 shadow-2xs">
                    <span className="text-xs font-bold text-slate-600">↓↑ Sắp xếp:</span>
                    <select
                      value={studentSortType}
                      onChange={(e) => setStudentSortType(e.target.value as 'default' | 'code' | 'alphabet')}
                      className="text-xs font-bold text-[#0070f3] outline-none bg-transparent cursor-pointer"
                    >
                      <option value="default">Chuẩn</option>
                      <option value="code">Mã HS</option>
                      <option value="alphabet">Họ tên</option>
                    </select>
                  </div>

                  <button
                    type="button"
                    onClick={handleExportStudentsExcel}
                    className="bg-[#0070f3] hover:bg-blue-700 text-white px-3.5 py-2 rounded-lg font-bold transition flex items-center gap-1.5 text-xs shadow-2xs whitespace-nowrap cursor-pointer active:scale-95"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Xuất Excel</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowImportExcelModal(true)}
                    className="bg-[#0070f3] hover:bg-blue-700 text-white px-3.5 py-2 rounded-lg font-bold transition flex items-center gap-1.5 text-xs shadow-2xs whitespace-nowrap cursor-pointer active:scale-95"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    <span>Nhập Excel</span>
                  </button>

                  {canManage && (
                    <>
                      <button
                        type="button"
                        onClick={() => handleOpenAddStudentModal()}
                        className="bg-[#0070f3] hover:bg-blue-700 text-white px-3.5 py-2 rounded-lg font-bold transition flex items-center gap-1.5 text-xs shadow-2xs whitespace-nowrap cursor-pointer active:scale-95"
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                        <span>Thêm HS</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleDeleteAllStudentsInClass}
                        className="bg-white hover:bg-rose-50 text-rose-600 px-3.5 py-2 rounded-lg font-bold transition flex items-center gap-1.5 text-xs border border-rose-300 shadow-2xs whitespace-nowrap cursor-pointer active:scale-95"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Xóa tất cả</span>
                      </button>
                    </>
                  )}
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-100/80 text-slate-700 text-[11px] uppercase tracking-wider font-bold">
                      <th className="p-3 w-14 text-center">STT</th>
                      <th className="p-3 w-32">MÃ HS</th>
                      <th className="p-3">HỌ VÀ TÊN</th>
                      <th className="p-3 text-center w-36">NGÀY SINH</th>
                      <th className="p-3 text-center w-28">GIỚI TÍNH</th>
                      {canManage && <th className="p-3 text-center w-20">XÓA</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {sortedStudents.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center p-12 text-slate-500 font-semibold text-sm">
                          Lớp chưa có học sinh. Bấm "Thêm học sinh" hoặc "Nhập Excel".
                        </td>
                      </tr>
                    ) : (
                      sortedStudents.map((st, index) => (
                        <tr key={st.id} className="hover:bg-blue-50/50 transition-colors">
                          <td className="p-3 text-center font-mono text-slate-400 font-bold">{index + 1}</td>
                          <td className="p-3">
                            <input
                              type="text"
                              value={st.code}
                              onChange={(e) => handleUpdateStudentInline(st.id, 'code', e.target.value)}
                              disabled={!canManage}
                              className="editable-input bg-transparent w-full text-xs font-bold text-slate-700 px-1 py-0.5 rounded"
                            />
                          </td>
                          <td className="p-3">
                            <input
                              type="text"
                              value={st.name}
                              onChange={(e) => handleUpdateStudentInline(st.id, 'name', e.target.value)}
                              disabled={!canManage}
                              className="editable-input bg-transparent w-full text-sm font-bold text-blue-900 px-1 py-0.5 rounded"
                            />
                          </td>
                          <td className="p-3 text-center">
                            <input
                              type="date"
                              value={st.dob || ''}
                              onChange={(e) => handleUpdateStudentInline(st.id, 'dob', e.target.value)}
                              disabled={!canManage}
                              className="editable-input bg-transparent text-xs text-slate-600 px-1 py-0.5 rounded"
                            />
                          </td>
                          <td className="p-3 text-center">
                            <select
                              value={st.gender || ''}
                              onChange={(e) => handleUpdateStudentInline(st.id, 'gender', e.target.value)}
                              disabled={!canManage}
                              className="editable-input bg-transparent text-xs font-semibold outline-none cursor-pointer"
                            >
                              <option value="">-</option>
                              <option value="Nam">Nam</option>
                              <option value="Nữ">Nữ</option>
                            </select>
                          </td>
                          {canManage && (
                            <td className="p-3 text-center">
                              <button
                                onClick={() => handleDeleteStudent(st.id)}
                                className="text-slate-400 hover:text-red-500 transition-colors p-1"
                                title="Xóa học sinh"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          )}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ==================================================== */}
          {/* SUB-TAB 3: ĐIỂM (BẢNG ĐIỂM HỌC KỲ 1 & CUỐI NĂM) */}
          {/* ==================================================== */}
          {subTab === 'grade' && (
            <div className="bg-white rounded-2xl shadow-2xs border border-slate-200 p-6 space-y-6">
              <div className="flex flex-col xl:flex-row justify-between xl:items-center gap-4 border-b border-slate-100 pb-5">
                <div>
                  <h3 className="text-2xl font-bold text-slate-900 mb-1">
                    Điểm học tập · {currentClass?.name}
                  </h3>
                  <p className="text-sm text-slate-500">
                    Nhập điểm Lý thuyết, Thực hành để tự động tính Tổng điểm (làm tròn) và Xếp loại (Tổng 9 - 10: T, ngược lại: H).
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  {/* Học kỳ 1 vs Cuối năm */}
                  <div className="flex bg-slate-100 p-1 rounded-xl">
                    <button
                      onClick={() => setCurrentTerm('hk1')}
                      className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        currentTerm === 'hk1'
                          ? 'bg-white text-[#0070f3] shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Học kỳ 1
                    </button>
                    <button
                      onClick={() => setCurrentTerm('hk2')}
                      className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        currentTerm === 'hk2'
                          ? 'bg-white text-[#0070f3] shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Cuối năm
                    </button>
                  </div>

                  {/* Sắp xếp */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-700 hidden md:inline-block">Sắp xếp theo</span>
                    <select
                      value={gradeSortType}
                      onChange={(e) => setGradeSortType(e.target.value as 'default' | 'alphabet' | 'code')}
                      className="border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-bold text-[#0070f3] outline-none focus:border-[#0070f3] bg-white cursor-pointer"
                    >
                      <option value="default">Chuẩn</option>
                      <option value="alphabet">Alphabet</option>
                      <option value="code">Mã HS</option>
                    </select>
                  </div>

                  <button
                    onClick={handleExportGradesExcel}
                    className="bg-[#0070f3] hover:bg-blue-700 text-white px-4 py-2 rounded-xl font-bold transition flex items-center justify-center gap-2 text-xs shadow-2xs whitespace-nowrap"
                  >
                    <Download className="w-3.5 h-3.5" /> Xuất Excel
                  </button>

                  {canManage && (
                    <button
                      onClick={handleSaveAllGrades}
                      className={`px-4 py-2 rounded-xl font-bold transition flex items-center justify-center gap-2 text-xs shadow-2xs whitespace-nowrap ${
                        saveGradeSuccess
                          ? 'bg-emerald-600 text-white'
                          : 'bg-[#0070f3] hover:bg-blue-700 text-white'
                      }`}
                    >
                      {saveGradeSuccess ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
                      <span>{saveGradeSuccess ? 'Đã lưu điểm' : 'Lưu điểm'}</span>
                    </button>
                  )}
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b-2 border-slate-100 text-slate-800 text-xs">
                      <th className="p-3 font-bold w-12 text-center">STT</th>
                      <th className="p-3 font-bold">Học sinh</th>
                      <th className="p-3 font-bold text-center w-28">Lý thuyết</th>
                      <th className="p-3 font-bold text-center w-28">Thực hành</th>
                      <th className="p-3 font-bold text-center w-24">Tổng</th>
                      <th className="p-3 font-bold text-center w-24">Xếp loại</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {sortedGradeStudents.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center p-8 text-slate-400 font-medium">
                          Chưa có học sinh nào trong lớp.
                        </td>
                      </tr>
                    ) : (
                      sortedGradeStudents.map((st, idx) => {
                        const key = `${st.id}_${currentTerm}`;
                        const keyCode = st.code ? `${st.code}_${currentTerm}` : '';
                        const rec = gradeData[key] || (keyCode ? gradeData[keyCode] : null) || { lt: '', th: '', total: '', rank: '' };
                        return (
                          <tr key={st.id} className="hover:bg-slate-50 transition-colors">
                            <td className="p-3 text-center font-mono text-slate-400 font-bold">{idx + 1}</td>
                            <td className="p-3">
                              <span className="font-bold text-slate-800 text-sm">{st.name}</span>
                              <span className="text-xs text-slate-400 ml-2 font-mono">({st.code})</span>
                            </td>
                            <td className="p-3 text-center">
                              <input
                                type="text"
                                value={rec.lt}
                                onChange={(e) => handleGradeChange(st.id, 'lt', e.target.value)}
                                disabled={!canManage}
                                placeholder="0 - 5"
                                className="grade-input"
                              />
                            </td>
                            <td className="p-3 text-center">
                              <input
                                type="text"
                                value={rec.th}
                                onChange={(e) => handleGradeChange(st.id, 'th', e.target.value)}
                                disabled={!canManage}
                                placeholder="0 - 5"
                                className="grade-input"
                              />
                            </td>
                            <td className="p-3 text-center">
                              <div className="grade-total mx-auto">
                                {rec.total || '-'}
                              </div>
                            </td>
                            <td className="p-3 text-center">
                              <span
                                className={`grade-rank inline-block font-extrabold ${
                                  rec.rank === 'T'
                                    ? 'text-emerald-600'
                                    : rec.rank === 'H'
                                    ? 'text-blue-600'
                                    : 'text-slate-400'
                                }`}
                              >
                                {rec.rank || '-'}
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 1: TẠO / SỬA LỚP HỌC */}
      {/* ======================================================== */}
      {showClassModal && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex justify-center items-center px-4 backdrop-blur-xs">
          <div className="bg-white rounded-[1.5rem] shadow-2xl w-full max-w-md p-6 animate-fadeIn">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-slate-900">
                {isEditingClass ? 'Sửa thông tin lớp học' : 'Tạo lớp học mới'}
              </h3>
              <button
                onClick={() => setShowClassModal(false)}
                className="text-slate-500 font-bold hover:text-red-500 text-sm cursor-pointer"
              >
                Đóng
              </button>
            </div>
            <form onSubmit={handleSubmitClass} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Năm học</label>
                <select
                  value={classFormYear}
                  onChange={(e) => setClassFormYear(e.target.value)}
                  className="w-full border border-slate-300 bg-white rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-[#0070f3] text-slate-900 text-xs font-bold cursor-pointer"
                >
                  {yearsData.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Tên lớp *</label>
                <input
                  type="text"
                  placeholder="Ví dụ: 1/1 (ĐIỆP) hoặc 4/1 (HOÀNG)"
                  value={classFormName}
                  onChange={(e) => setClassFormName(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-[#0070f3] text-sm font-bold text-slate-900"
                  autoFocus
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Khối lớp *</label>
                <select
                  value={classFormGrade}
                  onChange={(e) => setClassFormGrade(e.target.value)}
                  className="w-full border border-slate-300 bg-white rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-[#0070f3] text-sm font-bold text-slate-900 cursor-pointer"
                  required
                >
                  <option value="1">Khối 1</option>
                  <option value="2">Khối 2</option>
                  <option value="3">Khối 3</option>
                  <option value="4">Khối 4</option>
                  <option value="5">Khối 5</option>
                </select>
              </div>
              <div className="flex justify-between items-center mt-8 pt-4 border-t border-slate-100">
                {isEditingClass && (editingClassId || currentClassId) ? (
                  <button
                    type="button"
                    onClick={() => {
                      const target = (editingClassId || currentClassId)!;
                      setShowClassModal(false);
                      handleDeleteClass(target);
                    }}
                    className="px-3.5 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer active:scale-95"
                    title="Xóa lớp này"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Xóa lớp này</span>
                  </button>
                ) : (
                  <div />
                )}
                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => setShowClassModal(false)}
                    className="px-5 py-2.5 border border-slate-300 rounded-xl text-slate-700 font-bold hover:bg-slate-50 text-xs shadow-2xs cursor-pointer"
                  >
                    Huỷ
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 bg-[#0070F3] hover:bg-blue-700 text-white rounded-xl font-bold transition text-xs shadow-2xs cursor-pointer active:scale-95"
                  >
                    {isEditingClass ? 'Lưu thay đổi' : 'Tạo lớp'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 2: THÊM / SỬA HỌC SINH */}
      {/* ======================================================== */}
      {showStudentModal && (
        <div className="fixed inset-0 bg-black/50 z-[110] flex justify-center items-center px-4 backdrop-blur-xs">
          <div className="bg-white rounded-[1.5rem] shadow-2xl w-full max-w-2xl p-8 relative animate-fadeIn">
            <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
              <h3 className="text-2xl font-bold text-slate-900">
                {editingStudentId ? 'Sửa thông tin học sinh' : 'Thêm học sinh'}
              </h3>
              <button
                onClick={() => setShowStudentModal(false)}
                className="text-slate-500 font-bold hover:text-red-500"
              >
                Đóng
              </button>
            </div>
            <form onSubmit={handleSubmitStudent} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-900 mb-1.5">Họ tên *</label>
                <input
                  type="text"
                  placeholder="Ví dụ: Lâm Mẫn Nghi"
                  value={studentFormName}
                  onChange={(e) => setStudentFormName(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-[#0070f3] text-sm font-semibold"
                  autoFocus
                  required
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-900 mb-1.5">Mã học sinh *</label>
                  <input
                    type="text"
                    placeholder="Ví dụ: HS23"
                    value={studentFormCode}
                    onChange={(e) => setStudentFormCode(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-[#0070f3] text-sm font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-900 mb-1.5">Ngày sinh</label>
                  <input
                    type="date"
                    value={studentFormDob}
                    onChange={(e) => setStudentFormDob(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-[#0070f3] text-xs text-slate-600"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-900 mb-1.5">Giới tính</label>
                <select
                  value={studentFormGender}
                  onChange={(e) => setStudentFormGender(e.target.value as 'Nam' | 'Nữ')}
                  className="w-full border border-slate-300 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-[#0070f3] bg-white text-xs font-medium"
                >
                  <option value="">Chưa chọn</option>
                  <option value="Nam">Nam</option>
                  <option value="Nữ">Nữ</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-900 mb-1.5">Ghi chú</label>
                <textarea
                  placeholder="Ghi chú thêm (không bắt buộc)"
                  rows={3}
                  value={studentFormNote}
                  onChange={(e) => setStudentFormNote(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-[#0070f3] resize-none text-xs"
                />
              </div>
              <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowStudentModal(false)}
                  className="px-6 py-2.5 border border-slate-300 rounded-xl text-slate-700 font-bold hover:bg-slate-50 transition text-xs shadow-2xs"
                >
                  Huỷ
                </button>
                <button
                  type="submit"
                  className="px-8 py-2.5 bg-[#0070F3] hover:bg-blue-700 text-white rounded-xl font-bold transition text-xs shadow-2xs"
                >
                  {editingStudentId ? 'Lưu thay đổi' : 'Lưu học sinh'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 3: THÊM NĂM HỌC */}
      {/* ======================================================== */}
      {showAddYearModal && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex justify-center items-center px-4 backdrop-blur-xs">
          <div className="bg-white rounded-[1.5rem] shadow-2xl w-full max-w-sm p-6 animate-fadeIn">
            <h3 className="text-lg font-bold text-slate-900 mb-3">Thêm năm học mới</h3>
            <p className="text-xs text-slate-500 mb-4">
              Nhập tên niên khóa (ví dụ: 2027-2028 hoặc 2026-2027).
            </p>
            <input
              type="text"
              placeholder="VD: 2027-2028"
              value={newYearInput}
              onChange={(e) => setNewYearInput(e.target.value)}
              className="w-full border border-slate-300 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-[#0070f3] text-sm font-semibold mb-6"
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAddYearModal(false)}
                className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleAddYear}
                className="px-5 py-2 bg-[#0070f3] hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs"
              >
                Thêm năm học
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 4: NHẬP DANH SÁCH HỌC SINH TỪ EXCEL (ẢNH 2) */}
      {/* ======================================================== */}
      {showImportExcelModal && (
        <div className="fixed inset-0 bg-black/50 z-[120] flex justify-center items-center px-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl p-6 md:p-8 relative animate-fadeIn">
            {/* Hidden File Input */}
            <input
              type="file"
              ref={excelFileInputRef}
              accept=".xlsx, .xls"
              onChange={handleImportExcelFile}
              className="hidden"
            />

            {/* Header: Tiêu đề + Nút Đóng */}
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl md:text-2xl font-bold text-slate-900">
                Nhập danh sách học sinh
              </h3>
              <button
                type="button"
                onClick={() => setShowImportExcelModal(false)}
                className="text-sm font-bold text-slate-800 hover:text-rose-600 transition-colors px-2 py-1 cursor-pointer"
              >
                Đóng
              </button>
            </div>

            {/* Hai nút hành động: Xuất file mẫu & Nhập file mẫu */}
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <button
                type="button"
                onClick={handleExportSampleExcel}
                className="w-full sm:flex-1 py-3 px-4 border border-slate-300 rounded-xl text-slate-800 hover:bg-slate-50 font-bold text-sm transition flex items-center justify-center gap-2 shadow-2xs cursor-pointer active:scale-98"
              >
                <Download className="w-4 h-4 text-slate-600" />
                <span>Xuất file mẫu</span>
              </button>

              <button
                type="button"
                onClick={() => excelFileInputRef.current?.click()}
                className="w-full sm:flex-1 py-3 px-4 bg-[#0070F3] hover:bg-blue-700 text-white rounded-xl font-bold text-sm transition flex items-center justify-center gap-2 shadow-2xs cursor-pointer active:scale-98"
              >
                <Upload className="w-4 h-4 text-white" />
                <span>Nhập file mẫu</span>
              </button>
            </div>

            {/* Chú thích hướng dẫn cột bắt buộc */}
            <p className="mt-4 text-xs md:text-sm text-slate-900 font-semibold leading-relaxed">
              Cột bắt buộc: Mã học sinh, Họ và tên. Tối đa 200 học sinh, file tối đa 2 MB (.xlsx hoặc .xls). Bạn có thể dùng file đã xuất từ lớp này để thêm học sinh mới.
            </p>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 5: QUAY SỐ GỌI TÊN HỌC SINH NGẪU NHIÊN */}
      {/* ======================================================== */}
      <RandomPickerModal
        isOpen={isLocalRandomPickerOpen}
        onClose={() => setIsLocalRandomPickerOpen(false)}
        students={pickerStudents}
        onRewardStudent={handleRewardStudentFromPicker}
      />
    </div>
  );
};

