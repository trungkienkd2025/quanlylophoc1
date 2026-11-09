import { Classroom, DigitalResource, QuizQuestion, Student } from '../types';

export const INITIAL_CLASSROOMS: Classroom[] = [
  { id: 'c1', name: '1/1 (ĐIỆP)', grade: 1, academicYear: '2026-2027', totalStudents: 0, roomCode: 'F08AF1' },
  { id: 'c_1794239990637', name: '1/2', grade: 1, academicYear: '2026-2027', totalStudents: 0, roomCode: 'F08AF1' },
  { id: 'c_1794240001067', name: '1/3', grade: 1, academicYear: '2026-2027', totalStudents: 0, roomCode: 'F08AF1' },
  { id: 'c_1794240007860', name: '1/4', grade: 1, academicYear: '2026-2027', totalStudents: 0, roomCode: 'F08AF1' },
  { id: 'c_1794240020924', name: '1/5', grade: 1, academicYear: '2026-2027', totalStudents: 0, roomCode: 'F08AF1' },
  { id: 'c3', name: '2/1 (ĐĂNG)', grade: 2, academicYear: '2026-2027', totalStudents: 0, roomCode: 'F08AF1' },
  { id: 'c_1794240029212', name: '2/2', grade: 1, academicYear: '2026-2027', totalStudents: 0, roomCode: 'F08AF1' },
  { id: 'c_1794240034468', name: '2/3', grade: 1, academicYear: '2026-2027', totalStudents: 0, roomCode: 'F08AF1' },
  { id: 'c_1794240039396', name: '2/4', grade: 1, academicYear: '2026-2027', totalStudents: 0, roomCode: 'F08AF1' },
  { id: 'c2', name: '3/1 (ANH)', grade: 3, academicYear: '2026-2027', totalStudents: 0, roomCode: 'F08AF1' },
  { id: 'c_1794240048892', name: '3/2', grade: 1, academicYear: '2026-2027', totalStudents: 0, roomCode: 'F08AF1' },
  { id: 'c_1794240058892', name: '3/3', grade: 1, academicYear: '2026-2027', totalStudents: 0, roomCode: 'F08AF1' },
  { id: 'c4', name: '4/1 (HOÀNG)', grade: 4, academicYear: '2025-2026', totalStudents: 0, roomCode: 'F08AF1' },
];

export const INITIAL_STUDENTS: Student[] = [
  { id: 's1', code: 'HS001', name: 'Nguyễn An Khang', gender: 'Nam', dob: '12/03/2016', avatar: '👦', classId: 'c1', attendance: 'present', stars: 8, speeches: 5 },
  { id: 's2', code: 'HS002', name: 'Trần Bảo Anh', gender: 'Nữ', dob: '05/06/2016', avatar: '👧', classId: 'c1', attendance: 'present', stars: 12, speeches: 7 },
  { id: 's3', code: 'HS003', name: 'Lê Hoàng Nam', gender: 'Nam', dob: '18/08/2016', avatar: '👦', classId: 'c1', attendance: 'present', stars: 6, speeches: 4 },
  { id: 's4', code: 'HS004', name: 'Phạm Minh Tuấn', gender: 'Nam', dob: '22/01/2016', avatar: '👦', classId: 'c1', attendance: 'absent', stars: 5, speeches: 2 },
  { id: 's5', code: 'HS005', name: 'Vũ Thảo Vy', gender: 'Nữ', dob: '14/09/2016', avatar: '👧', classId: 'c1', attendance: 'present', stars: 15, speeches: 9 },
  { id: 's6', code: 'HS006', name: 'Hoàng Gia Huy', gender: 'Nam', dob: '30/11/2016', avatar: '👦', classId: 'c1', attendance: 'late', stars: 4, speeches: 1 },
  { id: 's7', code: 'HS007', name: 'Đặng Ngọc Mai', gender: 'Nữ', dob: '08/04/2016', avatar: '👧', classId: 'c1', attendance: 'present', stars: 10, speeches: 6 },
  { id: 's8', code: 'HS008', name: 'Bùi Đức Anh', gender: 'Nam', dob: '25/07/2016', avatar: '👦', classId: 'c1', attendance: 'present', stars: 9, speeches: 5 },
  { id: 's9', code: 'HS009', name: 'Dương Khánh Linh', gender: 'Nữ', dob: '19/10/2016', avatar: '👧', classId: 'c1', attendance: 'present', stars: 11, speeches: 7 },
  { id: 's10', code: 'HS010', name: 'Ngô Quốc Bảo', gender: 'Nam', dob: '03/02/2016', avatar: '👦', classId: 'c1', attendance: 'present', stars: 7, speeches: 3 },
  { id: 's11', code: 'HS011', name: 'Phan Như Quỳnh', gender: 'Nữ', dob: '16/12/2016', avatar: '👧', classId: 'c1', attendance: 'present', stars: 14, speeches: 8 },
  { id: 's12', code: 'HS012', name: 'Đỗ Tiến Đạt', gender: 'Nam', dob: '27/05/2016', avatar: '👦', classId: 'c1', attendance: 'present', stars: 8, speeches: 4 },
];

export const INITIAL_QUIZZES: QuizQuestion[] = [
  // Khối 1
  {
    id: 'q1_1',
    grade: 1,
    subject: 'Tin học',
    topic: 'Chủ đề 1: Làm quen với máy tính',
    question: 'Máy tính để bàn gồm có bao nhiêu bộ phận chính?',
    options: ['2 bộ phận', '3 bộ phận', '4 bộ phận (Màn hình, Thân máy, Bàn phím, Chuột)', '5 bộ phận'],
    correctIndex: 2,
    explanation: 'Máy tính để bàn gồm 4 bộ phận cơ bản: Thân máy, Màn hình, Bàn phím và Chuột.'
  },
  {
    id: 'q1_2',
    grade: 1,
    subject: 'Tin học',
    topic: 'Chủ đề 1: Làm quen với máy tính',
    question: 'Khi ngồi học máy tính, tư thế nào sau đây là đúng nhất?',
    options: ['Ngồi thẳng lưng, mắt cách màn hình từ 50 - 70cm', 'Nằm ra bàn để nhìn gần màn hình', 'Ngồi vắt chân lên ghế', 'Nhìn sát mắt vào màn hình'],
    correctIndex: 0,
    explanation: 'Ngồi thẳng lưng, hai chân chạm sàn và giữ khoảng cách mắt hợp lý giúp bảo vệ mắt và cột sống.'
  },
  // Khối 2
  {
    id: 'q2_1',
    grade: 2,
    subject: 'Tin học',
    topic: 'Chủ đề 2: Sử dụng chuột và bàn phím',
    question: 'Trên bàn phím máy tính, hai phím nào có gờ nổi để đặt hai ngón trỏ?',
    options: ['Phím A và S', 'Phím F và J', 'Phím Enter và Space', 'Phím G và H'],
    correctIndex: 1,
    explanation: 'Hai phím F và J trên hàng phím cơ sở luôn có gờ nổi để giúp đặt ngón trỏ đúng vị trí xuất phát.'
  },
  {
    id: 'q2_2',
    grade: 2,
    subject: 'Tin học',
    topic: 'Chủ đề 2: Vẽ hình đơn giản',
    question: 'Để xóa một nét vẽ bị sai trong phần mềm Paint, em dùng công cụ nào?',
    options: ['Cây bút chì', 'Cục tẩy (Eraser)', 'Thùng sơn', 'Kính lúp'],
    correctIndex: 1,
    explanation: 'Công cụ Eraser (Tẩy) dùng để xóa những vùng vẽ sai hoặc không mong muốn.'
  },
  // Khối 3
  {
    id: 'q3_1',
    grade: 3,
    subject: 'Tin học',
    topic: 'Chủ đề A: Máy tính và em',
    question: 'Bộ phận nào sau đây của máy tính dùng để hiển thị kết quả làm việc?',
    options: ['Bàn phím (Keyboard)', 'Màn hình (Screen/Monitor)', 'Chuột (Mouse)', 'Thân máy (CPU/Case)'],
    correctIndex: 1,
    explanation: 'Màn hình là thiết bị xuất thông tin hình ảnh giúp người dùng quan sát kết quả hoạt động của máy tính.'
  },
  {
    id: 'q3_2',
    grade: 3,
    subject: 'Tin học',
    topic: 'Chủ đề A: Máy tính và em',
    question: 'Khi sử dụng chuột máy tính, ngón trỏ thường được đặt vào nút nào?',
    options: ['Nút cuộn', 'Nút chuột phải', 'Nút chuột trái', 'Thân chuột'],
    correctIndex: 2,
    explanation: 'Quy tắc cầm chuột đúng: Ngón trỏ đặt lên nút chuột trái, ngón giữa đặt lên nút chuột phải.'
  },
  {
    id: 'q3_3',
    grade: 3,
    subject: 'Tin học',
    topic: 'Chủ đề B: Mạng máy tính và Internet',
    question: 'Thông tin trong máy tính được lưu trữ dưới dạng gì?',
    options: ['Văn bản, hình ảnh, âm thanh, video', 'Chỉ có chữ cái', 'Chỉ có số', 'Chỉ có tranh vẽ'],
    correctIndex: 0,
    explanation: 'Thông tin trong máy tính rất phong phú: văn bản, hình ảnh, âm thanh và các đoạn video.'
  },
  // Khối 4
  {
    id: 'q4_1',
    grade: 4,
    subject: 'Tin học',
    topic: 'Chủ đề B: Mạng máy tính và Internet',
    question: 'Hành động nào sau đây là AN TOÀN khi em sử dụng mạng Internet?',
    options: [
      'Gửi mật khẩu và địa chỉ nhà cho người lạ trên mạng',
      'Hỏi ý kiến thầy cô, bố mẹ trước khi tải tệp lạ về máy',
      'Nhấp vào mọi đường link quảng cáo trúng thưởng',
      'Đăng ảnh chụp căn cước công dân của người thân lên mạng xã hội'
    ],
    correctIndex: 1,
    explanation: 'Luôn xin phép và trao đổi với người lớn khi gặp thông tin lạ hoặc muốn tải tài liệu trên Internet.'
  },
  {
    id: 'q4_2',
    grade: 4,
    subject: 'Tin học',
    topic: 'Chủ đề C: Tổ chức lưu trữ, tìm kiếm và trao đổi thông tin',
    question: 'Trong hệ điều hành máy tính, Thư mục (Folder) dùng để làm gì?',
    options: [
      'Lưu trữ và phân loại các tệp (files) một cách ngăn nắp',
      'Nghe nhạc và xem video trực tuyến',
      'Tăng tốc độ kết nối mạng Internet',
      'In tài liệu ra giấy'
    ],
    correctIndex: 0,
    explanation: 'Thư mục giống như ngăn kéo tủ, dùng để gom và phân loại các tệp tin theo từng chủ đề ngăn nắp.'
  },
  {
    id: 'q4_3',
    grade: 4,
    subject: 'Tin học',
    topic: 'Chủ đề D: Soạn thảo văn bản',
    question: 'Tổ hợp phím nào sau đây dùng để Lưu văn bản (Save) trong Word?',
    options: ['Ctrl + C', 'Ctrl + V', 'Ctrl + S', 'Ctrl + P'],
    correctIndex: 2,
    explanation: 'Tổ hợp phím tắt Ctrl + S (Save) giúp lưu lại tệp văn bản đang làm việc.'
  },
  // Khối 5
  {
    id: 'q5_1',
    grade: 5,
    subject: 'Tin học',
    topic: 'Chủ đề F: Lập trình với Scratch',
    question: 'Trong phần mềm Scratch, khối lệnh nào giúp nhân vật di chuyển 10 bước?',
    options: ['turn 15 degrees', 'move 10 steps', 'say Hello!', 'wait 1 seconds'],
    correctIndex: 1,
    explanation: 'Khối lệnh "move 10 steps" trong nhóm Motion (Chuyển động) cho phép nhân vật di chuyển về phía trước.'
  },
  {
    id: 'q5_2',
    grade: 5,
    subject: 'Tin học',
    topic: 'Chủ đề E: Ứng dụng tin học',
    question: 'Phần mềm nào sau đây thường được dùng để thiết kế bài trình chiếu sinh động trong lớp học?',
    options: ['Microsoft Word', 'Microsoft Excel', 'Microsoft PowerPoint', 'Notepad'],
    correctIndex: 2,
    explanation: 'PowerPoint là ứng dụng chuyên dụng để thiết kế bài trình chiếu đa phương tiện (slide).'
  },
  {
    id: 'q5_3',
    grade: 5,
    subject: 'Tin học',
    topic: 'Chủ đề F: Lập trình với Scratch',
    question: 'Vòng lặp nào sau đây trong Scratch sẽ thực hiện các lệnh liên tục mãi mãi?',
    options: ['repeat 10', 'forever', 'repeat until', 'if then'],
    correctIndex: 1,
    explanation: 'Khối lệnh forever (liên tục) lặp lại các lệnh bên trong vô hạn lần cho đến khi nhấn nút dừng.'
  }
];

export const INITIAL_SUBMISSIONS: import('../types').QuizSubmission[] = [
  {
    id: 'sub_1',
    studentName: 'Trần Bảo Anh',
    className: 'Lớp 4A1',
    grade: 4,
    score: 10,
    totalQuestions: 10,
    correctAnswers: 10,
    submittedAt: '2026-03-28 09:15',
    durationSeconds: 245
  },
  {
    id: 'sub_2',
    studentName: 'Nguyễn An Khang',
    className: 'Lớp 3A1',
    grade: 3,
    score: 9,
    totalQuestions: 10,
    correctAnswers: 9,
    submittedAt: '2026-03-28 09:40',
    durationSeconds: 310
  },
  {
    id: 'sub_3',
    studentName: 'Vũ Thảo Vy',
    className: 'Lớp 4A1',
    grade: 4,
    score: 10,
    totalQuestions: 10,
    correctAnswers: 10,
    submittedAt: '2026-03-28 10:05',
    durationSeconds: 198
  },
  {
    id: 'sub_4',
    studentName: 'Lê Hoàng Nam',
    className: '',
    grade: 5,
    score: 8,
    totalQuestions: 10,
    correctAnswers: 8,
    submittedAt: '2026-03-28 10:30',
    durationSeconds: 420
  }
];

export const INITIAL_RESOURCES: DigitalResource[] = [
  {
    id: 'res1',
    grade: 3,
    title: 'Bài 1: Thông tin và quyết định',
    lessonNumber: 'Bài 01',
    subject: 'Tin học 3 - Bộ Kết nối tri thức',
    duration: '12:45',
    youtubeId: 'dQw4w9WgXcQ',
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    description: 'Giúp học sinh nhận biết được thông tin thu nhận từ các giác quan và vai trò của thông tin trong quyết định.',
    thumbnail: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=600&auto=format&fit=crop&q=80',
    views: 1240,
    materialsCount: 4
  },
  {
    id: 'res2',
    grade: 3,
    title: 'Bài 2: Khám phá máy tính và các bộ phận cơ bản',
    lessonNumber: 'Bài 02',
    subject: 'Tin học 3 - Bộ Cánh Diều',
    duration: '15:20',
    youtubeId: 'dQw4w9WgXcQ',
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
    description: 'Tìm hiểu 4 bộ phận chính: Thân máy, màn hình, bàn phím, chuột máy tính và cách ngồi đúng tư thế.',
    thumbnail: 'https://images.unsplash.com/photo-1588702547919-26089e690ecc?w=600&auto=format&fit=crop&q=80',
    views: 2180,
    materialsCount: 6
  },
  {
    id: 'res3',
    grade: 4,
    title: 'Bài 3: Tìm kiếm thông tin an toàn trên Internet',
    lessonNumber: 'Bài 03',
    subject: 'Tin học 4 - Bộ Kết nối tri thức',
    duration: '14:10',
    youtubeId: 'dQw4w9WgXcQ',
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    description: 'Kỹ năng tìm kiếm từ khóa trên máy tìm kiếm Google và 5 nguyên tắc vàng bảo vệ thông tin cá nhân.',
    thumbnail: 'https://images.unsplash.com/photo-1509062522246-3755977927d7?w=600&auto=format&fit=crop&q=80',
    views: 3120,
    materialsCount: 5
  },
  {
    id: 'res4',
    grade: 4,
    title: 'Bài 4: Tạo bài trình chiếu đầu tiên với PowerPoint',
    lessonNumber: 'Bài 04',
    subject: 'Tin học 4 - Bộ Chân trời sáng tạo',
    duration: '18:35',
    youtubeId: 'dQw4w9WgXcQ',
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
    description: 'Hướng dẫn tạo trang chiếu mới, chèn chữ, chọn phông chữ và chèn hình ảnh minh họa sinh động.',
    thumbnail: 'https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=600&auto=format&fit=crop&q=80',
    views: 4500,
    materialsCount: 8
  },
  {
    id: 'res5',
    grade: 5,
    title: 'Bài 1: Lập trình chú mèo Scratch nhảy múa',
    lessonNumber: 'Bài 01',
    subject: 'Tin học 5 - Lập trình Scratch',
    duration: '22:15',
    youtubeId: 'dQw4w9WgXcQ',
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
    description: 'Khám phá giao diện Scratch 3.0, các khối lệnh chuyển động, hiệu ứng âm thanh và tạo dự án hoạt hình đầu tay.',
    thumbnail: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=600&auto=format&fit=crop&q=80',
    views: 6890,
    materialsCount: 12
  },
  {
    id: 'res6',
    grade: 1,
    title: 'Làm quen tư thế ngồi học và bảo vệ đôi mắt',
    lessonNumber: 'Kỹ năng',
    subject: 'Tin học Khối 1 - Làm quen công nghệ',
    duration: '08:50',
    youtubeId: 'dQw4w9WgXcQ',
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyBlazes.mp4',
    description: 'Video hoạt hình vui nhộn hướng dẫn khoảng cách nhìn màn hình, tư thế thẳng lưng và bài tập chớp mắt.',
    thumbnail: 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=600&auto=format&fit=crop&q=80',
    views: 1890,
    materialsCount: 3
  },
  {
    id: 'res7',
    grade: 2,
    title: 'Em tập vẽ hình khối với phần mềm Paint',
    lessonNumber: 'Bài 05',
    subject: 'Tin học Khối 2 - Mỹ thuật số',
    duration: '11:05',
    youtubeId: 'dQw4w9WgXcQ',
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4',
    description: 'Sử dụng công cụ Shapes, chọn màu tô và vẽ ngôi nhà mơ ước cùng cây hoa xinh xắn.',
    thumbnail: 'https://images.unsplash.com/photo-1460518451282-474b1ca148a4?w=600&auto=format&fit=crop&q=80',
    views: 2450,
    materialsCount: 4
  }
];

export const PRIZE_WHEEL_ITEMS = [
  { text: '🌟 Cộng 2 Sao', color: '#3B82F6', sound: 'star' },
  { text: '👏 Cả lớp vỗ tay', color: '#10B981', sound: 'clap' },
  { text: '👑 Trợ lý hôm nay', color: '#F59E0B', sound: 'fanfare' },
  { text: '⭐ Cộng 1 Sao', color: '#EC4899', sound: 'star' },
  { text: '🎁 Quà bí mật', color: '#8B5CF6', sound: 'cheer' },
  { text: '🎵 Chọn bài hát vui', color: '#06B6D4', sound: 'music' },
  { text: '✨ Tặng sticker', color: '#F97316', sound: 'pop' },
  { text: '🏅 Huy hiệu xuất sắc', color: '#14B8A6', sound: 'cheer' },
];

export const INITIAL_ACCOUNTS: import('../types').UserAccount[] = [
  {
    id: 'u_admin',
    username: 'trungkienkd2025',
    password: '123',
    fullName: 'Thầy Trần Trung Kiên',
    role: 'admin',
    avatar: '👨‍🏫',
    status: 'active',
    createdAt: '2026-01-01',
    mustChangePassword: false,
  },
  {
    id: 'u_gv1',
    username: 'giaovien01',
    password: '123',
    fullName: 'Cô Lê Thu Hà',
    role: 'teacher',
    avatar: '👩‍🏫',
    status: 'active',
    createdAt: '2026-02-10',
    mustChangePassword: true,
  },

  {
    id: 'u_s1',
    username: 'hs001',
    password: '123',
    fullName: 'Nguyễn An Khang',
    role: 'student',
    classId: 'c1',
    studentId: 's1',
    avatar: '👦',
    status: 'active',
    createdAt: '2026-01-05'
  },
  {
    id: 'u_s2',
    username: 'hs002',
    password: '123',
    fullName: 'Trần Bảo Anh',
    role: 'student',
    classId: 'c1',
    studentId: 's2',
    avatar: '👧',
    status: 'active',
    createdAt: '2026-01-05'
  },
  {
    id: 'u_s3',
    username: 'hs003',
    password: '123',
    fullName: 'Lê Hoàng Nam',
    role: 'student',
    classId: 'c1',
    studentId: 's3',
    avatar: '👦',
    status: 'active',
    createdAt: '2026-01-05'
  }
];

export const INITIAL_PERMISSIONS: import('../types').StudentPermissions = {
  canViewClassroom: true, // Học sinh được xem bảng xếp hạng sao & danh sách thi đua của lớp (chỉ xem, không sửa)
  canViewQuiz: true, // Học sinh được làm bài thi thử trắc nghiệm
  canViewResources: true, // Học sinh được xem video bài giảng
  canViewGames: false, // Mặc định khóa game trong giờ học, thầy có thể mở trong phần quản trị
  canViewUtilities: false // Tiện ích chỉ dành cho giáo viên
};

