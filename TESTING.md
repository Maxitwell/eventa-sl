# Eventa SL — Testing Checklist

Work through these top to bottom. Auth and events must pass before testing checkout and later features.

---

## 1. Authentication & Access Control

- [ ] Sign up with email/password — account created, redirected to dashboard
- [ ] Sign in with valid credentials — session persists on refresh
- [ ] Sign in with wrong password — error shown, no access granted
- [ ] Access `/dashboard` while logged out — redirected to login
- [ ] Access `/admin` while logged out — redirected to login (or 401)
- [ ] Access `/admin` as a regular organizer — blocked (not just hidden, actually rejected)
- [ ] Access `/admin` as super admin — full console loads

---

## 2. Event Creation & Management

- [ ] Create a paid event with multiple ticket tiers (e.g. VIP + General)
- [ ] Create a **free event** (all ticket prices set to 0)
- [ ] Create an event with a capacity limit (e.g. 10 tickets)
- [ ] Create an event with **no capacity limit** (unlimited)
- [ ] Edit an existing event — changes reflect on the event page
- [ ] ~~Publish a draft event — appears on the homepage/events list~~
- [ ] Pause a published event — ticket purchase button disabled on frontend

---

## 3. Free / RSVP Checkout

- [ ] Open a free event and click to get tickets — payment section is **hidden**, green "Free" notice shown
- [ ] Click "Claim Free Ticket" — ticket created immediately, confirmation email received
- [ ] Claim a free ticket as a guest (no account) — works using guest email
- [ ] Try to claim more free tickets than capacity allows — blocked with an error message
- [ ] Free event with unlimited capacity — no capacity error, ticket issued

---

## 4. Paid Checkout (PawaPay USSD)

- [ ] Select a paid ticket, enter a valid MoMo number — USSD push received on phone
- [ ] Approve payment on phone — deposit webhook fires, ticket status becomes `valid`
- [ ] Confirm ticket is emailed after payment confirmed
- [ ] Decline/ignore the USSD push — ticket stays `payment_pending`, order stays `pending`
- [*] Try to buy more tickets than capacity — blocked at the atomic Firestore transaction level
- [* ] Buy tickets right up to the capacity limit — last ticket goes through, next buyer is rejected

---

## 5. Inventory Locking (Oversell Prevention)

- [ ] Set an event capacity to 5, buy 5 tickets — `ticketsSold` = 5
- [ ] Attempt a 6th ticket purchase — rejected with "sold out" or capacity error
- [*] Simulate two simultaneous purchases for the last 1 ticket — only one succeeds
- [ ] Unlimited-capacity event (capacity = 0) — purchases never blocked by capacity check

---

## 6. QR Code & Door Scanner

- [ ] After paid checkout — QR code in confirmation email is scannable
- [ ] After free checkout — QR code in confirmation email is scannable
- [ ] Scan a valid ticket at the door — shows green "Valid" result, ticket marked `used`
- [ ] Scan the same ticket a second time — shows "Already Used" or rejected
- [ ] Scan a `payment_pending` or `cancelled` ticket — rejected

---

## 7. Admin Console

### Overview Tab
- [ ] Metric cards show correct counts (events, orders, revenue, users)
- [ ] Events-by-status breakdown is accurate
- [ ] Recent orders table shows latest transactions

### All Events Tab
- [ ] All published events listed with correct status badges
- [ ] Search by event name filters the list
- [ ] Suspend a published event — status changes to `paused`, badge updates
- [ ] Unsuspend a paused event — status returns to `published`
- [ ] Cancel an event — status changes to `cancelled`
- [ ] Restore a cancelled event — status changes back to `draft` or `published`

### Financials Tab
- [ ] Revenue by event is correct (sum of paid orders per event)
- [ ] Date range filter narrows results correctly
- [ ] Refund button appears only on `paid` orders
- [ ] Click Refund on a paid order — order moves to `refund_pending`, PawaPay refund initiated
- [ ] Download CSV — file contains correct order data

### Users Tab
- [ ] All registered users listed with email and status
- [ ] Search by name/email filters correctly
- [ ] Block a user — Firebase Auth account disabled, user can't log in
- [ ] Unblock a user — Firebase Auth account re-enabled, user can log in again
- [ ] Attempting to block the super admin account — rejected with an error
- [ ] Download CSV — file contains correct user data

---

## 8. Refund Flow (End-to-End)

- [ ] Admin initiates refund → order status becomes `refund_pending`
- [ ] PawaPay refund webhook fires with `COMPLETED` → order becomes `refunded`, tickets become `refunded`
- [ ] `ticketsSold` on the event decrements after confirmed refund
- [ ] Customer receives refund confirmation email with amount refunded
- [ ] Refunded ticket is rejected at the door scanner
- [ ] Attempting to refund a free order — marked `refunded` directly (no PawaPay call)
- [ ] Attempting to refund an already-refunded order — blocked with an error

---

## 9. Organizer Dashboard

### Overview Tab
- [ ] Revenue shown matches sum of paid orders for organizer's events
- [ ] Event cards display correct sold count

### My Events Tab
- [ ] All organizer-owned events listed
- [ ] Per-event revenue, tickets sold, pending orders are accurate
- [ ] Ticket tier breakdown shows correct quantities

### Attendees Tab
- [ ] Select an event from dropdown — attendee list loads
- [ ] Search by name or email filters attendees
- [ ] Attendee table shows name, email, phone, ticket type, amount paid, status, purchase date
- [ ] Download CSV — correct attendee data exported
- [ ] An organizer cannot see attendees for another organizer's event

### Payouts Tab
- [ ] Each event shows gross revenue and 5% fee deduction preview
- [ ] "Request Payout" button initiates payout to the event's stored MoMo number
- [ ] Requesting a payout for an event with no paid revenue — blocked with an error
- [ ] Requesting a second payout for the same event — blocked ("already in progress")
- [ ] Payout history table shows past payout records with status

### Settings Tab
- [ ] Edit display name and phone — changes saved to Firestore
- [ ] Payout details (MoMo number) visible per event
- [ ] Sign out — session cleared, redirected to login

---

## 10. Payout Tracking & Notifications

- [ ] Organizer requests payout → PawaPay `/payouts` called, payout doc created with `status: pending`
- [ ] PawaPay payout webhook fires with `COMPLETED` → payout doc updated to `settled`
- [ ] Organizer receives settlement email with correct amount and event name
- [ ] PawaPay payout webhook fires with `FAILED` → payout doc updated to `failed`
- [ ] Organizer receives failure email (red themed)

---

## 11. Event Reminder Cron Job

- [ ] Create a published event dated **tomorrow**
- [ ] Trigger `GET /api/cron/reminders?secret=YOUR_CRON_SECRET` manually in the browser
- [ ] All ticket holders with `status: valid` receive a reminder email
- [ ] Email contains event name, date, time, location, and QR code
- [ ] Ticket holders with `status: refunded` or `payment_pending` do **not** get a reminder
- [ ] Call with wrong or missing secret → `401 Unauthorized`
- [ ] No events tomorrow → returns `{ sent: 0, message: "No events tomorrow" }`

---

## 12. WhatsApp Chatbot

- [ ] Send "hi" → welcome menu received
- [ ] Reply "1" → list of up to 5 upcoming events returned
- [ ] Reply "buy 1" → checkout prompt with event name, ticket type, price
- [ ] Reply "buy 99" (invalid number) → error asking to choose a valid number
- [ ] Reply with a valid MoMo number → USSD push sent, session moves to `payment_pending`
- [ ] Reply with a non-numeric string as phone → rejected with validation message
- [ ] Approve USSD on phone → deposit webhook fires, order marked `paid`
- [ ] Reply "status" after approving → confirmation with ticket ID and QR code URL
- [ ] Reply "status" before approving → "still pending" message
- [ ] Reply "cancel" during `payment_pending` → PawaPay deposit cancelled, session reset
- [ ] Send "hi" mid-flow → session resets to welcome menu
- [ ] Reply "2" → real tickets for that WhatsApp number shown
- [ ] Reply "3" → support contact info shown
- [ ] Restart server (simulate cold start) → session state still intact (Firestore persistence)

---

## 13. Security Checks

- [ ] Call any `/api/admin/*` route without a valid super admin token → `401` or `403`
- [ ] Call `/api/dashboard/data` with another organizer's `eventId` → `403 Forbidden`
- [ ] Call `/api/payouts/request` for an event you don't own → `403 Forbidden`
- [ ] Call `/api/cron/reminders` without the secret → `401 Unauthorized`
- [ ] Deposit/refund/payout webhooks without the `x-webhook-secret` header → `401`
- [ ] Replay the same webhook twice — second call is a no-op (idempotency check)

---

## Progress

| Section | Total | Passed | Failed |
|---|---|---|---|
| 1. Auth & Access Control | 7 | 0 | 0 |
| 2. Event Creation | 7 | 0 | 0 |
| 3. Free / RSVP Checkout | 5 | 0 | 0 |
| 4. Paid Checkout | 6 | 0 | 0 |
| 5. Inventory Locking | 4 | 0 | 0 |
| 6. QR Code & Door Scanner | 5 | 0 | 0 |
| 7. Admin Console | 18 | 0 | 0 |
| 8. Refund Flow | 6 | 0 | 0 |
| 9. Organizer Dashboard | 14 | 0 | 0 |
| 10. Payout Tracking | 5 | 0 | 0 |
| 11. Event Reminders | 7 | 0 | 0 |
| 12. WhatsApp Chatbot | 14 | 0 | 0 |
| 13. Security Checks | 6 | 0 | 0 |
| **Total** | **104** | **0** | **0** |
