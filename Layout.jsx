import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import {
  LayoutDashboard, Users, Calendar, Receipt, Package, BarChart3,
  FileText, Menu, X, ChevronDown, LogOut, Settings,
  User, MapPin, Activity, Stethoscope, Tag, Share2,
  AlertTriangle, ChevronsLeft, ChevronsRight, ChevronLeft, Sun, Moon,
  Database, TrendingUp, UserCog, MessageSquare, Shield, ShieldAlert,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { base44 } from '@/api/base44Client';
import BottomTabBar from '@/components/mobile/BottomTabBar';
import ThemeProvider, { useTheme } from '@/components/mobile/ThemeProvider';
import PageTransition from '@/components/mobile/PageTransition';
import GlobalSearch from '@/components/search/GlobalSearch';
import NotificationBell from '@/components/notifications/NotificationBell';
import RealtimeSync from '@/components/system/RealtimeSync';
import Dashboard from '@/pages/Dashboard';
import Patients from '@/pages/Patients';
import Appointments from '@/pages/Appointments';
import Billing from '@/pages/Billing';

/* ─── Persistent mobile tabs (preserve scroll & state) ─────────── */
const PERSISTENT_TABS = ['Dashboard', 'Patients', 'Appointments', 'Billing'];
const TAB_COMPONENTS = { Dashboard, Patients, Appointments, Billing };

/* ─── Navigation manifest ──────────────────────────────────────────
 * Each item declares a `permission` key. Until the backend RBAC is
 * wired in, `usePermissionGate` returns an admin-level default set
 * so nothing is hidden during development. When real roles arrive,
 * swap the gate's data source — the navigation manifest stays as is.
 *
 * NOTE: Client-side visibility is a UX hint, NOT a security boundary.
 * Server-side authorization must enforce these permissions on every
 * data fetch. Hiding a nav item does not protect the route.
 * ────────────────────────────────────────────────────────────────── */
const navigation = [
  {
    section: 'Main',
    items: [
      { name: 'Dashboard',     href: 'Dashboard',     icon: LayoutDashboard, permission: 'dashboard.view' },
      { name: 'Patients',      href: 'Patients',      icon: Users,           permission: 'patients.view' },
      { name: 'Appointments',  href: 'Appointments',  icon: Calendar,        permission: 'appointments.view' },
      { name: 'Visits',        href: 'Visits',        icon: Activity,        permission: 'visits.view' },
    ],
  },
  {
    section: 'Clinical',
    items: [
      { name: 'SOAP Notes',    href: 'SOAPNotes',     icon: FileText,        permission: 'clinical.soap.view' },
    ],
  },
  {
    section: 'Operations',
    items: [
      { name: 'Billing',       href: 'Billing',       icon: Receipt,         permission: 'billing.view' },
      { name: 'Charge Slips',  href: 'ChargeSlips',   icon: FileText,        permission: 'charge_slips.view' },
      { name: 'Inventory',     href: 'Inventory',     icon: Package,         permission: 'inventory.view' },
      { name: 'Services',      href: 'Services',      icon: Stethoscope,     permission: 'services.view' },
      { name: 'Providers',     href: 'Providers',     icon: UserCog,         permission: 'providers.view' },
      { name: 'Earnings',      href: 'Earnings',      icon: TrendingUp,      permission: 'earnings.view' },
    ],
  },
  {
    section: 'Communication',
    items: [
      { name: 'Team Chat',     href: 'TeamChat',      icon: MessageSquare,   permission: 'team_chat.view' },
    ],
  },
  {
    section: 'Growth',
    items: [
      { name: 'Referrals',     href: 'Referrals',     icon: Share2,          permission: 'referrals.view' },
      { name: 'Promo Codes',   href: 'PromoCodes',    icon: Tag,             permission: 'promo_codes.view' },
    ],
  },
  {
    section: 'Insights',
    items: [
      { name: 'Analytics',     href: 'Analytics',     icon: BarChart3,       permission: 'analytics.view' },
    ],
  },
  {
    section: 'System',
    items: [
      { name: 'Branches',          href: 'Branches',         icon: MapPin,    permission: 'branches.view' },
      { name: 'Audit Logs',        href: 'AuditLogs',        icon: Shield,    permission: 'audit_logs.view' },
      { name: 'Customer Display',  href: 'CustomerDisplay',  icon: Activity,  permission: 'customer_display.view' },
      { name: 'Data Migration',    href: 'DataMigration',    icon: Database,  permission: 'data_migration.view' },
      // Settings page is not yet implemented — omitted from nav until /src/pages/Settings.jsx exists.
    ],
  },
];

const CHILD_PAGES = ['PatientChart', 'SOAPNotes'];

/* ─── Permission gate ──────────────────────────────────────────────
 * Temporary client-side stub. Returns admin-level defaults so the
 * UI behaves the same as before role data was added. Once the user
 * profile / role claims are wired up, replace `userPermissions`
 * with the authenticated user's resolved permission set.
 * ────────────────────────────────────────────────────────────────── */
const DEFAULT_ADMIN_PERMISSIONS = new Set([
  'dashboard.view',
  'patients.view',
  'appointments.view',
  'visits.view',
  'clinical.soap.view',
  'billing.view',
  'charge_slips.view',
  'inventory.view',
  'services.view',
  'providers.view',
  'earnings.view',
  'team_chat.view',
  'referrals.view',
  'promo_codes.view',
  'analytics.view',
  'branches.view',
  'audit_logs.view',
  'customer_display.view',
  'data_migration.view',
  'settings.view',
]);

function usePermissionGate() {
  // TODO: Replace with real role/permission claims from authenticated user profile.
  const userPermissions = DEFAULT_ADMIN_PERMISSIONS;

  const can = (permission) => {
    if (!permission) return true;
    return userPermissions.has(permission);
  };

  return { can };
}

/* ─── Dark Mode toggle ─────────────────────────────────────────── */
function ThemeToggle() {
  const { dark, toggle } = useTheme();
  return (
    <button
      onClick={toggle}
      className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
      style={{
        background: 'transparent',
        border: '1px solid var(--border-token)',
        color: 'var(--text-secondary)',
      }}
      title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
      aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {dark ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
    </button>
  );
}

/* ─── Account deactivation request ─────────────────────────────────
 * Per clinic data-retention and audit policy, accounts are not
 * deleted by the user. This submits a request for an administrator
 * to review. No records (patient, billing, clinical) are removed.
 * ────────────────────────────────────────────────────────────────── */
function submitDeactivationRequest() {
  // Backend wiring not yet implemented. Surface a clear notice.
   
  console.warn('Account deactivation request workflow is not yet connected.');
  toast?.('Account deactivation request workflow is not yet connected.', {
    description: 'Please contact your system administrator directly until this is wired to the backend.',
  });
}

export default function Layout({ children, currentPageName }) {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [showDeactivationDialog, setShowDeactivationDialog] = useState(false);

  const { can } = usePermissionGate();

  // Filter nav by permission, drop empty groups.
  const visibleNavigation = navigation
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => can(item.permission)),
    }))
    .filter((group) => group.items.length > 0);

  // Lazy-mount persistent tabs — keep them mounted once visited.
  const visitedTabsRef = useRef(new Set([currentPageName]));
  if (PERSISTENT_TABS.includes(currentPageName)) {
    visitedTabsRef.current.add(currentPageName);
  }

  const isChildPage = CHILD_PAGES.includes(currentPageName);

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname, location.search]);

  return (
    <>
      <ThemeProvider />
      <RealtimeSync />

      <div className="flex min-h-screen" style={{ background: 'linear-gradient(180deg, #E8F0FF 0%, #F6F9FF 100%)' }}>

        {/* Mobile overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-30 lg:hidden"
            style={{ background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(3px)' }}
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* ──────────────── Sidebar ──────────────── */}
        <aside
          className={`bg-transparent fixed inset-y-0 left-0 lg:static z-40 flex flex-col h-[100dvh] lg:h-auto flex-shrink-0 overflow-hidden transition-all duration-300 ease-out ${collapsed ? 'lg:w-[72px]' : 'lg:w-64'} w-[88vw] max-w-[320px] sm:w-[360px] lg:max-w-none ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}
          style={{
            background: 'linear-gradient(180deg, #0033A0 0%, #0046B3 100%)',
            borderRight: 'none',
            boxShadow: 'var(--shadow-sidebar)',
          }}
        >

          {/* Logo row */}
          <div
            className="flex items-center justify-between h-14 px-4 flex-shrink-0"
            style={{ borderBottom: '1px solid rgba(255,255,255,0.10)' }}
          >
            <Link
              to={createPageUrl('Dashboard')}
              className={`flex items-center gap-2.5 overflow-hidden transition-all duration-300 ${collapsed ? 'w-0 opacity-0 pointer-events-none' : 'w-auto opacity-100'}`}
            >
              <img
                src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69a87eb16bd636d586c8e91f/ce25c2af9_1.png"
                alt="GeneSys"
                className="h-9 w-auto object-contain flex-shrink-0"
              />
            </Link>

            {collapsed && (
              <Link to={createPageUrl('Dashboard')} className="mx-auto">
                <img
                  src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69a87eb16bd636d586c8e91f/ce25c2af9_1.png"
                  alt="GeneSys"
                  className="h-8 w-auto object-contain"
                />
              </Link>
            )}

            <div className="flex items-center gap-1 flex-shrink-0">
              <button
                className="hidden lg:flex p-1.5 rounded-lg transition-colors select-none"
                style={{ color: 'rgba(255,255,255,0.5)' }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.10)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                onClick={() => setCollapsed(!collapsed)}
                title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              >
                {collapsed ? <ChevronsRight className="w-3.5 h-3.5" /> : <ChevronsLeft className="w-3.5 h-3.5" />}
              </button>
              <button
                className="lg:hidden p-1.5 rounded-lg transition-colors select-none"
                style={{ color: 'rgba(255,255,255,0.6)' }}
                onClick={() => setSidebarOpen(false)}
                aria-label="Close sidebar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Nav groups */}
          <nav className="mb-3 pt-2 pr-3 pb-2 pl-2 rounded flex-1 overflow-y-auto overflow-x-hidden">
            {visibleNavigation.map((group, gi) => (
              <div key={group.section} className={gi > 0 ? 'mt-4' : ''}>
                {!collapsed && (
                  <p
                    className="text-[10px] mb-1 px-3 font-semibold uppercase tracking-widest"
                    style={{ color: 'rgba(255,255,255,0.6)', letterSpacing: '0.09em' }}
                  >
                    {group.section}
                  </p>
                )}
                <div className="space-y-px">
                  {group.items.map((item) => {
                    const isActive = currentPageName === item.href;
                    return (
                      <Link
                        key={item.name}
                        to={createPageUrl(item.href)}
                        onClick={() => setSidebarOpen(false)}
                        title={collapsed ? item.name : undefined}
                        className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13.5px] font-medium transition-all duration-150 select-none group"
                        style={isActive
                          ? { backgroundColor: '#4D93FF', color: '#FFFFFF' }
                          : { color: 'rgba(255,255,255,0.8)' }}
                        onMouseEnter={(e) => {
                          if (!isActive) e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.08)';
                        }}
                        onMouseLeave={(e) => {
                          if (!isActive) e.currentTarget.style.backgroundColor = 'transparent';
                        }}
                      >
                        <item.icon
                          className="w-4 h-4 flex-shrink-0"
                          style={{ color: isActive ? '#FFFFFF' : 'rgba(255,255,255,0.8)' }}
                        />
                        {!collapsed && (
                          <>
                            <span className="flex-1">{item.name}</span>
                            {isActive && (
                              <span
                                className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                                style={{ background: 'rgba(255,255,255,0.80)' }}
                              />
                            )}
                          </>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>

          {/* User footer */}
          {!collapsed ? (
            <div className="flex-shrink-0 p-3" style={{ borderTop: '1px solid rgba(255,255,255,0.10)' }}>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className="w-full flex items-center gap-2.5 p-2 rounded-lg transition-colors group select-none"
                    style={{ color: '#fff' }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-white text-[11px] font-semibold"
                      style={{ background: 'rgba(255,255,255,0.20)', border: '1px solid rgba(255,255,255,0.95)' }}
                    >
                      A
                    </div>
                    <div className="flex-1 text-left min-w-0">
                      <p className="text-[12.5px] font-medium truncate" style={{ color: '#fff' }}>Admin</p>
                      <p className="text-[11px] truncate" style={{ color: 'rgba(255,255,255,0.50)' }}>Healthcare Provider</p>
                    </div>
                    <ChevronDown className="w-3 h-3 flex-shrink-0" style={{ color: 'rgba(255,255,255,0.40)' }} />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent side="top" align="end" className="w-60 mb-1">
                  <DropdownMenuItem className="text-sm gap-2">
                    <Settings className="w-4 h-4 opacity-50" /> Settings
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => setShowDeactivationDialog(true)}
                    className="text-sm text-amber-700 gap-2"
                  >
                    <ShieldAlert className="w-4 h-4" /> Request Account Deactivation
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => base44.auth.logout()}
                    className="text-sm text-red-600 gap-2"
                  >
                    <LogOut className="w-4 h-4" /> Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ) : (
            <div
              className="flex-shrink-0 p-3 flex justify-center"
              style={{ borderTop: '1px solid rgba(255,255,255,0.10)' }}
            >
              <button
                onClick={() => base44.auth.logout()}
                title="Sign out"
                aria-label="Sign out"
                className="p-2 rounded-lg transition-colors select-none"
                style={{ color: 'rgba(255,255,255,0.50)' }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </aside>

        {/* ──────────────── Main column ──────────────── */}
        <div className="flex flex-col flex-1 min-w-0">

          {/* Top header */}
          <header
            className="flex items-center justify-between px-4 lg:px-6 flex-shrink-0 sticky top-0 z-20"
            style={{
              backgroundColor: 'var(--card-bg)',
              borderBottom: '1px solid var(--border-token)',
              paddingTop: 'env(safe-area-inset-top)',
              height: 56,
            }}
          >
            {/* Left */}
            <div className="flex items-center gap-3">
              {isChildPage ? (
                <button
                  className="p-1.5 rounded-lg lg:hidden transition-colors select-none"
                  style={{ color: 'var(--text-secondary)' }}
                  onClick={() => window.history.back()}
                  aria-label="Back"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
              ) : (
                <button
                  className="p-1.5 rounded-lg lg:hidden transition-colors select-none"
                  style={{ color: 'var(--text-secondary)' }}
                  onClick={() => setSidebarOpen(true)}
                  aria-label="Open menu"
                >
                  <Menu className="w-5 h-5" />
                </button>
              )}

              <img
                src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69a87eb16bd636d586c8e91f/ce25c2af9_1.png"
                alt="GeneSys"
                className="lg:hidden h-7 w-auto object-contain"
              />

              <GlobalSearch />
            </div>

            {/* Right */}
            <div className="flex items-center gap-2">

              {/* Branch selector */}
              <button
                className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors select-none"
                style={{
                  background: 'var(--bg-surface)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-token)',
                }}
                onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--border-strong)'}
                onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border-token)'}
              >
                <MapPin className="w-3.5 h-3.5" style={{ color: 'var(--brand)' }} />
                <span>All Branches</span>
                <ChevronDown className="w-3 h-3 opacity-40" />
              </button>

              <ThemeToggle />
              <NotificationBell />

              {/* Header user menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-[11px] font-semibold select-none flex-shrink-0"
                    style={{ background: 'var(--brand)', border: '1px solid #FFFFFF' }}
                    aria-label="Account menu"
                  >
                    A
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 mt-1">
                  <DropdownMenuItem className="text-sm gap-2">
                    <User className="w-4 h-4 opacity-50" /> Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem className="text-sm gap-2">
                    <Settings className="w-4 h-4 opacity-50" /> Settings
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => setShowDeactivationDialog(true)}
                    className="text-sm text-amber-700 gap-2"
                  >
                    <ShieldAlert className="w-4 h-4" /> Request Account Deactivation
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => base44.auth.logout()}
                    className="text-sm text-red-600 gap-2"
                  >
                    <LogOut className="w-4 h-4" /> Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>

          {/* Page content */}
          <main className="flex-1 overflow-y-auto pb-20 md:pb-6 lg:pb-0">
            {/* Persistent mobile tabs: lazy-mount on first visit, hide-not-unmount */}
            {PERSISTENT_TABS.map((pageName) => {
              if (!visitedTabsRef.current.has(pageName)) return null;
              const TabPage = TAB_COMPONENTS[pageName];
              const isActive = currentPageName === pageName;
              return (
                <div
                  key={pageName}
                  className="p-4 md:p-5 lg:p-6"
                  style={{ display: isActive ? 'block' : 'none' }}
                >
                  <TabPage />
                </div>
              );
            })}

            {/* Non-tab pages render via router children */}
            {!PERSISTENT_TABS.includes(currentPageName) && (
              <PageTransition>
                <div className="p-4 md:p-5 lg:p-6">{children}</div>
              </PageTransition>
            )}
          </main>
        </div>

        <BottomTabBar currentPageName={currentPageName} />
      </div>

      {/* ─── Account Deactivation Request Dialog ─────────────────── */}
      <AlertDialog open={showDeactivationDialog} onOpenChange={setShowDeactivationDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2" style={{ color: '#B45309' }}>
              <AlertTriangle className="w-5 h-5" /> Request Account Deactivation
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will notify the system administrator to review and process account
              deactivation according to clinic data retention and audit policies.
              Patient, billing, and clinical records will not be deleted from the system.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                submitDeactivationRequest();
                setShowDeactivationDialog(false);
              }}
              style={{ background: '#0033A0' }}
            >
              Submit Request
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
