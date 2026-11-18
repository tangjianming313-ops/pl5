# AI HUB｜低成本部署手册

> 当前代码在 `tangjianming313-ops/pl5` 的 `ai-hub-prototype` 分支、`ai-hub/` 子目录中。
> **不要把这个分支合并到原站点的 main 来部署**；原观数知微网站应保持独立。

## A. 先部署可访问的静态演示网站

在 Cloudflare Dashboard → Workers & Pages → Create → Pages → Connect to Git：

| 选项 | 值 |
|---|---|
| GitHub 仓库 | `tangjianming313-ops/pl5` |
| Production branch | `ai-hub-prototype` |
| Framework preset | None / 静态 HTML |
| Build command | 留空 |
| Build output directory | `ai-hub` |
| Root directory | 留空（仓库根目录） |

部署成功后，Cloudflare 将提供一个 `*.pages.dev` HTTPS 地址。
此项目读取 `ai-hub/` 目录，不会覆盖现有 GitHub Pages 站点。
如 Cloudflare 提示构建命令必填，可设为 `echo "Static site"`。

有条件时应迁移至独立的 `ai-hub` 仓库；迁移后网站文件放在仓库根目录，
Cloudflare 的 Build output directory 调整为 `.`。

## B. 开启正式会员系统

1. 创建 Supabase 项目。建议单独为 AI HUB 创建，不与其他网站共用数据库。
2. 打开 SQL Editor，完整运行 `schema.sql`（含商品、订阅记录、管理员表、RLS 策略）。
3. 在 Project Settings / API 处复制 **Project URL** 和 **Publishable（或 legacy anon）Key**。
4. 只编辑 `config.js` 的公开字段：
   `supabaseUrl: "https://YOUR_PROJECT.supabase.co"`
   `supabaseAnonKey: "YOUR_PUBLIC_KEY"`
5. **不能**使用 secret key、service_role key 或数据库密码。它们不应出现在 GitHub 和网页代码中。
6. Supabase → Authentication → URL Configuration：将 Cloudflare Pages 网站设为 Site URL，增加
   `https://YOUR_SITE.pages.dev/account.html` 至允许的 Redirect URLs。
7. Supabase → Authentication → Providers → Email：确保邮箱登录启用。
   正式运营前配置可靠 SMTP、发信域名和邮件限流 / 防滥用。
8. GitHub 提交 `config.js` 后 Cloudflare 自动部署，访问 `account.html` 测试邮箱登录。

> 若邮箱跳转返回「redirect not allowed」或不能登录，检查步骤 6。
> 若登录成功但查询记录报权限错误，检查步骤 2 的 RLS 是否完整启用。

## C. 启用管理员

1. 用自己的邮箱在 `account.html` 登录一次。
2. Supabase → Authentication → Users 中复制该账户的 User UID。
3. 在 SQL Editor 执行（替换下方占位 UUID）：

```sql
insert into public.staff_members (user_id)
values ('YOUR_AUTH_USER_UUID')
on conflict (user_id) do nothing;
```

4. 打开 `admin.html`；只有加入 `staff_members` 的账户才可以新增或修改商品。
5. 新商品建议先设为「草稿」，确认官方链接与地区政策后再发布。

管理员不要用网页直接编辑 `staff_members`；这个表没有任何客户端写入权限。

## D. 上线前必须完成的测试

- 未登录用户只能看到已发布商品，不能改商品。
- 普通会员不能读其他用户的订阅记录，也不能进入后台。
- 管理员能发布或下架商品，但不能直接访问其他会员的私有订阅记录。
- 登录邮件在允许的正式 HTTPS 域名下能够正确返回。
- 在手机浏览器测试页面切换、登录、退出、安装 PWA 和断网显示。
- 测试隐私政策、服务条款、投诉渠道、自动续费说明、退款说明。
- 完成品牌授权文件和支付商户审核以前不要开放站内收款。

## E. 后续合规销售架构

`商品目录 → 用户提交意向 → 授权资质核验 → 服务端创建订单 → 合规支付 → 服务端验证回调 → 授权交付 → 售后`。

**支付回调、价格签名、管理员操作审计必须在服务器端实现**。本项目目前没有这些功能；
直接在静态前端增加「已付款」按钮不能替代支付或订单验证。


## F. 售前咨询与公开上线门槛（v0.4）

- `subscription_inquiries` 在 `schema.sql` 中。只有已经邮箱登录的用户可提交咨询；
  RLS 将客户数据限制在客户本人和已授权管理员之间。
- 每个用户每 24 小时最多提交 3 条咨询（数据库触发器的基本限制）。
  这**不能替代** CAPTCHA、网关级限流、发信频率控制和滥用监控。
- 管理后台可以将状态更新为「待处理 / 已联系 / 已关闭」，但不执行付款或发货。
- 客户可以自行删除自己的咨询记录，管理员不能通过普通网页更改客户的邮箱及咨询内容。
- 隐私与条款页面目前是**开发测试说明**。正式开放客户提交前，
  必须确认真实运营主体、客服联系方式、个人信息保留与删除流程、
  地区隐私法律要求，且对隐私政策、服务条款进行正式审核。
- 只有获取品牌/销售渠道必要授权后才考虑站内订单。不要把咨询称为订单或保证开通。

## G. 低成本部署验收

在网站上线后逐项确认：

1. `index.html`、`account.html`、`admin.html`、`privacy.html`、`terms.html` 都能通过 HTTPS 打开
2. Android Chrome 可以显示 PWA 安装入口（浏览器不保证一定显示）
3. Google Chrome / Android WebView 能正确打开官方商品 URL，且显示的目标域名与官网匹配
4. Supabase 邮箱 OTP 重定向回到真实 Cloudflare Pages 域名
5. 非管理员不能读管理员表、编辑商品、读取别人的咨询
6. 普通会员只能读写自己的订阅记录、查看/删除自己的咨询
7. 每用户每天咨询上限触发后表现符合预期
8. 运行 `node --version` 应为 22 或兼容版本；在 `ai-hub` 目录运行 `npm test` 通过
9. Cloudflare Pages 发布日志无失败，浏览器控制台无明显错误
10. 设置真实客服和完整合规条款前不开放对外营销和代收费功能
