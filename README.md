# Watchsave V2

## Start
Run `npm install` then `npm start`, or double-click `START-WATCHSAVE.bat`.
Open `http://localhost:3000`.
Admin: `http://localhost:3000/admin.html`

Default admin email: `admin@watchsave.local`
Default admin password: `WatchsaveAdmin123!`
Change the admin credentials and JWT secret in `.env` before real deployment.

## What changed
- Video cards now show a thumbnail where the platform provides a usable thumbnail; uploaded videos show their video source.
- Clicking the play button or Watch & earn opens a large player.
- YouTube and TikTok embeds are supported when their URL contains a recognizable video ID.
- Facebook, Instagram and arbitrary sites are accepted as URLs, but those sites may block embedding. When they do, Watchsave shows an Open video button instead of a blank white iframe.
- Uploaded videos play with a real HTML5 video player.
- Admin can set reward and watch duration for every video.
- Admin can add a command/task for every video, e.g. Follow @page on TikTok.
- Admin can upload their own videos.
- Admin Users tab shows new accounts, online status, email/phone and activity times; passwords are never displayed.
- Removing an account revokes its sessions so the user is kicked out and must register again.

## Scale note
This local build uses a JSON datastore so it is easy to run on Node 20/24 without native database packages. It is not a literal one-trillion-user production architecture. A service at that scale needs a distributed database, cache, object storage, queues, load balancing and multiple application servers.

Also, social platforms control embedding. No website can force every Instagram/Facebook/TikTok/random URL to render inside its own iframe.


## Withdrawal rules in V2

- Minimum withdrawal request: ₦10,000.
- Once a user's balance first reaches ₦10,000, the user must complete 5 additional ads before withdrawal becomes available.
- The withdrawal form asks for account number first, then bank, verifies the account name after a 10-second loading period, then accepts the amount.
- The server rejects amounts above the user's available balance with an "Insufficient funds" message.
- Admin withdrawal records include the user's name/email, bank, account number, verified account name, amount and status.

### Live Nigerian bank account-name verification

The folder uses Paystack's account resolve API when `PAYSTACK_SECRET_KEY` is present in `.env`. The secret key must stay on the server and must never be placed in frontend JavaScript. Without a real provider key, the 10-second verification ends with a configuration message rather than inventing an account name.


## Private admin chat
- A private user/admin chat is automatically created when a withdrawal request is submitted.
- Users can only message the admin through their own chat. There is no user-to-user messaging feature.
- Admin can open the Chats tab and reply to each user.
- Bank account-name verification is intentionally disabled in this version. Users manually enter the account holder name and are warned to check their details carefully.
