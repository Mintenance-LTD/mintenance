# Mintenance Mobile - Complete Airbnb-Quality UI/UX Rework

## Design Philosophy (Applied to Every Screen)

**The Airbnb Formula:** Near-monochrome chrome (black text, warm grays, white) where _content_ provides the color. Emerald `#10B981` appears ONLY for:
- Primary CTA buttons (1 per screen max)
- Active tab/toggle states
- Success indicators
- Key metrics the user should focus on

**Everything else:** `#222222` (headings), `#717171` (body/secondary), `#B0B0B0` (tertiary/placeholder), `#EBEBEB` (borders), `#F7F7F7` (backgrounds), white (surfaces).

### 7 Rules for Every Screen
1. **One emerald CTA** per screen - everything else is black/white/gray
2. **No colored icon backgrounds** - icons are monochrome `#717171` or `#222222`
3. **No visible card borders** - use subtle shadow (`sm`) or whitespace to separate
4. **24px screen padding, 32px section gaps** - generous breathing room
5. **Headlines: weight 800, metrics: weight 800** - bold numbers like Airbnb earnings
6. **Photos are the color** - let images speak, don't wrap them in colored frames
7. **Warm grays only** - no blue-tinted grays anywhere

---

## Foundation Status (Already Done)

The theme layer is already updated with Airbnb warm palette:
- `theme/index.ts` - warm colors, softer shadows, generous spacing
- `design-system/theme.tsx` - dark mode with warm darks
- Core UI components (Button, Card, Typography, Badge, Input, Toast) - updated
- Navigation chrome (tab bar, headers) - updated

What remains: **applying these tokens consistently across every screen** and making **UX improvements** per screen.

---

## PHASE A: Auth Flow (5 screens)

### A1. LandingScreen.tsx (252 lines)
**Current issues:** Hero section may still have colored backgrounds, service chips might use colored icon circles, feature cards may have colored accents.

**Visual changes:**
- Hero: white background, title 30px weight 800 `#222222`, subtitle 16px `#717171`
- Single emerald CTA "Get Started" - the ONLY colored element above the fold
- Service category chips: monochrome icons (no colored circle backgrounds), `#F7F7F7` chip bg, `#222222` text
- Feature cards: white bg, shadow `sm` (no border), icon in `#222222` not colored
- Trust badges: muted `#717171` text, no colored backgrounds
- Section headers: 22px weight 800 `#222222`
- Remove any gradient backgrounds - pure white
- Stats section: numbers in 28px weight 800 `#222222`, labels in `#717171`

**UX improvements:**
- Reduce hero to essentials: headline + subtitle + CTA + trust indicator
- Move service categories above features (users care about "what can I do" first)
- Add subtle scroll indicator (small chevron or "Scroll to explore")
- Ensure CTA is visible without scrolling on all screen sizes

### A2. LoginScreen.tsx (430 lines)
**Visual changes:**
- White background, no colored header/banner
- App logo small and subtle at top (not a large colored hero)
- "Welcome back" - 28px weight 800 `#222222`
- "Sign in to continue" - 15px `#717171`
- Input fields: `#EBEBEB` border, `#222222` focus border (not emerald)
- "Sign In" button: emerald `#10B981` - only colored element
- "Forgot password?" link: `#222222` underline, not emerald
- Social login buttons: outlined in `#DDDDDD`, icons monochrome
- "Don't have an account? Sign up" - `#717171` text, "Sign up" in `#222222` bold
- Biometric button: subtle outline style, not colored

**UX improvements:**
- Auto-focus email field on mount
- Show/hide password toggle
- "Remember me" checkbox (persist email)
- Smooth keyboard avoiding view
- Error messages inline below fields (not toast)

### A3. RegisterScreen.tsx (359 lines)
**Visual changes:**
- Same white, minimal aesthetic as login
- "Create your account" - 28px weight 800
- Role selector (RoleSelector.tsx): card-based, white bg with shadow, selected state has emerald border (2px) - not a full colored background
- Form fields: consistent with login styling
- "Create Account" - emerald CTA
- Progress indicator if multi-step: thin bar in `#EBEBEB` with emerald fill

**UX improvements:**
- Role selection as first step (sets context for the rest)
- Password strength indicator (bar, not text)
- Inline validation (check marks appear as fields pass)
- Terms checkbox with tappable links
- "Already have an account?" prominent at bottom

### A4. ForgotPasswordScreen.tsx (390 lines)
**Visual changes:**
- Minimal: icon (lock or email, monochrome), title, subtitle, single input, single CTA
- "Reset your password" - 28px weight 800
- Description text: `#717171`
- Single emerald "Send Reset Link" button
- Success state: checkmark icon in `#222222`, confirmation text

**UX improvements:**
- Auto-focus email field
- Show success state inline (don't navigate away)
- "Back to sign in" as text link, not button
- Countdown timer for resend (60s)

### A5. MFAVerificationScreen.tsx (465 lines)
**Visual changes:**
- Clean white screen with centered content
- "Enter verification code" - 28px weight 800
- Code input boxes: `#EBEBEB` border, active box gets `#222222` border (not emerald)
- "Verify" - emerald CTA
- Resend link: `#717171` with countdown

**UX improvements:**
- Auto-advance between code boxes
- Auto-submit when all digits entered
- Paste support (detect clipboard code)
- Haptic feedback on digit entry
- Clear error shake animation on wrong code

---

## PHASE B: Home Screens (Homeowner)

### B1. HomeScreen.tsx (70 lines) - Container
No visual changes needed (just routes to role dashboard).

### B2. HomeownerDashboard.tsx (282 lines)
**Visual changes:**
- Remove any colored welcome banner - replace with simple text
- Greeting: "Good morning, [Name]" - 28px weight 800 `#222222`
- Subtitle: "Here's what's happening" - 15px `#717171`
- Active jobs section: white cards with shadow `sm`, no borders
- Quick action buttons: monochrome icons, `#222222` label, `#F7F7F7` background circle
- Floating "+" FAB: emerald `#10B981` - the ONLY colored element
- Stats row: numbers in weight 800, labels in `#717171`
- Section headers: "Active Jobs" - 19px weight 700 `#222222`

**UX improvements:**
- Show most important info first: active jobs with status
- If no active jobs: clean empty state with illustration and CTA
- Pull-to-refresh with emerald spinner
- Quick actions reduced to 4 max (avoid choice paralysis)
- Notification bell in header with unread count badge (emerald dot)

### B3. WelcomeBanner.tsx (85 lines)
**Visual changes:**
- Remove colored background entirely
- Name: 28px weight 800 `#222222`
- Time-based greeting: 15px `#717171`
- No icon/emoji unless monochrome

### B4. QuickServices.tsx (195 lines)
**Visual changes:**
- Service icons: monochrome `#222222` on `#F7F7F7` circles (not colored)
- Labels: 13px `#717171`
- Grid: 4 columns, 16px gap
- Selected/active service: emerald ring, not colored fill

**UX improvements:**
- Show 8 max, "See all" link for more
- Most-used services first (based on user history)

### B5. RecentJobs.tsx (185 lines)
**Visual changes:**
- Job cards: white bg, shadow `sm`, 12px radius, 20px padding
- Job title: 17px weight 600 `#222222`
- Status pill: emerald for active, `#F7F7F7` bg with `#717171` text for others
- Date/time: 13px `#B0B0B0`
- Contractor name: 15px `#717171`
- Photo thumbnail: 12px radius, no border

**UX improvements:**
- Tap card to navigate to job details
- Swipe left for quick actions (message, cancel)
- Show "No recent jobs" with CTA to create first job

### B6. BidsReceived.tsx (146 lines)
**Visual changes:**
- Bid cards: white bg, shadow `sm`, no border
- Contractor avatar: 48px circle, no colored ring
- Bid amount: 22px weight 800 `#222222`
- "View Bids" link: `#222222` underline

### B7. FindContractorsButton.tsx (94 lines)
**Visual changes:**
- Outlined button: `#DDDDDD` border, `#222222` text, monochrome search icon
- OR: emerald fill if this is the primary CTA on screen

### B8. ScheduleSection.tsx (251 lines)
**Visual changes:**
- Timeline dots: `#EBEBEB` default, emerald for today/next
- Date text: 15px weight 600 `#222222`
- Time: 13px `#717171`
- Event cards: white bg, left emerald accent bar (3px) for upcoming

### B9. StatsSection.tsx (118 lines)
**Visual changes:**
- Stat numbers: 28px weight 800 `#222222`
- Labels: 13px `#717171`
- Cards: `#F7F7F7` bg, no border, 12px radius

---

## PHASE C: Home Screens (Contractor)

### C1. ContractorDashboard.tsx (199 lines)
**Visual changes:**
- Same clean white aesthetic as homeowner
- Earnings: 36px weight 800 `#222222` (hero metric)
- "This month" label: 13px `#717171`
- Lead cards: white bg, shadow `sm`
- Schedule preview: clean timeline, emerald dot for next event
- Stats grid: 2x2, numbers in weight 800

**UX improvements:**
- Earnings front and center (contractors care about money first)
- New leads with urgency indicator (time since posted)
- Quick action: "Browse Jobs" as emerald CTA
- Today's schedule at a glance

### C2. ContractorBanner.tsx (98 lines)
**Visual changes:**
- Remove any colored banner background
- Profile completion prompt: white card, progress bar (emerald fill on `#F0F0F0` track)
- Text: `#222222` heading, `#717171` body

### C3. StatsCards.tsx (113 lines)
**Visual changes:**
- Numbers: 24px weight 800 `#222222`
- Trend arrows: emerald for up, `#EF4444` for down
- Card: `#F7F7F7` bg, no border, 12px radius, 20px padding
- Labels: 13px `#717171`

---

## PHASE D: Jobs Flow (9 screens)

### D1. JobsScreen.tsx (590 lines)
**Visual changes:**
- Filter tabs: horizontal scroll pills
  - Active: emerald bg, white text
  - Inactive: `#F7F7F7` bg, `#717171` text
- Job cards: white bg, shadow `sm`, 12px radius
- Job title: 17px weight 600 `#222222`
- Budget: 17px weight 700 `#222222`
- Location: 13px `#717171` with monochrome pin icon
- Status badge: flat pill (no border), colored only for active states
- Empty state: centered illustration, `#717171` text, emerald CTA

**UX improvements:**
- Search bar at top with filter icon
- Sort options: newest, budget high-low, distance
- Pull-to-refresh
- Infinite scroll with skeleton loader
- Swipe actions on job cards (contractor: bid, homeowner: edit/delete)

### D2. JobDetailsScreen.tsx (124 lines)
**Visual changes:**
- Full-width photo gallery at top (no padding, edge-to-edge photos)
- Back button: white circle with shadow overlaid on photo
- Title: 24px weight 800 `#222222`
- Status pill: top right, flat
- Description: 15px `#717171` line-height 1.6
- Budget: 22px weight 800 `#222222`
- Location: `#717171` with monochrome map pin
- Contractor/homeowner card: white bg, shadow `sm`, avatar + name + rating
- CTA: single emerald button ("Submit Bid" for contractor, "Review Bids" for homeowner)

**UX improvements:**
- Photo gallery with horizontal scroll + page indicators
- Sticky CTA at bottom (above safe area)
- Share button in header
- Related info collapsible sections (description, requirements, timeline)

### D3. JobPostingScreen.tsx (865 lines) - LARGEST
**Visual changes:**
- Step wizard with progress bar: emerald fill on `#F0F0F0` track
- Each step: white bg, generous padding
- Input labels: 15px weight 500 `#222222`
- Inputs: warm styling (per theme)
- Photo upload: dashed `#EBEBEB` border, `#717171` "+" icon
- Category selector: grid of monochrome icons on `#F7F7F7`
- Budget range: emerald slider handles
- "Post Job" final CTA: emerald

**UX improvements:**
- Multi-step wizard (5 steps max: Category, Details, Photos, Budget, Review)
- Progress saves automatically (draft)
- Photo upload with camera and gallery options
- Budget range with market average indicator
- Review step before posting (summary card)
- Back/Next navigation, not just scroll

### D4. BidSubmissionScreen.tsx (327 lines)
**Visual changes:**
- Job summary card at top: compact, `#F7F7F7` bg
- Bid amount input: large number format, `#222222`
- Timeline selector: clean date picker
- Message textarea: warm border, generous height
- "Submit Bid" - emerald CTA
- Competitive pricing hint: `#717171` text

**UX improvements:**
- Show average bid range for similar jobs
- Timeline template options (quick select)
- Itemized option (materials + labor)
- Preview mode before submitting
- Character count for message

### D5. BidReviewScreen.tsx (535 lines)
**Visual changes:**
- Bid cards: white bg, shadow `sm`, full width
- Contractor avatar: 56px, no colored ring
- Bid amount: 22px weight 800 `#222222`
- Timeline: 15px `#717171`
- Rating: star icon (monochrome `#222222`) + number
- "Accept Bid" - emerald CTA
- "Decline" - text button `#717171`

**UX improvements:**
- Sort by: price, rating, timeline, response time
- Bid comparison mode (select 2-3 to compare)
- Contractor profile preview (tap avatar)
- Accept confirmation modal with contract preview

### D6. JobTimelineScreen.tsx (201 lines)
**Visual changes:**
- Vertical timeline with dots connected by line
- Line: `#EBEBEB`
- Completed dots: `#222222` filled
- Current dot: emerald with pulse animation
- Future dots: `#EBEBEB` outline
- Event cards: minimal, title + date + description
- Timestamps: 13px `#B0B0B0`

### D7. HomeownerPhotoReviewScreen.tsx (545 lines)
**Visual changes:**
- Full-width before/after photos
- BeforeAfterSlider: emerald drag handle, subtle shadow
- "Before" / "After" labels: 13px weight 600, overlaid on photos with semi-transparent bg
- Approve button: emerald CTA "Approve & Release Payment"
- Request changes: outlined button `#DDDDDD`
- Photo thumbnails: 12px radius, active thumbnail has emerald border

**UX improvements:**
- Pinch to zoom on photos
- Full-screen photo viewer on tap
- Side-by-side view option (in addition to slider)
- Approve with confirmation dialog (mentions payment release)
- Request changes with required comment field

### D8. DisputeScreen.tsx (259 lines)
**Visual changes:**
- Clean form layout on white
- Category selector: radio buttons with `#222222` active
- Description textarea: warm borders
- Evidence upload: photo upload area
- "Submit Dispute" - `#EF4444` (red, since this is a serious action)
- Warning text about dispute process: `#717171`

**UX improvements:**
- Explain dispute process clearly before form
- Required evidence (at least one photo)
- Timeline expectation (how long resolution takes)
- Alternative: "Contact contractor directly" prompt before escalating

### D9. ServiceRequestScreen.tsx (755 lines)
**Visual changes:**
- Same wizard approach as JobPostingScreen
- Category grid: monochrome icons
- Photo upload: clean, spacious
- Urgency selector: toggle pills (not colored, just weight differences)
- "Submit Request" - emerald CTA

**UX improvements:**
- Urgency affects display order for contractors
- Templates for common requests
- Location auto-detect with edit option

---

## PHASE E: Discover & Map (Contractor Only)

### E1. ExploreMapScreen.tsx (135 lines)
**Visual changes:**
- Map fills screen edge-to-edge
- Search bar overlaid at top: white bg, shadow `base`, 12px radius
- Filter chips below search: `#F7F7F7` bg, `#717171` text, active: emerald
- Map markers: small emerald dots (not large pins)
- Selected marker: larger emerald circle with white center

**UX improvements:**
- Cluster markers when zoomed out
- Re-search when map moves (like Airbnb)
- Bottom sheet list view (swipe up from bottom)
- Filter by: category, budget, distance, urgency
- Save search alerts

### E2. JobPreviewCard.tsx (198 lines)
**Visual changes:**
- Bottom sheet card: white bg, shadow `lg`, 16px top radius
- Drag handle: small gray pill at top
- Job photo: full-width at top of card, 12px radius
- Title: 19px weight 700 `#222222`
- Budget: 17px weight 700 `#222222`
- "View Details" - text link `#222222`
- "Quick Bid" - emerald CTA

### E3. MapSearchBar.tsx (98 lines)
**Visual changes:**
- White bg, shadow `base`, 12px radius
- Search icon: `#B0B0B0`
- Placeholder: `#B0B0B0`
- Filter icon: `#222222`

---

## PHASE F: Messaging (4 screens + components)

### F1. MessagesListScreen.tsx (365 lines)
**Visual changes:**
- Conversation rows: white bg, no borders between (use spacing)
- Avatar: 52px circle
- Name: 15px weight 600 `#222222`
- Last message preview: 14px `#717171`, truncated to 2 lines
- Timestamp: 13px `#B0B0B0` aligned right
- Unread indicator: emerald dot (6px) next to name
- Unread conversation: name in weight 700

**UX improvements:**
- Search conversations
- Swipe left to archive/mute
- Online indicator (green dot on avatar)
- Pinned conversations at top
- Empty state: "No messages yet - find a contractor to get started"

### F2. MessagingScreen.tsx (250 lines)
**Visual changes:**
- Background: `#F7F7F7`
- Sent messages: `#222222` bg, white text, 16px radius (top-left, top-right, bottom-left)
- Received messages: white bg, `#222222` text, 16px radius (top-left, top-right, bottom-right)
- Timestamp: 11px `#B0B0B0` below bubble
- Input bar: white bg, `#EBEBEB` border, 24px radius
- Send button: emerald circle icon
- Attachment button: `#717171`

**UX improvements:**
- Read receipts (subtle checkmarks)
- Typing indicator
- Quick replies (pre-written responses)
- Photo/file sharing
- Job reference card (link to job in conversation)

### F3. ChatHeader.tsx (101 lines)
- Name: 17px weight 600 `#222222`
- "Active now" / "Last seen": 13px `#717171`
- Back arrow: `#222222`
- Video call icon: `#717171`

### F4. MessageBubble.tsx (129 lines)
- As described in F2

### F5. MessageComposer.tsx (110 lines)
- As described in F2

---

## PHASE G: Profile & Settings (20+ screens)

### G1. ProfileScreen.tsx (168 lines)
**Visual changes:**
- Profile header: centered avatar (80px), name 22px weight 800, role badge subtle
- Stats row: 3 stats in a row, numbers weight 800 `#222222`, labels `#717171`
- Menu sections: grouped with section headers
- Menu rows: 56px height, icon (monochrome) + label + chevron, no background color
- Dividers: `#F5F5F5` (very subtle, or just spacing)
- "Sign Out" at bottom: `#717171` text (not red, not scary)

**UX improvements:**
- Profile completion percentage (if incomplete)
- Verification badges visible
- Quick edit button on avatar (camera icon overlay)
- Section grouping: Account, Business (contractor), Preferences, Support

### G2. EditProfileScreen.tsx (472 lines)
**Visual changes:**
- Avatar editor: tap to change, camera overlay icon
- Form fields: warm styled inputs per theme
- Section headers: 17px weight 600 `#222222`
- "Save Changes" - emerald CTA (sticky at bottom)
- Destructive actions: "Delete Account" in `#EF4444` at very bottom

**UX improvements:**
- Unsaved changes warning on back navigation
- Photo cropper for avatar
- Field validation inline
- Auto-save draft

### G3. NotificationSettingsScreen.tsx (474 lines)
**Visual changes:**
- Toggle switches: emerald when ON, `#EBEBEB` when OFF
- Category headers: 17px weight 600 `#222222`
- Description: 14px `#717171`
- Grouped by type (Push, Email, SMS)

### G4. NotificationScreen.tsx (370 lines)
**Visual changes:**
- Notification rows: white bg, unread has `#F7F7F7` bg
- Icon: monochrome, relevant to type
- Title: 15px weight 500 `#222222`
- Body: 14px `#717171`
- Time: 13px `#B0B0B0`
- Unread dot: emerald

**UX improvements:**
- Mark all as read
- Filter by type
- Group by date (Today, Yesterday, This Week)
- Swipe to dismiss

### G5. PaymentMethodScreen.tsx (702 lines)
**Visual changes:**
- Card previews: dark bg (`#222222`) with white text (like real cards)
- "Default" badge: emerald pill
- Add button: outlined, `#DDDDDD` border
- Card icons: brand-specific (Visa, MC) in monochrome

**UX improvements:**
- Swipe to set default / delete
- Card scanning option
- Security info tooltip
- Clear confirmation for delete

### G6. HelpCenterScreen.tsx (484 lines)
**Visual changes:**
- Search bar at top
- FAQ categories: icon + title, accordion style
- Expanded answer: `#717171` text
- "Contact Support" - emerald CTA at bottom

### G7. InvoiceManagementScreen.tsx (466 lines)
**Visual changes:**
- Invoice cards: white bg, shadow `sm`
- Amount: 19px weight 700 `#222222`
- Status: flat badge (Paid: `#D1FAE5` bg + `#059669` text, Pending: `#FEF3C7` bg + `#92400E` text)
- Date: 13px `#B0B0B0`

**UX improvements:**
- Filter by status
- Quick "Send Reminder" action
- PDF preview
- Batch actions (select multiple)

### G8. CRMDashboardScreen.tsx (472 lines)
**Visual changes:**
- Client cards: avatar + name + last job date
- Metrics: weight 800 numbers
- Tabs for segments (Active, Past, Leads)
- Search bar

### G9. FinanceDashboardScreen.tsx (91 lines)
**Visual changes:**
- Hero metric: monthly earnings, 36px weight 800 `#222222`
- Chart: monochrome bars/line with emerald for current period
- Period selector: pills (same as job filter tabs)

### G10. QuoteBuilderScreen.tsx (512 lines)
**Visual changes:**
- Clean form: white sections with subtle shadows
- Line items: swipeable rows
- Total: 22px weight 800 `#222222`
- "Send Quote" - emerald CTA

### G11. ContractorCardEditorScreen.tsx (599 lines)
**Visual changes:**
- Preview card at top showing how it looks
- Edit sections below
- Photo gallery: grid layout, add button with "+" icon
- "Save" - emerald CTA

### G12. ServiceAreasScreen.tsx (86 lines) + components
**Visual changes:**
- Map preview showing coverage area
- List of areas with radius
- "Add Area" - emerald CTA

### G13. CalendarScreen.tsx (190 lines)
**Visual changes:**
- Calendar grid: white bg
- Today: emerald circle
- Events: emerald dots below date
- Selected date: `#222222` circle
- Event list below calendar: cards per event

### G14. ReviewsScreen.tsx (218 lines)
**Visual changes:**
- Overall rating: large 36px weight 800 `#222222` + stars (filled `#222222`)
- Review cards: avatar + name + stars + text
- Stars: filled `#222222`, empty `#EBEBEB`
- Date: 13px `#B0B0B0`

### G15. PropertiesScreen.tsx (228 lines)
**Visual changes:**
- Property cards: photo-forward (full-width image at top)
- Property name: 17px weight 600 `#222222`
- Address: 14px `#717171`
- Job count: `#B0B0B0`
- "Add Property" - emerald FAB or CTA

### G16. PropertyDetailScreen.tsx (253 lines)
**Visual changes:**
- Full-width hero photo
- Name: 24px weight 800 `#222222`
- Address: 15px `#717171`
- Maintenance history: timeline style
- "Request Service" - emerald CTA

### G17. AddPropertyScreen.tsx (358 lines)
**Visual changes:**
- Photo upload first (large area)
- Clean form fields below
- Address autocomplete
- "Add Property" - emerald CTA

---

## PHASE H: Contractor-Specific Screens

### H1. ContractorDiscoveryScreen.tsx (386 lines)
**Visual changes:**
- Search + filter bar at top
- Contractor cards: photo-forward
  - Photo: full-width, 12px top radius
  - Name: 17px weight 600 `#222222`
  - Rating: stars `#222222` + number
  - Specialties: small text pills `#F7F7F7`
  - "View Profile" - text link `#222222`
  - Response time: 13px `#B0B0B0`
- NO colored backgrounds on cards

**UX improvements:**
- Infinite scroll
- "Recommended for you" section
- Recently viewed contractors
- Compare feature (select 2-3)

### H2. ContractorProfileScreen.tsx (95 lines + components)
**Visual changes:**
- Cover photo: full-width, edge-to-edge
- Avatar: 80px, overlapping cover photo (white border ring)
- Name: 24px weight 800 `#222222`
- Rating + reviews count: 15px `#717171`
- Verified badge: subtle (not large or colored)
- Stats row: jobs completed, response time, hire rate - numbers weight 700
- Tab bar: "Portfolio | Reviews | About" - active underline in `#222222`
- Photo gallery: masonry grid, tap to enlarge
- "Request Quote" - emerald CTA (sticky bottom)
- "Message" - outlined button

### H3. ContractorVerificationScreen.tsx (455 lines)
**Visual changes:**
- Checklist style: verification steps as rows
- Completed: `#222222` checkmark
- Pending: `#B0B0B0` circle
- Upload areas: dashed `#EBEBEB` border
- "Submit for Review" - emerald CTA

### H4. PerformanceDashboard.tsx (578 lines)
**Visual changes:**
- KPIs: large numbers weight 800, trend indicators
- Charts: monochrome with emerald highlight for key data
- Period selector: pills
- Cards: white bg, shadow `sm`
- Section headers: 19px weight 700 `#222222`

**UX improvements:**
- Time period comparison (this month vs last)
- Goal setting and progress tracking
- Export data option

---

## PHASE I: Booking Screens

### I1. BookingList.tsx (99 lines)
**Visual changes:**
- Tab pills: Active / Past / Cancelled
- Booking cards: white bg, shadow `sm`
- Status indicator: colored pill (same color rules as invoices)

### I2. BookingStatusScreen.tsx (197 lines)
**Visual changes:**
- Status timeline (vertical)
- Status-specific colors minimal (emerald active, `#EBEBEB` pending)
- Action buttons at bottom

### I3. BookingCard.tsx (506 lines in components/)
**Visual changes:**
- Photo thumbnail: 12px radius
- Title: weight 600 `#222222`
- Date/time: `#717171`
- Price: weight 700 `#222222`
- Status badge: flat pill
- Action buttons: text links

### I4. CancellationModal.tsx (295 lines)
**Visual changes:**
- Bottom sheet modal: white bg, 16px top radius
- Drag handle at top
- Reason selector: radio buttons
- Warning text: `#717171`
- "Cancel Booking" - `#EF4444` button (destructive)
- "Keep Booking" - outlined button

### I5. TabHeader.tsx (158 lines)
**Visual changes:**
- Tab pills: consistent with jobs filter tabs
- Active: emerald, inactive: `#F7F7F7`

---

## PHASE J: Meeting Screens

### J1. MeetingScheduleScreen.tsx (137 lines + components)
**Visual changes:**
- Clean step flow: select type, date/time, location, confirm
- Date picker: emerald selected date
- Time slots: pills, selected has emerald bg
- "Schedule Meeting" - emerald CTA

### J2. MeetingDetailsScreen.tsx (846 lines) - 2nd LARGEST
**Visual changes:**
- Meeting card: date prominent (28px weight 800)
- Participant card: avatar + name
- Join video call button: emerald CTA
- Reschedule: outlined button
- Cancel: text link `#717171`

**UX improvements:**
- Calendar integration prompt
- Reminder settings
- Pre-meeting checklist
- Meeting notes section

---

## PHASE K: Payment Screens

### K1. PaymentScreen.tsx (182 lines)
**Visual changes:**
- Order summary: white card, shadow `sm`
- Total: 28px weight 800 `#222222`
- Stripe elements: default styling
- "Pay Now" - emerald CTA
- Security badges: monochrome, subtle

### K2. AddPaymentMethodScreen.tsx (520 lines)
**Visual changes:**
- Card type selector: outlined cards
- Form: clean input fields
- "Add Card" - emerald CTA
- Card preview: dark bg with white text

---

## PHASE L: Specialty Screens

### L1. VideoCallScreen.tsx (318 lines)
**Visual changes:**
- Full-screen video
- Controls overlay: semi-transparent bottom bar
- Buttons: circular, `rgba(0,0,0,0.5)` bg
- End call: red circle

### L2. AISearchScreen.tsx (553 lines)
**Visual changes:**
- Search input: large, centered, focused
- Results: card-based, photo-forward
- AI suggestions: `#F7F7F7` chips

### L3. PropertyAssessmentScreen.tsx (268 lines + components)
**Visual changes:**
- Wizard steps: progress bar
- Photo upload: large camera area
- AI insights: white card, shadow `sm`
- "Get Assessment" - emerald CTA

### L4. ErrorFallback.tsx (388 lines)
**Visual changes:**
- Centered content on white
- Icon: monochrome
- Title: 22px weight 700 `#222222`
- Message: 15px `#717171`
- "Try Again" - emerald CTA
- "Go Home" - outlined button

---

## PHASE M: Shared Components Polish

### M1. BeforeAfterSlider.tsx (164 lines)
- Drag handle: emerald circle with white arrow
- Labels: semi-transparent overlay

### M2. ContractorCard.tsx (670 lines)
- Photo-forward layout
- Monochrome action icons
- Rating stars: `#222222`

### M3. JobCard.tsx (156 lines)
- Same as D1 cards

### M4. SearchBar.tsx (332 lines)
- White bg, shadow `base`, 12px radius
- Monochrome icons

### M5. SkeletonLoader.tsx (286 lines)
- Warm gray shimmer: `#F0F0F0` to `#F7F7F7` to `#F0F0F0`

### M6. StatusPill.tsx (32 lines)
- Flat pills, semantic colors only (success, warning, error)

### M7. LoadingStates.tsx (589 lines) & LoadingScreen.tsx (266 lines)
- Emerald spinner
- Warm gray skeleton animations
- "Loading..." text in `#717171`

### M8. EmptyState.tsx (73 lines)
- Centered illustration
- Title: 19px weight 700 `#222222`
- Body: 15px `#717171`
- CTA: emerald button

### M9. All remaining components in components/
Apply same rules: monochrome icons, warm grays, shadow instead of borders, single emerald accent where needed.

---

## PHASE N: Navigation & Global Chrome

### N1. CustomTabBar.tsx
- No top border line - subtle shadow instead
- Active icon: emerald
- Inactive icon: `#B0B0B0`
- Labels: 11px, active weight 500, inactive weight 400
- Background: white with subtle top shadow

### N2. NavigationHeader.tsx (264 lines)
- No bottom border - subtle shadow
- Title: 19px weight 700 `#222222`
- Back arrow: `#222222`
- Right actions: monochrome icons

### N3. Pull-to-refresh (global)
- Emerald refresh indicator on all scrollable screens

### N4. Toast/Toast.tsx (543 lines)
- Success: emerald left accent bar, white bg
- Error: red left accent bar, white bg
- Info: `#222222` left accent bar, white bg
- 12px radius, shadow `md`

---

## PHASE O: Dark Mode Audit

After all light mode changes, walk through every screen in dark mode:
- Verify emerald `#10B981` stays or shifts to `#34D399` for dark bg contrast
- All warm dark backgrounds: `#181818`, `#222222`, `#333333`
- Text: `#F5F5F5` primary, `#B0B0B0` secondary
- Cards: `#222222` bg with subtle `#333333` border
- No pure black (#000000) backgrounds

---

## PHASE P: Animation & Micro-interactions

### P1. Screen transitions
- Slide from right: 300ms ease-out
- Modals: slide up from bottom with spring

### P2. Button feedback
- Scale 0.97 on press (100ms)
- Haptic feedback on primary CTA tap

### P3. Card press
- Scale 0.99 (150ms) - very subtle

### P4. List items
- FadeIn + SlideUp on appear (staggered 50ms per item)

### P5. Tab bar
- Icon springs when tapped
- Active indicator slides between tabs

### P6. Pull-to-refresh
- Emerald spinner with smooth rotation

### P7. Page transitions
- Shared element transitions for photos (job list to detail)
- Cross-fade for tab switches

---

## Execution Order (Recommended)

1. **Phase M** (Shared Components) - fixes propagate everywhere
2. **Phase N** (Navigation Chrome) - global polish
3. **Phase A** (Auth) - first impression
4. **Phase B** (Homeowner Home) - core experience
5. **Phase C** (Contractor Home) - core experience
6. **Phase D** (Jobs Flow) - main feature
7. **Phase E** (Discover/Map) - contractor discovery
8. **Phase F** (Messaging) - communication
9. **Phase G** (Profile/Settings) - account management
10. **Phase H** (Contractor-Specific) - business tools
11. **Phase I** (Booking) - scheduling
12. **Phase J** (Meetings) - video/scheduling
13. **Phase K** (Payments) - transactions
14. **Phase L** (Specialty) - AI, video, assessment
15. **Phase O** (Dark Mode Audit) - consistency pass
16. **Phase P** (Animations) - final polish

---

## Total Screens Covered: ~72 unique screens
## Total Components Touched: ~60+ shared components
## Estimated Files Modified: 130+
