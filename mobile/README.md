# CalAI Mobile (Android)

App Android client cho CalAI, gọi backend Express hiện có. Tái sử dụng 100% AI pipeline (Cal-AI Python + chat session). Không train lại model.

## Stack
- Kotlin 2.0 + Jetpack Compose (Material 3)
- Retrofit 2 + OkHttp + kotlinx.serialization
- DataStore (lưu JWT)
- Navigation Compose
- minSdk 24, targetSdk/compileSdk 34

## Cấu trúc

```
mobile/
├── app/
│   ├── build.gradle.kts          # Cấu hình app + BACKEND_BASE_URL
│   └── src/main/
│       ├── AndroidManifest.xml
│       ├── java/com/calai/app/
│       │   ├── MainActivity.kt
│       │   ├── CalAiApplication.kt
│       │   ├── AppContainer.kt    # DI thủ công
│       │   ├── data/
│       │   │   ├── api/           # Retrofit interfaces + DTO
│       │   │   └── auth/          # TokenStore (DataStore)
│       │   └── ui/
│       │       ├── theme/         # CalAITheme, Color, Type
│       │       ├── login/         # LoginScreen + ViewModel
│       │       ├── chat/          # ChatListScreen, ChatScreen + ViewModels
│       │       └── AppRoot.kt     # Navigation
│       └── res/values/            # strings, colors, themes
├── gradle/
│   ├── libs.versions.toml         # Version catalog
│   └── wrapper/gradle-wrapper.properties
├── build.gradle.kts (root)
├── settings.gradle.kts
└── gradle.properties
```

## Cách mở project

1. Mở **Android Studio** → **File → Open** → trỏ tới thư mục `mobile/`.
2. Android Studio sẽ tự sync Gradle (tải dependencies lần đầu mất 2-5 phút). Nếu nó hỏi "Use Gradle wrapper" → đồng ý.
3. Nếu thiếu `gradlew.bat` (file binary), Android Studio sẽ tự tạo, hoặc bạn có thể bỏ qua vì AS dùng Gradle bundled.

## Cấu hình backend URL

Mở `app/build.gradle.kts`, sửa dòng `BACKEND_BASE_URL`:

```kotlin
buildConfigField("String", "BACKEND_BASE_URL", "\"http://10.0.2.2:3000\"")
```

| Môi trường | Giá trị |
|---|---|
| Android Emulator chạy cùng máy với backend | `http://10.0.2.2:3000` |
| Điện thoại thật + cùng WiFi với máy tính | `http://<IP-máy-tính>:3000` (ví dụ `http://192.168.1.5:3000`) |
| Điện thoại thật + ngrok | `https://xxxx.ngrok-free.app` |

Sau khi sửa → **Build → Rebuild Project** để áp dụng.

## Chạy backend trước khi bật app

```bash
# Tại thư mục backend/
npm install
npm run dev   # hoặc npm start
# Server lắng nghe port 3000 (configurable qua .env)
```

Nếu test trên máy thật + ngrok:

```bash
ngrok http 3000
# Copy URL https://xxxx.ngrok-free.app vào BACKEND_BASE_URL ở app/build.gradle.kts
```

CORS trong backend (`backend/src/app.ts`) đã whitelist `*.ngrok-free.app` rồi nên không cần chỉnh gì thêm.

## Test trên điện thoại thật

1. Trên điện thoại: vào **Settings → About phone → Build number** → bấm 7 lần để mở Developer Options.
2. **Settings → Developer options → USB debugging** → bật.
3. Cắm USB vào máy tính. Lần đầu sẽ hỏi "Allow USB debugging?" → OK.
4. Android Studio → góc trên bên phải sẽ thấy tên máy của bạn → bấm **Run ▶**.
5. App sẽ được cài và mở trực tiếp.

## Tính năng đã có
- [x] Đăng nhập với email + password (POST /api/auth/login)
- [x] Tự lưu JWT vào DataStore, gắn `Authorization: Bearer ...` cho mọi request
- [x] Danh sách đoạn chat (GET /api/chat/sessions)
- [x] Mở 1 đoạn chat và xem tin nhắn (GET /api/chat/sessions/:id/messages)
- [x] Gửi tin nhắn text mới, tự tạo session nếu chưa có (POST /api/chat/message)
- [x] Đăng xuất (xoá token khỏi DataStore)

## Roadmap (chưa làm)
- [ ] Đăng ký tài khoản (OTP qua email)
- [ ] Gửi ảnh món ăn từ camera/photo picker → render `foodInsight` (calories, macros, gợi ý)
- [ ] Render `thinkingSteps` đẹp như web
- [ ] Push notification (FCM) nhắc ăn uống
- [ ] Widget calories còn lại trong ngày
- [ ] Voice input (Android SpeechRecognizer)

## Troubleshooting

**"Không kết nối được máy chủ" khi login**
- Kiểm tra backend đang chạy (`curl http://localhost:3000/api/health` từ máy tính).
- Nếu dùng máy thật + LAN: tắt Windows Firewall hoặc allow port 3000.
- Nếu dùng emulator: chắc chắn URL là `10.0.2.2`, không phải `localhost`.

**"Cleartext HTTP not permitted"**
- Manifest đã có `android:usesCleartextTraffic="true"` nên http:// chạy được cho LAN dev. Production nên dùng https.

**Sync Gradle thất bại lần đầu**
- Đảm bảo có internet (cần tải ~500MB dependencies).
- File → Invalidate Caches → Restart.
