---
title: I’ve got Mail!
pubDate: "2022-05-10T18:48:41.000Z"
updatedDate: "2026-06-18T23:45:52.000Z"
tags:
  - slug: data
    name: Data
  - slug: web
    name: Web
author: oz
featured: false
excerpt: I've decided to start using a custom email service - here's how, and why.
featureImage: /content/images/2022/05/brett-jordan-LPZy4da9aRo-unsplash-1.jpg
ogDescription: I've decided to start using a custom email service - here's how, and why.
twitterDescription: I've decided to start using a custom email service - here's how, and why.
---

Invented in the ’70s as one of the first uses for the newly formed [ARPANET](https://en.wikipedia.org/wiki/ARPANET) (the predecessor to what we now think of when we say “the internet”), Electronic Mail - Email - is one of the technologies that has stood the test of time and remained a pillar of the modern digital world.

More than half a century after [the first email](https://web.archive.org/web/20060506003539/https://openmap.bbn.com/~tomlinso/ray/firstemailframe.htmlhttps://web.archive.org/web/20060506003539/https://openmap.bbn.com/~tomlinso/ray/firstemailframe.html) was sent, we still use email addresses as the basis for our digital dealings - we use them as our unique identifier for logging into services. We use them to organize our schedule through email-based calendars, and we use them to receive information from service providers all over the world, both the digital and the physical.

However, despite the enormous significance it has over our digital lives, most of us don’t care about controlling this key to our digital identity - we are perfectly alright with entrusting our emails with companies whose entire market is based on selling user information and ads (remember - if something’s free, you’re the product).

These are all thoughts that occurred to me after listening to a recent episode of [ATP](http://atp.fm) - and these thoughts are what prompted me to change my own life.

In this post, I’ll discuss why I’ve decided it’s time to own my mail, why I don’t _really_ own it, and what I ended up doing.

## Why

First of all, I’ll start with a confession - I still don’t **own** my email. As I will discuss in the “How” section, to truly own your email, you’ll have to run an email server of your own on a server you control, which is something I don’t want to do.

But still, owning your email isn’t just about running Dovecot on a VPS - it’s about trusting your email provider. Ever since I remember myself, I’ve been using Gmail as my email service provider - for most of my life, really. Why wouldn’t I? It’s free, it’s usable, and supported across every platform I’ve encountered.

<figure class="kg-card kg-image-card kg-card-hascaption">
  <img src="/content/images/2022/05/justin-morgan-D2TZ-ashGzc-unsplash.jpg" alt="Source: Justin Morgan, Unsplash" loading="lazy" decoding="async">
  <figcaption>Source: Justin Morgan, Unsplash</figcaption>
</figure>

But as I’ve said - it’s weird to let a company that makes its revenue from selling your information have control over your entire email history. Think about it - your email is a goldmine for advertisers. Everything you’ve ever bought online, right there, ready to be harvested by Google. And this isn’t just a dystopian idea - it’s [a reality](https://www.wsj.com/articles/techs-dirty-secret-the-app-developers-sifting-through-your-gmail-1530544442).

In addition, using Gmail means that you are tied to the Google brand. You’re not your@self; you’re yourself@gmail, and in our day and age - owning your digital identity and the way it is being perceived is one of the most important things you can do online.

## How

So as I’ve mentioned, I’ve opted not to go all-in and decided against running my own server.

Instead, I’ve elected to go on a more tame route and replace my email provider with a one that I trust would not use my data for evil, coupled with a custom domain.

For a domain, I’ve used [Hover](https://hover.com/bmUgIWNG) to purchase the domain `tamir.fun`, which seemed…fun (in addition to being one of the only TLDs available with `tamir`).

For the email provider, I’ve chosen [Fastmail](https://ref.fm/u28275181) as my email provider. Other than the warm recommendations from ATP’s hosts, I’ve read good stuff about them, and their privacy policy seemed reasonable - so I opened an account.

<figure class="kg-card kg-image-card">
  <img src="/content/images/2022/05/DraggedImage.png" alt="" loading="lazy" decoding="async">
</figure>

The first thing required to make the business tick is to change the domain’s MX records.

[MX records](https://en.wikipedia.org/wiki/MX_record) are a particular type of DNS records that specifies what server is responsible for receiving email messages sent to the domain (note that this only applies to incoming email - due to the way SMTP protocol works, you can [send an email from any address](https://en.wikipedia.org/wiki/Email_spoofing) without having to own the domain).

Luckily, the Fastmail onboarding process is very helpful, giving you a detailed tutorial on how to set up your email:

<figure class="kg-card kg-image-card">
  <img src="/content/images/2022/05/Screen-Shot-2022-05-10-at-20.39.26.png" alt="" width="1470" height="878" loading="lazy" decoding="async">
</figure>

Let’s do that! From Hover’s control panel:

<figure class="kg-card kg-image-card">
  <img src="/content/images/2022/05/DraggedImage-1.png" alt="" loading="lazy" decoding="async">
</figure>

The next thing is to set a bunch of other records:

<figure class="kg-card kg-image-card">
  <img src="/content/images/2022/05/DraggedImage-2.png" alt="" loading="lazy" decoding="async">
</figure>

~Why are these required? Without these, I could register an account with any domain whose MX records point to Fastmail’s servers and get emails for this domain.  
These records let Fastmail verify that I am in control of the domain that I wish to connect to my account. And why won’t I censor some of these so-called keys? Because they are to be set as DNS records - available for the whole world to see.~

Actually, Fastmail's own Ricardo Signes ([@rjbs](https://twitter.com/rjbs)) was kind enough to reach out (via, of course, email) and point out that this last paragraph is actually incorrect.

These CNAME records are in fact a part of an authentication method called [DKIM](https://en.wikipedia.org/wiki/DomainKeys_Identified_Mail) which is used to confirm to the recipient of emails sent from your domain that you - the domain owner - authorized the messages sent on your behalf. For more information, Fastmail actually [posted about it](https://fastmail.blog/advanced/what-you-can-do-to-keep-your-messages-out-of-spam-folders/) not so long ago. Thanks, Ricardo!

Now that we understand what these records are - let's apply these records:

<figure class="kg-card kg-image-card">
  <img src="/content/images/2022/05/DraggedImage-3.png" alt="" loading="lazy" decoding="async">
</figure>

And ask Fastmail to check if we did everything right:

<figure class="kg-card kg-image-card">
  <img src="/content/images/2022/05/DraggedImage-4.png" alt="" loading="lazy" decoding="async">
</figure>

And…Victory!

<figure class="kg-card kg-image-card">
  <img src="/content/images/2022/05/DraggedImage-5.png" alt="" loading="lazy" decoding="async">
</figure>

And after trying - it works!

<figure class="kg-card kg-image-card">
  <img src="/content/images/2022/05/DraggedImage-6.png" alt="" loading="lazy" decoding="async">
</figure>

## What now?

Another one of the features I’ve liked about Fastmail is the ability to import all of your emails over from other services:

<figure class="kg-card kg-image-card">
  <img src="/content/images/2022/05/Screen-Shot-2022-05-10-at-20.59.02.png" alt="" width="1922" height="810" loading="lazy" decoding="async">
</figure>

And not only would they import historical information, but they’ll also set up forwarding for future emails!

<figure class="kg-card kg-image-card">
  <img src="/content/images/2022/05/DraggedImage-7.png" alt="" loading="lazy" decoding="async">
</figure>

And the import process is blazing fast - I thought it would take a couple of days, but it was done within half an hour (or even less!)

<figure class="kg-card kg-image-card">
  <img src="/content/images/2022/05/DraggedImage-8.png" alt="" loading="lazy" decoding="async">
</figure>

So what now?

My current plan is to keep using these two addresses simultaneously and try to limit my usage to the new one from now on.

Let’s see if I can keep it up.

## Conclusion

It’s scary to change your primary email address. As I’ve said - your email address is the key to your digital life. Changing it requires a leap of faith - the faith that everything will continue to function. But on the other hand, you must remember - the more control you have over it, the more control you have over your digital life and the less power you hand over to other companies.

<figure class="kg-card kg-image-card kg-card-hascaption">
  <img src="/content/images/2022/05/onlineprinters-oIpJ8koLx_s-unsplash.jpg" alt="Source: Unsplash" loading="lazy" decoding="async">
  <figcaption>Source: Unsplash</figcaption>
</figure>

As it is always, control comes at the cost of comfort. Running your own server will give you total control, but you will lose the ease of a managed service. It’s a tradeoff - and while going to the extreme on the control front is probably not what most people want or need - neither is the total lack of one, which is what most of us do when we register our Gmail account.

Find balance.
