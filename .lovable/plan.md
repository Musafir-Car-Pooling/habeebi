# HaBeeBi — languages, speed, multi-service, splash & onboarding

## 1. New name & logo
- App name **HaBeeBi** everywhere (header, login, page titles, admin settings default). Slogan stays "an ultimate service provider".
- New logo: generated bee/heart-style brand mark in lime + dark (inDrive look). Used in header, splash, login, and as favicon.

## 2. Splash screen
- Opening the app shows a full-screen splash (logo pop + soft pulse, ~1.5s), then goes to onboarding (first visit), or login / home.

## 3. 5 onboarding screens (first visit only, skippable)
1. Har service ek app mein — electrician, plumber, maid, cook…
2. Apni price khud lagayein — offer in AED
3. Location + voice note se request bhejein
4. Live bids — ratings dekh kar best chunein
5. Contact + in-app chat after accept
- Swipe / Next, dots indicator, Skip, "Get started" on last. Language picker on first screen.

## 4. Languages
- Default **English**. Options: English, اردو (Urdu), Roman Urdu, हिन्दी (Hindi), 中文 (Chinese), العربية (Arabic), Bengali, Tagalog.
- Picker on onboarding, login page and profile. Choice remembered on the device.
- Urdu & Arabic switch layout to right-to-left.
- All app buttons, labels and messages translated (users' own text like job descriptions stays as typed).

## 5. Multi-service providers
- Sign up: provider can tap multiple services (Citizen remains a single choice).
- Provider receives open requests from **any** of their services; feed shows which service each request is for.
- Profile: provider can add/remove their services. Admin users tab: edit a user's services (multi-select).
- Existing single-category providers are carried over automatically.

## 6. Lighter & smoother
- Map loads only when tapped/visible (no map iframe in lists), lazy load voice player.
- Fewer database round-trips: combine the "who am I" lookups, cache categories longer, stop refetching on every window focus.
- Realtime feed only refreshes that provider's relevant requests (filtered), not every change app-wide.
- Lighter animations (GPU transforms only), remove backdrop blur on header, preload route code on tap.

## Technical details
- New table `provider_services(provider_id, category_id)` with RLS (self manage, admin manage, readable by authenticated); backfill from `profiles.category_id`. `my_category()` replaced by `is_my_service(category_id)` used in request/bid policies. Signup trigger reads `category_ids` array from metadata.
- i18n: lightweight in-house dictionary (`src/lib/i18n.ts`, React context, `t(key)`), stored in localStorage, read after hydration; sets `<html dir/lang>`.
- Splash/onboarding on `/` route; seen flag in localStorage.
- QueryClient defaults: `staleTime` 30s, `refetchOnWindowFocus: false`; `defaultPreload: "intent"` on router.
- Logo via image generation → `src/assets` + `public/favicon.png`.
