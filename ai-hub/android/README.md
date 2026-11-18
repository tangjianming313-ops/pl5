# AI HUB｜安卓端方案

## 最低成本：先安装 PWA

AI HUB 已提供 `manifest.webmanifest`、192/512 PNG 图标、Service Worker 和响应式页面。
**仅当网站已通过 HTTPS 正式部署后**，在 Android Chrome 打开网址，
通过浏览器菜单的「添加到主屏幕」或「安装应用」尝试安装。

这不是可分发的 APK，实际安装选项会因浏览器、设备及 manifest 验证状态而异。
本机订阅记录在不同浏览器安装方式下可能互不共享；云端模式需配置 Supabase。

## 下一阶段：正式 APK / AAB

建议使用官方 Android Trusted Web Activity (TWA) + Bubblewrap。

操作顺序：
1. 先部署 AI HUB 到你控制的稳定 HTTPS 域名。
2. 验证 PWA manifest、页面路由、图标及登录跳转。
3. 在电脑安装 Node.js、Android SDK 和 JDK。
4. 使用 Bubblewrap 从已上线网站的 `manifest.webmanifest` 创建 TWA Android 工程。
5. 生成并妥善保存应用签名密钥；得到证书 SHA-256 指纹。
6. 将包含 **真实包名和指纹** 的 `assetlinks.json` 放到网站根路径的
   `/.well-known/assetlinks.json`，完成 Digital Asset Links 验证。
7. 签名构建 APK（直接安装测试）或 AAB（如计划上架 Google Play）。
8. 在实际 Android 设备测试登录、弹窗、外部官方购买链接与返回流程。

官方指导：
- https://developer.chrome.com/docs/android/trusted-web-activity/quick-start/
- https://developer.android.com/develop/ui/views/layout/webapps/guide-trusted-web-activities-version2

不要预先把示例占位的 `assetlinks.json` 上传到线上，因为它无法通过正式签名验证。
目前项目**没有可下载的 APK**；必须在正式 HTTPS 域名、签名和构建环境确定后再制作。
