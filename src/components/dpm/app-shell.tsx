import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  FolderKanban,
  Home,
  FileStack,
  GanttChart,
  CircleDollarSign,
  Mail,
  Settings,
  Search,
  Plus,
  Menu,
  DatabaseBackup,
} from "lucide-react";
import { Toaster } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useDpm } from "@/lib/dpm/store";
import { cn, formatDateTime } from "@/lib/utils";
import { NewProjectDialog } from "./new-project";
import { Skeleton } from "@/components/ui/skeleton";

export function AppShell({ children }: { children: React.ReactNode }) {
  const ready = useDpm((s) => s.ready);
  const init = useDpm((s) => s.init);
  useEffect(() => {
    void init();
  }, [init]);

  if (!ready) {
    return (
      <div className="flex min-h-screen bg-canvas text-fg">
        <aside className="hidden w-56 shrink-0 bg-sidebar md:block">
          <div className="flex items-center gap-2 border-b border-sidebar-border px-4 py-4">
            <div className="flex size-8 items-center justify-center rounded-md bg-steel text-xs font-semibold text-steel-fg">
              DPM
            </div>
            <div className="text-sm font-semibold text-sidebar-fg">Director of PM</div>
          </div>
        </aside>
        <div className="flex-1 p-8">
          <p className="mb-2 text-sm font-medium text-fg">Loading workspace…</p>
          <p className="mb-4 text-sm text-muted">Opening the local IndexedDB portfolio.</p>
          <Skeleton className="mb-4 h-6 w-48" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={250}>
      <div className="flex min-h-screen bg-canvas text-fg">
        <Sidebar className="hidden md:flex" />
        <div className="flex min-w-0 flex-1 flex-col overflow-x-hidden">
          <Banner />
          <TopBar />
          <main className="min-w-0 flex-1 overflow-x-auto p-4 md:p-6">{children}</main>
        </div>
      </div>
      <Toaster position="bottom-right" richColors />
    </TooltipProvider>
  );
}

function Banner() {
  return (
    <div className="border-b border-border bg-steel-soft px-4 py-1.5 text-center text-[11px] text-steel">
      Local workspace. Files stay in this browser unless you export a backup.
    </div>
  );
}

function navCls(active?: boolean) {
  return cn(
    "flex items-center gap-2 rounded-md px-2.5 py-2 text-sm text-sidebar-muted transition-colors hover:bg-sidebar-hover hover:text-sidebar-fg",
    active && "bg-sidebar-active text-sidebar-fg",
  );
}

function Sidebar({ className }: { className?: string }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const currentId = useDpm((s) => s.currentProjectId);
  const settings = useDpm((s) => s.settings);

  return (
    <aside className={cn("w-56 shrink-0 flex-col bg-sidebar text-sidebar-fg", className)}>
      <div className="flex items-center gap-2 border-b border-sidebar-border px-4 py-4">
        <div className="flex size-8 items-center justify-center rounded-md bg-steel text-xs font-semibold text-steel-fg">
          DPM
        </div>
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold tracking-tight">Director of PM</div>
          <div className="truncate text-[11px] text-sidebar-muted">{settings.organizationName}</div>
        </div>
      </div>
      <nav className="flex flex-1 flex-col gap-0.5 p-2">
        <Link to="/" className={navCls(pathname === "/")}>
          <FolderKanban className="size-4" /> Portfolio
        </Link>
        {currentId ? (
          <Link
            to="/projects/$projectId"
            params={{ projectId: currentId }}
            className={navCls(/\/projects\/[^/]+$/.test(pathname))}
          >
            <Home className="size-4" /> Project Home
          </Link>
        ) : (
          <Link to="/" className={navCls(false)}>
            <Home className="size-4" /> Project Home
          </Link>
        )}
        {currentId ? (
          <Link
            to="/projects/$projectId/documents"
            params={{ projectId: currentId }}
            className={navCls(pathname.includes("documents") || pathname === "/inbox")}
          >
            <FileStack className="size-4" /> Documents
          </Link>
        ) : (
          <Link to="/inbox" className={navCls(pathname === "/inbox")}>
            <FileStack className="size-4" /> Documents
          </Link>
        )}
        {currentId ? (
          <Link
            to="/projects/$projectId/schedule"
            params={{ projectId: currentId }}
            className={navCls(pathname.includes("schedule"))}
          >
            <GanttChart className="size-4" /> Schedule & Risk
          </Link>
        ) : (
          <Link to="/" className={navCls(false)}>
            <GanttChart className="size-4" /> Schedule & Risk
          </Link>
        )}
        {currentId ? (
          <Link
            to="/projects/$projectId/cost"
            params={{ projectId: currentId }}
            className={navCls(pathname.includes("/cost"))}
          >
            <CircleDollarSign className="size-4" /> Cost Control
          </Link>
        ) : (
          <Link to="/" className={navCls(false)}>
            <CircleDollarSign className="size-4" /> Cost Control
          </Link>
        )}
        {currentId ? (
          <Link
            to="/projects/$projectId/actions"
            params={{ projectId: currentId }}
            className={navCls(pathname.includes("actions"))}
          >
            <Mail className="size-4" /> Actions & Emails
          </Link>
        ) : (
          <Link to="/actions" className={navCls(pathname === "/actions")}>
            <Mail className="size-4" /> Actions & Emails
          </Link>
        )}
        <Link to="/settings" className={navCls(pathname === "/settings")}>
          <Settings className="size-4" /> Settings
        </Link>
      </nav>
      <div className="border-t border-sidebar-border p-3 text-[11px] text-sidebar-muted">
        Anyone with the publish link can open this app. Project files remain in their own browser unless exported.
      </div>
    </aside>
  );
}

function TopBar() {
  const [newOpen, setNewOpen] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [q, setQ] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const projects = useDpm((s) => s.projects);
  const currentId = useDpm((s) => s.currentProjectId);
  const setCurrent = useDpm((s) => s.setCurrentProject);
  const lastExport = useDpm((s) => s.settings.lastExportAt);
  const exportBackup = useDpm((s) => s.exportBackup);
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "/" && !(e.target instanceof HTMLInputElement) && !(e.target instanceof HTMLTextAreaElement)) {
        e.preventDefault();
        setSearchOpen(true);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function goProject(id: string) {
    setCurrent(id);
    if (pathname.includes("/documents") || pathname === "/inbox") {
      navigate({ to: "/projects/$projectId/documents", params: { projectId: id } });
    } else if (pathname.includes("/schedule")) {
      navigate({ to: "/projects/$projectId/schedule", params: { projectId: id } });
    } else if (pathname.includes("/cost")) {
      navigate({ to: "/projects/$projectId/cost", params: { projectId: id } });
    } else if (pathname.includes("/actions")) {
      navigate({ to: "/projects/$projectId/actions", params: { projectId: id } });
    } else {
      navigate({ to: "/projects/$projectId", params: { projectId: id } });
    }
  }

  return (
    <>
      <header className="flex flex-wrap items-center gap-2 border-b border-border bg-surface px-3 py-2 md:px-4">
        <Button size="icon" variant="ghost" className="md:hidden" onClick={() => setMobile(true)}>
          <Menu className="size-4" />
        </Button>
        <select
          className="h-9 max-w-40 min-w-0 flex-1 rounded-md border border-input bg-surface px-2 text-sm sm:max-w-56 sm:flex-none"
          value={currentId ?? ""}
          onChange={(e) => goProject(e.target.value)}
        >
          <option value="" disabled>
            Project
          </option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.code} — {p.name}
            </option>
          ))}
        </select>
        <div className="relative order-last min-w-0 flex-[1_1_100%] sm:order-none sm:flex-1">
          <Search className="pointer-events-none absolute top-2.5 left-2.5 size-4 text-subtle" />
          <Input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setSearchOpen(true);
            }}
            onFocus={() => setSearchOpen(true)}
            placeholder="Search projects, activities, documents (/ )"
            className="pl-8"
          />
          {searchOpen && q.trim() && (
            <SearchResults
              q={q}
              onClose={() => {
                setSearchOpen(false);
                setQ("");
              }}
            />
          )}
        </div>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button size="sm" variant="outline" onClick={() => void exportBackup()}>
              <DatabaseBackup className="size-4" />
              <span className="hidden lg:inline">{lastExport ? `Backup ${formatDateTime(lastExport)}` : "No backup yet"}</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>Export portfolio JSON backup</TooltipContent>
        </Tooltip>
        <Button size="sm" onClick={() => setNewOpen(true)}>
          <Plus className="size-4" />
          <span className="hidden sm:inline">New project</span>
        </Button>
      </header>
      <NewProjectDialog open={newOpen} onOpenChange={setNewOpen} />
      <Sheet open={mobile} onOpenChange={setMobile}>
        <SheetContent side="left" className="p-0">
          <Sidebar className="flex h-full w-full" />
        </SheetContent>
      </Sheet>
    </>
  );
}

function SearchResults({ q, onClose }: { q: string; onClose: () => void }) {
  const projects = useDpm((s) => s.projects);
  const documents = useDpm((s) => s.documents);
  const activities = useDpm((s) => s.activities);
  const setCurrent = useDpm((s) => s.setCurrentProject);
  const navigate = useNavigate();
  const needle = q.trim().toLowerCase();

  const hits = useMemo(() => {
    if (needle.length < 2) return [];
    const out: { kind: string; title: string; sub: string; go: () => void }[] = [];
    for (const p of projects) {
      if (`${p.code} ${p.name} ${p.pm} ${p.location}`.toLowerCase().includes(needle)) {
        out.push({
          kind: "Project",
          title: `${p.code} — ${p.name}`,
          sub: p.location,
          go: () => {
            setCurrent(p.id);
            navigate({ to: "/projects/$projectId", params: { projectId: p.id } });
          },
        });
      }
    }
    for (const d of documents) {
      if (`${d.filename} ${d.excerpt.slice(0, 400)}`.toLowerCase().includes(needle)) {
        out.push({
          kind: "Document",
          title: d.filename,
          sub: d.category,
          go: () => {
            if (d.projectId) {
              setCurrent(d.projectId);
              navigate({ to: "/projects/$projectId/documents", params: { projectId: d.projectId } });
            } else navigate({ to: "/inbox" });
          },
        });
      }
    }
    for (const a of activities.slice(0, 2000)) {
      if (`${a.activityId} ${a.name}`.toLowerCase().includes(needle)) {
        out.push({
          kind: "Activity",
          title: `${a.activityId} ${a.name}`,
          sub: a.status ?? "",
          go: () => {
            setCurrent(a.projectId);
            navigate({ to: "/projects/$projectId/schedule", params: { projectId: a.projectId } });
          },
        });
      }
      if (out.length > 24) break;
    }
    return out.slice(0, 16);
  }, [needle, projects, documents, activities, navigate, setCurrent]);

  return (
    <div className="absolute top-10 z-30 w-full overflow-hidden rounded-lg border border-border bg-surface shadow-border">
      {hits.length === 0 && <div className="px-3 py-2 text-sm text-muted">No matches</div>}
      {hits.map((h, i) => (
        <button
          key={`${h.kind}-${h.title}-${i}`}
          className="flex w-full items-start gap-2 px-3 py-2 text-left text-sm hover:bg-steel-soft"
          onMouseDown={(e) => {
            e.preventDefault();
            h.go();
            onClose();
          }}
        >
          <span className="w-16 shrink-0 text-[11px] text-muted">{h.kind}</span>
          <span className="min-w-0">
            <span className="block truncate font-medium">{h.title}</span>
            <span className="block truncate text-xs text-muted">{h.sub}</span>
          </span>
        </button>
      ))}
    </div>
  );
}
