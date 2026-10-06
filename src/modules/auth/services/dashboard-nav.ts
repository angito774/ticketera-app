import {
  can,
  type AppRole,
  type AuthSubject,
} from "@/modules/auth/services/permissions";

export type NavIcon = "dashboard" | "plus" | "building" | "users" | "contact" | "shield" | "external";

export interface NavItem {
  href: string;
  label: string;
  icon: NavIcon;
  matchPrefix?: string;
}

export interface NavSection {
  title?: string;
  items: NavItem[];
}

export const ROLE_LABEL: Record<AppRole, string> = {
  super_admin: "Super admin",
  admin: "Administrador",
  organizer: "Organizador",
  customer: "Cliente",
};

export function getNavSections(subject: AuthSubject): NavSection[] {
  const sections: NavSection[] = [
    {
      items: [
        {
          href: "/organizer",
          label: "Eventos",
          icon: "dashboard",
          matchPrefix: "/organizer/events",
        },
      ],
    },
  ];

  if (can(subject, "members:manage")) {
    const items: NavItem[] = [
      { href: "/admin", label: "Organizaciones", icon: "building" },
      {
        href: "/admin/users",
        label: "Usuarios",
        icon: "users",
        matchPrefix: "/admin/users",
      },
      {
        href: "/admin/customers",
        label: "Clientes",
        icon: "contact",
        matchPrefix: "/admin/customers",
      },
    ];
    if (can(subject, "roles:manage")) {
      items.push({
        href: "/admin/roles",
        label: "Roles",
        icon: "shield",
        matchPrefix: "/admin/roles",
      });
    }
    sections.push({ title: "Administración", items });
  }

  return sections;
}
