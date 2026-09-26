export type TrackScore = { name: string; score: number; cases: number };

export type PublishedRun = {
  id: string;
  rank: number;
  modelName: string;
  modelId: string;
  organization: string;
  score: number;
  caseWeightedScore: number;
  coverage: number;
  datasetVersion: string;
  judgeProfile: string;
  publishedAt: string;
  tracks: TrackScore[];
};

export type PrivateRun = PublishedRun & {
  status: string;
  completedCases: number;
  totalCases: number;
  errors: number;
};
