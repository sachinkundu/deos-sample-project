interface Env {
  DB: D1Database;
  BODIES: R2Bucket;
  ASSETS: Fetcher;
  TEST_GATES?: {
    afterReservation?: (id: string) => Promise<void>;
    afterPut?: (id: string) => Promise<void>;
    beforeActivation?: (id: string) => Promise<void>;
  };
}
