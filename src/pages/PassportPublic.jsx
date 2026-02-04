import React, { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import {
  createPassportInstance,
  getPassportInstance,
  getPublicPassport,
  stampPassportInstance,
  updatePassportInstance
} from "@/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import PassportMap from "@/components/passport/PassportMap";

export default function PassportPublic() {
  const { slug } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const qrToken = searchParams.get("qr");
  const tokenKey = slug ? `passport_token_${slug}` : "passport_token";

  const [passport, setPassport] = useState(null);
  const [stops, setStops] = useState([]);
  const [instance, setInstance] = useState(null);
  const [stamps, setStamps] = useState([]);
  const [entryCount, setEntryCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showMap, setShowMap] = useState(false);
  const [contactForm, setContactForm] = useState({
    contact_name: "",
    contact_email: "",
    contact_phone: ""
  });

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
      if (!qrToken || !instance?.token) return;
      try {
        await stampPassportInstance(instance.token, { qr_token: qrToken });
        const detail = await getPassportInstance(instance.token);
        setStamps(detail.stamps || []);
        setEntryCount(detail.entry_count || 0);
        setStops(detail.stops || []);
        setSearchParams((prev) => {
          const next = new URLSearchParams(prev);
          next.delete("qr");
          return next;
        });
      } catch (err) {
        setError(err.message);
      }
    };
    stampIfNeeded();
  }, [qrToken, instance?.token]);

  const handleContactSave = async () => {
    if (!instance?.token) return;
    try {
      const res = await updatePassportInstance(instance.token, contactForm);
      setInstance(res.instance);
    } catch (err) {
      setError(err.message);
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

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>{passport.title}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-sm text-slate-600">
              Progress: {completedCount}/{totalStops} stops completed
            </div>
            <div className="text-sm text-slate-600">
              Prize entries earned: {entryCount}
            </div>
          </CardContent>
        </Card>

        {passport.require_contact && (
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

        <div className="flex gap-2">
          <Button variant={showMap ? "outline" : "default"} onClick={() => setShowMap(false)}>
            List view
          </Button>
          <Button variant={showMap ? "default" : "outline"} onClick={() => setShowMap(true)}>
            Map view
          </Button>
        </div>

        {showMap ? (
          <PassportMap stops={stops} stamps={stamps} mapConfig={passport.map_config} />
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Stops</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {stops.map((stop) => {
                const visited = visitedStopIds.has(stop.id);
                return (
                  <div
                    key={stop.id}
                    className={`rounded-xl border p-3 ${
                      visited ? "border-[#2d4650] bg-[#2d4650]/5" : "border-slate-200"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">{stop.name}</div>
                        <div className="text-xs text-slate-500">
                          {stop.address_text || "No address"}
                        </div>
                      </div>
                      <div className="text-xs font-semibold">
                        {visited ? "Completed" : "Not yet"}
                      </div>
                    </div>
                    {stop.special_text && (
                      <div className="text-xs text-slate-600 mt-2">{stop.special_text}</div>
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
      </div>
    </div>
  );
}
