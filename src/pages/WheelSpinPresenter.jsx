import React, { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { Shuffle } from "lucide-react";
import { apiFetch } from "@/api";
import { Button } from "@/components/ui/button";
import WheelCanvas from "@/components/wheelspin/WheelCanvas";

function isAdminUser(user) {
  const role = user?.role || user?.app_role;
  return role === "admin" || role === "super_admin";
}

export default function WheelSpinPresenter({ me }) {
  const { id } = useParams();
  const user = me?.user;
  const organization = me?.organization;
  const primaryColor = organization?.primary_color || "#835879";
  const isAdmin = isAdminUser(user);

  const [rotation, setRotation] = useState(0);
  const [winners, setWinners] = useState([]);
  const [excludeIds, setExcludeIds] = useState([]);
  const [isSpinning, setIsSpinning] = useState(false);

  const { data: wheelDetail } = useQuery({
    queryKey: ["wheelspin", id],
    queryFn: () => apiFetch(`/wheelspin/${id}`),
    enabled: Boolean(id) && isAdmin
  });

  const wheel = wheelDetail?.wheel;
  const entries = useMemo(
    () =>
      (wheelDetail?.entries || []).map((entry) => ({
        id: entry.id,
        label: entry.label,
        weight: Number(entry.weight) || 1
      })),
    [wheelDetail]
  );
  const winnersCount = Number(wheel?.winners_count) || 1;
  const removeWinnerOnSpin = wheel?.remove_winner_on_spin ?? true;

  useEffect(() => {
    setWinners([]);
    setExcludeIds([]);
  }, [id]);

  const spinWheel = useMutation({
    mutationFn: () =>
      apiFetch(`/wheelspin/${id}/spin`, {
        method: "POST",
        body: JSON.stringify({
          exclude_entry_ids: removeWinnerOnSpin ? excludeIds : []
        })
      })
  });

  const canSpin =
    Boolean(wheel) && !isSpinning && winners.length < winnersCount;

  const handleSpin = async () => {
    if (!canSpin) return;
    setIsSpinning(true);
    setRotation((prev) => prev + 360 * 6 + Math.random() * 360);
    try {
      const result = await spinWheel.mutateAsync();
      if (result?.winner) {
        setWinners((prev) => [...prev, result.winner]);
        if (removeWinnerOnSpin && result.winner.id) {
          setExcludeIds((prev) => [...prev, result.winner.id]);
        }
      }
    } finally {
      setTimeout(() => setIsSpinning(false), 6200);
    }
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
        This view is available to admins and super admins only.
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 text-white">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col items-center justify-center gap-8 px-6 py-10">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold tracking-tight">
            {wheel?.name || "WheelSpin"}
          </h1>
          <p className="text-slate-300">
            {winners.length}/{winnersCount} winners selected
          </p>
        </div>

        <WheelCanvas
          entries={entries}
          rotation={rotation}
          primaryColor={primaryColor}
          durationMs={6000}
          className="scale-105"
        />

        <div className="flex flex-col items-center gap-4">
          <Button
            size="lg"
            className="bg-white text-slate-900 hover:bg-slate-200"
            onClick={handleSpin}
            disabled={!canSpin}
          >
            <Shuffle className="mr-2 h-5 w-5" />
            {isSpinning ? "Spinning..." : "Start Spin"}
          </Button>
          {winners.length > 0 && (
            <div className="mt-2 grid gap-2 text-center">
              {winners.map((winner, idx) => (
                <div
                  key={`${winner.id || winner.label}-${idx}`}
                  className="rounded-full bg-white/10 px-4 py-2 text-lg font-semibold"
                >
                  {winner.label}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
