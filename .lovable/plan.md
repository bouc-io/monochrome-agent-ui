

# Implementation Plan: 5 Improvements

## 1. Delete Confirmation Dialog
**Current**: Clicking "Delete" on an assignment in the sidebar immediately deletes it with no confirmation.

**Change**: Wrap the delete action in an `AlertDialog` confirmation prompt asking "Are you sure you want to delete this assignment? This action cannot be undone."

**Files**: `src/pages/Index.tsx`
- Add `AlertDialog` import from radix
- Add state for `pendingDeleteId`
- On delete click, set `pendingDeleteId` instead of deleting immediately
- Render an `AlertDialog` at the bottom of the component that shows when `pendingDeleteId` is set
- On confirm, call existing `deleteAssignment` + clear state; on cancel, clear state

---

## 2. Rename Assignments + Search/Filter

**Current**: Assignments show in the sidebar list but cannot be renamed. The `updateAssignment` API method already exists in `agentApi.ts`. No search/filter for the sidebar list.

**Changes in `src/pages/Index.tsx`**:
- **Rename**: Add a "Rename" option to the assignment's `DropdownMenu` (next to Delete). On click, show an inline editable input or a small dialog. On confirm, call `updateAssignment(id, { title: newTitle })` and update local state.
- **Search**: Add a search `Input` above the assignments list (below the model selector header). Filter the `assignments` array client-side by title matching the query. Use the existing `t.rename` translation key.

**Files**: `src/pages/Index.tsx`
- Add `Pencil` icon import from lucide
- Add `editingAssignmentId`, `editTitle`, `sidebarSearch` state
- Add rename handler calling `updateAssignment`
- Add search input in sidebar header area
- Filter assignments by `sidebarSearch` before rendering

---

## 3. Suggested Starter Prompts on Home

**Current**: The home page center area has a text input with "Describe your work assignment..." but no prompt suggestions.

**Change**: Add 4-6 clickable suggestion chips below the input area. Clicking one fills the input with that prompt text.

**Files**: `src/pages/Index.tsx`
- Define a `SUGGESTED_PROMPTS` array with example tasks like "Summarize this document", "Research the latest trends in...", "Write a report about...", "Help me plan a project for..."
- Render them as styled buttons/chips in a flex-wrap row below the input
- On click, set `newAssignmentPrompt` to the selected suggestion

---

## 4. Render Markdown in Reasoning Panel

**Current**: Reasoning entries in `AssignmentPage.tsx` (line 688) render with `whitespace-pre-wrap` as plain text via `<p>` tags. Bot messages already use `ReactMarkdown` + `remarkGfm`.

**Change**: Replace the plain `<p>` text rendering in reasoning entries and streaming thinking tokens with `ReactMarkdown` + `remarkGfm`, using the same prose styling as `ChatMessage.tsx`.

**Files**: `src/pages/AssignmentPage.tsx`
- Import `ReactMarkdown` and `remarkGfm`
- Replace `<p className="text-sm text-foreground whitespace-pre-wrap">{entry.content}</p>` (line 688) with a `<div>` containing `<ReactMarkdown remarkPlugins={[remarkGfm]}>{entry.content}</ReactMarkdown>` with prose styling
- Do the same for the streaming thinking tokens block (line 702)

---

## 5. Error Toasts for Failed Operations

**Current**: Errors in `Index.tsx` and `AssignmentPage.tsx` are only logged to console via `logger.error()`. The user sees no visible feedback when operations fail (delete, load, send message, etc.).

**Change**: Add toast notifications for all user-facing error paths.

**Files**:
- **`src/pages/Index.tsx`**: Import `useToast`. Show destructive toasts on:
  - Failed to load assignments
  - Failed to delete assignment
  - Failed to create assignment
- **`src/pages/AssignmentPage.tsx`**: Import `useToast`. Show destructive toasts on:
  - Failed to load assignment
  - Failed to send message (the inline error message is fine, but also toast)
  - Run failed (from `handleRunFailed`)
- **`src/components/SettingsOverlay.tsx`**: Show a toast on successful save instead of (or in addition to) reloading the page. Bonus: remove `window.location.reload()` since theme and language are already applied via React context.

---

## Translation Keys

New keys to add across all 3 languages in `src/context/LanguageContext.tsx`:
- `deleteConfirmTitle` / `deleteConfirmDescription` / `confirm`
- `searchAssignments`
- `renameAssignment`
- `errorLoadAssignments` / `errorDeleteAssignment` / `errorCreateAssignment` / `errorLoadChat` / `errorSendMessage`
- `settingsSaved`

---

## Summary of Files Modified

| File | Changes |
|------|---------|
| `src/pages/Index.tsx` | Delete confirmation dialog, rename, sidebar search, suggested prompts, error toasts |
| `src/pages/AssignmentPage.tsx` | Markdown in reasoning panel, error toasts |
| `src/components/SettingsOverlay.tsx` | Remove reload, add success toast |
| `src/context/LanguageContext.tsx` | New translation keys (EN/FR/ES) |

