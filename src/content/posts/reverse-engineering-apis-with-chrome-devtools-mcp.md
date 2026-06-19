---
title: Reverse Engineering APIs with Chrome DevTools MCP
pubDate: "2025-09-27T11:36:47.000Z"
updatedDate: "2026-06-18T23:46:05.000Z"
tags:
  - slug: mcp
    name: mcp
  - slug: agents
    name: agents
  - slug: programming
    name: Programming
  - slug: website
    name: website
  - slug: technical
    name: Technical
author: oz
featured: false
excerpt: Why should I go through network requests when an agent can do it for me?
featureImage: /content/images/2025/09/endpoints-1.png
---

As all good stories go, this one too starts with a wedding - my wedding.

As part of the preparations, I found myself working on a small vibe-coded project that required me to get my hands on a bunch of meme templates. We are not talking one or two - I needed every template I could get my hands on.

Luckily for me, I found an Israeli website loaded with a bunch of templates - thousands of memes, neatly categorized. Exactly what I needed.

The only problem: there was no easy way to get them out. No export button, no public API, just an endless scroll of templates locked behind the frontend.

So naturally, I decided I’d have to scrape it.

## Enter: Chrome DevTools MCP

While I was pondering what is the right approach here, I was scrolling X when I came across a newly released tool.

The Chrome team [had just announced](https://developer.chrome.com/blog/chrome-devtools-mcp) that they are releasing a public beta of their DevTools MCP - way for agents to interact directly with the browser.

Reading through their announcement, one feature immediately caught my attention: the MCP provided tools for inspecting network requests.

<figure class="kg-card kg-image-card">
  <img src="/content/images/2025/09/network_tools.png" alt="" width="1065" height="462" loading="lazy" decoding="async">
</figure>

Could this be exactly what I needed? Instead of manually digging through requests in DevTools, could I just point an agent at the site and ask it to figure out the meme website’s API for me?

## Task Failed Successfully

I set up the new Chrome MCP and connected it to Claude Code, which I instructed to research the website and come up with an API client.

This is the prompt I was using:

```md
You are a QA Engineer tasked with creating a Python script that interacts with an API in the company's website.

However, to ensure accurate testing, you were not provided with the API specs.

Instead, I want you to use your Chrome Tools to go to `[MEME_WEBSITE]` and inspect the network requests until you figure out how to interact with the API.

You can use other Chrome tools to interact with the website if needed.

Your output should be a Python script that implements an API client and another script that consumes it.

Use ultrathink .
```

> (If you're unfamiliar - `ultrathink` [is a magic word](https://simonwillison.net/2025/Apr/19/claude-code-best-practices/) that makes Claude work harder)

On paper, it sounded perfect. Claude would load the site, inspect the network requests through Chrome’s MCP, and reverse engineer the API without me having to touch DevTools manually.

In reality, it failed almost immediately.

The problem was that the website was sending too many requests, and when the agent used the MCP tool to get information, it would immediately hit it's token limits.

<figure class="kg-card kg-image-card">
  <img src="/content/images/2025/09/token_limit.png" alt="" width="867" height="71" loading="lazy" decoding="async">
</figure>

The experiment had technically worked — the MCP was capturing requests just fine — but there was simply too much noise for the LLM to handle.

## Open Source to the Rescue

At first I thought that was the end of it. If the MCP was going to drown in every single request, then this whole approach was dead on arrival.

But then I remembered — this wasn’t a black box product from Google. The DevTools MCP is [open source](https://github.com/ChromeDevTools/chrome-devtools-mcp). Which meant I didn’t have to accept its limitations. I could just… fix them.

So I cracked it open and started coding.

The main issue was that the `list_network_requests` tool returned everything in one giant dump. To overcome this, I added some parameters to the tool - allowing the calling agent to paginate and filter so that it would only get the requests it cares about, and would be able to process them in manageable chunks.

Half an hour later, I had a [pull request open](https://github.com/ChromeDevTools/chrome-devtools-mcp/pull/145) - and not long after, it was merged.

<figure class="kg-card kg-image-card">
  <img src="/content/images/2025/09/pagination-merged.png" alt="" width="1091" height="469" loading="lazy" decoding="async">
</figure>

For me, this was yet another cool demonstration of how open source tools are the best - if something ain't working for you, you can simply jump to the trenches and fix it for you and for everyone.

## One-shotting API clients with Claude

With my little side-side-quest over, I got back to the original side-quest - getting Claude Code to reverse engineer an API for me.

This time, thanks to the new pagination option, Claude was able to process the API requests in small chunks - and what can I say?

IT CRUSHED IT.

First, it identified the endpoints behind the meme feed:

<figure class="kg-card kg-image-card">
  <img src="/content/images/2025/09/endpoints.png" alt="" width="1878" height="911" loading="lazy" decoding="async">
</figure>

Then, it mapped out how the site organized categories, how the JSON payloads looked, and where the images were actually hosted:

<figure class="kg-card kg-image-card">
  <img src="/content/images/2025/09/network_requests.png" alt="" width="937" height="385" loading="lazy" decoding="async">
</figure>

And once it had a clear enough picture, it went ahead and started generating the Python API client:

<figure class="kg-card kg-image-card">
  <img src="/content/images/2025/09/api_client.png" alt="" width="976" height="252" loading="lazy" decoding="async">
</figure>

Boom. Nearly 300 lines of clean, working code. A fully reverse-engineered client for an undocumented API, generated in one shot.

Watching this unfold in real time felt surreal - like pair-programming with an intern who could read Chrome’s network tab faster than humanly possible.

## Conclusion

The Chrome DevTools MCP isn’t just another developer toy. It’s a genuine superpower for anyone doing web research, scraping, or API reverse engineering.

The ability to hook an agent directly into Chrome and let it see the same network requests you would in DevTools completely changes the workflow.

If your work involves poking at undocumented APIs, this tool deserves a spot in your toolbox. It takes what used to be a tedious, manual grind and turns it into a collaborative process with an agent that can actually do the heavy lifting.

And in my case? Well, all I got left is to make something worthwhile with all these meme templates.
