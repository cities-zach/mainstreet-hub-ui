import React, { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Save, Shuffle } from "lucide-react";
import { apiFetch } from "@/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import WheelCanvas from "@/components/wheelspin/WheelCanvas";

const emptyEntry = { label: "", weight: 1 };

function isAdminUser(user) {
  const role = user?.role || user?.app_role;
  return role === "admin" || role === "super_admin";
}

export default function WheelSpin({ me }) {
  const queryClient = useQueryClient();
  const user = me?.user;
  const organization = me?.organization;
  const primaryColor = organization?.primary_color || "#835879";
  const isAdmin = isAdminUser(user);

  const [selectedWheelId, setSelectedWheelId] = useState("");
  const [name, setName] = useState("");
  const [entries, setEntries] = useState([{ ...emptyEntry }]);
  const [winnersCount, setWinnersCount] = useState(1);
  const [removeWinnerOnSpin, setRemoveWinnerOnSpin] = useState(true);
  const [rotation, setRotation] = useState(0);
  const [winners, setWinners] = useState([]);
  const [excludeIds, setExcludeIds] = useState([]);
  const [isSpinning, setIsSpinning] = useState(false);

  const { data: wheelList = [] } = useQuery({
    queryKey: ["wheelspin", "list"],
    queryFn: () => apiFetch("/wheelspin"),
    enabled: isAdmin
  });

  const { data: wheelDetail } = useQuery({
    queryKey: ["wheelspin", selectedWheelId],
    queryFn: () => apiFetch(`/wheelspin/${selectedWheelId}`),
    enabled: isAdmin && Boolean(selectedWheelId)
  });

  useEffect(() => {
    if (!wheelDetail?.wheel) return;
    const wheel = wheelDetail.wheel;
    setName(wheel.name || "");
    setWinnersCount(Number(wheel.winners_count) || 1);
    setRemoveWinnerOnSpin(!!wheel.remove_winner_on_spin);
    const normalized = (wheelDetail.entries || []).map((entry) => ({
      id: entry.id,
      label: entry.label,
      weight: Number(entry.weight) || 1
    }));
    setEntries(normalized.length ? normalized : [{ ...emptyEntry }]);
    setWinners([]);
    setExcludeIds([]);
  }, [wheelDetail]);

  const totalTickets = useMemo(
    () => entries.reduce((sum, entry) => sum + (Number(entry.weight) || 0), 0),
    [entries]
  );

  const createWheel = useMutation({
    mutationFn: () =>
      apiFetch("/wheelspin", {
        method: "POST",
        body: JSON.stringify({
          name,
          winners_count: winnersCount,
          remove_winner_on_spin: removeWinnerOnSpin,
          entries
        })
      }),
    onSuccess: (wheel) => {
      queryClient.invalidateQueries({ queryKey: ["wheelspin", "list"] });
      setSelectedWheelId(wheel.id);
    }
  });

  const updateWheel = useMutation({
    mutationFn: () =>
      apiFetch(`/wheelspin/${selectedWheelId}`, {
        method: "PATCH",
        body: JSON.stringify({
          name,
          winners_count: winnersCount,
          remove_winner_on_spin: removeWinnerOnSpin,
          entries
        })
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wheelspin", "list"] });
      queryClient.invalidateQueries({ queryKey: ["wheelspin", selectedWheelId] });
    }
  });

  const spinWheel = useMutation({
    mutationFn: () =>
      apiFetch(`/wheelspin/${selectedWheelId}/spin`, {
        method: "POST",
        body: JSON.stringify({
          exclude_entry_ids: removeWinnerOnSpin ? excludeIds : []
        })
      })
  });

  const canSpin = Boolean(selectedWheelId) && !isSpinning && winners.length < winnersCount;

  const resetRun = () => {
    setWinners([]);
    setExcludeIds([]);
  };

  const handleSpin = async () => {
    if (!canSpin) return;
    setIsSpinning(true);
    setRotation((prev) => prev + 360 * 4 + Math.random() * 360);
    try {
      const result = await spinWheel.mutateAsync();
      if (result?.winner) {
        setWinners((prev) => [...prev, result.winner]);
        if (removeWinnerOnSpin && result.winner.id) {
          setExcludeIds((prev) => [...prev, result.winner.id]);
        }
      }
    } finally {
      setTimeout(() => setIsSpinning(false), 1200);
    }
  };

  const addEntry = () => {
    setEntries((prev) => [...prev, { ...emptyEntry }]);
  };

  const updateEntry = (index, key, value) => {
    setEntries((prev) =>
      prev.map((entry, idx) =>
        idx === index ? { ...entry, [key]: value } : entry
      )
    );
  };

  const removeEntry = (index) => {
    setEntries((prev) => prev.filter((_, idx) => idx !== index));
  };

  const startNewWheel = () => {
    setSelectedWheelId("");
    setName("");
    setEntries([{ ...emptyEntry }]);
    setWinnersCount(1);
    setRemoveWinnerOnSpin(true);
    resetRun();
  };

  if (!isAdmin) {
    return (
      <div className="p-6">
        <Card className="max-w-xl">
          <CardHeader>
            <CardTitle>WheelSpin</CardTitle>
          </CardHeader>
          <CardContent>
            This module is available to admins and super admins only.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
            WheelSpin
          </h1>
          <p className="text-slate-500 dark:text-slate-400">
            Configure weighted entries, spin the wheel, and track winners.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <Card className="bg-white/80 dark:bg-slate-900/80">
            <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <CardTitle>Setup</CardTitle>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={startNewWheel}>
                  New Wheel
                </Button>
                <Button
                  onClick={() =>
                    selectedWheelId ? updateWheel.mutate() : createWheel.mutate()
                  }
                  disabled={createWheel.isPending || updateWheel.isPending}
                >
                  <Save className="w-4 h-4 mr-2" />
                  {selectedWheelId ? "Save Changes" : "Create Wheel"}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Wheel</Label>
                  <Select
                    value={selectedWheelId || ""}
                    onValueChange={(val) => setSelectedWheelId(val)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a saved wheel" />
                    </SelectTrigger>
                    <SelectContent>
                      {wheelList.map((wheel) => (
                        <SelectItem key={wheel.id} value={wheel.id}>
                          {wheel.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Wheel name</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Number of winners</Label>
                  <Input
                    type="number"
                    min={1}
                    value={winnersCount}
                    onChange={(e) => setWinnersCount(Number(e.target.value))}
                  />
                </div>
                <div className="flex items-center justify-between rounded-lg border border-slate-200 px-4 py-3 dark:border-slate-800">
                  <div>
                    <div className="font-medium">Remove winner after spin</div>
                    <div className="text-xs text-slate-500">
                      Winners won’t appear again in this run.
                    </div>
                  </div>
                  <Switch
                    checked={removeWinnerOnSpin}
                    onCheckedChange={setRemoveWinnerOnSpin}
                  />
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Wheel entries</Label>
                  <Button variant="outline" size="sm" onClick={addEntry}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add entry
                  </Button>
                </div>
                <div className="space-y-3">
                  {entries.map((entry, index) => (
                    <div
                      key={`entry-${index}`}
                      className="grid gap-3 md:grid-cols-[1fr_120px_120px]"
                    >
                      <Input
                        placeholder="Label"
                        value={entry.label}
                        onChange={(e) => updateEntry(index, "label", e.target.value)}
                      />
                      <Input
                        type="number"
                        min={1}
                        value={entry.weight}
                        onChange={(e) =>
                          updateEntry(index, "weight", Number(e.target.value))
                        }
                      />
                      <Button
                        variant="outline"
                        onClick={() => removeEntry(index)}
                        disabled={entries.length <= 1}
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
                <div className="text-xs text-slate-500">
                  Total tickets: {totalTickets}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/80 dark:bg-slate-900/80">
            <CardHeader className="flex flex-col gap-2">
              <CardTitle>Spin</CardTitle>
              <p className="text-sm text-slate-500">
                {winners.length}/{winnersCount} winners selected
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              <WheelCanvas
                entries={entries}
                rotation={rotation}
                primaryColor={primaryColor}
                className="mx-auto"
              />
              <div className="flex flex-col gap-2">
                <Button onClick={handleSpin} disabled={!canSpin}>
                  <Shuffle className="w-4 h-4 mr-2" />
                  {isSpinning ? "Spinning..." : "Start Spin"}
                </Button>
                <Button variant="outline" onClick={resetRun} disabled={winners.length === 0}>
                  Reset Run
                </Button>
              </div>

              {winners.length > 0 && (
                <div className="space-y-3">
                  <div className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                    Winners
                  </div>
                  <div className="space-y-2">
                    {winners.map((winner, idx) => (
                      <div
                        key={`${winner.id || winner.label}-${idx}`}
                        className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-950"
                      >
                        <span>{winner.label}</span>
                        <span className="text-xs text-slate-500">Spin {idx + 1}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
