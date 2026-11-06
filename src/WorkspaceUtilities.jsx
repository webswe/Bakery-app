import React, { useEffect, useRef, useState } from "react";
import {
  Bell,
  ChevronDown,
  Clock3,
  Plus,
  RotateCcw,
  Star,
  X,
} from "lucide-react";
import { pages } from "./workspaceNavigation.js";
import { workspaceNotifications } from "./qol.js";
import { localDay } from "./uiFormatters.js";

const actions = [
  ["Record sale", "sale"],
  ["Add expense", "expense"],
  ["Add inventory item", "item"],
  ["New recipe", "recipe"],
];

export function QuickActionMenu({ open, navigate }) {
  const [show, setShow] = useState(false);
  const root = useRef(null);
  useEffect(() => {
    if (!show) return undefined;
    const close = (event) => {
      if (!root.current?.contains(event.target)) setShow(false);
    };
    document.addEventListener("pointerdown", close, true);
    return () => document.removeEventListener("pointerdown", close, true);
  }, [show]);
  return (
    <div className="utility-menu" ref={root}>
      <button
        className="header-action"
        onClick={() => setShow((value) => !value)}
        aria-expanded={show}
      >
        <Plus size={16} />
        Quick add
        <ChevronDown size={13} />
      </button>
      {show && (
        <div className="utility-popover quick-add-popover">
          {actions.map(([label, type]) => (
            <button
              key={type}
              onClick={() => {
                open(type);
                setShow(false);
              }}
            >
              <Plus size={15} />
              {label}
            </button>
          ))}
          <button
            onClick={() => {
              navigate("Quotes");
              setShow(false);
            }}
          >
            New quote
          </button>
          <button
            onClick={() => {
              navigate("Daily planner");
              setShow(false);
            }}
          >
            Plan production
          </button>
          <button
            onClick={() => {
              navigate("Goals & tasks");
              setShow(false);
            }}
          >
            Add owner task
          </button>
        </div>
      )}
    </div>
  );
}

export function NotificationCenter({ data, navigate }) {
  const [show, setShow] = useState(false);
  const root = useRef(null);
  const day = localDay();
  const rows = workspaceNotifications(data, day);
  useEffect(() => {
    if (!show) return undefined;
    const close = (event) => {
      if (!root.current?.contains(event.target)) setShow(false);
    };
    document.addEventListener("pointerdown", close, true);
    return () => document.removeEventListener("pointerdown", close, true);
  }, [show]);
  return (
    <div className="utility-menu" ref={root}>
      <button
        className="notification-button"
        onClick={() => setShow((value) => !value)}
        aria-label={`${rows.length} workspace alerts`}
        aria-expanded={show}
      >
        <Bell size={17} />
        {rows.length > 0 && <b>{rows.length}</b>}
      </button>
      {show && (
        <div className="utility-popover notification-popover">
          <div>
            <b>Needs attention</b>
            <button
              className="icon-button"
              onClick={() => setShow(false)}
              aria-label="Close notifications"
            >
              <X size={15} />
            </button>
          </div>
          {rows.map((row) => (
            <button
              key={row.id}
              onClick={() => {
                navigate(row.page);
                setShow(false);
              }}
            >
              <i className={row.level} />
              <span>
                {row.label}
                <small>Open {pages[row.page].label}</small>
              </span>
            </button>
          ))}
          {!rows.length && <p>Everything looks clear right now.</p>}
        </div>
      )}
    </div>
  );
}

export function PinnedShortcuts({ pinned, recent, navigate, onUnpin }) {
  const rows = pinned.filter((page) => pages[page]);
  if (!rows.length && !recent.length) return null;
  return (
    <div className="shortcut-strip">
      <Star size={14} />
      <span>Pinned</span>
      {rows.map((page) => (
        <span className="shortcut-chip" key={page}>
          <button onClick={() => navigate(page)}>{pages[page].label}</button>
          <button
            onClick={() => onUnpin(page)}
            aria-label={`Unpin ${pages[page].label}`}
          >
            <X size={12} />
          </button>
        </span>
      ))}
      {!rows.length && <small>Pin a page for one-click access.</small>}
      <span className="recent-label">
        <Clock3 size={13} />
        Recent
      </span>
      {recent
        .filter((page) => pages[page] && !rows.includes(page))
        .slice(0, 3)
        .map((page) => (
          <button
            className="recent-chip"
            key={page}
            onClick={() => navigate(page)}
          >
            {pages[page].label}
          </button>
        ))}
    </div>
  );
}

export function UndoToast({ value, onUndo, onClose }) {
  useEffect(() => {
    if (!value) return undefined;
    const timer = setTimeout(onClose, 8000);
    return () => clearTimeout(timer);
  }, [value, onClose]);
  if (!value) return null;
  return (
    <div className="undo-toast" role="status">
      <span>{value.message}</span>
      <button onClick={onUndo}>
        <RotateCcw size={15} />
        Undo
      </button>
      <button
        className="icon-button"
        onClick={onClose}
        aria-label="Dismiss undo"
      >
        <X size={15} />
      </button>
    </div>
  );
}
