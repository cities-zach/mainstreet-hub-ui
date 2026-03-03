import React, { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import {
  createPassportInstance,
  getPassportInstance,
  getPublicPassport,
  getPublicSystemSettings,
  getPassportLeaderboard,
  savePassportTeam,
  stampPassportInstance,
  submitPassportScores,
  updatePassportInstance
} from "@/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import PassportMap from "@/components/passport/PassportMap";
import PassportQrScanner from "@/components/passport/PassportQrScanner";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";
import { useRef } from "react";

export default function PassportPublic() {
  const { slug } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const qrToken = searchParams.get("qr");
  const bonusToken = searchParams.get("bonus");
  const tokenKey = slug ? `passport_token_${slug}` : "passport_token";

  const [passport, setPassport] = useState(null);
  const [stops, setStops] = useState([]);
  const [instance, setInstance] = useState(null);
  const [stamps, setStamps] = useState([]);
  const [entryCount, setEntryCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("stops");
  const [scannerStatus, setScannerStatus] = useState(null);
  const [scannerMessage, setScannerMessage] = useState("");
  const [selectedStop, setSelectedStop] = useState(null);
  const [contactForm, setContactForm] = useState({
    contact_name: "",
    contact_email: "",
    contact_phone: ""
  });
  const [contactSaved, setContactSaved] = useState(false);
  const [team, setTeam] = useState(null);
  const [players, setPlayers] = useState([]);
  const [scores, setScores] = useState([]);
  const [leaderboard, setLeaderboard] = useState(null);
  const [teamForm, setTeamForm] = useState({ team_name: "", players: [] });
  const [teamSaving, setTeamSaving] = useState(false);
  const [scoreInputs, setScoreInputs] = useState({});
  const [soundSettings, setSoundSettings] = useState({
    task_completion_sound_url: "",
    level_up_sound_url: ""
  });
  const completedOnceRef = useRef(false);

  const visitedStopIds = useMemo(
    () => new Set(stamps.map((stamp) => stamp.stop_id)),
    [stamps]
  );
  const scoringEnabled = Boolean(passport?.allow_scores);
  const maxPlayers = Number(passport?.scoring_max_players) || 1;
  const needsTeamSetup = scoringEnabled && (!team || players.length === 0);

  const scoreMap = useMemo(() => {
    const map = new Map();
    for (const score of scores) {
      map.set(`${score.stop_id}:${score.player_id}`, score.score_value);
    }
    return map;
  }, [scores]);

  useEffect(() => {
    let isMounted = true;
    const loadPassport = async () => {
      if (!slug) return;
      setLoading(true);
      setError(null);
      try {
        const passportData = await getPublicPassport(slug);
        if (!isMounted) return;
        setPassport(passportData.passport);
        setStops(passportData.stops || []);

        getPublicSystemSettings()
          .then((settings) => {
            if (!isMounted || !settings) return;
            setSoundSettings({
              task_completion_sound_url: settings.task_completion_sound_url || "",
              level_up_sound_url: settings.level_up_sound_url || ""
            });
          })
          .catch(() => {});

        const existingToken =
          typeof window !== "undefined" ? localStorage.getItem(tokenKey) : null;
        const instanceRes = await createPassportInstance(slug, {
          token: existingToken || undefined
        });
        if (!isMounted) return;
        const nextToken = instanceRes.instance?.token;
        if (nextToken && typeof window !== "undefined") {
          localStorage.setItem(tokenKey, nextToken);
        }

        const detail = await getPassportInstance(nextToken);
        if (!isMounted) return;
        setInstance(detail.instance);
        setStops(detail.stops || passportData.stops || []);
        setStamps(detail.stamps || []);
        setEntryCount(detail.entry_count || 0);
        setTeam(detail.team || null);
        setPlayers(detail.players || []);
        setScores(detail.scores || []);
        if (detail.instance) {
          setContactForm({
            contact_name: detail.instance.contact_name || "",
            contact_email: detail.instance.contact_email || "",
            contact_phone: detail.instance.contact_phone || ""
          });
          const hasContact =
            detail.instance.contact_name ||
            detail.instance.contact_email ||
            detail.instance.contact_phone;
          setContactSaved(Boolean(hasContact));
        }
        if (detail.team) {
          setTeamForm({
            team_name: detail.team.team_name || "",
            players: (detail.players || []).map((player) => player.player_name || "")
          });
        }
        if (!selectedStop && (detail.stops || []).length > 0) {
          setSelectedStop(detail.stops[0]);
        }
      } catch (err) {
        if (!isMounted) return;
        setError(err.message);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    loadPassport();
    return () => {
      isMounted = false;
    };
  }, [slug]);

  useEffect(() => {
    const stampIfNeeded = async () => {
      if ((!qrToken && !bonusToken) || !instance?.token) return;
      try {
        await stampPassportInstance(instance.token, {
          ...(bonusToken ? { bonus_qr_token: bonusToken } : { qr_token: qrToken })
        });
        const detail = await getPassportInstance(instance.token);
        setStamps(detail.stamps || []);
        setEntryCount(detail.entry_count || 0);
        setStops(detail.stops || []);
        toast.success("Stamp recorded!");
        setActiveTab("stops");
        setSearchParams((prev) => {
          const next = new URLSearchParams(prev);
          next.delete("qr");
          next.delete("bonus");
          return next;
        });
      } catch (err) {
        const raw = err.message || "Unable to record stamp.";
        const message = raw.includes("HTTP 404")
          ? "Stamping is temporarily unavailable. Please try again in a moment."
          : raw;
        setScannerStatus("error");
        setScannerMessage(message);
        setActiveTab("scanner");
        setSearchParams((prev) => {
          const next = new URLSearchParams(prev);
          next.delete("qr");
          next.delete("bonus");
          return next;
        });
      }
    };
    stampIfNeeded();
  }, [qrToken, bonusToken, instance?.token]);

  useEffect(() => {
    if (!scoringEnabled) return;
    setTeamForm((prev) => {
      const existing = Array.isArray(prev.players) ? prev.players : [];
      const padded = Array.from({ length: maxPlayers }, (_, idx) => existing[idx] || "");
      return { ...prev, players: padded };
    });
  }, [scoringEnabled, maxPlayers]);

  const parseScanToken = (decodedText) => {
    if (!decodedText) return { token: "", isBonus: false };
    try {
      const url = new URL(decodedText);
      let token = "";
      let isBonus = false;
      for (const [key, value] of url.searchParams.entries()) {
        const lowerKey = key.toLowerCase();
        if (lowerKey === "qr") {
          token = value;
          break;
        }
        if (lowerKey === "bonus") {
          token = value;
          isBonus = true;
          break;
        }
      }
      return { token: token || decodedText, isBonus };
    } catch {
      const match = decodedText.match(/[?&](qr|bonus)=([^&]+)/i);
      if (match) {
        const isBonus = match[1].toLowerCase() === "bonus";
        return { token: decodeURIComponent(match[2]), isBonus };
      }
      return { token: decodedText, isBonus: false };
    }
  };

  const handleScanResult = async (decodedText) => {
    if (!instance?.token) return;
    try {
      setScannerStatus("working");
      setScannerMessage("Checking in…");
      const { token: tokenValue, isBonus } = parseScanToken(decodedText);
      await stampPassportInstance(instance.token, {
        ...(isBonus ? { bonus_qr_token: tokenValue } : { qr_token: tokenValue })
      });
      const detail = await getPassportInstance(instance.token);
      setStamps(detail.stamps || []);
      setEntryCount(detail.entry_count || 0);
      setStops(detail.stops || []);
      setScannerStatus("success");
      setScannerMessage(isBonus ? "Bonus entry added!" : "Stamp recorded! Nice work.");
      toast.success("Stamp recorded!");
      if (soundSettings.task_completion_sound_url && !isBonus) {
        new Audio(soundSettings.task_completion_sound_url).play().catch(() => {});
      }
      setActiveTab("stops");
    } catch (err) {
      const raw = err.message || "Unable to record stamp.";
      let message = raw;
      if (raw.toLowerCase().includes("already stamped")) {
        message = "You already checked in at this stop.";
      } else if (raw.toLowerCase().includes("stop not found")) {
        message = "That QR code doesn't match this passport.";
      } else if (raw.toLowerCase().includes("bonus entries")) {
        message = "Bonus entries are not enabled for this passport.";
      } else if (raw.includes("HTTP 404")) {
        message = "Stamping is temporarily unavailable. Please try again in a moment.";
      }
      setScannerStatus("error");
      setScannerMessage(message);
    }
  };

  const handleContactSave = async () => {
    if (!instance?.token) return;
    const hasContact =
      contactForm.contact_name || contactForm.contact_email || contactForm.contact_phone;
    if (!hasContact) {
      toast.error("Please enter at least one contact detail.");
      return;
    }
    try {
      const res = await updatePassportInstance(instance.token, contactForm);
      setInstance(res.instance);
      setContactSaved(true);
      toast.success("Contact info saved.");
      setActiveTab("stops");
    } catch (err) {
      toast.error(err.message || "Unable to save contact info.");
    }
  };

  const canSetupTeam =
    scoringEnabled && (!passport?.require_contact || contactSaved);

  const handleTeamSave = async () => {
    if (!instance?.token || !canSetupTeam) return;
    const teamName = (teamForm.team_name || "").trim();
    const playerNames = (teamForm.players || []).map((name) => name.trim()).filter(Boolean);
    if (!teamName) {
      toast.error("Team name is required.");
      return;
    }
    if (playerNames.length === 0) {
      toast.error("Please add at least one player.");
      return;
    }
    try {
      setTeamSaving(true);
      const res = await savePassportTeam(instance.token, {
        team_name: teamName,
        players: playerNames
      });
      setTeam(res.team || null);
      setPlayers(res.players || []);
      setTeamForm({
        team_name: res.team?.team_name || teamName,
        players: (res.players || []).map((player) => player.player_name || "")
      });
      toast.success("Team saved.");
      setActiveTab("stops");
    } catch (err) {
      toast.error(err.message || "Unable to save team.");
    } finally {
      setTeamSaving(false);
    }
  };

  const handleScoreSave = async (stopId) => {
    if (!instance?.token) return;
    try {
      const scoresPayload = (players || [])
        .map((player) => {
          const value =
            scoreInputs?.[stopId]?.[player.id] ?? scoreMap.get(`${stopId}:${player.id}`);
          if (value === "" || value === null || value === undefined) return null;
          const numberValue = Number(value);
          if (!Number.isFinite(numberValue)) return null;
          return { player_id: player.id, score_value: numberValue };
        })
        .filter(Boolean);
      if (scoresPayload.length === 0) {
        toast.error("Enter at least one score.");
        return;
      }
      await submitPassportScores(instance.token, {
        stop_id: stopId,
        scores: scoresPayload
      });
      const detail = await getPassportInstance(instance.token);
      setScores(detail.scores || []);
      toast.success("Scores saved.");
    } catch (err) {
      toast.error(err.message || "Unable to save scores.");
    }
  };

  useEffect(() => {
    if (activeTab !== "leaderboard" || !instance?.token || !scoringEnabled) return;
    getPassportLeaderboard(instance.token)
      .then((data) => setLeaderboard(data))
      .catch(() => setLeaderboard(null));
  }, [activeTab, instance?.token, scoringEnabled]);

  const completedCount = visitedStopIds.size;
  const totalStops = stops.length;
  const requireContact = passport?.require_contact;
  const requiredStops =
    passport?.required_stops_count == null ? totalStops : passport.required_stops_count;
  const progressValue =
    requiredStops > 0 ? Math.min(100, Math.round((completedCount / requiredStops) * 100)) : 0;
  const isComplete = Boolean(passport) && requiredStops > 0 && completedCount >= requiredStops;

  useEffect(() => {
    if (!passport) return;
    if (isComplete && !completedOnceRef.current) {
      completedOnceRef.current = true;
      if (soundSettings.level_up_sound_url) {
        new Audio(soundSettings.level_up_sound_url).play().catch(() => {});
      }
    }
  }, [isComplete, passport, soundSettings.level_up_sound_url]);

  if (loading) {
    return <div className="p-6 text-sm text-slate-500">Loading passport…</div>;
  }
  if (error) {
    return <div className="p-6 text-sm text-red-500">{error}</div>;
  }
  if (!passport) {
    return <div className="p-6 text-sm text-slate-500">Passport not found.</div>;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>{passport.title}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {passport.banner_url && (
              <img
                src={passport.banner_url}
                alt={`${passport.title} banner`}
                className="w-full h-40 rounded-xl object-cover border"
              />
            )}
            <div className="text-sm text-slate-600">
              Progress: {completedCount}/{requiredStops || totalStops} stops completed
            </div>
            <Progress value={progressValue} />
            <div className="text-sm text-slate-600">
              Prize entries earned: {entryCount}
            </div>
          </CardContent>
        </Card>

        {requireContact && !contactSaved && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Your contact info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Input
                placeholder="Name"
                value={contactForm.contact_name}
                onChange={(event) =>
                  setContactForm({ ...contactForm, contact_name: event.target.value })
                }
              />
              <Input
                placeholder="Email"
                value={contactForm.contact_email}
                onChange={(event) =>
                  setContactForm({ ...contactForm, contact_email: event.target.value })
                }
              />
              <Input
                placeholder="Phone"
                value={contactForm.contact_phone}
                onChange={(event) =>
                  setContactForm({ ...contactForm, contact_phone: event.target.value })
                }
              />
              <Button onClick={handleContactSave}>Save contact info</Button>
            </CardContent>
          </Card>
        )}

        {scoringEnabled && (!requireContact || contactSaved) && needsTeamSetup && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Team setup</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input
                placeholder="Team name"
                value={teamForm.team_name}
                onChange={(event) =>
                  setTeamForm({ ...teamForm, team_name: event.target.value })
                }
              />
              <div className="space-y-2">
                {Array.from({ length: maxPlayers }).map((_, idx) => (
                  <Input
                    key={`player-${idx}`}
                    placeholder={`Player ${idx + 1} name`}
                    value={teamForm.players?.[idx] || ""}
                    onChange={(event) => {
                      const nextPlayers = [...(teamForm.players || [])];
                      nextPlayers[idx] = event.target.value;
                      setTeamForm({ ...teamForm, players: nextPlayers });
                    }}
                  />
                ))}
                <div className="text-xs text-slate-500">
                  You can leave extra player slots blank.
                </div>
              </div>
              <Button onClick={handleTeamSave} disabled={teamSaving}>
                {teamSaving ? "Saving..." : "Save team"}
              </Button>
            </CardContent>
          </Card>
        )}

        {(!requireContact || contactSaved) && !needsTeamSetup && (
          <div className="flex flex-wrap gap-2">
            <Button
              variant={activeTab === "stops" ? "default" : "outline"}
              onClick={() => setActiveTab("stops")}
            >
              Stops
            </Button>
            <Button
              variant={activeTab === "map" ? "default" : "outline"}
              onClick={() => setActiveTab("map")}
            >
              Map
            </Button>
            <Button
              variant={activeTab === "scanner" ? "default" : "outline"}
              onClick={() => setActiveTab("scanner")}
            >
              Scanner
            </Button>
            {scoringEnabled && (
              <Button
                variant={activeTab === "leaderboard" ? "default" : "outline"}
                onClick={() => setActiveTab("leaderboard")}
              >
                Leaderboard
              </Button>
            )}
          </div>
        )}

        {(!requireContact || contactSaved) && !needsTeamSetup && activeTab === "stops" && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Stops</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {stops.map((stop) => {
                const visited = visitedStopIds.has(stop.id);
                const isSelected = selectedStop?.id === stop.id;
                return (
                  <div key={stop.id} className="space-y-2">
                    <button
                      type="button"
                      onClick={() => setSelectedStop(stop)}
                      className={`w-full rounded-xl border p-3 text-left ${
                        visited ? "border-[#2d4650] bg-[#2d4650]/5" : "border-slate-200"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {stop.logo_url ? (
                          <img
                            src={stop.logo_url}
                            alt={stop.name}
                            className="h-10 w-10 rounded-full object-cover border"
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-[#835879]/10 flex items-center justify-center text-[#835879] font-semibold">
                            {stop.name.slice(0, 1).toUpperCase()}
                          </div>
                        )}
                        <div className="flex-1">
                          <div className="font-medium">{stop.name}</div>
                          <div className="text-xs text-slate-500">
                            {stop.address_text || "No address"}
                          </div>
                        </div>
                        <div className="text-xs font-semibold">
                          {visited ? "Completed" : "Not yet"}
                        </div>
                      </div>
                    </button>
                    {isSelected && (
                      <div className="rounded-xl border border-slate-200 p-3 space-y-2">
                        <div className="text-sm font-semibold">Stop details</div>
                        {stop.logo_url && (
                          <img
                            src={stop.logo_url}
                            alt={stop.name}
                            className="h-20 w-20 rounded-full object-cover border"
                          />
                        )}
                        <div className="font-medium">{stop.name}</div>
                        <div className="text-xs text-slate-500">
                          {stop.address_text || "No address"}
                        </div>
                        {stop.special_text && (
                          <div className="text-xs text-slate-600">
                            {stop.special_text}
                          </div>
                        )}
                        {scoringEnabled && team && (
                          <div className="space-y-2 pt-2">
                            <div className="text-sm font-semibold">Scores</div>
                            {(players || []).map((player) => {
                              const currentValue =
                                scoreInputs?.[stop.id]?.[player.id] ??
                                scoreMap.get(`${stop.id}:${player.id}`) ??
                                "";
                              return (
                                <Input
                                  key={player.id}
                                  type="number"
                                  step="1"
                                  placeholder={`${player.player_name} score`}
                                  value={currentValue}
                                  onChange={(event) => {
                                    const nextValue = event.target.value;
                                    setScoreInputs((prev) => ({
                                      ...prev,
                                      [stop.id]: {
                                        ...(prev[stop.id] || {}),
                                        [player.id]: nextValue
                                      }
                                    }));
                                  }}
                                />
                              );
                            })}
                            <Button onClick={() => handleScoreSave(stop.id)}>
                              Save scores
                            </Button>
                          </div>
                        )}
                        <Button onClick={() => setActiveTab("scanner")}>
                          Go to scanner
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
              {stops.length === 0 && (
                <div className="text-sm text-slate-500">No stops available.</div>
              )}
            </CardContent>
          </Card>
        )}

        {(!requireContact || contactSaved) && !needsTeamSetup && activeTab === "map" && (
          <div className="space-y-3">
            <PassportMap
              stops={stops}
              stamps={stamps}
              mapConfig={passport.map_config}
              onSelectStop={(stop) => {
                setSelectedStop(stop);
              }}
            />
            {selectedStop && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Selected stop</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="font-medium">{selectedStop.name}</div>
                  <div className="text-xs text-slate-500">
                    {selectedStop.address_text || "No address"}
                  </div>
                  {selectedStop.special_text && (
                    <div className="text-xs text-slate-600">
                      {selectedStop.special_text}
                    </div>
                  )}
                  {scoringEnabled && team && (
                    <div className="space-y-2 pt-2">
                      <div className="text-sm font-semibold">Scores</div>
                      {(players || []).map((player) => {
                        const currentValue =
                          scoreInputs?.[selectedStop.id]?.[player.id] ??
                          scoreMap.get(`${selectedStop.id}:${player.id}`) ??
                          "";
                        return (
                          <Input
                            key={player.id}
                            type="number"
                            step="1"
                            placeholder={`${player.player_name} score`}
                            value={currentValue}
                            onChange={(event) => {
                              const nextValue = event.target.value;
                              setScoreInputs((prev) => ({
                                ...prev,
                                [selectedStop.id]: {
                                  ...(prev[selectedStop.id] || {}),
                                  [player.id]: nextValue
                                }
                              }));
                            }}
                          />
                        );
                      })}
                      <Button onClick={() => handleScoreSave(selectedStop.id)}>
                        Save scores
                      </Button>
                    </div>
                  )}
                  <Button onClick={() => setActiveTab("scanner")}>Open scanner</Button>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {(!requireContact || contactSaved) && !needsTeamSetup && activeTab === "scanner" && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Scanner</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {scannerMessage && (
                <div
                  className={`rounded-lg border px-3 py-2 text-sm ${
                    scannerStatus === "success"
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : scannerStatus === "error"
                        ? "border-rose-200 bg-rose-50 text-rose-700"
                        : "border-slate-200 bg-slate-50 text-slate-600"
                  }`}
                >
                  {scannerMessage}
                </div>
              )}
              <PassportQrScanner
                isOpen={activeTab === "scanner"}
                onClose={() => {
                  setActiveTab("stops");
                  setScannerStatus(null);
                  setScannerMessage("");
                }}
                onScan={handleScanResult}
              />
            </CardContent>
          </Card>
        )}

        {(!requireContact || contactSaved) && !needsTeamSetup && activeTab === "leaderboard" && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Leaderboard</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!leaderboard && (
                <div className="text-sm text-slate-500">
                  Loading leaderboard…
                </div>
              )}
              {leaderboard && (
                <>
                  <div className="text-xs text-slate-500">
                    {leaderboard.scoring_high_wins ? "High score wins" : "Low score wins"}
                  </div>
                  <div className="space-y-2">
                    <div className="text-sm font-semibold">Teams</div>
                    {leaderboard.teams?.length ? (
                      <div className="space-y-2">
                        {leaderboard.teams.map((teamRow, index) => (
                          <div
                            key={teamRow.team_id}
                            className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm"
                          >
                            <div className="font-medium">
                              #{index + 1} {teamRow.team_name}
                            </div>
                            <div className="text-slate-600">
                              {Number(teamRow.total_score || 0).toFixed(2)}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-sm text-slate-500">No team scores yet.</div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <div className="text-sm font-semibold">Individuals</div>
                    {leaderboard.individuals?.length ? (
                      <div className="space-y-2">
                        {leaderboard.individuals.map((row, index) => (
                          <div
                            key={row.player_id}
                            className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm"
                          >
                            <div className="font-medium">
                              #{index + 1} {row.player_name}{" "}
                              <span className="text-xs text-slate-500">
                                ({row.team_name})
                              </span>
                            </div>
                            <div className="text-slate-600">
                              {Number(row.total_score || 0).toFixed(2)}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-sm text-slate-500">No individual scores yet.</div>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
