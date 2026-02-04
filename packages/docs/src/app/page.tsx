"use client";

import { IconBrandGithub, IconCheck, IconCopy } from "@tabler/icons-react";
import Link from "next/link";
import { useEffect, useState } from "react";

function useGitHubStars() {
  const [stars, setStars] = useState<number | null>(null);

  useEffect(() => {
    fetch("https://api.github.com/repos/bachiitter/lumier")
      .then((res) => res.json())
      .then((data) => {
        if (data.stargazers_count !== undefined) {
          setStars(data.stargazers_count);
        }
      })
      .catch(() => {});
  }, []);

  return stars;
}

function useReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mediaQuery.matches);

    function handleChange(event: MediaQueryListEvent) {
      setPrefersReducedMotion(event.matches);
    }

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  return prefersReducedMotion;
}

function useCopy(text: string) {
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return { copied, copy };
}

function Cursor() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => setVisible((v) => !v), 530);
    return () => clearInterval(interval);
  }, []);

  return (
    <span className={`text-primary transition-opacity duration-100 ease-out ${visible ? "opacity-100" : "opacity-0"}`}>
      █
    </span>
  );
}

function TypedLine({ command, delay = 0, onComplete }: { command: string; delay?: number; onComplete?: () => void }) {
  const [displayed, setDisplayed] = useState("");
  const [typing, setTyping] = useState(false);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (reducedMotion) {
      setDisplayed(command);
      onComplete?.();
      return;
    }

    const timeout = setTimeout(() => {
      setTyping(true);
      let i = 0;
      const interval = setInterval(() => {
        if (i < command.length) {
          setDisplayed(command.slice(0, i + 1));
          i++;
        } else {
          clearInterval(interval);
          setTimeout(() => {
            setTyping(false);
            onComplete?.();
          }, 200);
        }
      }, 25);
      return () => clearInterval(interval);
    }, delay);
    return () => clearTimeout(timeout);
  }, [command, delay, onComplete, reducedMotion]);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-foreground-subtle">$</span>
      <span className="break-all text-foreground">{displayed}</span>
      {typing && <Cursor />}
    </div>
  );
}

function CopyButton({ text, className = "" }: { text: string; className?: string }) {
  const { copied, copy } = useCopy(text);

  return (
    <button
      className={`text-foreground-subtle transition-all duration-150 ease-out hover:text-primary active:scale-95 ${className}`}
      onClick={copy}
      title={copied ? "Copied!" : "Copy"}
      type="button"
    >
      {copied ? <IconCheck className="h-4 w-4 text-success" /> : <IconCopy className="h-4 w-4" />}
    </button>
  );
}

function Box({ title, children, className = "" }: { title?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`relative ${className}`}>
      <div className="border border-foreground/20 transition-colors duration-200 ease-out hover:border-foreground/30">
        {title && (
          <div className="border-b border-foreground/20 bg-background-element px-3 py-2 sm:px-4">
            <span className="text-xs text-primary sm:text-sm">{title}</span>
          </div>
        )}
        <div className="p-3 sm:p-4">{children}</div>
      </div>
    </div>
  );
}

function GitHubLink() {
  const stars = useGitHubStars();

  return (
    <Link
      className="px-2 py-1 transition-all duration-150 ease-out hover:bg-foreground/5 hover:text-primary active:scale-97"
      href="https://github.com/bachiitter/lumier"
      target="_blank"
    >
      [github{stars !== null && <span className="text-primary"> {stars}</span>}]
    </Link>
  );
}

function StaggeredReveal({
  children,
  delay = 0,
  className = "",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const [visible, setVisible] = useState(false);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (reducedMotion) {
      setVisible(true);
      return;
    }
    const timer = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(timer);
  }, [delay, reducedMotion]);

  if (reducedMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <div
      className={`transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${
        visible ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"
      } ${className}`}
    >
      {children}
    </div>
  );
}

function TerminalOutput({ show }: { show: boolean }) {
  const reducedMotion = useReducedMotion();

  if (!show) return null;

  const items = [
    { icon: "→", color: "text-primary", text: "Creating project structure...", highlight: false },
    { icon: "✓", color: "text-success", text: "lumier.config.ts", label: "Created", highlight: true },
    { icon: "✓", color: "text-success", text: "src/index.ts", label: "Created", highlight: true },
    { icon: "✓", color: "text-success", text: ".lumier/", label: "Created", highlight: true },
    { icon: "✓", color: "text-success", text: "lumier-env.d.ts", label: "Generated", highlight: true },
  ];

  return (
    <div className="mt-3 space-y-1 pl-2 text-foreground-subtle sm:mt-4 sm:pl-4">
      {items.map((item, i) => (
        <p
          className={reducedMotion ? "" : "animate-slide-up"}
          key={i}
          style={reducedMotion ? {} : { animationDelay: `${i * 50}ms` }}
        >
          <span className={item.color}>{item.icon}</span> {item.label && <>{item.label} </>}
          <span className={item.highlight ? "text-foreground" : ""}>{item.text}</span>
        </p>
      ))}
      <p
        className={`mt-2 sm:mt-3 ${reducedMotion ? "" : "animate-slide-up"}`}
        style={reducedMotion ? {} : { animationDelay: "250ms" }}
      >
        <span className="text-primary">→</span> Run <span className="text-foreground">bunx lumier dev</span> to start
      </p>
    </div>
  );
}

const ASCII_LOGO = `
██╗     ██╗   ██╗███╗   ███╗██╗███████╗██████╗ 
██║     ██║   ██║████╗ ████║██║██╔════╝██╔══██╗
██║     ██║   ██║██╔████╔██║██║█████╗  ██████╔╝
██║     ██║   ██║██║╚██╔╝██║██║██╔══╝  ██╔══██╗
███████╗╚██████╔╝██║ ╚═╝ ██║██║███████╗██║  ██║
╚══════╝ ╚═════╝ ╚═╝     ╚═╝╚═╝╚══════╝╚═╝  ╚═╝`.trim();

const ASCII_LOGO_SMALL = `
█   █ █ █▄ ▄█ █ █▀▀ █▀█
█▄▄ █▄█ █ ▀ █ █ █▀  █▀▄
`.trim();

const CONFIG_EXAMPLE = `import { $config, Worker, D1, KV, Bucket } from "lumier";

export default $config({
  app() {
    return { 
      name: "my-api", 
      protect: ["production"] 
    };
  },
  run(ctx) {
    const db = D1("database");
    const cache = KV("cache");
    const uploads = Bucket("uploads");

    const api = Worker("api", {
      entry: "src/index.ts",
      url: true,
      bindings: {
        DB: db,
        CACHE: cache,
        UPLOADS: uploads,
        STAGE: ctx.stage,
      },
    });

    return { url: api.url };
  },
});`;

const COMPARISON = {
  before: [
    "wrangler.toml (per worker)",
    "wrangler.staging.toml",
    "wrangler.production.toml",
    ".dev.vars",
    "Manual binding IDs",
    "No type safety",
    "Copy-paste configs",
  ],
  after: [
    "lumier.config.ts",
    "↳ All stages in one file",
    "↳ Generated types",
    "↳ Isolated resources",
    "↳ Preview changes",
    "↳ Encrypted secrets",
    "↳ One CLI",
  ],
};

const RESOURCES = [
  { name: "Worker", desc: "Edge compute", status: "stable" },
  { name: "D1", desc: "SQLite database", status: "stable" },
  { name: "KV", desc: "Key-value store", status: "stable" },
  { name: "Bucket", desc: "R2 storage", status: "stable" },
  { name: "Queue", desc: "Message queues", status: "stable" },
  { name: "DurableObject", desc: "Stateful primitives", status: "stable" },
  { name: "Vectorize", desc: "Vector database", status: "beta" },
  { name: "Hyperdrive", desc: "Connection pooling", status: "beta" },
];

const FEATURES = [
  { number: "01", title: "Typed Bindings", desc: "env.DB autocompletes from your config." },
  { number: "02", title: "Fast Dev Loop", desc: "Live on real Workers in ~400ms." },
  { number: "03", title: "Stage Isolation", desc: "dev, staging, production from one config." },
  { number: "04", title: "Preview Changes", desc: "Run --preview to see what deploys." },
  { number: "05", title: "Encrypted Secrets", desc: "Manage secrets per-stage." },
  { number: "06", title: "Protection Guards", desc: "Protect prod from destroys." },
];

export default function Home() {
  const [termStep, setTermStep] = useState(0);
  const [showMain, setShowMain] = useState(false);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    const timer = setTimeout(() => setShowMain(true), reducedMotion ? 0 : 100);
    return () => clearTimeout(timer);
  }, [reducedMotion]);

  return (
    <div className="min-h-screen bg-background font-mono text-sm leading-relaxed text-foreground selection:bg-primary selection:text-primary-foreground">
      {/* Scanline effect */}
      <div
        className="pointer-events-none fixed inset-0 z-50 opacity-[0.02]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, transparent, transparent 1px, var(--foreground) 1px, var(--foreground) 2px)",
          backgroundSize: "100% 3px",
        }}
      />

      {/* Noise texture */}
      <div
        className="pointer-events-none fixed inset-0 z-40 opacity-[0.015]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />

      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
        {/* Header */}
        <header className="flex flex-col gap-3 border-b border-foreground/20 pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <span className="text-primary">●</span>
            <span className="text-foreground">lumier</span>
            <span className="hidden text-foreground-subtle xs:inline">v0.1.0-alpha</span>
            <span className="border border-warning/50 bg-warning/10 px-1.5 py-0.5 text-xs text-warning transition-colors duration-150 hover:bg-warning/15">
              ALPHA
            </span>
          </div>
          <nav className="flex items-center gap-1 text-foreground-subtle">
            <Link
              className="px-2 py-1 transition-all duration-150 ease-out hover:bg-foreground/5 hover:text-primary active:scale-97"
              href="/docs/intro"
            >
              [docs]
            </Link>
            <GitHubLink />
          </nav>
        </header>

        {showMain && (
          <main className="mt-6 space-y-10 sm:mt-8 sm:space-y-12">
            {/* Hero */}
            <StaggeredReveal delay={0}>
              <section>
                <pre className="text-[11px] leading-tight text-primary sm:hidden">{ASCII_LOGO_SMALL}</pre>
                <pre className="hidden text-[10px] leading-tight text-primary sm:block md:text-[11px]">
                  {ASCII_LOGO}
                </pre>

                <p className="mt-4 text-foreground-subtle sm:mt-6">
                  <span className="text-primary">λ</span> TypeScript infrastructure-as-code for Cloudflare
                </p>

                <p className="mt-3 text-foreground-subtle sm:mt-4">
                  Define your entire Cloudflare stack in a single TypeScript config file. Workers, D1, KV, R2, Queues,
                  Durable Objects — all strongly typed, all in one place.
                </p>
              </section>
            </StaggeredReveal>

            {/* Live Demo */}
            <StaggeredReveal delay={50}>
              <section>
                <div className="mb-3 flex items-center gap-2 sm:mb-4">
                  <span className="text-primary">##</span>
                  <span className="text-xs uppercase tracking-wider text-foreground sm:text-sm">Live Demo</span>
                </div>

                <Box title="terminal">
                  <div className="space-y-2">
                    <TypedLine command="bunx lumier init my-api" delay={300} onComplete={() => setTermStep(1)} />
                    <TerminalOutput show={termStep >= 1} />
                    {termStep >= 1 && (
                      <div
                        className={`mt-3 flex items-center gap-2 sm:mt-4 ${reducedMotion ? "" : "animate-fade-in"}`}
                        style={reducedMotion ? {} : { animationDelay: "350ms" }}
                      >
                        <span className="text-foreground-subtle">$</span>
                        <Cursor />
                      </div>
                    )}
                  </div>
                </Box>
              </section>
            </StaggeredReveal>

            {/* Before / After */}
            <StaggeredReveal delay={100}>
              <section>
                <div className="mb-3 flex items-center gap-2 sm:mb-4">
                  <span className="text-primary">##</span>
                  <span className="text-xs uppercase tracking-wider text-foreground sm:text-sm">Before / After</span>
                </div>

                <div className="grid gap-3 sm:gap-4 md:grid-cols-2">
                  <Box title="wrangler">
                    <div className="space-y-1.5 text-xs sm:space-y-2 sm:text-sm">
                      {COMPARISON.before.map((item, i) => (
                        <div
                          className="flex items-start gap-2 text-foreground-subtle transition-transform duration-150 ease-out hover:translate-x-0.5"
                          key={i}
                        >
                          <span className="text-danger">✗</span>
                          <span>{item}</span>
                        </div>
                      ))}
                    </div>
                  </Box>

                  <Box title="lumier">
                    <div className="space-y-1.5 text-xs sm:space-y-2 sm:text-sm">
                      {COMPARISON.after.map((item, i) => (
                        <div
                          className="flex items-start gap-2 transition-transform duration-150 ease-out hover:translate-x-0.5"
                          key={i}
                        >
                          <span className="text-success">✓</span>
                          <span className={i === 0 ? "text-foreground" : "text-foreground-subtle"}>{item}</span>
                        </div>
                      ))}
                    </div>
                  </Box>
                </div>
              </section>
            </StaggeredReveal>

            {/* Features */}
            <StaggeredReveal delay={150}>
              <section>
                <div className="mb-3 flex items-center gap-2 sm:mb-4">
                  <span className="text-primary">##</span>
                  <span className="text-xs uppercase tracking-wider text-foreground sm:text-sm">Features</span>
                </div>

                <div className="grid gap-4 sm:gap-6 md:grid-cols-2">
                  {[FEATURES.slice(0, 3), FEATURES.slice(3)].map((col, colIdx) => (
                    <div className="space-y-4" key={colIdx}>
                      {col.map((feature) => (
                        <div
                          className="group flex gap-3 transition-transform duration-150 ease-out hover:translate-x-1 sm:gap-4"
                          key={feature.number}
                        >
                          <span className="text-primary transition-opacity duration-150 group-hover:opacity-80">
                            {feature.number}
                          </span>
                          <div>
                            <p className="text-foreground">{feature.title}</p>
                            <p className="mt-1 text-xs text-foreground-subtle sm:text-sm">{feature.desc}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </section>
            </StaggeredReveal>

            {/* Resources */}
            <StaggeredReveal delay={200}>
              <section>
                <div className="mb-3 flex items-center gap-2 sm:mb-4">
                  <span className="text-primary">##</span>
                  <span className="text-xs uppercase tracking-wider text-foreground sm:text-sm">Resources</span>
                </div>

                <Box>
                  <div className="grid gap-2 text-xs sm:grid-cols-2 sm:gap-3 sm:text-sm">
                    {RESOURCES.map((r) => (
                      <div
                        className="flex items-center justify-between border-b border-foreground/10 pb-2 transition-all duration-150 ease-out last:border-0 hover:bg-foreground/[0.02] sm:last:border-0"
                        key={r.name}
                      >
                        <div className="flex items-center gap-2 sm:gap-3">
                          <span className="text-primary">→</span>
                          <span className="text-foreground">{r.name}</span>
                          <span className="hidden text-foreground-subtle xs:inline">— {r.desc}</span>
                        </div>
                        <span className={`text-xs ${r.status === "stable" ? "text-success" : "text-warning"}`}>
                          [{r.status}]
                        </span>
                      </div>
                    ))}
                  </div>
                </Box>
              </section>
            </StaggeredReveal>

            {/* Code Example */}
            <StaggeredReveal delay={250}>
              <section>
                <div className="mb-3 flex items-center gap-2 sm:mb-4">
                  <span className="text-primary">##</span>
                  <span className="text-xs uppercase tracking-wider text-foreground sm:text-sm">Example</span>
                </div>

                <div className="group">
                  <Box title="lumier.config.ts">
                    <div className="absolute right-3 top-2 sm:right-4 sm:top-3">
                      <CopyButton
                        className="opacity-100 transition-opacity duration-150 sm:opacity-0 sm:group-hover:opacity-100"
                        text={CONFIG_EXAMPLE}
                      />
                    </div>
                    <pre className="overflow-x-auto text-[10px] leading-5 sm:text-xs">
                      <code className="text-foreground-subtle">{CONFIG_EXAMPLE}</code>
                    </pre>
                  </Box>
                </div>
              </section>
            </StaggeredReveal>

            {/* Get Started CTA */}
            <StaggeredReveal delay={300}>
              <section className="border border-primary/30 bg-primary/5 p-4 transition-colors duration-200 ease-out hover:border-primary/40 hover:bg-primary/[0.07] sm:p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
                  <div>
                    <p className="text-base text-foreground sm:text-lg">Ready to ship?</p>
                    <p className="mt-1 text-xs text-foreground-subtle sm:text-sm">
                      One command to start. One config to rule them all.
                    </p>
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
                    <Link
                      className="bg-primary px-4 py-2 text-center text-primary-foreground transition-all duration-150 ease-out hover:opacity-90 active:scale-[0.97] sm:px-6"
                      href="/docs/getting-started"
                    >
                      get started →
                    </Link>
                    <Link
                      className="flex items-center justify-center gap-2 border border-foreground/20 px-4 py-2 transition-all duration-150 ease-out hover:border-primary hover:text-primary active:scale-[0.97]"
                      href="https://github.com/bachiitter/lumier"
                      target="_blank"
                    >
                      <IconBrandGithub className="h-4 w-4" />
                      <span>source</span>
                    </Link>
                  </div>
                </div>
              </section>
            </StaggeredReveal>
          </main>
        )}

        {/* Footer */}
        <footer className="mt-12 border-t border-foreground/20 pt-4 sm:mt-16 sm:pt-6">
          <div className="flex flex-col gap-3 text-xs text-foreground-subtle sm:flex-row sm:items-center sm:justify-between sm:text-sm">
            <div className="flex items-center gap-2 sm:gap-4">
              <span>LUMIER(1)</span>
              <span className="hidden text-foreground/20 sm:inline">│</span>
              <span className="hidden sm:inline">TypeScript IaC for Cloudflare</span>
            </div>
            <Link
              className="flex items-center gap-2 transition-colors duration-150 ease-out hover:text-primary"
              href="https://github.com/bachiitter/lumier"
              target="_blank"
            >
              <IconBrandGithub className="h-4 w-4" />
              <span className="hidden sm:inline">github.com/bachiitter/lumier</span>
              <span className="sm:hidden">GitHub</span>
            </Link>
          </div>
        </footer>
      </div>

      <style global jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes slide-up {
          from {
            opacity: 0;
            transform: translateY(4px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fade-in {
          opacity: 0;
          animation: fade-in 200ms ease-out forwards;
        }

        .animate-slide-up {
          opacity: 0;
          animation: slide-up 200ms ease-out forwards;
        }

        .active\\:scale-97:active {
          transform: scale(0.97);
        }

        @media (prefers-reduced-motion: reduce) {
          .animate-fade-in,
          .animate-slide-up {
            animation: none;
            opacity: 1;
            transform: none;
          }
        }
      `}</style>
    </div>
  );
}
