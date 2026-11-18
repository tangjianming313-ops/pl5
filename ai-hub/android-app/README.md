# AI HUB Android APK（测试版）

网站： https://tangjianming313-ops.github.io/pl5/ai-hub/

包名： `com.aihub.mobile`

当前为 Android WebView 预览壳。仅在 AI HUB 目录内打开链接；第三方品牌订阅链接在系统浏览器打开，不在 App 中收取支付资料。

构建：配置 Android SDK + Gradle 8.10.2 + JDK 17 后，在 `android-app` 目录执行 `gradle assembleDebug`，得到 `app/build/outputs/apk/debug/app-debug.apk`。

GitHub Actions：根目录 `.github/workflows/ai-hub-android-apk.yml` 自动生成安装包构建产物。

**注意**
- 这是 debug 签名测试 APK，未经过应用市场审核，不是正式发行版。
- 在 APK 内登录第三方邮件 OAuth/邮箱魔法链接可能回到系统浏览器（与 WebView 会话隔离）；云端会员操作建议使用 PWA 浏览器版，直到实现经过验证的 Android App Links。
- 需要线上 HTTPS 网站和稳定网络。官方品牌交易在外部浏览器完成。
- 正式发布需自有、妥善保管的密钥、真机兼容测试、应用隐私政策和当地合规审核。
