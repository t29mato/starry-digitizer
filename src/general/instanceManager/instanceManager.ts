import { InstanceManagerInterface } from './instanceManagerInterface'

export class InstanceManager<T> implements InstanceManagerInterface<T> {
  private instance: T | null = null

  // INFO: Always return the same instance
  public getInstance(instanceCreator: () => T): T {
    if (!this.instance) {
      this.instance = instanceCreator()
    }

    return this.instance
  }

  // INFO: Create a new instance for unit test
  public getNewInstance(instanceCreator: () => T): T {
    return instanceCreator()
  }
}
