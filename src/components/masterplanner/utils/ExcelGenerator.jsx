export const downloadEventWorkbook = (event) => {
  if (!event) return;

  const createCell = (value) => {
    const safeValue =
      value === null || value === undefined
        ? ""
        : String(value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");
    return `<Cell><Data ss:Type="String">${safeValue}</Data></Cell>`;
  };

  const createRow = (cells) => `<Row>${cells.map(createCell).join("")}</Row>`;

  const createWorksheet = (name, rows) => `
    <Worksheet ss:Name="${name}">
      <Table>
        ${rows.join("\n")}
      </Table>
    </Worksheet>`;

  const overviewRows = [
    createRow(["Field", "Value"]),
    createRow(["Event Name", event.name]),
    createRow(["Status", event.status]),
    createRow(["Event Type", event.event_type]),
    createRow(["Location", event.location]),
    createRow(["Start Date", event.start_date]),
    createRow(["End Date", event.end_date]),
    createRow(["Start Time", event.start_time || event.event_start_time]),
    createRow(["End Time", event.end_time || event.event_end_time]),
    createRow(["Organizing Committee", event.committee_organizing]),
    createRow(["Admission", event.admission]),
    createRow(["Description", event.description]),
    createRow(["Target Audience", event.audience]),
    createRow(["Mission Fit", event.mission_fit]),
  ];

  const contactsRows = [
    createRow(["Role/Name", "Organization", "Email", "Phone", "Notes"]),
  ];

  contactsRows.push(createRow(["--- Key Contacts ---", "", "", "", ""]));
  (event.key_contacts || []).forEach((c) => {
    contactsRows.push(
      createRow([
        `${c.role} (${c.name || ""})`,
        "MSO",
        c.email,
        c.phone,
        c.responsibility,
      ])
    );
  });

  contactsRows.push(createRow(["--- Other Contacts ---", "", "", "", ""]));
  (event.other_contacts || []).forEach((c) => {
    contactsRows.push(
      createRow([
        c.name,
        c.organization,
        c.email,
        c.phone,
        `${c.section} - ${c.service || ""} ${c.notes || ""}`,
      ])
    );
  });

  const scheduleRows = [
    createRow(["Type", "Time/Due Date", "Activity/Task", "Location/Person", "Notes"]),
  ];
  scheduleRows.push(createRow(["--- Run of Show ---", "", "", "", ""]));
  (event.schedule_items || []).forEach((item) => {
    scheduleRows.push(
      createRow(["Run of Show", item.time, item.activity, item.location, ""])
    );
  });

  scheduleRows.push(createRow(["--- Planning Tasks ---", "", "", "", ""]));
  (event.planning_schedule_items || []).forEach((item) => {
    scheduleRows.push(
      createRow(["Task", item.due_date, item.task, item.responsible_person, item.notes])
    );
  });

  const volunteerRows = [
    createRow(["Task", "Date", "Schedule", "Location", "Count Needed", "Special Skills"]),
  ];
  (event.volunteer_opportunities || []).forEach((v) => {
    volunteerRows.push(
      createRow([v.task, v.date, v.schedule, v.location, v.count_needed, v.special_skills])
    );
  });
  volunteerRows.push(createRow(["Volunteer Training Plan", event.volunteer_training_plan, "", "", "", ""]));
  volunteerRows.push(createRow(["Recruiting Plan", event.volunteer_recruiting_plan, "", "", "", ""]));

  const commRows = [
    createRow(["Item", "Details/Due Date", "Type", "Status"]),
  ];
  commRows.push(createRow(["Communication Strategy", event.communication_strategy, "", ""]));
  commRows.push(createRow(["Content Description", event.marketing_content_description, "", ""]));

  commRows.push(createRow(["--- Marketing Materials ---", "", "", ""]));
  (event.marketing_materials || []).forEach((m) => {
    commRows.push(createRow(["Material", m.due_date, m.type, m.status]));
  });

  const materialRows = [
    createRow(["Item Name", "Quantity", "Source/Supplier", "Notes"]),
  ];
  materialRows.push(createRow(["--- MSO Inventory ---", "", "", ""]));
  (event.mso_inventory_needs || []).forEach((m) => {
    materialRows.push(
      createRow([m.supply_item_name, m.quantity, "MSO Inventory", m.notes])
    );
  });

  materialRows.push(createRow(["--- External Needs ---", "", "", ""]));
  (event.equipment_needs || []).forEach((e) => {
    materialRows.push(createRow([e.item, e.quantity, e.source, e.notes]));
  });

  const financeRows = [
    createRow(["Type", "Category", "Item", "Amount/Total", "Notes"]),
  ];
  financeRows.push(createRow(["Budget Total Target", "", "", event.budget_total, event.finance_notes]));

  financeRows.push(createRow(["--- Funding Sources ---", "", "", "", ""]));
  (event.funding_sources || []).forEach((f) => {
    financeRows.push(createRow(["Revenue", f.type, f.item, f.total, f.notes]));
  });

  financeRows.push(createRow(["--- Projected Expenses ---", "", "", "", ""]));
  (event.projected_expenses || []).forEach((e) => {
    financeRows.push(createRow(["Expense", e.type, e.item, e.total, e.notes]));
  });

  const healthRows = [createRow(["Field", "Value"])];
  healthRows.push(createRow(["Est. Attendance", event.estimated_attendance]));
  healthRows.push(createRow(["Anticipated Weather", event.anticipated_weather]));
  healthRows.push(createRow(["Crowd Control Plan", event.crowd_control_plan]));
  healthRows.push(createRow(["Alcohol Plan", event.alcohol_plan]));
  healthRows.push(createRow(["Emergency Person", event.emergency_person_responsible]));
  healthRows.push(createRow(["Weather Procedures", event.emergency_procedures_weather]));
  healthRows.push(createRow(["Medical Plan", event.first_aid_medical_plan]));

  const siteRows = [createRow(["Field", "Value"])];
  siteRows.push(createRow(["Power Needs", event.power_needs_detail]));
  siteRows.push(createRow(["Water Needs", event.water_needs_detail]));
  siteRows.push(createRow(["WiFi Needs", event.wifi_needs_detail]));
  siteRows.push(createRow(["Street Closure", event.street_closure_details]));
  siteRows.push(createRow(["Parking", event.parking_location]));
  siteRows.push(createRow(["Site Notes", event.site_notes]));

  const workbookXML = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:o="urn:schemas-microsoft-com:office:office"
  xmlns:x="urn:schemas-microsoft-com:office:excel"
  xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:html="http://www.w3.org/TR/REC-html40">
  ${createWorksheet("Overview", overviewRows)}
  ${createWorksheet("Contacts", contactsRows)}
  ${createWorksheet("Schedule", scheduleRows)}
  ${createWorksheet("Volunteers", volunteerRows)}
  ${createWorksheet("Communication", commRows)}
  ${createWorksheet("Material", materialRows)}
  ${createWorksheet("Finance", financeRows)}
  ${createWorksheet("Health and Safety", healthRows)}
  ${createWorksheet("Site Considerations", siteRows)}
</Workbook>`;

  const blob = new Blob([workbookXML], { type: "application/vnd.ms-excel" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${(event.name || "event").replace(/[^a-z0-9]/gi, "_")}_Action_Plan.xls`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
