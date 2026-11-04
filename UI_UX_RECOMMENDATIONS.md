# UI/UX Review & Optimization Recommendations

**System:** Berean Event Check-In (React 18 + Vite + Supabase)
**Review date:** 2026-11-04
**Scope:** All screens under `src/` — layout, shared UI components, and every feature page (auth, dashboard, events, attendees, public registration, scanner, attendance, payments, reports, QR printing, accounts, audit).
**Status:** Proposal only. No code has been changed. Review, then mark which items to implement.

---

## 1. Executive Summary

The system has a clear brand identity (navy and gold), good touch-target sizing (44px controls), and covers the full event workflow end to end. The main problems are:

1. **Role routing is broken for non-admins.** Registrars, ushers, and kitchen staff land on an "Access Restricted" screen right after they log in.
2. **The QR scanner has state bugs.** It can record check-ins against the wrong day, and the camera keeps running after you leave the page.
3. **Navigation is hard to discover.** The sidebar is hidden on every screen size, and event tools only appear once you're already inside an event.
4. **Feedback is inconsistent or missing.** The app uses native `alert()`/`confirm()`, gives no success confirmation during rapid paper entry, and silently swallows errors (they're only written to `console.error`).
5. **Mobile layouts break inside forms.** Fixed two- and four-column grids don't collapse on phones, and phones are the main device for ushers and public registrants.
6. **There are accessibility gaps.** Pinch-zoom is disabled, several colors fail contrast, there's no visible focus ring, and modals don't trap focus.

Most fixes are small and local. A styling and components cleanup (Section 6) will make the rest easier and keep the UI consistent.

### Priority legend

| Priority | Meaning |
|---|---|
| **P0** | Broken or misleading behavior. Fix before the next live event. |
| **P1** | Significant UX friction. Fix in the next iteration. |
| **P2** | Polish, performance, and nice-to-have features. |

---

## 2. P0: Critical Issues

### 2.1 Non-admin users land on "Access Restricted" after login
- [LoginPage.jsx:17](src/features/auth/LoginPage.jsx#L17) defaults the redirect to `/dashboard`.
- [routes.jsx:37](src/app/routes.jsx#L37) redirects `/` to `/dashboard`.
- `/dashboard` is restricted to `['admin']` ([routes.jsx:43](src/app/routes.jsx#L43)).
- The header logo ([Header.jsx:54](src/components/layout/Header.jsx#L54)) and the 404 page ([routes.jsx:167](src/app/routes.jsx#L167)) also link to `/dashboard`.

**Impact:** The first screen a registrar, usher, or kitchen volunteer sees is an error.

**Recommendation:** Add a `getHomeRoute(role)` helper and use it everywhere:
- admin → `/dashboard`
- registrar → `/events`
- usher → `/events`, or straight to the scanner of the currently open event
- kitchen → `/events`, or the kitchen board of the currently open event

On the "Access Restricted" screen, replace `window.history.back()` with **"Go to my home page"**. When the user deep-linked into the page, `history.back()` can take them out of the app.

### 2.2 Scanner records check-ins against a stale day, and the camera never stops
[ScannerPage.jsx](src/features/attendance/ScannerPage.jsx) has two closure bugs:
- **Wrong day:** `onScanSuccess` is passed to `html5Qrcode.start()` once, so it keeps the `selectedDayId` from that moment ([line 93-98](src/features/attendance/ScannerPage.jsx#L93-L98), [line 133](src/features/attendance/ScannerPage.jsx#L133)). If the usher switches the day dropdown while the camera runs, scans still go to the old day.
- **Camera leak:** The unmount cleanup ([line 66-68](src/features/attendance/ScannerPage.jsx#L66-L68)) calls the `stopCamera` from the first render, where `isScanning` is `false`. The camera and its light stay on after the user navigates away.

**Recommendation:** Keep `selectedDayId` and the scanning flag in `useRef`s that the callbacks read. In cleanup, stop the camera unconditionally (check the scanner state directly). Alternatively, stop and restart the camera when the day changes.

### 2.3 Ushers can miss scan results
- The result card renders **below** the 320px camera view. On a phone it is often off-screen ([ScannerPage.jsx:431](src/features/attendance/ScannerPage.jsx#L431)).
- The same beep plays for success, duplicate, and denied scans, before the result is known.
- A new `AudioContext` is created for every scan ([line 120](src/features/attendance/ScannerPage.jsx#L120)). Browsers limit how many can exist, so after many scans the beep can stop working.

**Recommendation:**
- Show the result as a **full-width overlay or color flash on top of the camera view**: green for checked in, amber for already checked in, red for denied or payment required. Show the name in large type.
- Play distinct tones (for example, one high beep for success and two low beeps for failure) from **one shared AudioContext**. Add `navigator.vibrate()` on phones.
- Auto-dismiss after about 2.5 seconds so ushers can scan continuously without tapping.

### 2.4 Status indicators that look live but aren't
- Scanner shows a static **"Connected"** badge ([ScannerPage.jsx:194-197](src/features/attendance/ScannerPage.jsx#L194-L197)).
- Kitchen board shows a static **"Live Sync"** badge ([KitchenDashboard.jsx:120-133](src/features/dashboard/KitchenDashboard.jsx#L120-L133)) but never refreshes on its own.
- Dashboard shows **"Live Activity"** ([AdminDashboard.jsx:230](src/features/dashboard/AdminDashboard.jsx#L230)), which is also static.

**Impact:** Kitchen staff may cook against a stale headcount while believing it is live.

**Recommendation:** Either make these real or remove them:
- Kitchen board and dashboard: poll every 30–60 seconds, or use Supabase Realtime, and show "Updated 12s ago".
- Scanner: base the badge on `navigator.onLine` plus the result of the last request.

### 2.5 Public registration form: privacy consent and closed events
[PublicRegistrationPage.jsx](src/features/attendees/PublicRegistrationPage.jsx):
- The form collects names, mobile numbers, and emails from the public with **no privacy notice or consent checkbox**. The Philippine Data Privacy Act (RA 10173) expects informed consent. Add a short notice and a required checkbox.
- The form doesn't check event status, so people can still register after an event is `completed` or `registration_closed`. Show a "Registration is closed" state instead of the form.
- After submission, the QR pass is shown only once. If the registrant closes the tab before saving it, it's gone. Consider emailing the pass, or adding a "Retrieve my pass" lookup by name and mobile number.

### 2.6 Missing CSS tokens and animation (visual bugs)
- `@keyframes spin` is defined only inside `LoadingState` ([LoadingState.jsx:22-26](src/components/ui/LoadingState.jsx#L22-L26)). The `Button` loading spinner doesn't animate on pages where `LoadingState` isn't mounted. Move the keyframes to `global.css`.
- These undefined tokens fall back to nothing:
  - `--color-brand-gold-50` (EmptyState icon background)
  - `--color-brand-blue-600` (QR print PDF icon)
  - `--color-brand-yellow-400` (Attendees PDF icon)
- Tailwind classes such as `hidden sm:inline` ([Header.jsx:141](src/components/layout/Header.jsx#L141)) and `md:hidden` ([Sidebar.jsx:113](src/components/layout/Sidebar.jsx#L113)) do nothing, because Tailwind isn't installed. As a result, the "Sign Out" label never hides on mobile, which crowds the header.

### 2.7 Pages that never finish loading
- [DailyAttendancePage.jsx:67](src/features/attendance/DailyAttendancePage.jsx#L67) shows a spinner until `event` loads. If loading the event fails, the spinner never goes away. If the event has no days, the table spinner never resolves.
- Most pages `console.error` their failures, then show "Event not found." or an empty list. The user can't tell a network error from missing data.

**Recommendation:** Add a shared `<ErrorState message onRetry>` component. Track `error` alongside `loading` on every page.

---

## 3. P1: Navigation & Information Architecture

### 3.1 Make the sidebar persistent on desktop
- The sidebar is an overlay that is **closed by default on every screen size** ([Sidebar.jsx:131](src/components/layout/Sidebar.jsx#L131)). Desktop users need an extra click to navigate.
- `top: '57px'` is hard-coded to the header height and will misalign if the header wraps.

**Recommendation:** At ≥1024px, show the sidebar docked and always visible, and shift the main content right. Keep the overlay for tablet and mobile only.

### 3.2 Add an event context with sub-navigation
Event tools (Attendees, Print, Scan, Attendance, Payments, Kitchen, Reports) only appear in the sidebar once the URL contains `/events/:id`. New users don't know these tools exist.

**Recommendation:**
- On every event page, add an **event header** showing the event name, dates, and status, with a **tab bar**:
  `Attendees | Schedule | Scan | Attendance | Payments | Kitchen | Reports` (filtered by role).
- In the sidebar, show the current event name above the event links.
- Hide **Payments** when `has_registration_fee` is false.

### 3.3 Consistent breadcrumbs instead of ad-hoc back links
Back links currently point to different places: "Back to Events" (most pages), "Back to Event Days" (attendance), "Back to Attendee Directory" (print), and "Event Directory" (kitchen). Replace them with a breadcrumb such as `Events › Bible Conference 2026 › Attendance`.

### 3.4 Remove dead-end links for each role
| Role | Link shown | Result |
|---|---|---|
| usher | "Badge" in the Attendees action menu → `/print` | Access Restricted |
| kitchen | "Manage Daily Schedule" → Days page → "Daily Log" | Access Restricted |
| usher | Can open `/attendees` (route allows it), but the sidebar hides it | Inconsistent |

**Recommendation:** Define permissions once, for example a `can(role, 'print')` helper used by both `routes.jsx` and the UI. Hide any link the role can't use.

### 3.5 Event management gaps
- You **can't edit, cancel, or archive an event** after creating it. `EventFormModal` only creates.
- The Event Days page shows walk-ins and meal buffer per day, but you can't edit them.
- Opening or closing a day has no confirmation step, and errors appear in an `alert()` ([EventDaysPage.jsx:40](src/features/events/EventDaysPage.jsx#L40)).
- The Events list has no search, and its filter tabs leave out `draft`.

---

## 4. P1: Feedback, Forms & Interaction

### 4.1 Add a global toast system and confirmation dialog
- Replace every `alert()` and `window.confirm()` (Accounts, Event Days, Payment waiver) with a styled `<ConfirmDialog>` and toasts.
- **Rapid paper entry gives no success feedback:** with "Keep form open" on, a save simply clears the form ([RegistrationForm.jsx:84-96](src/features/attendees/RegistrationForm.jsx#L84-L96)). Show a toast like "✓ Saved: Juan Dela Cruz", keep a small "last 5 entered" list, and **return focus to First Name**.
- `Button` always shows "Processing..." while loading. Add a `loadingText` prop ("Signing in…", "Saving…").

### 4.2 Make forms responsive
Fixed `gridTemplateColumns: '1fr 1fr'` layouts don't collapse on phones:
- [RegistrationForm.jsx](src/features/attendees/RegistrationForm.jsx)
- [PublicRegistrationPage.jsx](src/features/attendees/PublicRegistrationPage.jsx). This is the public phone-first page.
- [EventFormModal.jsx](src/features/events/EventFormModal.jsx)
- [EditAttendeeModal.jsx](src/features/attendees/EditAttendeeModal.jsx)
- [PaymentModal.jsx](src/features/payments/PaymentModal.jsx)
- [FamilyRegistrationModal.jsx:116](src/features/attendees/FamilyRegistrationModal.jsx#L116). Its 4-column member row is very cramped.

**Recommendation:** Add a `.form-row` class to `global.css` that is a single column below 640px and two columns above. Stack each family member as a card on mobile.

### 4.3 Form input quality
- Add `inputMode="tel"` and `autoComplete="tel"` to mobile number fields. Add `autoComplete="given-name"`, `"family-name"`, and `"email"` to the matching fields.
- Validate inputs:
  - end date must be on or after start date
  - fee and capacity must not be negative
  - basic PH mobile number format
- `Input` builds its `id` from the label ([Input.jsx:19](src/components/ui/Input.jsx#L19)). Two forms on the same page can end up with duplicate IDs. Use `React.useId()`.
- Hand-written `<label>` + `<select>` pairs (Classification, Source, Role, Payment Method) aren't linked with `htmlFor`/`id`. Add a shared `<Select>` component.
- Login: add a show/hide password toggle.
- Accounts: add a show-password toggle and a "Generate temporary password" button.

### 4.4 Modal behavior
[Modal.jsx](src/components/ui/Modal.jsx):
- Clicking the backdrop closes the modal and **discards form data**. Disable backdrop close for form modals, or ask "Discard changes?" when the form is dirty.
- Add a focus trap, `aria-labelledby` pointing to the title, and return focus to the trigger button on close.
- `document.body.style.overflow = 'unset'` breaks when modals are stacked. Use a ref-counted scroll lock.
- On mobile, show modals as full-screen sheets.

### 4.5 Attendees table
[AttendeesPage.jsx](src/features/attendees/AttendeesPage.jsx):
- The table has 7 columns, and every row has two download buttons (PDF and PNG). Move those into the ⋮ menu and keep a single "Pass" button.
- On mobile (<768px), switch to a **card list** layout.
- Add pagination or virtualization. Large events (500+ attendees) will render slowly and are hard to scan.
- Add a **"Checked in today"** column or filter. It's the question registrars ask most often.
- Separate the empty states: "No attendees yet" (with Register and Share Link actions) vs "No matches" (with a **Clear filters** button).
- Clipboard copy needs a fallback (a selectable text field) for non-HTTPS or blocked clipboard access.
- The ⋮ menu chooses drop-up or drop-down by row index. Use a real menu with `role="menu"`, arrow-key navigation, and placement based on available viewport space.

### 4.6 Payments
[PaymentsPage.jsx](src/features/payments/PaymentsPage.jsx):
- Add **Amount Paid** and **Balance** columns, plus search and status filters.
- For paid rows, change "Record Payment" to "View".
- Fee waivers don't capture a **reason or approver**. Add a required reason field for the audit trail.
- The fee summary in the modal uses `gap: 1.5rem` in a row and overflows on phones. Let it wrap.

### 4.7 Scanner improvements (beyond the P0 fixes)
- **Default day:** pick the event day whose date is **today**, not just the first `open` day.
- Show a loud warning banner when the selected day is not open or not today.
- In manual lookup, show **"Already checked in at 8:42 AM"** next to names and disable the button. Match names with flexible ordering ("Dela Cruz Juan").
- Add a **USB/Bluetooth barcode scanner mode**: an always-focused input that submits on Enter. This is useful for desk check-in stations.
- Remember the selected camera, and offer a front/back camera toggle.

### 4.8 Kitchen board
- Use `??` instead of `||` for buffer percentages. Right now a 0% buffer displays as 10%:
  - [KitchenDashboard.jsx:209](src/features/dashboard/KitchenDashboard.jsx#L209)
  - [EventDaysPage.jsx:84](src/features/events/EventDaysPage.jsx#L84)
  - [EventFormModal.jsx:49](src/features/events/EventFormModal.jsx#L49)
- Add a **TV/fullscreen mode** for wall displays: larger numbers, no chrome, auto-refresh.

### 4.9 Audit log
[AuditPage.jsx](src/features/audit/AuditPage.jsx):
- Search reloads on **blur** ([line 166](src/features/audit/AuditPage.jsx#L166)), which causes surprise reloads. Use a debounced search or an explicit Search button.
- The query silently caps at 300 rows (`auditService.js:101`), and the summary stats count only the loaded rows. Add pagination, a date-range filter, and a "Showing 300 of N" label.

---

## 5. P1: Accessibility & Visual Design

| Issue | Location | Fix |
|---|---|---|
| Pinch-zoom disabled (`maximum-scale=1, user-scalable=no`) | [index.html:6](index.html#L6) | Remove both. This is WCAG 1.4.4. |
| No visible keyboard focus on buttons, tabs, and nav links | `global.css` | Add a global `:focus-visible { outline: 3px solid #194E8C; outline-offset: 2px }` |
| Low contrast: `--color-text-light #94A3B8` on white (~2.6:1), used for stat subtitles | `global.css` | Use `#64748B` or darker (≥4.5:1) |
| Low contrast: gold `#EAB308` text on light backgrounds (public page subtitle, Events "Day" chip) | multiple | Use `--color-brand-gold-600 #B45309` for text on light backgrounds |
| Low contrast: warning text `#D97706` on `#FEFCE8` | alert boxes | Use `#92400E` for text |
| Filter tabs and scanner mode tabs are plain buttons with no selected state for screen readers | EventsPage, ScannerPage | Add `role="tablist"`/`role="tab"` and `aria-selected`, or `aria-pressed` |
| Scan result isn't announced to screen readers | ScanResult | Wrap it in `role="status" aria-live="assertive"` |
| Dark `<select>` on the dashboard banner with white text; options are forced black, and it renders poorly on Windows | [AdminDashboard.jsx:98-115](src/features/dashboard/AdminDashboard.jsx#L98-L115) | Use a standard light select, or a custom dropdown |
| Header on small phones: long church name + user name + role badge + "Sign Out" overflow | [Header.jsx](src/components/layout/Header.jsx) | Below 640px: shorten the title to "Berean Check-In" and collapse the user chip into an avatar menu |

---

## 6. P1/P2: Code Structure That Affects UX Consistency

Nearly all styling is inline `style={{...}}` objects. The same patterns are copy-pasted many times with small differences, which is why the UI drifts between pages. Inline styles also can't use media queries, hover, or focus states. That's the root cause of the responsive and focus issues above.

**Extract these shared components and CSS classes:**

| Component | Replaces |
|---|---|
| `<Alert variant="error/warning/success/info">` | About 12 copies of inline alert boxes |
| `<PageHeader title subtitle breadcrumbs actions>` | The back link + h1 + actions block on every page |
| `<SearchInput>` | 5 copies of the icon + input pattern |
| `<StatCard title value subtitle tone>` | Repeated stat-card markup |
| `<Tabs>` / `<SegmentedControl>` | Event filter tabs and scanner mode tabs |
| `<Toast>` provider, `<ConfirmDialog>` | `alert()` / `confirm()` |
| `<ErrorState onRetry>` | Silent `console.error` |
| `<Select>`, `.form-row` | Unlabeled selects and fixed grids |
| `<ActionMenu>` | Two hand-rolled ⋮ menus (Attendees, Accounts) |
| `formatClockTime(iso)` util | `formatTime(new Date(x).toTimeString().split(' ')[0])` (5 places) |

Also move the hover effects done in JS (for example, the Header's `onMouseEnter`/`onMouseLeave`) into CSS.

---

## 7. P2: Performance

1. **Route-level code splitting.** Use `React.lazy()` for the Scanner (`html5-qrcode`), QR/PDF pages (`jspdf`, `qrcode`), Reports, and Audit. Right now the login page and the public registration page download every library.
2. **Lazy-load jsPDF** inside `qrService` with `await import('jspdf')`, so it loads only when someone downloads a PDF.
3. **Badge print page:** every `QRCard` generates its QR code asynchronously. With hundreds of badges this is slow, and printing before generation finishes produces "Generating QR..." placeholders. Disable **Print** until all QR codes are ready, show progress, and paginate (for example, 50 per sheet batch).
4. **Avoid repeated fetches.** Every event page refetches the event. A small cache (TanStack Query, or a `CurrentEventContext`) would make tab switching instant and also feed the event name to the sidebar (Section 3.2).
5. **Fonts:** confirm whether JetBrains Mono is actually used. If not, remove it from the Google Fonts request.

---

## 8. P2: Timezone Correctness

`new Date().toISOString().split('T')[0]` gives the **UTC** date. In the Philippines (UTC+8), from 12:00 AM to 7:59 AM it returns **yesterday's date**:
- Dashboard "Confirmed Check-Ins Today" ([dashboardService.js:16](src/features/dashboard/dashboardService.js#L16)) looks at the wrong day during early-morning setup.
- The Create Event form defaults its start and end dates to yesterday when opened before 8 AM ([EventFormModal.jsx:8](src/features/events/EventFormModal.jsx#L8)).

**Recommendation:** Add a `todayLocal()` helper using `Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila' })`, and use it everywhere a "today" date string is needed.

---

## 9. P2: Feature Enhancements (Optional)

- **Offline-tolerant scanner (PWA):** cache the event's QR credentials and queue check-ins when church Wi-Fi drops, then sync when it's back.
- **Reports:** a simple per-day bar chart (expected vs confirmed), a printable report layout, and attendance by classification.
- **Dashboard:** show the event name on Recent Check-Ins, and add a "today at a glance" view for each open event.
- **Public registration:** day selection for multi-day events, SMS or email confirmation, and duplicate detection by name + mobile.
- **Badge printing:** layout presets (2×3, 2×4, lanyard size) and a "print only new / not yet printed" filter.

---

## 10. Suggested Implementation Plan

| Phase | Items | Rough effort |
|---|---|---|
| **Phase 1: Hotfixes** | 2.1 role home routing · 2.2 scanner closure bugs · 2.3 scan result overlay, tones, shared AudioContext · 2.6 missing tokens, spinner, dead Tailwind classes · 2.7 error states · `index.html` zoom fix · `??` buffer fix · timezone helper | 1–2 days |
| **Phase 2: Core UX** | Shared components (Section 6) · toasts and confirm dialog · responsive `.form-row` · modal focus trap and dirty-check · persistent desktop sidebar · event header with tabs and breadcrumbs · role-permission helper · focus ring and contrast fixes · privacy consent and closed-event gating on the public form | 4–6 days |
| **Phase 3: Workflow polish** | Attendees mobile cards, pagination, checked-in column · rapid paper-entry feedback · payments balance column and waiver reason · scanner manual-lookup status and barcode mode · kitchen auto-refresh and TV mode · event edit/cancel · audit pagination | 4–6 days |
| **Phase 4: Performance & extras** | Code splitting · lazy jsPDF · print page batching · data caching · PWA offline scanner · report charts | As needed |

---

### How to use this document
Tick or annotate the items you approve (for example, "do Phase 1 + 2.5 + 4.2"), and implementation can proceed in that order. Each item links to the exact file and line it refers to.

---

## 11. Implementation Status (2026-11-04)

Implemented on branch `feat/ui-ux-improvements`. Verified with `vite build`, the unit tests (26 passing: 16 existing + 10 new in `tests/uiHelpers.test.js`), and a headless-browser smoke test of every page for all four roles at desktop (1366px) and phone (390px) widths in demo mode.

| Section | Status | Notes |
|---|---|---|
| 2.1 Role home routing | ✅ Done | `src/utils/permissions.js` + `HomeRedirect`. Ushers and kitchen staff go straight to today's event scanner / kitchen board when exactly one event is running. |
| 2.2 Scanner stale-day / camera leak | ✅ Done | Callbacks read refs; the camera always stops on unmount. |
| 2.3 Scan feedback | ✅ Done | Full-screen color overlay on the camera, distinct tones + vibration, one shared AudioContext, auto-dismiss. |
| 2.4 Fake live badges | ✅ Done | Kitchen (30s) and dashboard (60s) auto-refresh with "updated Xs ago"; the scanner shows real online/connection state. |
| 2.5 Public form | ✅ Done | Privacy notice + required consent (RA 10173), closed-event gating, day selection, duplicate detection, "Find my pass". |
| 2.6 Tokens / spinner / dead Tailwind classes | ✅ Done | |
| 2.7 Error states | ✅ Done | `ErrorState` with retry on every page. |
| 3.1–3.5 Navigation & IA | ✅ Done | Docked desktop sidebar, `EventLayout` with event header, tabs and breadcrumbs, shared permissions, event edit/archive, editable per-day walk-ins and buffer. |
| 4.1–4.9 Feedback, forms, modals, tables | ✅ Done | Toasts, `ConfirmDialog`, `.form-row`, focus-trapped modals with a discard prompt, mobile card lists, pagination, balances, waiver reason (audit-logged), barcode-scanner mode, kitchen TV mode, audit date filter + pagination. |
| 5 Accessibility | ✅ Done | Zoom re-enabled, focus ring, contrast tokens, ARIA tabs/menus, live regions, skip link. |
| 6 Shared components | ✅ Done | `Alert`, `PageHeader`, `SearchInput`, `StatCard`, `Tabs`, `Toast`, `ConfirmDialog`, `ErrorState`, `Select`, `ActionMenu`, `Pagination`. |
| 7 Performance | ✅ Done | Route code-splitting; the initial load no longer includes the scanner or PDF libraries (main chunk 207 KB → 61 KB). Event data cache (`useEvent`). Print page waits for QR codes and prints in sheets of 48. Unused font removed. |
| 8 Timezone | ✅ Done | `todayLocal()` pinned to Asia/Manila. |
| 9 Report charts | ✅ Done | Per-day bar chart, classification breakdown, printable layout. |
| 9 Badge layout presets / "not yet printed" | ✅ Done | The "printed" history is stored per device (browser storage), not in the database. |
| 9 Offline PWA scanner | ❌ Not done | QR verification runs server-side (`verify_and_checkin`); offline check-in needs a backend design (credential sync + conflict handling). The scanner now clearly shows when it is offline. |
| 9 SMS / email confirmation | ❌ Not done | Needs an email/SMS provider. "Find my pass" covers lost passes in the meantime. |

### Bugs found and fixed during implementation
- **Audit CSV export never worked.** `downloadCsv` was called with its arguments swapped, which threw an error.
- Event-day generation and the kitchen board replaced an intentional **0% meal buffer** with 10%.

### Known gap (not UI): reports read demo data only
`reportService` (multi-day report, financial report, CSV exports) and `dashboardService.getAdminMetrics` read only the local mock store, even when Supabase is configured. In production, the Reports and Dashboard numbers and the CSV exports will not reflect the real database until these services get Supabase queries.
