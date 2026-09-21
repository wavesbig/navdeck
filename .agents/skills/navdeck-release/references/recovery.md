# 发版失败恢复手册

先判断脚本死在哪个阶段，再只补缺失的步骤：

```bash
git tag --list "vX.Y.Z"                  # 本地 tag 是否已建
git log --oneline -3                     # 版本提交（chore(release): bump version）是否已建
git ls-remote --tags origin refs/tags/vX.Y.Z   # 远端 tag 是否已推
docker buildx imagetools inspect ghcr.io/wavesbig/navdeck:X.Y.Z   # 镜像是否已推
```

## 版本提交已建，tag 未建

```bash
git tag -a vX.Y.Z -m "Release vX.Y.Z"
```

## tag 已建，镜像未推（最常见的网络故障点）

用配置了 docker.io 镜像源（docker.m.daocloud.io）的构建器手动补推：

```powershell
docker buildx build --builder multiarch-proxy --platform linux/amd64,linux/arm64 `
  -t ghcr.io/wavesbig/navdeck:X.Y.Z `
  -t ghcr.io/wavesbig/navdeck:latest `
  --push .
```

## 脚本被中止（进程已杀，未推送）

版本提交和本地 tag 可能已建、远端无任何变化。回滚后按正确档位重跑：

```bash
git tag -d vX.Y.Z                     # 删本地 tag
git reset --hard <发版前最后一个提交>  # 丢弃机器生成的版本提交（内容可由脚本重新生成）
```

若 CHANGELOG 段落版本号也要改，直接修正后 `git commit --amend` 并入日志提交。

## 镜像已推，Git 未推

```bash
git push origin main vX.Y.Z
```

## Git 已推，GitHub Release 未建（gh CLI 不在 PATH 时的兜底）

1. 从 `CHANGELOG.md` 提取 `## vX.Y.Z` 到下一个 `## ` 之间的段落作为 body
2. 取凭据：`"protocol=https`nhost=github.com`n`n" | git credential fill`，解析 `password=`
3. `POST https://api.github.com/repos/wavesbig/navdeck/releases`，payload `{tag_name, name, body}`；请求头 `X-GitHub-Api-Version: 2022-11-28`（写成其他值会 400）
4. 成功返回 HTTP 201 与 `html_url`

## 已知环境问题

- `auth.docker.io` 存在 DNS 污染：默认与旧 `multiarch` 构建器拉 `node:22-alpine` 元数据会超时；`multiarch-proxy` 构建器已配置 `docker.io` → `docker.m.daocloud.io` 镜像，用它
- PowerShell 不支持 `VAR=value cmd` 前缀语法，用 `$env:VAR = "value"` 后再调用
- 检测失败若返回 `dial tcp ... auth.docker.io` 超时，先等 30 秒重试一次，仍失败再走镜像源方案
