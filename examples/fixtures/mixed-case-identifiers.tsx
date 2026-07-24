export function MixedCaseIdentifiers() {
  const condition = true;
  return (
    <div>
      {/* --- SHOULD BE EXTRACTED (real prose) --- */}
      <h1 title="Main heading">Welcome to the app</h1>
      <p>You have items</p>
      <input placeholder="Search projects..." />
      <span>{condition ? "Show details" : "Hide details"}</span>

      {/* --- SHOULD BE SKIPPED: comparison position (renderContext blocks) --- */}
      <span>{condition === "User_Name" && "Found"}</span>
      <span>{condition === "Api_V2" ? "New" : "Old"}</span>

      {/* --- SHOULD BE SKIPPED: mixed-case snake_case in render position (the bug) --- */}
      <span>{condition ? "User_Name" : "fallback"}</span>
      <span>{condition || "Api_V2"}</span>
      <span>{condition ?? "My_VAR_name"}</span>

      {/* --- SHOULD BE SKIPPED: pure-lowercase snake_case (already works) --- */}
      <span>{condition ? "error_code" : "other"}</span>

      {/* --- SHOULD BE SKIPPED: identifiers in attrs (SKIP_ATTRS blocks) --- */}
      <div className="flex gap-4" data-testid="box">Content</div>
    </div>
  );
}