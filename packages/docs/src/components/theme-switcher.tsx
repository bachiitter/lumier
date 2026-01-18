import { IconMoon, IconSun } from "@tabler/icons-react";
import { useHydrated } from "@tanstack/react-router";
import { useTheme } from "better-themes";
import { Button } from "orphos/button";
import { Spinner } from "orphos/spinner";

export function ThemeSwitcher() {
  const hydrated = useHydrated();
  const { theme, setTheme } = useTheme();
  return (
    <Button disabled={!hydrated} onClick={() => setTheme(theme === "dark" ? "light" : "dark")} size="icon-sm">
      {hydrated ? theme === "dark" ? <IconSun /> : <IconMoon /> : <Spinner />}
    </Button>
  );
}
