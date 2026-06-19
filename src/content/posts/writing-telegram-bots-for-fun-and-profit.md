---
title: Writing Telegram bots for fun and profit
pubDate: "2020-11-20T16:15:05.000Z"
updatedDate: "2026-06-18T23:45:45.000Z"
tags:
  - slug: python
    name: Python
  - slug: technical
    name: Technical
  - slug: projects
    name: Projects
  - slug: bots
    name: Bots
  - slug: telegram
    name: Telegram
author: oz
featured: false
excerpt: Why use F5 when a bot can do it for you?
featureImage: /content/images/2020/11/Screen-Shot-2020-11-20-at-13.55.41-1.png
metaDescription: Why use F5 when a bot can do it for you?
---

It all started with the god damn PlayStation 5. It was launch day here in Israel, and I’ve been trying to find a store that sells one (after missing out on the pre-order). [Obviously](https://www.theverge.com/2020/4/16/21223325/playstation-5-launch-supply-production-price), they’re hard to come by.

After talking to a few stores, it was clear to me that the supply is limited and I’ll have to wait for restocks to arrive. But how will I know when it’ll happen? Every sales person I’ve spoken to did no know to predict a time. So what am I gonna do? Just call to a store once a day until they’ll have supply? Nope.

When I thought about how to tackle this problem, I thought back to an article I [read](https://www.geektime.co.il/coders-that-use-coding-for-life-hacks/) a few weeks ago, about the usage of scripts as a way to “win at life”, which included as an example a student who [wrote a script](https://github.com/orinu/pre-order-ps5/blob/master/scriptps5.js) to alert him when the pre-order of the PS5 is live. And while I missed on that particular train, I figured - why not do the same , and use a scrip to let me know when the console is back in stock?

<figure class="kg-card kg-image-card">
  <img src="/content/images/2020/11/DraggedImage.544d6b9ab2b54b8cb77bfbf1285fbc26.png" alt="" width="700" height="300" loading="lazy" decoding="async">
</figure>

## Design: Telegram Bots + Docker = ❤️

When I went about designing my solution, I’ve defined three main goals:

1.  **Simple to write**: I didn’t want to deal with many services, and to have to orchestrate an array of services bouncing alerts from one service to another. I wanted a simple and elegant solution, that will be easy to maintain and debug while remaining easy to use.
2.  **Simple to deploy**: Again - I didn’t want to be dealing with a bunch of services that I’ll have to setup, configure, backup and etc. I wanted a solution that will allow me to run a script on a server and be done with it.
3.  **Simple to reuse**: If this will prove as an effective method of notifying me when stuff happens, I will want to reuse this project to solve other problems. Therefor, I would like my solution to be easily customisable to allow for simple reuse.

To meet these design goals, I’ve decided to go with **Telegram Bots**. It’s a technology I’ve used before, and praised for solving the problem of getting a message to my phone in the easiest way possible.

Since Telegram bots already have many libraries that provide an easy API to operate such bots, writing a generic bot in Python should be a walk in the park. And to satisfy goals 2+3, I’ve decided to write the bot as a dockerized application to allow for easy deployments and to avoid dependancies management.

The project I’ve ended with is called [WebsiteWatcher](https://github.com/OzTamir/WebsiteWatcher), and it’s available under the MIT license over at my GitHub account. For instructions on how to use and deploy it, please use the README. The rest of this post will describe how I wrote it.

<figure class="kg-card kg-image-card">
  <img src="/content/images/2020/11/Screen-Shot-2020-11-20-at-13.55.41.png" alt="" loading="lazy" decoding="async">
</figure>

## Step One: Registering a bot in Telegram

Registering a bot in Telegram is one of the best experiences I could’ve ask for in this situation. No signup forms, no putting in tons of personal information, no explaining the reasons you wish to build a bot for - nothing. Just text [@BotFather](/p/5fc7e72b-c094-44fc-acab-36e278e08bef/t.me/botfather), choose a name and you’re done. It’s that easy:

<figure class="kg-card kg-image-card kg-card-hascaption">
  <img src="/content/images/2020/11/Screen-Shot-2020-11-20-at-16.40.57.png" alt="Registering a bot is E A S Y" loading="lazy" decoding="async">
  <figcaption>Registering a bot is E A S Y</figcaption>
</figure>

Once you’re done, you should receive from BotFather your Telegram Bot’s Token. This token is used by the API to authenticate you as the legitimate operator of the bot, and is the connection between your Python script to the Telegram infrastructure - and that’s why it’s vital to keep it secret and secure.

## Step two: Writing the code

There really isn’t much to say about this other than to share the design I came up with for this project:

-   The main file is [bot.py](https://github.com/OzTamir/WebsiteWatcher/blob/master/src/bot.py), which contains most of the logic for the bot side of the code (sending and receiving messages, authenticating the user to avoid randoms using your server resources, etc)  
    

<figure class="kg-card kg-image-card">
  <img src="/content/images/2020/11/Screen-Shot-2020-11-20-at-18.04.49.png" alt="" loading="lazy" decoding="async">
</figure>

-   The Watching logic is implemented in the [watcher submodule](https://github.com/OzTamir/WebsiteWatcher/tree/master/src/watcher), mostly inside the [WatcherManager](https://github.com/OzTamir/WebsiteWatcher/blob/master/src/watcher/watcher_manager.py).

This class keeps a list of watcher objects, derived from a configuration file (more on that in the next bullet), and provides an API for checking updates - using the run\_watcher function, the WatcherManager does the work for you and returns a ChangeEvent instance, which contains information about whether or not there was a change, and if so what strings from the user’s interest lists were changed.

<figure class="kg-card kg-image-card">
  <img src="/content/images/2020/11/DraggedImage.png" alt="" loading="lazy" decoding="async">
</figure>

-   The configuration is stored in a file called config.json, and it looks like this:  
    

<figure class="kg-card kg-image-card">
  <img src="/content/images/2020/11/Screen-Shot-2020-11-20-at-17.46.09.png" alt="" loading="lazy" decoding="async">
</figure>

this configuration file contains an array of ‘watchers’ each of which is a JSON object containing a URL to monitor changes in and two lists, whitelist and a blacklist (I still have a logical bug there, which results in the blacklist being useless - I’ll solve it soon) which describe what changes are of interest to the user and whether or not there should be a notification for every change, even if it doesn’t involve the user’s strings.

## Step three: Deployment

Just kidding. The whole thing is dockerized, so all you need to do is basically:

```bash
docker build --tag website-watcher-bot:1.0 .
docker run --detach --name website-watcher website-watcher-bot:1.0 
```

The [README](https://github.com/OzTamir/WebsiteWatcher/blob/master/README.md) does a pretty good job of explaining this, so if you’re reading this post in order to understand how to run this project - refer to the README

## That’s It!

This was a fun afternoon project for me, and I’m happy I wrote this. I’ve tried my best to write a generic solution, and I believe that my code is concise and well documented - a project to be proud at. Oh, and it also works (which is important, I guess).

<figure class="kg-card kg-image-card">
  <img src="/content/images/2020/11/1.png" alt="" width="438" height="483" loading="lazy" decoding="async">
</figure>

Hopefully, I’ll also get a PS5 out of the deal sometime.

Maybe.

### A note about privacy

Telegram [isn’t known](https://restoreprivacy.com/secure-encrypted-messaging-apps/telegram/) for being the most private and secure texting app out there. I’m using it, but I wouldn’t use this platform or it’s bot services for anything you wouldn’t want anybody reading.

* * *

# Update:

I've written a [follow-up](/making-phone-calls-for-fun-and-profit/) for this post, in which I explain about changes I made to this project - including the ability to receive notifications via Phone calls. Check it out!
