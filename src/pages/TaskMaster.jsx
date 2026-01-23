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
  isPast,
  differenceInHours,
  parseISO
} from "date-fns";
import { apiFetch } from "@/api";

export default function TaskMaster() {
  const [user, setUser] = useState(null);
  const [isNewTaskDialogOpen, setIsNewTaskDialogOpen] = useState(false);
  const [filter, setFilter] = useState("active");
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

  if (isLoading || !user) {
    return <div className="p-8 text-center">Loading tasks...</div>;
  }

  const isSuperAdmin = user.role === "super_admin";
  const isAdmin = user.role === "admin" || user.role === "super_admin";
  const canViewAll = isSuperAdmin || isAdmin;

  const visibleTasks = tasks
    .filter(task => {
      let hasPermission = false;

      if (canViewAll) {
        hasPermission = true;
      } else {
        const championEventIds = events
          .filter(e => e.event_champion_user_id === user.id)
          .map(e => e.id);

        if (task.event_id && championEventIds.includes(task.event_id)) {
          hasPermission = true;
        }
        if (task.assigned_to_id === user.id) {
          hasPermission = true;
        }
        if (task.assigned_by_id === user.id) {
          hasPermission = true;
        }
      }

      if (!hasPermission) return false;

      if (filter === "active") {
        return task.status !== "completed";
      }

      if (task.status !== "completed") return false;

      const completedDate = task.completed_date
        ? parseISO(task.completed_date)
        : null;
      const relatedEvent = task.event_id
        ? events.find(e => e.id === task.event_id)
        : null;

      if (relatedEvent?.end_date) {
        if (isAfter(new Date(), parseISO(relatedEvent.end_date))) return false;
      }

      if (completedDate) {
        const expirationDate = addDays(completedDate, 30);
        if (isAfter(new Date(), expirationDate)) return false;
      }

      return true;
    })
    .sort((a, b) => {
      if (filter !== "active") return 0;

      const getAlertLevel = task => {
        const dueDate = task.due_date ? parseISO(task.due_date) : null;
        if (!dueDate) return 2;

        const isOverdue = isPast(addDays(dueDate, 1));
        if (isOverdue) return 0;

        const hoursUntilDue = differenceInHours(dueDate, new Date());
        if (hoursUntilDue <= 48) return 1;

        return 2;
      };

      const levelA = getAlertLevel(a);
      const levelB = getAlertLevel(b);

      if (levelA !== levelB) return levelA - levelB;

      if (a.due_date && b.due_date) {
        return new Date(a.due_date) - new Date(b.due_date);
      }
      return 0;
    });

  const handleSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ["tasks"] });
    setIsNewTaskDialogOpen(false);
  };

  const handleLevelUp = level => {
    setShowLevelUp({ visible: true, level });
  };

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
              {visibleTasks.length === 0 ? (
                <div className="text-center py-12 bg-white/50 dark:bg-slate-900/50 rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
                  <CheckSquare className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                  <h3 className="text-lg font-medium text-slate-600 dark:text-slate-300">
                    No tasks found
                  </h3>
                  <p className="text-slate-400 dark:text-slate-500">
                    {tab === "active"
                      ? "You're all caught up!"
                      : "Completed tasks expire after 30 days."}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {visibleTasks.map(task => (
                    <TaskItem
                      key={task.id}
                      task={task}
                      currentUser={user}
                      onUpdate={() =>
                        queryClient.invalidateQueries({ queryKey: ["tasks"] })
                      }
                      onLevelUp={handleLevelUp}
                    />
                  ))}
                </div>
              )}
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
