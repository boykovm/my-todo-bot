export interface Todo {
  id: number;
  text: string;
  notificationTime: string;
  deleted: boolean;
  isDone: boolean;
  deadline: string;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
}
