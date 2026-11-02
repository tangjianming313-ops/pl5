# 来总 AI 助手（三人专属）部署说明

**当前状态：代码已提交，但服务未部署，AI 还不能回答问题。** 网站 `ai.html` 的 `API` 仍为空。不得把 OpenAI API 密钥放入网页、APK 或 GitHub。

## 必要服务
- Cloudflare Workers（AI 安全代理）
- Cloudflare D1（邀请码、会话和每日次数）
- OpenAI API（独立计费，ChatGPT Plus 不能代替）

## 管理员部署步骤
1. 创建 Cloudflare Worker 和 D1 数据库，将 `wrangler.toml` 中的 `database_id` 换成真实 D1 ID。
2. 在 D1 执行 `ai-worker/schema.sql`。
3. 在 Worker Secrets 中设置 `OPENAI_API_KEY` 和随机的 `INVITE_PEPPER`（不要提交到 GitHub）。建议再设置 `RATE_SALT`。
4. 在本地**私密环境**生成3个随机邀请码（至少16位字母数字），并计算每个 `SHA256(INVITE_PEPPER + ':' + 邀请码)`，只把哈希写入 D1：
   `INSERT INTO invites(id,code_hash) VALUES (1,'HASH_1'),(2,'HASH_2'),(3,'HASH_3');`
   请不要把邀请码原文、pepper 或密钥提交到 GitHub。
5. 发布 Worker；在 `ai.html` 中把 `const API='';` 修改为 Worker 的 HTTPS 地址（不带末尾斜杠）。这是**公开的接口地址**，不是密钥。
6. 从三个不同设备分别用各自的邀请码激活，验证第四个邀请码无效、同一邀请码不能重复激活、每人每天最多30次、北京时间换日重置、失败请求退还次数。
7. 正式上线前需做安全测试，包括暴力尝试、异常并发、服务故障、XSS 和设备遗失后的撤销会话。

## 安全边界
- 每个邀请码一次性兑换一个持久会话令牌，当前存储于浏览器 localStorage。**清除应用数据可能丢失访问权限**；管理员需要手动在 D1 重置或重新发放。不同设备不能直接共享同一邀请码。
- D1 的条件 UPDATE 保证每个邀请码的单日额度上限。请求失败时尽力返还额度；极端故障下可能需要管理员核对。
- 目前 AI 只接收当前问题，**不会自动读取排列五历史记录**；需要另做受控数据接口才可提供真实统计。
- Worker 采用网站来源检查、邀请码限速、会话验证；这不等于已经经过正式安全审计。
- 用户的提问会被转发至 OpenAI API。部署前应告知三名用户数据处理方式。
- 如需吊销某用户，管理员可在 D1 执行 `UPDATE invites SET session_hash=NULL WHERE id=对应ID;`。不影响其他用户。
- 此功能没有完成真实部署和端到端测试，请勿当作已上线的 AI 服务。
