export interface ActivityInterface {
  id: number;
  user_id: number;
  activity: string;
  activity_status: string;
  center_id: number;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date;
}
