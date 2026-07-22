import { useState } from "react";

export function App({ count = 0 }: { count?: number }) {
  const [open, setOpen] = useState(false);
  const role = count > 0 ? "active" : "system";
  return (
    <div className="flex flex-col gap-4 rounded-xl border p-4">
      <h1 title="Main heading">Welcome to the demo</h1>
      <p>You have {count} unread messages.</p>
      <button aria-label="Toggle panel" onClick={() => setOpen(!open)}>
        {open ? "Hide details" : "Show details"}
      </button>
      <span>{count > 0 ? `${count} items selected` : "Nothing selected"}</span>
      <input placeholder="Search projects..." data-testid="search-box" />
      {role === "system" && <em>Running in system mode</em>}
    </div>
  );
}
