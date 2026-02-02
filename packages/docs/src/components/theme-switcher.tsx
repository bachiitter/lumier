"use client";

import { IconMoon, IconSun } from "@tabler/icons-react";
import { useTheme } from "better-themes";
import { Button } from "orphos/button";
import { Spinner } from "orphos/spinner";
import { useEffect, useState } from "react";

export function ThemeSwitcher() {
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <Button
      disabled={!mounted}
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      size="icon-sm"
    >
      {mounted ? theme === "dark" ? <IconSun /> : <IconMoon /> : <Spinner />}
    </Button>
  );
}
