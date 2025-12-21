# AI Pricing Suggestion UI - Visual Guide

## UI Components

### 1. AI Pricing Help Button

**Location:** Bid submission page, next to "Your Bid Amount" label

```
┌─────────────────────────────────────────────────────┐
│ Your Bid Amount (£) *     [💡 AI Pricing Help]     │
│ ┌─────────────────────────────────────────────────┐ │
│ │ £ [________0.00________]                        │ │
│ └─────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
```

**Button Styling:**
- Gradient: Purple-600 → Blue-600
- Icon: Lightbulb (AI indicator)
- Text: "AI Pricing Help"
- States: Default, Hover, Loading, Disabled

**Loading State:**
```
[⚪ Loading...]  (spinning loader)
```

---

### 2. Pricing Suggestion Card (Expanded)

**Full card layout when suggestion is displayed:**

```
╔═══════════════════════════════════════════════════════════════════╗
║  💡 AI Pricing Suggestion                                    [×]  ║
║  Powered by market data and ML analysis                           ║
╠═══════════════════════════════════════════════════════════════════╣
║                                                                    ║
║  Suggested Price Range                                            ║
║  ┌──────────────┬──────────────────┬──────────────┐              ║
║  │   Minimum    │   Recommended    │   Maximum    │              ║
║  │              │ ┌──────────────┐ │              │              ║
║  │   £450.00    │ │   £525.00    │ │   £600.00    │              ║
║  │              │ │  [78% Win]   │ │              │              ║
║  │              │ └──────────────┘ │              │              ║
║  └──────────────┴──────────────────┴──────────────┘              ║
║     (white)        (teal gradient)     (white)                    ║
║                                                                    ║
╠───────────────────────────────────────────────────────────────────╣
║  📊 Market Insights                                               ║
║  ┌──────────────────────────────────────────────────────────────┐║
║  │ Average Bid:    £510.50    │ Median Bid:     £520.00        │║
║  │ Market Range:   £400-£650  │ Competitiveness: [Competitive] │║
║  │                                                               │║
║  │ Based on 47 similar accepted bids                            │║
║  └──────────────────────────────────────────────────────────────┘║
╠───────────────────────────────────────────────────────────────────╣
║  ℹ️ AI Analysis                                                   ║
║  ┌──────────────────────────────────────────────────────────────┐║
║  │ Based on 47 similar accepted bids, the market median is     │║
║  │ £520.00. Recommended optimal price: £525.00 (adjusted for:  │║
║  │ above-average complexity, 8% higher for location, contractor│║
║  │ tier premium). Your price is competitive within the market  │║
║  │ range.                                                       │║
║  │                                                               │║
║  │ Confidence: [████████████████░░░░] 85%                       │║
║  └──────────────────────────────────────────────────────────────┘║
╠───────────────────────────────────────────────────────────────────╣
║  [✓ Use £525.00]                              [Dismiss]          ║
╚═══════════════════════════════════════════════════════════════════╝
```

---

### 3. Color Schemes by Competitiveness Level

#### Competitive (Default)
```
Background: Emerald-50 (#F0FDF4)
Border: Emerald-300 (#86EFAC)
Badge: Emerald-200/800
Icon: Emerald-600
```

#### Too Low (Warning)
```
Background: Amber-50 (#FFFBEB)
Border: Amber-300 (#FCD34D)
Badge: Amber-200/800
Icon: Amber-600
Text: "Below Market"
```

#### Premium (Info)
```
Background: Blue-50 (#EFF6FF)
Border: Blue-300 (#93C5FD)
Badge: Blue-200/800
Icon: Blue-600
Text: "Premium Pricing"
```

#### Too High (Danger)
```
Background: Rose-50 (#FFF1F2)
Border: Rose-300 (#FDA4AF)
Badge: Rose-200/800
Icon: Rose-600
Text: "Above Market"
```

---

### 4. Responsive Breakpoints

#### Desktop (≥1024px)
```
┌─────────────────────────────────────────────────────────────┐
│ Job Details (sidebar)  │  Bid Form (main, 2/3 width)        │
│                        │  ┌────────────────────────────────┐│
│ [Job Info]             │  │ AI Pricing Help button         ││
│ [Homeowner]            │  │ Pricing Suggestion Card        ││
│ [Tips]                 │  │ Bid Amount Input               ││
│                        │  │ ...rest of form...             ││
│                        │  └────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

#### Tablet (768px - 1023px)
```
┌──────────────────────────────────────┐
│ Bid Form (full width)                │
│ ┌──────────────────────────────────┐ │
│ │ AI Pricing Help (full width)    │ │
│ │ Suggestion Card (stacked prices)│ │
│ └──────────────────────────────────┘ │
│                                      │
│ Job Details (below form)             │
└──────────────────────────────────────┘
```

#### Mobile (< 768px)
```
┌────────────────────────┐
│ [💡] AI Help          │ ← Compact button
│ ┌────────────────────┐ │
│ │ Min:    £450       │ │
│ │ 💰 £525  [78%]    │ │ ← Emphasized
│ │ Max:    £600       │ │
│ ├────────────────────┤ │
│ │ Market: £510 avg  │ │
│ │ [Competitive]     │ │
│ ├────────────────────┤ │
│ │ AI reasoning...   │ │
│ │ [Use] [Dismiss]   │ │
│ └────────────────────┘ │
└────────────────────────┘
```

---

### 5. Interaction States

#### Initial State (No Suggestion)
```
Your Bid Amount (£) *     [💡 AI Pricing Help]
£ [_____________]
```

#### Loading State
```
Your Bid Amount (£) *     [⚪ Loading...]
£ [_____________]
```

#### Suggestion Displayed
```
Your Bid Amount (£) *     [💡 AI Pricing Help]
£ [_____________]

╔═══════════════════════════════════╗
║ 💡 AI Pricing Suggestion     [×] ║
║ ...suggestion card...            ║
╚═══════════════════════════════════╝
```

#### After Applying Suggestion
```
Your Bid Amount (£) *     [💡 AI Pricing Help]
£ [____525.00____]  ✓ Suggested price applied!

(Suggestion card dismissed)
```

---

### 6. Accessibility Features

#### Keyboard Navigation
```
Tab Order:
1. "AI Pricing Help" button
2. Bid amount input
3. Suggestion card "Use £X" button
4. Suggestion card "Dismiss" button
5. Next form field...

Shortcuts:
- Enter: Trigger focused button
- Escape: Dismiss suggestion card
- Tab/Shift+Tab: Navigate
```

#### Screen Reader Announcements
```
"Button: AI Pricing Help. Get intelligent pricing suggestion based on market data."
"Loading pricing suggestion..."
"Pricing suggestion loaded. Recommended price: £525, with 78% win probability."
"Button: Use £525. Apply this suggested price to your bid."
"Success: Applied suggested price £525 to bid amount."
```

#### Focus Indicators
```
[💡 AI Pricing Help]      ← Default
╔═══════════════════╗
║ 💡 AI Pricing Help ║    ← Focused (teal ring)
╚═══════════════════╝
```

---

### 7. Error States

#### No Market Data
```
┌─────────────────────────────────────────────┐
│ ⚠️ No pricing suggestion available          │
│                                             │
│ Not enough market data for this job        │
│ category and location. Please use your     │
│ best judgment.                             │
│                                             │
│ [OK]                                       │
└─────────────────────────────────────────────┘
```

#### Network Error
```
Toast notification (top-right):
┌─────────────────────────────────┐
│ ❌ Failed to get pricing        │
│    suggestion. Please try again.│
└─────────────────────────────────┘
```

#### Unauthorized (Non-contractor)
```
Toast notification:
┌─────────────────────────────────────┐
│ ⛔ Only contractors can request     │
│    pricing suggestions.             │
└─────────────────────────────────────┘
```

---

### 8. Animation & Transitions

#### Card Entrance
```
Fade in + Scale up (0.95 → 1.0)
Duration: 300ms
Easing: ease-out
```

#### Card Exit
```
Fade out + Scale down (1.0 → 0.95)
Duration: 200ms
Easing: ease-in
```

#### Button Hover
```
Background: Gradient shift
Shadow: sm → md
Transform: translateY(-1px)
Duration: 150ms
```

#### Confidence Bar Animation
```
Width: 0% → 85%
Duration: 800ms
Easing: ease-in-out
Delay: 200ms (after card appears)
```

---

### 9. Typography Hierarchy

```
Card Title: text-xl font-bold (20px, 700)
Section Headers: text-sm font-semibold (14px, 600)
Price (recommended): text-3xl font-bold (30px, 700)
Price (min/max): text-2xl font-bold (24px, 700)
Body Text: text-sm (14px, 400)
Small Text: text-xs (12px, 400)
Badge Text: text-xs font-semibold (12px, 600)
```

---

### 10. Spacing Guide

```
Card Padding: 24px (p-6)
Section Gaps: 24px (space-y-6)
Element Gaps: 16px (gap-4)
Compact Gaps: 12px (gap-3)
Border Radius: 12px (rounded-xl)
Button Padding: 12px 24px (px-6 py-3)
```

---

## Quick Reference

### Button Location
- **Page:** `/contractor/bid/[jobId]`
- **Section:** Right column, "Your Quote" section
- **Position:** Next to "Your Bid Amount (£) *" label

### Card Dimensions
- **Width:** Full container width (100%)
- **Max Width:** None (constrained by parent)
- **Height:** Auto (content-dependent)
- **Estimated Height:** 600-700px

### Z-Index Layers
```
Base: z-0
Card: z-10
Toast: z-50
Modal: z-100
```

### Performance Targets
- **API Response:** < 2 seconds
- **Card Render:** < 100ms
- **Animation:** 60 FPS
- **Bundle Size:** < 20KB (component)

---

**Visual Design by:** Frontend Specialist Agent
**Last Updated:** 2025-12-13
