var store = [{
        "title": "",
        "excerpt":"                                放在门外的箱子终于长猫了        ","categories": [],
        "tags": [],
        "url": "https://www.lnki.me/meow/2019/09/26/",
        "teaser": "https://www.lnki.me/contents/meow/20190926-teaser.webp"
      },{
        "title": "",
        "excerpt":"                                毫不在意形象        ","categories": [],
        "tags": [],
        "url": "https://www.lnki.me/meow/2020/01/20/",
        "teaser": "https://www.lnki.me/contents/meow/20200120-teaser.webp"
      },{
        "title": "",
        "excerpt":"                                Wink～★        ","categories": [],
        "tags": [],
        "url": "https://www.lnki.me/meow/2020/01/24/",
        "teaser": "https://www.lnki.me/contents/meow/20200124-teaser.webp"
      },{
        "title": "",
        "excerpt":"                                呆住                                        惊醒        ","categories": [],
        "tags": [],
        "url": "https://www.lnki.me/meow/2020/03/26/",
        "teaser": "https://www.lnki.me/contents/meow/20200326-teaser.webp"
      },{
        "title": "",
        "excerpt":"                                琴盒里的猫，有点威风哦        ","categories": [],
        "tags": [],
        "url": "https://www.lnki.me/meow/2020/05/25/",
        "teaser": "https://www.lnki.me/contents/meow/20200525-teaser.webp"
      },{
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
        "title": "IEEE 802.11 概览",
        "excerpt":"关于无线网络，我们常提到 WLAN、Wi-Fi、IEEE 802.11 a/b/g/n/ac 等名词，它们似乎都可以指无线网络，这里先了解它们的概念和区别： WLAN Wireless LAN，即无线局域网，一种局域网形式，物理介质为无线电波 IEEE 802.11 由 IEEE 制定的无线网络标准，a/b/g/n/ac 是该标准的几个迭代版本，IEEE 802.11 是现今 WLAN 的通用标准 Wi-Fi 一种基于 IEEE 802.11 标准的技术实现，是现今 WLAN 最常采用的技术，它也是 Wi-Fi 联盟的商用标志，用于产品的 WLAN 技术认证。 一、背景 1. 技术族谱1 IEEE 802 家族由一系列局域网标准组成，主要对 OSI 参考模型的最下面两层作出规范，涵盖了物理层和数据链路层组件。IEEE 802.11 是无线局域网标准，提供了物理层和 MAC 的规范。IEEE 802.11 与以太网有较深的渊源，被称为“无线以太网”，在配置 IEEE 802.11 网络时，不需要对传统的以太网做很多调整便可以将服务扩展至无线网络中，为网络设备带来了可移动性。 下图是部分 IEEE 802 家族的成员，可以看到家族成员之间的关系及其在...","categories": ["技术"],
        "tags": ["网络","WLAN"],
        "url": "https://www.lnki.me/2018/09/wlan-overview/",
        "teaser": "https://www.lnki.me/assets/images/teaser.webp"
      },{
        "title": "IEEE 802.11 MAC 基础盘点",
        "excerpt":"这里简单过一过 IEEE 802.11 MAC 层的常见概念1，了解这些名词基本的的用途和目的，具体原理就不做深入讨论了。 MAC（Media Access Control） OSI 模型数据链路层子层，直接管理传输媒介，将传输媒介抽象为物理链路，负责物理链路冲突的避免、进行帧的封装与解封、错误检测和主机定位。 主动确认（Positive ACK） 由于无线链路的特殊性，传输会受到噪声和干扰的影响，802.11 采用主动确认的机制，所有传出去的帧必须得到回应，否则认为传输漏失，会进行重传。 隐藏节点问题 假设下图中节点 2 可以直接和节点 1、3 直接通信，但由于某些原因节点 1 无法直接接收到节点 3 的信号，对于节点 1 而言，节点 3 就是隐藏节点。节点 1、3 可能同时向节点 2 发送数据，节点 2 同时收到来自两边的数据便会出现异常，而且节点 1、3 也无从得知发生了错误。 隐藏节点 RTS（Request to Send） 为了解决隐藏节点问题，防止冲突发生，802.11 引入 RTS / CTS 机制，发送端在发送数据前，会先发送一个 RTS 帧，预约无线链路的使用权，其他 STA 收到...","categories": ["技术"],
        "tags": ["网络","WLAN"],
        "url": "https://www.lnki.me/2018/09/wlan-mac/",
        "teaser": "https://www.lnki.me/assets/images/teaser.webp"
      },{
        "title": "IEEE 802.11 MAC 帧",
        "excerpt":"Ehternet 的成帧很简单，只需在前加上前导码、寻址信息并在结尾加上校验和，相比而言，802.11 的成帧复杂，因为无线网络需要加入较多控制和管理的功能。 一、帧格式1 下图为一般的 802.11 MAC 帧格式，单位为字节，会用到哪些字段取决于帧的类型。 一般的 802.11 MAC 帧格式 Frame Control 帧控制字段，包含协议、帧类型以及标志位等信息。其中 Type 字段标记当前帧的类型，包括管理帧、控制帧、数据帧三类；Sub-type 字段标记每种帧类型中的子类型，不同类型的帧有不同的处理方式。 Frame Control 字段 Duration / ID 这个字段有三种形式，如下图。设定 NAV 时，第 15 位为 0，其他位标识 NAV 的值，单位为微秒；在无竞争周期传送的帧中，第 14、15 位为 01，其余位均为 0，用来公告所有 STA 网络无竞争周期，避免它们干扰传送；在 PS-Poll（省电轮询）帧中，第 14、15 位为 11，其他位则表示 AID（Association ID），AP 用来查找相应的缓冲帧。 Duration / ID 字段的表示形式 Address...","categories": ["技术"],
        "tags": ["网络","WLAN"],
        "url": "https://www.lnki.me/2018/09/wlan-frame/",
        "teaser": "https://www.lnki.me/assets/images/teaser.webp"
      },{
        "title": "WLAN 中的安全机制概述",
        "excerpt":"WLAN 物理层的传输方式都是无线电广播，由于物理媒介的开放性，避免窃听自然是 WLAN 要提供的一项基本功能。说到 WLAN 安全，我们会想到 802.11i、802.1X、WEP、WPA、EAP、WAPI 等一堆名词，本文介绍它们的概念和作用，并梳理它们的关系。 一、安全标准 WLAN 的安全功能最早由 WEP 提供，WEP 在初版 802.11 标准中就已经引入，其被发现存在漏洞后，IEEE 推出了 802.11i，旨在增强 WLAN 安全性，这也是现行的 WLAN 安全标准，WPA 是其子集的技术实现，由 Wi-Fi 联盟推出，除了引进新技术，该标准也对 WEP 进行了改进。 1. IEEE 802.11i 架构1 IEEE 802.11i 架构 图中可以看出，802.11i 主要分为加密、密钥管理、身份认证三个部分。加密和密钥管理机制工作在 MAC 层，WEP、TKIP、CCMP 负责数据加密，密钥管理机制就是进行密钥派生，它根据 PMK 生成 PTK、GTK 等一系列密钥供加密协议使用；身份认证机制工作在 LLC 层及以上范围，802.1X 负责身份认证，只有通过认证的端口才能传输数据，此外还会向密钥管理机制提供密钥。 2. 工作机制 当一台 STA...","categories": ["技术"],
        "tags": ["网络","WLAN","安全"],
        "url": "https://www.lnki.me/2018/09/wlan-sec-overview/",
        "teaser": "https://www.lnki.me/assets/images/teaser.webp"
      },{
        "title": "常见协议之 ARP 与 DHCP",
        "excerpt":"一、ARP ARP 即地址解析协议，用于将 IP 地址解析为 MAC 地址，来建立逻辑地址到物理地址的映射。 发送方将 IP 报文封装为帧时，需要知道接收方的 MAC 地址。如下图所示，发送方先查找本地 ARP 缓存是否存在目的 IP 地址或下一跳的 MAC 地址记录，若没有记录，就会广播 ARP Request 报文，询问接收方的 MAC 地址，接收方具有目的 IP 地址，将会以单播的形式响应，告知自己的 MAC 地址，同时记录发送方的 IP 地址和 MAC 地址。 ARP 地址解析过程 除了解析地址，ARP 还用于探测局域网中IP地址是否存在。对于 IPv4 网络，kernel 会定时向指定 IP 发送单播的 ARP Request 报文，通常是 1 分钟发送 3 个，若所有请求都没有收到 ARP Response 报文，内核判定探测的...","categories": ["技术"],
        "tags": ["网络"],
        "url": "https://www.lnki.me/2018/09/arp-dhcp/",
        "teaser": "https://www.lnki.me/assets/images/teaser.webp"
      }]
