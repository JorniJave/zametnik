import { ReactFlow, Background, Controls, MiniMap, type Edge, type Node, type ReactFlowProps } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Trash2 } from 'lucide-react';
import type { RelationType } from '../../types/workspace';
import { RELATION_LABELS } from '../../types/workspace';
import { parseNoteNodeId } from '../../lib/workspace';
import { accentHex } from '../../lib/palette';
import { workspaceNodeTypes } from './WorkspaceNoteCard';
import { CapturePaneFlow } from './CapturePaneFlow';
import { CanvasContextMenu } from './CanvasContextMenu';
import type { CardData, EdgeData, NodeMenuState, PaneMenuState, PaneMenuAction } from './workspaceTypes';

type CanvasProps = Omit<ReactFlowProps, 'children' | 'nodeTypes'>;

interface WorkspaceCanvasProps {
  canvasProps: CanvasProps;
  nodes: Node[];
  selectedNodeIds: string[];
  ctxMenu: NodeMenuState | null;
  paneMenu: PaneMenuState | null;
  selectedEdge: Edge | undefined;
  onContextAction: (action: string) => void;
  onPaneMenuAction: (action: PaneMenuAction) => void;
  onPaneFlowPosition: (flowX: number, flowY: number) => void;
  onRemoveNodes: (nodeIds: string[]) => void;
  onCloseMenus: () => void;
  onUpdateSelectedEdge: (patch: { relationType?: RelationType; label?: string; color?: string }) => void;
  onRemoveSelectedEdge: () => void;
}

/** Функция `WorkspaceCanvas`. */
export function WorkspaceCanvas({
  canvasProps,
  nodes,
  selectedNodeIds,
  ctxMenu,
  paneMenu,
  selectedEdge,
  onContextAction,
  onPaneMenuAction,
  onPaneFlowPosition,
  onRemoveNodes,
  onCloseMenus,
  onUpdateSelectedEdge,
  onRemoveSelectedEdge,
}: WorkspaceCanvasProps) {
  const multiCount = selectedNodeIds.length;

  return (
    <div className="flex-1 min-h-0 relative workspace-canvas">
      <ReactFlow {...canvasProps} nodeTypes={workspaceNodeTypes}>
        <Background gap={24} size={1} color="var(--border)" />
        <Controls showInteractive={false} position="bottom-left" />
        <CapturePaneFlow paneMenu={paneMenu} onFlowPosition={onPaneFlowPosition} />
        <MiniMap
          position="bottom-right"
          pannable
          zoomable
          nodeColor={() => accentHex()}
          maskColor="rgba(18, 19, 28, 0.75)"
        />
      </ReactFlow>

      {multiCount > 1 && (
        <div className="workspace-selection-bar">
          <span>Выбрано: {multiCount}</span>
          <button type="button" className="workspace-selection-btn" onClick={() => onRemoveNodes(selectedNodeIds)}>
            <Trash2 size={14} />
            Убрать с доски
          </button>
        </div>
      )}

      {ctxMenu && (
        <CanvasContextMenu x={ctxMenu.x} y={ctxMenu.y} onClose={onCloseMenus} className="min-w-[200px]">
          {parseNoteNodeId(ctxMenu.nodeId) && (
            <>
              <button type="button" className="ctx-item" onClick={() => onContextAction('open')}>
                Открыть / редактировать
              </button>
              <button type="button" className="ctx-item" onClick={() => onContextAction('link-new')}>
                + Связанная заметка
              </button>
              <button type="button" className="ctx-item" onClick={() => onContextAction('link-existing')}>
                Связать с узлом…
              </button>
              <button type="button" className="ctx-item" onClick={() => onContextAction('person')}>
                Тип: человек
              </button>
            </>
          )}
          <button type="button" className="ctx-item" onClick={() => onContextAction('text-card')}>
            + Текстовая карточка
          </button>
          <button type="button" className="ctx-item" onClick={() => onContextAction('pin')}>
            {(nodes.find((node) => node.id === ctxMenu.nodeId)?.data as CardData | undefined)?.pinned
              ? 'Открепить'
              : 'Закрепить'}
          </button>
          <button type="button" className="ctx-item text-red-400" onClick={() => onContextAction('delete')}>
            Убрать с доски
          </button>
        </CanvasContextMenu>
      )}

      {paneMenu && (
        <CanvasContextMenu x={paneMenu.x} y={paneMenu.y} onClose={onCloseMenus} className="min-w-[200px]">
          <button type="button" className="ctx-item" onClick={() => onPaneMenuAction('new-note')}>
            + Новая заметка
          </button>
          <button type="button" className="ctx-item" onClick={() => onPaneMenuAction('add-note')}>
            Добавить существующую…
          </button>
          <button type="button" className="ctx-item" onClick={() => onPaneMenuAction('text-card')}>
            + Текстовая карточка
          </button>
        </CanvasContextMenu>
      )}

      {selectedEdge && (
        <div
          className="absolute right-3 top-3 z-40 panel border rounded-xl shadow-xl p-3 w-56 space-y-2"
          style={{ borderColor: 'var(--border)' }}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold">Связь</span>
            <button type="button" className="btn-icon" onClick={onRemoveSelectedEdge} title="Удалить связь">
              <Trash2 size={14} />
            </button>
          </div>
          {(selectedEdge.data as EdgeData | undefined)?.kind === 'wiki' ? (
            <p className="text-xs text-[var(--text-secondary)]">
              Wiki-связь из текста заметки. Удаление уберёт ссылку из Markdown.
            </p>
          ) : (
            <>
              <select
                className="input w-full text-xs"
                value={(selectedEdge.data as EdgeData | undefined)?.relationType ?? 'related'}
                onChange={(event) => onUpdateSelectedEdge({ relationType: event.target.value as RelationType })}
              >
                {(Object.keys(RELATION_LABELS) as RelationType[]).map((type) => (
                  <option key={type} value={type}>{RELATION_LABELS[type]}</option>
                ))}
              </select>
              <input
                className="input w-full text-xs"
                placeholder="Подпись (необязательно)"
                defaultValue={(selectedEdge.data as EdgeData | undefined)?.rawLabel ?? ''}
                onBlur={(event) => onUpdateSelectedEdge({ label: event.target.value })}
              />
            </>
          )}
        </div>
      )}
    </div>
  );
}
