// Dependency is loaded only when a real public Supabase project is configured.
let cachedClient = null;
let pendingClient = null;
export const configured = () => {
  const cfg = window.AIHUB_CONFIG || {};
  try {
    const url = new URL(cfg.supabaseUrl || "");
    return url.protocol === "https:" && url.hostname.endsWith(".supabase.co") && Boolean(cfg.supabaseAnonKey);
  } catch {
    return false;
  }
};
export async function client() {
  if (!configured()) return null;
  if (cachedClient) return cachedClient;
  if (!pendingClient) {
    pendingClient = import("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm")
      .then(({ createClient }) => {
        const cfg = window.AIHUB_CONFIG;
        cachedClient = createClient(cfg.supabaseUrl, cfg.supabaseAnonKey, {
          auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
        });
        return cachedClient;
      })
      .catch(err => { pendingClient = null; throw err; });
  }
  return pendingClient;
}
export function friendlyError(error) {
  if (!error) return "请求失败，请稍后重试。";
  const message = String(error.message || error);
  if (/fetch|network/i.test(message)) return "连接失败，请检查网络、Supabase 项目地址及网络访问权限。";
  if (/rate limit|too many requests/i.test(message)) return "操作过于频繁，请稍后再试。";
  if (/not allowed|permission denied|row.level security|42501/i.test(message))
    return "权限不足，请检查账户角色与数据库行级安全策略。";
  return message.slice(0, 240);
}
