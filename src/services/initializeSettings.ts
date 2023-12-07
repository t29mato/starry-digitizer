import { useSettingsStore } from '@/store/settings'

const LOCAL_STORAGE_GLOBAL_KEY = 'starryDigitizer'

export const initializeSettings = () => {
  const storageData: string | null = localStorage.getItem(
    LOCAL_STORAGE_GLOBAL_KEY,
  )

  if (storageData === null) {
    return
  }

  const storageDataObject = JSON.parse(storageData)

  const { setIsInterpolatorEnabled } = useSettingsStore()

  if (storageDataObject.isInterpolatorEnabled === 'true') {
    setIsInterpolatorEnabled(true)
  } else if (storageDataObject.isInterpolatorEnabled === 'false') {
    setIsInterpolatorEnabled(false)
  }
}
