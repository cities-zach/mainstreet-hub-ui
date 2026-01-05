import React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Zap,
  Droplets,
  Wifi,
  Upload,
  Map,
  Car,
  X,
  Loader2,
  FileText,
} from "lucide-react";

export default function SiteSection({ data, onChange, readOnly }) {
  const [uploading, setUploading] = React.useState(false);

  const handleChange = (field, value) => {
    onChange({ [field]: value });
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    handleChange("layout_plan_file", file);
    setUploading(false);
  };

  return (
    <div className="space-y-8 max-w-5xl">
      {/* Utilities */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold text-[#2d4650]">
            Utilities Needed
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Power */}
          <div className="space-y-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="power_needed"
                checked={data.power_needed}
                onCheckedChange={(checked) =>
                  handleChange("power_needed", checked)
                }
                disabled={readOnly}
              />
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-500" />
                <Label htmlFor="power_needed" className="font-medium cursor-pointer">
                  Electrical Available / Needed
                </Label>
              </div>
            </div>
            {data.power_needed && (
              <div className="ml-6 space-y-1">
                <Label
                  htmlFor="power_needs_detail"
                  className="text-sm text-slate-600"
                >
                  Please describe power needs
                </Label>
                <Input
                  id="power_needs_detail"
                  value={data.power_needs_detail || ""}
                  onChange={(e) =>
                    handleChange("power_needs_detail", e.target.value)
                  }
                  placeholder="e.g. 220v for stage, outlets for vendors..."
                  disabled={readOnly}
                />
              </div>
            )}
          </div>

          {/* Water */}
          <div className="space-y-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="water_needed"
                checked={data.water_needed}
                onCheckedChange={(checked) =>
                  handleChange("water_needed", checked)
                }
                disabled={readOnly}
              />
              <div className="flex items-center gap-2">
                <Droplets className="w-4 h-4 text-blue-500" />
                <Label htmlFor="water_needed" className="font-medium cursor-pointer">
                  Water Available / Needed
                </Label>
              </div>
            </div>
            {data.water_needed && (
              <div className="ml-6 space-y-1">
                <Label
                  htmlFor="water_needs_detail"
                  className="text-sm text-slate-600"
                >
                  Please describe water needs
                </Label>
                <Input
                  id="water_needs_detail"
                  value={data.water_needs_detail || ""}
                  onChange={(e) =>
                    handleChange("water_needs_detail", e.target.value)
                  }
                  placeholder="e.g. potable water for food vendors..."
                  disabled={readOnly}
                />
              </div>
            )}
          </div>

          {/* WiFi */}
          <div className="space-y-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="wifi_needed"
                checked={data.wifi_needed}
                onCheckedChange={(checked) =>
                  handleChange("wifi_needed", checked)
                }
                disabled={readOnly}
              />
              <div className="flex items-center gap-2">
                <Wifi className="w-4 h-4 text-indigo-500" />
                <Label htmlFor="wifi_needed" className="font-medium cursor-pointer">
                  WiFi Available / Needed
                </Label>
              </div>
            </div>
            {data.wifi_needed && (
              <div className="ml-6 space-y-1">
                <Label
                  htmlFor="wifi_needs_detail"
                  className="text-sm text-slate-600"
                >
                  Please describe internet needs
                </Label>
                <Input
                  id="wifi_needs_detail"
                  value={data.wifi_needs_detail || ""}
                  onChange={(e) =>
                    handleChange("wifi_needs_detail", e.target.value)
                  }
                  placeholder="e.g. secure connection for POS systems..."
                  disabled={readOnly}
                />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Street Closure & Parking */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Street Closure */}
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold text-[#2d4650]">
              Street Closure
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="street_closure_required"
                checked={data.street_closure_required}
                onCheckedChange={(checked) =>
                  handleChange("street_closure_required", checked)
                }
                disabled={readOnly}
              />
              <Label htmlFor="street_closure_required" className="font-medium cursor-pointer">
                Street Closure Required?
              </Label>
            </div>
            {data.street_closure_required && (
              <Textarea
                value={data.street_closure_details || ""}
                onChange={(e) =>
                  handleChange("street_closure_details", e.target.value)
                }
                placeholder="Which streets? Timeframes?"
                disabled={readOnly}
                rows={4}
              />
            )}
          </CardContent>
        </Card>

        {/* Parking */}
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Car className="w-5 h-5 text-[#835879]" />
              <CardTitle className="text-lg font-semibold text-[#2d4650]">
                Parking
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              type="number"
              value={data.estimated_cars || ""}
              onChange={(e) =>
                handleChange("estimated_cars", e.target.value)
              }
              placeholder="Estimated number of cars"
              disabled={readOnly}
            />
            <Textarea
              value={data.parking_location || ""}
              onChange={(e) =>
                handleChange("parking_location", e.target.value)
              }
              placeholder="Expected parking location"
              disabled={readOnly}
              rows={3}
            />
          </CardContent>
        </Card>
      </div>

      {/* Site Plan Upload */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Map className="w-5 h-5 text-[#835879]" />
            <CardTitle className="text-lg font-semibold text-[#2d4650]">
              Site Plan
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 bg-slate-50/50">
            {data.layout_plan_file ? (
              <div className="flex items-center justify-between bg-white p-3 rounded-lg border">
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-slate-500" />
                  <span className="text-sm font-medium truncate">
                    {data.layout_plan_file.name}
                  </span>
                </div>
                {!readOnly && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleChange("layout_plan_file", null)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
            ) : (
              !readOnly && (
                <>
                  <input
                    type="file"
                    id="site-plan-upload"
                    className="hidden"
                    accept="image/*,.pdf"
                    onChange={handleFileSelect}
                    disabled={uploading}
                  />
                  <Button
                    variant="outline"
                    onClick={() =>
                      document.getElementById("site-plan-upload").click()
                    }
                    disabled={uploading}
                  >
                    {uploading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      "Choose File"
                    )}
                  </Button>
                </>
              )
            )}
          </div>
        </CardContent>
      </Card>

      {/* Additional Notes */}
      <div className="space-y-2">
        <Label className="text-lg font-semibold text-[#2d4650]">
          Additional Site Considerations
        </Label>
        <Textarea
          value={data.site_notes || ""}
          onChange={(e) => handleChange("site_notes", e.target.value)}
          placeholder="Any other details about the site..."
          disabled={readOnly}
          rows={4}
        />
      </div>
    </div>
  );
}
