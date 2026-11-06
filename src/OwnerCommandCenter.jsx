import React, { useState } from "react";
import {
  CheckCircle2,
  Circle,
  Pencil,
  Plus,
  Target,
  Trash2,
} from "lucide-react";
import {
  normalizeOwnerGoals,
  removeOwnerTask,
  saveOwnerTask,
  taskSummary,
  toggleOwnerTask,
} from "./ownerPlanning.js";
import { localDay } from "./uiFormatters.js";

const today = () => localDay();

export default function OwnerCommandCenter({ data, save }) {
  const [editing, setEditing] = useState("");
  const [filter, setFilter] = useState("open");
  const [notice, setNotice] = useState("");
  const [selectedTasks, setSelectedTasks] = useState([]);
  const selected = data.ownerTasks.find((task) => task.id === editing);
  const summary = taskSummary(data, today());
  const tasks = [...data.ownerTasks]
    .filter(
      (task) =>
        filter === "all" ||
        (filter === "completed" ? task.completedAt : !task.completedAt),
    )
    .sort(
      (a, b) =>
        Number(!!a.completedAt) - Number(!!b.completedAt) ||
        a.dueDate.localeCompare(b.dueDate) ||
        { high: 0, normal: 1, low: 2 }[a.priority] -
          { high: 0, normal: 1, low: 2 }[b.priority],
    );
  const goals = normalizeOwnerGoals(data.settings?.ownerGoals);
  const act = (operation) => {
    try {
      save(operation());
      setNotice("");
      return true;
    } catch (error) {
      setNotice(error.message);
      return false;
    }
  };
  return (
    <div className="planning-workspace owner-command-center">
      <section className="panel goal-settings">
        <div className="customization-heading">
          <div className="customization-icon">
            <Target size={24} />
          </div>
          <div>
            <h2>Owner goals</h2>
            <p>
              Set working targets for the dashboard. They guide decisions and do
              not change accounting records.
            </p>
          </div>
        </div>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            const form = Object.fromEntries(new FormData(event.currentTarget));
            const ownerGoals = normalizeOwnerGoals(form);
            if (
              save({ ...data, settings: { ...data.settings, ownerGoals } }) !==
              false
            )
              setNotice("Owner goals saved.");
          }}
        >
          <div className="form-row">
            <label>
              Monthly revenue goal ($)
              <input
                name="monthlyRevenue"
                type="number"
                min="0"
                step="1"
                defaultValue={goals.monthlyRevenue || ""}
              />
            </label>
            <label>
              Monthly profit goal ($)
              <input
                name="monthlyProfit"
                type="number"
                min="0"
                step="1"
                defaultValue={goals.monthlyProfit || ""}
              />
            </label>
            <label>
              Weekly batch goal
              <input
                name="weeklyBatches"
                type="number"
                min="0"
                step="1"
                defaultValue={goals.weeklyBatches || ""}
              />
            </label>
          </div>
          <button className="primary">Save goals</button>
        </form>
      </section>
      <div className="task-summary">
        {[
          ["Overdue", summary.overdue.length, "danger"],
          ["Due today", summary.today.length, "warning"],
          ["Upcoming", summary.upcoming.length, ""],
          ["Completed", summary.completed.length, "positive"],
        ].map(([label, value, className]) => (
          <div className={`panel ${className}`} key={label}>
            <span>{label}</span>
            <b>{value}</b>
          </div>
        ))}
      </div>
      <section className="owner-task-layout">
        <div className="panel planning-form owner-task-form">
          <h2>{selected ? "Edit task" : "Add owner task"}</h2>
          <p>
            Capture calls, purchasing, paperwork, maintenance, and bakery
            follow-ups.
          </p>
          <form
            key={selected?.id || "new"}
            onSubmit={(event) => {
              event.preventDefault();
              if (
                act(() =>
                  saveOwnerTask(
                    data,
                    Object.fromEntries(new FormData(event.currentTarget)),
                    selected?.id,
                  ),
                )
              ) {
                event.currentTarget.reset();
                setEditing("");
              }
            }}
          >
            <label>
              Task
              <input
                name="title"
                defaultValue={selected?.title || ""}
                placeholder="Call supplier about chocolate pricing"
                required
              />
            </label>
            <div className="form-row">
              <label>
                Due date
                <input
                  name="dueDate"
                  type="date"
                  defaultValue={selected?.dueDate || today()}
                  required
                />
              </label>
              <label>
                Priority
                <select
                  name="priority"
                  defaultValue={selected?.priority || "normal"}
                >
                  <option value="high">High</option>
                  <option value="normal">Normal</option>
                  <option value="low">Low</option>
                </select>
              </label>
            </div>
            <label>
              Category
              <input
                name="category"
                list="task-categories"
                defaultValue={selected?.category || ""}
                placeholder="Purchasing"
              />
              <datalist id="task-categories">
                <option>Purchasing</option>
                <option>Customer</option>
                <option>Production</option>
                <option>Admin</option>
                <option>Maintenance</option>
                <option>Marketing</option>
              </datalist>
            </label>
            <label>
              Notes
              <textarea
                name="notes"
                defaultValue={selected?.notes || ""}
                placeholder="Details, phone number, or next step"
              />
            </label>
            <div className="planning-actions">
              <button className="primary">
                <Plus size={16} />
                {selected ? "Save task" : "Add task"}
              </button>
              {selected && (
                <button
                  type="button"
                  className="secondary"
                  onClick={() => setEditing("")}
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>
        <div className="owner-task-list">
          <div className="section-top">
            <h2>Task list</h2>
            <select
              aria-label="Filter owner tasks"
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
            >
              <option value="open">Open tasks</option>
              <option value="completed">Completed</option>
              <option value="all">All tasks</option>
            </select>
          </div>
          {selectedTasks.length > 0 && (
            <div className="bulk-action-bar">
              <b>{selectedTasks.length} selected</b>
              <button
                className="secondary"
                onClick={() => {
                  save({
                    ...data,
                    ownerTasks: data.ownerTasks.map((task) =>
                      selectedTasks.includes(task.id)
                        ? {
                            ...task,
                            completedAt:
                              task.completedAt || new Date().toISOString(),
                          }
                        : task,
                    ),
                  });
                  setSelectedTasks([]);
                }}
              >
                Complete
              </button>
              <button
                className="text-button"
                onClick={() => {
                  if (
                    confirm(`Delete ${selectedTasks.length} selected tasks?`)
                  ) {
                    save({
                      ...data,
                      ownerTasks: data.ownerTasks.filter(
                        (task) => !selectedTasks.includes(task.id),
                      ),
                    });
                    setSelectedTasks([]);
                  }
                }}
              >
                Delete
              </button>
            </div>
          )}
          {tasks.map((task) => (
            <article
              className={`panel owner-task ${task.completedAt ? "completed" : ""}`}
              key={task.id}
            >
              <label className="task-select">
                <input
                  type="checkbox"
                  checked={selectedTasks.includes(task.id)}
                  onChange={() =>
                    setSelectedTasks((current) =>
                      current.includes(task.id)
                        ? current.filter((id) => id !== task.id)
                        : [...current, task.id],
                    )
                  }
                />
                <span className="sr-only">Select {task.title}</span>
              </label>
              <button
                className="task-check"
                aria-label={`${task.completedAt ? "Reopen" : "Complete"} ${task.title}`}
                onClick={() => act(() => toggleOwnerTask(data, task.id))}
              >
                {task.completedAt ? <CheckCircle2 /> : <Circle />}
              </button>
              <div>
                <div className="task-title">
                  <span className={`priority ${task.priority}`}>
                    {task.priority}
                  </span>
                  <b>{task.title}</b>
                </div>
                <p>
                  {task.category} · Due {task.dueDate}
                </p>
                {task.notes && <small>{task.notes}</small>}
              </div>
              <div className="task-actions">
                <button
                  className="icon-button"
                  onClick={() => setEditing(task.id)}
                  aria-label={`Edit ${task.title}`}
                >
                  <Pencil size={15} />
                </button>
                <button
                  className="icon-button"
                  onClick={() => {
                    if (confirm(`Delete ${task.title}?`))
                      act(() => removeOwnerTask(data, task.id));
                  }}
                  aria-label={`Delete ${task.title}`}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </article>
          ))}
          {!tasks.length && (
            <p className="panel empty">No tasks in this view.</p>
          )}
        </div>
      </section>
      {notice && (
        <p
          className={notice.includes("saved") ? "positive" : "error"}
          role="status"
        >
          {notice}
        </p>
      )}
    </div>
  );
}
