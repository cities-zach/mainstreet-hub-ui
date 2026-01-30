import React, { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { Bell } from "lucide-react";
import {
  API_BASE,
  buildAuthHeaders,
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead
} from "@/api";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export default function NotificationsBell() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const pollingRef = useRef(null);

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => getNotifications({ limit: 50 }),
    staleTime: 30000
  });

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read_at).length,
    [notifications]
  );

  const markReadMutation = useMutation({
    mutationFn: (id) => markNotificationRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    }
  });

  const markAllMutation = useMutation({
    mutationFn: () => markAllNotificationsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    }
  });

  const handleOpenNotification = async (notification) => {
    if (!notification?.read_at) {
      await markReadMutation.mutateAsync(notification.id);
    }
    setOpen(false);
    if (notification?.link) {
      navigate(notification.link);
    }
  };

  useEffect(() => {
    let active = true;
    let abortController;

    const startPollingFallback = () => {
      if (pollingRef.current) return;
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      pollingRef.current = setInterval(() => {
        queryClient.invalidateQueries({ queryKey: ["notifications"] });
      }, 60000);
    };

    const startStream = async () => {
      try {
        const headers = await buildAuthHeaders();
        abortController = new AbortController();
        const res = await fetch(`${API_BASE}/notifications/stream`, {
          headers,
          signal: abortController.signal
        });
        if (!res.ok || !res.body) {
          throw new Error("Notification stream failed");
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (active) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const parts = buffer.split("\n\n");
          buffer = parts.pop() || "";
          for (const part of parts) {
            if (!part.trim() || part.startsWith(":")) continue;
            const lines = part.split("\n");
            const eventLine = lines.find((line) => line.startsWith("event:"));
            const event = eventLine ? eventLine.replace("event:", "").trim() : "message";
            const dataLines = lines
              .filter((line) => line.startsWith("data:"))
              .map((line) => line.replace("data:", "").trim());
            const dataText = dataLines.join("\n");
            if (!dataText || event !== "notification") continue;
            try {
              const payload = JSON.parse(dataText);
              queryClient.setQueryData(["notifications"], (prev = []) => {
                if (prev.find((item) => item.id === payload.id)) return prev;
                return [payload, ...prev].slice(0, 50);
              });
            } catch {
              // Ignore malformed payloads.
            }
          }
        }

        if (active) {
          startPollingFallback();
        }
      } catch {
        if (active) {
          startPollingFallback();
        }
      }
    };

    startStream();

    return () => {
      active = false;
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
      if (abortController) {
        abortController.abort();
      }
    };
  }, [queryClient]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative text-slate-600"
          aria-label="Notifications"
        >
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[#835879] px-1 text-[11px] font-semibold text-white">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="border-b border-slate-200 px-3 py-2 flex items-center justify-between">
          <div className="text-sm font-semibold">Notifications</div>
          <Button
            variant="ghost"
            size="sm"
            className="text-xs"
            disabled={unreadCount === 0 || markAllMutation.isPending}
            onClick={() => markAllMutation.mutate()}
          >
            Mark all read
          </Button>
        </div>
        <div className="max-h-80 overflow-y-auto">
          {isLoading && (
            <div className="px-3 py-4 text-sm text-slate-500">Loading…</div>
          )}
          {!isLoading && notifications.length === 0 && (
            <div className="px-3 py-4 text-sm text-slate-500">No notifications yet.</div>
          )}
          {notifications.map((notification) => (
            <button
              type="button"
              key={notification.id}
              onClick={() => handleOpenNotification(notification)}
              className={cn(
                "w-full text-left px-3 py-3 border-b border-slate-100 hover:bg-slate-50",
                !notification.read_at && "bg-[#835879]/5"
              )}
            >
              <div className="text-sm font-medium text-slate-800">
                {notification.title}
              </div>
              {notification.body && (
                <div className="text-xs text-slate-500 mt-1">
                  {notification.body}
                </div>
              )}
              {notification.created_at && (
                <div className="text-[11px] text-slate-400 mt-2">
                  {formatDistanceToNow(new Date(notification.created_at), {
                    addSuffix: true
                  })}
                </div>
              )}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
