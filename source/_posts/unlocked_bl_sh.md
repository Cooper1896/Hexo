---
title: 浅谈解锁bootloader与背后的原理
published: 2025-08-29
description: '讲讲我们俗称"解bl"的背后原理'
image: ''
tags: [Bootloader/解锁]
category: '杂谈'
draft: false 
lang: ''
---

## Boot Rom

![高通平台启动流程](https://cdn.jsdelivr.net/gh/Cooper1896/MyPic/68b1859c50416_1756464540.webp)

<center>高通平台启动流程</center>

根据流程图可以看见，在设备通电后，会首先运行PBL(Primary Boot Loader)。此时CPU会从固定地址(如ROM)执行Boot Rom代码[^1]，初始化最低级的硬件(如时钟,CPU核心等)。之后他会加载SBL(Secondary Boot Loader)到SRAM，并使用Root of trust公钥来验证SBL的签名。

---

## PBL(XBL或者SBL)

这部分便是今天要讲的重点——Bootloader。他主要的流程如下：

```
读取Boot Mode->
初始化启动接口(UFS,USB,eMMC,NAND)->
读取下一阶段镜像->
验证数字签名(RSA+SHA-256)->
├─ 验证通过 → 加载 SBL 并跳转 
└─ 验证失败 → 进入 Download Mode（刷机接口）
```

显而易见，PBL的目标是最大化保护设备的安全，以下简单讲几个有关的安全机制:

- 签名验证(**Signature Verification**)
  
  - 让所有要启动的 Next-stage Bootloader (SBL/XBL) 都必须经过OEM Key的签名验证

- 防回滚(**Rollback Protection**)
  
  - 防止刷入低于eFuse记录版本的固件
    这也是为什么，即使你有官方签名的旧版本固件，也无法手动刷入。这是因为其版本号低于eFuse中记录的版本，PBL拒绝了该镜像的加载

- 安全模式入口(EDL/Download Mode)限制
  
  - 大多OEM厂商都会限制安全模式入口。限制后，新版设备可能需要配合授权服务器（如 Mi Auth、Samsung KNOX）才能刷机，PBL 会要求 PC 工具和 OEM 服务器握手，验证授权 Token。
  - 这也是为什么售后能帮你刷机降级。员工会使用公司提供的PC工具，验证其员工身份，得到授权后可以进入该模式进行刷机。但由于内部内鬼等原因，时不时会有内部Token放出来出售(点名表扬小米😅)

你会发现，在流程中，他会验证镜像是否经过OEM/厂家的签名认证。

这意味着——无论你使用什么刷机工具(Fastboot、MiFlash等)去刷入固件，最终能否启动，取决于PBL是否认可该镜像的签名。

这也是为什么你要在解锁Bootloader后，才能刷入第三方ROM。

### PBL与Bootloader锁

Bootloader的锁定状态是由eFuse/OTP(One-Time Programmable Memory)记录，在PBL启动时会读取这些硬件熔丝位(Fuse Bits)

在寄存器中一般会记录一下信息:

- `BOOT_UNLOCK`:表示当前解锁状态(0 = Locked, 1 = Unlocked)
- `OEM_KEY_HASH`:厂商公钥的哈希值，用于签名验证
- `ANTI-ROLLBACK_VER`:防回滚版本号。用于验证镜像版本，确保镜像版本 ≥ eFuse版本，防止降级到存在漏洞的固件。

#### 解锁Bootloader流程

以 Android + Qualcomm SoC 为例：

1. 用户通过 `fastboot oem unlock` 发送解锁命令。
2. Fastboot 模式下的 **Secondary Bootloader（SBL/XBL）** 会请求用户确认（擦除数据）。
3. SBL/XBL 向 **Qualcomm Secure Execution Environment（QSEE, TrustZone）** 发送解锁请求。
4. QSEE 调用 **PBL 对接的安全熔丝编程接口**（OEM 控制）烧录 `BOOT_UNLOCK=1`。
5. 解锁完成， PBL 在启动链中会跳过 OEM Key 验证，或者采用开发者密钥（用于允许第三方镜像）。

:::note
PBL 自身不会被修改，但它的行为会因熔丝位（Fuse Bit）的状态而改变。
:::

---

## 熔断机制

个人觉得熔断机制挺有趣的，简单讲讲:

> 在硅片集成电路内部，设计了由薄金属或多晶硅工艺实现的特殊可控连线。这条连线在出厂时是导通的，芯片运行时可通过高电压/电流或激光能量将其永久断开（或改变其物理状态），从而记录一个“1”或“0”的状态。

基于其是在物理层面的熔断，因此无法恢复。
比如**Samsung Knox**

### Samsung Knox

#### 流程

以Bootloader解锁为例:

1. 用户在 **Download Mode** 下选择 “OEM Unlock” 并确认

2. 当前运行在 SBL（或 ABL）阶段的 Bootloader 向 TrustZone Secure Monitor 发起 **SMC（Secure Monitor Call）** 请求：
   
   ```c
   `smc_call(SMC_CMD_BLOW_FUSE, KNOX_WARRANTY_BIT_ID);`
   ```

3. TrustZone 内的安全固件（TZSW）通过 **eFuse Controller** 选中对应的熔丝行列地址

4. 硬件打开 **VPP 高压电源轨**（通常在芯片设计时是隔离状态，只在安全状态下可用，防止自己电自己）

5. 在一个很短的时间内向该熔丝单元施加大电流/高压

6. 熔丝链路永久断开（熔断），逻辑状态从 0 → 1

7. 把新状态Latch到一个只读寄存器（Boot ROM 在每次启动时读取）

恭喜你！你的手机将会....
- Samsung Pay/Samsung Pass 永久不可用
- 安全文件夹功能无法使用
- 保修失效
  ...


:::note
理论上可以烧写另一个位表示重新锁定（部分 SoC 采用双位方案 LOCK/UNLOCK），但是我不懂捏
:::

:::important
如果你打算购入Samsung的二手机，需要注意这一点，以免一失足成千古恨。
:::

end~😌

[^1]: 这段Boot Rom代码写死在SoC内部的Mask Rom里，无法更改。

