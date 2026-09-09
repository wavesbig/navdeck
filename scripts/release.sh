#!/usr/bin/env bash
set -Eeuo pipefail

usage() {
  cat <<'EOF'
用法：
  scripts/release.sh patch
  scripts/release.sh minor
  scripts/release.sh major
  scripts/release.sh 1.2.3

流程：校验工作区 -> 升版本 -> 质量检查 -> 生产构建 -> 提交/tag -> 构建并推送 GHCR -> 推送 Git。
EOF
}

fail() {
  echo "release: $*" >&2
  exit 1
}

[[ $# -eq 1 ]] || { usage; exit 1; }

release_mode=$1
repo_root=$(git rev-parse --show-toplevel)
cd "$repo_root"

[[ $(git branch --show-current) == "main" ]] || fail "必须在 main 分支执行"
[[ -z $(git status --porcelain) ]] || fail "工作区有未提交改动，请先提交或清理"

current_version=$(node -p "require('./package.json').version")
next_version=$(node -e '
  const [current, mode] = process.argv.slice(1);
  const versionPattern = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;
  if (!versionPattern.test(current)) throw new Error(`当前版本无效：${current}`);
  if (versionPattern.test(mode)) {
    console.log(mode);
    process.exit(0);
  }
  const [major, minor, patch] = current.split(".").map(Number);
  if (mode === "patch") console.log(`${major}.${minor}.${patch + 1}`);
  else if (mode === "minor") console.log(`${major}.${minor + 1}.0`);
  else if (mode === "major") console.log(`${major + 1}.0.0`);
  else throw new Error(`无效版本参数：${mode}`);
' "$current_version" "$release_mode")

tag="v$next_version"
image="ghcr.io/wavesbig/navdeck"
release_committed=0

cleanup() {
  # 版本文件在提交前由脚本统一生成；发布提交建立后不要动它
  if [[ $release_committed -eq 0 ]] && [[ -n $(git status --porcelain) ]]; then
    git restore -- package.json package-lock.json docker-compose.prod.yml
  fi
}
trap cleanup EXIT

[[ $next_version != "$current_version" ]] || fail "新版本不能等于当前版本 $current_version"

git fetch origin main --tags
git merge-base --is-ancestor origin/main HEAD || fail "本地 main 已和远端分叉，请先同步"

if git rev-parse -q --verify "refs/tags/$tag" >/dev/null; then
  fail "本地 tag 已存在：$tag"
fi
if git ls-remote --exit-code --tags origin "refs/tags/$tag" >/dev/null 2>&1; then
  fail "远端 tag 已存在：$tag"
fi

npm version "$next_version" --no-git-tag-version

node - "$next_version" <<'NODE'
const fs = require('node:fs');
const file = 'docker-compose.prod.yml';
const content = fs.readFileSync(file, 'utf8');
if (!content.includes('image: ghcr.io/wavesbig/navdeck:latest')) {
  throw new Error('未找到生产 compose 镜像行');
}
if (!/如 :[^）]+）/.test(content)) {
  throw new Error('未找到生产 compose 版本示例');
}
fs.writeFileSync(file, content.replace(/如 :[^）]+）/, `如 :${process.argv[2]}）`));
NODE

printf '==> 发布 %s：质量检查\n' "$tag"
npm run check
npm run typecheck
npm test

printf '==> 发布 %s：生产构建\n' "$tag"
npm run build

printf '==> 发布 %s：提交版本\n' "$tag"
git add package.json package-lock.json docker-compose.prod.yml
git commit -m "chore(release): bump version to $next_version"
release_committed=1
git tag -a "$tag" -m "Release $tag"

printf '==> 发布 %s：Docker 构建\n' "$tag"
docker info >/dev/null
docker buildx build --load \
  -t "$image:$next_version" \
  -t "$image:latest" \
  .

printf '==> 发布 %s：推送镜像\n' "$tag"
docker push "$image:$next_version"
docker push "$image:latest"

printf '==> 发布 %s：推送 Git\n' "$tag"
git push origin main "$tag"

printf '==> %s 发布完成\n' "$tag"
