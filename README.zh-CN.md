# Codex-HaloFlux

一款静音 Windows 动态壁纸，让本机 Codex 的工具和任务事件在 HALOFLUX 光环上产生视觉反馈。

> **社区项目 · 仅限非商业使用**  
> 基于 **HALOFLUX by Ryder191 (RYDER CODE / Ms MAIKEBAIs CAT)**。原版 Canvas 渲染、光环、分层光束、粒子、数据面板和运镜由 Ryder191 创作。Codex-HaloFlux 扩展的是本机 Codex 事件联动和 Windows 部署。项目独立维护，未获得 OpenAI 或原作者官方背书。 [原作 HALOFLUX](https://github.com/Ryder191/haloflux)

[English](README.md) · [演示素材](docs/media/README.md) · [安装教程](docs/INSTALL.md) · [卸载与恢复](docs/UNINSTALL.md) · [常见问题](docs/FAQ.md)

## 核心功能

- **真实事件反馈。** 提交任务可触发脉冲，观察到工具开始时可产生光束，收到 `Stop` 时产生扩散波。动画平滑过渡，原版数据面板继续作为视觉元素。
- **保留经典视觉。** 固定版本的桌面 Canvas 原稿完整保留。页面适配层接入事件反馈，保持静音并使用本地回退字体。
- **本机运行与数据最小化。** Node.js 桥接器只绑定 `127.0.0.1`。只转发事件类型、时间、用于关联的加密派生标识，以及存在时的模型请求结果类别。提示词、代码和工具输入输出不会发往桥接器。壁纸无需额外模型 API 或密钥。
- **独立运行。** 纯壁纸模式可脱离 Codex 使用。联动 Hooks 异步执行，Codex 超时为 1 秒。每次触发仍有启动进程的开销。桥接器离线时，事件会被丢弃。
- **可逆部署。** 经你批准后，安装器备份并合并用户级 Hook JSON。Codex 中另行审阅和信任。禁用和卸载只移除匹配的 HaloFlux 定义。

[验收证据](docs/FINAL_ACCEPTANCE.md) · [安全与隐私](SECURITY.md)

## 本项目新增了什么？

- Codex Hooks 接收、事件字段过滤、签名校验和本地 SSE 桥接。
- 多会话状态、工具事件去重和 30 秒统计窗口。任务活跃时，工具频率影响光环、粒子和光束。
- Canvas 反馈叠加层、静音纯壁纸入口、Lively WebView2 部署说明及 Windows 隔离回归。
- PowerShell 安装预览、明确批准、私有备份、禁用、卸载及回滚流程。

[查看各模块归属、上游改动和参考项目](CONTRIBUTIONS.md)

## 工作原理

Codex Hooks → 本机转发器 → 带签名的回环请求 → 活动状态 → SSE → Canvas。 [架构和扩展点](docs/ARCHITECTURE.md)

## Windows 安装

已验收 Windows 11，测试使用 Node.js 24 LTS。联动还需 PowerShell 7.4 或更新版，以及支持异步 Hooks 的原生 Codex 桌面端。要显示在桌面，请安装 Lively 并使用 WebView2。 [Node.js 下载](https://nodejs.org/en/download) · [PowerShell 安装](https://learn.microsoft.com/powershell/scripting/install/installing-powershell-on-windows) · [Lively 安装](https://github.com/lively-community/lively/wiki/Getting-Started)

1. 解压经审查的 Windows ZIP，在项目目录打开 PowerShell。想先体验**纯壁纸**，运行 `node .\server.mjs`，打开 `http://127.0.0.1:49371/wallpaper`。纯壁纸保留原版桌面视觉，通过本机服务播放，省去背景音乐和远程字体。
2. 想启用**真实联动**，在 PowerShell 7 运行 `.\Manage-Hooks.ps1 -Action Plan`，核对路径和 8 条规则。确认后运行 `.\Manage-Hooks.ps1 -Action Install -Approve`。安装器在普通用户权限下合并用户级 `hooks.json`，私下备份配置，并复制运行文件到当前用户的私有目录。
3. 在 Codex 桌面端 **设置 → Hooks** 审阅并信任这 8 条规则。运行 `.\Manage-Hooks.ps1 -Action Start` 并保持窗口开启。打开终端给出的地址，默认是 `http://127.0.0.1:49373/wallpaper`。在新的本机 Codex 聊天中执行只读任务，观察光束和扩散波，或用同地址下的 `/hook-status` 核对计数。
4. 在 Lively 的网页播放器设置中选 WebView2。选择 **添加壁纸**，将正在运行的壁纸地址作为网站添加并应用。浏览器预览可以关闭。
5. 停止桥接器用终端里的 **Ctrl+C**，停止桌面显示可在 Lively 切换壁纸。用 `.\Manage-Hooks.ps1 -Action Disable` 关闭联动。停止桥接器后用 `-Action Uninstall` 删除已验证的安装文件。回滚指南说明如何处理保留的备份，以及如何切回纯壁纸。

[详细安装](docs/INSTALL.md) · [完整卸载与异常恢复](docs/UNINSTALL.md) · [常见问题](docs/FAQ.md)

## 兼容性与已知限制

| 范围 | 验证情况 |
| --- | --- |
| Windows 11、Lively WebView2 | 实际桌面渲染和桥接重启后重连已通过。特定切换和退出场景覆盖有限。 |
| 原生 Codex 工具联动 | 隔离的原生 Codex 调用了本机只读 MCP 测试工具，模型响应来自本机测试器。已收到工具前后和任务结束事件。Chromium 验证了光束和扩散波绘制，另一次原生工具测试验证了 Lively 的候选流和桌面帧。 |
| 安装、回滚、多会话和掉线 | Windows 隔离配置通过安装和卸载。多会话去重、状态过期及重连通过受控测试。桥接器关闭后，原生 Codex 仍完成了测试工具任务。 |
| Windows 10 和其他 Codex 版本 | 超出已记录环境的兼容性未经验证。 |
| macOS 和 Linux | 超出 v1.0.0 的 Windows 安装与桌面支持范围。 |
| 模型隐藏推理、全局空闲和完整工具时间线 | 无法获取或可靠判断。画面基于收到的 Hooks 推导，部分事件可能不受支持、延迟或丢失。 |

[环境版本与完整验证表](docs/FINAL_ACCEPTANCE.md) · [已知限制](docs/KNOWN_LIMITATIONS.md)

## 安全、性能和二次开发

事件状态保存在桥接器内存中。同一台电脑的其他进程可以读取本机 SSE 和状态接口。若任务活动时间本身需要保密，可使用纯壁纸模式。在页面 `/` 可打开原版 Canvas 控制台。性能指南介绍分辨率、粒子、光晕和 4K 调校方法。 [安全说明](SECURITY.md) · [性能指南](docs/PERFORMANCE_TUNING.md)

欢迎提交 Issue、Bug Report 和 Pull Request。 [贡献说明](CONTRIBUTING.md) · [开发指南](docs/DEVELOPMENT.md) · [路线图](docs/ROADMAP.md)

## 许可证与致谢

使用、修改和再分发遵守[原始许可证](LICENSE)与[NOTICE](NOTICE)，包括 PolyForm Noncommercial License 1.0.0、原作署名和适用的平台转发条件。发布截图、视频或壁纸条目时，请在可见描述中写明原作者和原作来源。 [致谢](CREDITS.md) · [第三方声明](THIRD_PARTY_NOTICES.md)
