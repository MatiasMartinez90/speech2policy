import { memo } from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Section } from '../hooks/useSections'

interface SortableItemProps {
  section: Section
  onEdit: () => void
  onDelete: () => void
}

function SortableItem({ section, onEdit, onDelete }: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: section.section_id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-slate-800/40 border border-slate-700/50 rounded-lg p-4 hover:border-slate-600 transition-colors"
    >
      <div className="flex items-center gap-4">
        {/* Drag Handle */}
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-300"
          title="Arrastra para reordenar"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
          </svg>
        </button>

        {/* Section Info */}
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <span className="px-2 py-1 bg-green-500/20 text-green-300 text-xs rounded-full font-medium">
              {section.order}
            </span>
            <h3 className="text-white font-medium">{section.title}</h3>
          </div>
          {section.estimated_time && (
            <p className="text-sm text-gray-400 mt-1">⏱️ {section.estimated_time}</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center space-x-2">
          <button
            onClick={onEdit}
            className="p-2 text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 rounded-lg transition-colors"
            title="Editar"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <button
            onClick={onDelete}
            className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
            title="Eliminar"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}

interface SortableSectionsListProps {
  sections: Section[]
  onDragEnd: (event: DragEndEvent) => void
  onEdit: (section: Section) => void
  onDelete: (sectionId: number) => void
}

function SortableSectionsList({ sections, onDragEnd, onEdit, onDelete }: SortableSectionsListProps) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  return (
    <div className="p-6 space-y-3">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={onDragEnd}
      >
        <SortableContext
          items={sections.map(s => s.section_id)}
          strategy={verticalListSortingStrategy}
        >
          {sections.map((section) => (
            <SortableItem
              key={section.section_id}
              section={section}
              onEdit={() => onEdit(section)}
              onDelete={() => onDelete(section.section_id)}
            />
          ))}
        </SortableContext>
      </DndContext>
    </div>
  )
}

// Memoize to prevent re-renders during drag operations
export default memo(SortableSectionsList)
