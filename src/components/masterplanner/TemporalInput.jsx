import React from "react";
import { Input } from "@/components/ui/input";

/** Keeps React state in sync when browsers mutate native date/time inputs directly. */
export function syncTemporalValue(onValueChange) {
  return (event) => {
    onValueChange(event.currentTarget.value);
  };
}

export default function TemporalInput({ value, onValueChange, ...props }) {
  const sync = syncTemporalValue(onValueChange);

  return (
    <Input
      value={value ?? ""}
      onInput={sync}
      onChange={sync}
      onBlur={sync}
      {...props}
    />
  );
}
