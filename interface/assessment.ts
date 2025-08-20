export interface AssessmentInterface {
  id?: number;
  title: string;
  date: string;
  location: string;
  details: string;
  status: number;
  assessor_id: number;
  center_id: number;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date;
}