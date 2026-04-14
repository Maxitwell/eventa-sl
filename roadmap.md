# Eventa SL: Remaining Tasks & Technical Solutions Roadmap

This document outlines the hierarchy of remaining work to bring Eventa SL to a production-ready state, prioritized by dependency and criticality, along with the proposed technical solutions for each.

## Priority 1: Payment & Checkout Infrastructure (Stage 4 & 5)
*This is the most critical missing piece. Without it, the platform cannot securely process real transactions.*

### 1. Payment Gateway Integration
*   **Task:** Replace the mocked payment flows in `CheckoutModal.tsx` with a live payment gateway (Stripe, Flutterwave, or Pawapay).
*   **Solution:** 
    *   Integrate the provider's SDK or API.
    *   Shift the ticket creation logic from the frontend to a secure backend route (`/api/checkout`).
    *   Implement secure webhook listeners (`/api/webhooks/payment`) to listen for success notifications from the provider before marking a ticket as `valid` and dispatching it.

### 2. Cryptographically Secure QR Codes
*   **Task:** Replace the public `qrserver.com` image link with a secure, verifiable payload that cannot be easily spoofed.
*   **Solution:** 
    *   Generate a JWT (JSON Web Token) or an HMAC digitally signed payload containing the `ticketId` and `eventId`.
    *   Use a library like `qrcode` or `react-qr-code` to generate the QR code locally/on the server so the payload remains private and verifiable by the scanner.

### 3. Inventory Locking (Concurrency Control)
*   **Task:** Prevent overselling when multiple users try to buy limited-capacity tickets simultaneously.
*   **Solution:** 
    *   Implement a "soft lock" pattern in Firestore (e.g., a `ticket_reservations` collection).
    *   When a user clicks "Pay", reserve the capacity for 15 minutes. If checkout succeeds, finalize the ticket. If it fails or expires, release the capacity back to the pool.

### 4. Ticket Delivery Systems
*   **Task:** Automatically send tickets to the buyer once payment succeeds.
*   **Solution:** 
    *   **Email:** Use Resend, Nodemailer, or SendGrid to email a styled HTML receipt and PDF ticket.
    *   **WhatsApp:** Utilize the currently empty `/api/whatsapp` route to send the ticket payload via the Twilio or WhatsApp Cloud API.

---

## Priority 2: Offline-First Door Management (Stage 6)
*Critical for event day operations, especially in venues with poor internet connectivity.*

### 1. PWA Setup (Progressive Web App)
*   **Task:** App must be installable and work offline on organizer devices.
*   **Solution:** 
    *   Add `next-pwa` to `package.json`.
    *   Configure `next.config.js` to build the Service Worker (`sw.js`).
    *   Create a Web App Manifest (`manifest.json`) in the `/public` directory defining app icons, colors, and standalone display.

### 2. Offline Sync & Delta Pulls
*   **Task:** The scanner must function without network and resolve scans when reconnected.
*   **Solution:** 
    *   Use Firestore's built-in offline persistence capabilities (`enableIndexedDbPersistence`).
    *   Instead of a full refresh, subscribe to Firestore snapshot listeners to only pull "deltas" (changes) when the network reconnects.
    *   Store scanned tickets in IndexedDB locally and batch-upload the uses when connection is restored.

---

## Priority 3: Administration & Analytics (Stage 7)
*Necessary for platform owners to maintain control and monitor health.*

### 1. Super Admin Console
*   **Task:** A global dashboard for Eventa platform owners.
*   **Solution:** 
    *   Create a hidden route namespace (`/admin`).
    *   Gate it behind role-based access control (RBAC), verifying a custom claim or super-admin `role` on the user token.
    *   Build interfaces to View All Users, Suspend Events, View Platform Revenue, and Issue Platform-wide Refunds.

---

## Priority 4: Compliance & Production Readiness (Stage 1 & 8)
*Mandatory final steps before going live to the public.*

### 1. Legal Documentation
*   **Task:** Terms of Service, Privacy Policy, and Refund Policy pages.
*   **Solution:** 
    *   Draft standard marketplace legal docs specific to Sierra Leone/African jurisdictions.
    *   Create static pages (`/terms`, `/privacy`, `/refunds`).
    *   Add mandatory consent checkboxes in the SignUp and Checkout flows tying to these URLs.

### 2. Environment Segmentation
*   **Task:** Separate test data from real production data.
*   **Solution:** 
    *   Create two separate Firebase Projects (e.g., `eventa-sl-dev` and `eventa-sl-prod`).
    *   Set up distinct `.env.local` vs `.env.production` variables locking the dev API keys to local and production keys to Vercel.

### 3. QA & Load Testing
*   **Task:** Ensure the system doesn't crash during a high-traffic event drop.
*   **Solution:** 
    *   Write automated test scripts (using Cypress or Playwright) for the end-to-end checkout flow.
    *   Test edge cases: double scanning a QR code, scanning an expired QR code, purchasing multiple tiers, and simulating weak internet on the scanner app.
