import {
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Database, Settings, User, Webhook } from "lucide-react";
import { CanAccess } from "ra-core";
import { Link, matchPath, useLocation } from "react-router";
import { RefreshButton } from "@/components/admin/refresh-button";
import { ThemeModeToggle } from "@/components/admin/theme-mode-toggle";
import { UserMenu } from "@/components/admin/user-menu";
import { useUserMenu } from "@/hooks/user-menu-context";

import { useConfigurationContext } from "../root/ConfigurationContext";

const Header = () => {
  const { darkModeLogo, lightModeLogo, title } = useConfigurationContext();
  const location = useLocation();

  // Simplified path matching logic
  const navPaths = [
    { path: "/", pattern: "/" },
    { path: "/contacts", pattern: "/contacts/*" },
    { path: "/companies", pattern: "/companies/*" },
    { path: "/deals", pattern: "/deals/*" },
  ];

  const currentPath =
    navPaths.find((nav) => matchPath(nav.pattern, location.pathname))?.path ||
    false;

  return (
    <header className="bg-secondary fixed top-0 left-0 right-0 z-50 border-b border-border">
      <div className="px-4">
        <div className="flex justify-between items-center flex-1">
          <Logo darkLogo={darkModeLogo} lightLogo={lightModeLogo} title={title} />

          <nav className="flex" aria-label="Main navigation">
            <NavigationTab
              label="Dashboard"
              to="/"
              isActive={currentPath === "/"}
            />
            <NavigationTab
              label="Contacts"
              to="/contacts"
              isActive={currentPath === "/contacts"}
            />
            <NavigationTab
              label="Companies"
              to="/companies"
              isActive={currentPath === "/companies"}
            />
            <NavigationTab
              label="Deals"
              to="/deals"
              isActive={currentPath === "/deals"}
            />
          </nav>

          <div className="flex items-center">
            <ThemeModeToggle />
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
                <div className="text-xs text-muted-foreground">
                  Version {import.meta.env.VITE_APP_VERSION}
                </div>
              </DropdownMenuLabel>
            </UserMenu>
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
  return (
    <DropdownMenuItem asChild onClick={onClose}>
      <Link to="/sales" className="flex items-center gap-2">
        <User className="h-4 w-4" />
        Users
      </Link>
    </DropdownMenuItem>
  );
};

const ConfigurationMenu = () => {
  const { onClose } = useUserMenu() ?? {};
  return (
    <DropdownMenuItem asChild onClick={onClose}>
      <Link to="/settings" className="flex items-center gap-2">
        <Settings className="h-4 w-4" />
        My info
      </Link>
    </DropdownMenuItem>
  );
};

const DatabaseMenu = () => {
  const { onClose } = useUserMenu() ?? {};
  return (
    <DropdownMenuItem asChild onClick={onClose}>
      <Link to="/database" className="flex items-center gap-2">
        <Database className="h-4 w-4" />
        Database
      </Link>
    </DropdownMenuItem>
  );
};

const IntegrationsMenu = () => {
  const { onClose } = useUserMenu() ?? {};
  return (
    <DropdownMenuItem asChild onClick={onClose}>
      <Link to="/integrations" className="flex items-center gap-2">
        <Webhook className="h-4 w-4" />
        Integrations
      </Link>
    </DropdownMenuItem>
  );
};

export default Header;
