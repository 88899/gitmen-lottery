#!/usr/bin/env python3
"""
从 SESSION_HISTORY.md 中提取检查点并更新 INTEGRATION_CHECKLIST.md

这个脚本会：
1. 读取 SESSION_HISTORY.md
2. 提取所有经验教训和检查点
3. 生成新的检查项
4. 输出建议添加到检查清单的内容
"""

import re
from pathlib import Path


def extract_lessons_from_history(history_file):
    """从会话历史中提取经验教训"""
    
    with open(history_file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    lessons = []
    
    # 提取所有会话的经验总结部分
    sessions = re.findall(r'## 会话 #(\d+): (.+?)\n.*?### 🎓 经验总结\n\n(.*?)(?=###|---|\Z)', content, re.DOTALL)
    
    for session_num, title, lesson_content in sessions:
        # 提取列表项
        items = re.findall(r'^\d+\.\s+\*\*(.+?)\*\*\n\s+- (.+?)(?=\n\d+\.|\n\n|\Z)', lesson_content, re.MULTILINE | re.DOTALL)
        
        for item_title, item_content in items:
            lessons.append({
                'session': session_num,
                'title': title,
                'lesson_title': item_title,
                'content': item_content.strip()
            })
    
    return lessons


def extract_problems_from_history(history_file):
    """从会话历史中提取发现的问题"""
    
    with open(history_file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    problems = []
    
    # 提取所有会话的问题部分
    sessions = re.findall(r'## 会话 #(\d+): (.+?)\n.*?### 🐛 发现和修复的问题\n\n(.*?)(?=###|---|\Z)', content, re.DOTALL)
    
    for session_num, title, problem_content in sessions:
        # 提取问题项
        items = re.findall(r'^\d+\.\s+\*\*(.+?)\*\*\n\s+- 问题: (.+?)\n\s+- 修复: (.+?)(?=\n\d+\.|\n\n|\Z)', problem_content, re.MULTILINE | re.DOTALL)
        
        for item_title, problem, fix in items:
            problems.append({
                'session': session_num,
                'title': title,
                'item_title': item_title,
                'problem': problem.strip(),
                'fix': fix.strip()
            })
    
    return problems


def generate_checklist_items(lessons, problems):
    """生成检查清单项"""
    
    checklist = []
    
    # 从经验教训生成检查项
    checklist.append("## 📋 从会话历史提取的检查项\n")
    checklist.append("> 这些检查项来自实际项目经验和教训\n\n")
    
    # 按会话分组
    sessions = {}
    for lesson in lessons:
        session_key = f"会话 #{lesson['session']}: {lesson['title']}\"
        if session_key not in sessions:
            sessions[session_key] = {'lessons': [], 'problems': []}\n        sessions[session_key]['lessons'].append(lesson)
    
    for problem in problems:
        session_key = f"会话 #{problem['session']}: {problem['title']}"
        if session_key not in sessions:
            sessions[session_key] = {'lessons': [], 'problems': []}
        sessions[session_key]['problems'].append(problem)
    
    # 生成检查项
    for session_key, data in sorted(sessions.items()):
        checklist.append(f"### {session_key}\n\n")
        
        if data['lessons']:
            checklist.append("**经验教训检查项**:\n\n")
            for lesson in data['lessons']:
                checklist.append(f"- [ ] **{lesson['lesson_title']}**\n")
                # 将内容转换为检查项
                points = lesson['content'].split('\n')
                for point in points:
                    point = point.strip()
                    if point and point.startswith('-'):
                        checklist.append(f"  {point}\n")
                checklist.append("\n")
        
        if data['problems']:
            checklist.append("**问题预防检查项**:\n\n")
            for problem in data['problems']:
                checklist.append(f"- [ ] **避免 {problem['item_title']}**\n")
                checklist.append(f"  - 检查: {problem['problem']}\n")
                checklist.append(f"  - 确保: {problem['fix']}\n\n")
    
    return ''.join(checklist)


def main():
    """主函数"""
    
    # 文件路径
    history_file = Path(__file__).parent.parent / 'SESSION_HISTORY.md'
    output_file = Path(__file__).parent / 'CHECKLIST_FROM_HISTORY.md'
    
    print("🔍 从会话历史中提取检查点...")
    
    # 提取经验教训
    lessons = extract_lessons_from_history(history_file)
    print(f"✓ 提取了 {len(lessons)} 条经验教训")
    
    # 提取问题
    problems = extract_problems_from_history(history_file)
    print(f"✓ 提取了 {len(problems)} 个问题")
    
    # 生成检查清单
    checklist_content = generate_checklist_items(lessons, problems)
    
    # 写入文件
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write("# 从会话历史提取的检查清单\n\n")
        f.write("> 自动从 SESSION_HISTORY.md 提取\n\n")
        f.write(checklist_content)
    
    print(f"✅ 检查清单已生成: {output_file}")
    print("\n建议:")
    print("1. 查看生成的 CHECKLIST_FROM_HISTORY.md")
    print("2. 将相关检查项合并到 INTEGRATION_CHECKLIST.md")
    print("3. 更新 quality_check.sh 和 integration_check.sh 脚本")


if __name__ == '__main__':
    main()
