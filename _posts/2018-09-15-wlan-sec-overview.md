---
title: WLAN 中的安全机制概述
tags:
  - 网络
  - WLAN
  - 安全
categories:
  - 技术
---

WLAN 物理层的传输方式都是无线电广播，由于物理媒介的开放性，避免窃听自然是 WLAN 要提供的一项基本功能。说到 WLAN 安全，我们会想到 802.11i、802.1X、WEP、WPA、EAP、WAPI 等一堆名词，本文介绍它们的概念和作用，并梳理它们的关系。

## 一、安全标准

WLAN 的安全功能最早由 WEP 提供，WEP 在初版 802.11 标准中就已经引入，其被发现存在漏洞后，IEEE 推出了 802.11i，旨在增强 WLAN 安全性，这也是现行的 WLAN 安全标准，WPA 是其子集的技术实现，由 Wi-Fi 联盟推出，除了引进新技术，该标准也对 WEP 进行了改进。

### 1. IEEE 802.11i 架构[^1]

{% include figure image_path="/contents/posts/80211i-arch.webp" alt="IEEE 802.11i 架构图" caption="IEEE 802.11i 架构" %}

图中可以看出，802.11i 主要分为加密、密钥管理、身份认证三个部分。加密和密钥管理机制工作在 MAC 层，WEP、TKIP、CCMP 负责数据加密，密钥管理机制就是进行密钥派生，它根据 PMK 生成 PTK、GTK 等一系列密钥供加密协议使用；身份认证机制工作在 LLC 层及以上范围，802.1X 负责身份认证，只有通过认证的端口才能传输数据，此外还会向密钥管理机制提供密钥。

### 2. 工作机制

当一台 STA 加入一个支持 802.11i 的 WLAN 时，802.11i 的工作流程总体分为四个阶段：

1. 参数通报协商阶段：STA 从 AP 广播的 Beacon 中了解 WLAN 的安全配置，然后进行链路认证与关联，完成 WLAN 连接的建立，期间若双方支持的认证和加密方法不兼容，则会连接失败。
1. 身份认证阶段：STA 连接后要进行身份认证，过程中会产生密钥，它可以由认证服务器生成，也可以由预先配置的口令生成。
1. 密钥协商阶段：协商和配置 STA 与 AP 之间传送数据所需的通信密钥，由前一阶段产生的密钥派生而来。
1. 通信阶段：使用通信密钥，经过指定的加密协议加密数据后传送。

### 3. 引入的 802.1X 内容

802.11i 引入了一些来自 802.1X 的组件，主要用于 WLAN 安全中的身份认证与密钥管理部分。这些组件包括：

- 非受控端口（Uncontrolled Port）：未认证的端口，只允许 802.1X 的消息通过；
- 受控端口（Controlled Port）：允许通过或屏蔽其他的所有数据消息；
- 认证者（Authenticator）、申请者（Supplicant）：与远程设备进行身份认证与密钥管理交互的本地设备；
- 认证服务器（Authentication Server，AS）：集中管理身份认证和访问控制的设备。

## 二、身份认证[^2]

WLAN 中的身份认证主要分两大类：链路认证和接入认证，它们主要区别在于产生作用的时机，前者发生在关联建立之前，后者则是在关联建立之后。由于 WLAN 中的关联就像是以太网中连接网线的动作，那么可以这么理解，链路认证控制的是物理链路的使用权，认证通过的设备才可以连接“网线”，而接入认证控制的是局域网的访问权，接入网络的设备必须通过认证才能正常访问其他设备。

### 1. 链路认证

链路认证是一种很弱的认证方式，不能提供足够的安全性，它不传递或验证任何加密密钥，也不进行双向的身份认证。

#### Ⅰ· 开放系统认证

开放系统认证（Open System Authentication，OSA）就是不认证，只是简单地进行一次 Authentication Request/Response 交换，任何 STA 都可以认证成功。

{% include figure image_path="/contents/posts/wlan-auth-open.webp" alt="开放系统认证握手过程图" caption="开放系统认证过程" %}

#### Ⅱ· 共享密钥认证

共享密钥认证（Shared Key Authentication，SKA）使用 WEP，STA 和 AP 预先配置相同的共享密钥，这套机制下只要密钥配置一致即认证成功。认证过程如下图：

{% include figure image_path="/contents/posts/wlan-auth-wep.webp" alt="共享密钥认证握手过程图" caption="共享密钥认证过程" %}

1. STA 向 AP 发送 Authentication Request；
1. AP 回复携带有明文质询文本的 Authentication Response；
1. STA 发送经 WEP 处理的 Authentication Response 帧，携带密文质询文本；
1. AP 收到后，对密文予以解密，验证 WEP 的完整性，若通过完整性校验，AP 就会响应一个携带认证成功的状态码的 Authentication Response。

### 2. 接入认证

接入认证基于 802.1X，相比于链路认证，它可以提供更可靠的安全性。

IEEE 802.1X 基础是 EAP，在认证通过前，只允许 EAPoL（EAP over LAN）帧通过相连的端口，其定义了 3 种角色，分别为申请者 (Supplicant)、认证者 (Authenticator) 以及认证服务器（例如 RADIUS），如下图：

{% include figure image_path="/contents/posts/8021x-roles.webp" alt="IEEE 802.1X 角色示意图" caption="IEEE 802.1X 中的角色" %}

申请者是寻求访问网络资源的设备，认证者扮演交换机的角色，负责链路层的认证交换过程，并负责分配密钥和端口的管理，认证服务器执行身份认证逻辑，有多种认证方法可选。申请者和认证者之间采用 EAPoL 帧，在第二层通信，认证者和认证服务器之间采用 IP 封包，在第三层通信。在 WLAN 中，申请者是要加入网络的 STA，认证者是所关联的 AP，认证服务器位于骨干网络中。

在 802.11 网络中，典型的 802.1X 认证成功的交互过程如下：

{% include figure image_path="/contents/posts/8021x-procedure.webp" alt="802.1X 交换过程图" caption="802.11 网络中的 802.1X 交换" %}

1. STA 先关联至 AP；
1. 然后 STA 发起 802.1X 交换，首先发送 EAPoL-Start；
1. AP 回复身份认证请求；
1. STA 响应身份标识；
1. AP 告知 STA 要使用的身份认证方法，数据字段中包含质询信息；
1. STA 按照指定的认证方法处理质询信息并回应，取决于具体的认证方法，以上两步可能会进行多轮，直到认证成功；
1. 成功后 AP 回复认证成功；
1. 接着 AP 再与 STA 协商密钥，至此认证完成，待密钥协商完成 STA 便可以访问网络了；
1. 当 STA 不再需要访问网络时，发送 EAPoL-Logoff，撤销授权。

## 三、安全协议

### 1. TKIP

TKIP（Temporal Key Integrity Protocol）即临时密钥完整性协议，是 WEP 的改进版，为了兼容算力较弱的旧系统，TKIP 提供的保护依然较弱，但去除了 WEP 的漏洞，这种保护至少是完整的。

考虑到兼容，TKIP 的封装过程与 WEP 有些类似，格式如下图：

{% include figure image_path="/contents/posts/80211i-tkip-encap.webp" alt="TKIP 封装格式图" caption="TKIP 封装格式" %}

TKIP 标头在 MAC 标头之后，IV / Key ID（初始向量 / 密钥 ID）长度 4 字节，保留自 WEP，但有不同含义，最前面的 3 字节记录了部分的 TKIP 序列号和目前使用的密钥编号，虽然 TKIP 支持多组密钥，但只有 Key ID 0 才会被分配使用，EIV（Extended IV，扩展初始向量）则是用来记录 TKIP 序列号的其余部分，这里的序列号是为了防止重放攻击，接下来 TKIP 在有效载荷后加上 MIC（消息完整性校验）码，最后 WEP 会加入其自身的 ICV（完整性校验值），以尽量维持 WEP 格式不变。

### 2. CCMP

CCMP（Counter Mode with CBC-MAC Protocol）即计数器模式及密码块链消息认证码协议，是 802.11i 引入的全新设计的数据保护协议，它满足了 802.11i 中的所有安全指标，使用 AES 块加密算法，规避了 WEP 所使用的 RC4 流加密的安全隐患。

CCMP 的封装过程相当直接，格式如下图：

{% include figure image_path="/contents/posts/80211i-ccmp-encap.webp" alt="CCMP 封装格式图" caption="CCMP 封装格式" %}

CCMP 标头长度为 8 字节，在 MAC 标头之后，记录了 6 字节长的 PN（Packet Number，封包编号），PN 值随每次传输逐渐累加，用于防止重放攻击，封装时 PN 被从第 2、3 字节拆开来，中间填入 13 bit 值为 ```0``` 的保留位、1 bit 值恒为 ```1``` 的 EIV 和 2 bit 的 Key ID，最后，在负载数据之后加上 8 字节的 MIC。

### 3. 协议比较[^1]

{% include table-wrapper caption="IEEE 802.11i 数据保护协议比较" table="
| 安全协议 | 加密算法 | 密钥长度 | 完整性校验 || 密钥管理 |
| ^^ | ^^ |^^ | 数据 | 标头 | ^^ |
| - | - | - | -| - | - |
| WEP | RC4 | 40 或 104 bit | CRC-32 | 无 | 无 |
| TKIP | RC4 | 128 bit 加密<br>64 bit 防伪 | Michael | Michael | 802.11i 四次握手 |
| CCMP | AES | 128 bit | CCM | CCM | 802.11i 四次握手 |
" %}

## 四、密钥管理

### 1. 密钥组成

802.11i 规定链路层加密协议使用两种密钥：成对密钥（Pairwise Key）、组密钥（Group Key），前者用来保护 STA 与 AP 之间往来的单播数据，后者用来保护 AP 与所关联的 STA 之间的广播或组播数据。TKIP 和 CCMP 均使用单一主密钥来产生操作过程中所需的其他密钥，802.11i 引入了密钥分级机制，其目的之一是为了保护这些派生密钥的传送。

{% include figure image_path="/contents/posts/80211i-pairwise-key.webp" alt="成对密钥层次结构图" caption="成对密钥层次结构" %}

在成对密钥体系中，主密钥称为成对主密钥（PMK），长度为 256 bit。临时密钥通过伪随机函数展开 PMK 来获得，这里展开的临时密钥被称为成对临时密钥（PTK）。TKIP 和 CCMP 均使用 EAPoL-Key 来保护传送的帧，它包含两个 128 bit 的密钥，一个是 EAPoL 密钥确认密钥（EAPoL Key Confirmation Key, KCK），用于验证密钥生成消息的完整性，一种是 EAPoL 密钥加密密钥（EAPOL Key Encryption Key, KEK），用来加密密钥生成消息，KCK 和 KEK 均派生自 PTK。

{% include figure image_path="/contents/posts/80211i-group-key.webp" alt="组密钥层次结构图" caption="组密钥层次结构" %}

在组密钥体系中，认证者持有组主密钥（GMK），GMK 是临时密钥的基础，长度为 128 bit，生成的临时密钥称为组临时密钥（GTK），这里不会产生 KCK 和 KEK，因为广播和组播不会发生密钥交换的过程。

### 2. 密钥来源与分配

802.11i 密钥交换时，成对密钥分别通过各自的握手流程加以更新，如下图所示：

{% include figure image_path="/contents/posts/80211i-key-handshake.webp" alt="密钥交换流程图" caption="成对密钥交换与组密钥交换的握手流程" %}

成对密钥通过四次握手分配，密钥更新前，申请者与认证者均持有一个共享的 PMK：

1. 认证者将 nonce 传给申请者，这里的 nonce 是用于防范重放攻击的随机值，同时申请者生成一个 nonce，与认证者发送的 nonce、双方的 MAC 地址一并用于 PMK 的展开，生成完整的密钥层次结构；
1. 申请者向认证者发送自己的 nonce 以及初次与网络关联时所获取的安全参数，这条消息使用 KCK 计算的校验值来验证完整性，认证者同样使用双方的 nonce 和 MAC 地址将 PMK 展开为完整的密钥层次结构；
1. 双方已经准备好密钥，但需要进一步确认，认证者发送新生成的成对密钥的序列号，以及新生成的 GTK，以便后续更新组密钥，消息使用 KEK 加密，使用 KCK 验证完整性；
1. 申请者向认证者发送一个确认消息，告知已收到密钥，可以开始使用新密钥，该消息使用 KCK 验证完整性。

组密钥交换比成对密钥简单，只有两步：

1. 第一步认证者使用 KEK 加密发送 GTK，消息使用 KCK 校验；
1. 第二部申请者发送确认消息，开始使用新的 GTK，此消息同样使用 KCK 校验。

## 五、一些安全相关的特性

### 1. 预先身份认证

预先身份认证（Preauthentication）用来加速关联转移，所谓关联转移就是 Wi-Fi 中的漫游，802.11 将认证过程和关联操作加以拆解，使它们可以独立进行，预先身份认证允许已连接到 WLAN 的 STA 在同一 ESS 内切换 BSS 时，不用重复进行身份认证，而是直接与新 AP 建立关联，以此实现关联转移的加速。

#### Ⅰ· 802.11 预先身份认证

802.11 并未要求链路认证之后必须立即进行关联操作。STA 可以同时和多个 AP 进行链路认证，然后和其中一个 AP 建立关联，在切换时，STA 先和 AP 断开关联，然后和新的 AP 进行关联，建立关联后即可进行数据传输。

#### Ⅱ· 802.11i 预先身份认证与密钥缓存

由于 802.11i 的身份认证基于 802.1X，而 802.1X 认证过程又需要来回传递多个帧，比较费时。预先身份认证让 STA 在与新的 AP 建立关联之前事先建立一个安全配置，实现关联转移的加速。WPA 则明确排除了预先身份认证的使用。

{% include figure image_path="/contents/posts/80211i-eap-pre-auth.webp" alt="802.11i 预先身份认证示意图" caption="802.11i 预先身份认证" %}

上图中，STA 通过与 AP1 关联加入 WLAN，在 STA 切换到 AP2 之前，进行预先身份认证：

1. STA 经由 AP1 与 AP2 进行 802.1X 认证，完成后 STA 与 AP2 生成相应的的密钥并缓存；
1. 待 STA 出发关联切换，关联就会从 AP1 转移到 AP2；
1. STA 向 AP2 提供事先准备的缓存密钥，告知已通过身份认证；
1. AP2 找到匹配的密钥，就开始密钥交换流程，密钥配置完成后，便可以传输数据了。

预先身份认证实际上仍是完整的 802.1X 认证过程，因为 STA 只能和一个 AP 建立关联，STA 和 AP2 之间的帧都要经过 AP1，在从 STA 发往 AP2 的帧中，源地址为 STA，接收端地址为 AP1，目的地址为 AP2，AP1 收到帧后经分布式系统转发至 AP2。

### 2. 帧等级与身份认证状态[^2]

在 802.11 网络中，有三种身份认证状态，这里的状态是指链路认证状态，每种状态能传送的帧类型不同，这些帧被划分为三个等级，对应于三种身份认证状态的权限等级。身份认证状态中状态 1 为初始状态，即未认证且未关联的，状态 2 为已认证但尚未关联，状态 3 为已认证且已关联，转换关系如下图所示：

{% include figure image_path="/contents/posts/80211-frame-class.webp" alt="802.11 整体状态图" caption="802.11 身份认证状态及帧等级" %}

- 第 3 级帧包括 PS-Poll、Deauthentication 和除了 ToDS 与 FromDS 都置为 0 的全部数据帧，这些帧只有在状态 3 下才能传送；
- 第 2 级帧只有 5 种管理帧，包括 Association Request / Response、Reassociation Request / Response 和 Disassociation，这些帧只能在状态 2 和状态 3 下传送；
- 第 1 级帧是除了第 2、3 级之外的所有帧，在任何状态下都可传送。

Deauthentication 和 Disassociation 携带的与帧等级有关的 Reason Code 如下：

- 6：在未身份验证的状态下接收到了第 2 级帧
- 7：在未关联的状态下接收了第 3 级帧
- 9：STA 未通过身份验证便请求关联

## 六、总结

经过梳理，我们了解到，WLAN 的安全系统主要由身份认证、密钥管理和加密传输等部分组成，WEP 是最早的安全机制，802.11i 是后来推出的安全标准，WPA/WPA2 则是 Wi-Fi 联盟推出的这一标准子集的实现。802.11i 标准中，身份认证基于802.1X，而 802.1X 基于 EAP，密钥管理和加密传输则基于 TKIP、CCMP 等协议。

生活中常见的安全系统有 WEP、WPA/WPA2、WAPI 等等，配置安全系统时，管理员设定这些安全服务所使用的安全技术，形成一套安全策略。下表列举几种安全策略：

{% include table-wrapper caption="WLAN 安全策略" table="
| 安全策略 | 链路认证 | 接入认证 | 数据加密 | 备注 |
| - | - | - | - | - |
| WEP | Open | 无 | 不加密或 WEP 加密 | 不安全 |
| ^^ | SKA | 无 | WEP | ^^ |
| WPA/WPA2-PSK | Open | PSK | TKIP 或 CCMP | 目前常用的是 WPA2-PSK，适用于个人和企业 |
| WPA/WPA2-Enterprise | Open | 802.1X（EAPoL） | TKIP 或 CCMP | 目前常用的是 WPA2-Enterprise，适用于企业 |
| WAPI-PSK | Open | PSK | SMS4 | 应用较少 |
| WAPI-CERT | Open | 证书认证 | SMS4 | ^^ |
" %}

到这里，应该就有一个关于 WLAN 安全的认知框架了。

[^1]: Clint Chaplin, Emily Qi, Henry Ptasinski, Jesse Walker, Sheung Li. 802.11i Overview[EB/OL]. [URL](https://www.ieee802.org/16/liaison/docs/80211-05_0123r1.pdf), 2005-02-09.
[^2]: Gast, M. S. 802.11® 无线网络权威指南[M]. 第 2 版. O'Reilly Taiwan 公司. 南京 - 东南大学出版社, 2007.12: 142-195,123-126。
