export type ClassInfo = {
  id: string;
  name: string;
  classCode: string;
  createdAt: string;
  updatedAt: string;
  ownerTeacherId: string;
  ownerTeacher: { id: string; name: string | null; email: string | null };
  memberCount: number;
  userRole: 'student' | 'ta' | 'teacher';
  joinedAt: string;
};

export type Member = {
  userId: string;
  user: { id: string; name: string | null; email: string | null };
  roleInClass: 'student' | 'ta' | 'teacher';
  joinedAt: string;
};

export type Session = {
  id: string;
  status: 'lobby' | 'active' | 'ended';
  startedAt: string | null;
  endedAt: string | null;
  createdAt: string;
  quiz: { id: string; title: string };
  attemptCount: number;
  sessionName?: string | null; // Tên session (nếu có), mặc định là quiz.title
  durationSeconds?: number | null; // Thời gian làm bài (giây)
  scheduledStartAt?: string | null; // Thời gian bắt đầu đã lên lịch (cho lobby sessions)
};

export type QuizLite = {
  id: string;
  title: string;
  status: 'draft' | 'published' | 'archived';
  ruleCount: number;
  durationSeconds: number | null;
  tags?: Array<{ id: string; name: string; normalizedName: string }>;
};

export function formatDate(dateString: string) {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('vi-VN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

