export interface ConfirmerInterface {
  isActive: Boolean
  message: String
  handleOnConfirm: Function
  handleOnCancel: Function
  activate({
    message,
    onConfirm,
    onCancel,
  }: {
    message: String
    onConfirm: Function
    onCancel: Function
  }): void
  inactivate(): void
}
