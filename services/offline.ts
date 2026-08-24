import type { FieldReport } from '@/types'

const DB_NAME = 'ner-logix-offline'
const STORE = 'field-reports'

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'id' })
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export async function queueFieldReport(report: FieldReport): Promise<void> {
  const db = await openDb()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).put({ ...report, synced: false, syncState: 'pending' })
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function listQueuedReports(): Promise<FieldReport[]> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly')
    const request = tx.objectStore(STORE).getAll()
    request.onsuccess = () => resolve(request.result as FieldReport[])
    request.onerror = () => reject(request.error)
  })
}

export async function markReportsSyncedLocally(): Promise<FieldReport[]> {
  const queued = await listQueuedReports()
  const db = await openDb()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    queued.forEach((report) => tx.objectStore(STORE).put({ ...report, synced: true, syncState: 'synced' }))
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
  return queued.map((report) => ({ ...report, synced: true, syncState: 'synced' as const }))
}
