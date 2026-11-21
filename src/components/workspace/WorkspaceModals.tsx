import { Search } from 'lucide-react';
import { Modal } from '../Modal';
import { LinkedNoteModal, type LinkedNoteFormData } from '../LinkedNoteModal';
import { parseNoteNodeId } from '../../lib/workspace';
import type { NoteMeta } from '../../types';

interface WorkspaceModalsProps {
  pickerOpen: boolean;
  pickerSearch: string;
  noteOptions: NoteMeta[];
  linkedModalOpen: boolean;
  linkedFromNodeId: string | null;
  notes: Record<string, NoteMeta>;
  onPickerSearchChange: (value: string) => void;
  onClosePicker: () => void;
  onLinkPick: (noteId: string) => void;
  onCloseLinkedModal: () => void;
  onLinkedSubmit: (data: LinkedNoteFormData) => Promise<void>;
}

/** Функция `WorkspaceModals`. */
export function WorkspaceModals({
  pickerOpen,
  pickerSearch,
  noteOptions,
  linkedModalOpen,
  linkedFromNodeId,
  notes,
  onPickerSearchChange,
  onClosePicker,
  onLinkPick,
  onCloseLinkedModal,
  onLinkedSubmit,
}: WorkspaceModalsProps) {
  return (
    <>
      <Modal open={pickerOpen} onClose={onClosePicker} title="Привязать заметку, которая уже есть">
        <div className="space-y-3">
          <div className="modal-search-wrap">
            <Search size={14} className="modal-search-icon" aria-hidden />
            <input
              className="input w-full modal-search-input"
              placeholder="Поиск..."
              value={pickerSearch}
              onChange={(e) => onPickerSearchChange(e.target.value)}
              autoFocus
            />
          </div>
          <div className="max-h-72 overflow-y-auto space-y-0.5">
            {noteOptions.length === 0 ? (
              <p className="text-sm text-[var(--text-secondary)] px-2 py-4 text-center">Нет заметок</p>
            ) : (
              noteOptions.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  className="w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-[var(--bg-secondary)]"
                  onClick={() => void onLinkPick(n.id)}
                >
                  {n.title}
                </button>
              ))
            )}
          </div>
        </div>
      </Modal>

      <LinkedNoteModal
        open={linkedModalOpen}
        sourceTitle={
          linkedFromNodeId ? notes[parseNoteNodeId(linkedFromNodeId) ?? '']?.title : undefined
        }
        onClose={onCloseLinkedModal}
        onSubmit={onLinkedSubmit}
      />
    </>
  );
}
