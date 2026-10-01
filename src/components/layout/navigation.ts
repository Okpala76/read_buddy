import {
  BarChart3,
  Bell,
  BookOpenText,
  LayoutDashboard,
  Library,
} from "lucide-react";

export const productNavigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Books", href: "/books", icon: Library },
  { name: "Sessions", href: "/sessions", icon: BookOpenText },
  { name: "Analytics", href: "/analytics", icon: BarChart3 },
  { name: "Reminders", href: "/reminders", icon: Bell },
] as const;

export function isNavigationItemActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}
