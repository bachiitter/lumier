import { ThemeProvider } from "better-themes/rsc";
import type { Metadata } from "next";
import { GITHUB_URL, SITE_DESCRIPTION, SITE_TITLE, SITE_URL } from "~/lib/constants";
import "~/styles.css";

export const metadata: Metadata = {
  title: {
    default: SITE_TITLE,
    template: `%s | ${SITE_TITLE}`,
  },
  description: SITE_DESCRIPTION,
  metadataBase: new URL(SITE_URL),
  openGraph: {
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    siteName: SITE_TITLE,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
  other: {
    "github:repo": GITHUB_URL,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider attribute="class" defaultTheme="system" disableTransitionOnChange enableSystem>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
