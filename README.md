# Portfolio · Khanh Phạm

Toàn bộ dự án portfolio làm trên Claude Design, chuyển sang code (Astro) để sửa và cập nhật bằng Claude Code.

## Có gì trong repo

| Đường dẫn | Nội dung | Nguồn |
|---|---|---|
| `/` | Danh mục mọi dự án | mới |
| `/hero/` | Hero banner mới: đảo nổi, nhân vật gõ laptop, đổi giờ / thời tiết / nhạc | `src/dc/hero/HERO.dc.html` |
| `/intro/` | Intro 6 giây (bấm Phát) | `src/dc/hero/PLAY2.dc.html` |
| `/case-study/` | Case study Design System Gridly | `src/dc/case-study/Main.dc.html` |
| `/design-system/` | Trang Design System New | `public/design-system/index.html` |
| `/lab/` | Storyboard 8 frame + bảng nhân vật (nội bộ, không có trên menu) | `src/dc/lab/*.dc.html` |
| `/old-hero/b/`, `/old-hero/c/` | Pixel Hero Banner cũ, để tham khảo | `src/dc/old-hero/*.dc.html` |
| `/b/<thư mục>/<Tên>/` | Mở riêng bất kỳ file `.dc.html` nào | tự sinh |

## Chạy trên máy

```bash
npm install
npm run dev      # mở http://localhost:4321
npm run build    # xuất site tĩnh vào dist/
```

## Cấu trúc

```
src/
  dc/            file .dc.html giữ nguyên định dạng Claude Design (markup + logic)
  lib/dc-runtime.js   bộ chạy .dc.html bằng Preact ({{…}}, sc-if, sc-for, state, sự kiện)
  components/DC.astro nhúng 1 file .dc.html vào trang
  pages/         mỗi thư mục = 1 đường dẫn
  layouts/Base.astro
public/
  hero/          engine đảo nổi bản mới (đèn viền đổi màu)
  old-hero/      engine + script của hero cũ (chat, i18n, nhân vật cũ)
  assets/blob/   ảnh sprite, GIF nhân vật, ảnh frame storyboard (tên = mã asset gốc)
  assets/case-study/
  design-system/ trang Design System (HTML 1 file)
```

## Sửa thế nào

- Sửa chữ, layout, màu: mở file `.dc.html` trong `src/dc/…`, sửa phần markup trong `<x-dc>`.
- Sửa logic, tương tác: sửa `class Component` trong thẻ `<script type="text/x-dc">` cuối file.
- Thêm trang mới: tạo `src/pages/<tên>/index.astro`, nhúng file bằng `<DC source={…} />` (xem `src/pages/hero/index.astro`), rồi thêm 1 dòng vào danh mục ở `src/pages/index.astro`.
- Đổi ảnh: thay file trong `public/assets/…`, giữ nguyên tên hoặc sửa đường dẫn trong file `.dc.html`.
- Có thể dán ngược 1 file `.dc.html` vào Claude Design (đổi lại đường dẫn `/assets/blob/…` nếu cần).

## Còn thiếu

- Email liên hệ trong chat hero cũ: [CẦN BẠN ĐIỀN] (`public/old-hero/hero-chat.js`).
- Câu giới thiệu trong intro: [CẦN BẠN ĐIỀN].
- Link `KP-AllWork` của hero cũ chưa có trang, đang trỏ về `#more-work`.

## Deploy

Site tĩnh, deploy được lên Vercel / Netlify (build: `npm run build`, thư mục: `dist`).
