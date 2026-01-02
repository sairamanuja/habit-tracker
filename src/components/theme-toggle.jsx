"use client";

import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const next = theme === "dark" ? "light" : "dark";

  return (
    <Button variant="ghost" onClick={() => setTheme(next)}>
      {theme === "dark" ? "Light" : "Dark"}
    </Button>
  );
}
