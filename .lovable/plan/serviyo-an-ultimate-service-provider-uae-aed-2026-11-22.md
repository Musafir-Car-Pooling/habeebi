# Serviyo — An Ultimate Service Provider (UAE, AED)

inDrive jaisa design: dark/black background, lime-green (#C1F11D jaisa) primary buttons, bold rounded sans font (Manrope/Inter Tight alternative), mobile-first cards.

## Users & Registration
- Sign up: name, phone, email, password, category select (Citizen ya koi service jaise Electrician, Plumber, Home Cleaner, Maid, Cook, Chef, Labour...). Categories admin ki list se aati hain.
- Login: email + password. `pp@gmail.com / ppllmm` login par Admin Dashboard khulega (ye account admin role ke sath seed hoga, role server pe check hoga).

## Citizen flow
1. Home: category grid select karein.
2. Request form: task description box, offered price (AED), GPS "Use my current location" button (map pin + address), WhatsApp jaisa voice note (hold to record, playback, delete), optional photo.
3. "Send Request" → "Searching your service provider..." screen with pulse/radar animation; bids live aati rehti hain (provider name, rating, reviews, offer AED, ETA) — Accept / Decline.
4. Accept par dono ko ek dosray ka contact number dikhe + in-app chat khule.
5. Job complete → rating (1-5 stars) + review.

## Service Provider flow
- Sirf apni category ki open requests live feed mein (plumber ko plumber requests).
- Request detail: description, voice note sunna, location/distance, citizen price.
- Bid: citizen price accept karein ya apni counter offer (AED) + message.
- My jobs: accepted jobs, contact number, chat, mark complete.
- Profile: rating average, reviews list.

## In-app Chat
Har accepted job ka realtime chat (text messages).

## Admin Dashboard
- Overview stats: users, providers, requests, bids, completed jobs, revenue-like totals.
- Services/categories: add, edit, delete (name, icon, active on/off).
- Users: list, search, filter by category, block/unblock, delete.
- Requests: sab requests, status, cancel/delete.
- Bids & reviews: view, delete inappropriate reviews.
- App settings: app name/slogan, currency (AED), commission %.

## Technical details
- Lovable Cloud: auth (email/password, auto-confirm), tables: profiles, user_roles (admin role separate), service_categories, service_requests (lat/lng, address, voice_url, price_aed, status), bids, chat_messages, reviews, app_settings. RLS: providers see only open requests of their category; contact numbers revealed only after acceptance (via secure function).
- Storage bucket for voice notes/photos. Realtime for bids and chat.
- Voice notes via MediaRecorder; GPS via browser Geolocation + reverse geocode (OpenStreetMap Nominatim) and a Leaflet map preview.
- Admin seed: migration-created admin account for pp@gmail.com with admin role.
- Routes: /, /auth, /_authenticated/{home, request/new, request/$id, provider, jobs, chat/$id, profile, admin/*}.
