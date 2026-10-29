import { Outlet } from "react-router-dom";
import { ChevronDown, House, Lock, Map as MapIcon, UserRound } from "lucide-react";
import { Toaster } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Hamster } from "@/components/hamster-art";
import { todayOf, useAppStore, type Screen } from "@/lib/store";
import { cn } from "@/lib/utils";

const NAV: { id: Screen; label: string; icon: typeof House }[] = [
  { id: "home", label: "ホーム", icon: MapIcon },
  { id: "room", label: "おへや", icon: House },
];

export function AppShell() {
  const screen = useAppStore((s) => s.screen);
  const setScreen = useAppStore((s) => s.setScreen);
  const profiles = useAppStore((s) => s.profiles);
  const active = useAppStore((s) => s.profiles.find((p) => p.id === s.activeId) ?? null);
  const switchProfile = useAppStore((s) => s.switchProfile);
  const dayOffset = useAppStore((s) => s.dev.dayOffset);
  const hasPin = useAppStore((s) => !!s.pin);
  const playing = screen === "play";
  const ready = hasPin && !!active;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <a
        href="#work"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-md focus:bg-primary focus:px-3 focus:py-2 focus:text-primary-foreground"
      >
        メインへ スキップ
      </a>
      <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-3 gap-y-2 px-4 py-2">
          <div className="flex items-center gap-2">
            <Hamster wear={active?.wearing ?? null} className="size-10" />
            <span className="text-xl font-black tracking-tight">ハムざん</span>
          </div>
          {ready && !playing && screen !== "parent" && (
            <nav aria-label="メニュー" className="order-last flex w-full gap-1 sm:order-none sm:w-auto">
              {NAV.map((n) => {
                const on = screen === n.id;
                return (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => setScreen(n.id)}
                    aria-current={on ? "page" : undefined}
                    className={cn(
                      "inline-flex h-12 items-center gap-1.5 rounded-full px-4 text-sm font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                      on ? "bg-primary text-primary-foreground" : "hover:bg-accent",
                    )}
                  >
                    <n.icon className="size-4" aria-hidden="true" />
                    {n.label}
                  </button>
                );
              })}
            </nav>
          )}
          <div className="ml-auto flex items-center gap-2">
            {dayOffset > 0 && (
              <span className="rounded-full border border-dashed px-3 py-1 text-xs font-bold tabular-nums">テスト日付 {todayOf(dayOffset).slice(5)}</span>
            )}
            {ready && !playing && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="h-12 rounded-full" aria-label={`いまの ひと：${active?.nickname}。きりかえる`}>
                    <UserRound aria-hidden="true" />
                    <span className="max-w-28 truncate">{active?.nickname}</span>
                    {profiles.length > 1 && <ChevronDown aria-hidden="true" />}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>だれが やる？</DropdownMenuLabel>
                  {profiles.map((p) => (
                    <DropdownMenuItem key={p.id} onSelect={() => switchProfile(p.id)} className={cn("font-bold", p.id === active?.id && "bg-accent")}>
                      {p.nickname}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            {ready && !playing && screen !== "parent" && (
              <Button variant="ghost" className="h-12 rounded-full" onClick={() => setScreen("parent")}>
                <Lock aria-hidden="true" />
                <span className="hidden sm:inline">おうちの かたへ</span>
                <span className="sr-only sm:hidden">おうちの かたへ</span>
              </Button>
            )}
          </div>
        </div>
      </header>
      <main className="flex flex-1 flex-col">
        <Outlet />
      </main>
      <Toaster />
    </div>
  );
}

export default AppShell;
