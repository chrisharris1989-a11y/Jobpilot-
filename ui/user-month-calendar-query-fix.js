import { supabase } from "../supabase.js";

// The User monthly calendar in dashboard-ui.js uses the legacy user_id filter.
// Rewrite only that calendar query to use assigned_user_id. This is installed
// immediately so there is no race with the dashboard click handler.
let installed = false;

function install() {
  if (installed) return;
  installed = true;

  const originalFrom = supabase.from.bind(supabase);
  supabase.from = table => {
    const builder = originalFrom(table);
    if (table !== "jobs") return builder;

    let monthCalendarQuery = false;
    const originalSelect = builder.select.bind(builder);
    const originalEq = builder.eq.bind(builder);

    builder.select = (columns, ...args) => {
      monthCalendarQuery = typeof columns === "string"
        && columns.includes("scheduled_date")
        && columns.includes("scheduled_time")
        && columns.includes("notes")
        && !columns.includes("price");
      return originalSelect(columns, ...args);
    };

    builder.eq = (column, value) => {
      if (monthCalendarQuery && column === "user_id") {
        return originalEq("assigned_user_id", value);
      }
      return originalEq(column, value);
    };

    return builder;
  };
}

install();
