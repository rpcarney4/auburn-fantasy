"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
} from "@/components/ui/accordion";

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/team", label: "Teams" },
  { href: "/game-log", label: "Game Log" },
  { href: "/playoffs", label: "Playoffs" },
  { href: "/draft-history", label: "Draft History" },
  { href: "/trade-history", label: "Trade History" },
];

export function Nav() {
  const pathname = usePathname();
  const [open, setOpen] = useState<string | undefined>(undefined);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <header className="border-b">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between py-4">
          <Link href="/" className="flex items-center gap-2 text-lg font-bold tracking-tight">
            <Image
              src="/img/Auburn_Tigers_logo.svg"
              alt="Auburn Tigers"
              width={32}
              height={28}
              className="h-8 w-auto"
            />
            AUB Fantasy
          </Link>
          <nav className="hidden flex-wrap gap-1 text-sm sm:flex">
            {LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "rounded-md px-3 py-1.5 font-medium transition-colors hover:bg-accent hover:text-accent-foreground",
                  isActive(link.href)
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground"
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <button
            type="button"
            onClick={() => setOpen((o) => (o ? undefined : "menu"))}
            aria-label="Toggle navigation menu"
            aria-expanded={open === "menu"}
            className="flex items-center justify-center rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground sm:hidden"
          >
            {open === "menu" ? (
              <X className="size-5" />
            ) : (
              <Menu className="size-5" />
            )}
          </button>
        </div>

        <Accordion
          type="single"
          collapsible
          value={open ?? ""}
          onValueChange={(v) => setOpen(v || undefined)}
          className="sm:hidden"
        >
          <AccordionItem value="menu" className="border-none">
            <AccordionContent>
              <nav className="flex flex-col gap-1 pb-4 text-sm">
                {LINKS.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setOpen(undefined)}
                    className={cn(
                      "rounded-md px-3 py-2 font-medium transition-colors hover:bg-accent hover:text-accent-foreground",
                      isActive(link.href)
                        ? "bg-accent text-accent-foreground"
                        : "text-muted-foreground"
                    )}
                  >
                    {link.label}
                  </Link>
                ))}
              </nav>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </header>
  );
}
