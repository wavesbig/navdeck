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
if [[ $release_mode =~ ^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$ ]]; then
  next_version=$release_mode
else
  IFS='.' read -r major minor patch <<<"$current_version"
  case "$release_mode" in
    patch) next_version="$major.$minor.$((patch + 1))" ;;
    minor) next_version="$major.$((minor + 1)).0" ;;
    major) next_version="$((major + 1)).0.0" ;;
    *) fail "无效版本参数：$release_mode" ;;
  esac
fi

tag="v$next_version"
image="ghcr.io/wavesbig/navdeck"
release_committed=0

cleanup() {
  # 版本文件在提交前由脚本统一生成；发布提交建立后不要动它
  if [[ $release_committed -eq 0 ]] && [[ -n $(git status --porcelain) ]]; then
    git restore -- package.json package-lock.json docker-compose.prod.yml CHANGELOG.md src/lib/changelog.generated.json
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

npx tsx scripts/generate-changelog.ts

# CHANGELOG.md 缺少当前版本段落时，从上个 tag 以来的提交自动生成
if ! grep -q "^## $tag" CHANGELOG.md; then
  prev_tag=$(git describe --tags --abbrev=0 --exclude="$tag" 2>/dev/null || echo "")
  range="${prev_tag:+$prev_tag..}HEAD"
  {
    echo "## $tag - $(date +%F)"
    echo ""
    echo "### 变更"
    echo ""
    git log $range --pretty=format:"- %s"
    echo ""
    echo ""
    cat CHANGELOG.md
  } > CHANGELOG.md.tmp && mv CHANGELOG.md.tmp CHANGELOG.md
  npx tsx scripts/generate-changelog.ts
fi

# 提取当前版本段落作为 GitHub Release 说明
release_notes=$(mktemp)
awk -v ver="$tag" '$0 == "## " ver || index($0, "## " ver " ") == 1 {flag=1; next} /^## / {flag=0} flag' CHANGELOG.md > "$release_notes"

printf '==> 发布 %s：质量检查\n' "$tag"
npm run check
npm run typecheck
npm test

printf '==> 发布 %s：生产构建\n' "$tag"
npm run build

printf '==> 发布 %s：提交版本\n' "$tag"
git add package.json package-lock.json docker-compose.prod.yml CHANGELOG.md src/lib/changelog.generated.json
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

printf '==> 发布 %s：GitHub Release\n' "$tag"
if command -v gh >/dev/null 2>&1 && gh auth status >/dev/null 2>&1; then
  gh release create "$tag" --title "$tag" --notes-file "$release_notes"
else
  echo "未检测到 gh CLI（或未登录），请手动创建 Release 并粘贴更新日志："
  echo "  https://github.com/wavesbig/navdeck/releases/new?tag=$tag"
  cat "$release_notes" | clip.exe 2>/dev/null && echo "（更新日志已复制到剪贴板）"
fi
rm -f "$release_notes"

printf '==> %s 发布完成\n' "$tag"
