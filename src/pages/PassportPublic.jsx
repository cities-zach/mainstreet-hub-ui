import React, { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import {
  createPassportInstance,
  getPassportInstance,
  getPublicPassport,
  getPublicSystemSettings,
  stampPassportInstance,
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
  const [soundSettings, setSoundSettings] = useState({
    task_completion_sound_url: "",
    level_up_sound_url: ""
  });
  const completedOnceRef = useRef(false);

  const visitedStopIds = useMemo(
    () => new Set(stamps.map((stamp) => stamp.stop_id)),
    [stamps]
  );

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
        setScannerStatus("error");
        setScannerMessage(err.message || "Unable to record stamp.");
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

  const handleScanResult = async (decodedText) => {
    if (!instance?.token) return;
    try {
      setScannerStatus("working");
      setScannerMessage("Checking in…");
      let tokenValue = decodedText;
      let isBonus = false;
      if (decodedText.includes("qr=") || decodedText.includes("bonus=")) {
        try {
          const url = new URL(decodedText);
          const qrParam = url.searchParams.get("qr");
          const bonusParam = url.searchParams.get("bonus");
          tokenValue = qrParam || bonusParam || decodedText;
          isBonus = Boolean(bonusParam);
        } catch {
          const parts = decodedText.split("qr=");
          const bonusParts = decodedText.split("bonus=");
          if (bonusParts.length > 1) {
            tokenValue = bonusParts[1]?.split("&")[0] || decodedText;
            isBonus = true;
          } else {
            tokenValue = parts[1]?.split("&")[0] || decodedText;
          }
        }
      }
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

  if (loading) {
    return <div className="p-6 text-sm text-slate-500">Loading passport…</div>;
  }
  if (error) {
    return <div className="p-6 text-sm text-red-500">{error}</div>;
  }
  if (!passport) {
    return <div className="p-6 text-sm text-slate-500">Passport not found.</div>;
  }

  const completedCount = visitedStopIds.size;
  const totalStops = stops.length;
  const requireContact = passport.require_contact;
  const requiredStops =
    passport.required_stops_count == null ? totalStops : passport.required_stops_count;
  const progressValue =
    requiredStops > 0 ? Math.min(100, Math.round((completedCount / requiredStops) * 100)) : 0;
  const isComplete = requiredStops > 0 && completedCount >= requiredStops;

  useEffect(() => {
    if (isComplete && !completedOnceRef.current) {
      completedOnceRef.current = true;
      if (soundSettings.level_up_sound_url) {
        new Audio(soundSettings.level_up_sound_url).play().catch(() => {});
      }
    }
  }, [isComplete, soundSettings.level_up_sound_url]);

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

        {(!requireContact || contactSaved) && (
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
          </div>
        )}

        {(!requireContact || contactSaved) && activeTab === "stops" && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Stops</CardTitle>
            </CardHeader>
            <CardContent className="grid md:grid-cols-[1fr_320px] gap-4">
              <div className="space-y-3">
                {stops.map((stop) => {
                  const visited = visitedStopIds.has(stop.id);
                  return (
                    <button
                      type="button"
                      key={stop.id}
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
                  );
                })}
                {stops.length === 0 && (
                  <div className="text-sm text-slate-500">No stops available.</div>
                )}
              </div>

              <div className="rounded-xl border border-slate-200 p-3 space-y-3">
                <div className="text-sm font-semibold">Stop details</div>
                {selectedStop ? (
                  <>
                    {selectedStop.logo_url && (
                      <img
                        src={selectedStop.logo_url}
                        alt={selectedStop.name}
                        className="h-20 w-20 rounded-full object-cover border"
                      />
                    )}
                    <div className="font-medium">{selectedStop.name}</div>
                    <div className="text-xs text-slate-500">
                      {selectedStop.address_text || "No address"}
                    </div>
                    {selectedStop.special_text && (
                      <div className="text-xs text-slate-600">
                        {selectedStop.special_text}
                      </div>
                    )}
                    <Button onClick={() => setActiveTab("scanner")}>Open scanner</Button>
                  </>
                ) : (
                  <div className="text-xs text-slate-500">
                    Select a stop to view details.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {(!requireContact || contactSaved) && activeTab === "map" && (
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
                  <Button onClick={() => setActiveTab("scanner")}>Open scanner</Button>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {(!requireContact || contactSaved) && activeTab === "scanner" && (
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
      </div>
    </div>
  );
}
