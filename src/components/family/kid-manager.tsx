"use client";

import { useState } from "react";
import { Alert, Button, Input } from "@/components/ui";
import { validateChildName } from "@/lib/validation";
import {
  addChildClient,
  archiveChildClient,
  updateChildClient,
} from "@/lib/data/family-client";
import type { Child } from "@/lib/data/family";

const EMPTY_COPY =
  "You can add child profiles later. Spend Lens can still classify transactions without them.";
const PRIVACY_COPY =
  "Use first names or nicknames only. Spend Lens does not need full legal names.";

export function KidManager({
  familyId,
  initialChildren,
}: {
  familyId: string;
  initialChildren: Child[];
}) {
  const [children, setChildren] = useState<Child[]>(initialChildren);
  const [newName, setNewName] = useState("");
  const [addError, setAddError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editError, setEditError] = useState<string | null>(null);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setActionError(null);
    const error = validateChildName(newName);
    if (error) {
      setAddError(error);
      return;
    }
    setAddError(null);
    setBusy(true);
    try {
      const child = await addChildClient(familyId, newName);
      setChildren((prev) => [...prev, child]);
      setNewName("");
    } catch {
      setActionError("Could not add that child. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  function startEdit(child: Child) {
    setEditingId(child.id);
    setEditName(child.name);
    setEditError(null);
    setActionError(null);
  }

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingId) return;
    const error = validateChildName(editName);
    if (error) {
      setEditError(error);
      return;
    }
    setEditError(null);
    setBusy(true);
    try {
      const updated = await updateChildClient(editingId, editName);
      setChildren((prev) =>
        prev.map((c) => (c.id === updated.id ? updated : c)),
      );
      setEditingId(null);
      setEditName("");
    } catch {
      setActionError("Could not save that change. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function handleArchive(child: Child) {
    setActionError(null);
    setBusy(true);
    try {
      await archiveChildClient(child.id);
      setChildren((prev) => prev.filter((c) => c.id !== child.id));
    } catch {
      setActionError("Could not remove that child. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs text-slate-500">{PRIVACY_COPY}</p>

      {actionError && <Alert tone="error">{actionError}</Alert>}

      {children.length === 0 ? (
        <p className="rounded-lg bg-slate-50 p-4 text-sm text-slate-500">
          {EMPTY_COPY}
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {children.map((child) =>
            editingId === child.id ? (
              <li key={child.id}>
                <form
                  onSubmit={handleSaveEdit}
                  className="flex flex-col gap-2 rounded-lg border border-slate-200 p-3"
                >
                  <label htmlFor={`edit-${child.id}`} className="sr-only">
                    Edit child name
                  </label>
                  <Input
                    id={`edit-${child.id}`}
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    aria-label="Edit child name"
                  />
                  {editError && <Alert tone="error">{editError}</Alert>}
                  <div className="flex gap-2">
                    <Button type="submit" size="sm" disabled={busy}>
                      Save
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={() => setEditingId(null)}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </li>
            ) : (
              <li
                key={child.id}
                className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2"
              >
                <span className="text-sm text-slate-800">{child.name}</span>
                <div className="flex gap-1">
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => startEdit(child)}
                  >
                    Edit
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    disabled={busy}
                    onClick={() => handleArchive(child)}
                  >
                    Archive
                  </Button>
                </div>
              </li>
            ),
          )}
        </ul>
      )}

      <form onSubmit={handleAdd} className="flex flex-col gap-2">
        <label htmlFor="new-child" className="text-sm font-medium text-slate-700">
          Add a child
        </label>
        <div className="flex gap-2">
          <Input
            id="new-child"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="First name or nickname"
          />
          <Button type="submit" disabled={busy}>
            Add
          </Button>
        </div>
        {addError && <Alert tone="error">{addError}</Alert>}
      </form>
    </div>
  );
}
