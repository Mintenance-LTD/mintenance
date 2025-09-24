from pathlib import Path

path = Path('src/__tests__/services/MeetingService.test.ts')
text = path.read_text()
marker = "    __setSupabaseDefaultSingle('contractor_locations', { data: mockLocationData, error: null });\n"
insertion = marker + "    console.log('state after defaults', JSON.stringify(__getSupabaseMockState(), null, 2));\n"
if marker not in text:
    raise SystemExit('marker not found')
text = text.replace(marker, insertion, 1)
path.write_text(text)
