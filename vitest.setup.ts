import React from "react";
import "@testing-library/jest-dom/vitest";
import { afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";

afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
});

/*
 * next/navigation and next/link rely on the Next.js runtime, which isn't present
 * under jsdom. Stub them globally so components that use router hooks or <Link>
 * can render in isolation. Real navigation behavior is covered by the pure
 * helpers in src/lib/auth-routes.ts and by manual/E2E testing.
 */
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
  }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
  redirect: vi.fn(),
  notFound: vi.fn(),
}));

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href: string | { pathname?: string };
    children: React.ReactNode;
  } & React.AnchorHTMLAttributes<HTMLAnchorElement>) =>
    React.createElement(
      "a",
      { href: typeof href === "string" ? href : (href?.pathname ?? "#"), ...props },
      children,
    ),
}));
