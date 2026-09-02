export type NotificationType = 'success' | 'error' | 'info' | 'warning'

export interface NotifierInterface {
  isActive: boolean
  message: string
  type: NotificationType
  notify(message: string, type?: NotificationType): void
  success(message: string): void
  error(message: string): void
  info(message: string): void
  warning(message: string): void
  inactivate(): void
}
