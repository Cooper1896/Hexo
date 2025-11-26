---
title: Fuwari部署Twikoo过程分享
published: 2025-08-26
description: '此文章记录Twikoo部署过程，仅供参考'
image: 'https://twikoo.js.org/assets/logo.KgWMX3A2.png'
tags: [分享/博客]
category: '杂谈'
draft: true
lang: ''
top_img: false
---

Twikoo — "一个简洁、安全、免费的静态网站评论系统"

---

本站原本使用Giscus的评论功能

但考虑到必须要Github账户的局限性

为了更方便评论，我决定放弃前者，毅然加入更权威的代表—‘Twikoo’

本文参考官方教程，也可以按照官方的来，大差不差~

## 搭建后端

首先，你需要注册一个[MongoDB](https://account.mongodb.com/account/login)账号以获取一个免费的数据库

{% link MongoDB Atlas | Twikoo 文档,一个简洁、安全、免费的静态网站评论系统,https://twikoo.js.org/mongodb-atlas,/img/twikoo-logo.png %}

区域选择: Region优先选择离主机近的站点，一般默认的就是。如果使用云主机就按其地理位置为准。
设置好后，你将会得到类似的代码：

```
mongodb+srv://<db_username>:<db_password>@cluster0.xxx.mongodb.net/?retryWrites......Cluster0
```

{% note danger %}
请牢记在 Password Authentication 下设置数据库用户名和密码!!!
{% endnote %}

## 部署数据库

使用你的Github账户来登录Vercel

{% link Dashboard,Vercel Dashboard,https://vercel.com,/images/link-default.png %}

再点击下面的链接来快速部署

{% link New Project – Vercel,,https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fimaegoo%2Ftwikoo%2Ftree%2Fmain%2Fsrc%2Fserver%2Fvercel-min&teamSlug=brizens-projects,https://assets.vercel.com/image/upload/front/import/og.png %}

`Git Providers`选择`Github`，`Git Scope`选择自己的账户，`Private Repository Name`为你的库命名。

若是一切顺利，你会看见这样的画面
![](https://cdn.jsdelivr.net/gh/Cooper1896/MyPic/68ac9f5575e4b_1756143445.webp)

> 这时你还不会有Domain位址

---

选择`Settings` - `Environment Variables`,填写以下变量：

```
Key:MONGODB_URI
Value:mongodb+srv://<db_username>......<此处需要更改为你上面获取到的链接字符>
```

随后点save

此时再选择`Deployments`,点击任意一个项目后面的三个点，再选择`Redeploy`，再选择下方的`Redeploy`

这时回到`Overview`,会发现`Domain`处已分配了一个域名,复制下该域名。

## 参数设置

可以跟随其他大大的教程设置本地文件，伟大无需多言

{% link 给你的 Fuwari 接入 Twikoo 评论 - 咸鱼小窝,Fuwari 博客接入 Twikoo 评论,<https://blog.qqquq.com/posts/fuwari-twikoo-comments/,https://blog.qqquq.com/favicon/favicon-light-32.png> %}

其中，请将上面复制的域名复制到`envID`,并将<username>,<password>修改成你设置的账号和密码。

```
export const commentConfig: CommentConfig = {
  twikoo: {
    envId: '这里替换为你的 envId',
  },
}
```

最后在终端输入`pnpm dev`即可本地预览，enjoy!
