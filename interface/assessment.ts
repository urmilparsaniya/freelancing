export interface AssessmentInterface {
  title: string;
  date: string;
  location: string;
  details: string;
  image_id: number | null;
  unit_id: number;
  status: number;
  method_id: number;
}