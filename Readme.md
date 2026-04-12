Chào mừng đến với dự án CFRMS! Đây là tài liệu hướng dẫn chính thức dành cho tất cả lập trình viên tham gia phát triển dự án. Hệ thống được xây dựng trên nền tảng Node.js, Express và TypeScript, sử dụng Prisma làm ORM và phân tách rõ ràng luồng nghiệp vụ giữa **Client** (Người dùng cuối) và **Admin** (Quản trị viên).

---

## Công nghệ sử dụng (Tech Stack)
* **Môi trường & Framework:** Node.js, Express.js.
* **Ngôn ngữ:** TypeScript (đảm bảo code chặt chẽ, ít lỗi rác).
* **Database ORM:** Prisma (Tương tác cơ sở dữ liệu an toàn và nhanh chóng).
* **Template Engine:** Pug (Render giao diện Server-side).
* **Công cụ hỗ trợ:** dotenv (Quản lý biến môi trường), nodemon & ts-node (Môi trường Dev).

---

## Cấu trúc thư mục (Directory Structure)
Dự án áp dụng mô hình kiến trúc phân lớp, yêu cầu mọi người tuân thủ đúng vị trí đặt file để code dễ bảo trì:

```text
├── config/           # Các file cấu hình hệ thống (vd: cấu hình database, biến toàn cục)
├── controllers/      # Nơi chứa logic xử lý chính của ứng dụng
│   ├── admin/        #   - Logic xử lý cho trang Quản trị viên
│   └── client/       #   - Logic xử lý cho trang Người dùng
├── middlewares/      # Hàm trung gian (vd: Auth Guard kiểm tra đăng nhập, check Role)
├── prisma/           # Nơi quản lý Database
│   ├── migrations/   #   - Lịch sử các lần thay đổi bảng (Không được sửa bằng tay!)
│   └── schema.prisma #   - Nơi thiết kế toàn bộ cấu trúc DB (Tables, Relations)
├── prisma.config.ts  # File khởi tạo kết nối Prisma Client
├── public/           # Tài nguyên tĩnh (CSS, JS, Images) dùng cho frontend
├── routes/           # Nơi định nghĩa các đường dẫn API / Web (Endpoints)
│   ├── admin/        #   - Các Route bắt đầu bằng /admin
│   └── client/       #   - Các Route công khai
├── utils/            # Các hàm tiện ích dùng chung (vd: format ngày tháng, hash password)
├── validators/       # Chứa logic kiểm tra dữ liệu đầu vào (Form validation)
├── views/            # Giao diện hiển thị (Pug)
│   ├── admin/        
│   └── client/       
├── index.ts          # Điểm neo khởi chạy toàn bộ ứng dụng (Entry point)
└── package.json      # Danh sách thư viện và scripts


```
## Hướng dẫn Setup & Chạy dự án

Sau khi clone code về, thực hiện các bước sau:

1. Cài đặt thư viện
```bash
npm install

2. Thiết lập file .env
Tạo file .env ở thư mục gốc. Lấy chuỗi kết nối từ Dashboard của Neon DB và điền vào:
```env

Chú ý: Neon DB là Postgres, bắt buộc phải có ?sslmode=require ở cuối
DATABASE_URL="postgresql://<tên_đăng_nhập>:<mật_khẩu>@<địa_chỉ_host>.neon.tech/<tên_db>?sslmode=require"
PORT=3000
```

3. Khởi tạo Database & Prisma Client
Chạy 2 lệnh sau để đồng bộ cấu trúc bảng lên Neon DB và sinh code Prisma Client:
```bash
npx prisma migrate dev
npx prisma generate
```

4. Chạy Server

Chế độ Dev (Vừa code vừa chạy ngầm bằng nodemon/ts-node):
```bash
npm run dev
```

Chế độ Production (Biên dịch TS sang JS và chạy thật):
```bash
npm run build
npm start
```

---

## 5. Hướng dẫn Testing (Cypress E2E)

Dự án sử dụng Cypress + Docker để mô phỏng môi trường tách biệt hoàn toàn với lúc code, không làm ảnh hưởng DB thật. Trước khi test, đảm bảo có Docker và tạo file `.env.test` (`PORT=3001`).

- **Chạy có giao diện (Khi đang code/debug):**

  ```bash
  # 1. Bật server test ngầm
  docker-compose -f docker-compose.test.yml up -d web-test

  # 2. Mở Cypress UI (DB sẽ tự động reset mỗi lần click chạy ứng dụng)
  npm run cy:open
  ```

- **Chạy tự động hoàn toàn (Dành cho kiểm tra CI/CD):**

  ```bash
  docker-compose -f docker-compose.test.yml up --abort-on-container-exit
  ```