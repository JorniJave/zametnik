import { useEffect, useRef, useCallback } from 'react';
import { EditorView, keymap, lineNumbers, highlightActiveLine, highlightActiveLineGutter, Decoration, ViewPlugin, ViewUpdate } from '@codemirror/view';
import { EditorState, Compartment } from '@codemirror/state';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { autocompletion, completionKeymap, CompletionContext } from '@codemirror/autocomplete';
import { syntaxHighlighting, defaultHighlightStyle } from '@codemirror/language';
import { useAppStore } from '../store/useAppStore';

const themeCompartment = new Compartment();
const completeCompartment = new Compartment();

const darkTheme = EditorView.theme({
  '&': { backgroundColor: 'var(--bg-panel)', color: 'var(--text-primary)' },
  '.cm-content': { caretColor: 'var(--accent)' },
  '&.cm-focused .cm-cursor': { borderLeftColor: 'var(--accent)' },
  '&.cm-focused .cm-selectionBackground, .cm-selectionBackground': {
    backgroundColor: 'rgba(124, 158, 255, 0.2) !important',
  },
}, { dark: true });

const lightTheme = EditorView.theme({
  '&': { backgroundColor: 'var(--bg-panel)', color: 'var(--text-primary)' },
}, { dark: false });

const wikiLinkMark = Decoration.mark({ class: 'wiki-link' });

/** Функция `wikiLinkHighlighter`. */
function wikiLinkHighlighter() {
  const wikiRe = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;
  return ViewPlugin.fromClass(
    class {
      decorations = Decoration.none;
      /** Функция `constructor`. */
      constructor(view: EditorView) {
        this.decorations = this.build(view);
      }
      /** Функция `update`. */
      update(u: ViewUpdate) {
        if (u.docChanged || u.viewportChanged) {
          this.decorations = this.build(u.view);
        }
      }
      /** Функция `build`. */
      build(view: EditorView) {
        const widgets: ReturnType<typeof wikiLinkMark.range>[] = [];
        for (const { from, to } of view.visibleRanges) {
          const text = view.state.doc.sliceString(from, to);
          let m: RegExpExecArray | null;
          const re = new RegExp(wikiRe.source, 'g');
          while ((m = re.exec(text)) !== null) {
            widgets.push(wikiLinkMark.range(from + m.index, from + m.index + m[0].length));
          }
        }
        return Decoration.set(widgets, true);
      }
    },
    { decorations: (v) => v.decorations }
  );
}

/** Функция `createWikiCompleter`. */
function createWikiCompleter(noteTitles: string[]) {
  return (context: CompletionContext) => {
    const before = context.matchBefore(/\[\[[^\]]*/);
    if (!before) return null;
    if (before.text === '[[' || before.text.startsWith('[[')) {
      const query = before.text.slice(2).toLowerCase();
      const options = noteTitles
        .filter((t) => t.toLowerCase().includes(query))
        .slice(0, 15)
        .map((label) => ({
          label,
          type: 'reference' as const,
          apply: `${label}]]`,
        }));
      return { from: before.from + 2, options, validFor: /^[^\]]*$/ };
    }
    return null;
  };
}

interface Props {
  content: string;
  noteId: string;
  onChange: (content: string) => void;
  onSave: (content: string) => void;
  compact?: boolean;
}

/** Функция `MarkdownEditor`. */
export function MarkdownEditor({ content, noteId, onChange, onSave, compact }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const notes = useAppStore((s) => s.notes);
  const settings = useAppStore((s) => s.settings);
  const noteTitles = Object.values(notes).map((n) => n.title).join('\n');

  const handleSave = useCallback(
    (text: string) => {
      onChange(text);
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => onSave(text), 800);
    },
    [onChange, onSave]
  );

  useEffect(() => {
    if (!containerRef.current) return;

    /** Функция `toggleCheckboxAt`. */
    const toggleCheckboxAt = (view: EditorView, pos: number) => {
      const line = view.state.doc.lineAt(pos);
      const match = line.text.match(/^(\s*[-*+]\s+)\[([ xX])\]/);
      if (!match) return false;
      const boxFrom = line.from + match[1].length;
      const boxTo = boxFrom + match[0].length - match[1].length;
      if (pos < boxFrom || pos > boxTo) return false;
      const mark = match[2].toLowerCase() === 'x' ? ' ' : 'x';
      const next = `${match[1]}[${mark}]${line.text.slice(match[0].length)}`;
      view.dispatch({ changes: { from: line.from, to: line.to, insert: next } });
      handleSave(view.state.doc.toString());
      return true;
    };

    /** Функция `openWikiLinkAt`. */
    const openWikiLinkAt = (view: EditorView, pos: number) => {
      const line = view.state.doc.lineAt(pos);
      const wikiRe = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;
      let m: RegExpExecArray | null;
      while ((m = wikiRe.exec(line.text)) !== null) {
        const start = line.from + m.index;
        const end = start + m[0].length;
        if (pos < start || pos > end) continue;
        const id = m[1].trim().toLowerCase().replace(/[\\/:*?"<>|]/g, '-');
        const store = useAppStore.getState();
        const kind = store.notes[id]?.type;
        void store.openNote(id);
        store.setViewMode(kind === 'daily' ? 'today' : 'notes');
        return true;
      }
      return false;
    };

    const titles = Object.values(useAppStore.getState().notes).map((n) => n.title);
    const state = EditorState.create({
      doc: content,
      extensions: [
        lineNumbers(),
        highlightActiveLine(),
        highlightActiveLineGutter(),
        history(),
        markdown({ base: markdownLanguage }),
        syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
        themeCompartment.of(settings?.theme === 'light' ? lightTheme : darkTheme),
        wikiLinkHighlighter(),
        completeCompartment.of(autocompletion({ override: [createWikiCompleter(titles)] })),
        keymap.of([
          ...defaultKeymap,
          ...historyKeymap,
          ...completionKeymap,
          indentWithTab,
          {
            key: 'Mod-Enter',
            run: (view) => {
              const line = view.state.doc.lineAt(view.state.selection.main.head);
              const match = line.text.match(/^(\s*[-*+]\s+)\[([ xX])\](\s+.*)$/);
              if (!match) return false;
              const mark = match[2].toLowerCase() === 'x' ? ' ' : 'x';
              view.dispatch({
                changes: { from: line.from, to: line.to, insert: `${match[1]}[${mark}]${match[3]}` },
              });
              handleSave(view.state.doc.toString());
              return true;
            },
          },
          {
            key: 'Mod-s',
            run: (view) => {
              onSave(view.state.doc.toString());
              return true;
            },
          },
        ]),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            handleSave(update.state.doc.toString());
          }
        }),
        EditorView.domEventHandlers({
          mousedown(event, view) {
            if (!(event.ctrlKey || event.metaKey)) return false;
            const pos = view.posAtCoords({ x: event.clientX, y: event.clientY });
            if (pos == null) return false;
            return openWikiLinkAt(view, pos);
          },
          click(event, view) {
            if (event.ctrlKey || event.metaKey) return false;
            const pos = view.posAtCoords({ x: event.clientX, y: event.clientY });
            if (pos == null) return false;
            return toggleCheckboxAt(view, pos);
          },
        }),
      ],
    });

    const view = new EditorView({ state, parent: containerRef.current });
    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
  }, [noteId]);

  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const current = view.state.doc.toString();
    if (current !== content) {
      view.dispatch({
        changes: { from: 0, to: current.length, insert: content },
      });
    }
  }, [content, noteId]);

  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const titles = noteTitles.split('\n').filter(Boolean);
    view.dispatch({
      effects: completeCompartment.reconfigure(
        autocompletion({ override: [createWikiCompleter(titles)] })
      ),
    });
  }, [noteTitles]);

  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    view.dispatch({
      effects: themeCompartment.reconfigure(settings?.theme === 'light' ? lightTheme : darkTheme),
    });
  }, [settings?.theme]);

  return (
    <div
      ref={containerRef}
      className={`h-full w-full overflow-hidden ${compact ? 'workspace-editor-compact' : ''}`}
    />
  );
}
