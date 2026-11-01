# 广东来总AI排码 · 安全后台部署说明

当前网站由 GitHub Pages 托管，不能单独提供安全的账号密码登录。本目录是**待部署的 Supabase 数据库与权限基础**，尚未接入线上 Supabase 项目。

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
- `admin.html` 仍是已有的 GitHub 授权公告管理页，**不是**已部署的 Supabase 安全后台。
- `site-config.json` 仍由 GitHub 发布，网站尚未改用数据库配置。
- 此脚本没有创建任何真实管理员账号，也没有连接任何线上数据库。
