export interface AssessmentNotesInterface {
  id: number;
  assessment_id: number;
  user_id: number;
  uploaded_by: number; // 1=assessor, 2=learner, 3=eqa, 4=iqa, 5=admin, 6=supre admmin
  feedback: string;
  is_main_assessment_note: boolean;
  cycle: number;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date;
  status: number;
}