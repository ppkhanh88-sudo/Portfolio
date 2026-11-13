# Hướng dẫn cho Claude Code

- Chủ repo: Khanh Phạm, Senior UI/UX Designer. Luôn trả lời bằng tiếng Việt, ngắn, gạch đầu dòng.
- Hỏi lại trước khi đổi layout; chỉ sửa đúng phần được yêu cầu. Thiếu dữ kiện thì ghi [CẦN BẠN ĐIỀN], không bịa.
- Font: Newsreader (display) + Geist (body/UI). Icon dạng nét (linear). Focus ring ≥ 2px.
- Trang chính viết dạng `.dc.html` (định dạng Claude Design) trong `src/dc/`, chạy bằng `src/lib/dc-runtime.js`:
  - `{{path}}` chỉ là tra cứu, không phải biểu thức; tính toán trong `renderVals()`.
  - `<sc-if value="{{x}}">`, `<sc-for list="{{xs}}" as="x">`, sự kiện `onClick="{{fn}}"`, `ref="{{fn}}"`.
  - Script ngoài (engine…) khai báo bằng `<script src="/…">` trong `<head>` của file `.dc.html`.
- Hai engine đảo nổi khác nhau: `public/hero/` (bản mới, đèn viền đổi màu) và `public/old-hero/` (bản cũ). Không trộn.
- Kiểm tra trước khi báo xong: `npm run build` không lỗi, mở trang bằng trình duyệt (Playwright) và chụp lại.
