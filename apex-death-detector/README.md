# Apex Death Detector

Apex Legends 死亡检测 & 抖音自动启动工具

## 功能

在玩 Apex Legends 时自动检测玩家状态，并根据状态执行窗口切换操作：

- **被击倒** (knocked_out)：不做任何操作 — 玩家仍可爬行、架盾、标点
- **死亡成盒**：自动切换到抖音
- **原地救援复活** (healed_from_ko)：自动切回 Apex
- **信标/移动重生信标复活** (respawn)：自动切回 Apex
- **全队淘汰** (team_state = eliminated)：智能收尾
- **新对局开始** (match_start)：重置所有状态

## 安装

1. 下载并解压到 Overwolf 应用目录
2. 在 Overwolf Studio 中导入项目
3. 编译并运行

## 配置

在设置界面中配置抖音的安装路径，点击"浏览"按钮选择 `douyin.exe` 文件。

## 项目结构

```
apex-death-detector/
├── manifest.json          # Overwolf 应用配置
├── background.html        # 后台控制器 HTML
├── background.js          # 核心逻辑：事件监听 + 状态管理
├── index.html             # 设置界面
├── index.js               # 设置界面逻辑
├── index.css              # 设置界面样式
├── helpers/
│   ├── launch-douyin.bat  # 启动抖音
│   └── focus-apex.bat     # 切换回 Apex 窗口
└── assets/
    └── icon.png           # 应用图标
```

## 技术细节

- 游戏事件 API：Overwolf games.events
- Apex Legends 游戏 ID：21566
- 订阅功能：death、revive、team、match_state、me、game_info
- 状态管理：WAITING → PLAYING → DEAD → IN_DOUYIN / TEAM_ELIMINATED

## 状态机

```
WAITING ──(match_start)──> PLAYING
                            │
                            ├──(death)──> DEAD ──> IN_DOUYIN
                            │                    │
                            │<──(healed_from_ko/respawn)──+
                            │
                            └──(team_state=eliminated)──> TEAM_ELIMINATED
                                                              │
                              (match_start) ──────────────────┘
```

## 注意事项

- 被击倒不等于死亡，不会触发任何操作
- 只有 `teammate_X.state = "death"` 才会触发抖音切换
- 全队淘汰后进入终态，不再响应任何事件
- 全队淘汰时的智能收尾会检查当前窗口，在抖音则切回游戏看结算，在游戏则不操作

## 免责声明

本工具仅供学习交流使用，Apex Legends 版权归 Electronic Arts 所有。