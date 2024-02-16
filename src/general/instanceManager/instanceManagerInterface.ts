export interface InstanceManagerInterface<T> {
  getInstance(instanceCreator: () => T): T
  getNewInstance(instanceCreator: () => T): T
}
