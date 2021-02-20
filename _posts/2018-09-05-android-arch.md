---
title: Android 系统架构
tags:
  - Android
categories:
  - 技术
priority: 10
---

本文所述 Android 架构，是指 Android 系统内部的体系[架构](https://source.android.com/devices/architecture "Android 架构")，相对于应用开发角度的 Android [平台架构](https://developer.android.com/guide/platform "平台架构")，更偏重展现 Android 系统内部的调用机制，用于指导 Android 硬件开发和系统开发。
{: .notice}

## 一、架构

先看看来自官方的架构图：

{% include figure image_path="/contents/posts/ape_fwk_all.webp" alt="Android 架构图" caption="Android 架构" %}

可以看到，Android 系统分为五层，自上而下依次为：

### 1. 应用框架层

应用框架层中的 API 主要用于应用开发，而从系统开发角度，这些 API 都是底层 HAL 接口的映射，可以理解为 Android 系统和应用之间的边界。

### 2. Binder IPC 层

Binder Inter-Process Communication（IPC），基于 Binder 的进程间通信机制，允许应用框架层跨越进程边界并调用 Android 系统服务层代码，实现框架 API 与 Android 系统服务之间的交互。这些通信过程对于应用开发者是透明的。

### 3. 系统服务层

系统服务是负责不同功能的模块化组件，例如窗口管理器、通知管理器、WLAN 管理器等等，应用框架 API 通过与系统服务通信来访问系统功能和底层硬件。Android 包含两组服务：“系统”（比如窗口管理器、通知管理器等服务）和“媒体”（与播放、录制媒体相关的服务）。

### 4. 硬件抽象层（HAL）

Hardware Abstraction Layer（HAL），硬件抽象层，定义标准接口供硬件开发者实现，硬件开发者可以通过这些接口方便地实现特定功能，而不用担心对系统上层造成影响，系统服务则可以通过访问硬件抽象层，忽略更低级别的驱动实现。除了标准接口，Android 也允许系统开发者自定义 HAL 接口，便于实现定制功能。HAL 的实现会被封装成模块，通常编译为 ```.so``` 文件，并由 Android 系统适时加载。

从 Android 8.0 开始，引入了 HIDL，HAL 的运行方式也分为了两种：绑定式和直通式，Android 框架和系统服务通过 Binder IPC 机制与绑定式 HAL 通信，直通式则是在系统服务的同一进程下直接调用 HAL。绝大多数 HAL 是绑定式。

### 5. Linux 内核层

开发设备驱动程序类似于开发典型的 Linux 设备驱动程序。除了驱动程序，Android 使用的 Linux 内核还包含一些特殊的补充功能，例如低内存终止、唤醒锁定、Binder IPC 驱动等等，以及对移动嵌入式平台来说非常重要的其他功能，如 wpa_supplicant、netd 等等。这些补充功能主要用于增强系统功能，不会影响驱动程序开发。

## 二、运行机制

上面静态地展示了 Android 的系统架构，只是抽象地了解了其大体结构和所扮演的角色。为更具体地理解 Android 运行机制，下面以 [Audio 模块](https://source.android.com/devices/audio)为例，动态地看一看 Android 运行时的调用过程：

{% include figure image_path="/contents/posts/ape_fwk_audio.webp" alt="Android Audio 架构图" caption="Android Audio 架构" %}

当某个应用访问 Audio 模块时，自上而下的调用过程如下：

### 1. 应用框架

应用框架包含应用的代码，该代码可使用 ```android.media``` API 与 Audio 硬件进行交互。在内部，此代码会调用相应的 JNI 粘合类，以访问与 Audio 硬件交互的 native 代码。应用可以直接调用的框架代码位于 ```frameworks/base/media/java```。

### 2. JNI

与 ```android.media``` 关联的 JNI 代码可调用较低级别的原生代码，以访问 Audio 硬件。JNI 代码位于 ```frameworks/base/core/jni``` 和 ```frameworks/base/media/jni```。

### 3. Native 框架

Native 框架提供相当于 ```android.media``` 包的 native 代码包，调用 Binder IPC 代理以访问 Media 服务器的特定于音频的服务。原生框架代码位于 ```frameworks/av/media/libmedia```。

### 4. Binder IPC

Binder IPC 代理用于促进跨越进程边界的通信。代理代码位于 ```frameworks/av/media/libmedia```，文件以字母“I”开头。

### 5. Media 服务

Media 服务包含 Audio 服务，这些 Audio 服务是实际与 HAL 实现进行交互的代码。Media 服务位于 ```frameworks/av/services/audioflinger```。

### 6. HAL

HAL 定义了由 Audio 服务调用的标准接口，必须正确实现这些接口以确保 Audio 硬件功能正常运行。Audio HAL 接口位于 ```hardware/libhardware/include/hardware```。

### 7. 内核驱动程序

Audio 驱动程序分别与硬件和 HAL 实现进行交互，最终完成从应用对 Audio 硬件的访问。可以使用高级 Linux 音频架构（ALSA）、开放声音系统（OSS）或自定义驱动程序（HAL 与驱动程序无关）。

## 三、总结

经过对 Android 系统内部架构的梳理，可以看到，这种架构就类似于网络中常见的 C/S 架构，系统服务是服务器，应用程序是客户端，Binder IPC 机制则是承载两者交互的网络，Android 把每个系统功能拆分成不同的系统服务，它们管理相应的系统资源，通过 Binder IPC 机制，使每个应用有条不紊地向系统服务请求资源。
