---
title: IEEE 802.11 MAC 帧
tags:
  - 网络
  - WLAN
categories:
  - 技术
---

Ehternet 的成帧很简单，只需在前加上前导码、寻址信息并在结尾加上校验和，相比而言，802.11 的成帧复杂，因为无线网络需要加入较多控制和管理的功能。

## 一、帧格式[^1]

下图为一般的 802.11 MAC 帧格式，单位为字节，会用到哪些字段取决于帧的类型。

{% include figure image_path="/contents/posts/80211-general-frame.webp" alt="一般的 802.11 帧格式示意图" caption="一般的 802.11 MAC 帧格式" %}

Frame Control
: 帧控制字段，包含协议、帧类型以及标志位等信息。其中 Type 字段标记当前帧的类型，包括管理帧、控制帧、数据帧三类；Sub-type 字段标记每种帧类型中的子类型，不同类型的帧有不同的处理方式。

{% include figure image_path="/contents/posts/80211-frame-frame-control.webp" alt="Frame Control 字段示意图" caption="Frame Control 字段" %}

Duration / ID
: 这个字段有三种形式，如下图。设定 NAV 时，第 15 位为 ```0```，其他位标识 NAV 的值，单位为微秒；在无竞争周期传送的帧中，第 14、15 位为 ```01```，其余位均为 ```0```，用来公告所有 STA 网络无竞争周期，避免它们干扰传送；在 PS-Poll（省电轮询）帧中，第 14、15 位为 ```11```，其他位则表示 AID（Association ID），AP 用来查找相应的缓冲帧。

{% include figure image_path="/contents/posts/80211-frame-nav-id.webp" alt="Duration / ID 字段示意图" caption="Duration / ID 字段的表示形式" %}

Address
: 802.11 帧最多包含 4 个地址字段，不同类型的帧包含的地址字段数量有所不同，它们可能表示目的地址（最终的接收端）、来源地址（帧的来源）、接收端地址（负责接收处理该帧的无线设备，可以是 STA 或 AP）、发送端地址（将帧传至无线媒介的无线接口）或者 BSSID（在基础结构型网络里是 AP 的 MAC 地址，在独立型网络则为随机的值）。

Sequence Control
: 分为片段编号和顺序编号，用于重组片段和丢弃重复帧。

{% include figure image_path="/contents/posts/80211-frame-seq-ctrl.webp" alt="Sequence Control 字段示意图" caption="Sequence Control 字段" %}

Frame Body
: 帧主体，负责传递上层有效载荷（Payload）。

FCS（Frame Check Sequence）
: 帧校验序列，是一种 32 bit 长的循环冗余校验码（CRC），FCS 和 CRC 的底层算法相同，用于检查所收到的帧的完整性。

## 二、对上层协议的封装

和以太网不同，802.11 封装依靠 802.2 的逻辑链路层封装来携带上层数据包。封装三层数据包时，先由衍生自 802.2 子网访问协议（SNAP，Sub-network Access Protocol）的 RFC 1042 或 802.1h 封装，SNAP 标头以目的服务接入点（DSAP，Destination Service Access Point）和源服务接入点（SSAP，Source Service Access Point）开始，之后依次为控制、OUI（组织唯一标识）、数据包类型字段，最后是数据包主体。LLC 层封装后，802.11 会再添加 MAC 标头，填入目的地址、源地址等信息，最后计算数据帧的帧校验序列，加到帧的末尾。

{% include figure image_path="/contents/posts/80211-frame-ip-encap.webp" alt="IEEE 802.11 封装 IP 示意图" caption="IEEE 802.11 对 IP 的封装" %}

## 三、帧类型[^1]

前面有提到，802.11 MAC 帧分为三类，分别为数据帧、控制帧和管理帧，本节介绍各种帧的特点及作用。

### 1. 数据帧

数据帧主要负责承载数据的传输，将上层协议的数据置于帧主体中加以传递，此外它还标记数据的传输方式，例如 QoS、CF-Poll 等等。控制帧和管理帧不承载上层数据包。数据帧子类型包括下面这些：

- Data
- Data + CF-ACK
- Data + CF-Poll
- Data + CF-ACK + CF-Poll
- Null（无承载数据）
- CF-ACK（无承载数据）
- CF-Poll（无承载数据）
- CF-ACK + CF-Poll（无承载数据）

另外，802.11e 提议引入 QoS，但尚未标准化，Sub-type 字段首位为 ```1``` 则表示启用了 QoS 支持，因此，有人称第一位为 QoS 位。

### 2. 控制帧

控制帧负责管理媒介的访问权，避免物理链路发生冲突，并且确保帧被成功传输，提供 MAC 层的可靠性，此外还包括省电程序；

RTS 帧
: 用来预约无线链路的使用权，为了确保传输数据时不会有冲突，会先发送一个 RTS 帧，其他设备收到 RTS 帧后，会在一段时间内保持静默。

CTS 帧
: 用于应答 RTS 帧，接收端收到 RTS 帧后，如果没有冲突，便应答一个 CTS 帧，标识当前无线链路可用，CTS 帧同样会使其他设备保持静默，如果发送端发送 RTS 后没有收到 CTS，便判定物理链路忙碌，将在一段时间内保持静默。

ACK 帧
: 确认数据已正确传输，接收端正确接数据后，应答一个 ACK 帧，若发送端未收到 ACK，则认为传输失败，将重传数据，以此实现传输的可靠性。

这里提一下，802.11 网络中的物理链路访问控制和传输可靠性主要依靠的就是 RTS、CTS、ACK。

在传输大型帧时干扰较多，需要用 RTS 来取得媒介的访问权。网卡驱动会设置一个 RTS 阈值，传送大于 RTS 阈值的帧之前，先进行 RTS / CTS 交换，先向接收端发送 RTS 帧，接收端收到 RTS 后应答 CTS 帧，以此清空物理链路，然后发送端再发送数据帧，接收端正确接收后，应答ACK；至于长度小于 RTS 阈值的帧，则不进行 RTS / CTS 交换，直接发送数据帧，然后接收端应答 ACK。上述流程中，每个帧之间都间隔 SIFS，流程结束后进入 DIFS，DIFS 结束后网络中的设备再次开始竞争物理链路使用权。

{% include figure image_path="/contents/posts/80211-rtc-cts-ack.webp" alt="RTS / CTS 清空物理链路示意图" caption="传输长度大于 RTS 阈值的帧" %}

PS-Poll 帧
: 控制帧的子类型中还包括 PS-Poll 帧，参与 802.11 的省电程序机制，用于从 AP 获取缓存帧。PS-Poll 帧中包含一个 AID 字段，AID（Association ID）即关联 ID，用于识别关联，便于 AP 为该关联找出缓存的帧。

CF-End 帧
: 表示无竞争周期结束。

CF-End + CF-ACK 帧
: 表示无竞争周期结束，同时进行无竞争周期确认。

### 3. 管理帧

管理帧主要负责网络的访问控制，参与 WLAN 的连接、断开、身份验证等操作，以及进行 WLAN 的识别，使无线网络能实现类似传统有线网络的寻找插座、连接网线等操作。与控制帧相比，控制帧管理的是数据传输的过程，而管理帧管理的是无线网络本身。管理帧包含帧主体，可以携带一些固定字段或是信息元素，以传递详细的网络管理消息，例如 SSID、WPA 密钥等等。

Beacon 帧
: 一种比较重要的类型，用于声明网络的存在，是网络的信标，其中包含 SSID、BSSID 等字段，以及加入网络所需的参数，周期性传送信标可以让 STA 得知网络的存在。

Probe Request 帧
: 探查请求，用来扫描区域内的 802.11 网络，它包含要探查的 SSID 和 STA 支持的频率信息，收到 Probe Request 帧的 AP 会判断 STA 是否能加入网络。

Probe Response 帧
: 即探查响应，收到 Probe Request 帧后，若 STA 与网络兼容，AP 就会应答一个 Probe Response 帧。Probe Response 包含 Beacon 中的所有参数，STA 根据它调整加入网络所需的参数。

ATIM 帧
: Announcement Traffic Indication Message 即通知传输指示消息，用于 IBSS 的省电机制，某台设备休眠时，会发出一个 ATIM 帧，此后发往该设备的帧会被发送方缓存。

Authentication 帧
: 用于建立连接前的身份验证，帧中包含算法代号，由于使用的算法不同，认证过程可能包含多个步骤，因此要为每个 Authentication 帧标记序号，状态码和质询文本因算法而异。

Association Request 帧
: 用来请求加入网络，STA 判断与网络兼容并通过身份验证后，便会发送 Association Request 帧 请求关联。

Association Response 帧与Reassociation Response 帧
: 分别用于关联请求和重新关联请求的响应，在响应过程中，会为当前关联指定 AID，(Re)Association Response 帧传输完成后关联关系建立。

Reassociation Request 帧
: 主要用于同一 ESS 内的 BSS 切换过程，允许 STA 短暂离开网络后重新加入，相较于 Association Request 帧，Reassociation Request 帧包含 STA 此前关联的 AP 的 MAC 地址，这样新旧 AP 可以彼此联系和转移缓存的数据。

Disassociation 帧与 Deauthentication 帧
: 分别用于解除关联关系和认证关系，两者均包含一个 Reason 字段，用于描述解除关系的原因。在解除认证关系时会自动解除关联关系。

Action 帧
: 由 802.11h 引入，用于其他功能，例如 DFS。

## 四、帧的内容

到这里，我们已经了解到，802.11 MAC 设计了多种类型的帧来保证 WLAN 正常工作，为了理解成帧细节，下面就以 Beacon 帧为例，抓包看看 802.11 MAC 帧的内容。

首先 Beacon 帧的 MAC 标头长度为 24 字节。

{% include figure image_path="/contents/posts/80211-beacon-header.webp" alt="Beacon 帧 MAC 标头图" caption="Beacon 帧中的 MAC 标头" %}

Frame Control（2 字节）
: 其中协议版本（2 bit）为 ```0```，帧类型（2 bit）为 ```00```（管理帧），子类型（4 bit）为 ```000```（Beacon 帧），标志位（8 bit）全部置 ```0```。

{% include figure image_path="/contents/posts/80211-beacon-frame-ctrl.webp" alt="Beacon 帧 Frame Control 字段内容图" caption="Frame Control 字段内容" %}

Duration 字段（2 字节）
: 值为 ```0```，表示 NAV 为 ```0```，不进行计时。

{% include figure image_path="/contents/posts/80211-beacon-duration.webp" alt="Beacon 帧 Duration 字段内容图" caption="Duration 字段内容" %}

目的地址（6 字节）
: 值为 ```ff:ff:ff:ff:ff:ff```，广播地址，Beacon 帧的定义中没有接收端地址。

{% include figure image_path="/contents/posts/80211-beacon-da.webp" alt="Beacon 帧目的地址图" caption="目的地址" %}

源地址（6 字节）
: 值为 ```96:63:72:0e:9f:e1```，同样地，Beacon 帧的定义中没有发送端地址。

{% include figure image_path="/contents/posts/80211-beacon-sa.webp" alt="Beacon 帧源地址图" caption="源地址" %}

BSSID（6 字节）
: 值为 ```96:63:72:0e:9f:e1```，与源地址相同，以 AP 的 MAC 地址作为 BSSID。

{% include figure image_path="/contents/posts/80211-beacon-bssid.webp" alt="Beacon 帧 BSSID 字段内容图" caption="BSSID 字段内容" %}

帧分片序号（4 bit）
: 值为 ```0```，表示不分片；帧序列号（12 bit）为 ```694```。

{% include figure image_path="/contents/posts/80211-beacon-fragment-seq.webp" alt="Beacon 帧分片序号与序列号字段内容图" caption="分片序号与序列号" %}

帧校验序列（4 bit）
: 在帧主体后面，帧的结尾处，值为 ```0xEA820968```，显示校验结果正确，数据完整。

{% include figure image_path="/contents/posts/80211-beacon-fcs.webp" alt="Beacon 帧校验序列内容图" caption="帧校验序列字段内容" %}

Beacon 帧主体
: 分为固定长度的固定字段（Fixed Parameters）和长度不定的标签字段（Tagged Parameters）。

{% include figure image_path="/contents/posts/80211-beacon-body.webp" alt="Beacon 帧主体内容图" caption="Beacon 帧主体" %}

信息元素：SSID
: 最后看看 Beacon 帧主体中的标签字段 SSID，每个标签字段也称为信息元素（Information Element，EI），是长度不定的字符串，SSID 长度介于 0 至 32 字节之间，元素编号（1 字节）为 ```0```，长度（1 字节）为 ```10```，无线网络的 SSID 为 ```vivo NEX S```。

{% include figure image_path="/contents/posts/80211-beacon-tag-ssid.webp" alt="Beacon 帧 SSID 标签内容图" caption="SSID 标签" %}

## 五、总结

分析完 802.11 MAC 帧的部分细节，对 802.11 工作原理有了一个系统化的、动态的认识，了解了一些典型机制的基本原理，比如可靠性传输、竞争周期、建立连接、扫描的过程等等，将日常使用 Wi-Fi 的操作和这些帧对应起来，就明白我们通过 Wi-Fi 上网时，设备之间究竟发生了什么。当然，这里也不可能了解 802.11 MAC 帧的全部内容，更多原理有待后续学习。

[^1]: Gast, M. S. 802.11® 无线网络权威指南[M]. 第 2 版. O'Reilly Taiwan 公司. 南京 - 东南大学出版社, 2007.12: 57-66,88-105
