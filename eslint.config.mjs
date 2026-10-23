import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  {
    ignores: [".next/**", "node_modules/**", "coverage/**", "*.log", "uploads/**"],
  },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      // TypeScript 相关规则
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/no-non-null-assertion": "off",
      "@typescript-eslint/ban-ts-comment": "off",
      "@typescript-eslint/prefer-as-const": "off",
      "@typescript-eslint/no-require-imports": "off",
      
      // React 相关规则
      "react-hooks/exhaustive-deps": "off",
      "react/no-unescaped-entities": "off",
      "react/display-name": "off",
      "react/prop-types": "off",
      
      // Next.js 相关规则
      "@next/next/no-img-element": "off",
      "@next/next/no-html-link-for-pages": "off",
      
      // 一般JavaScript规则
      "prefer-const": "off",  // 关闭prefer-const规则
      "no-unused-vars": "off",
      "no-console": "off",
      "no-debugger": "off",
      "no-empty": "off",
      "no-irregular-whitespace": "off",
      "no-case-declarations": "off",
      "no-fallthrough": "off",
      "no-mixed-spaces-and-tabs": "off",
      "no-redeclare": "off",
      "no-undef": "off",
      "no-unreachable": "off",
      "no-useless-escape": "off",
      "@next/next/no-css-in-js": "off", // Allow inline styles for dynamic calculations
      "react/style-prop-object": "off", // Allow inline styles
    },
  },
];

export default eslintConfig;
