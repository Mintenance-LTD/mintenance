# ML tooling validation and training hold

The November 1 scheduled run failed before training: its dependency manifest and report generator
were absent. Seventeen additional requirements files and helper scripts referenced by that
orchestration path are also unimplemented.

The scheduled workflow now performs offline source validation and retains an HTML readiness report.
Its name explicitly says **Training Held**. It has no service credentials, live dataset reads, GPU
jobs, training, model uploads, A/B changes, production deployment or rollback path. Manual dispatch
has the same limited scope. The requirements manifest is standard-library-only for this job, not a
claim that the existing trainer can run without its own ML environment.

The report lists missing legacy prerequisites and distinguishes source-validation failure from the
training hold. Source is parsed, never imported or executed. Failure still retains the report and
fails the job. Passing verifies tooling only.

Before any future training workflow, follow `docs/MINT_AI_CONTINUATION.md`: approve data permissions
and reviewed splits, implement and test model-specific helpers and dependencies, establish
independent evaluation thresholds, and obtain separate authorization for training and deployment. Do
not restore the old credential-bearing workflow or fill its gaps with fabricated metrics.
