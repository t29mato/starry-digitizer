import { ConfirmerInterface } from './confirmerInterface'

export class Confirmer implements ConfirmerInterface {
  isActive: Boolean = false
  message: String = ''

  handleOnConfirm: Function = () => {}
  handleOnCancel: Function = () => {}

  private static instance: ConfirmerInterface

  private constructor() {}

  static getInstance(): ConfirmerInterface {
    if (!this.instance) {
      this.instance = new Confirmer()
    }

    return this.instance
  }

  activate({
    message,
    onConfirm,
    onCancel,
  }: {
    message: String
    onConfirm: Function
    onCancel: Function
  }): void {
    this.message = message
    this.handleOnConfirm = onConfirm
    this.handleOnCancel = onCancel
    this.isActive = true
  }

  inactivate(): void {
    this.message = ''
    this.handleOnConfirm = () => {}
    this.handleOnCancel = () => {}
    this.isActive = false
  }
}
