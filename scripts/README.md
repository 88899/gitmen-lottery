# 项目质量保证脚本

本目录包含项目质量检查和验证脚本。

## 📁 文件说明

### 文档
- **INTEGRATION_CHECKLIST.md** - 完整的质量保证检查清单（⭐ 核心文档）
  - 新增彩票类型集成指南
  - 业务逻辑一致性检查
  - 代码质量标准
  - 性能优化指南
  - 错误处理规范
  - 文档完整性要求
  - **项目清理和维护检查**（从会话历史提取）
  - **经验教训总结**（5个会话）
  - 检查清单维护流程

- **CHECKLIST_UPDATES.md** - 检查清单更新说明
  - 从 SESSION_HISTORY.md 提取的检查项
  - 新增检查类别说明
  - 使用方式和价值

### 脚本
- **quality_check.sh** - 全面质量检查脚本
- **integration_check.sh** - 集成完整性检查脚本

## 🚀 使用方法

### 1. 全面质量检查

在项目根目录运行：

```bash
bash scripts/quality_check.sh
```

**检查内容**:
- ✓ Python 语法检查
- ✓ 配置验证（SUPPORTED_LOTTERIES, LOTTERY_NAMES）
- ✓ 模块验证（所有彩票类型）
- ✓ 搜索可能的遗漏
- ✓ 文档完整性检查
- ✓ **项目清理检查**（过程文档、临时文件）
- ✓ **配置一致性检查**

**输出示例**:
```
🔍 开始质量检查...
📝 检查 Python 语法...
⚙️  验证配置...
✓ 支持的彩票类型: ['ssq', 'dlt', 'qxc', 'qlc']
📦 验证模块...
✓ ssq: 双色球
✓ dlt: 大乐透
✓ qxc: 七星彩
✓ qlc: 七乐彩
✅ 质量检查完成！
```

### 2. 集成完整性检查

检查特定彩票类型的集成：

```bash
bash scripts/integration_check.sh <lottery_type>
```

**示例**:
```bash
# 检查七乐彩集成
bash scripts/integration_check.sh qlc

# 检查双色球集成
bash scripts/integration_check.sh ssq
```

**检查内容**:
- ✓ Python 文件集成（7个文件）
- ✓ Worker 文件集成（3个文件）
- ✓ 模块文件完整性（4个文件）
- ✓ Worker 模块文件（2个文件）
- ✓ 功能测试

**输出示例**:
```
🔍 检查 qlc 的集成完整性...
📝 检查 Python 文件...
✓ core/config.py 包含 qlc
✓ cli/smart_fetch.py 包含 qlc
...
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
检查结果: ✓ 18 项通过, ✗ 0 项失败
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ qlc 集成完整！
```

## 📋 使用场景

### 新增彩票类型时

1. 实现核心功能
2. 运行集成检查：`bash scripts/integration_check.sh <type>`
3. 根据失败项逐一修复
4. 再次运行直到全部通过
5. 运行全面质量检查：`bash scripts/quality_check.sh`

### 修改核心逻辑时

1. 修改代码
2. 运行全面质量检查
3. 确保所有彩票类型仍然正常工作

### 定期维护

- **每周**: 运行 `quality_check.sh`
- **每次提交前**: 运行 `quality_check.sh`
- **每次发布前**: 运行完整测试套件

## 🎓 最佳实践

1. **主动检查**: 不要等用户提醒，主动运行检查脚本
2. **持续验证**: 每次修改后都要验证
3. **文档先行**: 先阅读 INTEGRATION_CHECKLIST.md，再开始实现
4. **经验沉淀**: 发现新问题时更新检查清单

## 📚 相关文档

- [INTEGRATION_CHECKLIST.md](./INTEGRATION_CHECKLIST.md) - 完整的检查清单和指南
- [../TECHNICAL_DOCUMENTATION.md](../TECHNICAL_DOCUMENTATION.md) - 技术文档
- [../SESSION_HISTORY.md](../SESSION_HISTORY.md) - 会话历史（不提交）

## 🔧 脚本维护

### 添加新的检查项

编辑对应的脚本文件，添加新的检查逻辑：

```bash
# quality_check.sh - 添加全局检查
# integration_check.sh - 添加集成检查
```

### 更新检查清单

发现新的检查点时，更新 `INTEGRATION_CHECKLIST.md`：

1. 添加到对应的检查部分
2. 更新经验教训
3. 提交更新

---

**创建时间**: 2025-11-20  
**最后更新**: 2025-11-20  
**维护者**: 项目团队
