# Mint AI: architecture and QA map

Mint AI's property assessment is a **photo-based triage and evidence workflow**, not a survey, safety certificate, contractor quote, or signed tenancy inspection. The useful output is what the photos appear to show, what could not be verified, and the next human action.

| Layer | Entry point and responsibility |
| --- | --- |
| Public demo | `/try-mint-ai` sends up to three images to `/api/building-surveyor/demo`. It runs the building surveyor service directly and can save a demo result and feedback. It is not evidence that the signed-in path behaves identically. |
| Signed-in capture | Mobile uploads via the server to private assessment-photo storage, then calls `/api/building-surveyor/assess`. The route validates images, checks linked property/job access and AI spend, and routes to observation-first or the configured hybrid path. `/api/assessments/walkthrough` selects and assesses frames rather than treating the video as one image. |
| Evidence and reasoning | The code supports Roboflow/YOLO detections and optional SAM3 segmentation as supporting evidence, with vision model reasoning and a hybrid routing layer. The actual path depends on the input and deployment settings; the presence of code or a flag is not proof that a model is serving production traffic. |
| Records and human review | Supabase holds assessment data and private evidence. Property **Assessments** shows the result and review state; inspection activity and expert review are separate from the original AI result. **Arrange inspection** currently hands off the property, not the specific finding, to the job form. |
| Learning | Teacher/student, corrections and evaluation code exists, but the beta reuse policy explicitly disables operational assessment training and cross-assessment memory reuse. Do not change that policy to run functional tests. Use curated or synthetic evidence. |

## Next QA and product step

Test the demo, signed-in still-photo path and walkthrough separately with an isolated fixture set: clear visible issue, blank/blurred frame, non-building photo, explicitly flagged hazard and unavailable model. Record the response state, model path (where observable), evidence coverage, displayed metrics and whether the proposed next action matches the evidence. A missing result is not a valid cost, severity, confidence or safety value. Compare selected cases with independently reviewed findings before making accuracy claims.

Once that behaviour is consistent, let authorised property staff create an internal maintenance follow-up from a reviewed finding. Carry the property, room, evidence reference and recommended next action; let staff set priority and ownership. Keep the AI result, human decision, and actual repair outcome distinct.
