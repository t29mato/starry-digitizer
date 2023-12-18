import { LOCAL_STORAGE_GLOBAL_KEY } from '@/constants/constants'

const initializeStorageData = () => {
  localStorage.setItem(LOCAL_STORAGE_GLOBAL_KEY, '')
}

const addLocalStorageData = (key: string, value: string) => {
  const storageData: string | null = localStorage.getItem(
    LOCAL_STORAGE_GLOBAL_KEY,
  )

  if (storageData === null) {
    initializeStorageData()
    return
  }

  const storageDataObject = JSON.parse(storageData)

  storageDataObject[key] = value

  localStorage.setItem(
    LOCAL_STORAGE_GLOBAL_KEY,
    JSON.stringify(storageDataObject),
  )
}

const removeLocalStorageData = (key: string) => {
  const storageData: string | null = localStorage.getItem(
    LOCAL_STORAGE_GLOBAL_KEY,
  )

  if (storageData === null) {
    return
  }

  const storageDataObject = JSON.parse(storageData)

  delete storageDataObject[key]

  localStorage.setItem(
    LOCAL_STORAGE_GLOBAL_KEY,
    JSON.stringify(storageDataObject),
  )
}

export { addLocalStorageData, removeLocalStorageData }
