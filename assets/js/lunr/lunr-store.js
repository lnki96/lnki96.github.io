var store = [{
        "title": "Android 系统架构",
        "excerpt":"本文所述 Android 架构，是指 Android 系统内部的体系架构，相对于应用开发角度的 Android 平台架构，更偏重展现 Android 系统内部的调用机制，用于指导 Android 硬件开发和系统开发。 一、架构 先看看来自官方的架构图： Android 架构 可以看到，Android 系统分为五层，自上而下依次为： 1. 应用框架层 应用框架层中的 API 主要用于应用开发，而从系统开发角度，这些 API 都是底层 HAL 接口的映射，可以理解为 Android 系统和应用之间的边界。 2. Binder IPC 层 Binder Inter-Process Communication（IPC），基于 Binder 的进程间通信机制，允许应用框架层跨越进程边界并调用 Android 系统服务层代码，实现框架 API 与 Android 系统服务之间的交互。这些通信过程对于应用开发者是透明的。 3. 系统服务层 系统服务是负责不同功能的模块化组件，例如窗口管理器、通知管理器、WLAN 管理器等等，应用框架 API 通过与系统服务通信来访问系统功能和底层硬件。Android 包含两组服务：“系统”（比如窗口管理器、通知管理器等服务）和“媒体”（与播放、录制媒体相关的服务）。...","categories": ["技术"],
        "tags": ["Android"],
        "url": "https://www.lnki.me/2018/09/android-arch/",
        "teaser": "https://www.lnki.me/assets/images/teaser.webp"
      },{
        "title": "计算机网络模型",
        "excerpt":"一、OSI 七层模型 OSI（Open System Interconnection）模型是一种计算机网络标准框架，是一种全球各种计算平台和网络之间数据通信的完整解决方案。OSI 是理论上的网络标准，而实际上的工业标准是 TCP/IP 协议族，理解 OSI 有助于理解 TCP/IP。 OSI 是一种分组网络模型，定义了七层网络模型，每层的功能相互独立，通过定义一些协议来描述处理过程，这样的好处是上层的修改不影响下层的结构。OSI分层模型的核心思想是封装，上层的数据包对于下层协议而言就是一个黑箱，下层协议只处理本层信息，不关心上层数据包的内容。在通信过程中，下层协议对于上层协议是透明的，下层协议通过封装、编码、加密等方式承载上层协议的数据包。 发送时，信息从应用层开始向下逐层封装，最终物理层将信息转化成信号传播到介质中；接收时，首先物理层从介质传来的信号中获取信息，再向上逐层拆包，最终到达应用层。 OSI 模型结构及数据封装 1. 物理层 物理层的处理单元是 bit（比特），负责将信息编码成电流脉冲、电磁波等形式的信号并传播出去，同时从信号中解码信息生成原始 bit 码。它定义了 bit 和信号之间的转换方式，以及物理介质的光电、电气和机械特性。 2. 数据链路层 数据链路层的处理单元是帧（Frame），负责构建物理设备的逻辑链路，并将输入的数据转换为数据帧，同时负责检测和修正传输出现的错误。工作在该层的设备主要是交换机。 该层又被划分为两个子层，分别为介质访问控制（MAC）子层和逻辑链路控制（LLC）子层。 MAC 子层的主要功能包括数据帧的封装/卸装，帧的寻址和识别，帧的接收与发送，链路的管理，帧的差错控制等。MAC 子层的存在屏蔽了不同物理链路种类的差异性，解决了局域网共用信道出现冲突时的介质使用权分配。在传统局域网中，普遍使用的 MAC 标准是 IEEE 802.3，即通常所说的以太网（Ethernet），采用 CSMA/CD 的方式避免冲突；在无线网络中，MAC 标准为 IEEE 802.11。MAC 子层还采用多种方式提高传输效率，包括 TDM、FDM、WDM 和 CDMA。 LLC 子层向上层提供服务，包括传输可靠性保障和控制、数据包的分段与重组、数据包的顺序传输等，IEEE 802.2 定义了它的功能和服务，它提供了访问各种介质的方法。LLC 负责识别网络层协议，然后对它们进行封装。LLC 报头告诉数据链路层当帧被接收到时，应当对数据包做何处理。...","categories": ["技术"],
        "tags": ["网络"],
        "url": "https://www.lnki.me/2018/09/network-model/",
        "teaser": "https://www.lnki.me/assets/images/teaser.webp"
      },{
        "title": "常见协议之 ARP 与 DHCP",
        "excerpt":"一、ARP ARP 即地址解析协议，用于将 IP 地址解析为 MAC 地址，来建立逻辑地址到物理地址的映射。 发送方将 IP 报文封装为帧时，需要知道接收方的 MAC 地址。如下图所示，发送方先查找本地 ARP 缓存是否存在目的 IP 地址或下一跳的 MAC 地址记录，若没有记录，就会广播 ARP Request 报文，询问接收方的 MAC 地址，接收方具有目的 IP 地址，将会以单播的形式响应，告知自己的 MAC 地址，同时记录发送方的 IP 地址和 MAC 地址。 ARP 地址解析过程 除了解析地址，ARP 还用于探测局域网中IP地址是否存在。对于 IPv4 网络，kernel 会定时向指定 IP 发送单播的 ARP Request 报文，通常是 1 分钟发送 3 个，若所有请求都没有收到 ARP Response 报文，内核判定探测的...","categories": ["技术"],
        "tags": ["网络"],
        "url": "https://www.lnki.me/2018/09/arp-dhcp/",
        "teaser": "https://www.lnki.me/assets/images/teaser.webp"
      }]
