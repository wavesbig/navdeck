---
name: navdeck-release
description: 发布 NavDeck 新版本：升版本号、更新日志、质量检查、生产构建、多架构 Docker 镜像推 GHCR、推 Git 并创建 GitHub Release。用户要求「发版 / 发布新版本 / 构建包推送」时使用；普通 git commit 不适用。
---

# NavDeck 发版

发布逻辑的唯一事实源是仓库根目录的 `scripts/release.sh`，本技能只负责在这台机器上正确调用它并处理已知故障，不要重写脚本逻辑。

## 发布前置

1. 与用户确认两件事：版本升级类型（patch / minor / major）；CHANGELOG 是否已含目标版本段落——脚本只在缺失时从提交标题自动生成原始列表，正式发版应先写好人工润色的更新日志并提交。
2. 环境检查：
   - 当前在 main 分支、工作区干净（脚本会强制校验，脏工作区先让用户确认提交）
   - Docker 引擎在线：`docker info` 失败则先启动 Docker Desktop（`Start-Process "C:\Program Files\Docker\Docker\Docker Desktop.exe" -WindowStyle Hidden`），轮询 `docker info` 直到就绪（可能需 1-2 分钟）
3. 用以下方式调用（三个易错点：`bash` 默认解析到 WSL 没有 node，必须用 Git Bash 完整路径；`BUILDX_BUILDER` 必须指向配置了 docker.io 镜像源的构建器，默认构建器会因 auth.docker.io DNS 污染超时；PowerShell 里环境变量用 `$env:` 赋值而非 bash 前缀语法）：

   ```powershell
   $env:BUILDX_BUILDER = "multiarch-proxy"
   & "C:\Program Files\Git\bin\bash.exe" scripts/release.sh minor
   ```

4. 脚本内部流程：升版本 → 生成 changelog JSON → biome / typecheck / test → next build → 提交 + tag → buildx 双架构（amd64 + arm64/QEMU）推送 GHCR → 推 Git → 创建 GitHub Release。全程约 10-20 分钟，保持会话轮询不要中断。

## 发布失败恢复

脚本可能在中途失败（最常见：Docker 拉基础镜像时网络抖动）。失败后**不要直接重跑脚本**——版本提交和 tag 可能已创建，重跑会报「tag 已存在」。按已完成阶段手动补齐，步骤见 [references/recovery.md](references/recovery.md)。

## 发布后验证

- `docker buildx imagetools inspect ghcr.io/wavesbig/navdeck:<tag>` 确认 linux/amd64 + linux/arm64 双架构
- GitHub Release 内容与 CHANGELOG 对应段落一致
- `git status` 工作区干净、本地与远端同步
