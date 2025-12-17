# 📘 PHÂN TÍCH & THIẾT KẾ SƠ BỘ

## Hệ thống Quiz trên lớp với Access Token động (45s)

---

## 1. Bối cảnh & Vấn đề nghiệp vụ

### 1.1 Bối cảnh sử dụng

* Quiz được tổ chức **trong giờ học trên lớp**.
* Sinh viên sử dụng **điện thoại cá nhân**, truy cập Internet qua **4G/5G**.
* Quiz kéo dài **~15 phút**, sinh viên làm bài **trực tiếp trên thiết bị của mình**.

### 1.2 Vấn đề cần giải quyết

* Không thể dựa vào Wi-Fi ID hoặc IP để xác nhận sinh viên đang ở trong lớp.
* GPS có thể bị **fake**, không đủ tin cậy để làm điều kiện bắt buộc.
* Cần một cơ chế:

  * Đảm bảo sinh viên **có mặt vật lý trong lớp**
  * Không làm gián đoạn trải nghiệm làm bài
  * Dễ triển khai, không phụ thuộc phần cứng đặc biệt

---

## 2. Mục tiêu hệ thống

### 2.1 Mục tiêu chính

* Xác nhận **sự hiện diện trong lớp** tại **nhiều thời điểm trong quá trình làm quiz**.
* Ngăn chặn việc sinh viên **ngồi ngoài lớp nhưng vẫn làm quiz**.

### 2.2 Mục tiêu phụ

* Trải nghiệm mượt, không phá flow làm bài.
* Không yêu cầu sinh viên cài app fake phức tạp.
* Hệ thống dễ mở rộng cho lớp đông sinh viên.

### 2.3 Nguyên tắc thiết kế

* **Không kỳ vọng chống gian lận 100%**.
* Tăng **chi phí và rủi ro gian lận** để đạt hiệu quả thực tế.
* Phù hợp với quiz mang tính **đánh giá quá trình (formative / in-class quiz)**.

---

## 3. Giải pháp tổng thể (High-level Solution)

### 3.1 Ý tưởng cốt lõi

* Giáo viên trình chiếu **Access Token** (mã xác thực) thay đổi **mỗi 45 giây**.
* Trong quá trình làm quiz, sinh viên sẽ **được yêu cầu nhập lại token** tại các thời điểm xác định (checkpoint).
* Token chỉ hiển thị **trực tiếp trong lớp học** → sinh viên bên ngoài khó theo kịp.

### 3.2 Mô hình tổng quát

```
[Teacher Screen]
   ↓  (Hiển thị token 45s)
[Student Quiz App] ←→ [Backend API]
```

---

## 4. Thiết kế nghiệp vụ chi tiết

### 4.1 Cấu trúc quiz

* Quiz duy nhất, **không chia thành nhiều quiz**.
* Quiz được chia thành nhiều **Phase (checkpoint logic)**.

Ví dụ quiz 15 phút:

| Phase   | Thời gian  | Nội dung  |
| ------- | ---------- | --------- |
| Phase 1 | 0–5 phút   | Câu 1–5   |
| Phase 2 | 5–10 phút  | Câu 6–10  |
| Phase 3 | 10–15 phút | Câu 11–15 |

---

### 4.2 Cơ chế xác thực bằng Access Token

#### Đặc điểm token

* Token là chuỗi **6–8 ký tự (numeric hoặc alphanumeric)**.
* Tự động thay đổi mỗi **45 giây**.
* Token chỉ hợp lệ trong **1–2 time window** (±45s).
* Token gắn với:

  * Quiz session
  * Phase hiện tại

#### Khi nào yêu cầu nhập token?

* Khi bắt đầu quiz (optional).
* Khi chuyển sang phase mới.
* Hoặc khi hệ thống phát hiện tín hiệu bất thường (optional – nâng cao).

---

### 4.3 Luồng nghiệp vụ – Sinh viên

1. Sinh viên vào quiz bằng link / QR ban đầu.
2. Làm bài bình thường trên thiết bị cá nhân.
3. Đến checkpoint:

   * Hệ thống hiển thị popup yêu cầu nhập **Access Token**.
   * Sinh viên nhìn màn chiếu lớp → nhập token.
4. Token hợp lệ → tiếp tục làm quiz ngay tại vị trí đang làm.
5. Token không hợp lệ / hết hạn → yêu cầu nhập lại (giới hạn số lần).

---

### 4.4 Luồng nghiệp vụ – Giáo viên

1. Giáo viên mở **Teacher Screen** (web/app).
2. Hệ thống hiển thị token hiện tại + countdown 45s.
3. Token tự động đổi theo thời gian, không cần thao tác tay.
4. Giáo viên chỉ cần trình chiếu màn hình này trong suốt quiz.

---

## 5. Thiết kế kỹ thuật sơ bộ

### 5.1 Thành phần hệ thống

#### Backend

* Quiz Session Service
* Token Generation & Verification Service
* Student Quiz State Management

#### Frontend

* Student Quiz UI (Web / Mobile Web / App)
* Teacher Screen UI (Web / Tablet)

---

### 5.2 Token generation (gợi ý)

Áp dụng mô hình **TOTP (Time-based One-Time Password)**:

```
token = TOTP(secret, interval=45s)
```

* Secret sinh theo từng quiz session.
* Backend là nguồn thời gian chuẩn.
* Cho phép lệch thời gian ±1 window.

---

### 5.3 API sơ bộ (định hướng)

* `POST /quiz/session/start`
* `GET /quiz/{session_id}/token/current`
* `POST /quiz/{session_id}/token/verify`
* `POST /quiz/{session_id}/answer/submit`

---

### 5.4 Trạng thái cần lưu (tối thiểu)

* QuizSession

  * session_id
  * start_time, end_time
  * secret_key

* StudentSession

  * student_id (hoặc anonymous id)
  * current_phase
  * last_verified_phase
  * attempt_count

---

## 6. Kiểm soát & chống lạm dụng

### 6.1 Giới hạn hệ thống

* Giới hạn số lần nhập sai token / phase.
* Timeout nếu không xác thực đúng phase.

### 6.2 Logging & hậu kiểm (optional)

* Log thời điểm verify token.
* Log thời gian làm từng câu.
* Flag bài làm có pattern bất thường.

---

## 7. Phạm vi KHÔNG xử lý trong giai đoạn đầu

* Không chống fake GPS triệt để.
* Không AI proctoring / nhận diện khuôn mặt.
* Không ghi màn hình hay khóa thiết bị.

> Các biện pháp này có thể bổ sung ở phase sau nếu cần.

---

## 8. Đánh giá sơ bộ

### Ưu điểm

* Phù hợp thực tế lớp học dùng 4G.
* Trải nghiệm tốt, không phá flow.
* Dễ triển khai, chi phí thấp.
* Hiệu quả cao với quiz ngắn trên lớp.

### Hạn chế

* Không đảm bảo 100% chống gian lận.
* Phụ thuộc vào kỷ luật lớp học và giám sát giáo viên.

---

## 9. Các điểm BA cần làm rõ thêm

* Quy mô lớp (số sinh viên tối đa).
* Quiz có tính điểm cao hay điểm quá trình.
* Có cần lưu danh tính sinh viên hay cho phép ẩn danh.
* Nền tảng triển khai (web / app / LMS tích hợp).
* Yêu cầu pháp lý / quyền riêng tư.

---

## 10. Kết luận

Giải pháp **Access Token động 45s + checkpoint trong quiz** là phương án **thực tế, dễ triển khai và hiệu quả** cho bài toán quiz trên lớp khi sinh viên dùng 4G/5G.

Hệ thống tập trung vào **xác nhận sự hiện diện**, không cố gắng giải quyết mọi hình thức gian lận, phù hợp cho đánh giá quá trình trong môi trường giáo dục.

---

## 11. Tài liệu thiết kế chi tiết

Xem tài liệu thiết kế hoàn chỉnh tại: `docs/DESIGN.md`
