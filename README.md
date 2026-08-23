# 图书借阅可视分析系统 · web2（独立新系统）

与 `d:\Z_ST\web` 互不影响。

## 启动

```bash
python d:\Z_ST\web2\export_slim.py   # 数据更新时再跑
python d:\Z_ST\web2\server.py
```

浏览器打开：**http://127.0.0.1:8060**

## 发布到 GitHub Pages

详见 **[DEPLOY_GITHUB.md](DEPLOY_GITHUB.md)**（账号 `newstar2025`，仓库 `Borrowing_analysis.github.io`）。

公网地址：**https://newstar2025.github.io/Borrowing_analysis.github.io/**

```bash
python prepare_pages.py   # 本地生成 docs/（Actions 部署时会自动执行）
```

## 交互

- 馆点：大类图例 → 二级全部馆名；「全部」恢复合计
- 热力日历：点击月 / 日下钻时段
- 时段：默认全年小时合计；点击某日显示当日分布
- 阅读账单：侧栏输入读者编号或点「随机」/ 借阅达人快捷入口
- 下方图表均随馆点 / 月 / 日选择联动
