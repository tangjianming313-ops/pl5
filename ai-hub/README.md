# AI HUB｜一站式 AI 订阅中心

当前版本：**MVP v0.4（开发预览，未正式部署）**。

这是服务发现、官方订阅跳转、会员记录及售前咨询的基础系统，不是可在站内完成支付/自动开通第三方订阅的线上商城。AI HUB 未声明与所列品牌有代理关系；获得必要销售授权前，不得推出代理收款业务。

## 已开发
- `index.html`：手机优先 AI 服务目录、分类/搜索、目标域名提示、已知品牌域名校验、官方站点跳转
- `account.html`：Supabase 邮箱免密码登录（需先配置）、订阅记录云端同步或本地记录、本机记录导入云端、售前咨询提交/查询/删除（云端模式）
- `admin.html`：通过 RLS 授权的商品上下架、描述编辑、官方域名校验，以及售前咨询查看和状态更新
- `schema.sql`：Supabase 表、字段权限、会员/管理员行级权限、咨询表同意字段和每日限额触发器
- `privacy.html`、`terms.html`：原型阶段隐私及服务说明，标注尚未具备正式商用资料
- `manifest.webmanifest` + `sw.js` + 图标：PWA 安装配置和同源静态资源缓存，**不会缓存 Supabase 用户 API 响应**
- `tests/smoke.mjs`：零依赖语法、资源、图标及 RLS 结构检查，运行命令 `npm test`
- `.github/workflows/ai-hub-checks.yml`：仅针对开发分支的检查，不部署/修改原有网站

## 尚未完成
- 独立公网部署、真实 Supabase 连接、Email OTP 测试
- 独立仓库 / 域名 / 云端邮箱发信服务
- 商家资质、代理授权与分销协议核验；真实售价与地区政策
- 正式客服邮箱、法务审核的隐私政策/服务协议、反滥用机制
- 正规支付、订单状态、验签回调、发货、退款/售后和审计
- 正式安卓 APK/AAB 和真机完整登录/购买回归测试

## 开发顺序
1. 部署静态演示，参见 [DEPLOY.md](./DEPLOY.md)
2. 创建隔离的 Supabase 项目，应用 `schema.sql`，配置 `config.js` 中**仅可公开的 URL 和 publishable/anon key**
3. 在 Supabase 上设置 Auth 重定向和邮件服务，管理员使用 User UID 加入 `staff_members`
4. 运行 `npm test`，再对所有角色、状态、登录/退出、咨询删除做真实联调
5. 确认运营主体、客服联系方式、政策文件和外部授权，再考虑开放真实客户
6. 安装 PWA 测试后，正式制作安卓 APK/AAB（参见 [android/README.md](./android/README.md)）

**不要把此开发分支直接合并到原「观数知微」网站的 main。**
