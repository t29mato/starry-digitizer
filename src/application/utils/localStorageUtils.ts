import { LOCAL_STORAGE_GLOBAL_KEY } from '@/constants/constants'

//TODO: どうテストする？

const addLocalStorageData = (key: string, value: string): void => {
  const storageData: string =
    localStorage.getItem(LOCAL_STORAGE_GLOBAL_KEY) || '{}'

  const storageDataObject = JSON.parse(storageData)

  storageDataObject[key] = value

  localStorage.setItem(
    LOCAL_STORAGE_GLOBAL_KEY,
    JSON.stringify(storageDataObject),
  )
}

const removeLocalStorageData = (key: string): void => {
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

const getLocalStorageDataByKey = (key: string): string => {
  //TODO: テスト時にエラー回避するためのworkaround しかるべき方針を考える
  if (typeof localStorage !== 'object') {
    return ''
  }

  const storageData: string | null = localStorage.getItem(
    LOCAL_STORAGE_GLOBAL_KEY,
  )

  if (storageData === null) {
    console.warn(
      `tried to get data of '${key}' from localstorage, but localstorage is not initialized yet.`,
    )
    return ''
  }

  return JSON.parse(storageData)[key] || ''
}

export { addLocalStorageData, removeLocalStorageData, getLocalStorageDataByKey }
