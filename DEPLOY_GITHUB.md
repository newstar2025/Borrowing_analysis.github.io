# 发布到 GitHub Pages（newstar2025）

## 你的访问地址

仓库名 **`Borrowing_analysis.github.io`** 属于**项目站点**，公网地址为：

**https://newstar2025.github.io/Borrowing_analysis.github.io/**

（注意路径里包含仓库名，这是 GitHub 规则，不是 Flask 问题。）

若希望更短地址，可改用：

| 仓库名 | 访问地址 |
|--------|----------|
| `Borrowing_analysis` | https://newstar2025.github.io/Borrowing_analysis/ |
| `newstar2025.github.io` | https://newstar2025.github.io/ （用户站点，需与用户名一致） |

---

## 一、在 GitHub 创建仓库

1. 登录 https://github.com/newstar2025
2. **New repository**
3. Repository name：`Borrowing_analysis.github.io`
4. 选 **Public**（公开 Pages 免费）或 **Private**（私有仓库需 GitHub Pro 才能私有 Pages）
5. 不要勾选 “Add a README” 若本地已有代码
6. 创建仓库

---

## 二、本地准备并推送

在 PowerShell 中执行（路径按你的实际目录）：

```powershell
cd d:\Z_ST\web2

# 若数据有更新，先重新导出
python d:\Z_ST\web2\export_slim.py

# 生成 Pages 站点目录（也可交给 GitHub Actions 自动构建）
python prepare_pages.py

git init
git add .
git commit -m "Initial publish: borrowing analytics web2"
git branch -M main
git remote add origin https://github.com/newstar2025/Borrowing_analysis.github.io.git
git push -u origin main
```

首次 push 若提示登录，用 GitHub **Personal Access Token** 作为密码，或配置 `gh auth login`。

---

## 三、开启 GitHub Pages

### 方式 A：GitHub Actions（已配置，推荐）

仓库已包含 `.github/workflows/pages.yml`，push 到 `main` 后会自动部署。

1. 仓库 → **Settings** → **Pages**
2. **Source** 选 **GitHub Actions**
3. 到 **Actions** 页查看 “Deploy GitHub Pages” 是否成功（约 1～3 分钟）
4. Pages 设置页会显示站点 URL

### 方式 B：从 docs 目录发布（不用 Actions）

1. 本地运行 `python prepare_pages.py`
2. Settings → Pages → Source：**Deploy from a branch**
3. Branch：`main`，文件夹 **`/docs`**
4. 每次更新后重新 `prepare_pages.py` 并 push

---

## 四、验证

浏览器打开：

https://newstar2025.github.io/Borrowing_analysis.github.io/

应能看到热力日历与各图表；若空白，按 F12 看 Console 是否 404（多为路径或数据未推送）。

本地仍可继续用 Flask：

```powershell
python d:\Z_ST\web2\server.py
```

访问 http://127.0.0.1:8060

---

## 五、更新数据后重新发布

```powershell
python d:\Z_ST\web2\export_slim.py
python d:\Z_ST\web2\prepare_pages.py   # 若用 docs 分支方式
git add data docs
git commit -m "Update borrowing data"
git push
```

使用 Actions 时只需 push `data/fact_slim.json`，工作流会重新生成 `docs` 并部署。

---

## 六、安全提示（公网必读）

- `data/fact_slim.json` 含读者编号、性别、年龄等，**公开仓库可被任何人下载**。
- 「阅读账单」可按读者编号查询个人借阅记录，公网风险较高。
- 建议：仓库设 Private、或脱敏后再公开、或仅内网/VPN 使用。

---

## 七、常见问题

| 问题 | 处理 |
|------|------|
| 404 / 图表不显示 | 确认 `fact_slim.json` 已 push；强制刷新 Ctrl+F5 |
| push 失败 大文件 | 单文件 &lt;100MB 一般可用；过大考虑 Git LFS |
| Actions 失败 | Actions 页看日志；确认 Settings → Pages 选 GitHub Actions |
| 想用自定义域名 | Pages 设置里填域名并按提示配置 DNS |
