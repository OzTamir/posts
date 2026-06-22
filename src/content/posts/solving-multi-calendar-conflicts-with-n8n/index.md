---
title: Solving Multi-Calendar Conflicts with n8n
date: '2025-06-02T15:18:26.000Z'
updatedDate: '2026-06-18T23:46:03.000Z'
author: oz
description: How I defended my WLB with a Google Calendar workflow
image: featured.png
tags:
  - n8n
  - automation
  - calendar
featured: false
draft: false
---
Like most folks, my work calendar and my personal ones live in different accounts. And when I schedule something over on my private calendar (one of them, I use four different ones because I'm crazy), my coworkers don’t see any of that - they only see my work calendar.

So when they’re looking for a free slot, it looks like I’m wide open - even if I’ve already committed to something else. And it's driving me crazy.

![](slack-reschedule-request.png)

This past week, after enough double-bookings and awkward “hey, can we reschedule?” messages, I got tired of manually fixing things. I wanted my work calendar to at least know when I’m busy, even if it doesn’t need to know why.

Like most recurring annoyances in my life, this felt like something I should be able to automate.

## Oh yeah, it's automation time

The idea was simple: take events from my personal calendars and reflect them onto my work calendar as generic “busy” blocks. No details, no descriptions. Just enough to stop coworkers from accidentally double-booking me.

To make this work, I had a few clear requirements:

-   **Local-first** - I didn’t want to give any third-party service read/write access to both my personal and work calendars.
-   **Full control** - I wanted to decide which events to sync, how they’d be translated, and what metadata (if any) gets shared.
-   **Minimal setup** - Ideally, something I could get running in under an hour without writing a pile of boilerplate.

Since I already had a local n8n instance running (left over from another automation [I built around WhatsApp MCPs](/i-now-use-ai-agents-to-text-you-back/#setting-up-n8n)), it felt like the obvious choice. It ticked all the boxes — and I jumped straight into it.

## Setting Up Google Calendar Access

Before I could do anything useful, I needed to let n8n access my personal calendars.

![](google-oauth-permission-screen.png)

That meant setting up a Google Cloud project, enabling the Calendar API, configuring the OAuth consent screen, and creating OAuth2 credentials.

Nothing too surprising, just a series of Google Console forms you have to fight through. In the credentials setup, I selected “Web application” as the type and added n8n’s OAuth2 redirect URI.

![](gcloud-oauth-client-list.png)

Once Google gave me the Client ID and Secret, I dropped them into a new credential in n8n using the built-in Google OAuth2 option.

![](n8n-calendar-credential-form.png)

If you’ve ever done anything with Google APIs, you’ve seen this dance before. If not, the [n8n docs](https://docs.n8n.io/integrations/builtin/credentials/google/oauth-generic/#enable-apis) explain it better than I want to.

## Automating the Sync

The workflow I created runs every 6 hours. That’s usually frequent enough to keep things in sync without spamming the API or hammering my work calendar.

![](n8n-full-sync-workflow.png)

The first thing it does is fetch events from my personal calendars that were updated in the last 6 hours.

This includes new events, updates, and cancellations - basically anything that might require an update on the work calendar side.

![](n8n-get-events-node.png)

Each calendar (I have a few) gets queried separately using the `getAll` operation on the Calendar API.

I use the `updatedMin` parameter to filter only recent changes, which is 6 hours in my case:

```
{{ $now.minus({ hour: 6 }) }}
```

After pulling from all of my personal calendars, the events are merged into a single list and processed from there.

## Syncing Events to Work Calendar

Once all updated events are pulled and merged, the workflow goes over each one and decides what to do based on its state.

### Cancelled Events

If the event was cancelled, it’s deleted from the work calendar. I check for `status === "cancelled"` and route those into a Delete node.

![](n8n-cancelled-condition-node.png)

Nothing fancy. If it’s no longer happening, it shouldn’t block time on the work side either.

![](n8n-delete-event-node.png)

### New Events

If the event is new, it gets copied over to the work calendar. The copied version keeps the same start and end time, but I override a few fields to keep things clean and private:

-   The event is marked as `private`
-   The title is just `"Blocked for Personal Event"`
-   Visibility is set to “busy” so it shows up as unavailable to coworkers

I might eventually include the original event title here, but since I don’t know exactly who can see what in our org’s calendar setup, I’m staying on the side of caution for now.

![](n8n-create-blocker-node.png)

### Updated Events

If the event already exists on the work calendar (based on ID), the creation step throws an error. I catch that and instead run an update, making sure the start and end times are synced.

![](n8n-update-event-node.png)

This takes care of reschedules or time changes without having to delete and recreate anything.

# Wrapping Up

This workflow has been running quietly in the past week, and so far it’s doing exactly what I wanted: keeping my work calendar aware of my personal time, without oversharing or manual juggling.

![](blocked-personal-event-result.png)

It’s not doing anything groundbreaking (just moving data from A to B with a bit of filtering and formatting) but that’s the kind of automation I like best. Clear input, predictable output, no surprises.

I might tweak it over time (maybe loosen up the visibility settings, or add color-coding per calendar), but for now, it’s doing the job.

My calendars don’t fight anymore.

That’s a win.
