import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { apiFetch } from "@/api";

export default function CreateOpportunityDialog({ open, onOpenChange }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    title: "",
    date: "",
    schedule: "",
    location: "",
    hours: 1,
    count_needed: 1,
    instructions: "",
    special_skills: "",
    training_required: false
  });

  const createMutation = useMutation({
    mutationFn: (data) =>
      apiFetch("/volunteer/jobs", {
        method: "POST",
        body: JSON.stringify({
          ...data,
          event_name: "General Opportunities",
          status: "open",
          count_filled: 0
        })
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["volunteer_jobs"] });
      toast.success("Volunteer opportunity created!");
      onOpenChange(false);
      setFormData({
        title: "",
        date: "",
        schedule: "",
        location: "",
        hours: 1,
        count_needed: 1,
        instructions: "",
        special_skills: "",
        training_required: false
      });
    },
    onError: () => toast.error("Failed to create opportunity")
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.title || !formData.date || !formData.count_needed) {
      toast.error("Please fill in required fields");
      return;
    }
    createMutation.mutate(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create Volunteer Opportunity</DialogTitle>
          <DialogDescription>
            Add a new volunteer task not associated with a specific event plan.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="grid gap-2">
            <Label htmlFor="title">Task Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., Office Admin Support"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="date">Date *</Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="schedule">Time/Schedule</Label>
              <Input
                id="schedule"
                value={formData.schedule}
                onChange={(e) => setFormData({ ...formData, schedule: e.target.value })}
                placeholder="e.g., 9 AM - 12 PM"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="e.g., Main Office"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="count">Volunteers Needed *</Label>
              <Input
                id="count"
                type="number"
                min="1"
                value={formData.count_needed}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    count_needed: parseInt(e.target.value || "1", 10)
                  })
                }
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="hours">Hours</Label>
              <Input
                id="hours"
                type="number"
                min="0"
                step="0.25"
                value={formData.hours}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    hours: Number(e.target.value || 0)
                  })
                }
              />
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="instructions">Instructions</Label>
            <Textarea
              id="instructions"
              value={formData.instructions}
              onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
              placeholder="What should the volunteer know?"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="skills">Special Skills (Optional)</Label>
            <Input
              id="skills"
              value={formData.special_skills}
              onChange={(e) => setFormData({ ...formData, special_skills: e.target.value })}
              placeholder="e.g., Heavy lifting, Computer skills"
            />
          </div>
          <div className="flex items-center gap-2">
            <Switch
              id="training"
              checked={formData.training_required}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, training_required: checked })
              }
            />
            <Label htmlFor="training">Training Required?</Label>
          </div>
          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" className="bg-[#835879] hover:bg-[#6d4a64] text-white">
              Create Opportunity
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
