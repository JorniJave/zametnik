import { useWorkspaceBoard } from './useWorkspaceBoard';
import { WorkspaceBoardsSidebar } from './WorkspaceBoardsSidebar';
import { WorkspaceToolbar } from './WorkspaceToolbar';
import { WorkspaceCanvas } from './WorkspaceCanvas';
import { WorkspaceModals } from './WorkspaceModals';
import { OrbGraphView } from './OrbGraphView';

/** Функция `VisualWorkspace`. */
export function VisualWorkspace() {
  const b = useWorkspaceBoard();
  const isOrbit = b.workspaceDisplayMode === 'orbit';

  return (
    <div className="flex flex-1 min-h-0">
      {b.showBoards && (
        <WorkspaceBoardsSidebar
          workspaceList={b.workspaceList}
          workspaceId={b.workspaceId}
          graphFilter={b.graphFilter}
          showAllNotes={b.showAllNotes}
          onLoadWorkspace={b.loadWorkspace}
          onCreateBoard={b.createBoard}
          onOpenPicker={() => b.setPickerOpen(true)}
          onAddTextCard={b.addTextCard}
          onShowAllNotesChange={b.setShowAllNotes}
          onGraphFilterChange={b.setGraphFilter}
        />
      )}
      <div className="knowledge-graph-pane relative flex-1 flex flex-col min-h-0">
        <WorkspaceToolbar
          title={b.workspace?.title}
          boardSearch={b.boardSearch}
          showBoards={b.showBoards}
          relationType={b.relationType}
          linkMode={b.linkMode}
          canUndo={b.canUndo}
          canRedo={b.canRedo}
          saveState={b.saveState}
          workspaceId={b.workspaceId}
          displayMode={b.workspaceDisplayMode}
          onRenameBoard={b.renameBoard}
          onBoardSearchChange={b.setBoardSearch}
          onToggleBoards={() => b.setShowBoards((v) => !v)}
          onRelationTypeChange={b.setRelationType}
          onToggleLinkMode={() => {
            b.setLinkMode((v) => !v);
            b.setLinkSourceId(b.selectedId);
          }}
          onUndo={b.handleUndo}
          onRedo={b.handleRedo}
          onSave={() => void b.persist(b.nodes, b.edges)}
          onRemoveBoard={b.removeBoard}
          onShowOrbit={b.backToOrbit}
          onShowCards={() => b.setWorkspaceDisplayMode('cards')}
        />
        {isOrbit ? (
          <OrbGraphView
            focusNoteId={b.workspaceFocusNoteId}
            boardSearch={b.boardSearch}
            onFocusNode={(id) => {
              if (id) b.setBoardSearch('');
              b.focusOrbNode(id);
            }}
            onOpenPicker={() => b.setPickerOpen(true)}
            paneMenu={b.paneMenu}
            onPaneContextMenu={b.handleOrbPaneContextMenu}
            onClosePaneMenu={b.closeMenus}
          />
        ) : (
          <WorkspaceCanvas
            canvasProps={b.canvasProps}
            nodes={b.nodes}
            selectedNodeIds={b.selectedIds}
            ctxMenu={b.ctxMenu}
            paneMenu={b.paneMenu}
            selectedEdge={b.selectedEdge}
            onContextAction={(action) => void b.handleContextAction(action)}
            onPaneMenuAction={b.handlePaneMenuAction}
            onPaneFlowPosition={b.updatePaneFlowPosition}
            onRemoveNodes={b.removeNodesFromBoard}
            onCloseMenus={b.closeMenus}
            onUpdateSelectedEdge={(patch) => void b.updateSelectedEdge(patch)}
            onRemoveSelectedEdge={() => void b.removeSelectedEdge()}
          />
        )}
      </div>
      <WorkspaceModals
        pickerOpen={b.pickerOpen}
        pickerSearch={b.pickerSearch}
        noteOptions={b.noteOptions}
        linkedModalOpen={b.linkedModalOpen}
        linkedFromNodeId={b.linkedFromNodeId}
        notes={b.notes}
        onPickerSearchChange={b.setPickerSearch}
        onClosePicker={b.closePicker}
        onLinkPick={b.handleLinkPick}
        onCloseLinkedModal={b.closeLinkedModal}
        onLinkedSubmit={b.handleLinkedSubmit}
      />
    </div>
  );
}
