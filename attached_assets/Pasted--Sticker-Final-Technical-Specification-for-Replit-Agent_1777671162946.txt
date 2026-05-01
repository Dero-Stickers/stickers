# Sticker — Final Technical Specification for Replit Agent

## Project Objective

The project is called Sticker.

Sticker is a web app/PWA that allows users to manage, share, and exchange Panini-style collectible stickers with other users.

The goal is not to create a simple draft, but to build a professional, organized, scalable, clean, and genuinely usable technical foundation.

The first development session will use Replit Agent in Power Mode to build a complete user-side demo, a working admin foundation, realistic mock data, technical documentation, and a structure ready for future evolution.

The app must be portable from the beginning, not locked to Replit, continueable in other development environments, and prepared for future deployment on Render.

## Required Working Method for Replit Agent

Work with technical autonomy.

Do not follow a fixed structure if you believe a different solution is better.
Choose the most suitable architecture to build a solid, clean, scalable, and portable app.

Before developing, carefully analyze:
- this technical specification;
- the attached logo;
- the user app screenshot;
- the admin screen screenshot;
- all provided attachments.

Use the logo and screenshots as visual references for palette, style, layout, and overall app tone.

Do not start coding random screens immediately.
First define the correct technical foundation of the project.

The first mandatory step is to set up a clean, modular, and maintainable code structure.

Then proceed autonomously in the most efficient way to reach a working, testable, and documented demo.

Do not stop after every micro-step.
Report only after important blocks, relevant decisions, or real issues.

During development, behave like a professional developer and like a real user testing the app:
- open the screens;
- navigate through the pages;
- click the buttons;
- verify the flows;
- check states and mock data;
- fix UI bugs;
- fix logic bugs;
- keep the documentation updated.

## Non-Negotiable Technical Principles

The project must be a web app/PWA, not a native mobile app.

Do not use Expo in the baseline.

Frontend and backend must be able to coexist in the same project.

The project must be prepared for a future single deployment on Render.

GitHub commit/push and Render deployment must not be automatic.
They will be manually decided by the user when the app is working correctly.

Supabase will be the main future database, but in the first phase the app must work with realistic mock data.

Mock data must be separated from the application code and easy to remove.

Future Supabase integration must be planned without requiring a full rewrite of the app.

Do not implement now:
- real payments;
- domain setup;
- App Store / Google Play publication;
- unnecessary external services;
- automatic emails;
- GPS;
- advertising tracking;
- invasive analytics.

The code must be:
- modular;
- readable;
- clean;
- scalable;
- portable;
- without unnecessary duplication;
- without monolithic files;
- without parallel logic;
- without useless permanent placeholders.

## Recommended Architecture

The recommended technical structure is:
- React frontend;
- Node/Express backend;
- frontend and backend in the same project;
- separated mock data;
- separated services/logic;
- future Supabase preparation;
- future Render deployment preparation.

You may freely choose the folder structure, but it must be clear and professional.

The structure must support at least:
- mobile-first user app;
- admin panel;
- mock data;
- authentication services;
- album services;
- sticker services;
- matching services;
- chat services;
- demo/premium services;
- admin services;
- DNA folder;
- backup folder.

## Language and General Style

The baseline app must be only in Italian.

Do not implement multilingual support in the first version.

All user-facing app text must be in Italian: labels, buttons, messages, admin UI, onboarding, legal placeholders, mock content, alerts, and navigation.

Use standard English naming conventions for code, files, folders, components, functions, services, and internal implementation where appropriate.

Write DNA documentation, reports, and working notes in Italian, except for standard technical terms where English is more appropriate.

The app must have a clean, modern, touch-friendly interface, with a young but not childish tone.

The app must be light mode only.
Do not implement dark mode in the baseline.

The main background must be light.

Avoid unnecessary containers.
Keep the interface clean, light, and readable.

Only the areas that truly require scrolling should be scrollable:
- long lists;
- sticker grids;
- tables;
- admin lists.

## Users, Registration, and Login

The initial user registration must require:
- nickname;
- personal PIN;
- ZIP/postal code;
- mandatory security question;
- answer to the security question.

The following must not be mandatory:
- email;
- classic password;
- Google login;
- Apple login;
- phone number;
- personal address;
- GPS;
- real geolocation.

The nickname must be unique only within the same ZIP/postal code.

Daily access must use:
- nickname;
- PIN.

The ZIP/postal code is requested during the first registration and used for nearby match logic.
It must not be requested at every login.

The app must remember access on the device until the user manually logs out.

Nickname and PIN must be requested again only in case of:
- manual logout;
- invalid local session;
- device change;
- app/PWA reinstall;
- updates that require a new login.

The public profile visible to other users must show:
- nickname;
- generic area based on ZIP/postal code;
- exchange statistics;
- reliability.

In the baseline, user reliability must be based only on the number of completed exchanges.

## Account Recovery

After registration, the app must generate a personal recovery code.

The recovery code is used to:
- recover the profile;
- recover access;
- protect possible future purchases;
- reconcile possible premium status or one-time payment.

The recovery code must be shown immediately after registration.
The app must clearly invite the user to save it or take a screenshot.

The recovery code must remain accessible in the Profile section, but only after PIN confirmation.

Recommended text:
“Salva questo codice: serve per recuperare il profilo e gli eventuali acquisti. Se lo perdi, il recupero potrebbe non essere possibile o potrebbe richiedere verifica manuale.”

If the user forgets the PIN, baseline recovery must happen through the recovery code.

PIN recovery flow:
- the user enters the recovery code;
- the app verifies the code;
- if valid, the user creates a new PIN;
- the profile remains the same;
- albums, states, demo, and premium remain connected to the same account.

The security question is mandatory and serves as emergency support for manual admin recovery.

If the user loses the phone/app and no longer has the recovery code, they may contact the admin through the support email visible in the app.

Emergency admin procedure:
- the user contacts the admin by email;
- the admin searches for the user in the user archive;
- the admin verifies nickname, ZIP/postal code, security question, and other minimum available elements;
- if the verification is coherent, the admin may help recover the profile or generate a new code;
- the admin action must be tracked.

Do not guarantee automatic recovery if the user loses all security data.

## Albums and Stickers

The app must support multiple Panini-style albums created by the admin.

Initially, the albums will mainly be Calciatori Panini-style albums, but the structure must remain scalable for future albums.

Albums are created by the admin in the “Album disponibili” section.

Each available album must have:
- short title, for example “Calciatori 2024-2025”;
- album poster/cover;
- complete sticker list;
- sticker number;
- sticker name or description.

Albums must already be complete with stickers when published by the admin.

The admin must be able to quickly insert stickers through copy/paste of a numbered list.

After the quick insert, the admin must be able to manually edit individual stickers to correct:
- number;
- name;
- description.

The user cannot modify the album structure.
The user cannot modify number, name, description, cover, or official album data.

The user can only manage the state of their own stickers.

The user-side Album section must have two areas:
- I miei album;
- Album disponibili.

In “Album disponibili”, the user sees the albums created by the admin but not yet added to their profile.

In “I miei album”, the user sees the albums already selected/owned.

When the user clicks “Aggiungi album”:
- the album is added to their albums;
- all stickers start as Mancanti;
- the album becomes manageable by the user.

Each album can contain more than 600 stickers.

The sticker grid must be compact, scrollable, and touch-friendly.

Each sticker must be displayed as a small card.

Each card must show:
- sticker number;
- state color.

The states are:
- Mancante;
- Posseduta;
- Doppia.

State colors:
- Mancante = white;
- Posseduta = green;
- Doppia = red.

By tapping a card multiple times, the state changes cyclically:
Mancante → Posseduta → Doppia → Mancante.

In the baseline, no user-side quick-entry mode using typed or pasted numbers is needed.
For the first version, cyclic tapping on the cards is enough.

The album screen must include:
- single scrollable grid;
- filter by state: Mancanti / Possedute / Doppie.

A long press on the card must open a centered mobile modal with:
- sticker number;
- name or description entered by the admin.

The album summary must include:
- total stickers;
- owned stickers;
- missing stickers;
- duplicate stickers;
- completion percentage.

The user must be able to remove an album from their profile with clear confirmation.

When the user removes an album from their profile:
- the album is removed from their albums;
- the sticker states for that album are removed;
- matches are recalculated without that album;
- the match detail must no longer show stickers from that album;
- the chat between two users must not be automatically deleted if other compatible albums remain between the same users;
- if after removal there is no longer any valid match between those two users, the chat may be hidden, closed, or kept only as technical history, according to the cleanest solution chosen by Replit Agent.

## Onboarding

On first access, an onboarding guide with bubbles/tooltips must appear.

The guide must be reopenable from the Profile section.

The guide must explain:
- album management;
- sticker states;
- matches;
- chat;
- premium demo;
- ZIP/postal code privacy.

## Matching and Exchanges

The exchange logic must always be 1-to-1.

A user can give one duplicate sticker and receive one missing sticker in return.

There must be no 2-to-1, 3-to-1, or unequal-value exchanges.

A valid match between two users exists only if both conditions are true:
- user A has at least one duplicate that user B is missing;
- user B has at least one duplicate that user A is missing.

The maximum number of suggested exchanges must be the maximum number of actually possible 1-to-1 exchanges.

Matching must not be limited to a single album.

The match must be calculated between two users across all albums selected/owned by both users.

Example:
- 20 possible exchanges on one album;
- 30 possible exchanges on another album;
- 50 possible exchanges on a third album;
- total match = 100 potential 1-to-1 exchanges.

The match list must include two main views:
- Migliori match;
- Vicini a te.

“Migliori match” sorts users by the highest number of possible 1-to-1 exchanges.

“Vicini a te” sorts users by proximity calculated through ZIP/postal code.

The match detail must be multi-album and show:
- other user’s nickname;
- generic area based on ZIP/postal code;
- total potential 1-to-1 exchanges;
- list of involved albums;
- number of exchanges per album;
- list of exchangeable stickers for each album;
- “Tu dai” section;
- “Tu ricevi” section;
- “Apri chat” button always visible.

The match detail layout must be intuitive, clean, and very user-friendly, because the app may also be used by children or young users.

## ZIP/Postal Code, Distance, and Location Privacy

Proximity between users must be managed using the ZIP/postal code as a reference point.

Do not use:
- GPS;
- real geolocation;
- personal address;
- precise user position.

The app must show only a generic area, not sensitive personal data or precise location.

There must be a filter/slider to decide the maximum search radius for nearby matches.

Distance slider values:
- 5 km;
- 10 km;
- 20 km;
- 50 km;
- 100 km.

Distance must be approximate and based on ZIP/postal code.

In the mock phase, distance by ZIP/postal code may be simulated with example data.

In the future Supabase integration, provide a data structure to associate ZIP/postal code with area/zone and approximate coordinates useful for distance calculation.

Do not store or show personal addresses.
Do not use GPS.
Do not show precise coordinates to the user.

## Chat

The chat must be connected to the two users, not to the single album.

A user must have only one chat with another user, even if they share multiple albums.

The chat must be integrated inside the Match section.
It must not be a separate footer item.

The chat must open only from a valid match.

The chat must be available only to premium users or users with an active premium demo.

A short moderation notice must appear in the chat.

Recommended text:
“Per sicurezza e moderazione, i messaggi possono essere verificati dall’admin in caso di necessità o segnalazione.”

The admin must be able to:
- see chats if necessary;
- review chats in case of report;
- block a user;
- close a problematic chat.

There must be a “Segnala” button inside the chat or profile.

Reports must be visible in admin or at least prepared in the data structure.

Chat safety must include:
- message saving;
- chat linked to the two users;
- active/closed chat state;
- user blocking;
- essential tracking of admin actions.

## Free Mode, Demo, and Premium

The free version must be useful for personal sticker management.

The free version allows:
- album management;
- sticker management;
- missing stickers;
- owned stickers;
- duplicate stickers;
- match viewing.

The real exchange function is premium.

The main limitation of the free version is the inability to open exchange chats.

Premium unlocks the app 100%.

A premium user can use:
- album management;
- matches;
- nearby matches through ZIP/postal code;
- exchangeable sticker details;
- chat opening;
- chat writing;
- complete exchange function.

The premium demo applies only to the user side.
The admin is not subject to demo limitations.

The initial premium demo must last 24 hours.

The demo duration must be configurable and editable by admin.
It must not be hardcoded.

The demo must start when the user tries to open a chat/exchange for the first time.

It must not start:
- at registration;
- when opening the app;
- when viewing albums;
- when simply viewing matches.

When the user tries to open the first chat, an explicit message must appear informing them that they are activating the premium demo.

The message must clarify that, once the demo ends, payment will be required to open an exchange chat.

During the active demo, the user uses the entire exchange function as premium.

When the demo expires, the user can still:
- manage albums;
- change sticker states;
- view albums;
- view matches;
- view compatible users.

When the demo expires, the user can no longer:
- open exchange chats;
- actually use the exchange function.

Demo anti-abuse:
- nickname + PIN account;
- ZIP/postal code;
- anonymous device/browser identifier;
- light technical controls on the database side;
- clear limits;
- admin anomaly management.

Avoid immediate mandatory email or phone number in the baseline.

## Payments

Do not integrate real payments in the baseline.

Do not integrate now:
- Stripe;
- PayPal;
- real payments;
- real store purchases.

The payment area must only be prepared.

The logic must include:
- free user;
- active demo;
- expired demo;
- premium user;
- prepared one-time payment;
- prepared monthly subscription;
- prepared yearly subscription;
- simulated paywall;
- disabled or simulated payment buttons.

The final choice between one-time payment, monthly subscription, or yearly subscription will be defined later.

When the app is published on Apple App Store or Google Play Store, payments must be compatible with store rules and purchase recovery.

The user must not lose premium rights if they change device or recover the profile.

## Supabase, Database, and Mock Data

Supabase will be the main future database.

In the first phase on Replit, the app must work with mock/example data.

Mock data is used to build and test:
- interface;
- user flows;
- albums;
- stickers;
- states;
- matching;
- chat;
- premium demo;
- admin;
- simulated paywall.

Mocks must be temporary, separated, and easy to remove.

During the first phase, Replit must prepare:
- complete database schema;
- database documentation;
- SQL script ready for Supabase SQL Editor;
- data structure consistent with users, albums, stickers, states, matches, chat, demo, and premium.

The correct transition will be:
- complete development with mock data;
- creation of Supabase SQL schema;
- insertion of real data through Supabase SQL Editor;
- connection of the app to Supabase;
- complete removal of mock records;
- final verification with real data.

## User Navigation

The main user-side navigation must use a standard mobile footer.

Mobile footer:
- Home;
- Album;
- Match;
- Profilo.

The Home must be a quick dashboard with:
- app logo/name;
- active albums;
- general or main album completion;
- best match;
- nearby match via ZIP/postal code;
- demo/premium status;
- quick Album/Match buttons.

The Album section must contain:
- I miei album;
- Album disponibili;
- album cards;
- sticker grid;
- state filter.

The Match section must contain:
- Migliori match;
- Vicini a te;
- ZIP/postal code distance filter;
- multi-album match detail;
- integrated chat.

The Profile section must contain:
- nickname;
- ZIP/postal code;
- generic area;
- demo/premium status;
- recovery code protected by PIN;
- reopenable onboarding guide;
- support email;
- logout.

## Admin

The admin version is for the project owner.
It is not subject to demo limitations.

The admin must be usable both on desktop and mobile, but the priority is desktop.

On desktop, it must have a fixed sidebar with the main navigation buttons, similar to the attached screenshot.

The admin sidebar must have:
- brand/app name at the top;
- organized menu items;
- simple icons;
- highlighted active item;
- main content on the right.

Baseline admin sections:
- Dashboard;
- Album;
- Figurine;
- Utenti;
- Messaggi;
- Premium / Demo;
- Impostazioni.

Do not add too many unnecessary sections in the first version.
It is better to have the essential parts done well, with a structure ready for future features.

Future non-priority sections:
- advanced statistics;
- advanced support;
- real payments;
- advanced reports.

Admin Dashboard:
- number of users;
- number of albums;
- number of chats/messages;
- demo/premium users;
- general app status.

Admin Album:
- create albums;
- edit albums;
- add cover;
- enter title/description;
- publish/hide albums.

Admin Figurine:
- select album;
- insert sticker list;
- edit stickers;
- correct number/name/description.

Admin Utenti:
- view users;
- nickname;
- ZIP/postal code/area;
- demo/premium status;
- number of albums;
- blocks.

Admin Messaggi:
- see chats;
- review chats if necessary;
- close problematic chat;
- support moderation.

Admin Premium / Demo:
- see users in demo;
- see premium users;
- configure demo duration;
- check expired demos;
- prepare future plans.

Admin Impostazioni:
- support email;
- demo duration;
- base texts;
- privacy/support settings;
- future payment preparation.

## Email, Notifications, and Support

No automatic emails are needed in the baseline.

Not needed:
- automatic email notifications;
- automatic messages via external services;
- external email services.

A support email must be visible in the app.

Initial support email:
dero975@gmail.com

The support email must be editable later by admin.

On the user side, there must be an alert bell for chats with new messages.

The bell badge must indicate how many chats have unread new messages.
It must not indicate the total number of individual unread messages.

Example:
if 3 chats have new messages, the badge shows 3 even if those chats contain 15 total messages.

Matches remain normally accessible.
No specific notification for new matches is needed.

## Privacy, Legal, and Store Readiness

The already purchased domain must not be used now.

Do not configure the domain in the baseline.
Do not create a landing page connected to the domain now.
Do not spend time on domain configuration.

Prepare a light but correct legal foundation:
- Privacy Policy;
- Terms of Use;
- Cookie Policy.

The texts must be structured and consistent with Sticker, but must indicate that they must be reviewed before official publication.

The legal pages must consider:
- nickname;
- PIN;
- ZIP/postal code;
- generic area;
- chat;
- admin moderation;
- demo/premium;
- local technical data;
- account recovery;
- security question;
- recovery code;
- future payments.

For cookies and local data, use only essential technical data:
- session/access;
- demo status;
- minimal preferences;
- remembered access on the device.

Do not add:
- marketing cookies;
- advertising cookies;
- advertising tracking;
- invasive analytics.

Be careful with trademarks and protected content.

Sticker must be designed as an independent app.

Do not use official Panini logos, protected graphics, or registered trademarks without authorization.

Albums and stickers must be managed as catalogs manually created by the admin.

Prepare a legal note in the DNA to clarify that the app is not officially affiliated with Panini, unless future authorization or legal verification is obtained.

The DNA folder must include a Store readiness section.

Store readiness must include:
- future App Store requirements;
- future Google Play requirements;
- privacy;
- terms;
- cookies;
- collected data;
- chat moderation;
- user blocking;
- reports;
- account/purchase recovery;
- store payments;
- young/minor users;
- publication checklist;
- base store listing texts;
- short description;
- long description;
- app category;
- privacy notes;
- safety notes;
- moderation notes.

## DNA and Documentation

Create a DNA folder in the project root.

The DNA folder must contain organized Markdown documents about:
- project;
- architecture;
- database;
- features;
- roadmap;
- premium/demo;
- Supabase schema;
- store readiness;
- privacy/legal;
- testing and quality;
- Render deployment;
- final report.

The DNA must be updated after every important change.

Every relevant technical decision must be documented.

The documentation must make it possible to continue the project after the free session without mentally reconstructing the decisions already made.

## Backup

Create a folder in the project root called:

backup

The folder must exist from the beginning, but it must not be used automatically.

Backups must be created only on explicit user request.

When the user asks for a backup, save a compressed project archive inside the backup folder.

Do not use ZIP format.

Preferably use:

.tar.xz

Backup filename format:

Backup_1 Maggio_23.13.tar.xz

Schema:

Backup_DAY MONTH_HOUR.MINUTE.tar.xz

The backup must include what is needed to restore and continue the project.

Avoid where possible:
- node_modules;
- cache;
- temporary builds;
- useless logs;
- regenerable files.

## Testing and Quality Control

Replit Agent must actually test the app during development.

Minimum user-side tests:
- nickname/PIN/ZIP registration;
- security question;
- recovery code;
- session access;
- Home;
- Album;
- Album disponibili;
- I miei album;
- adding an album;
- opening an album;
- sticker grid;
- sticker state change;
- sticker filtering;
- sticker modal with long press;
- album counters;
- Match;
- Migliori match;
- Vicini a te;
- ZIP/postal code radius filter;
- multi-album match detail;
- Tu dai / Tu ricevi;
- opening chat with active demo/premium;
- blocking chat if demo expired/non-premium;
- chat bell;
- Profilo;
- onboarding guide;
- logout.

Minimum admin-side tests:
- opening admin;
- sidebar navigation;
- Dashboard;
- album creation;
- album editing;
- cover management;
- sticker insertion through list;
- sticker editing;
- user viewing;
- user demo/premium status;
- demo duration configuration;
- messages/chat viewing;
- user blocking;
- problematic chat closing;
- base settings;
- support email;
- prepared privacy/terms/cookie pages.

Check:
- working build;
- no blocking errors;
- no serious warnings ignored;
- real navigation;
- main buttons;
- user states;
- mock data;
- mobile UI;
- admin UI.

## Required Final Output

At the end of the session, produce:
- working app;
- updated DNA;
- final report;
- list of completed parts;
- open issues;
- tests performed;
- tests not performed or partial;
- what remains to do;
- next operational prompt to continue development.

The final report must indicate:
- what works;
- what has been implemented;
- which flows have been verified;
- which bugs have been fixed;
- which limitations remain;
- which main files have been created;
- which architecture was chosen;
- how to proceed in the next step.

The next operational prompt must be ready to paste into Replit.

## Replit Agent Session Priorities

Top priorities:
- correct technical foundation;
- complete user demo;
- working admin foundation;
- realistic mock data;
- multi-album matching;
- chat;
- premium demo;
- DNA;
- main tests.

Minor visual tweaks, micro-corrections, and fine tuning can be done later.

Final goal:
create a solid, clean, scalable, testable, and continueable technical foundation for Sticker.