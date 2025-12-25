# 🔌 API (BKquiz)

Tài liệu này mô tả contract API ở mức endpoint + mục đích. Chi tiết request/response (JSON schema) sẽ được bổ sung khi implement.

## Nguyên tắc
- Phân quyền theo **role** và **membership**.
- Với session đã start: dữ liệu câu hỏi trả về cho student dựa trên **snapshot**.

## 1) Auth
- `GET /api/auth/*` (Auth.js/NextAuth)

## 2) Class
- `POST /api/classes` (teacher)
- `GET /api/classes/preview?classCode=...` (public: preview class info trước khi join)
- `POST /api/classes/join` (student, classCode)
- `GET /api/classes` (teacher/student: danh sách lớp)

## 3) Question bank (Pool/Tag/Share)
- `POST /api/pools` (teacher)
- `GET /api/pools` (teacher: own + shared)
- `GET /api/pools/:poolId` (teacher có quyền view/use/edit)
- `POST /api/pools/:poolId/share` (teacher owner hoặc edit)
- `POST /api/pools/:poolId/questions` (teacher có quyền edit)
- `PATCH /api/questions/:questionId` (teacher có quyền edit)
- `POST /api/tags` (teacher)
- `GET /api/tags` (teacher)

## 4) Quiz authoring (rule-based)
- `POST /api/quizzes` (teacher)
- `GET /api/quizzes?classroomId=...` (teacher)
- `GET /api/quizzes/:quizId` (teacher)
- `POST /api/quizzes/:quizId/rules` (teacher)
  - hỗ trợ:
    - same-set: `count`
    - variant-set: `commonCount` + `variantCount`
- `GET /api/quizzes/:quizId/preview` (teacher: trả về đủ/thiếu theo từng rule)
- `POST /api/quizzes/:quizId/publish` (teacher, optional)

## 5) Session runtime
- `POST /api/sessions` (teacher start session; materialize + snapshot)
  - variant-set: materialize “session pool” đủ cho common + variant (có thể cảnh báo nếu thiếu)
- `GET /api/sessions/:sessionId/teacherToken` (teacher screen: QR join URL + token + countdown)
- `POST /api/sessions/:sessionId/join` (student join session → attempt)
- `GET /api/sessions/:sessionId/status` (student: lobby state: started? ended? startTime?)

### 5.1 Session status model (đề xuất)
- `status`: `scheduled | active | ended`
- `scheduled`: session được tạo nhưng teacher chưa start (student vào lobby)
- `active`: đang làm quiz
- `ended`: đã kết thúc (student chỉ xem kết quả nếu cho phép)

### 5.2 QR join URL (đã chốt)
- QR code chứa URL join theo `sessionId` (ví dụ: `/join/session/{sessionId}`), student đăng nhập xong sẽ vào lobby/join attempt.

## 6) Attempt & answers
- `GET /api/attempts/:attemptId/state` (student: blocked?, dueAt, questions snapshot, current answers, sessionName)
  - variant-set: trả về danh sách câu theo `AttemptQuestion` (order theo attempt)
  - `sessionName`: Tên session (từ settings) hoặc tên quiz
- `GET /api/attempts/:attemptId/questions` (student: questions với review info nếu có)
  - Response: `{ questions: [...], canReview: boolean, reviewWindowEnd?: Date, questionScores?: {...} }`
  - `canReview`: Chỉ true khi session ended + trong review window + teacher cho phép
  - `reviewWindowEnd`: Thời điểm kết thúc review window
  - `questionScores`: Điểm từng câu (cached trong Attempt.questionScores)
- `POST /api/attempts/:attemptId/answers` (student: lưu đáp án)
- `POST /api/attempts/:attemptId/verifyToken` (student: verify checkpoint token)
- `POST /api/attempts/:attemptId/submit` (student: submit)
  - Tính và cache `questionScores` vào `Attempt.questionScores` (JSONB)

## 6b) Report (tối thiểu)
- `GET /api/sessions/:sessionId/report/scoreboard` (teacher: bảng điểm cả lớp)
- `GET /api/sessions/:sessionId/report/tokenLog` (teacher: log verify token tối thiểu)

## 7) Scoring (MCQ single/multi)
Chấm điểm dựa trên snapshot:
- **all_or_nothing**: đúng toàn bộ tập đáp án → full điểm, sai → 0
- **partial** (multi-select):
  - **EDC (Every Decision Counts)**: mỗi lựa chọn là 1 “decision”; đúng được cộng, sai bị trừ gián tiếp vì “không đúng decision”.
    - Nếu có \(n\) options: mỗi decision trị giá \(1/n\) điểm.
    - Điểm = (số decision đúng) / n.
    - Tham khảo: Open edX “Every Decision Counts (EDC)” trong tài liệu [Award Partial Credit](https://docs.openedx.org/en/latest/educators/how-tos/course_development/exercise_tools/add_multi_select_partial_credit.html).
  - **By Halves**: mỗi lỗi làm “nửa” điểm còn lại; 0 lỗi=100%, 1 lỗi=50%, 2 lỗi=25%, >=3 lỗi=0 (có điều kiện theo số đáp án).
    - Tham khảo: Open edX “By Halves” trong tài liệu [Award Partial Credit](https://docs.openedx.org/en/latest/educators/how-tos/course_development/exercise_tools/add_multi_select_partial_credit.html).
- **penalty**: chọn sai bị trừ điểm (đảm bảo không âm)

Gợi ý cấu hình (đặt trong `Quiz.settings`):
- `scoringMode`: `all_or_nothing | partial | penalty`
- `partialCreditMethod` (khi scoringMode=partial): `edc | halves`
- `penaltyPerWrongOption`: số điểm trừ cho mỗi lựa chọn sai (khi scoringMode=penalty)

## 8) `Quiz.settings` (đề xuất schema JSON dùng thống nhất)
Mục tiêu: đặt tên field chuẩn để DB/API/UI không lệch nhau.

- `durationSeconds`: int
- `questionMode`: `same_set | variant_set`
- `navigationMode`: `free | forward_only` (default: `free`)
- `variant` (khi questionMode=variant_set):
  - `defaultExtraPercent`: number (ví dụ 0.2)
  - `perTagExtraPercent`: record(tagNormalizedName -> number) (optional override theo tag)
- `checkpoint`:
  - `tokenStepSeconds`: 45
  - `minIntervalSeconds`: 240
  - `maxIntervalSeconds`: 300
  - `hardBlock`: true
  - `graceSecondsBeforeBlock`: 5
  - `maxFailedPerCheckpoint`: 6
  - `cooldownAfterFailed`: 3
  - `cooldownSeconds`: 30
  - `lockAfterFailed`: 6
  - `lockMinutes`: 5
- `scoring`:
  - `mode`: `all_or_nothing | partial | penalty`
  - `partialCreditMethod`: `edc | halves` (khi mode=partial)
  - `penaltyPerWrongOption`: number (khi mode=penalty)
  - `rounding`: `none | round_2` (default: `round_2`)


