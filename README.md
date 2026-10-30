# SVG Editor Lab1

使用 TypeScript、面向对象和 Command 模式实现命令行 SVG 编辑器。
需求来源：[实验任务书](phase_cli_1.md)。架构与开发记录：[doc/README.md](doc/README.md)。

## 当前进度

已完成第 1 阶段：工程骨架与架构初稿。入口只输出阶段说明后退出，尚不接受编辑命令。
图形、编辑历史、REPL 和 SVG 读写均将在后续阶段实现；当前不是完整可用的编辑器。

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
- `npm test`：运行 Node.js 内置测试发现器。第 1 阶段尚无业务测试，显示 0 项测试是预期情况，不代表功能已通过验收。
- `npm run check`：依次执行类型检查、测试发现和编译。

后续测试使用 `tests/**/*.test.mjs`，必要时导入编译后的模块；引入此类测试时须先将 `test` 脚本调整为编译后测试。
不提交 `node_modules/` 或 `dist/`；提交 `package-lock.json` 保证依赖可复现。

## 协作约定

每轮完成一个可验证阶段，报告改动与验证结果，再由用户手动提交。未经用户要求不代为 commit、push 或打标签。
不提前生成后续完整实现或大量空类；必要验证与架构记录随阶段更新。最终验收后再打 `final` 标签。
