import React, { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { CheckSquare, Plus, Trophy, Star } from "lucide-react";
import TaskForm from "@/components/taskmaster/TaskForm";
import TaskItem from "@/components/taskmaster/TaskItem";
import {
  addDays,
  isAfter,
  parseISO
} from "date-fns";
import { apiFetch } from "@/api";

export default function TaskMaster() {
  const [user, setUser] = useState(null);
  const [isNewTaskDialogOpen, setIsNewTaskDialogOpen] = useState(false);
  const [filter, setFilter] = useState("active");
  const [allEventFilter, setAllEventFilter] = useState("all");
  const [allUserFilter, setAllUserFilter] = useState("all");
  const [showLevelUp, setShowLevelUp] = useState({ visible: false, level: 1 });
  const queryClient = useQueryClient();

  useEffect(() => {
    apiFetch("/me")
      .then(res => setUser(res.user))
      .catch(() => {});
  }, []);

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ["tasks"],
    queryFn: () => apiFetch("/tasks")
  });

  const { data: events = [] } = useQuery({
    queryKey: ["events"],
    queryFn: () => apiFetch("/events")
  });

  const { data: users = [] } = useQuery({
    queryKey: ["users"],
    queryFn: () => apiFetch("/users")
  });

  const { data: soundSettings } = useQuery({
    queryKey: ["sound_settings"],
    queryFn: () => apiFetch("/system/settings/sounds"),
    enabled: !!user,
  });

  if (isLoading || !user) {
    return <div className="p-8 text-center">Loading tasks...</div>;
  }

  const eventMap = new Map(events.map((event) => [event.id, event]));

  const isTaskVisible = (task) => {
    if (!task.is_private) return true;
    return task.assigned_to_id === user.id || task.assigned_by_id === user.id;
  };

  const filteredTasks = tasks.filter((task) => {
    if (!isTaskVisible(task)) return false;

    if (filter === "active") {
      return task.status !== "completed";
    }

    if (task.status !== "completed") return false;

    const completedDate = task.completed_date ? parseISO(task.completed_date) : null;
    const relatedEvent = task.event_id ? eventMap.get(task.event_id) : null;

    if (relatedEvent?.end_date) {
      if (isAfter(new Date(), parseISO(relatedEvent.end_date))) return false;
    }

    if (completedDate) {
      const expirationDate = addDays(completedDate, 30);
      if (isAfter(new Date(), expirationDate)) return false;
    }

    return true;
  });

  const getEventSortValue = (event) =>
    event?.starts_at || event?.start_date || event?.end_date || event?.ends_at || null;

  const sortTasks = (list) =>
    [...list].sort((a, b) => {
      const aDue = a.due_date ? parseISO(a.due_date) : null;
      const bDue = b.due_date ? parseISO(b.due_date) : null;

      if (aDue && bDue) return aDue - bDue;
      if (aDue) return -1;
      if (bDue) return 1;

      const aTitle = (a.title || "").toLowerCase();
      const bTitle = (b.title || "").toLowerCase();
      return aTitle.localeCompare(bTitle);
    });

  const buildEventGroups = (list) => {
    const buckets = new Map();
    list.forEach((task) => {
      const event = task.event_id ? eventMap.get(task.event_id) : null;
      const key = event?.id || "no-event";
      if (!buckets.has(key)) {
        buckets.set(key, { key, event, tasks: [] });
      }
      buckets.get(key).tasks.push(task);
    });

    const groups = Array.from(buckets.values()).map((group) => ({
      ...group,
      tasks: sortTasks(group.tasks),
    }));

    const eventGroups = groups.filter((group) => group.key !== "no-event");
    const noEventGroup = groups.find((group) => group.key === "no-event");

    eventGroups.sort((a, b) => {
      const aDate = getEventSortValue(a.event);
      const bDate = getEventSortValue(b.event);
      if (aDate && bDate) return new Date(aDate) - new Date(bDate);
      if (aDate) return -1;
      if (bDate) return 1;
      const aTitle = (a.event?.title || "").toLowerCase();
      const bTitle = (b.event?.title || "").toLowerCase();
      return aTitle.localeCompare(bTitle);
    });

    if (noEventGroup) {
      eventGroups.push(noEventGroup);
    }

    return eventGroups;
  };

  const myTasks = filteredTasks.filter((task) => task.assigned_to_id === user.id);
  const unassignedTasks = filteredTasks.filter((task) => !task.assigned_to_id);
  const allTasks = filteredTasks.filter((task) => {
    if (allEventFilter !== "all" && task.event_id !== allEventFilter) return false;
    if (allUserFilter === "unassigned") return !task.assigned_to_id;
    if (allUserFilter !== "all") return task.assigned_to_id === allUserFilter;
    return true;
  });

  const getUserLabel = (userData) => {
    if (!userData) return "Unknown user";
    const name = userData.full_name?.trim();
    if (name) return `${name} (${userData.email})`;
    return userData.email || "Unnamed user";
  };

  const handleSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ["tasks"] });
    setIsNewTaskDialogOpen(false);
  };

  const handleLevelUp = level => {
    setShowLevelUp({ visible: true, level });
  };

  const renderTaskSection = (title, taskList, controls) => {
    const groups = buildEventGroups(taskList);

    return (
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <h2 className="text-lg font-semibold text-slate-700 dark:text-slate-200">
            {title}
          </h2>
          {controls}
        </div>
        {groups.length === 0 ? (
          <div className="text-center py-8 bg-white/60 dark:bg-slate-900/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 text-slate-500">
            No tasks found.
          </div>
        ) : (
          <div className="space-y-6">
            {groups.map((group) => (
              <div key={group.key} className="space-y-3">
                <div className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                  {group.event?.title || "Non-event tasks"}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {group.tasks.map((task) => (
                    <TaskItem
                      key={task.id}
                      task={task}
                      currentUser={user}
                      taskCompletionSoundUrl={soundSettings?.task_completion_sound_url || ""}
                      onUpdate={() =>
                        queryClient.invalidateQueries({ queryKey: ["tasks"] })
                      }
                      onLevelUp={handleLevelUp}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const allTaskControls = (
    <div className="flex flex-col sm:flex-row gap-2">
      <select
        className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm"
        value={allEventFilter}
        onChange={(event) => setAllEventFilter(event.target.value)}
      >
        <option value="all">All events</option>
        {events.map((event) => (
          <option key={event.id} value={event.id}>
            {event.title}
          </option>
        ))}
      </select>
      <select
        className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm"
        value={allUserFilter}
        onChange={(event) => setAllUserFilter(event.target.value)}
      >
        <option value="all">All assignees</option>
        <option value="unassigned">Unassigned</option>
        {users.map((userOption) => (
          <option key={userOption.id} value={userOption.id}>
            {getUserLabel(userOption)}
          </option>
        ))}
      </select>
    </div>
  );

  return (
    <div className="min-h-screen p-4 md:p-8 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 transition-colors duration-300">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <h1 className="text-4xl font-bold mb-2 text-[#2d4650] dark:text-slate-100 flex items-center gap-3">
              <CheckSquare className="w-10 h-10" />
              TaskMaster
            </h1>
            <p className="text-slate-500 dark:text-slate-400">
              Track, assign and manage your events
            </p>
          </div>

          <Button
            onClick={() => setIsNewTaskDialogOpen(true)}
            className="bg-[#835879] hover:bg-[#6d4a64] text-white gap-2 shadow-lg"
          >
            <Plus className="w-5 h-5" /> New Task
          </Button>
        </div>

        <Tabs defaultValue="active" onValueChange={setFilter}>
          <TabsList className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm border border-slate-200 dark:border-slate-800">
            <TabsTrigger value="active" className="data-[state=active]:bg-[#835879] data-[state=active]:text-white">
              Active Tasks
            </TabsTrigger>
            <TabsTrigger value="completed" className="data-[state=active]:bg-[#835879] data-[state=active]:text-white">
              Completed Tasks
            </TabsTrigger>
          </TabsList>

          {["active", "completed"].map(tab => (
            <TabsContent key={tab} value={tab} className="mt-6">
              <div className="space-y-10">
                {renderTaskSection("My Tasks", myTasks)}
                {renderTaskSection("Unassigned Tasks", unassignedTasks)}
                {renderTaskSection("All Tasks", allTasks, allTaskControls)}
              </div>
            </TabsContent>
          ))}
        </Tabs>

        <Dialog open={isNewTaskDialogOpen} onOpenChange={setIsNewTaskDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Task</DialogTitle>
              <DialogDescription>
                Assign a task to a user or team member.
              </DialogDescription>
            </DialogHeader>
            <TaskForm
              onSuccess={handleSuccess}
              onCancel={() => setIsNewTaskDialogOpen(false)}
              currentUser={user}
            />
          </DialogContent>
        </Dialog>

        <Dialog
          open={showLevelUp.visible}
          onOpenChange={open =>
            !open && setShowLevelUp(prev => ({ ...prev, visible: false }))
          }
        >
          <DialogContent className="sm:max-w-md text-center">
            <DialogHeader>
              <div className="mx-auto w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mb-4 animate-bounce">
                <Trophy className="w-8 h-8 text-yellow-600" />
              </div>
              <DialogTitle className="text-2xl font-bold text-[#835879]">
                Congratulations!
              </DialogTitle>
              <DialogDescription className="text-lg pt-2">
                You've reached <span className="font-bold text-slate-900">Level {showLevelUp.level}</span>!
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-center gap-1 py-4">
              {[...Array(showLevelUp.level)].map((_, i) => (
                <Star
                  key={i}
                  className="w-6 h-6 text-yellow-400 fill-yellow-400"
                />
              ))}
            </div>
            <DialogFooter className="justify-center">
              <Button
                onClick={() => setShowLevelUp({ visible: false, level: 1 })}
                className="bg-[#835879] hover:bg-[#6d4a64] text-white min-w-[120px]"
              >
                Awesome!
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
