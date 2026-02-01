
import { useBubbleStore, type Bubble } from './bubbleStore'

export interface BubbleDataExport {
    schemaVersion: number
    exportedAt: string
    appVersion?: string
    bubbles: Bubble[]
}

export function exportBubbles() {
    const bubbles = useBubbleStore.getState().bubbles
    const data: BubbleDataExport = {
        schemaVersion: 1,
        exportedAt: new Date().toISOString(),
        bubbles,
    }

    const jsonString = JSON.stringify(data, null, 2)
    const blob = new Blob([jsonString], { type: 'application/json' })
    const url = URL.createObjectURL(blob)

    const a = document.createElement('a')
    a.href = url
    a.download = `bubbles-export-${new Date().toISOString().slice(0, 10)}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
}

export async function importBubbles(file: File): Promise<{ success: boolean; message: string }> {
    try {
        const text = await file.text()
        const data = JSON.parse(text) as BubbleDataExport

        // Basic Validation
        if (data.schemaVersion !== 1) {
            return { success: false, message: `Unsupported schema version: ${data.schemaVersion}` }
        }
        if (!Array.isArray(data.bubbles)) {
            return { success: false, message: 'Invalid file format: bubbles array missing' }
        }

        // Replace All Strategy
        // We need a way to replace all bubbles. The store currently has add/update/delete.
        // I should probably add a `setBubbles` action to the store or just clear and add.
        // Ideally update the store to have a `loadBubbles` action.
        // For now, let's see if we can iterate delete or just forcefully set state if zustand allows easy access,
        // but best practice is to add an action.
        // I will assume I need to add `setBubbles` to the store in the next step.

        // For now, I will use the store's current methods or plan to update it.
        // Let's assume I will update store to have `replaceAllBubbles`.

        useBubbleStore.getState().replaceAllBubbles(data.bubbles)

        return { success: true, message: `Successfully imported ${data.bubbles.length} bubbles` }
    } catch (error) {
        console.error(error)
        return { success: false, message: 'Failed to parse JSON file' }
    }
}
