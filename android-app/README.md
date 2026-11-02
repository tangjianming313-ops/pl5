# 广东来总排码 Android V1

这是基于 Android WebView 的安卓应用源代码，展示现有网站 https://tangjianming313-ops.github.io/pl5/ 。目前**尚未编译成 APK、尚未在真机测试**。

## 构建方式
1. 使用 Android Studio 打开本目录 `android-app`。
2. 使用 JDK 17，安装 Android SDK Platform 35；同步 Gradle（Android Gradle Plugin 8.7.3，Gradle 8.9）。
3. 点击 Build → Build APK(s) 构建调试包。调试 APK 通常位于 `app/build/outputs/apk/debug/app-debug.apk`。
4. 在安卓手机上安装并测试：加载、选号、复制、回测、开奖刷新、公告弹窗、返回键与网络异常。

## 设计与限制
- 使用线上网站，首次打开和更新数据需要网络；不是完整离线原生应用。
- 仅允许站点 `https://tangjianming313-ops.github.io/pl5/` 下的网页留在 App 内，其他链接交给系统浏览器。
- JavaScript 和 DOM Storage 已启用以支持现有选号交互；禁用 file/content access 和 HTTP 混合内容。
- 当前没有原生推送、文件上传、APK 签名发布流程，也没有独立管理员登录。
- App 与网站使用同一公告数据；后台仍是网页，管理员发布需要现有 GitHub 授权方式。
- 本项目是第一版壳应用。正式发布前需要补充应用图标、签名、设备兼容测试和应用商店政策审查。

## 安全
不要把 GitHub token、密码、Supabase 密钥放入 Android 源码或公开仓库。
