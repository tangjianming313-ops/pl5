# 观数知微 · 运营后台与安全说明

当前用户网站和 Android WebView 软件共享 GitHub Pages 内容。已具备基于 GitHub Contents 写入权限的运营后台 `admin.html`，可以管理：

- `ops.json`：用户任务、普通公告、Android 软件版本说明及 APK 下载地址；
- `ads.json`：全屏弹窗公告 / 广告；
- 网站和软件端每 5 分钟读取最新运营数据，也支持手动刷新；
- 任务完成状态仅保存在用户设备，不能统计跨设备完成情况。

**安全边界**：`admin.html` 是公开可访问的页面，不存在私密密码登录。所有发布操作需要管理员本人提供具备仓库 Contents: Read and write 权限的 GitHub Fine-grained token，令牌只在页面内存使用、不写入网站存储。请注意浏览器环境及令牌泄露风险。正式多管理员后台应部署认证与权限服务，不能依赖隐藏网址或写死密码。

本目录的 Supabase 数据库结构是用于未来安全后台的**待部署基础**，尚未接入真实 Supabase 项目。

## 1. 创建 Supabase 项目
在 https://supabase.com/dashboard 创建项目，选择合适的数据库区域。请保管数据库密码、service_role 密钥等私密凭据，**不要上传到 GitHub**。

## 2. 创建数据库
进入 Supabase Dashboard → SQL Editor，运行 [schema.sql](./schema.sql)。它将创建：
- `user_profiles`：用户资料；
- `admin_members`：管理员名单；
- `site_settings`：公开公告与默认选号配置；
- `admin_audit_log`：为未来服务端操作日志预留；
- 基于 Supabase Auth 的 RLS 行级安全策略。

## 3. 创建首个管理员
先在 Supabase Authentication 创建你自己的登录用户。核实其 UUID 后，在 SQL Editor 手动运行：
```sql
insert into public.admin_members(user_id)
values ('这里替换为已核实的管理员Auth UUID');
```
**不要**开放客户端新增管理员的权限。不要将登录密码、个人 GitHub 令牌或 Supabase service_role key 写入网页。

## 4. 后续接入工作
1. 配置 Supabase 项目 URL 和**可公开的 anon/publishable key**；
2. 使用 Supabase Auth 实现登录与会话恢复；
3. 在后台通过 `is_site_admin()` 和 RLS 检查权限；
4. 将现有 GitHub 公告管理迁移为数据库发布，并验证普通用户无法修改；
5. 实现服务端审计日志、速率限制与管理员 MFA；
6. 做真实浏览器测试后再对外宣布后台已上线。

## 当前边界
- `admin.html` 当前已支持 GitHub 授权发布任务、普通公告、原有弹窗和版本信息，但**不是**已部署的 Supabase 安全后台。
- `site-config.json` 仍由 GitHub 发布，网站尚未改用数据库配置。
- 此脚本没有创建任何真实管理员账号，也没有连接任何线上数据库。

## 软件发布与升级

安卓调试包由 GitHub Actions 构建；正式版需要稳定的发布签名。请见 [android-app/README.md](../android-app/README.md) 与 `.github/workflows/android-release.yml`。在后台发布 APK 下载 URL 不等于自动编译或签名软件，也不会绕过 Android 系统确认安装。
