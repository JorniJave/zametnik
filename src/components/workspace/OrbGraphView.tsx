import { useEffect, useMemo, useRef, useState } from 'react';
import ForceGraph2D, { type ForceGraphMethods } from 'react-force-graph-2d';
import { useAppStore } from '../../store/useAppStore';
import { filteredGraph, scopeGraph } from '../../lib/graphHighlight';
import { accentHex, mutedHex } from '../../lib/palette';
import { getWeekLabel } from '../../lib/parser';
import { getAPI } from '../../lib/api';
import type { PaneMenuState } from './workspaceTypes';
import { buildOrbGraphData, paintOrbNode, type OrbLink, type OrbNode } from './orbGraphUtils';
import { CanvasContextMenu } from './CanvasContextMenu';

interface OrbGraphViewProps {
  focusNoteId: string | null;
  boardSearch: string;
  onFocusNode: (noteId: string) => void;
  onOpenPicker: () => void;
  onPaneContextMenu: (event: React.MouseEvent) => void;
  paneMenu: PaneMenuState | null;
  onClosePaneMenu: () => void;
}

type NodeMenu = { x: number; y: number; id: string; name: string };

const NO_HIDDEN: string[] = [];

/** Темы как кружки. Клик по теме открывает только её связи, не общую свалку. */
export function OrbGraphView({
  focusNoteId,
  boardSearch,
  onFocusNode,
  onOpenPicker,
  onPaneContextMenu,
  paneMenu,
  onClosePaneMenu,
}: OrbGraphViewProps) {
  const graph = useAppStore((s) => s.graph);
  const notes = useAppStore((s) => s.notes);
  const graphFilter = useAppStore((s) => s.graphFilter);
  const theme = useAppStore((s) => s.settings?.theme);
  const weekStartsOn = useAppStore((s) => s.settings?.weekStartsOn ?? 1);
  const hiddenIds = useAppStore((s) => s.workspace?.hiddenNoteIds) ?? NO_HIDDEN;
  const openNote = useAppStore((s) => s.openNote);
  const setViewMode = useAppStore((s) => s.setViewMode);
  const createLinkedNote = useAppStore((s) => s.createLinkedNote);
  const hideGraphNote = useAppStore((s) => s.hideGraphNote);
  const deleteNote = useAppStore((s) => s.deleteNote);
  const wrapRef = useRef<HTMLDivElement>(null);
  const positions = useRef(new Map<string, { x: number; y: number }>());
  const graphRef = useRef<ForceGraphMethods | undefined>(undefined);
  const menuOpenAtRef = useRef(0);
  const [size, setSize] = useState({ w: 800, h: 600 });
  const [nodeMenu, setNodeMenu] = useState<NodeMenu | null>(null);

  useEffect(() => {
    if (paneMenu) menuOpenAtRef.current = Date.now();
  }, [paneMenu]);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      setSize({ w: el.clientWidth, h: el.clientHeight });
    });
    ro.observe(el);
    setSize({ w: el.clientWidth, h: el.clientHeight });
    return () => ro.disconnect();
  }, []);

  const orbData = useMemo(() => {
    const weekTitle = getWeekLabel(new Date(), weekStartsOn);
    const filtered = filteredGraph(graph, notes, graphFilter, weekTitle);
    const scoped = scopeGraph(filtered, notes, focusNoteId, hiddenIds, boardSearch);
    return buildOrbGraphData(scoped, notes, focusNoteId, positions.current);
  }, [graph, notes, graphFilter, focusNoteId, weekStartsOn, theme, hiddenIds, boardSearch]);

  useEffect(() => {
    const timer = window.setTimeout(() => graphRef.current?.zoomToFit(400, 80), 60);
    return () => window.clearTimeout(timer);
  }, [orbData]);

  const focusTitle = focusNoteId ? notes[focusNoteId]?.title : '';
  const hint = focusNoteId
    ? `Тема «${focusTitle || focusNoteId}». Правый клик по кружку — заметка внутри темы, убрать или удалить.`
    : 'Это темы, не все дни сразу. Клик — открыть тему. Колёсико — отдалить. Правый клик — создать тему.';

  const openText = (id: string) => {
    if (!notes[id]) return;
    void openNote(id);
    setViewMode(notes[id]?.type === 'daily' ? 'today' : 'notes');
  };

  const createInPlace = async () => {
    onClosePaneMenu();
    setNodeMenu(null);
    const title = window.prompt(focusNoteId ? 'Название заметки в этой теме' : 'Название новой темы');
    if (!title?.trim()) return;
    if (focusNoteId && notes[focusNoteId]) {
      await createLinkedNote(focusNoteId, title.trim());
      return;
    }
    const note = await getAPI().createNote(title.trim(), 'Проекты');
    await useAppStore.getState().refreshVault();
    onFocusNode(note.id);
  };

  return (
    <div
      ref={wrapRef}
      className="orb-graph-view flex-1 min-h-0 relative"
      onContextMenu={onPaneContextMenu}
    >
      {focusNoteId && (
        <button type="button" className="orb-back-btn" onClick={() => onFocusNode('')}>
          Все темы
        </button>
      )}
      <button
        type="button"
        className="orb-fit-btn"
        onClick={() => graphRef.current?.zoomToFit(400, 60)}
      >
        Показать всё
      </button>
      {orbData.nodes.length > 0 ? (
        <ForceGraph2D
          ref={graphRef}
          width={size.w}
          height={size.h}
          graphData={orbData}
          minZoom={0.02}
          maxZoom={6}
          nodeLabel={(n) => (n as OrbNode).name}
          nodeCanvasObject={(node, ctx, globalScale) => {
            paintOrbNode(node as OrbNode, ctx, globalScale);
          }}
          nodePointerAreaPaint={(node, color, ctx) => {
            const n = node as OrbNode;
            if (n.x == null || n.y == null) return;
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(n.x, n.y, n.val + 6, 0, 2 * Math.PI);
            ctx.fill();
          }}
          linkColor={(link) => ((link as OrbLink).orphan ? mutedHex() : accentHex())}
          linkLineDash={(link) => ((link as OrbLink).orphan ? [4, 4] : null)}
          linkWidth={1.2}
          cooldownTicks={40}
          onEngineStop={() => {
            for (const node of orbData.nodes) {
              if (node.x != null && node.y != null) positions.current.set(node.id, { x: node.x, y: node.y });
            }
            graphRef.current?.zoomToFit(400, 80);
            graphRef.current?.pauseAnimation();
          }}
          onNodeDragEnd={(node) => {
            const n = node as OrbNode;
            if (n.x != null && n.y != null) positions.current.set(n.id, { x: n.x, y: n.y });
          }}
          onNodeClick={(node) => {
            onClosePaneMenu();
            setNodeMenu(null);
            const n = node as OrbNode;
            if (focusNoteId === n.id) {
              openText(n.id);
              return;
            }
            onFocusNode(n.id);
          }}
          onNodeRightClick={(node, event) => {
            const mouse = event as MouseEvent;
            mouse.preventDefault?.();
            onClosePaneMenu();
            const n = node as OrbNode;
            setNodeMenu({ x: mouse.clientX, y: mouse.clientY, id: n.id, name: n.name });
          }}
          onBackgroundClick={() => {
            onClosePaneMenu();
            setNodeMenu(null);
            onFocusNode('');
          }}
          onZoom={() => {
            if (paneMenu && Date.now() - menuOpenAtRef.current > 200) onClosePaneMenu();
          }}
        />
      ) : (
        <div className="orb-graph-empty">{boardSearch ? 'Ничего не нашлось.' : 'Тем пока нет. Правый клик — создать первую.'}</div>
      )}

      <p className="orb-graph-hint">{hint}</p>

      {paneMenu && !nodeMenu && (
        <CanvasContextMenu x={paneMenu.x} y={paneMenu.y} onClose={onClosePaneMenu} className="min-w-[220px]">
          <button type="button" className="ctx-item" onClick={() => void createInPlace()}>
            {focusNoteId ? 'Новая заметка в этой теме' : 'Новая тема'}
          </button>
          <button type="button" className="ctx-item" onClick={() => { onClosePaneMenu(); onOpenPicker(); }}>
            Привязать заметку, которая уже есть
          </button>
        </CanvasContextMenu>
      )}

      {nodeMenu && (
        <CanvasContextMenu x={nodeMenu.x} y={nodeMenu.y} onClose={() => setNodeMenu(null)} className="min-w-[220px]">
          <button type="button" className="ctx-item" onClick={() => { setNodeMenu(null); openText(nodeMenu.id); }}>
            Открыть текст
          </button>
          <button
            type="button"
            className="ctx-item"
            onClick={() => {
              const id = nodeMenu.id;
              setNodeMenu(null);
              onFocusNode(id);
              const title = window.prompt('Название заметки в этой теме');
              if (title?.trim()) void createLinkedNote(id, title.trim());
            }}
          >
            Новая заметка внутри
          </button>
          <button type="button" className="ctx-item" onClick={() => { const id = nodeMenu.id; setNodeMenu(null); void hideGraphNote(id); }}>
            Убрать с графа
          </button>
          <button
            type="button"
            className="ctx-item"
            onClick={() => {
              const id = nodeMenu.id;
              const name = nodeMenu.name;
              setNodeMenu(null);
              if (window.confirm(`Удалить «${name}» совсем? Файл тоже пропадёт.`)) void deleteNote(id);
            }}
          >
            Удалить совсем
          </button>
        </CanvasContextMenu>
      )}
    </div>
  );
}
