---
title: Making phone calls for fun and profit
pubDate: "2020-11-22T21:27:49.000Z"
updatedDate: "2026-06-18T23:45:42.000Z"
tags:
  - slug: technical
    name: Technical
  - slug: python
    name: Python
  - slug: projects
    name: Projects
  - slug: twilio
    name: Twilio
  - slug: bots
    name: Bots
author: oz
featured: false
excerpt: How I learned to stop worrying and love design breaking code changes
featureImage: /content/images/2020/11/CR-Money-InlineHero-RoboCalls-ProtectYourself-4-19.jpg
metaDescription: How I learned to stop worrying and love design breaking code changes
---

In my [previous post](/writing-telegram-bots-for-fun-and-profit/), I’ve talked about how I thought writing Telegram bots in order to monitor sites for changes I’m waiting for is a sleek solution to rid me of the need to constantly check those sites myself.

And while it is, by far, a much more convenient method of staying up to date, it’s not perfect - sometimes, a notification on my phone is not enough to catch my attention (or, you know, to wake me up). And as we’ve covered in the previous post, getting these notifications as soon as possible is crucial - otherwise I’m left without my much desired PlayStation 5.

In order to solve this problem, I’ve used my afternoon today to improve [WebsiteWatcher](https://github.com/OzTamir/WebsiteWatcher) and rebuild it with a powerful new feature - the ability to make phone calls! Now, when a site I’m monitoring has been changed, I will get a phone call - and these are way harder to ignore (although, when I sleep real good…).

<figure class="kg-card kg-image-card">
  <img src="/content/images/2020/11/CR-Money-InlineHero-RoboCalls-ProtectYourself-4-19-1.jpg" alt="" width="1199" height="674" loading="lazy" decoding="async">
</figure>

As it was with the previous version, the code is all up on GitHub under the MIT license. The README file has been updated as well with instructions about how to setup the project, and with this post it should be clear to you, the readers, how to go about making your own setup.

## Twilio

<figure class="kg-card kg-image-card">
  <img src="/content/images/2020/11/maxresdefault.jpg" alt="" width="1280" height="720" loading="lazy" decoding="async">
</figure>

The magic behind this new feature is Twilio’s Voice Response API. From Wikipedia:

> Twilio is an American cloud communications platform as a service (CPaaS) company based in San Francisco, California. Twilio allows software developers to programmatically make and receive phone calls, send and receive text messages, and perform other communication functions using its web service APIs.

As you can see, Twilio is a company which allows developers to easily send and receive phone calls or SMS messages from their code. I should note that I haven’t done **any** price or features comparison with rival services, but this is what I had in my head when I started so this is what I went with.

Setting up Twilio was quite the breeze - after you [sign up](/p/65b382ef-1d68-49fe-8f6a-1141b40f87cb/www.twilio.com/referral/QV0FoN) (notice - this is a [referral link](https://sitechecker.pro/what-is-referral-link/)), you buy a number (I choose one that only supported voice calls as I did not intend on using the SMS capabilities, it was $4 and I got a landline number here in Israel) and get two ‘secrets’ - an Auth token and a SID:

<figure class="kg-card kg-image-card">
  <img src="/content/images/2020/11/Screen-Shot-2020-11-22-at-22.25.54.png" alt="" loading="lazy" decoding="async">
</figure>

Using these two, it is incredibly easy to call a number with a message:

<figure class="kg-card kg-image-card">
  <img src="/content/images/2020/11/Screen-Shot-2020-11-22-at-22.27.47.png" alt="" loading="lazy" decoding="async">
</figure>

This sample is [taken](https://www.twilio.com/docs/voice/make-calls?code-sample=code-make-an-outbound-call-to-a-phone-number&code-language=Python&code-sdk-version=6.x) from Twilio’s documentation, and I encourage you to read their docs if you wish to use their services for development. But enough about Twilio, let’s talk WebsiteWatcher.

## A word about implementing a design-breaking change

The biggest problem with adding this feature to WebsiteWatcher was that WW was never designed to support this kind of addition. In fact, it wasn’t built to support any kind of feature addition of that nature - WW was designed as a Telegram bot, not a general-purpose generic notifier solution. It had no support for any other method of notifications, nor did it had the architectural structure required to implement such a change.

This was a valuable lesson for me - when designing complicated software solutions that aim to be generic, always build the code in a way that would support swapping any part of the functionality. I’m not sure that this attitude is the most cost-effective one, but I feel like designing my code in that way would allow me a great deal of flexibility if I would ever want to add new features or support more ways of achieving the task at hand - and therefor, it might actually be the more cost-effective way in the long run.

## Breaking into pieces, brick by brick

The way I went about breaking WW into a multi-mode solution relied on the face that I had separated most of the “URL Watching” logic from the “Telegram Bot Messaging” logic. This separation allowed me to use the WatcherManager package almost without any changes - the only thing I changed was the wrappers around it.

I started by breaking up the secrets management design and instead opting to rely on the [config.json](https://github.com/OzTamir/WebsiteWatcher/blob/master/config.json) configuration file to keep all the configuration in a single place, including the secrets (such as the tokens used for authentication with the services APIs). I even went one step further, and defined a Python class that will represent the file on disk in the Python code:

<figure class="kg-card kg-image-card">
  <img src="/content/images/2020/11/DraggedImage-4.png" alt="" loading="lazy" decoding="async">
</figure>

Notice that adding this abstraction later helped me - each code part only deals with the relevant part of the configuration, and that is way I can allow myself to only parse the relevant part and ignore the empty configuration for the non-used mode.

The second change I made was changing the entry point to the code - instead of the Dockerfile running bot.py, I am now running the mode-choosing logic first - I parse the configuration, load it into a Configuration() object, and only then do I decide how to proceed.

The logic of the bot is now contained inside a single class under `telegram_bot.py`, and the logic for the Twilio mode is, you guessed it, under `twilio_mode.py`. This change also made the code a lot more readable - instead of being thrown straight into the Bot’s entry point, anybody who’s reading the code now starts with [this](https://github.com/OzTamir/WebsiteWatcher/blob/master/src/websitewatcher.py#L38):

<figure class="kg-card kg-image-card">
  <img src="/content/images/2020/11/DraggedImage-1.png" alt="" loading="lazy" decoding="async">
</figure>

Much more readable. This separation of logic, across all levels of the project, made this transition very smooth and allowed me to rewrite the logic of the core app very quickly, and in a very short amount of time I was done with the restructuring and could focus on writing the call-making logic, which was also very simple - I took the same logic from the Telegram bot loop, and implemented a similar loop.

The only change was that this time, instead of sending each message on it’s own, I had to find a way to easily send a few messages over a phone call (which is essentially a text to speech service when you think about it) without the messages running over each other and confusing the user. Luckily, Twilio’s API came to the rescue with the [Pause](https://www.twilio.com/docs/voice/twiml/pause) API, which provided an easy way to create a response which had a timed delay in it, like this:

<figure class="kg-card kg-image-card">
  <img src="/content/images/2020/11/DraggedImage-2.png" alt="" loading="lazy" decoding="async">
</figure>

This timed delay made my job a lot easier, and meant that I could just string my messages in a simple for loop, adding a 1-second pause at the end of each message to signify that a different message is now being read:

<figure class="kg-card kg-image-card">
  <img src="/content/images/2020/11/DraggedImage-3.png" alt="" loading="lazy" decoding="async">
</figure>

Finally, I wrote a simple loop (while True; run wacther loop; sleep; repeat) that was the equivalent of the Telegram bot’s event loop (which is implemented behind the scenes with the [APScheduler](https://github.com/agronholm/apscheduler) library, but I figured that a simple loop would also do the work) and viola!

<figure class="kg-card kg-image-card">
  <img src="/content/images/2020/11/IMG_158F150F8D7E-1-1.jpeg" alt="" width="472" height="932" loading="lazy" decoding="async">
</figure>

I started getting notifications as phone calls, and it worked great.

## Conclusion

Before I’ll talk about the lesson I took from this project, I would like to once again take a minute to acknowledge how awesome being a developer is. In one after noon, I wrote a system that just a few years back could’ve made an entire business with tens of employees. And the face that we have all these systems, and all these tools, and all these capabilities, available to us at an absurdly low rates - is truly amazing.

Finally, the main lesson I took from this afternoon project is that good code design is the make or break of software development. Having a design that can last fundamental changes to the way the code is used and behaves is having a strong backbone to the project, one that can prevent you from coding your way into a corner or having to totally re-write your entire project just to accommodate small changes.

Hopefully, in my next project I will do better at this.
