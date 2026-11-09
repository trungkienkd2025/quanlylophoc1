export interface Student {
  id: string;
  code: string;
  name: string;
  gender: 'Nam' | 'Nữ';
  dob: string;
  avatar: string;
  classId: string;
  attendance: 'present' | 'absent' | 'late';
  stars: number;
  speeches: number; // số lần phát biểu
  notes?: string;
}

export interface Classroom {
  id: string;
  name: string;
  grade: number; // 1, 2, 3, 4, 5
  academicYear: string;
  totalStudents: number;
  roomCode: string;
}

export interface QuizQuestion {
  id: string;
  grade: number;
  subject: string;
  topic: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface DigitalResource {
  id: string;
  grade: number;
  title: string;
  lessonNumber: string;
  subject: string;
  duration: string;
  youtubeId?: string;
  videoUrl?: string;
  description: string;
  thumbnail: string;
  views: number;
  materialsCount: number;
}

export type ActiveTab = 'home' | 'classroom' | 'reports' | 'quiz' | 'resources' | 'games' | 'utilities' | 'admin';

export type UserRole = 'admin' | 'teacher' | 'student';

export interface UserAccount {
  id: string;
  username: string;
  password?: string;
  fullName: string;
  role: UserRole;
  classId?: string;
  studentId?: string;
  avatar?: string;
  status: 'active' | 'locked';
  createdAt: string;
  mustChangePassword?: boolean;
}


export interface StudentPermissions {
  canViewClassroom: boolean;
  canViewQuiz: boolean;
  canViewResources: boolean;
  canViewGames: boolean;
  canViewUtilities: boolean;
}

export interface QuizSubmission {
  id: string;
  studentName: string;
  className: string;
  grade: number;
  score: number; // thang điểm 10
  totalQuestions: number;
  correctAnswers: number;
  submittedAt: string;
  durationSeconds: number;
  details?: {
    questionId: string;
    question: string;
    selectedOption: number;
    correctOption: number;
    isCorrect: boolean;
  }[];
}

