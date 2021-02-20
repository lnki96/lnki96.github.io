var store = [{
        "title": "Android 系统架构",
        "excerpt":"本文所述 Android 架构，是指 Android 系统内部的体系架构，相对于应用开发角度的 Android 平台架构，更偏重展现 Android 系统内部的调用机制，用于指导 Android 硬件开发和系统开发。 一、架构 先看看来自官方的架构图： Android 架构 可以看到，Android 系统分为五层，自上而下依次为： 1. 应用框架层 应用框架层中的 API 主要用于应用开发，而从系统开发角度，这些 API 都是底层 HAL 接口的映射，可以理解为 Android 系统和应用之间的边界。 2. Binder IPC 层 Binder Inter-Process Communication（IPC），基于 Binder 的进程间通信机制，允许应用框架层跨越进程边界并调用 Android 系统服务层代码，实现框架 API 与 Android 系统服务之间的交互。这些通信过程对于应用开发者是透明的。 3. 系统服务层 系统服务是负责不同功能的模块化组件，例如窗口管理器、通知管理器、WLAN 管理器等等，应用框架 API 通过与系统服务通信来访问系统功能和底层硬件。Android 包含两组服务：“系统”（比如窗口管理器、通知管理器等服务）和“媒体”（与播放、录制媒体相关的服务）。...","categories": ["技术"],
        "tags": ["Android"],
        "url": "https://www.lnki.me/2018/09/android-arch/",
        "teaser": "https://www.lnki.me/assets/images/teaser.webp"
      }]
