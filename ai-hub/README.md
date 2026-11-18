# AI HUB｜一站式 AI 官方订阅中心

**当前版本：MVP v0.3，代码开发版；尚未公开部署/上线交易功能。**

## 已完成
- 官网/商城首页：移动端适配、AI 服务搜索/分类、官方购买入口
- 商品目录：Supabase 已配置时从 `catalog_products` 查询已发布商品，未配置时展示静态样例
- 会员中心：邮箱免密码登录（需要 Supabase）、云端订阅记录的新增/查询/删除、用户数据隔离
- 本机记录：无账号时仍可本机保存、删除和导出 JSON；登录后可以手动导入云端（按本机 ID 去重）
- 管理后台：数据库验证管理员权限，管理商品、分类、描述、官方链接和发布状态
- 安全模型：Supabase Auth / RLS、独立管理员身份表、公开 Key 与服务端密钥边界
- PWA：可安装配置、SVG/192/512 PNG 图标、基础离线缓存、同源静态资源限制
- Cloudflare Pages 部署步骤与 Android TWA 后续打包说明

## 不应误认为已实现
- 目前**没有**部署好的 AI HUB 公开网站
- 没有配置真实 Supabase 项目；`config.js` 仍为占位
- 未实现支付、订单、自动开通第三方会员、退款及售后系统
- 未取得官方品牌订阅代理授权；只链接到品牌官网
- 尚未生成 Android APK / AAB
- 没有真实生产用户、后台运营数据或已确认的官方商品售价

## 目录
- `index.html`：商城及导航
- `account.html`：登录和订阅记录
- `admin.html`：管理员商品管理
- `cloud.js`：按需加载 Supabase 浏览器客户端
- `config.js`：公开项目 URL 与 publishable/anon Key（**不得存服务端密钥**）
- `schema.sql`：独立 Supabase 项目初始模型与 RLS 安全规则
- `manifest.webmanifest`、`sw.js`、`icon*.png`、`icon.svg`：PWA 资产
- `_headers`：Cloudflare Pages 安全响应头
- `DEPLOY.md`：部署及账户设置
- `android/README.md`：安卓安装和 TWA APK/AAB 规划

## 立即执行
参照 [DEPLOY.md](./DEPLOY.md)，用 Cloudflare Pages 连接 `ai-hub-prototype` 分支，
以 `ai-hub` 作为构建输出目录，创建独立 AI HUB 静态演示站。
然后创建 Supabase 项目、执行 `schema.sql`、编辑 `config.js` 并配置邮箱登录。
管理员必须由项目所有者在数据库中授权。

## 合规限制
AI HUB 是独立导航与订阅管理项目，不代表已成为任何品牌官方代理。
未取得授权时不得通过本站向消费者转售第三方账号、共享订阅或承诺自动开通。
各服务商商标及官方套餐政策归各自权利人所有。
