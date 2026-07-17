# S-Trip: Nền Tảng Lập Kế Hoạch Du Lịch Thông Minh

[![React](https://img.shields.io/badge/React-19.2-blue.svg)](https://react.dev)
[![Node.js](https://img.shields.io/badge/Node.js-16+-green.svg)]()
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)]()
[![Status](https://img.shields.io/badge/Status-Active%20Development-blue.svg)]()

> Khám phá vẻ đẹp Việt Nam thông qua một nền tảng du lịch thông minh, tích hợp AI và công nghệ hiện đại.

## 🌟 Tính Năng Chính

- **🤖 Trợ Lý AI Thông Minh** - Gợi ý lịch trình du lịch được cá nhân hóa bằng ChatAI
- **🗺️ Bản Đồ Tương Tác** - Khám phá điểm đến trên bản đồ trực quan
- **📅 Lập Kế Hoạch Linh Hoạt** - Xây dựng và quản lý lịch trình du lịch chi tiết
- **📑 Xuất PDF** - Lưu trữ và chia sẻ lịch trình dưới dạng tài liệu PDF
- **🌍 Định Vị Địa Điểm** - Tìm kiếm và định vị các địa điểm du lịch nhanh chóng
- **🎨 Giao Diện Hiện Đại** - Thiết kế responsive với Tailwind CSS
- **💾 Lưu Trữ Cloud** - Sử dụng Supabase cho đồng bộ dữ liệu

## 📋 Yêu Cầu Hệ Thống

- **Node.js**: v16 hoặc cao hơn
- **npm**: v7 hoặc cao hơn
- **Backend API**: Chạy trên `http://localhost:5000`
- **Supabase**: Tài khoản Supabase để quản lý database

## 🚀 Cài Đặt & Chạy

### 1. Clone Repository
```bash
git clone https://github.com/Neqqipy/S-Trip-Frontend.git
cd s-trip
```

### 2. Cài Đặt Dependencies
```bash
npm install
npm install @fortawesome/react-fontawesome @fortawesome/free-solid-svg-icons @fortawesome/free-regular-svg-icons @fortawesome/free-brands-svg-icons
```

### 3. Tạo file `.env` (hoặc `.env.local`)
Tạo file `.env.local` ở root của dự án để cấu hình môi trường local:

**Cách nhanh nhất:**
```bash
# Copy file mẫu .env.example thành .env.local
cp .env.example .env.local
```

Sau đó sửa giá trị trong `.env.local` theo môi trường của bạn:

```env
# Base URL cho tất cả API calls (APIs + OAuth Google)
REACT_APP_BASE_URL=http://localhost:5000
```

**Cấu hình theo môi trường:**

- **Development**: `REACT_APP_BASE_URL=http://localhost:5000`
- **Froxy/Custom**: `REACT_APP_BASE_URL=https://your-froxy-url.com`
- **Production**: Thêm biến môi trường vào dashboard của host (Vercel, Netlify, v.v.)
  ```
  REACT_APP_BASE_URL=https://your-backend.com
  ```

> Lưu ý: file `.env.local` nên được thêm vào `.gitignore` để tránh commit thông tin nhạy cảm.
> 
> **Để thay đổi backend URL**: Chỉ cần cập nhật giá trị `REACT_APP_BASE_URL`

### 4. Chạy Development Server
```bash
npm start
```

Ứng dụng sẽ mở tại [http://localhost:3000](http://localhost:3000)

## 📦 Scripts Npm

| Script | Mô Tả |
|--------|-------|
| `npm start` | Chạy development server |
| `npm build` | Build ứng dụng cho production |
| `npm test` | Chạy bộ test |
| `npm eject` | Eject từ Create React App (không thể hoàn tác) |

## 🏗️ Cấu Trúc Dự Án

```
src/
├── components/                   # React Components
│   ├── Navbar.js                # Navigation bar với dark mode toggle
│   ├── Hero.js                  # Banner tìm kiếm chính với form
│   ├── Dashboard.js             # Trang chủ chính
│   ├── FeaturedDestinations.js  # Hiển thị điểm đến nổi bật
│   ├── AiSchedule.js            # Component lập kế hoạch lịch trình
│   ├── ChatAI.js                # Chat bot AI thực time
│   ├── MapBubble.js             # Bản đồ tương tác dấu địa điểm
│   ├── Exportpdf.js             # Xuất lịch trình thành PDF
│   ├── ResetPassword.js         # Form đặt lại mật khẩu
│   ├── Toast.js                 # Notification toast (success/error)
│   ├── SkeletonLoader.js        # Loading skeleton UI
│   ├── Footer.js                # Footer với liên kết
│   ├── ProfilePage.js           # Trang profile người dùng
│   └── NotFound.js              # Trang 404
├── services/                    # API & Utilities
│   ├── api.js                   # Gọi API backend
│   └── geocodeUtils.js          # Địa phương hóa tọa độ địa điểm
├── App.js                       # Main App component + Routing
├── App.css                      # Các style chung
├── index.js                     # Entry point
└── postcss.config.js            # PostCSS config
```

### 📄 Chi Tiết Components

#### **Hero.js** - Form Tìm Kiếm Chính
- Cho phép người dùng nhập: Địa điểm đến, Nơi khởi hành, Số ngày, Ngân sách, Số hành khách, Ngày khởi hành
- Gợi ý tự động tỉnh thành Việt Nam
- Lưu lịch sử tìm kiếm vào localStorage
- Hỗ trợ hoán đổi địa điểm (origin ↔ destination)

#### **AiSchedule.js** - Lập Kế Hoạch Lịch Trình
- Hiển thị chi tiết kế hoạch du lịch từ backend
- Cho phép chỉnh sửa từng ngày, địa điểm, hoạt động
- Hiển thị thông tin: khách sạn, chuyến bay, tour, ẩm thực, vận chuyển
- Tính năng lưu kế hoạch vào profile người dùng

#### **ChatAI.js** - Trợ Lý AI Thực Time
- Chat bubble nổi ở góc màn hình
- Trò chuyện về lịch trình du lịch
- Gợi ý, trả lời câu hỏi về điểm đến
- Hỗ trợ streaming messages

#### **MapBubble.js** - Bản Đồ Tương Tác
- Hiển thị bản đồ các địa điểm du lịch
- Dấu vị trí cho từng hoạt động, nhà hàng
- Tính toán tuyến đường giữa các điểm

#### **ExploreVietnam.js** - Bản Đồ 3D Tương Tác Việt Nam
- Mô hình 3D bản đồ Việt Nam sử dụng `@react-three/fiber` và `@react-three/drei`.
- Cho phép người dùng tương tác xoay, zoom, chọn từng tỉnh thành.
- Hiển thị thông tin tổng quan, diện tích, dân số và mô tả ngắn bằng glassmorphism UI.
- Hỗ trợ Hero mode (chế độ sáng) và Dark mode.

#### **ResetPassword.js** - Đặt Lại Mật Khẩu
- Xử lý reset password qua email
- Xác thực token từ URL: `/#/reset-password?token=xxx`
- Kiểm tra độ mạnh mật khẩu (min 6 ký tự)
- Xác nhận mật khẩu khớp trước khi lưu
- Giao diện tối/sáng

#### **Exportpdf.js** - Xuất PDF
- Chuyển đổi lịch trình thành tài liệu PDF
- Sử dụng html2canvas + jsPDF
- In toàn bộ thông tin lịch trình

#### **Toast.js** - Thông Báo
- Hiển thị success/error notifications
- Tự động ẩn sau 3 giây
- Hỗ trợ multiple toasts

#### **ProfilePage.js** - Hồ Sơ Người Dùng
- Xem thông tin tài khoản
- Lịch sử lịch trình đã lưu
- Tải lại kế hoạch cũ
- Quản lý setting profile

#### **Navbar.js** - Navigation Bar
- Logo + Menu điều hướng
- Dark mode toggle
- Đăng nhập/Đăng xuất
- Avatar người dùng (nếu đã login)

## 🔧 Công Nghệ Sử Dụng

### Frontend
- **React** (v19.2) - UI library
- **React Router DOM** (v7.15) - Routing
- **Tailwind CSS** (v4.2) - Styling
- **Date-fns** (v4.3) - Date manipulation
- **React DatePicker** (v9.1) - Date picking

### Backend Integration
- **Supabase** (v2.106) - Database & Auth
- **Axios/Fetch** - API requests

### Utilities
- **html2canvas** (v1.4) - HTML to image
- **jsPDF** (v4.2) - PDF generation
- **FontAwesome** (v7.2) - Icons

### Testing & Quality
- **React Testing Library** - Component testing
- **Jest** - Test runner
- **ESLint** - Code linting

## 🌐 API Integration

Ứng dụng sử dụng proxy tới backend API:
```
Proxy: http://127.0.0.1:5000
```

Đảm bảo backend server đang chạy trước khi khởi động ứng dụng frontend.

## 🔐 Bảo Mật

- Biến môi Supabase nên được lưu trong `.env.local` (không commit)
- Sử dụng HTTPS trong production
- Validate input ở client và server
- Sử dụng Supabase RLS (Row Level Security) cho database

## 📱 Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## 🤝 Đóng Góp

1. Fork repository
2. Tạo feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 🐛 Báo Cáo Lỗi

Nếu bạn phát hiện lỗi, vui lòng:
1. Kiểm tra issue đã tồn tại chưa
2. Cung cấp mô tả chi tiết và bước tái hiện
3. Nêu phiên bản browser và OS
4. Thêm screenshot nếu có liên quan

## 🆕 Cập Nhật Mới

**Tháng 7/2026**
- Bổ sung bản đồ 3D Việt Nam tương tác (`ExploreVietnam`) tại trang chủ.
- Cải thiện UI thẻ thông tin tỉnh thành với thiết kế Glassmorphism hiện đại.
- Cập nhật và sửa lỗi màu sắc văn bản (Text Colors) khi ở chế độ xem sáng (Hero Mode) giúp người dùng dễ đọc hơn.

**Tháng 6/2026**
- Cải thiện UI/UX phần hiển thị thẻ phương tiện và logo hãng hàng không (đặc biệt Vietnam Airlines).
- Khắc phục các lỗi liên quan đến hiển thị và sai lệch ngày tháng trong lịch trình.
- Đồng bộ thanh điều hướng (Navbar) và chân trang (Footer), tối ưu luồng trải nghiệm người dùng (đổi tên "Trang chủ" thành "Tìm kiếm", cuộn trang thông minh).
- Tối ưu redirect khi lần đầu truy cập trang để người dùng xem phần "Giới thiệu" trước.

## 👨‍💻 Tác Giả
- Repository: [GitHub](https://github.com/Neqqipy/S-Trip-Project-Test)
- Email: drakhung311@gmail.com

## 🙏 Lời Cảm Ơn

Cảm ơn tất cả những người đóng góp và người dùng của S-Trip!

---

<div align="center">
  
**[Trang Web](#) • [Issues](https://github.com/Neqqipy/S-Trip-Frontend/issues) • [Discussions](https://github.com/Neqqipy/S-Trip-Frontend/discussions)**

Được phát triển với ❤️ tại Việt Nam
</div>
