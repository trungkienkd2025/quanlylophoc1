import React, { useState, useEffect, useMemo } from 'react';
import * as XLSX from 'xlsx';
import {
  Download,
  Search,
  Filter,
  BarChart3,
  Award,
  Users,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
} from 'lucide-react';
import { StudentCommentsManager, sortStudentsLikeGradeTab } from './StudentCommentsManager';

import { UserAccount } from '../types';
import { isClassVisibleForUser } from '../utils/userScope';
import {
  getSavedClasses,
  getSavedStudents,
  getSavedGrades,
  getSavedCurrentYear,
} from '../utils/dbStorage';

interface ClassItem {
  id: string;
  year: string;
  name: string;
  grade: string;
  bg?: string;
  createdBy?: string;
  createdByName?: string;
}

interface StudentRecord {
  id: string;
  classId: string;
  code: string;
  name: string;
  dob?: string;
  gender?: string;
  note?: string;
  orderIndex?: number;
}

interface GradeRecord {
  lt: string;
  th: string;
  total: string;
  rank: string;
}

interface ReportsSectionProps {
  isAdmin?: boolean;
  currentUser?: UserAccount;
}

export const ReportsSection: React.FC<ReportsSectionProps> = ({ isAdmin = true, currentUser }) => {
  // Current academic year
  const [currentYear, setCurrentYear] = useState<string>(() => getSavedCurrentYear(currentUser));

  // Classes list
  const [classesList, setClassesList] = useState<ClassItem[]>(() => getSavedClasses(currentUser));

  // Students list
  const [studentsList, setStudentsList] = useState<StudentRecord[]>(() => getSavedStudents(currentUser));

  // Grades data: { [studentId_term]: { lt, th, total, rank } }
  const [gradeData, setGradeData] = useState<Record<string, GradeRecord>>(() => getSavedGrades(currentUser));

  // Listen for user switch and background updates
  useEffect(() => {
    const handleSync = () => {
      try {
        setClassesList(getSavedClasses(currentUser));
        setStudentsList(getSavedStudents(currentUser));
        setGradeData(getSavedGrades(currentUser));
        setCurrentYear(getSavedCurrentYear(currentUser));
      } catch {}
    };

    handleSync();
    window.addEventListener('qllh_data_updated', handleSync);
    return () => window.removeEventListener('qllh_data_updated', handleSync);
  }, [currentUser?.id, currentUser?.username]);

  // Filter states
  // 'all' or specific class ID
  const [selectedClassId, setSelectedClassId] = useState<string>('all');
  // 'hk1' (Học kỳ 1) or 'hk2' (Cả năm)
  const [selectedTerm, setSelectedTerm] = useState<'hk1' | 'hk2'>('hk1');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCommentsModal, setShowCommentsModal] = useState(false);

  // Classes filtered by current year AND logged-in user
  const yearClasses = useMemo(() => {
    return classesList.filter((c) => c.year === currentYear && isClassVisibleForUser(c, currentUser));
  }, [classesList, currentYear, currentUser]);

  // Selected class object
  const currentSelectedClass = useMemo(() => {
    if (selectedClassId === 'all') return null;
    return classesList.find((c) => c.id === selectedClassId) || null;
  }, [selectedClassId, classesList]);

  // Get active grade sort type
  const [reportSortType, setReportSortType] = useState<'default' | 'alphabet' | 'code'>(() => {
    try {
      const saved = localStorage.getItem('qllh_grade_sort_type');
      if (saved === 'default' || saved === 'alphabet' || saved === 'code') return saved;
    } catch {}
    return 'default';
  });

  useEffect(() => {
    const handleSortSync = (e: any) => {
      if (e?.detail) setReportSortType(e.detail);
      else {
        const saved = localStorage.getItem('qllh_grade_sort_type');
        if (saved === 'default' || saved === 'alphabet' || saved === 'code') setReportSortType(saved);
      }
    };
    window.addEventListener('qllh_grade_sort_changed', handleSortSync);
    window.addEventListener('storage', handleSortSync);
    return () => {
      window.removeEventListener('qllh_grade_sort_changed', handleSortSync);
      window.removeEventListener('storage', handleSortSync);
    };
  }, []);

  // Students matching the selected class filter
  const filteredStudents = useMemo(() => {
    let result = studentsList;

    if (selectedClassId !== 'all') {
      result = result.filter((s) => s.classId === selectedClassId);
    } else {
      // If 'all', limit to classes of the current year
      const yearClassIds = new Set(yearClasses.map((c) => c.id));
      result = result.filter((s) => yearClassIds.has(s.classId));
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.code.toLowerCase().includes(q)
      );
    }

    // Sort: maintain class order if 'all', then apply grade tab sorting rule
    return [...result].sort((a, b) => {
      if (selectedClassId === 'all') {
        const classA = classesList.find((c) => c.id === a.classId)?.name || '';
        const classB = classesList.find((c) => c.id === b.classId)?.name || '';
        const cmpClass = classA.localeCompare(classB, 'vi', { numeric: true });
        if (cmpClass !== 0) return cmpClass;
      }
      if (reportSortType === 'alphabet') {
        const nameA = a.name.trim().split(' ').pop() || '';
        const nameB = b.name.trim().split(' ').pop() || '';
        const cmp = nameA.localeCompare(nameB, 'vi');
        if (cmp !== 0) return cmp;
        return a.name.localeCompare(b.name, 'vi');
      }
      if (reportSortType === 'code') {
        return a.code.localeCompare(b.code, 'vi', { numeric: true });
      }
      // 'default' (Chuẩn)
      if (a.orderIndex !== undefined && b.orderIndex !== undefined) {
        return a.orderIndex - b.orderIndex;
      }
      return 0;
    });
  }, [studentsList, selectedClassId, yearClasses, searchQuery, classesList, reportSortType]);

  // Quick statistics
  const stats = useMemo(() => {
    let goodCount = 0; // Rank T
    let passCount = 0; // Rank H
    let unrankedCount = 0;

    for (const st of filteredStudents) {
      const key = `${st.id}_${selectedTerm}`;
      const keyCode = st.code ? `${st.code}_${selectedTerm}` : '';
      const rec = gradeData[key] || (keyCode ? gradeData[keyCode] : null);
      if (rec && rec.rank === 'T') {
        goodCount++;
      } else if (rec && rec.rank === 'H') {
        passCount++;
      } else {
        unrankedCount++;
      }
    }

    return {
      total: filteredStudents.length,
      good: goodCount,
      pass: passCount,
      unranked: unrankedCount,
    };
  }, [filteredStudents, gradeData, selectedTerm]);

  // Helper to sanitize Excel sheet names (max 31 chars, no invalid chars /\?*[]:)
  const sanitizeSheetName = (name: string, existing: Set<string>): string => {
    let clean = name.replace(/[\/\\?*\[\]:]/g, '-').trim();
    if (!clean) clean = 'Lop';
    if (clean.length > 28) clean = clean.substring(0, 28);

    let finalName = clean;
    let counter = 1;
    while (existing.has(finalName.toLowerCase())) {
      finalName = `${clean.substring(0, 24)} (${counter})`;
      counter++;
    }
    existing.add(finalName.toLowerCase());
    return finalName;
  };

  // Export to Excel function: each class is a separate sheet when 'all' is selected
  const handleExportExcel = () => {
    if (filteredStudents.length === 0) {
      alert('Không có dữ liệu học sinh nào để xuất báo cáo!');
      return;
    }

    const workbook = XLSX.utils.book_new();
    const usedSheetNames = new Set<string>();

    const cols = [
      { wch: 8 },  // STT
      { wch: 16 }, // Mã HS
      { wch: 26 }, // Họ và tên
      { wch: 16 }, // Điểm Lý Thuyết
      { wch: 16 }, // Điểm Thực Hành
      { wch: 12 }, // Tổng Điểm
      { wch: 12 }, // Xếp Loại
    ];

    if (selectedClassId === 'all') {
      // Khi chọn Tất cả các lớp: Mỗi lớp xuất ra 1 sheet riêng biệt
      const classesToExport = yearClasses.length > 0 ? yearClasses : classesList;

      for (const cls of classesToExport) {
        const rawClassStudents = studentsList.filter((s) => s.classId === cls.id);
        const classStudents = sortStudentsLikeGradeTab(rawClassStudents, reportSortType);

        const sheetRows = classStudents.map((st, idx) => {
          const key = `${st.id}_${selectedTerm}`;
          const keyCode = st.code ? `${st.code}_${selectedTerm}` : '';
          const rec = gradeData[key] || (keyCode ? gradeData[keyCode] : null) || { lt: '', th: '', total: '', rank: '' };
          return {
            STT: idx + 1,
            'Mã HS': st.code,
            'Họ và tên': st.name,
            'Điểm Lý Thuyết': rec.lt !== undefined && rec.lt !== '' ? Number(rec.lt) : '',
            'Điểm Thực Hành': rec.th !== undefined && rec.th !== '' ? Number(rec.th) : '',
            'Tổng Điểm': rec.total !== undefined && rec.total !== '' ? Number(rec.total) : '',
            'Xếp Loại': rec.rank || '',
          };
        });

        const worksheet = XLSX.utils.json_to_sheet(
          sheetRows.length > 0
            ? sheetRows
            : [
                {
                  STT: '',
                  'Mã HS': '',
                  'Họ và tên': '(Lớp chưa có học sinh)',
                  'Điểm Lý Thuyết': '',
                  'Điểm Thực Hành': '',
                  'Tổng Điểm': '',
                  'Xếp Loại': '',
                },
              ]
        );

        worksheet['!cols'] = cols;
        const sheetTitle = sanitizeSheetName(cls.name, usedSheetNames);
        XLSX.utils.book_append_sheet(workbook, worksheet, sheetTitle);
      }
    } else {
      // Khi chọn 1 lớp cụ thể
      const targetClass = currentSelectedClass;
      const rawClassStudents = studentsList.filter((s) => s.classId === selectedClassId);
      const classStudents = sortStudentsLikeGradeTab(rawClassStudents, reportSortType);

      const sheetRows = classStudents.map((st, idx) => {
        const key = `${st.id}_${selectedTerm}`;
        const keyCode = st.code ? `${st.code}_${selectedTerm}` : '';
        const rec = gradeData[key] || (keyCode ? gradeData[keyCode] : null) || { lt: '', th: '', total: '', rank: '' };
        return {
          STT: idx + 1,
          'Mã HS': st.code,
          'Họ và tên': st.name,
          'Điểm Lý Thuyết': rec.lt !== undefined && rec.lt !== '' ? Number(rec.lt) : '',
          'Điểm Thực Hành': rec.th !== undefined && rec.th !== '' ? Number(rec.th) : '',
          'Tổng Điểm': rec.total !== undefined && rec.total !== '' ? Number(rec.total) : '',
          'Xếp Loại': rec.rank || '',
        };
      });

      const worksheet = XLSX.utils.json_to_sheet(sheetRows);
      worksheet['!cols'] = cols;
      const sheetTitle = sanitizeSheetName(targetClass?.name || 'Lop', usedSheetNames);
      XLSX.utils.book_append_sheet(workbook, worksheet, sheetTitle);
    }

    const safeClassName = currentSelectedClass
      ? currentSelectedClass.name.replace(/[^a-zA-Z0-9]/g, '_')
      : 'Tat_Ca_Cac_Lop';
    const termSlug = selectedTerm === 'hk1' ? 'Hoc_Ky_1' : 'Ca_Nam';
    const fileName = `Bao_Cao_Diem_${safeClassName}_${termSlug}.xlsx`;

    XLSX.writeFile(workbook, fileName);
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Top Banner Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-4">
        <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-4 border-b border-slate-100 pb-5">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="p-2 rounded-xl bg-blue-50 text-[#0070F3]">
                <BarChart3 className="w-5 h-5" />
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                Báo cáo kết quả học tập
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 font-medium">
              Năm học {currentYear?.replace('-', ' – ')} · Báo cáo điểm số, xếp loại và xuất bảng điểm Excel chuẩn
            </p>
          </div>

          {/* Actions: Export Excel & Export Evaluation */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => setShowCommentsModal(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl font-bold transition flex items-center justify-center gap-2 text-sm shadow-xs whitespace-nowrap cursor-pointer active:scale-95"
              title="Xuất đánh giá và nhận xét học sinh tự động ra Excel (theo khối hoặc tất cả các lớp)"
            >
              <Award className="w-4 h-4" />
              <span>Xuất đánh giá Excel</span>
            </button>

            <button
              type="button"
              onClick={handleExportExcel}
              className="bg-[#0070f3] hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-bold transition flex items-center justify-center gap-2 text-sm shadow-xs whitespace-nowrap cursor-pointer active:scale-95"
              title="Xuất bảng điểm ra file Excel"
            >
              <Download className="w-4 h-4" />
              <span>Xuất Excel</span>
            </button>
          </div>
        </div>

        {/* Filters Controls Toolbar */}
        <div className="flex flex-col md:flex-row flex-wrap items-stretch md:items-center justify-between gap-3 pt-1">
          <div className="flex flex-wrap items-center gap-3">
            {/* Class Selector Dropdown */}
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 shadow-2xs">
              <Filter className="w-4 h-4 text-slate-500" />
              <span className="text-xs font-bold text-slate-700">Lớp:</span>
              <select
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                className="text-xs font-bold text-[#0070f3] outline-none bg-transparent cursor-pointer pr-2"
              >
                <option value="all">Tất cả các lớp ({yearClasses.length} lớp)</option>
                {yearClasses.map((cls) => {
                  const studentCount = studentsList.filter((s) => s.classId === cls.id).length;
                  return (
                    <option key={cls.id} value={cls.id}>
                      {cls.name} ({studentCount} HS)
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Term Switcher: Học kỳ 1 vs Cả năm */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl shadow-2xs">
              <button
                type="button"
                onClick={() => setSelectedTerm('hk1')}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  selectedTerm === 'hk1'
                    ? 'bg-white text-[#0070f3] shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Học kỳ 1
              </button>
              <button
                type="button"
                onClick={() => setSelectedTerm('hk2')}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  selectedTerm === 'hk2'
                    ? 'bg-white text-[#0070f3] shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Cả năm
              </button>
            </div>
          </div>

          {/* Quick Search */}
          <div className="relative min-w-[220px]">
            <input
              type="text"
              placeholder="Tìm theo tên hoặc mã HS..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold outline-none focus:border-[#0070f3] focus:ring-2 focus:ring-blue-100 text-slate-800"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          </div>
        </div>
      </div>

      {/* Stats Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#0070f3] flex items-center justify-center font-bold">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500">Tổng học sinh</p>
            <p className="text-xl font-black text-slate-900">{stats.total}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500">Hoàn thành Tốt (T)</p>
            <p className="text-xl font-black text-emerald-600">{stats.good}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500">Hoàn thành (H)</p>
            <p className="text-xl font-black text-indigo-600">{stats.pass}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-50 text-slate-500 flex items-center justify-center font-bold">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500">Chưa có điểm</p>
            <p className="text-xl font-black text-slate-600">{stats.unranked}</p>
          </div>
        </div>
      </div>

      {/* Main Report Table (Matching Excel columns in image 27a0ed05.png) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-[#0070f3]" />
            <span>
              Bảng điểm {selectedTerm === 'hk1' ? 'Học kỳ 1' : 'Cả năm'} ·{' '}
              {currentSelectedClass ? `Lớp ${currentSelectedClass.name}` : 'Tất cả các lớp'}
            </span>
          </h3>
          <span className="text-xs font-bold text-slate-500">
            {filteredStudents.length} học sinh
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100/80 text-slate-700 text-[11px] uppercase tracking-wider font-bold">
                <th className="p-3 w-14 text-center">STT</th>
                <th className="p-3 w-32">MÃ HS</th>
                <th className="p-3">HỌ VÀ TÊN</th>
                {selectedClassId === 'all' && <th className="p-3 w-28">LỚP</th>}
                <th className="p-3 text-center w-32">ĐIỂM LÝ THUYẾT</th>
                <th className="p-3 text-center w-32">ĐIỂM THỰC HÀNH</th>
                <th className="p-3 text-center w-28">TỔNG ĐIỂM</th>
                <th className="p-3 text-center w-24">XẾP LOẠI</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td
                    colSpan={selectedClassId === 'all' ? 8 : 7}
                    className="text-center p-12 text-slate-400 font-semibold text-sm"
                  >
                    Chưa có dữ liệu học sinh phù hợp với bộ lọc.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((st, index) => {
                  const key = `${st.id}_${selectedTerm}`;
                  const keyCode = st.code ? `${st.code}_${selectedTerm}` : '';
                  const rec = gradeData[key] || (keyCode ? gradeData[keyCode] : null) || { lt: '', th: '', total: '', rank: '' };
                  const className = classesList.find((c) => c.id === st.classId)?.name || '-';

                  return (
                    <tr key={st.id} className="hover:bg-blue-50/40 transition-colors">
                      <td className="p-3 text-center font-mono text-slate-400 font-bold">
                        {index + 1}
                      </td>
                      <td className="p-3 font-mono text-slate-700 font-bold">
                        {st.code}
                      </td>
                      <td className="p-3 font-bold text-blue-900">
                        {st.name}
                      </td>
                      {selectedClassId === 'all' && (
                        <td className="p-3 font-bold text-slate-600">
                          {className}
                        </td>
                      )}
                      <td className="p-3 text-center font-semibold text-slate-800">
                        {rec.lt !== undefined && rec.lt !== '' ? rec.lt : '-'}
                      </td>
                      <td className="p-3 text-center font-semibold text-slate-800">
                        {rec.th !== undefined && rec.th !== '' ? rec.th : '-'}
                      </td>
                      <td className="p-3 text-center">
                        <span
                          className={`font-black text-sm ${
                            rec.total
                              ? Number(rec.total) >= 9
                                ? 'text-emerald-600'
                                : 'text-blue-600'
                              : 'text-slate-400'
                          }`}
                        >
                          {rec.total !== undefined && rec.total !== '' ? rec.total : '-'}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        {rec.rank ? (
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-black ${
                              rec.rank === 'T'
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-blue-100 text-blue-700'
                            }`}
                          >
                            {rec.rank}
                          </span>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Evaluation & Comments Modal */}
      {showCommentsModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl p-6 relative animate-fadeIn">
            <StudentCommentsManager
              isModal={true}
              onCloseModal={() => setShowCommentsModal(false)}
              currentUser={currentUser}
            />
          </div>
        </div>
      )}
    </div>
  );
};
