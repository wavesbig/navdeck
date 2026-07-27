/**
 * Commitlint 配置
 *
 * 项目提交规范（来自 project_memory.md）：
 *   <type>(<scope>): <简短描述>
 *
 *   <body 详细说明>
 *
 *   里程碑: Mx.x
 *
 * type 允许：feat / fix / docs / style / refactor / chore / test / perf
 * scope 可选，body 可选，footer 可选
 *
 * 默认 commitlint 类型为英文小写，符合 Conventional Commits 规范。
 * 中文描述在 subject 中，type 保持英文即可（GitHub / GitLab 等工具基于英文 type 解析）。
 */
export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    // type 限定（与 project_memory.md 对齐）
    'type-enum': [
      2,
      'always',
      [
        'feat',
        'fix',
        'docs',
        'style',
        'refactor',
        'chore',
        'test',
        'perf',
        'build',
        'ci',
        'revert',
      ],
    ],
    // subject 不限制语言，但禁止末尾句号
    'subject-full-stop': [2, 'never', '.'],
    // header 长度限制
    'header-max-length': [2, 'always', 100],
    'body-max-line-length': [0],
    'footer-max-line-length': [0],
  },
};
