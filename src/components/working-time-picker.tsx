import React, { useState, useEffect } from "react";
import { Clock, Calendar, Check, Sun, Moon, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export interface WorkingTimePickerProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

const ALL_DAYS = [
  { id: "Mon", label: "Mon", full: "Monday" },
  { id: "Tue", label: "Tue", full: "Tuesday" },
  { id: "Wed", label: "Wed", full: "Wednesday" },
  { id: "Thu", label: "Thu", full: "Thursday" },
  { id: "Fri", label: "Fri", full: "Friday" },
  { id: "Sat", label: "Sat", full: "Saturday" },
  { id: "Sun", label: "Sun", full: "Sunday" },
];

const PRESETS = [
  { label: "Mon - Sat (9 AM - 8 PM IST)", days: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"], start: "09:00", end: "20:00", is24x7: false },
  { label: "Mon - Fri (9 AM - 6 PM IST)", days: ["Mon", "Tue", "Wed", "Thu", "Fri"], start: "09:00", end: "18:00", is24x7: false },
  { label: "24/7 Always Active", days: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"], start: "00:00", end: "23:59", is24x7: true },
];

export function WorkingTimePicker({ value, onChange, className = "" }: WorkingTimePickerProps) {
  const [is24x7, setIs24x7] = useState<boolean>(() => /24\s*x\s*7|always|24\/7/i.test(value));
  const [selectedDays, setSelectedDays] = useState<string[]>(() => {
    if (/mon\s*-\s*fri/i.test(value)) return ["Mon", "Tue", "Wed", "Thu", "Fri"];
    if (/mon\s*-\s*sat/i.test(value)) return ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    if (/everyday|all\s*days|24/i.test(value)) return ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    return ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  });
  const [startTime, setStartTime] = useState<string>("09:00");
  const [endTime, setEndTime] = useState<string>("20:00");
  const [timezone, setTimezone] = useState<string>("IST (UTC+5:30)");
  const [isCustomEditing, setIsCustomEditing] = useState<boolean>(false);

  // Parse 12h/24h time helper
  const format12Hour = (time24: string) => {
    if (!time24) return "";
    const [hStr, mStr] = time24.split(":");
    let h = parseInt(hStr || "0", 10);
    const m = mStr || "00";
    const ampm = h >= 12 ? "PM" : "AM";
    h = h % 12 || 12;
    return `${h}:${m} ${ampm}`;
  };

  const computeString = (days: string[], start: string, end: string, isAlways: boolean, tz: string) => {
    if (isAlways) {
      return "24x7 Always Active (24/7 Cashless Hospital Desk & Emergency Lines)";
    }

    let daySummary = "";
    if (days.length === 7) {
      daySummary = "Monday - Sunday";
    } else if (days.length === 6 && !days.includes("Sun")) {
      daySummary = "Monday - Saturday";
    } else if (days.length === 5 && !days.includes("Sat") && !days.includes("Sun")) {
      daySummary = "Monday - Friday";
    } else if (days.length === 0) {
      daySummary = "By Appointment";
    } else {
      daySummary = days.join(", ");
    }

    const start12 = format12Hour(start);
    const end12 = format12Hour(end);
    const tzCode = tz.includes("IST") ? "IST" : tz.split(" ")[0];

    return `${daySummary} ${start12} - ${end12} ${tzCode}`;
  };

  const handleDayToggle = (dayId: string) => {
    let next: string[];
    if (selectedDays.includes(dayId)) {
      next = selectedDays.filter((d) => d !== dayId);
    } else {
      next = [...selectedDays, dayId];
    }
    setSelectedDays(next);
    setIs24x7(false);
    onChange(computeString(next, startTime, endTime, false, timezone));
  };

  const handleTimeChange = (type: "start" | "end", val: string) => {
    const newStart = type === "start" ? val : startTime;
    const newEnd = type === "end" ? val : endTime;
    if (type === "start") setStartTime(val);
    if (type === "end") setEndTime(val);
    onChange(computeString(selectedDays, newStart, newEnd, is24x7, timezone));
  };

  const handleApplyPreset = (p: typeof PRESETS[0]) => {
    setIs24x7(p.is24x7);
    setSelectedDays(p.days);
    setStartTime(p.start);
    setEndTime(p.end);
    onChange(computeString(p.days, p.start, p.end, p.is24x7, timezone));
  };

  const toggle24x7 = () => {
    const next = !is24x7;
    setIs24x7(next);
    if (next) {
      setSelectedDays(["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]);
    }
    onChange(computeString(selectedDays, startTime, endTime, next, timezone));
  };

  return (
    <div className={`space-y-3.5 p-4 rounded-2xl border border-slate-200 bg-white/80 shadow-2xs ${className}`}>
      {/* Header and Quick Presets */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <Clock className="size-4 text-[#087F8C]" />
          <span className="text-xs font-bold text-slate-900">Operating Schedule & Working Hours</span>
        </div>

        <div className="flex items-center gap-1.5">
          <Button
            type="button"
            variant={is24x7 ? "default" : "outline"}
            size="sm"
            onClick={toggle24x7}
            className={`h-7 px-2.5 text-[11px] gap-1 font-semibold ${
              is24x7 ? "bg-[#087F8C] text-white hover:bg-[#076C77]" : "border-slate-200 text-slate-700"
            }`}
          >
            <Sparkles className="size-3" /> 24/7 Always Open
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setIsCustomEditing(!isCustomEditing)}
            className="h-7 px-2 text-[11px] text-slate-500 hover:text-slate-800"
          >
            {isCustomEditing ? "Structured Mode" : "Raw Text"}
          </Button>
        </div>
      </div>

      {isCustomEditing ? (
        <div className="space-y-1.5">
          <Input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="e.g. Monday - Saturday 9:00 AM - 8:00 PM IST"
            className="text-xs border-slate-200 bg-white font-mono"
          />
          <p className="text-[11px] text-slate-400">Directly edit the custom schedule string if needed.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Preset Buttons */}
          <div className="flex flex-wrap gap-1.5">
            {PRESETS.map((p, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleApplyPreset(p)}
                className="px-2.5 py-1 text-[11px] rounded-lg border border-slate-200 bg-slate-50 hover:bg-[#E6F6F7] hover:border-[#087F8C]/40 text-slate-700 transition-colors cursor-pointer"
              >
                {p.label}
              </button>
            ))}
          </div>

          {!is24x7 && (
            <>
              {/* Day Pills Selector */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-semibold text-slate-600 block">Working Days</span>
                <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
                  {ALL_DAYS.map((d) => {
                    const isSelected = selectedDays.includes(d.id);
                    return (
                      <button
                        key={d.id}
                        type="button"
                        onClick={() => handleDayToggle(d.id)}
                        className={`py-1.5 text-center text-xs rounded-xl font-medium transition-all cursor-pointer ${
                          isSelected
                            ? "bg-[#087F8C] text-white shadow-2xs font-bold"
                            : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                        }`}
                      >
                        {d.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Time Pickers (Start - End) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-600 flex items-center gap-1.5">
                    <Sun className="size-3.5 text-amber-500" /> Start Time (Opening)
                  </label>
                  <div className="relative">
                    <input
                      type="time"
                      value={startTime}
                      onChange={(e) => handleTimeChange("start", e.target.value)}
                      className="w-full h-9 px-3 text-xs rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#087F8C] font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-600 flex items-center gap-1.5">
                    <Moon className="size-3.5 text-indigo-500" /> End Time (Closing)
                  </label>
                  <div className="relative">
                    <input
                      type="time"
                      value={endTime}
                      onChange={(e) => handleTimeChange("end", e.target.value)}
                      className="w-full h-9 px-3 text-xs rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#087F8C] font-mono"
                    />
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Timezone selection */}
          <div className="flex items-center justify-between text-xs pt-1">
            <span className="text-[11px] text-slate-500">Operating Timezone:</span>
            <select
              value={timezone}
              onChange={(e) => {
                setTimezone(e.target.value);
                onChange(computeString(selectedDays, startTime, endTime, is24x7, e.target.value));
              }}
              className="text-xs h-7 px-2 border border-slate-200 rounded-lg bg-white text-slate-700"
            >
              <option value="IST (UTC+5:30)">Indian Standard Time (IST / UTC+5:30)</option>
              <option value="UTC (UTC+0)">Universal Coordinated Time (UTC)</option>
              <option value="EST (UTC-5)">Eastern Standard Time (EST / UTC-5)</option>
              <option value="PST (UTC-8)">Pacific Standard Time (PST / UTC-8)</option>
              <option value="GST (UTC+4)">Gulf Standard Time (GST / UTC+4)</option>
            </select>
          </div>

          {/* Computed Live Schedule Preview */}
          <div className="p-2.5 rounded-xl border border-emerald-100 bg-emerald-50/50 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[11px] text-emerald-800 font-mono font-medium truncate">
                {value || computeString(selectedDays, startTime, endTime, is24x7, timezone)}
              </span>
            </div>
            <Badge variant="outline" className="text-[10px] bg-white border-emerald-200 text-emerald-700 shrink-0">
              Active Voice Hours
            </Badge>
          </div>
        </div>
      )}
    </div>
  );
}
