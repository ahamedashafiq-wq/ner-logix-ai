import type { FieldReport } from '@/types'

const DB_NAME = 'ner-logix-offline-v2'
const STORE = 'field-reports'
const LOCAL_STORAGE_KEY = 'ner_logix_offline_reports'

function isIndexedDbAvailable(): boolean {
  return typeof window !== 'undefined' && 'indexedDB' in window
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!isIndexedDbAvailable()) {
      reject(new Error('IndexedDB not supported in this environment'))
      return
    }
    const request = indexedDB.open(DB_NAME, 2)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id' })
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

// Fallback localStorage implementation
function getLocalStorageReports(): FieldReport[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function setLocalStorageReports(reports: FieldReport[]): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(reports))
  } catch {}
}

export async function queueFieldReport(report: FieldReport): Promise<void> {
  const preparedReport: FieldReport = {
    ...report,
    synced: false,
    syncState: 'pending',
  }

  try {
    const db = await openDb()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite')
      tx.objectStore(STORE).put(preparedReport)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  } catch {
    // Fallback to localStorage
    const current = getLocalStorageReports()
    const index = current.findIndex((r) => r.id === report.id)
    if (index >= 0) current[index] = preparedReport
    else current.unshift(preparedReport)
    setLocalStorageReports(current)
  }
}

export async function listQueuedReports(): Promise<FieldReport[]> {
  try {
    const db = await openDb()
    return await new Promise<FieldReport[]>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly')
      const request = tx.objectStore(STORE).getAll()
      request.onsuccess = () => resolve(request.result as FieldReport[])
      request.onerror = () => reject(request.error)
    })
  } catch {
    return getLocalStorageReports()
  }
}

export async function getPendingReportCount(): Promise<number> {
  const reports = await listQueuedReports()
  return reports.filter((r) => !r.synced || r.syncState === 'pending' || r.syncState === 'offline').length
}

export async function markReportsSyncedLocally(): Promise<FieldReport[]> {
  const queued = await listQueuedReports()
  const syncedList = queued.map((r) => ({ ...r, synced: true, syncState: 'synced' as const }))

  try {
    const db = await openDb()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite')
      syncedList.forEach((report) => tx.objectStore(STORE).put(report))
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  } catch {
    setLocalStorageReports(syncedList)
  }

  return syncedList
}
