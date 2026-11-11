# PaySprout · 牛马吃草 🌱

**Watch your earnings grow, one second at a time.**

一个运行在 Windows 桌面上的上班鼓励小工具。在屏幕右下角，实时看看今天工作了多久、已经赚了多少钱，让每一份努力都有一点看得见的回报。

无需注册账号，无需连接服务，工资和设置只保存在你的电脑上。当前界面语言为简体中文。

![PaySprout 主界面，使用默认示例工资展示今日收入与工作进度](docs/images/overview.png)

## 它能做什么？

- **实时收入**：按月工资、当月工作日和每日工时，自动计算时薪、今日已赚和目标进度。
- **桌面悬浮窗**：默认出现在屏幕右下角，可拖动、记住位置，也可始终置顶。
- **自定义作息**：支持单休、双休、固定月休天数、上班时间和不计薪午休。
- **灵活安排今天**：临时上班或休息可手动切换，也可提前下班打卡。
- **托盘陪伴**：关闭主窗口后仍可继续显示收入；便携版支持开机自动启动。
- **发薪倒计时**：设置每月发薪日，给下一次到账留一点期待。

桌面悬浮窗：

![显示今日收入、工作时长与进度的桌面悬浮窗](docs/images/widget.png)

## 下载后直接使用

适合只想使用应用、不准备修改代码的朋友。需要 **Windows 10 / 11，x64（64 位）**。

1. 打开本仓库的 [Releases 页面](https://github.com/EighteenGood/PaySprout/releases)。
2. 如果已有版本发布，在该版本的 **Assets** 中下载 `NiumaGrass-<版本号>-portable.exe`。
3. 将文件放到一个准备长期保留的文件夹，双击运行，无需安装 Node.js、Python 或其他开发工具。
4. 打开左侧「薪资与偏好」，填写自己的工资和作息，点击「保存设置」。

**如果 Releases 暂时没有发布包，请按下面的源码运行步骤启动。** GitHub 的「Download ZIP」下载的是源码，不包含可直接运行的 EXE。

应用目前没有代码签名证书，Windows 可能显示未知发布者提示。下载时请核对仓库和发布来源。

## 克隆源码后如何运行？

### 1. 准备环境

- Windows 10 / 11 x64。当前仅提供 Windows 版本，尚未验证 macOS 和 Linux。
- [Node.js](https://nodejs.org/)：推荐 **22 或更高的 LTS 版本**，安装时包含 npm。
- [Git](https://git-scm.com/downloads)：使用 `git clone` 时需要；也可以选择 GitHub 的 **Code → Download ZIP** 并解压。

在 PowerShell 中检查工具是否安装成功：

```powershell
node --version
npm --version
git --version
```

### 2. 获取项目

在 PowerShell 中执行以下命令，下载源码并进入项目目录：

```powershell
git clone https://github.com/EighteenGood/PaySprout.git
cd PaySprout
```

如果使用 ZIP 下载，解压后在包含 `package.json` 的文件夹中打开 PowerShell，即可继续下一步。

### 3. 安装依赖并启动

```powershell
npm ci
npm start
```

第一次安装需要联网下载 Electron 等开发依赖，可能耗时几分钟。应用启动后的日常运行不需要联网。源码运行不需要配置 `.env`、API Key、数据库或后端服务，也不需要 Python。

启动后会出现主窗口和右下角悬浮窗。修改 HTML、CSS 或 JavaScript 后，退出应用并重新执行 `npm start` 查看效果，目前没有自动热更新。

## 第一次使用怎么设置？

应用首次启动使用以下**示例设置**，请先改成自己的实际情况：

- 月工资：10,000 元。
- 每天工作：8 小时，周六、周日双休。
- 上班时间：09:00。
- 午休：12:00 开始，60 分钟，不计入工作时长。
- 发薪日：每月 10 日。

在这个示例中，预计下班时间为 18:00。保存后，主界面和悬浮窗会立即按新设置重新计算今天的收入。

日常操作：

- **移动悬浮窗**：按住悬浮窗顶部拖动；点右上角箭头返回主界面。
- **找回悬浮窗**：从主界面显示，或右键系统托盘图标，勾选「显示收入悬浮窗」。位置异常时，在设置中点击「将悬浮窗移回屏幕右下角」。
- **今天临时休息／上班**：在首页点击「今天改为休息／今天需要上班」。只影响今天，次日恢复默认排班。
- **提前下班**：点击「下班打卡」固定今天已经赚到的金额。点击「继续工作」会恢复按全天排班累计估算，打卡到恢复之间的时间也会补算；它不适合作为临时离岗的暂停按钮。
- **退出程序**：关闭主窗口只会收起到系统托盘。要彻底退出，请右键托盘图标选择「退出牛马吃草」，或在「关于这片草地」中退出。
- **开机启动**：仅打包后的便携版支持。在设置中开启后，请保留 EXE 的位置；如果移动文件，需关闭并重新开启此选项。

## 收入是怎么算的？

```text
时薪 = 月工资 ÷ 当月工作日 ÷ 每日工作小时
当日已赚 = 当日有效工作秒数 ÷ 3600 × 时薪
每日收入上限 = 月工资 ÷ 当月工作日
```

例如，某月有 21 个工作日，月工资为 10,000 元，每天工作 8 小时，时薪约为 59.52 元。当天有效工作 3 小时，显示已赚约 178.57 元。计算过程保留精度，金额显示时保留两位小数。

当月工作日的计算方式：

- **双休**：按当月实际日历，排除周六和周日。
- **单休**：按当月实际日历，排除周日。
- **固定月休**：当月自然天数减去设置的休息天数。此模式只决定时薪的计算基数，不指定具体休息日期；默认每天上班，休息当天需在首页手动切换。

当天手动切换工作／休息，不会改变当月工作日的计算基数。

工作时长按**本机时钟和设定的排班**估算，不是从打开应用时开始的秒表，也不会监测键盘、鼠标或你的实际在岗状态。午休重叠部分不计时，下班后停止增长，每个自然日归零。锁屏、休眠或晚些时候打开应用，都会按当天排班补算工时。

这是一个收入估算与鼓励工具，暂不处理法定节假日、调休、请假、税费、加班工资，也不支持跨午夜夜班。实际薪资以工资单为准。发薪日设为 31 日时，短月份按当月最后一天显示倒计时。

## 数据在哪里？

设置、悬浮窗位置和每日手动操作保存在：

```text
%APPDATA%\niuma-grass\settings.json
```

可以将此路径粘贴到 Windows 资源管理器地址栏中打开。备份或迁移时，先退出应用，再复制该文件；需要恢复默认设置时，先退出应用，再将文件重命名为 `settings.backup.json` 后重新启动。

`PaySprout` 是项目的英文名称，应用内仍显示「牛马吃草」。为了兼容现有设置，内部包名、数据目录和发布文件名暂时保留 `niuma-grass` / `NiumaGrass`。

## 自己打包成 EXE

在已经完成 `npm ci` 的 Windows 项目目录中执行：

```powershell
npm run dist
```

完成后，可分发的便携文件位于：

```text
release/NiumaGrass-<版本号>-portable.exe
```

便携 EXE 可单独运行，使用者无需保留源码和 `node_modules`。构建使用本地已安装的 Electron，首次构建还需要联网下载 Windows 打包工具。`release/` 和 `node_modules/` 不提交到 Git；维护者发布版本时，应将 EXE 作为 GitHub Release 附件上传。

## 常见问题

### PowerShell 提示不能运行 npm.ps1

可以将命令中的 `npm` 替换为 `npm.cmd`，例如 `npm.cmd ci`、`npm.cmd start`，无需更改系统执行策略。

### Electron 下载慢或安装失败

检查网络后重试。若无法连接默认下载源，可在当前 PowerShell 会话中设置镜像，再重新安装：

```powershell
$env:ELECTRON_MIRROR = 'https://npmmirror.com/mirrors/electron/'
npm ci
```

### 打包工具下载失败

可在当前 PowerShell 会话中设置打包工具镜像后重试：

```powershell
$env:ELECTRON_BUILDER_BINARIES_MIRROR = 'https://npmmirror.com/mirrors/electron-builder-binaries/'
npm run dist
```

以上镜像设置仅影响当前终端会话。若打包时报 `Cannot create symbolic link`，可在 Windows 设置中开启「开发者模式」后重试。

### 为什么今天的金额不是从零开始？

应用按当天排班计算已经过去的有效工时。比如 09:00 上班、10:00 打开应用，会直接显示约 1 小时的收入。请检查月工资、上班时间、每日工时、午休、休息制度和电脑日期时间是否符合预期。

## 开发与贡献

欢迎通过本仓库的 Issues 反馈问题或建议，也欢迎提交 Pull Request。反馈时请附上 Windows 版本、复现步骤、预期结果和实际结果；上传截图或设置时，请先隐藏自己的工资等个人信息。

修改后可运行：

```powershell
npm test
npm run verify:ui
```

`npm test` 验证计薪规则，包括午休、周末、月份边界、提前打卡和跨日等情况。

`npm run verify:ui` 会实际打开 Electron 窗口，验证设置表单、持久化、窗口通信、当天状态切换与悬浮窗。此命令需要可显示桌面的 Windows 会话，使用独立测试数据，不会修改日常设置；截图和结果写入 `.artifacts/`。退出码为 0 表示通过。

项目使用 Electron、原生 HTML/CSS/JavaScript，没有前端框架或后端服务。核心文件：

```text
electron/
  main.cjs              窗口、托盘、本地保存、开机启动与 IPC
  preload.cjs           隔离的窗口通信接口
src/
  calculator.js         主窗口与悬浮窗共用的计薪逻辑
  index.html            主界面
  styles.css            主界面样式
  renderer.js           主界面交互
  widget.*              桌面悬浮窗
assets/                 本地插画和图标
docs/images/            README 展示截图，使用示例数据
tests/                  计薪逻辑测试
scripts/create-icons.py 图标生成脚本，仅重新生成图标时需要 Python 与 Pillow
```

## 许可证

本项目采用 [MIT License](LICENSE)。你可以使用、修改和分发项目，也可以用于商业用途；分发时请保留许可证和版权声明。
