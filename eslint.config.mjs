import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default [
  // 忽略构建产物
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      'app/dist/**',
      'app/server/dist/**',
      'app/node_modules/**',
      'app/server/node_modules/**',
      'coverage/**',
      '*.config.js'
    ]
  },

  // 基础 JS 规则
  js.configs.recommended,

  // TypeScript 项目配置
  ...tseslint.configs.recommended,

  // 自定义规则
  {
    rules: {
      // TypeScript 规则
      '@typescript-eslint/no-unused-vars': ['warn', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_'
      }],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-non-null-assertion': 'warn',

      // 通用规则
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'no-debugger': 'error',
      'no-alert': 'warn',
      'no-var': 'error',
      'prefer-const': 'error',
      'prefer-arrow-callback': 'warn',

      // 代码质量
      'eqeqeq': ['error', 'always'],
      'curly': ['error', 'all'],
      'no-throw-literal': 'error',
      'prefer-promise-reject-errors': 'error'
    }
  },

  // 测试文件特殊规则
  {
    files: ['**/*.test.ts', '**/*.test.tsx', '**/*.spec.ts', '**/*.spec.tsx'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      'no-console': 'off'
    }
  }
];
