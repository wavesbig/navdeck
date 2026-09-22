---
name: navdeck-release
description: 发布 NavDeck 新版本：升版本号、更新日志、质量检查、生产构建、多架构 Docker 镜像推 GHCR、推 Git 并创建 GitHub Release。用户要求「发版 / 发布新版本 / 构建包推送」时使用；普通 git commit 不适用。
---

# NavDeck 发版

发布逻辑的唯一事实源是仓库根目录的 `scripts/release.sh`，本技能只负责在这台机器上正确调用它并处理已知故障，不要重写脚本逻辑。

## 版本类型判定（先定类型再发版）

按自上个 tag 以来的提交内容推导，判定标准：

| 类型 | 标准 | 示例 |
|---|---|---|
| major | 破坏性变更：部署方式 / 配置文件 / 数据结构不兼容，用户需手动迁移 | 删除配置项、更换数据库、必需的新环境变量 |
| minor | 新增**用户可见能力**：新 widget、新设置页 / 设置项、新集成、新页面 | 新增 qBittorrent widget、新增壁纸功能 |
| patch | 仅修复、内部重构、文档、技能 / 工具链等对用户能力无增减的变更 | bug 修复、样式对齐、react-doctor 清理、agent 技能 |

规则补充：

- **内部 / 元功能**（发版工具、版本检测器、agent 技能等）即使是「新增」，默认按 patch 处理，并向用户说明理由
- 混合多种类型时按最高档取；拿不准时给出推荐档位和理由，**先问用户再执行**
- 实例（2026-09-21）：「版本检测提醒」曾被误判为 minor (0.7.0) 发到一半被中止，
  用户判定为 patch (0.6.1)——元功能新增 ≠ minor

## 更新日志撰写标准

CHANGELOG 面向用户，不面向开发者，撰写时：

- 一条变更一句话，不加分号长句、不换行续写、不解释实现原理
- 只写用户可感知的变化（新功能 / 修复 / 体验变更）；内部重构、工具链、
  agent 技能、依赖维护一律不写
- 措辞与既有条目一致：动宾短句（如「修复放大字号下小尺寸 widget 顶部
  内边距不一致的问题」），避免「毛玻璃」「点阵」等实现词汇

## 发布前置

1. 版本类型按上节判定后向用户复述确认；CHANGELOG 是否已含目标版本段落——脚本只在缺失时从提交标题自动生成原始列表，正式发版应先写好人工润色的更新日志并提交。
2. 环境检查：
   - 当前在 main 分支、工作区干净（脚本会强制校验，脏工作区先让用户确认提交）
   - Docker 引擎在线：`docker info` 失败则先启动 Docker Desktop（`Start-Process "C:\Program Files\Docker\Docker\Docker Desktop.exe" -WindowStyle Hidden`），轮询 `docker info` 直到就绪（可能需 1-2 分钟）
3. 存量数据兼容检查（涉及数据库迁移 / 新增持久化字段的版本必查）：
   - 确认迁移会应用到存量数据卷（entrypoint 自动 migrate deploy，无需手工）
   - 新字段必须可空或有默认值——存量行不迁移内容、不做手工处理
   - 读路径（渲染）与写路径（保存）都必须兼容 NULL/缺省：写路径禁止跳过缺省实例
   - 发版前用「迁移后未回填的存量形态」实测一遍完整保存流程（本地把坐标置 NULL 后走一次拖拽 + 刷新）
4. 用以下方式调用（三个易错点：`bash` 默认解析到 WSL 没有 node，必须用 Git Bash 完整路径；`BUILDX_BUILDER` 必须指向配置了 docker.io 镜像源的构建器，默认构建器会因 auth.docker.io DNS 污染超时；PowerShell 里环境变量用 `$env:` 赋值而非 bash 前缀语法）：

   ```powershell
   $env:BUILDX_BUILDER = "multiarch-proxy"
   & "C:\Program Files\Git\bin\bash.exe" scripts/release.sh minor
   ```

5. 脚本内部流程：升版本 → 生成 changelog JSON → biome / typecheck / test → next build → 提交 + tag → buildx 双架构（amd64 + arm64/QEMU）推送 GHCR → 推 Git → 创建 GitHub Release。全程约 10-20 分钟，保持会话轮询不要中断。

## 发布失败恢复

脚本可能在中途失败（最常见：Docker 拉基础镜像时网络抖动）。失败后**不要直接重跑脚本**——版本提交和 tag 可能已创建，重跑会报「tag 已存在」。按已完成阶段手动补齐，步骤见 [references/recovery.md](references/recovery.md)。

## 发布后验证

- `docker buildx imagetools inspect ghcr.io/wavesbig/navdeck:<tag>` 确认 linux/amd64 + linux/arm64 双架构
- GitHub Release 内容与 CHANGELOG 对应段落一致
- `git status` 工作区干净、本地与远端同步
