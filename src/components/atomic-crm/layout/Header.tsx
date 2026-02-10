import { useEffect, useState } from "react";
import {
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ds/ui/dropdown-menu";
import {
  Database,
  Settings,
  User,
  Webhook,
  ArrowLeft,
  Cpu,
} from "lucide-react";
import { CanAccess, useTranslate } from "ra-core";
import { Link, matchPath, useLocation, useNavigate } from "react-router";
import { RefreshButton } from "@/components/ds/admin/refresh-button";
import { ThemeModeToggle } from "@/components/ds/admin/theme-mode-toggle";
import { UserMenu } from "@/components/ds/admin/user-menu";
import { LocalesMenuButton } from "@/components/ds/admin/locales-menu-button";
import { useUserMenu } from "@/hooks/user-menu-context";
import { MigrationPulseIndicator } from "@/components/atomic-crm/migration";
import { useMigrationContextSafe } from "@/contexts/MigrationContext";
import { Button } from "@/components/ds/ui/button";
import { ChangelogModal } from "./ChangelogModal";
import { AISettingsModal } from "./AISettingsModal";

import { useConfigurationContext } from "../root/ConfigurationContext";

const Header = () => {
  const { darkModeLogo, lightModeLogo, title } = useConfigurationContext();
  const location = useLocation();
  const migrationContext = useMigrationContextSafe();
  const translate = useTranslate();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [changelogOpen, setChangelogOpen] = useState(false);
  const [isAISettingsOpen, setIsAISettingsOpen] = useState(false);

  // Simplified path matching logic
  const navPaths = [
    { path: "/", pattern: "/" },
    { path: "/contacts", pattern: "/contacts/*" },
    { path: "/companies", pattern: "/companies/*" },
    { path: "/deals", pattern: "/deals/*" },
    { path: "/invoices", pattern: "/invoices/*" },
    { path: "/tasks", pattern: "/tasks/*" },
    { path: "/ai", pattern: "/ai/*" },
  ];

  const currentPath =
    navPaths.find((nav) => matchPath(nav.pattern, location.pathname))?.path ||
    false;

  // Show pulse indicator when migration is needed but banner is dismissed
  const showPulseIndicator =
    migrationContext?.migrationStatus?.needsMigration &&
    !migrationContext?.showMigrationBanner;

  // Check if a dialog is currently open (synchronous check to prevent flash)
  const checkDialogSync = () => {
    const dialogOpen = document.querySelector(
      '[role="dialog"][data-state="open"]',
    );
    return !!dialogOpen;
  };

  // Detect if a dialog/modal is currently open
  useEffect(() => {
    const checkDialog = () => {
      // Check if a dialog overlay exists in the DOM
      // We look for role="dialog" which covers both Dialog and Sheet components
      // and ensure it is in the open state
      const dialogOpen = checkDialogSync();
      setIsDialogOpen(dialogOpen);
    };

    // Check on mount and when location changes
    checkDialog();

    // Use MutationObserver to detect dialog state changes
    const observer = new MutationObserver(checkDialog);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["data-state"],
    });

    return () => observer.disconnect();
  }, [location.pathname]);

  // Determine if back button should be shown
  // Use whitelist approach: show only on specific non-modal pages
  const backButtonPages = ["/settings", "/database", "/integrations", "/sales"];
  const isBackButtonPage =
    backButtonPages.some((page) => location.pathname.startsWith(page)) ||
    /\/show$/.test(location.pathname);

  // Check dialog state synchronously during render to prevent flash
  const isDialogCurrentlyOpen = isDialogOpen || checkDialogSync();
  const showBackButton = isBackButtonPage && !isDialogCurrentlyOpen;

  return (
    <header className="bg-secondary fixed top-0 left-0 right-0 z-50 border-b border-border">
      <div className="px-4 sm:px-5 lg:px-6">
        <div className="flex justify-between items-center flex-1">
          <div className="flex items-center gap-2">
            <Logo
              darkLogo={darkModeLogo}
              lightLogo={lightModeLogo}
              title={title}
            />
            {showBackButton && <BackButton />}
          </div>

          <nav className="flex" aria-label="Main navigation">
            <NavigationTab
              label={translate("crm.nav.dashboard")}
              to="/"
              isActive={currentPath === "/"}
            />
            <NavigationTab
              label={translate("crm.nav.contacts")}
              to="/contacts"
              isActive={currentPath === "/contacts"}
            />
            <NavigationTab
              label={translate("crm.nav.companies")}
              to="/companies"
              isActive={currentPath === "/companies"}
            />
            <NavigationTab
              label={translate("crm.nav.deals")}
              to="/deals"
              isActive={currentPath === "/deals"}
            />
            <NavigationTab
              label={translate("crm.nav.invoices")}
              to="/invoices"
              isActive={currentPath === "/invoices"}
            />
            <NavigationTab
              label={translate("crm.nav.tasks")}
              to="/tasks"
              isActive={currentPath === "/tasks"}
            />
            <NavigationTab
              label={translate("crm.nav.ai")}
              to="/ai"
              isActive={currentPath === "/ai"}
            />
          </nav>

          <div className="flex items-center">
            {showPulseIndicator && (
              <MigrationPulseIndicator
                onClick={() => migrationContext?.openMigrationModal()}
              />
            )}
            <LocalesMenuButton />
            <ThemeModeToggle />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsAISettingsOpen(true)}
              className="text-secondary-foreground/70 hover:text-secondary-foreground"
              title="AI Settings"
            >
              <Cpu className="h-5 w-5" />
            </Button>
            <RefreshButton />
            <UserMenu>
              <ConfigurationMenu />
              <DatabaseMenu />
              <IntegrationsMenu />
              <CanAccess resource="sales" action="list">
                <UsersMenu />
              </CanAccess>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="font-normal">
                <button
                  onClick={() => setChangelogOpen(true)}
                  className="text-xs text-muted-foreground hover:text-foreground cursor-pointer transition-colors w-full text-left"
                >
                  Version {import.meta.env.VITE_APP_VERSION}
                </button>
              </DropdownMenuLabel>
            </UserMenu>
            <ChangelogModal
              open={changelogOpen}
              onOpenChange={setChangelogOpen}
            />
            <AISettingsModal
              open={isAISettingsOpen}
              onOpenChange={setIsAISettingsOpen}
            />
          </div>
        </div>
      </div>
    </header>
  );
};

const Logo = ({
  darkLogo,
  lightLogo,
  title,
}: {
  darkLogo: string;
  lightLogo: string;
  title: string;
}) => (
  <Link
    to="/"
    className="flex items-center gap-2 text-secondary-foreground no-underline hover:opacity-80 transition-opacity"
  >
    <img
      className="[.light_&]:hidden h-6"
      src={darkLogo}
      alt={`${title} logo`}
    />
    <img
      className="[.dark_&]:hidden h-6"
      src={lightLogo}
      alt={`${title} logo`}
    />
    <h1 className="text-xl font-semibold">{title}</h1>
  </Link>
);

const BackButton = () => {
  const navigate = useNavigate();
  const translate = useTranslate();

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => navigate(-1)}
      className="gap-1 text-secondary-foreground/70 hover:text-secondary-foreground"
      aria-label="Go back to previous page"
    >
      <ArrowLeft className="h-4 w-4" />
      <span className="hidden sm:inline">{translate("crm.nav.back")}</span>
    </Button>
  );
};

const NavigationTab = ({
  label,
  to,
  isActive,
}: {
  label: string;
  to: string;
  isActive: boolean;
}) => (
  <Link
    to={to}
    className={`px-6 py-3 text-sm font-medium transition-colors border-b-2 ${
      isActive
        ? "text-secondary-foreground border-secondary-foreground"
        : "text-secondary-foreground/70 border-transparent hover:text-secondary-foreground/80"
    }`}
  >
    {label}
  </Link>
);

const UsersMenu = () => {
  const { onClose } = useUserMenu() ?? {};
  const translate = useTranslate();
  return (
    <DropdownMenuItem asChild onClick={onClose}>
      <Link to="/sales" className="flex items-center gap-2">
        <User className="h-4 w-4" />
        {translate("crm.nav.users")}
      </Link>
    </DropdownMenuItem>
  );
};

const ConfigurationMenu = () => {
  const { onClose } = useUserMenu() ?? {};
  const translate = useTranslate();
  return (
    <DropdownMenuItem asChild onClick={onClose}>
      <Link to="/settings" className="flex items-center gap-2">
        <Settings className="h-4 w-4" />
        {translate("crm.nav.settings")}
      </Link>
    </DropdownMenuItem>
  );
};

const DatabaseMenu = () => {
  const { onClose } = useUserMenu() ?? {};
  const translate = useTranslate();
  return (
    <DropdownMenuItem asChild onClick={onClose}>
      <Link to="/database" className="flex items-center gap-2">
        <Database className="h-4 w-4" />
        {translate("crm.nav.database")}
      </Link>
    </DropdownMenuItem>
  );
};

const IntegrationsMenu = () => {
  const { onClose } = useUserMenu() ?? {};
  const translate = useTranslate();
  return (
    <DropdownMenuItem asChild onClick={onClose}>
      <Link to="/integrations" className="flex items-center gap-2">
        <Webhook className="h-4 w-4" />
        {translate("crm.nav.integrations")}
      </Link>
    </DropdownMenuItem>
  );
};

export default Header;
