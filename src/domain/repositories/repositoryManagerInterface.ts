export interface RepositoryManagerInterface<T> {
  getInstance(): T
  getNewInstance(): T
}
