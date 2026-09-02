import { NotificationType, NotifierInterface } from './notifierInterface'

// INFO: A simple, reusable toast/snackbar notification service (issue #281).
// A single instance is shared app-wide via instanceStore/applicationServiceInstances.ts
// and rendered by presentation/components/Generals/NotificationSnackbar.vue,
// following the same singleton + dumb-view pattern as Confirmer/ConfirmerBar.
export class Notifier implements NotifierInterface {
  isActive = false
  message = ''
  type: NotificationType = 'info'

  notify(message: string, type: NotificationType = 'info'): void {
    this.message = message
    this.type = type
    this.isActive = true
  }

  success(message: string): void {
    this.notify(message, 'success')
  }

  error(message: string): void {
    this.notify(message, 'error')
  }

  info(message: string): void {
    this.notify(message, 'info')
  }

  warning(message: string): void {
    this.notify(message, 'warning')
  }

  inactivate(): void {
    this.isActive = false
  }
}
