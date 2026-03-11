# 部署指南：让全球团队访问简报网页

本指南介绍通过 **GitHub Pages** 和 **Cloudflare Pages** 部署静态简报的两种方式，任选其一即可。两者都免费、带全球 CDN，适合团队访问。

---

## 方案对比（简要）

| 特性           | GitHub Pages      | Cloudflare Pages     |
|----------------|-------------------|----------------------|
| 全球访问速度   | 好                | 更好（边缘节点多）   |
| 自定义域名     | 支持              | 支持                 |
| 自动部署       | 推代码即更新      | 连 GitHub 后同左     |
| 免费额度       | 公开仓库无限      | 无限请求/带宽        |
| 推荐场景       | 已有 GitHub、求简 | 强调全球速度与稳定   |

**建议**：若团队分布多地，优先用 **Cloudflare Pages**；若已习惯 GitHub，用 **GitHub Pages** 即可。

---

## 一、通过 GitHub Pages 部署（推荐入门）

### 1. 把代码推到 GitHub

若尚未添加远程仓库：

```bash
cd /Users/xukaikai/Desktop/简报
git remote add origin https://github.com/你的用户名/jianbao.git
git push -u origin main
```

（若已按 README 做过，可跳过。）

### 2. 启用 GitHub Pages

- 打开仓库：`https://github.com/你的用户名/jianbao`
- **Settings** → 左侧 **Pages**
- **Source** 选 **Deploy from a branch**
- **Branch** 选 `main`，文件夹选 **/ (root)**，保存

几分钟后，页面会出现在：

- **https://你的用户名.github.io/jianbao/cross_border_investment_daily_full_20260310.html**

（若希望根路径就是简报，见下文「可选：用 index.html 做首页」。）

### 3. 分享给团队

把上面的链接发给同事即可，全球可访问。

---

## 二、通过 Cloudflare Pages 部署（推荐全球团队）

### 方式 A：用 GitHub 连接（推荐，推代码即自动部署）

1. **代码已在 GitHub**  
   确保本仓库已 `git push` 到 GitHub（同上）。

2. **登录 Cloudflare**  
   打开 [dash.cloudflare.com](https://dash.cloudflare.com)，用邮箱注册/登录。

3. **创建 Pages 项目**  
   - **Workers & Pages** → **Create** → **Pages** → **Connect to Git**
   - 选 **GitHub**，授权后选择仓库 `jianbao`
   - **Project name**：如 `jianbao`（会得到 `jianbao.pages.dev`）
   - **Production branch**：`main`
   - **Build settings**（静态 HTML，无需构建）：
     - **Framework preset**：`None`
     - **Build command**：留空
     - **Build output directory**：`/`（根目录）
     - 若 **Deploy command** 为必填，填：`npx wrangler pages deploy .`（并确保仓库根目录有 `wrangler.toml`，且其中的 `name` 与你在 Cloudflare 里创建的项目名一致）

4. **保存并部署**  
   第一次会立即构建，约 1–2 分钟。完成后会得到：

   - **https://jianbao.pages.dev/cross_border_investment_daily_full_20260310.html**

5. **之后更新**  
   本地改完执行 `git push origin main`，Cloudflare 会自动重新部署。

### 方式 B：直接上传（不依赖 Git）

1. 打开 [dash.cloudflare.com](https://dash.cloudflare.com) → **Workers & Pages** → **Create** → **Pages** → **Upload assets**
2. 把整个「简报」文件夹拖进去（或打包成 zip 上传），需包含 `cross_border_investment_daily_full_20260310.html`
3. 部署完成后，访问同上形式的 URL。

---

## 可选：用 index.html 做首页（更短的网址）

若希望打开 **https://你的用户名.github.io/jianbao/** 或 **https://jianbao.pages.dev/** 就直接看到简报，可以加一个入口：

1. 复制现有 HTML 为 `index.html`，或让 `index.html` 重定向到当前文件名。
2. 简单做法：复制一份并重命名：

```bash
cd /Users/xukaikai/Desktop/简报
cp cross_border_investment_daily_full_20260310.html index.html
git add index.html
git commit -m "Add index.html for root URL"
git push origin main
```

3. 部署后：
   - GitHub Pages：**https://你的用户名.github.io/jianbao/**
   - Cloudflare：**https://jianbao.pages.dev/**

---

## 最佳实践小结

1. **代码托管**：用 GitHub 存代码，便于协作和回滚。
2. **部署选择**：全球团队优先 **Cloudflare Pages**（连 GitHub 自动部署）；图简单用 **GitHub Pages**。
3. **访问链接**：发团队时用「根路径」链接（如上），或带 `index.html` 的链接，避免长文件名。
4. **更新流程**：改完 HTML → `git add` → `git commit` → `git push`，等待 1–2 分钟即可生效。
5. **自定义域名**（可选）：在 Pages 设置里绑定自己的域名，Cloudflare/ GitHub 都有说明，按提示解析即可。

---

## 常见问题

- **报错 "Could not detect a directory containing static files" / "Executing user deploy command: npx wrangler deploy"**  
  说明项目里用了 **Build command**（例如 `npx wrangler deploy`）。静态 HTML 不需要构建命令。  
  **处理**：进入 Cloudflare 控制台 → 你的 Pages 项目 → **Settings** → **Builds & deployments** → **Build configurations** → 把 **Build command** 清空（留空），**Build output directory** 设为 `/`，保存后重新部署（**Retry deployment** 或推一次新 commit）。

- **Deploy command 显示 required（必填）**  
  若界面要求必须填写 Deploy command，请填：**`npx wrangler pages deploy .`**（注意是 `pages deploy`，不是 `wrangler deploy`）。  
  并确保仓库根目录有 **`wrangler.toml`**，且其中的 `name = "jianbao"` 与你在 Cloudflare 里创建的 Pages 项目名一致（若项目名不同，改 wrangler.toml 里的 `name`）。保存后重新部署。**Non-production branch deploy command** 可留空或同样填 `npx wrangler pages deploy .`。

- **页面打开是 404**：检查分支是否为 `main`、构建输出目录是否为根目录，并等 2–3 分钟再试。
- **样式/字体不对**：当前 HTML 使用 Google Fonts（外网），国内可能较慢；若需国内加速，可考虑把字体改为系统字体或自托管字体。
- **想用自定义域名**：GitHub Pages 在仓库 Settings → Pages 里填域名；Cloudflare Pages 在项目 **Custom domains** 里添加并按提示做 CNAME/ A 解析。

按上述任选一种方式部署后，把最终链接发给团队即可全球访问。
