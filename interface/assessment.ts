export interface AssessmentInterface {
  id?: number;
  title: string;
  date: string;
  location: string;
  details: string;
  status: number;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date;
}