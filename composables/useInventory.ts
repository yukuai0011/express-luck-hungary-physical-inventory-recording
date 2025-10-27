import { ref, onMounted } from 'vue'
import { readTextFile, writeTextFile, exists, create, BaseDirectory } from '@tauri-apps/plugin-fs'

export type InventoryItem = {
  id: string
  sku: string
  quantity: number
  location?: string
  timestamp: string
}

const DIR = 'ExpressLuckInventory'
const FILE = `${DIR}/inventory.json`

export function useInventory() {
  const items = useState<InventoryItem[]>('inventory-items', () => [])
  const ready = useState<boolean>('inventory-ready', () => false)

  async function ensureStore() {
    if (!(await exists(DIR, { dir: BaseDirectory.AppData }))) {
      await create(DIR, { dir: BaseDirectory.AppData, recursive: true })
    }
    if (!(await exists(FILE, { dir: BaseDirectory.AppData }))) {
      await writeTextFile(FILE, '[]', { dir: BaseDirectory.AppData })
    }
  }

  async function load() {
    try {
      await ensureStore()
      const txt = await readTextFile(FILE, { dir: BaseDirectory.AppData })
      const parsed = JSON.parse(txt) as InventoryItem[]
      items.value = parsed
    } catch (err) {
      console.error('Failed to load inventory', err)
      items.value = []
    } finally {
      ready.value = true
    }
  }

  async function persist() {
    try {
      await ensureStore()
      await writeTextFile(FILE, JSON.stringify(items.value, null, 2), { dir: BaseDirectory.AppData })
    } catch (err) {
      console.error('Failed to save inventory', err)
    }
  }

  function addItem(data: Omit<InventoryItem, 'id' | 'timestamp'>) {
    const id = crypto.randomUUID()
    const timestamp = new Date().toISOString()
    items.value.unshift({ id, timestamp, ...data })
    void persist()
  }

  function removeItem(id: string) {
    items.value = items.value.filter((x) => x.id !== id)
    void persist()
  }

  async function exportAll() {
    // Export to Downloads as CSV
    const header = 'id,sku,quantity,location,timestamp' 
    const rows = items.value.map((i) => [i.id, i.sku, i.quantity, i.location ?? '', i.timestamp].join(','))
    const csv = [header, ...rows].join('\n')
    const filename = `${DIR}/inventory-export-${new Date().toISOString().slice(0,19).replace(/[:T]/g,'-')}.csv`
    try {
      await create(DIR, { dir: BaseDirectory.Download, recursive: true })
      await writeTextFile(filename, csv, { dir: BaseDirectory.Download })
      return true
    } catch (err) {
      console.error('Failed to export inventory', err)
      return false
    }
  }

  if (process.client) {
    onMounted(() => { void load() })
  }

  return { items, ready, addItem, removeItem, exportAll, load }
}
