(function () {
  'use strict';
  const get = id => document.getElementById(id);
  if (!get('lzaiSetup')) return;
  const TOKEN_KEY = 'lzai-device-token-v1';
  let endpoint = '';
  let token = '';
  let busy = false;
  const messages = [];
  const status = (msg) => { get('lzaiStatus').textContent = msg; };
  const info = (msg) => { get('lzaiInfo').textContent = msg; };
  try { token = localStorage.getItem(TOKEN_KEY) || ''; } catch (_) {}
  function showGate(message) {
    get('lzaiSetup').classList.remove('hidden');
    get('lzaiChat').classList.add('hidden');
    if (message) info(message);
  }
  function showChat(remaining) {
    get('lzaiSetup').classList.add('hidden');
    get('lzaiChat').classList.remove('hidden');
    status('已连接');
    get('lzaiQuota').textContent = '今日剩余 ' + remaining + '/30 次';
    if (!get('lzaiMessages').children.length) append('bot', '你好，我是广东来总排码 AI 助手。可以讨论排码规则、回测结果与历史数据，但不能预测或保证下一期开奖结果。');
  }
  function append(kind, value) {
    const node = document.createElement('div');
    node.className = 'lzai-bubble ' + kind;
    node.textContent = value;
    get('lzaiMessages').appendChild(node);
    get('lzaiMessages').scrollTop = get('lzaiMessages').scrollHeight;
    return node;
  }
  async function request(path, body, auth) {
    const headers = {'Content-Type':'application/json'};
    if (auth && token) headers.Authorization = 'Bearer ' + token;
    const res = await fetch(endpoint + path, {
      method:body === undefined ? 'GET':'POST',
      headers, cache:'no-store', body:body === undefined ? undefined:JSON.stringify(body)
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) throw new Error(data.message || ('请求失败（' + res.status + '）'));
    return data;
  }
  function clearToken() {
    token = '';
    try {localStorage.removeItem(TOKEN_KEY);} catch (_) {}
  }
  async function restore() {
    try {
      const data = await request('/me', undefined, true);
      showChat(data.remaining);
    } catch (e) {
      clearToken();
      status('需要激活');
      showGate('请使用专属邀请码激活本设备。');
    }
  }
  get('lzaiActivate').addEventListener('submit', async function (e) {
    e.preventDefault();
    if (!endpoint || busy) return;
    const code = get('lzaiInvite').value.trim();
    if (!code) return info('请输入邀请码');
    busy = true;
    get('lzaiActivateBtn').disabled = true;
    info('正在验证邀请码…');
    try {
      const data = await request('/activate',{code},false);
      token = data.token;
      try {localStorage.setItem(TOKEN_KEY,token);} catch (_) {}
      get('lzaiInvite').value = '';
      showChat(data.remaining);
    } catch (error) { info(error.message || '激活失败'); }
    finally { busy = false; get('lzaiActivateBtn').disabled = false; }
  });
  get('lzaiSendForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    if (busy || !endpoint || !token) return;
    const message = get('lzaiInput').value.trim();
    if (!message) return;
    if (message.length > 800) return status('单条消息最多 800 字');
    busy = true;
    get('lzaiSendBtn').disabled = true;
    const history = messages.slice(-8);
    append('user',message);
    get('lzaiInput').value = '';
    const placeholder = append('bot','正在思考…');
    try {
      const latest = (get('latest')?.textContent || '').trim();
      const context = /^\d{4}$/.test(latest) ? {siteLatestUnverified:latest} : {};
      const data = await request('/chat',{message,history,context},true);
      placeholder.textContent = data.reply || '本次未生成回复';
      messages.push({role:'user',content:message},{role:'assistant',content:data.reply || ''});
      get('lzaiQuota').textContent = '今日剩余 ' + data.remaining + '/30 次';
      status('已连接');
    } catch (error) {
      placeholder.textContent = '暂时无法回复：' + (error.message || '网络错误') + '。请检查网络与后台连接。';
      if (/授权|认证|登录|令牌/.test(error.message||'')) {clearToken();showGate('登录已失效，请联系管理员重新绑定。');}
    } finally {busy=false;get('lzaiSendBtn').disabled=false;get('lzaiInput').focus();}
  });
  get('lzaiClear').addEventListener('click', function () {
    messages.length = 0;
    get('lzaiMessages').replaceChildren();
    append('bot','已清空本机页面中的聊天记录。Aurabot 服务端独立会话记忆不会因此删除。');
  });
  async function init() {
    try {
      const response = await fetch('./assistant-config.json?ts=' + Date.now(),{cache:'no-store'});
      if (!response.ok) throw new Error('缺少配置');
      const cfg = await response.json();
      const url = String(cfg.apiBaseUrl||'').replace(/\/+$/,'');
      if (!cfg.enabled || !/^https:\/\/[^/]+/i.test(url)) {
        status('尚未开通');
        return showGate('聊天界面已准备好，管理员尚未部署 Aurabot 服务端及安全中转接口。');
      }
      endpoint = url;
      status('连接中');
      if (token) await restore();
      else {status('需要激活');showGate('请输入分配给你的专属邀请码；每码只能激活一台设备。');}
    } catch (e) {status('配置异常');showGate('暂无法加载 AI 服务配置，请稍后重试。');}
  }
  init();
})();
