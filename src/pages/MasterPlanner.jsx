import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/api";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Plus,
  Calendar,
  MapPin,
  ArrowRight,
  Copy,
  Check,
  ChevronsUpDown,
  Map,
  Trash2,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { format, isValid } from "date-fns";

/* ---------------- COMPONENT ---------------- */

export default function MasterPlanner() {
  const [statusFilter, setStatusFilter] = useState("all");
  const [isNewEventDialogOpen, setIsNewEventDialogOpen] = useState(false);
  const [selectedEventToClone, setSelectedEventToClone] = useState("");
  const [openCombobox, setOpenCombobox] = useState(false);
  const [eventToDelete, setEventToDelete] = useState(null);

  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: me } = useQuery({
    queryKey: ["me"],
    queryFn: () => apiFetch("/me"),
  });

  const { data: events = [], isLoading } = useQuery({
    queryKey: ["events"],
    queryFn: () => apiFetch("/events"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) =>
      apiFetch(`/events/${id}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
      toast.success("Event plan deleted successfully");
      setEventToDelete(null);
    },
    onError: () => {
      toast.error("Failed to delete event plan");
    },
  });

  const user = me?.user;
  const isAdmin = user?.role === "admin" || user?.role === "super_admin";

  const statusColors = {
    draft: "bg-slate-100 text-slate-700 border-slate-200",
    pending_review: "bg-amber-100 text-amber-800 border-amber-200",
    approved: "bg-green-100 text-green-800 border-green-200",
    changes_requested: "bg-orange-100 text-orange-800 border-orange-200",
    planning: "bg-blue-100 text-blue-800 border-blue-200",
    completed: "bg-purple-100 text-purple-800 border-purple-200",
    cancelled: "bg-red-100 text-red-800 border-red-200",
    finished: "bg-indigo-100 text-indigo-800 border-indigo-200",
  };

  const formatStatus = (status) =>
    status
      ?.split("_")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ") || "Draft";

  const filteredEvents =
    statusFilter === "all"
      ? events
      : events.filter((event) => event.status === statusFilter);

  return (
    <div className="min-h-screen p-4 md:p-8 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      <div className="max-w-7xl mx-auto space-y-8">

        {/* Header */}
        <div className="flex flex-col gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold flex items-center gap-3 text-[#2d4650] dark:text-slate-100">
              <Map className="w-8 h-8 sm:w-10 sm:h-10" />
              MasterPlanner
            </h1>
            <p className="text-slate-500 dark:text-slate-400">
              Plan your events step-by-step
            </p>
          </div>

          {/* New Event Dialog */}
          <Dialog open={isNewEventDialogOpen} onOpenChange={setIsNewEventDialogOpen}>
            <DialogTrigger asChild>
              <Button
                size="lg"
                className="bg-[#835879] text-white gap-2 w-full sm:w-auto"
              >
                <Plus className="w-5 h-5" />
                New Event Plan
              </Button>
            </DialogTrigger>

            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Create New Event Plan</DialogTitle>
                <DialogDescription>
                  Start from scratch or clone an existing plan.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <Button
                  variant="outline"
                  className="justify-start h-auto py-4"
                  onClick={() => navigate("/event-plan")}
                >
                  <Plus className="w-5 h-5 mr-3" />
                  Start from Scratch
                </Button>

                <div className="relative text-center text-xs text-slate-500">
                  <span className="bg-white px-2">OR</span>
                </div>

                <div className="space-y-3">
                  <Label>Select Event to Clone</Label>

                  <Popover open={openCombobox} onOpenChange={setOpenCombobox}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        className="w-full justify-between"
                      >
                        {selectedEventToClone
                          ? events.find((e) => e.id === selectedEventToClone)?.name
                          : "Select an event…"}
                        <ChevronsUpDown className="h-4 w-4 opacity-50" />
                      </Button>
                    </PopoverTrigger>

                    <PopoverContent className="w-full p-0">
                      <Command>
                        <CommandInput placeholder="Search events…" />
                        <CommandList>
                          <CommandEmpty>No events found.</CommandEmpty>
                          <CommandGroup>
                            {events.map((event) => (
                              <CommandItem
                                key={event.id}
                                value={event.name}
                                onSelect={() => {
                                  setSelectedEventToClone(event.id);
                                  setOpenCombobox(false);
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    selectedEventToClone === event.id
                                      ? "opacity-100"
                                      : "opacity-0"
                                  )}
                                />
                                {event.name}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>

                  <Button
                    className="w-full gap-2"
                    disabled={!selectedEventToClone}
                    onClick={() =>
                      navigate(`/event-plan?clone_from=${selectedEventToClone}`)
                    }
                  >
                    <Copy className="w-4 h-4" />
                    Clone Selected Plan
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">Filter</Badge>
          {[
            "all",
            "draft",
            "pending_review",
            "approved",
            "finished",
            "cancelled",
          ].map((status) => (
            <Button
              key={status}
              size="sm"
              variant={statusFilter === status ? "default" : "outline"}
              onClick={() => setStatusFilter(status)}
              className={statusFilter === status ? "bg-[#835879] text-white" : ""}
            >
              {status === "all"
                ? "All"
                : status
                    .split("_")
                    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                    .join(" ")}
            </Button>
          ))}
        </div>

        {/* Event Grid */}
        {isLoading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-64 bg-slate-100 animate-pulse rounded-xl" />
            ))}
          </div>
        ) : filteredEvents.length === 0 ? (
          <Card className="bg-white/80">
            <CardContent className="py-16 text-center">
              <Calendar className="w-10 h-10 mx-auto mb-4 text-slate-400" />
              <h3 className="text-xl font-semibold">No Event Plans Yet</h3>
              <Button className="mt-6 bg-[#835879]" asChild>
                <Link to="/event-plan">Create Your First Plan</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredEvents.map((event) => (
              <Link key={event.id} to={`/event-plan?id=${event.id}`}>
                <Card className="hover:shadow-xl transition-all bg-white/80 h-full flex flex-col">
                  <CardHeader>
                    <div className="flex justify-between mb-2">
                      <Badge
                        variant="outline"
                        className={statusColors[event.status] || statusColors.draft}
                      >
                        {formatStatus(event.status)}
                      </Badge>
                    </div>
                    <CardTitle>{event.name}</CardTitle>
                  </CardHeader>

                  <CardContent className="space-y-2 flex-1 text-sm text-slate-500">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      {isValid(new Date(event.start_date || event.starts_at))
                        ? format(new Date(event.start_date || event.starts_at), "MMM d, yyyy")
                        : "Date TBD"}
                    </div>
                    {event.location && (
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        {event.location}
                      </div>
                    )}
                  </CardContent>

                  <CardFooter className="flex justify-between">
                    <span className="text-[#835879] flex items-center">
                      View Plan
                      <ArrowRight className="w-4 h-4 ml-1" />
                    </span>
                    {isAdmin && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.preventDefault();
                          setEventToDelete(event);
                        }}
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </Button>
                    )}
                  </CardFooter>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Delete Dialog */}
      <Dialog open={!!eventToDelete} onOpenChange={() => setEventToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <AlertTriangle className="w-10 h-10 text-red-600 mx-auto mb-2" />
            <DialogTitle className="text-center">
              Delete Event Plan?
            </DialogTitle>
            <DialogDescription className="text-center">
              This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="justify-center gap-2">
            <Button variant="outline" onClick={() => setEventToDelete(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteMutation.mutate(eventToDelete.id)}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
