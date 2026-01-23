import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { apiFetch } from "@/api";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { uploadPublicFile } from "@/lib/uploads";
import { supabase } from "@/lib/supabaseClient";
import {
  Save,
  Upload,
  Music,
  PlayCircle,
  Moon,
  Sun,
  Trophy,
  Star,
  TrendingUp,
} from "lucide-react";

import UserManagementSection from "@/components/settings/UserManagementSection";

export default function Settings({ currentUser, isSuperAdmin }) {
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState(null);
  const [uploading, setUploading] = useState({ task: false, level: false });
  const [logoUploading, setLogoUploading] = useState(false);
  const [orgData, setOrgData] = useState({
    name: "",
    email: "",
    phone: "",
    website: "",
    address_line1: "",
    address_line2: "",
    city: "",
    state: "",
    postal_code: "",
    country: "",
    logo_url: "",
    primary_color: "",
    secondary_color: "",
    facebook_url: "",
    instagram_url: "",
    twitter_url: "",
    linkedin_url: ""
  });
  const [orgSaving, setOrgSaving] = useState(false);

  const [formData, setFormData] = useState({
    task_completion_sound_url: "",
    level_up_sound_url: "",
    subscription_expiration_date: "",
  });

  useEffect(() => {
    let mounted = true;

    const loadOrg = async () => {
      const org = await apiFetch("/organizations/me");
      if (!mounted || !org) return;
      setOrgData((prev) => ({
        ...prev,
        name: org.name || "",
        email: org.email || "",
        phone: org.phone || "",
        website: org.website || "",
        address_line1: org.address_line1 || "",
        address_line2: org.address_line2 || "",
        city: org.city || "",
        state: org.state || "",
        postal_code: org.postal_code || "",
        country: org.country || "",
        logo_url: org.logo_url || "",
        primary_color: org.primary_color || "",
        secondary_color: org.secondary_color || "",
        facebook_url: org.facebook_url || "",
        instagram_url: org.instagram_url || "",
        twitter_url: org.twitter_url || "",
        linkedin_url: org.linkedin_url || ""
      }));
    };

    const loadSettings = async () => {
      if (!isSuperAdmin) return;
      const data = await apiFetch("/system/settings");
      if (!mounted || !data) return;
      setSettings(data);
      setFormData({
        task_completion_sound_url: data.task_completion_sound_url || "",
        level_up_sound_url: data.level_up_sound_url || "",
        subscription_expiration_date: data.subscription_expiration_date || ""
      });
    };

    const loadAll = async () => {
      try {
        await Promise.all([loadOrg(), loadSettings()]);
      } catch (err) {
        console.error(err);
        toast.error("Failed to load settings");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadAll();
    return () => {
      mounted = false;
    };
  }, [isSuperAdmin]);

  /**
   * FILE UPLOAD
   */
  const handleFileUpload = async (file, type) => {
    if (!file || !file.type.startsWith("audio/")) {
      toast.error("Please upload a valid audio file");
      return;
    }

    setUploading((prev) => ({ ...prev, [type]: true }));

    try {
      const form = new FormData();
      form.append("file", file);

      const { url } = await apiFetch("/uploads/audio", {
        method: "POST",
        body: form
      });

      const field =
        type === "task"
          ? "task_completion_sound_url"
          : "level_up_sound_url";

      setFormData((prev) => ({ ...prev, [field]: url }));
      toast.success("Sound uploaded");
    } catch (err) {
      console.error(err);
      toast.error("Upload failed");
    } finally {
      setUploading((prev) => ({ ...prev, [type]: false }));
    }
  };

  /**
   * SAVE SETTINGS
   */
  const handleSave = async () => {
    try {
      await apiFetch("/system/settings", {
        method: settings ? "PUT" : "POST",
        body: JSON.stringify(formData)
      });

      toast.success("Settings saved");
    } catch (err) {
      console.error(err);
      toast.error("Failed to save settings");
    }
  };

  /**
   * DARK MODE
   */
  const toggleDarkMode = async (checked) => {
    try {
      await apiFetch("/users/me", {
        method: "PATCH",
        body: JSON.stringify({ dark_mode: checked })
      });
      document.documentElement.classList.toggle("dark", checked);
    } catch (err) {
      console.error(err);
      toast.error("Failed to update preference");
    }
  };

  const handleOrgSave = async () => {
    setOrgSaving(true);
    try {
      await apiFetch("/organizations/me", {
        method: "PATCH",
        body: JSON.stringify(orgData)
      });
      toast.success("Organization settings saved");
    } catch (err) {
      console.error(err);
      toast.error("Failed to save organization settings");
    } finally {
      setOrgSaving(false);
    }
  };

  const handleLogoUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      event.target.value = "";
      return;
    }

    setLogoUploading(true);
    try {
      const uploaded = await uploadPublicFile({
        pathPrefix: "org-logos",
        file,
      });

      setOrgData((prev) => ({ ...prev, logo_url: uploaded.file_url || "" }));
      toast.success("Logo uploaded");
    } catch (err) {
      console.error(err);
      toast.error("Logo upload failed");
    } finally {
      setLogoUploading(false);
      event.target.value = "";
    }
  };

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      window.location.reload();
    } catch (err) {
      console.error(err);
      toast.error("Failed to sign out");
    }
  };

  /**
   * SOUND PREVIEW
   */
  const playSound = (url) => {
    if (!url) return;
    new Audio(url).play().catch(() => {
      toast.error("Unable to play sound");
    });
  };

  /**
   * LEVEL CALCULATIONS (UNCHANGED)
   */
  const getTeamBuilderLevel = (hours) => {
    if (hours >= 500) return 5;
    if (hours >= 200) return 4;
    if (hours >= 40) return 3;
    if (hours >= 10) return 2;
    return 1;
  };

  const getTaskMasterLevel = (tasks) => {
    if (tasks >= 100) return 5;
    if (tasks >= 50) return 4;
    if (tasks >= 20) return 3;
    if (tasks >= 5) return 2;
    return 1;
  };

  const volunteerHours = currentUser?.volunteer_hours || 0;
  const completedTasks = currentUser?.completed_tasks || 0;

  const teamLevel = getTeamBuilderLevel(volunteerHours);
  const taskLevel = getTaskMasterLevel(completedTasks);

  if (loading)
    return <div className="p-8 text-center">Loading settings…</div>;

  return (
    <div className="min-h-screen p-4 md:p-8 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      <div className="max-w-5xl mx-auto space-y-8">

        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold">System Settings</h1>
            <p className="text-slate-500">
              Configure application preferences.
            </p>
          </div>
          <Button variant="outline" onClick={handleSignOut}>
            Sign Out
          </Button>
        </div>

        {/* Progress */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="text-[#ffc93e]" />
              Your Progress
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">

            <div>
              <Label>TeamBuilder Level {teamLevel}</Label>
              <Progress value={(volunteerHours / 500) * 100} />
              <p className="text-xs text-slate-500">
                {volunteerHours} volunteer hours
              </p>
            </div>

            <div>
              <Label>TaskMaster Level {taskLevel}</Label>
              <Progress value={(completedTasks / 100) * 100} />
              <p className="text-xs text-slate-500">
                {completedTasks} tasks completed
              </p>
            </div>

          </CardContent>
        </Card>

        {/* Appearance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {currentUser?.dark_mode ? (
                <Moon />
              ) : (
                <Sun />
              )}
              Appearance
            </CardTitle>
          </CardHeader>
          <CardContent className="flex justify-between items-center">
            <Label>Dark Mode</Label>
            <Switch
              checked={currentUser?.dark_mode || false}
              onCheckedChange={toggleDarkMode}
            />
          </CardContent>
        </Card>

        {/* Organization Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Organization Profile</CardTitle>
            <CardDescription>Update your organization details.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label>Name</Label>
                <Input
                  value={orgData.name}
                  onChange={(e) =>
                    setOrgData({ ...orgData, name: e.target.value })
                  }
                />
              </div>
              <div>
                <Label>Email</Label>
                <Input
                  value={orgData.email}
                  onChange={(e) =>
                    setOrgData({ ...orgData, email: e.target.value })
                  }
                />
              </div>
              <div>
                <Label>Phone</Label>
                <Input
                  value={orgData.phone}
                  onChange={(e) =>
                    setOrgData({ ...orgData, phone: e.target.value })
                  }
                />
              </div>
              <div>
                <Label>Website</Label>
                <Input
                  value={orgData.website}
                  onChange={(e) =>
                    setOrgData({ ...orgData, website: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label>Address Line 1</Label>
                <Input
                  value={orgData.address_line1}
                  onChange={(e) =>
                    setOrgData({
                      ...orgData,
                      address_line1: e.target.value
                    })
                  }
                />
              </div>
              <div>
                <Label>Address Line 2</Label>
                <Input
                  value={orgData.address_line2}
                  onChange={(e) =>
                    setOrgData({
                      ...orgData,
                      address_line2: e.target.value
                    })
                  }
                />
              </div>
              <div>
                <Label>City</Label>
                <Input
                  value={orgData.city}
                  onChange={(e) =>
                    setOrgData({ ...orgData, city: e.target.value })
                  }
                />
              </div>
              <div>
                <Label>State</Label>
                <Input
                  value={orgData.state}
                  onChange={(e) =>
                    setOrgData({ ...orgData, state: e.target.value })
                  }
                />
              </div>
              <div>
                <Label>Postal Code</Label>
                <Input
                  value={orgData.postal_code}
                  onChange={(e) =>
                    setOrgData({ ...orgData, postal_code: e.target.value })
                  }
                />
              </div>
              <div>
                <Label>Country</Label>
                <Input
                  value={orgData.country}
                  onChange={(e) =>
                    setOrgData({ ...orgData, country: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Logo Upload</Label>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  disabled={logoUploading}
                />
                {logoUploading && (
                  <p className="text-xs text-slate-500">Uploading...</p>
                )}
                {orgData.logo_url && (
                  <img
                    src={orgData.logo_url}
                    alt="Organization logo"
                    className="h-16 w-16 rounded-full object-cover border border-slate-200"
                  />
                )}
                <div>
                  <Label className="text-xs text-slate-500">Logo URL (optional)</Label>
                  <Input
                    value={orgData.logo_url}
                    onChange={(e) =>
                      setOrgData({ ...orgData, logo_url: e.target.value })
                    }
                  />
                </div>
              </div>
              <div>
                <Label>Primary Color</Label>
                <Input
                  value={orgData.primary_color}
                  onChange={(e) =>
                    setOrgData({ ...orgData, primary_color: e.target.value })
                  }
                />
              </div>
              <div>
                <Label>Secondary Color</Label>
                <Input
                  value={orgData.secondary_color}
                  onChange={(e) =>
                    setOrgData({ ...orgData, secondary_color: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label>Facebook URL</Label>
                <Input
                  value={orgData.facebook_url}
                  onChange={(e) =>
                    setOrgData({ ...orgData, facebook_url: e.target.value })
                  }
                />
              </div>
              <div>
                <Label>Instagram URL</Label>
                <Input
                  value={orgData.instagram_url}
                  onChange={(e) =>
                    setOrgData({ ...orgData, instagram_url: e.target.value })
                  }
                />
              </div>
              <div>
                <Label>Twitter/X URL</Label>
                <Input
                  value={orgData.twitter_url}
                  onChange={(e) =>
                    setOrgData({ ...orgData, twitter_url: e.target.value })
                  }
                />
              </div>
              <div>
                <Label>LinkedIn URL</Label>
                <Input
                  value={orgData.linkedin_url}
                  onChange={(e) =>
                    setOrgData({ ...orgData, linkedin_url: e.target.value })
                  }
                />
              </div>
            </div>

            <Button
              onClick={handleOrgSave}
              disabled={orgSaving}
              className="bg-[#835879] text-white"
            >
              <Save className="w-4 h-4 mr-2" />
              Save Organization
            </Button>
          </CardContent>
        </Card>

        {/* Super Admin Sections */}
        {isSuperAdmin && (
          <>
            <UserManagementSection />

            {/* Gamification Sounds */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Music />
                  Gamification Sounds
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">

                {[
                  {
                    label: "Task Completion Sound",
                    field: "task_completion_sound_url",
                    key: "task",
                  },
                  {
                    label: "Level Up Sound",
                    field: "level_up_sound_url",
                    key: "level",
                  },
                ].map((item) => (
                  <div key={item.key} className="space-y-2">
                    <Label>{item.label}</Label>
                    <div className="flex gap-2">
                      <Input
                        value={formData[item.field]}
                        readOnly
                      />
                      {formData[item.field] && (
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() =>
                            playSound(formData[item.field])
                          }
                        >
                          <PlayCircle />
                        </Button>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={uploading[item.key]}
                      className="relative overflow-hidden"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Upload
                      <input
                        type="file"
                        accept="audio/*"
                        className="absolute inset-0 opacity-0 cursor-pointer"
                        onChange={(e) =>
                          handleFileUpload(
                            e.target.files[0],
                            item.key
                          )
                        }
                      />
                    </Button>
                  </div>
                ))}

                <Button
                  onClick={handleSave}
                  className="bg-[#835879] text-white"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Save Settings
                </Button>
              </CardContent>
            </Card>

            {/* Subscription */}
            <Card>
              <CardHeader>
                <CardTitle>Subscription</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Label>Expiration Date</Label>
                <Input
                  type="date"
                  value={formData.subscription_expiration_date}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      subscription_expiration_date: e.target.value,
                    })
                  }
                />
                <Button
                  onClick={handleSave}
                  className="bg-[#835879] text-white"
                >
                  Save
                </Button>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
