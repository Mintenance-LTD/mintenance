import React, { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Home,
  Briefcase,
  MessageSquare,
  User,
  CreditCard,
  Plus,
  Hammer,
  Search,
  Star,
  MapPin,
  Calendar,
  Clock,
  FileText,
  Mail,
  Phone,
  Send,
  Camera,
  Building2,
  CheckCircle2,
  XCircle,
  Map as MapIcon,
  ShieldCheck,
  Fingerprint,
  Settings,
  Bell,
} from "lucide-react";

// === MintEnance Brand Theme (1:1) ===
const brand = {
  colors: {
    primary: "#0F172A", // navy
    primaryLight: "#1E293B",
    primaryDark: "#020617",
    secondary: "#4ECDC4", // mint
    secondaryLight: "#7FDDD4",
    secondaryDark: "#26A69A",
    background: "#FFFFFF",
    surfaceSecondary: "#F8FAFC",
    surfaceTertiary: "#F1F5F9",
    textPrimary: "#1F2937",
    textSecondary: "#4B5563",
    textTertiary: "#6B7280",
    border: "#E5E7EB",
    statusPosted: "#007AFF",
    statusAssigned: "#FF9500",
    statusInProgress: "#FF9500",
    statusCompleted: "#34C759",
    priorityHigh: "#FF3B30",
  },
  radius: { sm: 8, md: 12, lg: 16, xl: 24 },
} as const;

// --- Utility
function mergeStyle(a?: React.CSSProperties, b?: React.CSSProperties): React.CSSProperties {
  return { ...(a || {}), ...(b || {}) };
}

// Theming helpers
function PrimaryButton(
  { className = "", style, ...props }: React.ComponentProps<typeof Button>
) {
  return (
    <Button
      className={`h-11 rounded-[12px] ${className}`}
      style={mergeStyle({
        backgroundColor: brand.colors.primary,
        color: "#FFFFFF",
        border: `1px solid ${brand.colors.primary}`,
      }, style)}
      {...(props as any)}
    />
  );
}

function OutlineButton(
  { className = "", style, ...props }: React.ComponentProps<typeof Button>
) {
  return (
    <Button
      variant="outline"
      className={`h-11 rounded-[12px] ${className}`}
      style={mergeStyle({
        backgroundColor: brand.colors.background,
        border: `1px solid ${brand.colors.primary}`,
        color: brand.colors.primary,
      }, style)}
      {...(props as any)}
    />
  );
}

function Pill({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <span
      className="inline-flex items-center px-2.5 py-1 rounded-full text-sm"
      style={mergeStyle({
        border: `1px solid ${brand.colors.border}`,
        background: brand.colors.surfaceTertiary,
        color: brand.colors.textPrimary,
      }, style)}
    >
      {children}
    </span>
  );
}

function StatusPill({ status }: { status: "Posted"|"Assigned"|"In Progress"|"Completed"|"Paid"|"Pending" }) {
  const map: Record<string,string> = {
    Posted: brand.colors.statusPosted,
    Assigned: brand.colors.statusAssigned,
    "In Progress": brand.colors.statusInProgress,
    Completed: brand.colors.statusCompleted,
    Paid: brand.colors.statusCompleted,
    Pending: brand.colors.statusAssigned,
  };
  const bg = map[status] || brand.colors.border;
  return (
    <span
      className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium"
      style={{ backgroundColor: `${bg}20`, color: bg, border: `1px solid ${bg}` }}
    >
      {status}
    </span>
  );
}

// Phone frame
function PhoneFrame({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="mx-auto w-[390px] h-[844px] rounded-[2.4rem] shadow-2xl relative overflow-hidden"
      style={{ border: `1px solid ${brand.colors.border}`, background: brand.colors.background }}
    >
      <div className="absolute left-1/2 -translate-x-1/2 top-0 w-40 h-6 rounded-b-2xl" style={{ background: "rgba(0,0,0,0.06)" }} />
      <div className="pt-8 h-full flex flex-col">
        {children}
      </div>
    </div>
  );
}

function SectionDivider({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-4 py-3">
      <div className="h-px flex-1" style={{ background: brand.colors.border }} />
      <div className="text-xs font-medium" style={{ color: brand.colors.textPrimary }}>
        {children}
      </div>
    </div>
  );
}

// Nav helper - Updated with better icons and industry standards
function getNavItems(role: 'contractor' | 'homeowner') {
  if (role === 'homeowner') {
    return [
      { key: 'ho-home', label: 'Home', icon: <Home className="w-5 h-5"/> },
      { key: 'contractors', label: 'Find Pros', icon: <Search className="w-5 h-5"/> },
      { key: 'my-requests', label: 'Requests', icon: <FileText className="w-5 h-5"/> },
      { key: 'messages', label: 'Messages', icon: <MessageSquare className="w-5 h-5"/> },
      { key: 'ho-profile', label: 'Profile', icon: <User className="w-5 h-5"/> },
    ];
  }
  return [
    { key: 'home', label: 'Home', icon: <Home className="w-5 h-5"/> },
    { key: 'jobs', label: 'Jobs', icon: <Briefcase className="w-5 h-5"/> },
    { key: 'messages', label: 'Messages', icon: <MessageSquare className="w-5 h-5"/> },
    { key: 'payments', label: 'Payments', icon: <CreditCard className="w-5 h-5"/> },
    { key: 'profile', label: 'Profile', icon: <User className="w-5 h-5"/> },
  ];
}

// === Enhanced Dock Nav with accessibility and keyboard support ===
function BottomNav({ value, onChange, role }: { value: string; onChange: (v: string) => void; role: 'contractor' | 'homeowner' }) {
  const items = getNavItems(role);
  const centerLabel = role === 'homeowner' ? 'Create New Request' : 'Browse Live Jobs';
  const left = [items[0], items[1]]; // First two items
  const right = [items[2], items[3], items[4]]; // Last three items

  return (
    <nav 
      className="relative h-[110px]" 
      role="navigation" 
      aria-label="Main navigation"
    >
      {/* Enhanced dock with gradient and shadow */}
      <svg viewBox="0 0 390 68" className="absolute left-3 right-3 bottom-3 h-[68px]" preserveAspectRatio="none" aria-hidden="true">
        <defs>
          <linearGradient id="dockgrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={brand.colors.primaryLight}/>
            <stop offset="1" stopColor={brand.colors.primary}/>
          </linearGradient>
          <mask id="dockmask">
            <rect x="0" y="0" width="390" height="68" rx="26" fill="white" />
            <circle cx="195" cy="0" r="40" fill="black" />
          </mask>
          <filter id="dockshadow">
            <feDropShadow dx="0" dy="4" stdDeviation="8" floodColor="rgba(15, 23, 42, 0.25)"/>
          </filter>
        </defs>
        <rect x="0" y="0" width="390" height="68" rx="26" fill="url(#dockgrad)" mask="url(#dockmask)" filter="url(#dockshadow)" />
      </svg>

      <div className="absolute left-3 right-3 bottom-3 h-[64px] px-6 flex items-center justify-between">
        {/* Left side icons */}
        <div className="flex items-center gap-8">
          {left.map((it, index) => (
            <button 
              key={it.key} 
              onClick={() => onChange(it.key)} 
              className="flex flex-col items-center gap-1 text-[11px] transition-all duration-200 active:scale-95 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-slate-800 rounded-lg p-1"
              style={{ color: value===it.key ? brand.colors.secondary : '#FFFFFF' }}
              aria-label={`${it.label} tab`}
              aria-current={value===it.key ? 'page' : undefined}
              tabIndex={0}
            >
              <div className="w-6 h-6 grid place-items-center transition-transform duration-200" aria-hidden="true">
                {it.icon}
              </div>
              <span className="font-medium">{it.label}</span>
            </button>
          ))}
        </div>

        {/* Spacer for center button */}
        <div style={{ width: 100 }} />

        {/* Right side icons */}
        <div className="flex items-center gap-6">
          {right.map((it, index) => (
            <button 
              key={it.key} 
              onClick={() => onChange(it.key)} 
              className="flex flex-col items-center gap-1 text-[11px] transition-all duration-200 active:scale-95 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-slate-800 rounded-lg p-1"
              style={{ color: value===it.key ? brand.colors.secondary : '#FFFFFF' }}
              aria-label={`${it.label} tab`}
              aria-current={value===it.key ? 'page' : undefined}
              tabIndex={0}
            >
              <div className="w-6 h-6 grid place-items-center transition-transform duration-200" aria-hidden="true">
                {it.icon}
              </div>
              <span className="font-medium">{it.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Enhanced center Plus button with accessibility */}
      <button
        onClick={() => onChange(role === 'homeowner' ? 'service-request' : 'ct-map')}
        className="absolute left-1/2 -translate-x-1/2 -top-6 w-20 h-20 rounded-full grid place-items-center shadow-2xl active:scale-95 transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-white focus:ring-offset-4"
        aria-label={centerLabel}
        tabIndex={0}
        style={{ 
          background: `linear-gradient(135deg, ${brand.colors.secondary}, ${brand.colors.secondaryDark})`, 
          color: brand.colors.primary, 
          boxShadow: `0 12px 28px rgba(78, 205, 196, 0.3), 0 4px 12px rgba(0,0,0,0.1)`,
          border: `3px solid ${brand.colors.background}`,
        }}
      >
        <Plus className="w-8 h-8 stroke-[2.5]" aria-hidden="true"/>
      </button>

      {/* Notification indicators with accessibility */}
      {role === 'contractor' && (
        <div 
          className="absolute top-2 right-16 w-2 h-2 rounded-full animate-pulse" 
          style={{ background: brand.colors.priorityHigh }}
          aria-label="New notifications available"
          role="status"
        />
      )}
      {role === 'homeowner' && (
        <div 
          className="absolute top-2 right-28 w-2 h-2 rounded-full animate-pulse" 
          style={{ background: brand.colors.secondary }}
          aria-label="Updates available"
          role="status"
        />
      )}
    </nav>
  );
}

// --- Screen: Login with validation ---
function LoginScreenView({ onLogin }: { onLogin: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{email?: string; password?: string}>({});
  const [loading, setLoading] = useState(false);

  const validateForm = () => {
    const newErrors: {email?: string; password?: string} = {};
    
    if (!email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    
    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    
    setLoading(true);
    // Simulate API call
    setTimeout(() => {
      setLoading(false);
      onLogin();
    }, 1500);
  };

  return (
    <div className="space-y-4">
      <header className="text-center space-y-2 py-10" style={{ background: brand.colors.primary, color: "#FFFFFF" }}>
        <div className="mx-auto w-16 h-16 rounded-2xl grid place-items-center" style={{ background: brand.colors.secondary + "26" }}>
          <Hammer className="w-8 h-8" style={{ color: brand.colors.secondary }} aria-hidden="true"/>
        </div>
        <h1 className="text-xl font-bold">MintEnance</h1>
        <p className="text-sm opacity-80">Sign in to continue</p>
      </header>
      
      <main className="p-4 space-y-4" style={{ background: brand.colors.background }}>
        <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }} className="space-y-4">
          <ValidatedInput
            id="email"
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            error={errors.email}
            required
            autoComplete="email"
          />
          
          <ValidatedInput
            id="password"
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            error={errors.password}
            required
            autoComplete="current-password"
          />
          
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm">
              <input 
                type="checkbox" 
                className="rounded border-gray-300"
                style={{ accentColor: brand.colors.secondary }}
              />
              <span style={{ color: brand.colors.textSecondary }}>Remember me</span>
            </label>
            <button 
              type="button"
              className="text-sm underline transition-colors hover:opacity-80"
              style={{ color: brand.colors.primary }}
            >
              Forgot password?
            </button>
          </div>
          
          <PrimaryButton 
            type="submit"
            className="w-full" 
            disabled={loading}
            style={{ opacity: loading ? 0.7 : 1 }}
          >
            {loading ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Signing in...
              </div>
            ) : (
              'Sign in'
            )}
          </PrimaryButton>
        </form>
        
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t" style={{ borderColor: brand.colors.border }} />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="px-2" style={{ background: brand.colors.background, color: brand.colors.textSecondary }}>
              Or continue with
            </span>
          </div>
        </div>
        
        <OutlineButton className="w-full" onClick={() => alert('Biometric authentication would trigger here')}>
          <Fingerprint className="w-4 h-4 mr-2"/>
          Sign in with Biometric
        </OutlineButton>
      </main>
    </div>
  );
}

// --- Screen: Register ---
function RegisterScreenView() {
  return (
    <ScrollArea className="h-[752px]">
      <div className="p-4 space-y-3" style={{ background: brand.colors.background }}>
        <h2 className="text-xl font-semibold">Create account</h2>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2"><Label style={{ color: brand.colors.textSecondary }}>First name</Label><Input placeholder="Gloire" className="h-11" style={{ borderColor: brand.colors.border }}/></div>
          <div className="space-y-2"><Label style={{ color: brand.colors.textSecondary }}>Last name</Label><Input placeholder="Nkouka" className="h-11" style={{ borderColor: brand.colors.border }}/></div>
          <div className="space-y-2 col-span-2"><Label style={{ color: brand.colors.textSecondary }}>Email</Label><Input placeholder="you@example.com" className="h-11" style={{ borderColor: brand.colors.border }}/></div>
          <div className="space-y-2 col-span-2"><Label style={{ color: brand.colors.textSecondary }}>Phone</Label><Input placeholder="+44" className="h-11" style={{ borderColor: brand.colors.border }}/></div>
          <div className="space-y-2 col-span-2"><Label style={{ color: brand.colors.textSecondary }}>Password</Label><Input type="password" placeholder="••••••••" className="h-11" style={{ borderColor: brand.colors.border }}/></div>
        </div>
        <PrimaryButton className="w-full">Create account</PrimaryButton>
      </div>
    </ScrollArea>
  );
}

// Shared search bar with enhanced styling
function SearchBar() {
  return (
    <div className="flex items-center gap-2 p-3 rounded-xl" style={{ background: brand.colors.surfaceSecondary, border: `1px solid ${brand.colors.border}` }}>
      <Search className="w-5 h-5" style={{ color: brand.colors.textSecondary }}/>
      <Input placeholder="Search jobs, contractors, services" className="h-9 border-0 bg-transparent" />
    </div>
  );
}

// Enhanced gradient hero card with better visual hierarchy
function HeroInfo({ title, subtitle, right }: { title: string; subtitle: string; right?: React.ReactNode }) {
  return (
    <div className="p-4 rounded-[16px] text-sm flex items-start justify-between transition-all hover:shadow-md"
         style={{ 
           background: `linear-gradient(135deg, ${brand.colors.secondary}1A, #FFFFFF 60%)`, 
           border: `1px solid ${brand.colors.border}`,
           boxShadow: `0 2px 8px rgba(0,0,0,0.04)`
         }}>
      <div>
        <div className="font-semibold text-base" style={{ color: brand.colors.textPrimary }}>{title}</div>
        <div className="mt-1" style={{ color: brand.colors.textSecondary }}>{subtitle}</div>
      </div>
      {right && <div className="flex items-center gap-2">{right}</div>}
    </div>
  );
}

// Enhanced header component with accessibility improvements
function ScreenHeader({ title, subtitle, rightElement, showBackButton, onBack }: { 
  title: string; 
  subtitle?: string; 
  rightElement?: React.ReactNode;
  showBackButton?: boolean;
  onBack?: () => void;
}) {
  return (
    <header 
      className="px-4 py-4 border-b flex items-center justify-between" 
      style={{ background: brand.colors.primary, borderColor: brand.colors.primaryDark, color: "#FFFFFF" }}
      role="banner"
    >
      <div className="flex items-center gap-3">
        {showBackButton && (
          <button
            onClick={onBack}
            className="p-1 rounded-full transition-all active:scale-95"
            style={{ background: brand.colors.secondary + "20" }}
            aria-label="Go back"
          >
            <XCircle className="w-5 h-5" style={{ color: brand.colors.secondary }}/>
          </button>
        )}
        <Hammer className="w-6 h-6" style={{ color: brand.colors.secondary }} aria-hidden="true"/>
        <div>
          <h1 className="font-bold text-lg" id="page-title">{title}</h1>
          {subtitle && <p className="text-xs opacity-80" aria-describedby="page-title">{subtitle}</p>}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <button 
          className="p-1 rounded-full transition-all active:scale-95"
          style={{ background: brand.colors.secondary + "20" }}
          aria-label="Notifications"
        >
          <Bell className="w-5 h-5" style={{ color: brand.colors.secondary }}/>
        </button>
        {rightElement}
      </div>
    </header>
  );
}

// Loading skeleton component for better perceived performance
function CardSkeleton() {
  return (
    <Card style={{ borderColor: brand.colors.border }}>
      <CardHeader className="pb-2">
        <div className="animate-pulse">
          <div className="h-4 rounded-md mb-2" style={{ background: brand.colors.surfaceTertiary, width: '60%' }}/>
          <div className="h-3 rounded-md" style={{ background: brand.colors.surfaceTertiary, width: '80%' }}/>
        </div>
      </CardHeader>
      <CardContent>
        <div className="animate-pulse space-y-2">
          <div className="h-3 rounded-md" style={{ background: brand.colors.surfaceTertiary }}/>
          <div className="h-3 rounded-md" style={{ background: brand.colors.surfaceTertiary, width: '90%' }}/>
        </div>
      </CardContent>
    </Card>
  );
}

// Empty state component following industry patterns
function EmptyState({ 
  icon, 
  title, 
  description, 
  actionText, 
  onAction 
}: { 
  icon: React.ReactNode;
  title: string;
  description: string;
  actionText?: string;
  onAction?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center" style={{ minHeight: '300px' }}>
      <div className="w-16 h-16 rounded-full mb-4 grid place-items-center" 
           style={{ background: brand.colors.surfaceTertiary }}>
        {icon}
      </div>
      <h3 className="text-lg font-semibold mb-2" style={{ color: brand.colors.textPrimary }}>
        {title}
      </h3>
      <p className="text-sm mb-6 max-w-sm" style={{ color: brand.colors.textSecondary }}>
        {description}
      </p>
      {actionText && onAction && (
        <PrimaryButton onClick={onAction}>
          {actionText}
        </PrimaryButton>
      )}
    </div>
  );
}

// Enhanced form input with validation
function ValidatedInput({ 
  label, 
  error, 
  required,
  ...props 
}: { 
  label: string; 
  error?: string; 
  required?: boolean;
} & React.ComponentProps<typeof Input>) {
  const hasError = !!error;
  
  return (
    <div className="space-y-2">
      <Label 
        htmlFor={props.id} 
        style={{ color: brand.colors.textSecondary }}
        className="flex items-center gap-1"
      >
        {label}
        {required && <span style={{ color: brand.colors.priorityHigh }} aria-label="Required">*</span>}
      </Label>
      <Input 
        {...props}
        className={`h-11 ${hasError ? 'border-red-500 focus:ring-red-500' : ''}`}
        style={{ 
          borderColor: hasError ? brand.colors.priorityHigh : brand.colors.border,
          ...(props.style || {})
        }}
        aria-invalid={hasError}
        aria-describedby={hasError ? `${props.id}-error` : undefined}
      />
      {hasError && (
        <p 
          id={`${props.id}-error`}
          className="text-xs flex items-center gap-1"
          style={{ color: brand.colors.priorityHigh }}
          role="alert"
        >
          <XCircle className="w-3 h-3"/>
          {error}
        </p>
      )}
    </div>
  );
}

// --- Screen: Home (Contractor) with enhanced UI ---
function HomeScreenView({ goTo }: { goTo: (key: string) => void }) {
  return (
    <ScrollArea className="h-[752px]">
      <ScreenHeader 
        title="MintEnance" 
        rightElement={<span className="text-xs font-medium px-2 py-1 rounded-full" style={{ background: brand.colors.secondary + "26", color: brand.colors.secondary }}>Contractor</span>}
      />

      <div className="p-4 space-y-4" style={{ background: brand.colors.background }}>
        <div className="grid grid-cols-2 gap-3">
          <HeroInfo 
            title="Bristol" 
            subtitle="Partly cloudy • 22°C" 
            right={<span className="text-xs" style={{ color: brand.colors.textSecondary }}>Today</span>} 
          />
          <HeroInfo 
            title="This week" 
            subtitle="£360 earned" 
            right={<span className="text-xs font-medium px-2 py-1 rounded-full" style={{ background: brand.colors.statusCompleted + "20", color: brand.colors.statusCompleted }}>+12%</span>} 
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => goTo("ct-map")} className="col-span-2 rounded-xl p-5 text-left transition-all hover:shadow-lg active:scale-[.99]"
                  style={{ background: brand.colors.secondary + "26", border: `1px solid ${brand.colors.secondary}` }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium" style={{ color: brand.colors.textSecondary }}>Browse</p>
                <p className="text-lg font-bold mt-1">Live Jobs Near You</p>
              </div>
              <MapIcon className="w-7 h-7" style={{ color: brand.colors.secondary }}/>
            </div>
            <p className="mt-2 text-sm" style={{ color: brand.colors.textSecondary }}>Interactive map with real-time job postings</p>
          </button>

          <button onClick={() => goTo("jobs")} className="rounded-xl p-4 text-left transition-all hover:shadow-lg active:scale-[.99]"
                  style={{ background: brand.colors.surfaceSecondary, border: `1px solid ${brand.colors.border}` }}>
            <div className="flex items-center justify-between mb-2">
              <p className="font-semibold">My Jobs</p>
              <Pill style={{ background: brand.colors.statusInProgress + "20", color: brand.colors.statusInProgress }}>3 today</Pill>
            </div>
            <div className="text-xs flex items-center gap-3" style={{ color: brand.colors.textSecondary }}>
              <span className="inline-flex items-center gap-1"><Calendar className="w-3 h-3"/> 09:00 next</span>
              <span className="inline-flex items-center gap-1"><MapPin className="w-3 h-3"/> Bishopston</span>
            </div>
          </button>

          <button onClick={() => goTo("messages")} className="rounded-xl p-4 text-left transition-all hover:shadow-lg active:scale-[.99]"
                  style={{ background: brand.colors.surfaceSecondary, border: `1px solid ${brand.colors.border}` }}>
            <div className="flex items-center justify-between mb-2">
              <p className="font-semibold">Messages</p>
              <Pill style={{ background: brand.colors.secondary + "20", color: brand.colors.secondary }}>2 unread</Pill>
            </div>
            <p className="text-xs" style={{ color: brand.colors.textSecondary }}>Client communications & quotes</p>
          </button>
        </div>

        <Card style={{ background: brand.colors.background, borderColor: brand.colors.border }}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Recommended Jobs</CardTitle>
                <CardDescription style={{ color: brand.colors.textSecondary }}>Based on your skills & location</CardDescription>
              </div>
              <Settings className="w-5 h-5" style={{ color: brand.colors.textSecondary }}/>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {[1,2,3].map(i => (
              <button key={i} onClick={() => goTo("job-details")} className="w-full text-left">
                <div className="flex items-start gap-3 p-3 rounded-xl transition-all hover:shadow-md active:scale-[.99]" 
                     style={{ border: `1px solid ${brand.colors.border}`, background: brand.colors.background }}>
                  <Avatar className="h-10 w-10">
                    <AvatarImage src=""/>
                    <AvatarFallback style={{ background: brand.colors.surfaceTertiary }}>UK</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-medium">Kitchen leak fix</p>
                      <Pill style={{ background: brand.colors.statusPosted + "20", color: brand.colors.statusPosted, fontWeight: '600' }}>£120</Pill>
                    </div>
                    <div className="text-xs flex items-center gap-3" style={{ color: brand.colors.textSecondary }}>
                      <span className="inline-flex items-center gap-1"><MapPin className="w-3 h-3"/> Bishopston</span>
                      <span className="inline-flex items-center gap-1"><Calendar className="w-3 h-3"/> 31 Aug</span>
                      <span className="inline-flex items-center gap-1"><Clock className="w-3 h-3"/> 2–3h</span>
                    </div>
                  </div>
                  <Star className="w-4 h-4 fill-current" style={{ color: brand.colors.secondary }}/>
                </div>
              </button>
            ))}
          </CardContent>
        </Card>
      </div>
    </ScrollArea>
  );
}

// --- Screen: Jobs (Contractor) with loading and empty states ---
function JobsScreenView({ goTo }: { goTo: (key: string) => void }) {
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<'all' | 'nearby' | 'today' | 'top'>('all');
  
  const jobs = useMemo(() => [
    { id: 1, title: "Boiler service", price: 90, area: "Filton", date: "01 Sep", hours: "1–2h", status: "Posted" },
    { id: 2, title: "Fence repair", price: 150, area: "Downend", date: "03 Sep", hours: "3–4h", status: "Assigned" },
    { id: 3, title: "Bathroom re‑seal", price: 120, area: "Patchway", date: "05 Sep", hours: "2–3h", status: "In Progress" },
  ], []);

  const filteredJobs = filter === 'all' ? jobs : jobs.slice(0, 1); // Demo filtering
  const hasNoJobs = filteredJobs.length === 0;

  const handleFilterChange = (newFilter: typeof filter) => {
    setFilter(newFilter);
    setLoading(true);
    setTimeout(() => setLoading(false), 800);
  };

  return (
    <ScrollArea className="h-[752px]">
      <ScreenHeader title="Jobs" subtitle="Active & available opportunities" />
      
      <div className="p-4 space-y-4" style={{ background: brand.colors.background }}>
        <SearchBar/>
        
        <div className="grid grid-cols-3 gap-2" role="tablist" aria-label="Job filters">
          <OutlineButton 
            className={`h-9 text-xs ${filter === 'nearby' ? 'ring-2' : ''}`}
            onClick={() => handleFilterChange('nearby')}
            style={filter === 'nearby' ? { 
              background: brand.colors.secondary + "20", 
              borderColor: brand.colors.secondary,
              color: brand.colors.secondary 
            } : {}}
            role="tab"
            aria-selected={filter === 'nearby'}
          >
            <MapIcon className="w-3 h-3 mr-1"/>
            Nearby
          </OutlineButton>
          <OutlineButton 
            className={`h-9 text-xs ${filter === 'today' ? 'ring-2' : ''}`}
            onClick={() => handleFilterChange('today')}
            style={filter === 'today' ? { 
              background: brand.colors.secondary + "20", 
              borderColor: brand.colors.secondary,
              color: brand.colors.secondary 
            } : {}}
            role="tab"
            aria-selected={filter === 'today'}
          >
            <Clock className="w-3 h-3 mr-1"/>
            Today
          </OutlineButton>
          <OutlineButton 
            className={`h-9 text-xs ${filter === 'top' ? 'ring-2' : ''}`}
            onClick={() => handleFilterChange('top')}
            style={filter === 'top' ? { 
              background: brand.colors.secondary + "20", 
              borderColor: brand.colors.secondary,
              color: brand.colors.secondary 
            } : {}}
            role="tab"
            aria-selected={filter === 'top'}
          >
            <Star className="w-3 h-3 mr-1"/>
            Top Rated
          </OutlineButton>
        </div>

        <div className="space-y-3" role="main" aria-live="polite">
          {loading ? (
            // Loading skeleton state
            <>
              <CardSkeleton />
              <CardSkeleton />
              <CardSkeleton />
            </>
          ) : hasNoJobs ? (
            // Empty state
            <EmptyState
              icon={<Briefcase className="w-8 h-8" style={{ color: brand.colors.textSecondary }}/>}
              title="No jobs found"
              description={`No ${filter === 'all' ? '' : filter + ' '}jobs available right now. Try adjusting your filters or check back later.`}
              actionText="Browse All Jobs"
              onAction={() => handleFilterChange('all')}
            />
          ) : (
            // Job listings
            filteredJobs.map(j => (
              <button key={j.id} onClick={() => goTo("job-details")} className="w-full text-left">
                <Card className="transition-all hover:shadow-md active:scale-[.99] focus-within:ring-2 focus-within:ring-offset-2" 
                      style={{ borderColor: brand.colors.border }}
                      tabIndex={0}
                      role="article"
                      aria-label={`${j.title} job in ${j.area} for £${j.price}`}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">{j.title}</CardTitle>
                      <Pill style={{ background: brand.colors.statusPosted + "20", color: brand.colors.statusPosted, fontWeight: '600' }}>£{j.price}</Pill>
                    </div>
                    <div className="flex items-center gap-3 text-xs" style={{ color: brand.colors.textSecondary }}>
                      <span className="inline-flex items-center gap-1"><MapPin className="w-3 h-3"/> {j.area}</span>
                      <span className="inline-flex items-center gap-1"><Calendar className="w-3 h-3"/> {j.date}</span>
                      <span className="inline-flex items-center gap-1"><Clock className="w-3 h-3"/> {j.hours}</span>
                      <StatusPill status={j.status as any}/>
                    </div>
                  </CardHeader>
                  <CardContent className="text-sm" style={{ color: brand.colors.textSecondary }}>
                    Standard call‑out. Materials provided.
                  </CardContent>
                </Card>
              </button>
            ))
          )}
        </div>
      </div>
    </ScrollArea>
  );
}

// --- Screen: Job Details (Contractor) ---
function JobDetailsScreenView({ goTo }: { goTo: (key: string) => void }) {
  return (
    <ScrollArea className="h-[752px]">
      <ScreenHeader title="Job Details" subtitle="Kitchen leak repair" />
      
      <div className="p-4 space-y-4" style={{ background: brand.colors.background }}>
        <div className="flex items-center gap-3">
          <Avatar className="h-12 w-12">
            <AvatarFallback style={{ background: brand.colors.surfaceTertiary }}>HN</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <h3 className="font-semibold">Hannah • Homeowner</h3>
            <p className="text-xs flex items-center gap-3" style={{ color: brand.colors.textSecondary }}>
              <span className="inline-flex items-center gap-1"><MapPin className="w-3 h-3"/> Bishopston</span>
              <span className="inline-flex items-center gap-1"><Calendar className="w-3 h-3"/> 31 Aug</span>
              <span className="inline-flex items-center gap-1"><Star className="w-3 h-3"/> 4.8</span>
            </p>
          </div>
          <OutlineButton onClick={() => goTo("messages")} className="h-9">
            <MessageSquare className="w-4 h-4"/>
          </OutlineButton>
        </div>

        <Card style={{ borderColor: brand.colors.border }}>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Kitchen leak under sink</CardTitle>
            <CardDescription style={{ color: brand.colors.textSecondary }}>
              Water pooling in base cabinet, likely trap or connector issue.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 rounded-xl text-center" style={{ background: brand.colors.surfaceTertiary }}>
                <p className="text-xs" style={{ color: brand.colors.textSecondary }}>Budget</p>
                <p className="font-bold text-lg">£120</p>
              </div>
              <div className="p-3 rounded-xl text-center" style={{ background: brand.colors.surfaceTertiary }}>
                <p className="text-xs" style={{ color: brand.colors.textSecondary }}>Time</p>
                <p className="font-bold text-lg">2–3h</p>
              </div>
              <div className="p-3 rounded-xl text-center" style={{ background: brand.colors.surfaceTertiary }}>
                <p className="text-xs" style={{ color: brand.colors.textSecondary }}>Category</p>
                <p className="font-bold text-lg">Plumbing</p>
              </div>
            </div>
            
            <div className="space-y-3">
              <p className="text-sm font-medium">Photos</p>
              <div className="grid grid-cols-3 gap-2">
                <div className="aspect-square rounded-xl grid place-items-center" style={{ background: brand.colors.surfaceTertiary }}>
                  <Camera className="w-6 h-6" style={{ color: brand.colors.textSecondary }}/>
                </div>
                <div className="aspect-square rounded-xl grid place-items-center" style={{ background: brand.colors.surfaceTertiary }}>
                  <Camera className="w-6 h-6" style={{ color: brand.colors.textSecondary }}/>
                </div>
                <div className="aspect-square rounded-xl grid place-items-center" style={{ background: brand.colors.surfaceTertiary }}>
                  <Camera className="w-6 h-6" style={{ color: brand.colors.textSecondary }}/>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <OutlineButton onClick={() => goTo("messages")}>
                <MessageSquare className="w-4 h-4 mr-2"/>
                Message
              </OutlineButton>
              <PrimaryButton onClick={() => goTo("jobs")}>
                <CheckCircle2 className="w-4 h-4 mr-2"/>
                Accept Job
              </PrimaryButton>
            </div>
          </CardContent>
        </Card>
      </div>
    </ScrollArea>
  );
}

// --- Screen: Messages List (Enhanced) ---
function MessagesListScreenView({ goTo }: { goTo: (key: string) => void }) {
  const chats = [
    { name: "Hannah", last: "Thanks, see you at 10!", time: "14:05", unread: 1, type: "client" },
    { name: "Jake (Electrician)", last: "Quote sent.", time: "Yesterday", unread: 0, type: "contractor" },
    { name: "MintEnance Support", last: "Your payout has cleared.", time: "Mon", unread: 0, type: "support" },
  ];

  return (
    <ScrollArea className="h-[752px]">
      <ScreenHeader title="Messages" subtitle="3 conversations" />
      
      <div className="p-4 space-y-4" style={{ background: brand.colors.background }}>
        <SearchBar/>
        
        <div className="space-y-2">
          {chats.map((c, i) => (
            <button key={i} onClick={() => goTo("chat")} className="w-full text-left">
              <div className="flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all hover:shadow-sm active:scale-[.99]" 
                   style={{ border: `1px solid ${brand.colors.border}`, background: brand.colors.background }}>
                <div className="relative">
                  <Avatar className="h-12 w-12">
                    <AvatarFallback style={{ background: brand.colors.surfaceTertiary }}>
                      {c.name.slice(0,2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  {c.type === "support" && (
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full grid place-items-center" 
                         style={{ background: brand.colors.secondary }}>
                      <ShieldCheck className="w-2.5 h-2.5" style={{ color: brand.colors.primary }}/>
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="font-medium">{c.name}</p>
                    <span className="text-xs" style={{ color: brand.colors.textSecondary }}>{c.time}</span>
                  </div>
                  <p className="text-sm mt-1" style={{ color: brand.colors.textSecondary }}>{c.last}</p>
                </div>
                {c.unread > 0 && (
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold" 
                        style={{ background: brand.colors.secondary, color: brand.colors.primary }}>
                    {c.unread}
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>
    </ScrollArea>
  );
}

// --- Screen: Service Request (Enhanced) ---
function ServiceRequestScreenView({ onSubmit }: { onSubmit?: () => void }) {
  return (
    <ScrollArea className="h-[752px]">
      <ScreenHeader title="New Service Request" subtitle="Describe your project" />
      
      <div className="p-4 space-y-4" style={{ background: brand.colors.background }}>
        <div className="space-y-3">
          <Label style={{ color: brand.colors.textSecondary }}>Project Title</Label>
          <Input placeholder="e.g., Replace shower valve" className="h-11" style={{ borderColor: brand.colors.border }}/>
        </div>

        <div className="space-y-3">
          <Label style={{ color: brand.colors.textSecondary }}>Description</Label>
          <Textarea 
            rows={4} 
            placeholder="Describe the issue, location, and any specific requirements..."
            style={{ borderColor: brand.colors.border }}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label style={{ color: brand.colors.textSecondary }}>Budget (£)</Label>
            <Input placeholder="150" className="h-11" style={{ borderColor: brand.colors.border }}/>
          </div>
          <div className="space-y-2">
            <Label style={{ color: brand.colors.textSecondary }}>Preferred date</Label>
            <Input type="date" className="h-11" style={{ borderColor: brand.colors.border }}/>
          </div>
        </div>

        <div className="space-y-3">
          <Label style={{ color: brand.colors.textSecondary }}>Location</Label>
          <Input placeholder="Postcode or area" className="h-11" style={{ borderColor: brand.colors.border }}/>
        </div>

        <div className="space-y-3">
          <Label style={{ color: brand.colors.textSecondary }}>Photos</Label>
          <div className="grid grid-cols-3 gap-2">
            <button className="aspect-square rounded-xl border-2 border-dashed grid place-items-center transition-all hover:shadow-sm" 
                    style={{ borderColor: brand.colors.border, background: brand.colors.surfaceSecondary }}>
              <Camera className="w-6 h-6" style={{ color: brand.colors.textSecondary }}/>
            </button>
            <button className="aspect-square rounded-xl border-2 border-dashed grid place-items-center transition-all hover:shadow-sm" 
                    style={{ borderColor: brand.colors.border, background: brand.colors.surfaceSecondary }}>
              <Plus className="w-6 h-6" style={{ color: brand.colors.textSecondary }}/>
            </button>
            <button className="aspect-square rounded-xl border-2 border-dashed grid place-items-center transition-all hover:shadow-sm" 
                    style={{ borderColor: brand.colors.border, background: brand.colors.surfaceSecondary }}>
              <Plus className="w-6 h-6" style={{ color: brand.colors.textSecondary }}/>
            </button>
          </div>
        </div>

        <PrimaryButton className="w-full" onClick={() => onSubmit && onSubmit()}>
          <Send className="w-4 h-4 mr-2"/>
          Submit Request
        </PrimaryButton>
      </div>
    </ScrollArea>
  );
}

// --- Screen: Payments (Contractor) ---
function PaymentScreenView({ goTo }: { goTo: (key: string) => void }) {
  const payouts = [
    { id: "PO-1823", amount: 240, date: "28 Aug", status: "Paid", job: "Bathroom re-seal" },
    { id: "PO-1822", amount: 120, date: "25 Aug", status: "Paid", job: "Kitchen leak fix" },
    { id: "PO-1821", amount: 90, date: "23 Aug", status: "Pending", job: "Boiler service" },
  ];
  const numStyle: React.CSSProperties = { fontVariantNumeric: 'tabular-nums' };

  return (
    <ScrollArea className="h-[752px]">
      <ScreenHeader title="Payments" subtitle="Earnings & payouts" />
      
      <div className="p-4 space-y-4" style={{ background: brand.colors.background }}>
        <Card style={{ borderColor: brand.colors.border }}>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Wallet Overview</CardTitle>
            <CardDescription style={{ color: brand.colors.textSecondary }}>Current balance & recent activity</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="p-4 rounded-xl text-center" style={{ background: brand.colors.secondary + "26", border: `1px solid ${brand.colors.secondary}` }}>
                <p className="text-xs font-medium" style={{ color: brand.colors.textSecondary }}>Available</p>
                <p className="text-xl font-bold mt-1" style={numStyle}>£450</p>
              </div>
              <div className="p-4 rounded-xl text-center" style={{ background: brand.colors.surfaceTertiary }}>
                <p className="text-xs font-medium" style={{ color: brand.colors.textSecondary }}>This week</p>
                <p className="text-xl font-bold mt-1" style={numStyle}>£360</p>
              </div>
              <div className="p-4 rounded-xl text-center" style={{ background: brand.colors.surfaceTertiary }}>
                <p className="text-xs font-medium" style={{ color: brand.colors.textSecondary }}>Pending</p>
                <p className="text-xl font-bold mt-1" style={numStyle}>£90</p>
              </div>
            </div>
            <PrimaryButton className="w-full">
              <CreditCard className="w-4 h-4 mr-2"/>
              Withdraw to Bank
            </PrimaryButton>
          </CardContent>
        </Card>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="font-medium">Recent Payouts</p>
            <button className="text-sm" style={{ color: brand.colors.primary }}>View all</button>
          </div>
          {payouts.map(p => (
            <div key={p.id} className="flex items-center justify-between p-3 rounded-xl transition-all hover:shadow-sm" 
                 style={{ border: `1px solid ${brand.colors.border}`, background: brand.colors.background }}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full grid place-items-center" style={{ background: brand.colors.surfaceTertiary }}>
                  <CreditCard className="w-5 h-5" style={{ color: brand.colors.textSecondary }}/>
                </div>
                <div>
                  <p className="font-medium">{p.job}</p>
                  <p className="text-xs" style={{ color: brand.colors.textSecondary }}>{p.id} • {p.date}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-bold" style={numStyle}>£{p.amount}</p>
                <StatusPill status={p.status as any}/>
              </div>
            </div>
          ))}
        </div>
      </div>
    </ScrollArea>
  );
}

// --- Screen: Profile (Contractor) ---
function ProfileScreenView({ goTo }: { goTo: (key: string) => void }) {
  return (
    <ScrollArea className="h-[752px]">
      <ScreenHeader title="Profile" subtitle="Your professional details" />
      
      <div className="p-4 space-y-4" style={{ background: brand.colors.background }}>
        <Card style={{ borderColor: brand.colors.border }}>
          <CardHeader className="flex flex-row items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src=""/>
              <AvatarFallback style={{ background: brand.colors.surfaceTertiary }}>JN</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <CardTitle>Jojo Nkouka • Contractor</CardTitle>
              <CardDescription style={{ color: brand.colors.textSecondary }}>Plumbing & general maintenance</CardDescription>
              <div className="text-xs mt-2 flex items-center gap-2" style={{ color: brand.colors.textSecondary }}>
                <Building2 className="w-3 h-3"/> Bristol, UK
                <span>•</span>
                <ShieldCheck className="w-3 h-3"/> Verified
              </div>
            </div>
            <OutlineButton className="h-9">
              <Settings className="w-4 h-4"/>
            </OutlineButton>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 rounded-xl text-center" style={{ background: brand.colors.surfaceTertiary }}>
                <p className="text-xs" style={{ color: brand.colors.textSecondary }}>Rating</p>
                <p className="font-bold text-lg">4.9</p>
              </div>
              <div className="p-3 rounded-xl text-center" style={{ background: brand.colors.surfaceTertiary }}>
                <p className="text-xs" style={{ color: brand.colors.textSecondary }}>Jobs</p>
                <p className="font-bold text-lg">128</p>
              </div>
              <div className="p-3 rounded-xl text-center" style={{ background: brand.colors.surfaceTertiary }}>
                <p className="text-xs" style={{ color: brand.colors.textSecondary }}>Years</p>
                <p className="font-bold text-lg">7+</p>
              </div>
            </div>
            
            <div className="space-y-3">
              <Label style={{ color: brand.colors.textSecondary }}>Professional Bio</Label>
              <Textarea 
                rows={3} 
                defaultValue="Reliable contractor with 7+ years experience across Bristol & Gloucestershire."
                style={{ borderColor: brand.colors.border }}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <OutlineButton>
                <Mail className="w-4 h-4 mr-2"/>
                Contact
              </OutlineButton>
              <OutlineButton>
                <Phone className="w-4 h-4 mr-2"/>
                Call
              </OutlineButton>
            </div>
            
            <PrimaryButton className="w-full">
              <CheckCircle2 className="w-4 h-4 mr-2"/>
              Save Changes
            </PrimaryButton>
          </CardContent>
        </Card>
      </div>
    </ScrollArea>
  );
}

// --- Screen: Contractor Jobs Map ---
function CTJobsMapView({ goTo }: { goTo: (key: string) => void }) {
  const posts = [
    { title: 'Emergency leak', pay: 140, area: 'Redland', age: '3m', urgent: true },
    { title: 'Light fitting', pay: 80, area: 'Horfield', age: '12m', urgent: false },
    { title: 'Fence panel', pay: 110, area: 'Downend', age: '25m', urgent: false },
  ];

  return (
    <ScrollArea className="h-[752px]">
      <ScreenHeader title="Live Jobs Map" subtitle="Real-time opportunities" />
      
      <div className="p-4 space-y-4" style={{ background: brand.colors.background }}>
        <div className="rounded-2xl h-52 relative overflow-hidden" 
             style={{ background: `linear-gradient(180deg, ${brand.colors.surfaceSecondary}, ${brand.colors.surfaceTertiary})`, border: `1px solid ${brand.colors.border}` }}>
          <div className="absolute w-4 h-4 rounded-full animate-pulse" style={{ left: '28%', top: '36%', background: brand.colors.priorityHigh }} />
          <div className="absolute w-3 h-3 rounded-full" style={{ left: '60%', top: '42%', background: brand.colors.secondary }} />
          <div className="absolute w-3 h-3 rounded-full" style={{ left: '72%', top: '60%', background: brand.colors.secondary }} />
          
          <div className="absolute left-3 top-3 flex items-center gap-2">
            <div className="text-xs px-2 py-1 rounded-full font-medium" style={{ background: brand.colors.primary, color: '#FFFFFF' }}>
              <MapIcon className="w-3 h-3 inline mr-1"/>
              Live Map
            </div>
          </div>
          
          <div className="absolute right-3 top-3">
            <OutlineButton className="h-8 text-xs">
              <Search className="w-3 h-3 mr-1"/>
              Filter
            </OutlineButton>
          </div>
        </div>

        <div className="space-y-3">
          {posts.map((p,i)=> (
            <button key={i} onClick={() => goTo('job-details')} className="w-full text-left">
              <div className="flex items-center justify-between p-3 rounded-xl transition-all hover:shadow-md active:scale-[.99]" 
                   style={{ border: `1px solid ${brand.colors.border}`, background: brand.colors.background }}>
                <div className="flex items-center gap-3">
                  {p.urgent && <div className="w-2 h-2 rounded-full" style={{ background: brand.colors.priorityHigh }}/>}
                  <div>
                    <div className="font-medium">{p.title}</div>
                    <div className="text-xs" style={{ color: brand.colors.textSecondary }}>
                      {p.area} • Posted {p.age} ago
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Pill style={{ background: brand.colors.statusPosted + "20", color: brand.colors.statusPosted, fontWeight: '600' }}>
                    £{p.pay}
                  </Pill>
                  <OutlineButton className="h-8 text-xs">View</OutlineButton>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </ScrollArea>
  );
}

// === HOMEOWNER SCREENS ===

// --- Screen: Homeowner Home ---
function HOHomeView({ goTo }: { goTo: (k:string)=>void }) {
  return (
    <ScrollArea className="h-[752px]">
      <ScreenHeader 
        title="Home" 
        rightElement={<span className="text-xs font-medium px-2 py-1 rounded-full" style={{ background: brand.colors.secondary + "26", color: brand.colors.secondary }}>Homeowner</span>}
      />
      
      <div className="p-4 space-y-4" style={{ background: brand.colors.background }}>
        <div className="grid grid-cols-2 gap-3">
          <HeroInfo title="Bristol" subtitle="Partly cloudy • 22°C" />
          <HeroInfo title="Savings" subtitle="£120 saved this month" right={<span className="text-xs font-medium px-2 py-1 rounded-full" style={{ background: brand.colors.statusCompleted + "20", color: brand.colors.statusCompleted }}>-15%</span>} />
        </div>
        
        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => goTo('service-request')} className="col-span-2 rounded-xl p-5 text-left transition-all hover:shadow-lg active:scale-[.99]" 
                  style={{ background: brand.colors.secondary + '26', border: `1px solid ${brand.colors.secondary}` }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium" style={{ color: brand.colors.textSecondary }}>Create</p>
                <p className="text-lg font-bold mt-1">New Request</p>
              </div>
              <Plus className="w-7 h-7" style={{ color: brand.colors.secondary }}/>
            </div>
            <p className="mt-2 text-sm" style={{ color: brand.colors.textSecondary }}>Describe the issue, get quotes fast</p>
          </button>
          
          <button onClick={() => goTo('contractors')} className="rounded-xl p-4 text-left transition-all hover:shadow-lg active:scale-[.99]" 
                  style={{ background: brand.colors.surfaceSecondary, border: `1px solid ${brand.colors.border}` }}>
            <div className="flex items-center justify-between mb-2">
              <p className="font-semibold">Find Pros</p>
              <Pill>Nearby</Pill>
            </div>
            <p className="text-xs" style={{ color: brand.colors.textSecondary }}>Browse top rated contractors</p>
          </button>
          
          <button onClick={() => goTo('my-requests')} className="rounded-xl p-4 text-left transition-all hover:shadow-lg active:scale-[.99]" 
                  style={{ background: brand.colors.surfaceSecondary, border: `1px solid ${brand.colors.border}` }}>
            <div className="flex items-center justify-between mb-2">
              <p className="font-semibold">My Requests</p>
              <Pill style={{ background: brand.colors.statusInProgress + "20", color: brand.colors.statusInProgress }}>1 active</Pill>
            </div>
            <p className="text-xs" style={{ color: brand.colors.textSecondary }}>Track status and payments</p>
          </button>
        </div>
      </div>
    </ScrollArea>
  );
}

// --- Screen: Browse Contractors ---
function BrowseContractorsView({ goTo }: { goTo: (k:string)=>void }) {
  const pros = [
    { name: 'AquaFix Plumbing', rating: 4.9, jobs: 320, area:'Redland', eta:'Today', specialty: 'Plumbing' },
    { name: 'BrightSpark Electrics', rating: 4.8, jobs: 210, area:'Downend', eta:'1–2 days', specialty: 'Electrical' },
    { name: 'Glos Handyman Co', rating: 4.7, jobs: 540, area:'Patchway', eta:'Tomorrow', specialty: 'General' },
  ];

  return (
    <ScrollArea className="h-[752px]">
      <ScreenHeader title="Find Contractors" subtitle="Top rated professionals" />
      
      <div className="p-4 space-y-4" style={{ background: brand.colors.background }}>
        <SearchBar/>
        
        <div className="grid grid-cols-3 gap-2">
          <OutlineButton className="h-9 text-xs">
            <MapIcon className="w-3 h-3 mr-1"/>
            Nearby
          </OutlineButton>
          <OutlineButton className="h-9 text-xs">
            <Star className="w-3 h-3 mr-1"/>
            Top Rated
          </OutlineButton>
          <OutlineButton className="h-9 text-xs">
            <Clock className="w-3 h-3 mr-1"/>
            Available
          </OutlineButton>
        </div>

        <div className="space-y-3">
          {pros.map((p,i)=> (
            <Card key={i} style={{ borderColor: brand.colors.border }} className="hover:shadow-md cursor-pointer transition-all" onClick={()=>goTo('service-request')}>
              <CardHeader className="pb-3 flex flex-row items-center gap-3">
                <Avatar className="h-12 w-12">
                  <AvatarFallback style={{ background: brand.colors.surfaceTertiary }}>{p.name.slice(0,2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <CardTitle className="text-base">{p.name}</CardTitle>
                  <CardDescription style={{ color: brand.colors.textSecondary }}>
                    {p.specialty} • {p.area} • {p.jobs} jobs • {p.rating}★
                  </CardDescription>
                  <div className="text-xs mt-1" style={{ color: brand.colors.textSecondary }}>ETA: {p.eta}</div>
                </div>
                <PrimaryButton className="h-9">
                  <MessageSquare className="w-4 h-4 mr-1"/>
                  Request
                </PrimaryButton>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    </ScrollArea>
  );
}

// --- Screen: My Requests (Homeowner) ---
function MyRequestsView({ goTo }: { goTo: (k:string)=>void }) {
  const items = [
    { id: 'RQ-1291', title: 'Leaking kitchen trap', date: '31 Aug', status: 'Assigned', budget: 120, contractor: 'AquaFix Plumbing' },
    { id: 'RQ-1288', title: 'Boiler annual service', date: '25 Aug', status: 'Completed', budget: 90, contractor: 'HeatPro Services' },
    { id: 'RQ-1283', title: 'Fence panel replacement', date: '22 Aug', status: 'Posted', budget: 150, contractor: null },
  ];

  return (
    <ScrollArea className="h-[752px]">
      <ScreenHeader title="My Requests" subtitle="3 total requests" />
      
      <div className="p-4 space-y-4" style={{ background: brand.colors.background }}>
        <SearchBar/>
        
        <div className="space-y-3">
          {items.map(r => (
            <button key={r.id} onClick={()=>goTo('ho-request-details')} className="w-full text-left">
              <Card style={{ borderColor: brand.colors.border }} className="hover:shadow-md cursor-pointer transition-all active:scale-[.99]">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{r.title}</CardTitle>
                    <Pill style={{ background: brand.colors.statusPosted + "20", color: brand.colors.statusPosted, fontWeight: '600' }}>£{r.budget}</Pill>
                  </div>
                  <CardDescription style={{ color: brand.colors.textSecondary }}>
                    {r.id} • {r.date} {r.contractor && `• ${r.contractor}`}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex items-center justify-between">
                  <StatusPill status={r.status as any}/>
                  {r.contractor && (
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarFallback className="text-xs" style={{ background: brand.colors.surfaceTertiary }}>
                          {r.contractor.slice(0,2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-xs" style={{ color: brand.colors.textSecondary }}>{r.contractor}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            </button>
          ))}
        </div>
      </div>
    </ScrollArea>
  );
}

// === Status Progress Dial ===
function StatusDial({ progress, label, subLabel }:{ progress:number; label:string; subLabel?:string }){
  const angle = Math.round(Math.min(1, Math.max(0, progress)) * 360);
  return (
    <div className="mx-auto my-4" style={{ width: 180, height: 180 }}>
      <div className="relative w-full h-full rounded-full grid place-items-center"
           style={{ background: `conic-gradient(${brand.colors.secondary} ${angle}deg, ${brand.colors.border} ${angle}deg 360deg)` }}>
        <div className="absolute inset-3 rounded-full grid place-items-center" style={{ background: brand.colors.background, boxShadow: 'inset 0 2px 8px rgba(0,0,0,.06)' }}>
          <div className="text-center">
            <div className="text-lg font-bold" style={{ color: brand.colors.textPrimary }}>{label}</div>
            {subLabel && <div className="text-xs mt-1" style={{ color: brand.colors.textSecondary }}>{subLabel}</div>}
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Screen: Request Details (Homeowner) ---
function HORequestDetailsView({ goTo }: { goTo: (k:string)=>void }) {
  const status: 'Posted'|'Assigned'|'In Progress'|'Completed' = 'Assigned';
  const steps = [
    { k: 'Posted', t: 'Request posted' },
    { k: 'Assigned', t: 'Contractor assigned' },
    { k: 'In Progress', t: 'Work in progress' },
    { k: 'Completed', t: 'Work completed' },
  ];
  const currentIndex = steps.findIndex(s=>s.k===status);
  const progress = currentIndex / (steps.length-1);

  return (
    <ScrollArea className="h-[752px]">
      <ScreenHeader title="Request Details" subtitle="RQ-1291" />
      
      <div className="p-4 pb-24 space-y-4" style={{ background: brand.colors.background }}>
        <Card style={{ borderColor: brand.colors.border }}>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Leaking kitchen trap</CardTitle>
            <CardDescription style={{ color: brand.colors.textSecondary }}>
              Bishopston • Budget £120 • Preferred 31 Aug
            </CardDescription>
          </CardHeader>
          <CardContent>
            <StatusDial progress={progress} label={status} subLabel="ETA Today 10:00" />
            <div className="grid grid-cols-3 gap-3 mt-4">
              <div className="p-3 rounded-xl text-center" style={{ background: brand.colors.surfaceTertiary }}>
                <p className="text-xs" style={{ color: brand.colors.textSecondary }}>Budget</p>
                <p className="font-bold text-lg">£120</p>
              </div>
              <div className="p-3 rounded-xl text-center" style={{ background: brand.colors.surfaceTertiary }}>
                <p className="text-xs" style={{ color: brand.colors.textSecondary }}>Time</p>
                <p className="font-bold text-lg">2–3h</p>
              </div>
              <div className="p-3 rounded-xl text-center" style={{ background: brand.colors.surfaceTertiary }}>
                <p className="text-xs" style={{ color: brand.colors.textSecondary }}>Category</p>
                <p className="font-bold text-lg">Plumbing</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card style={{ borderColor: brand.colors.border }}>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Timeline</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {steps.map((s,i)=> (
              <div key={s.k} className="flex items-center gap-3">
                <div className="w-4 h-4 rounded-full grid place-items-center" 
                     style={{ background: i<=currentIndex ? brand.colors.secondary : brand.colors.border }}>
                  {i<=currentIndex && <CheckCircle2 className="w-2.5 h-2.5" style={{ color: brand.colors.primary }}/>}
                </div>
                <span className="text-sm font-medium" style={{ color: i<=currentIndex ? brand.colors.textPrimary : brand.colors.textSecondary }}>
                  {s.t}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card style={{ borderColor: brand.colors.border }}>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Assigned Contractor</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <Avatar className="h-12 w-12">
                <AvatarFallback style={{ background: brand.colors.surfaceTertiary }}>AF</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className="font-semibold">AquaFix Plumbing</p>
                <p className="text-xs" style={{ color: brand.colors.textSecondary }}>4.9★ • 320 jobs • Verified</p>
              </div>
              <div className="flex gap-2">
                <OutlineButton onClick={()=>goTo('messages')} className="h-9">
                  <MessageSquare className="w-4 h-4"/>
                </OutlineButton>
                <OutlineButton onClick={()=>goTo('ho-profile')} className="h-9">
                  <Phone className="w-4 h-4"/>
                </OutlineButton>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="absolute bottom-0 left-0 right-0 p-4 grid grid-cols-2 gap-3" 
           style={{ background: brand.colors.background, borderTop: `1px solid ${brand.colors.border}` }}>
        <OutlineButton onClick={()=>goTo('service-request')}>
          <Calendar className="w-4 h-4 mr-2"/>
          Reschedule
        </OutlineButton>
        <PrimaryButton onClick={()=>goTo('invoice')}>
          <CreditCard className="w-4 h-4 mr-2"/>
          Pay Now
        </PrimaryButton>
      </div>
    </ScrollArea>
  );
}

// --- Screen: Pay Invoice (Homeowner) ---
function PayInvoiceView({ goTo }: { goTo: (k:string)=>void }) {
  const lines = [
    { label: 'Labour (2.5h)', amount: 100 },
    { label: 'Materials (trap, sealant)', amount: 20 },
    { label: 'Platform fee', amount: 5 },
  ];
  const total = lines.reduce((a,b)=>a+b.amount,0);
  const numStyle: React.CSSProperties = { fontVariantNumeric: 'tabular-nums' };

  return (
    <ScrollArea className="h-[752px]">
      <ScreenHeader title="Invoice" subtitle="RQ-1291" />
      
      <div className="p-4 space-y-4" style={{ background: brand.colors.background }}>
        <Card style={{ borderColor: brand.colors.border }}>
          <CardHeader>
            <CardTitle className="text-lg">Kitchen leak repair</CardTitle>
            <CardDescription style={{ color: brand.colors.textSecondary }}>
              Hannah → AquaFix Plumbing • Completed 31 Aug
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              {lines.map((l,i)=> (
                <div key={i} className="flex items-center justify-between">
                  <span style={{ color: brand.colors.textSecondary }}>{l.label}</span>
                  <span style={numStyle} className="font-medium">£{l.amount.toFixed(2)}</span>
                </div>
              ))}
            </div>
            
            <div className="flex items-center justify-between pt-3" style={{ borderTop: `1px solid ${brand.colors.border}` }}>
              <span className="font-bold text-lg">Total</span>
              <span className="font-bold text-xl" style={numStyle}>£{total.toFixed(2)}</span>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <OutlineButton>
                <FileText className="w-4 h-4 mr-2"/>
                Download
              </OutlineButton>
              <PrimaryButton onClick={() => goTo('my-requests')}>
                <CreditCard className="w-4 h-4 mr-2"/>
                Pay £{total}
              </PrimaryButton>
            </div>
          </CardContent>
        </Card>
      </div>
    </ScrollArea>
  );
}

// --- Screen: Homeowner Profile ---
function HomeownerProfileScreenView({ goTo }: { goTo: (k:string)=>void }) {
  return (
    <ScrollArea className="h-[752px]">
      <ScreenHeader title="Profile" subtitle="Your account details" />
      
      <div className="p-4 space-y-4" style={{ background: brand.colors.background }}>
        <Card style={{ borderColor: brand.colors.border }}>
          <CardHeader className="flex flex-row items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src=""/>
              <AvatarFallback style={{ background: brand.colors.surfaceTertiary }}>HN</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <CardTitle>Hannah • Homeowner</CardTitle>
              <CardDescription style={{ color: brand.colors.textSecondary }}>Bishopston, Bristol</CardDescription>
              <div className="text-xs mt-2 flex items-center gap-2" style={{ color: brand.colors.textSecondary }}>
                <Building2 className="w-3 h-3"/> BS7 8AA, Bristol
                <span>•</span>
                <ShieldCheck className="w-3 h-3"/> Verified
              </div>
            </div>
            <OutlineButton className="h-9">
              <Settings className="w-4 h-4"/>
            </OutlineButton>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 rounded-xl text-center" style={{ background: brand.colors.surfaceTertiary }}>
                <p className="text-xs" style={{ color: brand.colors.textSecondary }}>Requests</p>
                <p className="font-bold text-lg">8</p>
              </div>
              <div className="p-3 rounded-xl text-center" style={{ background: brand.colors.surfaceTertiary }}>
                <p className="text-xs" style={{ color: brand.colors.textSecondary }}>Savings</p>
                <p className="font-bold text-lg">£240</p>
              </div>
              <div className="p-3 rounded-xl text-center" style={{ background: brand.colors.surfaceTertiary }}>
                <p className="text-xs" style={{ color: brand.colors.textSecondary }}>Member</p>
                <p className="font-bold text-lg">2yr</p>
              </div>
            </div>
            
            <div className="space-y-3">
              <Label style={{ color: brand.colors.textSecondary }}>Home Address</Label>
              <Input placeholder="12 Gloucester Road, BS7 8AA" className="h-11" style={{ borderColor: brand.colors.border }}/>
            </div>
            
            <div className="space-y-3">
              <Label style={{ color: brand.colors.textSecondary }}>Preferred Contact</Label>
              <Input placeholder="hannah@example.com" className="h-11" style={{ borderColor: brand.colors.border }}/>
            </div>
            
            <PrimaryButton className="w-full">
              <CheckCircle2 className="w-4 h-4 mr-2"/>
              Save Changes
            </PrimaryButton>
          </CardContent>
        </Card>
      </div>
    </ScrollArea>
  );
}

// --- Screen: Homeowner Discover Map ---
function HODiscoverMapView({ goTo }: { goTo: (k:string)=>void }) {
  const pros = [
    { name: 'AquaFix Plumbing', distance: '0.6 mi', rating: 4.9, available: true },
    { name: 'BrightSpark Electrics', distance: '1.1 mi', rating: 4.8, available: false },
    { name: 'Glos Handyman Co', distance: '1.4 mi', rating: 4.7, available: true },
  ];

  return (
    <ScrollArea className="h-[752px]">
      <ScreenHeader title="Nearby Contractors" subtitle="Find professionals near you" />
      
      <div className="p-4 space-y-4" style={{ background: brand.colors.background }}>
        <div className="rounded-2xl h-52 relative overflow-hidden" 
             style={{ background: `linear-gradient(180deg, ${brand.colors.surfaceSecondary}, ${brand.colors.surfaceTertiary})`, border: `1px solid ${brand.colors.border}` }}>
          <div className="absolute w-4 h-4 rounded-full" style={{ left: '20%', top: '40%', background: brand.colors.secondary }} />
          <div className="absolute w-3 h-3 rounded-full" style={{ left: '55%', top: '30%', background: brand.colors.secondary }} />
          <div className="absolute w-3 h-3 rounded-full" style={{ left: '70%', top: '65%', background: brand.colors.secondary }} />
          
          <div className="absolute left-3 top-3">
            <div className="text-xs px-2 py-1 rounded-full font-medium" style={{ background: brand.colors.primary, color: '#FFFFFF' }}>
              <MapIcon className="w-3 h-3 inline mr-1"/>
              Contractor Map
            </div>
          </div>
          
          <div className="absolute right-3 top-3">
            <OutlineButton className="h-8 text-xs">
              <Search className="w-3 h-3 mr-1"/>
              Filter
            </OutlineButton>
          </div>
        </div>

        <div className="space-y-3">
          {pros.map((p,i)=> (
            <div key={i} className="flex items-center justify-between p-3 rounded-xl transition-all hover:shadow-sm" 
                 style={{ border: `1px solid ${brand.colors.border}`, background: brand.colors.background }}>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback style={{ background: brand.colors.surfaceTertiary }}>{p.name.slice(0,2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  {p.available && (
                    <div className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full" style={{ background: brand.colors.statusCompleted }} />
                  )}
                </div>
                <div>
                  <div className="font-medium">{p.name}</div>
                  <div className="text-xs" style={{ color: brand.colors.textSecondary }}>{p.distance} • {p.rating}★</div>
                </div>
              </div>
              <PrimaryButton onClick={()=> goTo('service-request')} className="h-9">
                <MessageSquare className="w-4 h-4 mr-1"/>
                Contact
              </PrimaryButton>
            </div>
          ))}
        </div>
      </div>
    </ScrollArea>
  );
}

// --- Screen: Contractor Social Feed ---
function ContractorSocialScreenView({ goTo }: { goTo: (k:string)=>void }) {
  const posts = [
    { author: 'John Builders Ltd', time: '2h ago', content: 'Finished a loft conversion in Redland. 5⭐ client review!', tags: ['#loft', '#carpentry', '#bristol'] },
    { author: 'AquaFix Plumbing', time: '4h ago', content: 'Emergency call-out completed. Customer was delighted with quick response.', tags: ['#emergency', '#plumbing'] },
  ];

  return (
    <ScrollArea className="h-[752px]">
      <ScreenHeader title="Professional Network" subtitle="Contractor community" />
      
      <div className="p-4 space-y-4" style={{ background: brand.colors.background }}>
        <div className="grid grid-cols-3 gap-2">
          <OutlineButton className="h-9 text-xs">
            <Star className="w-3 h-3 mr-1"/>
            Featured
          </OutlineButton>
          <OutlineButton className="h-9 text-xs">
            <MapIcon className="w-3 h-3 mr-1"/>
            Local
          </OutlineButton>
          <OutlineButton className="h-9 text-xs">
            <Clock className="w-3 h-3 mr-1"/>
            Recent
          </OutlineButton>
        </div>
        
        <div className="space-y-4">
          {posts.map((post, i) => (
            <Card key={i} style={{ borderColor: brand.colors.border }}>
              <CardHeader className="pb-3 flex flex-row items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarFallback style={{ background: brand.colors.surfaceTertiary }}>{post.author.slice(0,2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <CardTitle className="text-base">{post.author}</CardTitle>
                  <CardDescription style={{ color: brand.colors.textSecondary }}>Posted {post.time} • Bristol</CardDescription>
                </div>
                <OutlineButton className="h-8 text-xs">Follow</OutlineButton>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm" style={{ color: brand.colors.textPrimary }}>{post.content}</p>
                <div className="aspect-video rounded-xl grid place-items-center" style={{ background: brand.colors.surfaceTertiary }}>
                  <Camera className="w-8 h-8" style={{ color: brand.colors.textSecondary }}/>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {post.tags.map((tag, j) => (
                    <Pill key={j} style={{ fontSize: '11px' }}>{tag}</Pill>
                  ))}
                </div>
                <div className="flex items-center gap-4 pt-2">
                  <button className="flex items-center gap-1 text-xs" style={{ color: brand.colors.textSecondary }}>
                    <Star className="w-3 h-3"/> Like
                  </button>
                  <button className="flex items-center gap-1 text-xs" style={{ color: brand.colors.textSecondary }}>
                    <MessageSquare className="w-3 h-3"/> Comment
                  </button>
                  <button className="flex items-center gap-1 text-xs" style={{ color: brand.colors.textSecondary }}>
                    <Send className="w-3 h-3"/> Share
                  </button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </ScrollArea>
  );
}

// Root previewer with enhanced layout
export default function AppUIPreview() {
  const [screen, setScreen] = useState<string>("home");
  const [authed, setAuthed] = useState<boolean>(true);
  const [role, setRole] = useState<"contractor" | "homeowner">("contractor");

  const contractorScreens = new Set(["home","jobs","job-details","messages","service-request","social","payments","profile","ct-map","biometric"]);
  const homeownerScreens = new Set(["ho-home","contractors","my-requests","ho-request-details","messages","invoice","ho-profile","service-request","ho-map","biometric"]);

  function safeSetRole(next: "contractor" | "homeowner") {
    setRole(next);
    if (next === "contractor" && !contractorScreens.has(screen)) setScreen("home");
    if (next === "homeowner" && !homeownerScreens.has(screen)) setScreen("ho-home");
  }

  return (
    <div className="p-4 md:p-8 max-w-[1200px] mx-auto" style={{ fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif" }}>
      <div className="mb-8 text-center">
        <div className="flex items-center justify-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-xl grid place-items-center" style={{ background: brand.colors.secondary + "26" }}>
            <Hammer className="w-6 h-6" style={{ color: brand.colors.secondary }}/>
          </div>
          <div>
            <h1 className="text-3xl font-bold" style={{ color: brand.colors.textPrimary }}>MintEnance UI</h1>
            <p className="text-sm" style={{ color: brand.colors.textSecondary }}>Enhanced with Plus button & industry standards</p>
          </div>
        </div>
        
        <div className="flex items-center justify-center gap-3 flex-wrap">
          <OutlineButton onClick={() => safeSetRole("contractor")} 
                        style={role==="contractor" ? { backgroundColor: brand.colors.secondary + "26", borderColor: brand.colors.secondary } : undefined}>
            <Briefcase className="w-4 h-4 mr-2"/>
            Contractor
          </OutlineButton>
          <OutlineButton onClick={() => safeSetRole("homeowner")} 
                        style={role==="homeowner" ? { backgroundColor: brand.colors.secondary + "26", borderColor: brand.colors.secondary } : undefined}>
            <Home className="w-4 h-4 mr-2"/>
            Homeowner
          </OutlineButton>
          <PrimaryButton onClick={() => setAuthed(true)}>
            <ShieldCheck className="w-4 h-4 mr-2"/>
            Authenticated
          </PrimaryButton>
          <OutlineButton onClick={() => setAuthed(false)}>
            <User className="w-4 h-4 mr-2"/>
            Auth Screens
          </OutlineButton>
        </div>
      </div>

      <div className="grid lg:grid-cols-[1fr_300px] gap-8 items-start">
        <div className="flex justify-center">
          <PhoneFrame>
            <div className="flex-1">
              {!authed ? (
                <div className="h-full">
                  <Tabs value={screen} onValueChange={setScreen} className="h-full">
                    <TabsList className="w-full rounded-none justify-start" 
                             style={{ borderBottom: `1px solid ${brand.colors.border}`, paddingLeft: 16, paddingRight: 16 }}>
                      <TabsTrigger value="login" className="rounded-none">Login</TabsTrigger>
                      <TabsTrigger value="register" className="rounded-none">Register</TabsTrigger>
                    </TabsList>
                    <TabsContent value="login" className="m-0">
                      <LoginScreenView onLogin={() => { setAuthed(true); setScreen(role==="homeowner"?"ho-home":"home"); }}/>
                    </TabsContent>
                    <TabsContent value="register" className="m-0">
                      <RegisterScreenView/>
                    </TabsContent>
                  </Tabs>
                </div>
              ) : (
                <div className="h-full flex flex-col">
                  <div className="flex-1">
                    {/* CONTRACTOR SCREENS */}
                    {role === "contractor" && screen === "home" && <HomeScreenView goTo={setScreen}/>} 
                    {role === "contractor" && screen === "jobs" && <JobsScreenView goTo={setScreen}/>} 
                    {role === "contractor" && screen === "job-details" && <JobDetailsScreenView goTo={setScreen}/>}
                    {role === "contractor" && screen === "messages" && <MessagesListScreenView goTo={setScreen}/>}
                    {role === "contractor" && screen === "service-request" && <ServiceRequestScreenView onSubmit={() => setScreen('jobs')}/>}
                    {role === "contractor" && screen === "social" && <ContractorSocialScreenView goTo={setScreen}/>}
                    {role === "contractor" && screen === "payments" && <PaymentScreenView goTo={setScreen}/>}
                    {role === "contractor" && screen === "profile" && <ProfileScreenView goTo={setScreen}/>}
                    {role === "contractor" && screen === "ct-map" && <CTJobsMapView goTo={setScreen}/>}

                    {/* HOMEOWNER SCREENS */}
                    {role === "homeowner" && screen === "ho-home" && <HOHomeView goTo={setScreen}/>} 
                    {role === "homeowner" && screen === "contractors" && <BrowseContractorsView goTo={setScreen}/>} 
                    {role === "homeowner" && screen === "my-requests" && <MyRequestsView goTo={setScreen}/>} 
                    {role === "homeowner" && screen === "ho-request-details" && <HORequestDetailsView goTo={setScreen}/>} 
                    {role === "homeowner" && screen === "messages" && <MessagesListScreenView goTo={setScreen}/>}
                    {role === "homeowner" && screen === "invoice" && <PayInvoiceView goTo={setScreen}/>}
                    {role === "homeowner" && screen === "ho-profile" && <HomeownerProfileScreenView goTo={setScreen}/>}
                    {role === "homeowner" && screen === "service-request" && <ServiceRequestScreenView onSubmit={() => setScreen('ho-map')}/>}
                    {role === "homeowner" && screen === "ho-map" && <HODiscoverMapView goTo={setScreen}/>}

                    {/* FALLBACK */}
                    {!["home","jobs","job-details","messages","service-request","social","payments","profile","ct-map","ho-home","contractors","my-requests","ho-request-details","invoice","ho-profile","ho-map"].includes(screen) && (
                      <div className="h-full flex items-center justify-center p-8">
                        <div className="text-center">
                          <div className="w-16 h-16 rounded-full mx-auto mb-4 grid place-items-center" 
                               style={{ background: brand.colors.surfaceTertiary }}>
                            {role === "contractor" ? <Briefcase className="w-8 h-8" style={{ color: brand.colors.textSecondary }}/> : <Home className="w-8 h-8" style={{ color: brand.colors.textSecondary }}/>}
                          </div>
                          <h3 className="text-lg font-semibold mb-2">Screen: {screen}</h3>
                          <p className="text-sm" style={{ color: brand.colors.textSecondary }}>This screen is under development</p>
                        </div>
                      </div>
                    )}
                  </div>
                  <BottomNav value={screen} onChange={setScreen} role={role}/>
                </div>
              )}
            </div>
          </PhoneFrame>
        </div>

        <div className="space-y-6">
          <Card style={{ borderColor: brand.colors.border }}>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Plus className="w-5 h-5" style={{ color: brand.colors.secondary }}/>
                Enhanced Features
              </CardTitle>
              <CardDescription style={{ color: brand.colors.textSecondary }}>
                Industry-standard improvements
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5" style={{ color: brand.colors.statusCompleted }}/>
                <div className="text-sm">
                  <div className="font-medium">Plus Icon Button</div>
                  <div style={{ color: brand.colors.textSecondary }}>Centered floating action button</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5" style={{ color: brand.colors.statusCompleted }}/>
                <div className="text-sm">
                  <div className="font-medium">Enhanced Dock Design</div>
                  <div style={{ color: brand.colors.textSecondary }}>Gradient background with shadows</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5" style={{ color: brand.colors.statusCompleted }}/>
                <div className="text-sm">
                  <div className="font-medium">Industry Standard Icons</div>
                  <div style={{ color: brand.colors.textSecondary }}>Lucide icons with proper semantics</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5" style={{ color: brand.colors.statusCompleted }}/>
                <div className="text-sm">
                  <div className="font-medium">Notification Indicators</div>
                  <div style={{ color: brand.colors.textSecondary }}>Subtle badge notifications</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5" style={{ color: brand.colors.statusCompleted }}/>
                <div className="text-sm">
                  <div className="font-medium">Smooth Animations</div>
                  <div style={{ color: brand.colors.textSecondary }}>Enhanced interaction feedback</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card style={{ borderColor: brand.colors.border }}>
            <CardHeader>
              <CardTitle className="text-lg">Screen Navigation</CardTitle>
              <CardDescription style={{ color: brand.colors.textSecondary }}>
                Jump to any screen
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Contractor Screens */}
              <div>
                <p className="text-sm font-medium mb-2" style={{ color: brand.colors.textPrimary }}>Contractor</p>
                <div className="grid grid-cols-2 gap-2">
                  <OutlineButton onClick={() => { safeSetRole("contractor"); setScreen("home"); }} className="text-xs h-8">
                    <Home className="w-3 h-3 mr-1"/>Home
                  </OutlineButton>
                  <OutlineButton onClick={() => { safeSetRole("contractor"); setScreen("jobs"); }} className="text-xs h-8">
                    <Briefcase className="w-3 h-3 mr-1"/>Jobs
                  </OutlineButton>
                  <OutlineButton onClick={() => { safeSetRole("contractor"); setScreen("job-details"); }} className="text-xs h-8">
                    <FileText className="w-3 h-3 mr-1"/>Details
                  </OutlineButton>
                  <OutlineButton onClick={() => { safeSetRole("contractor"); setScreen("messages"); }} className="text-xs h-8">
                    <MessageSquare className="w-3 h-3 mr-1"/>Messages
                  </OutlineButton>
                  <OutlineButton onClick={() => { safeSetRole("contractor"); setScreen("payments"); }} className="text-xs h-8">
                    <CreditCard className="w-3 h-3 mr-1"/>Payments
                  </OutlineButton>
                  <OutlineButton onClick={() => { safeSetRole("contractor"); setScreen("profile"); }} className="text-xs h-8">
                    <User className="w-3 h-3 mr-1"/>Profile
                  </OutlineButton>
                  <OutlineButton onClick={() => { safeSetRole("contractor"); setScreen("ct-map"); }} className="text-xs h-8">
                    <MapIcon className="w-3 h-3 mr-1"/>Jobs Map
                  </OutlineButton>
                  <OutlineButton onClick={() => { safeSetRole("contractor"); setScreen("social"); }} className="text-xs h-8">
                    <Star className="w-3 h-3 mr-1"/>Social
                  </OutlineButton>
                </div>
              </div>

              {/* Homeowner Screens */}
              <div>
                <p className="text-sm font-medium mb-2" style={{ color: brand.colors.textPrimary }}>Homeowner</p>
                <div className="grid grid-cols-2 gap-2">
                  <OutlineButton onClick={() => { safeSetRole("homeowner"); setScreen("ho-home"); }} className="text-xs h-8">
                    <Home className="w-3 h-3 mr-1"/>Home
                  </OutlineButton>
                  <OutlineButton onClick={() => { safeSetRole("homeowner"); setScreen("contractors"); }} className="text-xs h-8">
                    <Search className="w-3 h-3 mr-1"/>Find Pros
                  </OutlineButton>
                  <OutlineButton onClick={() => { safeSetRole("homeowner"); setScreen("my-requests"); }} className="text-xs h-8">
                    <FileText className="w-3 h-3 mr-1"/>Requests
                  </OutlineButton>
                  <OutlineButton onClick={() => { safeSetRole("homeowner"); setScreen("ho-request-details"); }} className="text-xs h-8">
                    <Clock className="w-3 h-3 mr-1"/>Details
                  </OutlineButton>
                  <OutlineButton onClick={() => { safeSetRole("homeowner"); setScreen("invoice"); }} className="text-xs h-8">
                    <CreditCard className="w-3 h-3 mr-1"/>Invoice
                  </OutlineButton>
                  <OutlineButton onClick={() => { safeSetRole("homeowner"); setScreen("ho-profile"); }} className="text-xs h-8">
                    <User className="w-3 h-3 mr-1"/>Profile
                  </OutlineButton>
                  <OutlineButton onClick={() => { safeSetRole("homeowner"); setScreen("ho-map"); }} className="text-xs h-8">
                    <MapIcon className="w-3 h-3 mr-1"/>Contractor Map
                  </OutlineButton>
                  <OutlineButton onClick={() => { safeSetRole("homeowner"); setScreen("service-request"); }} className="text-xs h-8">
                    <Plus className="w-3 h-3 mr-1"/>New Request
                  </OutlineButton>
                </div>
              </div>

              {/* Auth Screens */}
              <div>
                <p className="text-sm font-medium mb-2" style={{ color: brand.colors.textPrimary }}>Authentication</p>
                <div className="grid grid-cols-2 gap-2">
                  <OutlineButton onClick={() => setAuthed(false)} className="text-xs h-8">
                    <Fingerprint className="w-3 h-3 mr-1"/>Login
                  </OutlineButton>
                  <OutlineButton onClick={() => { setAuthed(false); setScreen("register"); }} className="text-xs h-8">
                    <User className="w-3 h-3 mr-1"/>Register
                  </OutlineButton>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}