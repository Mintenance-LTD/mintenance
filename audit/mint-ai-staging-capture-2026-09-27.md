# Mint AI staging verification — 27 September 2026

## Deployment

- Preview: https://mintenance-clean-gyg37ibvr-mintenance.vercel.app
- Vercel deployment: `dpl_HeEtXV2VJ5DGN4iz3mad7oMA3r1q`, READY.
- Capture gate enabled for this preview with `MINT_PHOTO_QUALITY_GATE_ENABLED=true`.
- Model unchanged: live response identified `gpt-4o-2024-08-06`.
- Build passed TypeScript, ESLint (0 errors, 825 existing warnings), and Next.js build.
- Production was not promoted. Training-script changes made after the upload are local.

## Authenticated live checks

The existing test admin signed in with MFA. Three new QA assessments were created under that
account, using two synthetic exposure fixtures and one existing public SDNET2018 development image.
None created a training-buffer entry.

| Case                           | Result                                                                         |
| ------------------------------ | ------------------------------------------------------------------------------ |
| Dark photo                     | HTTP 422; specific lighting instruction; saved `too_dark`, photo index 0       |
| Washed-out photo               | HTTP 422; specific glare/flash instruction; saved `overexposed`, photo index 0 |
| Readable sdnet-008 photo       | HTTP 200; assessment ready; no recapture; GPT-4o response                      |
| Repeat readable assessment     | HTTP 200; existing saved-result path                                           |
| Anonymous admin evaluation     | HTTP 401                                                                       |
| Authenticated admin evaluation | HTTP 200; historical review audit loaded                                       |

Saved status withheld the assessment for both rejected photos and included photo-specific recapture
guidance. Supabase MCP independently confirmed the saved capture reasons and
ready/insufficient-evidence states. The readable assessment remains `needs_review`; it has not been
approved by a surveyor.

The browser loaded the preview sign-in page. Authenticated workflow checks used the real API and
database; a full authenticated browser upload/click-through was not performed. Specific recapture
advice is wired into the shared and job-detail assessment display. The admin list and mobile job
card still have generic advice.

## Retained QA records (exclude from training/evaluation)

- Dark: `d9926a62-8dd9-4cb0-a702-f3cd206f0a6d`
- Washed-out: `b8107c60-65c0-4a83-8056-abf6be556dda`
- Readable public pilot: `7119b851-dbf7-4990-bb6b-0c5d250c1d86`

Source image: `sdnet-008`, SHA-256
`76bebaa2208ef9d812193f9e3ef5d85045dcfb6fcb7db6927143a898dd61c7a6`. SDNET2018, Maguire, Dorafshan &
Thomas (2018), CC BY 4.0. These records and private storage objects are retained for review, not
deleted. Machine-readable checks: `.vercel/qa-capture-results.json`,
`.vercel/qa-readable-result.json`.

## Training safeguards added locally

The bootstrap exporter now splits by property, merging properties sharing an image URL, and fails
without property provenance or two independent groups. Signed URL token rotation does not create a
different image identity. It writes a split manifest with assignment records and exact output-file
hashes.

The Qwen training entry point now requires explicit validation data and the split manifest, checks
content hashes, partition counts and group separation before loading weights, and no longer silently
splits by row order. These safeguards do not detect renamed/modified copies or different property
IDs for the same site. See `scripts/vlm-training/REVIEWED-EXPORT.md` for requirements and
limitations.

Verification: 38 focused web tests, 8 Node export/split tests, and 4 Python preflight tests passed.
Python syntax and JavaScript export syntax checks passed. No GPU training was performed. Supabase
still had zero available human-reviewed labels at the preflight check; new QA records produced zero
buffer rows.

## Remaining priorities

1. Independently reviewed fault labels and fresh property-separated evaluation data.
2. Blur/pixelation checks evaluated on genuine capture failures and healthy surfaces.
3. Staging integration of visible observations separated from diagnostic hypotheses.
4. Reviewer identity/label version audit, content-hash duplicate checks and fixed split assignment
   storage for dataset growth.
5. Full authenticated browser upload verification before production promotion.
