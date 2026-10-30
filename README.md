# SVG Editor Lab1

使用 TypeScript、面向对象和 Command 模式实现命令行 SVG 编辑器。
需求来源：[实验任务书](phase_cli_1.md)。架构与开发记录：[doc/README.md](doc/README.md)。

## 当前进度

已完成第 2 阶段：六种图形领域模型与 Composite 行为。入口只输出阶段说明后退出，尚不接受编辑命令。
图形可通过类 API 创建、移动、缩放和设置属性；文档级 ID 管理、动态树编辑、编辑历史、REPL 和 SVG 读写仍将在后续阶段实现。

## 环境与命令

需要 Node.js 20 或更高版本，以及 npm。当前验证环境为 Node.js 20.17.0、npm 10.8.2。

```powershell
npm ci
npm run cli
npm run check
```

- `npm run cli`：编译并运行入口。
- `npm run typecheck`：严格类型检查，不输出文件。
- `npm run build`：编译到 `dist/`。
- `npm test`：先编译，再运行 Node.js 内置测试发现器；当前 24 项领域测试。
- `npm run check`：严格类型检查，然后执行编译与测试。

测试位于 `tests/shapes.test.mjs`，直接导入编译后的领域类，不依赖尚未实现的 CLI。
不提交 `node_modules/` 或 `dist/`；提交 `package-lock.json` 保证依赖可复现。

## 协作约定

每轮完成一个可验证阶段，报告改动与验证结果，再由用户手动提交。未经用户要求不代为 commit、push 或打标签。
不提前生成后续完整实现或大量空类；必要验证与架构记录随阶段更新。最终验收后再打 `final` 标签。
