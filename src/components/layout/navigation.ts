import {
  BarChart3,
  Bell,
  BookOpenText,
  Home,
  Library,
} from "lucide-react";

export const productNavigation = [
  { name: "Home", href: "/dashboard", icon: Home },
  { name: "Library", href: "/books", icon: Library },
  { name: "Reading", href: "/sessions", icon: BookOpenText },
  { name: "Progress", href: "/analytics", icon: BarChart3 },
  { name: "Reminders", href: "/reminders", icon: Bell },
] as const;

export function isNavigationItemActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}
