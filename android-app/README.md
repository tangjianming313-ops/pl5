# 观数知微 Android 软件与升级说明

## 当前已实现

- Android 1.1.0（versionCode 2）的 WebView 软件工程，打开观数知微线上网站。
- 观数知微应用名称、图标和状态栏适配。
- 排码、独立11因子、历史回测、开奖同步和原弹窗。
- 新的「任务」入口：后台发布任务、独立公告以及 APK 版本更新说明。
- 任务完成状态存在**当前设备本地**，不是所有用户的服务端任务完成统计。
- 网站与运营数据在线更新，安卓软件无需重新安装即可读取**网站内容**变化。

## 快速安装与测试

1. 在仓库的 GitHub Actions 中打开 `Build Android APK` 的**成功构建记录**。
2. 在 Artifacts 中下载调试包 ZIP，解压后安装 `app-debug.apk`。
3. 连接网络，打开应用检查底部「任务」菜单、原排码、公告和弹窗。
4. 调试包仅适合测试；不同 Actions 执行中生成的默认调试签名可能不同，无法保证覆盖升级。切勿把调试包当正式迭代包。
5. 如旧版提示签名冲突，卸载旧调试版会清除其本地选号与任务状态，操作前自行备份。

## 管理后台

打开 `https://tangjianming313-ops.github.io/pl5/admin.html`。
- 在网页的 GitHub 访问令牌栏输入仅授予本仓库 Contents: Read and write 的 Fine-grained Token。
- 「任务」可发布、停用、恢复或删除任务。
- 「平台公告」可发布、停用、恢复或删除普通公告。
- 「编辑弹窗广告 / 公告」管理已有全屏弹窗。
- 「软件版本更新」发布版本号、更新说明和 HTTPS APK 下载链接。

此后台是**受 GitHub 令牌授权约束的公开网页**，不是已部署的专用账号登录后台。不要把令牌写进仓库、网页或分享给他人。

## 正式升级发布所需准备

已在 `.github/workflows/android-release.yml` 配置手动签名发布流程，但必须先在 GitHub 仓库 **Settings → Secrets and variables → Actions** 中以 secrets 配置：

- `GSZW_ANDROID_KEYSTORE_BASE64`：稳定的 Android 发布签名仓库经过 base64 编码后的内容
- `GSZW_ANDROID_STORE_PASSWORD`
- `GSZW_ANDROID_KEY_ALIAS`
- `GSZW_ANDROID_KEY_PASSWORD`

**不要把密钥或密码发到聊天中，也不要上传到公开仓库。** 请自行离线备份签名密钥，遗失后可能无法覆盖升级已安装应用。

发布步骤：
1. 更改 `android-app/app/build.gradle` 的 `versionCode`（每版递增）和 `versionName`（如 `1.2.0`），同时更新 Kotlin DSL 备用文件与 WebView HOME 的 `version` 参数。
2. GitHub Actions 手动执行 `Publish signed 观数知微 Android APK`，输入与代码相同的 `versionName`。
3. 工作流只会在密钥完整且签名构建成功时创建 GitHub Release，并上传生产 APK；已有同名版本不可覆盖。
4. 复制 GitHub Release 的 APK 下载 HTTPS 地址，在运营后台「软件版本更新」中填写并发布。
5. 客户端「任务 → 版本与升级」会显示新版本及下载安装入口，由 Android 系统确认安装。

站点中的 JavaScript / CSS / 内容可以按 GitHub Pages 发布更新；**原生 APK、系统权限、原生图标和原生功能**仍须打包、签名、分发新版 APK。

## 现有限制

- 未接入用户账号、跨设备任务完成记录、真实在线人数或服务端推送。
- 用户打开软件或刷新运营数据时读取任务和公告；弹窗仍为网站的现有弹窗机制。
- 未完成 Google Play 商店上架审核，也未测试所有 Android 机型。
- 网站拥有者自行管理正式签名证书、包名、分发与版本合规性。
