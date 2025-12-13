---
title: 疑难杂症
date: 2025-11-28 23:13:58
tags: 碎碎念
top_img: false
---

分享一些建站时遇到的奇怪小问题

---

### Git推送问题

#### 概述

我最初打算效仿Fuwari搭建的经验，本地修改后，使用`Git Push`推送至Github库，最后使用Cloudflare Pages完成网页展示。然而，`Git Push` 指令失败了。

#### 1. `Could not read from remote repository.`错误

- **错误信息:**
  
  ```
  ERROR: Permission to Cooper1896/Hexo.git denied to deploy key
  fatal: Could not read from remote repository.
  ```

这是本次排查的核心问题。信息指出，Git 正在使用一个部署密钥进行身份验证，但最终无法读取远程仓库。

部署密钥是绑定在单个仓库上的，用来拉取代码。鉴于我在搭建Fuwari时也是创建了密钥后，通过SSH把文件推送至库，此时我就有了第一个猜想：**生成的密钥已经被F库所占用**。

- **尝试解决**
  
  1. **弃用部署密钥：** 在仓库的 `Settings -> Deploy keys` 中删除了该密钥。
  
  2. **生成新的个人密钥：** 创建了一个新的、专用于个人身份验证的 SSH 密钥对 (`id_hexo` 和 `id_hexo.pub`)。
  
  3. **绑定个人密钥：** 将新公钥 (`id_hexo.pub`) 添加到 GitHub 个人账户的 `Settings -> SSH and GPG keys` 中。

#### 1.1 本地 SSH 客户端配置

- **错误信息：**

```
ERROR: Permission to Cooper1896/Hexo.git denied to deploy key
fatal: Could not read from remote repository.

Please make sure you have the correct access rights
and the repository exists.
```

即使生成了新密钥并添加到了 GitHub 账户，系统在 `git push` 时仍然可能尝试使用旧的（或默认的）密钥。这是因为新密钥的文件名 (id_hexo) 不是 SSH 客户端的默认名称（id_rsa）。

- **解决方案:**
  
  1. 创建并编辑了本地 SSH 配置文件,在 `config` 文件中添加了以下内容，**强制** SSH 客户端在连接 `github.com` 时使用新创建的私钥：
     
     ```
     Host github.com
      HostName github.com
      User git
      IdentityFile 'ssh密钥地址'
     ```

### 1.2 GitHub 推送保护

搞定了密钥，再次push，再次弹出错误信息：

- ```
  remote: error: GH013: Repository rule violations found...
  remote: - GITHUB PUSH PROTECTION
  remote: - Push cannot contain secrets
  remote: —— GitHub Personal Access Token ——————————————————————
  remote:   locations:
  remote:     - commit: 1659a89...
  remote:       path: Pic_Github_Token.txt:1
  ! [remote rejected] main -> main (push declined due to repository rule violations)
  ```

原因是因为身份验证成功后，推送被 GitHub 的安全策略阻止。GitHub 的扫描功能检测到我尝试推送的某个提交 (`1659a89...`) 中，有一个名为 `Pic_Github_Token.txt` 的文件包含了一个 GitHub 个人访问令牌 (PAT)。

好嘛，此时我有两个选择：

1. 撤销令牌

2. **清理历史：** 使用`git revert` 从本地 Git 历史中彻底移除了包含该机密的文件和提交。

3. **绕过：** 选择访问错误信息中提供的特定 URL，在 GitHub 界面上选择“允许推送该机密”（但该文件会永久公开在仓库历史中）。

貌似最好的选择是选项2，逐选择2

### 1.3  `Updates were rejected`

- **错误信息:**
  
  ```
  ! [rejected]        main -> main (non-fast-forward)
  hint: Updates were rejected because the tip of your current branch is behind
  hint: its remote counterpart. Use 'git pull' before pushing again.
  ```

看起来远程仓库已经接收到了新的提交请求。但是因为本地分支落后于远程分支，Git 拒绝了直接推送以防止覆盖远程更改。

- **解决方法**：执行 `git pull origin main`，尝试将远程的更改拉取并合并到本地。

### 1.4 拒绝合并不相关的历史

- **错误信息:**
  
  ```
  fatal: refusing to merge unrelated histories
  ```

在执行 `git pull` 时触发了此错误。这个问题我想半天不知道怎么解决，逐问AI...

核心问题在于我的本地仓库是使用 `git init` 独立初始化的，而远程 `Cooper1896/Hexo` 仓库是在 GitHub 上独立初始化的。它们**没有共同的原始提交**，Git 默认拒绝合并两个完全不相关的项目。

- **解决方案:**
  
  1. 使用 `--allow-unrelated-histories` 标志强制 Git 合并这两个不同的历史记录：
     
     ```
     git pull origin main --allow-unrelated-histories
     ```
  
  2. Git 自动打开了文本编辑器（Vim/Nano），要求为这次合并提供一个提交信息。
  
  3. 通过保存并退出编辑器（ `:wq`），完成了合并提交。
  
  至此终于解决...
  
  ---
