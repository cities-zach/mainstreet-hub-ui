import { useEffect, useState } from "react";
import { apiFetch, getEvents, getUsers, getEventBudget, getBudgetCategories } from "./api";

const USER_ID = "789f4880-24ec-403c-a636-c25ddadc5845";

export default function App() {
  const [me, setMe] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [newTitle, setNewTitle] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // ===== Event Planner state =====
  const [events, setEvents] = useState([]);
  const [editingEvent, setEditingEvent] = useState(null);
  const [users, setUsers] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState(null);
  const [eventTasks, setEventTasks] = useState([]);

  const [budgetItems, setBudgetItems] = useState([]);
  const [budgetForm, setBudgetForm] = useState({
    category_id: "",
    description: "",
    amount: ""
});
  const [budgetTotals, setBudgetTotals] = useState([]);
  const [newBudgetItem, setNewBudgetItem] = useState({
    category: "",
    description: "",
    amount: ""
});
const [editingBudgetId, setEditingBudgetId] = useState(null);
const [budgetEditForm, setBudgetEditForm] = useState({
  description: "",
  amount: ""
});

  const [revenueItems, setRevenueItems] = useState([]);
  const [revenueForm, setRevenueForm] = useState({
    category_id: "",
    description: "",
    amount: ""
  });
  const [revenueTotals, setRevenueTotals] = useState([]);
  const [revenueCategories, setRevenueCategories] = useState([]);
  const [editingRevenueId, setEditingRevenueId] = useState(null);
const [revenueEditForm, setRevenueEditForm] = useState({
  description: "",
  amount: ""
});

const [budgetCategories, setBudgetCategories] = useState([]);

  const [eventForm, setEventForm] = useState({
    title: "",
    description: "",
    location: "",
    starts_at: "",
    ends_at: "",
    status: "draft",
    event_champion_user_id: ""
  });

  const totalExpenses = budgetItems.reduce(
  (sum, item) => sum + Number(item.amount || 0),
  0
);

const totalRevenue = revenueItems.reduce(
  (sum, item) => sum + Number(item.amount || 0),
  0
);

const netTotal = totalRevenue - totalExpenses;

  function headers() {
    return { "x-user-id": USER_ID };
  }

  useEffect(() => {
    apiFetch("/me", { headers: headers() })
      .then(setMe)
      .catch(err => setError(err.message));

    loadTasks();

    getEvents(headers()).then(setEvents);
    getUsers(headers()).then(setUsers);
    getBudgetCategories(headers())
  .then(setBudgetCategories)
  .catch(err => setError(err.message));

  apiFetch("/revenue-categories", { headers: headers() })
    .then(setRevenueCategories)
    .catch(err => setError(err.message));
  }, []);

  function loadTasks() {
    apiFetch("/tasks", { headers: headers() })
      .then(setTasks)
      .catch(err => setError(err.message));
  }

  function loadEventTasks(eventId) {
    apiFetch(`/tasks?event_id=${eventId}`, { headers: headers() })
      .then(setEventTasks)
      .catch(err => setError(err.message));
  }

async function createTask(e) {
  e.preventDefault();
  if (!newTitle) return;

  setSaving(true);

  await apiFetch("/tasks", {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      title: newTitle,
      event_id: selectedEventId || null // 👈 NEW
    })
  });

  setNewTitle("");
  setSaving(false);
  loadTasks();

  if (selectedEventId) {
    loadEventTasks(selectedEventId);
  }
}

  async function updateTask(id) {
    setSaving(true);

    await apiFetch(`/tasks/${id}`, {
      method: "PATCH",
      headers: headers(),
      body: JSON.stringify({ title: editTitle })
    });

    setEditingId(null);
    setEditTitle("");
    setSaving(false);
    loadTasks();
    if (selectedEventId) loadEventTasks(selectedEventId);
  }

  async function deleteTask(id) {
    if (!window.confirm("Delete this task?")) return;

    await apiFetch(`/tasks/${id}`, {
      method: "DELETE",
      headers: headers()
    });

    loadTasks();
    if (selectedEventId) loadEventTasks(selectedEventId);
  }

  async function saveEvent(e) {
    e.preventDefault();

    if (!eventForm.title || !eventForm.starts_at) {
      setError("Event title and start time are required");
      return;
    }

    setSaving(true);

    if (editingEvent) {
      await apiFetch(`/events/${editingEvent.id}`, {
        method: "PATCH",
        headers: headers(),
        body: JSON.stringify(eventForm)
      });
    } else {
      await apiFetch("/events", {
        method: "POST",
        headers: headers(),
        body: JSON.stringify(eventForm)
      });
    }

    setEventForm({
      title: "",
      description: "",
      location: "",
      starts_at: "",
      ends_at: "",
      status: "draft",
      event_champion_user_id: ""
    });

    setEditingEvent(null);
    setSelectedEventId(null);
    setEventTasks([]);
    setSaving(false);

    setEvents(await getEvents(headers()));
  }

  // ===== 4.4b: Add Budget Item =====
async function addBudgetItem(e) {
  e.preventDefault();

  if (!budgetForm.category_id || !budgetForm.amount) {
    setError("Budget category and amount are required");
    return;
  }

  await apiFetch(`/events/${selectedEventId}/budget`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      category_id: budgetForm.category_id,
      description: budgetForm.description,
      amount: budgetForm.amount
    })
  });

  setBudgetForm({
    category_id: "",
    description: "",
    amount: ""
  });

  const updated = await apiFetch(
    `/events/${selectedEventId}/budget`,
    { headers: headers() }
  );
  setBudgetItems(updated);
}

async function updateBudgetItem(id) {
  await apiFetch(`/budget/${id}`, {
    method: "PATCH",
    headers: headers(),
    body: JSON.stringify({
      description: budgetEditForm.description,
      amount: budgetEditForm.amount
    })
  });

  setEditingBudgetId(null);
  setBudgetEditForm({ description: "", amount: "" });

  const updated = await apiFetch(
    `/events/${selectedEventId}/budget`,
    { headers: headers() }
  );
  setBudgetItems(updated);
}

async function deleteBudgetItem(id) {
  await apiFetch(`/budget/${id}`, {
    method: "DELETE",
    headers: headers()
  });

  const updated = await apiFetch(
    `/events/${selectedEventId}/budget`,
    { headers: headers() }
  );
  setBudgetItems(updated);
}

async function loadEventRevenue(eventId) {
  const items = await apiFetch(
    `/events/${eventId}/revenue`,
    { headers: headers() }
  );
  setRevenueItems(items);

  const totals = await apiFetch(
    `/events/${eventId}/revenue/by-category`,
    { headers: headers() }
  );
  setRevenueTotals(totals);
}

async function addRevenueItem(e) {
  e.preventDefault();

  if (!revenueForm.category_id || revenueForm.amount === "") {
    setError("Revenue category and amount are required");
    return;
  }

  await apiFetch(`/events/${selectedEventId}/revenue`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      category_id: revenueForm.category_id,
      description: revenueForm.description,
      amount: revenueForm.amount
    })
  });

  setRevenueForm({
    category_id: "",
    description: "",
    amount: ""
  });

  await loadEventRevenue(selectedEventId);
}

async function deleteRevenueItem(id) {
  await apiFetch(`/revenue/${id}`, {
    method: "DELETE",
    headers: headers()
  });

  await loadEventRevenue(selectedEventId);
}

async function updateRevenueItem(id) {
  await apiFetch(`/revenue/${id}`, {
    method: "PATCH",
    headers: headers(),
    body: JSON.stringify({
      description: revenueEditForm.description,
      amount: revenueEditForm.amount
    })
  });

  setEditingRevenueId(null);
  setRevenueEditForm({ description: "", amount: "" });

  await loadEventRevenue(selectedEventId);
}
// ================================

  return (
    <div style={{ padding: "2rem", fontFamily: "sans-serif", maxWidth: "700px" }}>
      <h1>MainStreet Hub</h1>

      {error && <p style={{ color: "red" }}>{error}</p>}
      {!me && !error && <p>Loading...</p>}

      {me && (
        <>
          <section style={{ marginBottom: "2rem" }}>
            <h2>Logged in as</h2>
            <pre>{JSON.stringify(me.user, null, 2)}</pre>
          </section>

          <section>
            <h2>Tasks</h2>

            <form onSubmit={createTask} style={{ marginBottom: "1rem" }}>
              <input
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                placeholder="New task title"
              />
              <button type="submit" disabled={saving}>Add Task</button>
            </form>

            <ul>
              {tasks.map(task => (
                <li key={task.id}>
                  {editingId === task.id ? (
                    <>
                      <input
                        value={editTitle}
                        onChange={e => setEditTitle(e.target.value)}
                      />
                      <button onClick={() => updateTask(task.id)}>Save</button>
                    </>
                  ) : (
                    <>
                      {task.title}
                      <button onClick={() => {
                        setEditingId(task.id);
                        setEditTitle(task.title);
                      }}>Edit</button>
                      <button onClick={() => deleteTask(task.id)}>Delete</button>
                    </>
                  )}
                </li>
              ))}
            </ul>
          </section>

          {/* ===== Events Planner ===== */}
          <section style={{ marginTop: "3rem" }}>
            <h2>Events</h2>

            <form onSubmit={saveEvent} style={{ marginBottom: "1.5rem" }}>
              <input
                placeholder="Event title"
                value={eventForm.title}
                onChange={e => setEventForm({ ...eventForm, title: e.target.value })}
              />

              <input
                placeholder="Location"
                value={eventForm.location}
                onChange={e => setEventForm({ ...eventForm, location: e.target.value })}
              />

              <textarea
                placeholder="Description"
                value={eventForm.description}
                onChange={e => setEventForm({ ...eventForm, description: e.target.value })}
              />

              <input
                type="datetime-local"
                value={eventForm.starts_at}
                onChange={e => setEventForm({ ...eventForm, starts_at: e.target.value })}
              />

              <input
                type="datetime-local"
                value={eventForm.ends_at}
                onChange={e => setEventForm({ ...eventForm, ends_at: e.target.value })}
              />

              <select
                value={eventForm.status}
                onChange={e => setEventForm({ ...eventForm, status: e.target.value })}
              >
                <option value="draft">Draft</option>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
              </select>

              <select
                value={eventForm.event_champion_user_id || ""}
                onChange={e =>
                  setEventForm({
                    ...eventForm,
                    event_champion_user_id: e.target.value || null
                  })
                }
              >
                <option value="">— Select Event Champion —</option>
                {users.map(user => (
                  <option key={user.id} value={user.id}>
                    {user.email} ({user.role})
                  </option>
                ))}
              </select>

              <button type="submit" disabled={saving}>
                {editingEvent ? "Update Event" : "Create Event"}
              </button>
            </form>

            {selectedEventId && (
              <>
                <h3>Tasks for this Event</h3>

                {eventTasks.length === 0 && (
                  <p style={{ fontStyle: "italic", color: "#666" }}>
                    No tasks linked to this event.
                  </p>
                )}

                <ul>
                  {eventTasks.map(task => (
                    <li key={task.id}>
                      {task.title}
                      <button
                        onClick={async () => {
                          await apiFetch(`/tasks/${task.id}`, {
                            method: "PATCH",
                            headers: headers(),
                            body: JSON.stringify({ event_id: null })
                          });
                          loadEventTasks(selectedEventId);
                        }}
                      >
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>

                <h4>Add existing task to this event</h4>

                <select
                  onChange={async e => {
                    const taskId = e.target.value;
                    if (!taskId) return;

                    await apiFetch(`/tasks/${taskId}`, {
                      method: "PATCH",
                      headers: headers(),
                      body: JSON.stringify({ event_id: selectedEventId })
                    });

                    e.target.value = "";
                    loadEventTasks(selectedEventId);
                  }}
                >
                  <option value="">— Select task —</option>
                  {tasks.filter(t => !t.event_id).map(task => (
                    <option key={task.id} value={task.id}>
                      {task.title}
                    </option>
                  ))}
                </select>
              </>
            )}

            {selectedEventId && (
  <section style={{ marginTop: "2rem" }}>
    <h3>Event Budget</h3>

{budgetTotals && (
  <div style={{ marginBottom: "1rem" }}>
    <strong>Totals:</strong>
    <div>Total: ${Number(budgetTotals.total_amount).toFixed(2)}</div>
    <div>Approved: ${Number(budgetTotals.approved_amount).toFixed(2)}</div>
    <div>Pending: ${Number(budgetTotals.pending_amount).toFixed(2)}</div>
    <div>Rejected: ${Number(budgetTotals.rejected_amount).toFixed(2)}</div>
  </div>
)}

    {budgetItems.length === 0 && (
      <p style={{ fontStyle: "italic", color: "#666" }}>
        No budget items yet.
      </p>
    )}

    <table border="1" cellPadding="6">
      <thead>
        <tr>
          <th>Category</th>
          <th>Description</th>
          <th>Amount</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
  {budgetItems.map(item => (
    <tr key={item.id}>
      <td>{item.category}</td>

      <td>
        {editingBudgetId === item.id ? (
          <input
            value={budgetEditForm.description}
            onChange={e =>
              setBudgetEditForm({
                ...budgetEditForm,
                description: e.target.value
              })
            }
          />
        ) : (
          item.description
        )}
      </td>

      <td>
        {editingBudgetId === item.id ? (
          <input
            type="number"
            value={budgetEditForm.amount}
            onChange={e =>
              setBudgetEditForm({
                ...budgetEditForm,
                amount: e.target.value
              })
            }
          />
        ) : (
          `$${Number(item.amount).toFixed(2)}`
        )}
      </td>

      <td>
  {editingBudgetId === item.id ? (
    <>
      <button onClick={() => updateBudgetItem(item.id)}>
        Save
      </button>
      <button
        onClick={() => {
          setEditingBudgetId(null);
          setBudgetEditForm({ description: "", amount: "" });
        }}
      >
        Cancel
      </button>
    </>
  ) : (
    <>
      <button
        onClick={() => {
          setEditingBudgetId(item.id);
          setBudgetEditForm({
            description: item.description || "",
            amount: item.amount
          });
        }}
      >
        Edit
      </button>
      <button
        onClick={() => deleteBudgetItem(item.id)}
      >
        Delete
      </button>
    </>
  )}
</td>
    </tr>
  ))}
</tbody>
    </table>
    {budgetTotals.length > 0 && (
  <div style={{ marginTop: "1rem" }}>
    <h4>Totals by Category</h4>

    <table border="1" cellPadding="6">
      <thead>
        <tr>
          <th>Category</th>
          <th>Total</th>
        </tr>
      </thead>
      <tbody>
        {budgetTotals.map((row) => (
          <tr key={row.category}>
            <td>{row.category}</td>
            <td>${Number(row.total).toFixed(2)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
)}
    <section style={{ marginTop: "1rem" }}>
  <h4>Add Budget Item</h4>

  <form onSubmit={addBudgetItem}>
    <select
  value={budgetForm.category_id || ""}
  onChange={e =>
    setBudgetForm({
      ...budgetForm,
      category_id: e.target.value
    })
  }
>
  <option value="">— Select Category —</option>
  {budgetCategories.map(cat => (
    <option key={cat.id} value={cat.id}>
      {cat.name}
    </option>
  ))}
</select>

    <input
      placeholder="Description"
      value={budgetForm.description}
      onChange={(e) =>
        setBudgetForm({ ...budgetForm, description: e.target.value })
      }
    />

    <input
      type="number"
      placeholder="Amount"
      value={budgetForm.amount}
      onChange={(e) =>
        setBudgetForm({ ...budgetForm, amount: e.target.value })
      }
    />

    <button type="submit">Add Budget Item</button>
  </form>
</section>
  </section>
)}

{selectedEventId && (
  <section style={{ marginTop: "2rem" }}>
    <h3>Event Revenue</h3>

    {revenueItems.length === 0 && (
      <p style={{ fontStyle: "italic", color: "#666" }}>
        No revenue items yet.
      </p>
    )}

    <table border="1" cellPadding="6">
      <thead>
        <tr>
          <th>Category</th>
          <th>Description</th>
          <th>Amount</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
  {revenueItems.map(item => (
    <tr key={item.id}>
      <td>{item.category}</td>

      <td>
        {editingRevenueId === item.id ? (
          <input
            value={revenueEditForm.description}
            onChange={e =>
              setRevenueEditForm({
                ...revenueEditForm,
                description: e.target.value
              })
            }
          />
        ) : (
          item.description
        )}
      </td>

      <td>
        {editingRevenueId === item.id ? (
          <input
            type="number"
            value={revenueEditForm.amount}
            onChange={e =>
              setRevenueEditForm({
                ...revenueEditForm,
                amount: e.target.value
              })
            }
          />
        ) : (
          `$${Number(item.amount).toFixed(2)}`
        )}
      </td>

      <td>
        {editingRevenueId === item.id ? (
          <>
            <button onClick={() => updateRevenueItem(item.id)}>
              Save
            </button>
            <button
              onClick={() => {
                setEditingRevenueId(null);
                setRevenueEditForm({ description: "", amount: "" });
              }}
            >
              Cancel
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => {
                setEditingRevenueId(item.id);
                setRevenueEditForm({
                  description: item.description || "",
                  amount: item.amount
                });
              }}
            >
              Edit
            </button>
            <button onClick={() => deleteRevenueItem(item.id)}>
              Delete
            </button>
          </>
        )}
      </td>
    </tr>
  ))}
</tbody>

    </table>

    {revenueTotals.length > 0 && (
      <div style={{ marginTop: "1rem" }}>
        <h4>Totals by Category</h4>

        <table border="1" cellPadding="6">
          <thead>
            <tr>
              <th>Category</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {revenueTotals.map(row => (
              <tr key={row.category}>
                <td>{row.category}</td>
                <td>${Number(row.total).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}

    <section style={{ marginTop: "1rem" }}>
      <h4>Add Revenue Item</h4>

      <form onSubmit={addRevenueItem}>
        <select
          value={revenueForm.category_id}
          onChange={e =>
            setRevenueForm({
              ...revenueForm,
              category_id: e.target.value
            })
          }
        >
          <option value="">— Select Category —</option>
          {revenueCategories.map(cat => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </select>

        <input
          placeholder="Description"
          value={revenueForm.description}
          onChange={e =>
            setRevenueForm({
              ...revenueForm,
              description: e.target.value
            })
          }
        />

        <input
          type="number"
          placeholder="Amount"
          value={revenueForm.amount}
          onChange={e =>
            setRevenueForm({
              ...revenueForm,
              amount: e.target.value
            })
          }
        />

        <button type="submit">Add Revenue Item</button>
      </form>
    </section>
  </section>
)}
{selectedEventId && (
  <section
    style={{
      marginTop: "2.5rem",
      padding: "1rem",
      border: "2px solid #333",
      background: "#fafafa"
    }}
  >
    <h3>Event Financial Summary</h3>

    <div style={{ marginBottom: "0.5rem" }}>
      <strong>Total Expenses:</strong>{" "}
      ${totalExpenses.toFixed(2)}
    </div>

    <div style={{ marginBottom: "0.5rem" }}>
      <strong>Total Revenue:</strong>{" "}
      ${totalRevenue.toFixed(2)}
    </div>

    <div
      style={{
        marginTop: "0.75rem",
        fontWeight: "bold",
        color: netTotal >= 0 ? "green" : "red"
      }}
    >
      Net: ${netTotal.toFixed(2)}
    </div>
  </section>
)}
            <ul>
              {events.map(event => (
                <li key={event.id}>
                  <strong>{event.title || "(Untitled event)"}</strong>
                  <div>Status: {event.status}</div>
                  <div>
                    Starts: {event.starts_at
                      ? new Date(event.starts_at).toLocaleString()
                      : "—"}
                  </div>
                  <button
                    onClick={async() => {
                      setEditingEvent(event);
                      setEventForm({
                        title: event.title || "",
                        description: event.description || "",
                        location: event.location || "",
                        starts_at: event.starts_at ? event.starts_at.slice(0, 16) : "",
                        ends_at: event.ends_at ? event.ends_at.slice(0, 16) : "",
                        status: event.status || "draft",
                        event_champion_user_id: event.event_champion_user_id || ""
                      });
                      setSelectedEventId(event.id);
                      loadEventTasks(event.id);
                      const budget = await getEventBudget(event.id, headers());
                      setBudgetItems(budget);
                      const totals = await apiFetch(
                       `/events/${event.id}/budget/totals`,
                       { headers: headers() }
                      );
                      setBudgetTotals(totals);
                      await loadEventRevenue(event.id);

                    }}
                  >
                    Edit
                  </button>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </div>
  );
}
