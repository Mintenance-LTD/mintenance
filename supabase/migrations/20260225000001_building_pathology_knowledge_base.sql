-- =============================================================================
-- Migration: Building Pathology Knowledge Base
-- Source: RICS, BRE Digest 245/251, BRE GR5, RICS/Historic England JPS 2022,
--         Property Care Association CoP, Subsidence Forum, IStructE
-- Purpose: Structured knowledge base for Mint AI RAG pipeline.
--          Enables AI to explain WHY defects happen, not just detect them.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- IMMUTABLE helper: array_to_string is STABLE in PostgreSQL, which prevents
-- its use in generated columns and functional indexes. This wrapper is safe
-- to mark IMMUTABLE because it performs no catalog lookups.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.immutable_array_to_text(arr text[], sep text)
  RETURNS text LANGUAGE sql IMMUTABLE PARALLEL SAFE AS $$
  SELECT array_to_string(arr, sep)
$$;

-- ---------------------------------------------------------------------------
-- SCHEMA
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.building_pathology_knowledge (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identity
  defect_slug           TEXT NOT NULL UNIQUE,             -- e.g. 'damp-rising'
  category              TEXT NOT NULL,                    -- e.g. 'damp_moisture'
  name                  TEXT NOT NULL,                    -- e.g. 'Rising Damp'
  aka                   TEXT[] DEFAULT '{}',              -- alternative names

  -- Core knowledge
  description           TEXT NOT NULL,
  why_it_happens        TEXT NOT NULL,                    -- root cause explanation
  visual_indicators     TEXT[] NOT NULL DEFAULT '{}',     -- list of visible signs
  photo_detection_cues  TEXT[] NOT NULL DEFAULT '{}',     -- what AI should look for
  common_misdiagnosis   TEXT[] DEFAULT '{}',              -- what it gets confused with
  differential_diagnosis TEXT,                            -- how to tell apart from similar defects

  -- Assessment outputs
  rics_condition_rating SMALLINT CHECK (rics_condition_rating IN (1,2,3)),
  urgency               TEXT NOT NULL CHECK (urgency IN ('routine','soon','urgent','immediate')),
  remediation_summary   TEXT NOT NULL,
  remediation_steps     TEXT[] DEFAULT '{}',
  cost_range_gbp_min    INTEGER,
  cost_range_gbp_max    INTEGER,

  -- Professional context
  regulatory_reference  TEXT[],                           -- BRE/RICS/BS standards
  property_age_risk     TEXT[],                           -- e.g. ['pre-1919','1919-1945']
  construction_type_risk TEXT[],                          -- e.g. ['solid-wall','cavity-wall']
  specialist_required   BOOLEAN DEFAULT false,
  further_investigation TEXT,                             -- what specialist survey is needed

  -- Metadata
  source_authority      TEXT NOT NULL,                    -- primary source
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.building_pathology_knowledge IS
  'Curated UK building defect knowledge base for Mint AI RAG pipeline. '
  'Sources: RICS, BRE Digests 245/251, RICS/Historic England JPS 2022, PCA CoP.';

-- Full-text search index for RAG queries
CREATE INDEX IF NOT EXISTS idx_bpk_category
  ON public.building_pathology_knowledge(category);
CREATE INDEX IF NOT EXISTS idx_bpk_rics_rating
  ON public.building_pathology_knowledge(rics_condition_rating);
CREATE INDEX IF NOT EXISTS idx_bpk_urgency
  ON public.building_pathology_knowledge(urgency);
-- Use a stored generated tsvector column so array_to_string is evaluated at
-- write-time (IMMUTABLE requirement satisfied by the generated column approach).
ALTER TABLE public.building_pathology_knowledge
  ADD COLUMN fts tsvector GENERATED ALWAYS AS (
    to_tsvector('english'::regconfig,
      coalesce(name,'') || ' ' ||
      coalesce(description,'') || ' ' ||
      coalesce(why_it_happens,'') || ' ' ||
      coalesce(public.immutable_array_to_text(visual_indicators,' '),'') || ' ' ||
      coalesce(public.immutable_array_to_text(photo_detection_cues,' '),'')
    )
  ) STORED;

CREATE INDEX IF NOT EXISTS idx_bpk_fts
  ON public.building_pathology_knowledge USING gin(fts);

-- RLS: read-only for authenticated users, no user data here
ALTER TABLE public.building_pathology_knowledge ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bpk_read_authenticated"
  ON public.building_pathology_knowledge FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "bpk_read_anon"
  ON public.building_pathology_knowledge FOR SELECT
  TO anon USING (true);

-- updated_at trigger
CREATE TRIGGER bpk_updated_at
  BEFORE UPDATE ON public.building_pathology_knowledge
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ---------------------------------------------------------------------------
-- SEED DATA  (60 defect entries across 10 categories)
-- Sources cited per entry via source_authority column
-- ---------------------------------------------------------------------------

-- ============================================================
-- CATEGORY 1: DAMP & MOISTURE
-- ============================================================
INSERT INTO public.building_pathology_knowledge (
  defect_slug, category, name, aka,
  description, why_it_happens,
  visual_indicators, photo_detection_cues, common_misdiagnosis, differential_diagnosis,
  rics_condition_rating, urgency, remediation_summary, remediation_steps,
  cost_range_gbp_min, cost_range_gbp_max,
  regulatory_reference, property_age_risk, construction_type_risk,
  specialist_required, further_investigation, source_authority
) VALUES

-- 1.1 Rising Damp
('damp-rising', 'damp_moisture', 'Rising Damp',
 ARRAY['capillary damp','ground damp'],
 'Moisture drawn vertically upward from the ground through porous masonry by capillary action. Rises through bricks and mortar in the absence of, or where a damp-proof course (DPC) has failed or been bridged.',
 'Capillary action draws groundwater upward through the microscopic pores and channels in brick and mortar — the same mechanism as a sponge sitting in water. The height moisture rises depends on the wall''s porosity, salt concentration, and the rate of surface evaporation. A functioning DPC (bitumen, slate, or engineering brick) breaks this capillary chain. Rising damp occurs when: (1) No DPC exists — common in pre-1875 buildings; (2) DPC has been bridged — by render, external ground raised above DPC level, or mortar droppings in the cavity; (3) DPC has physically failed. Hygroscopic salts (nitrates, chlorides) drawn from the soil accumulate in the wall and can absorb moisture from the air, perpetuating the problem even after the DPC is repaired.',
 ARRAY[
   'Horizontal tide mark or staining band on internal wall, typically 0.9m–1.2m above floor level',
   'White crystalline salt deposits (efflorescence/salting) at or below the tide mark',
   'Paint or wallpaper peeling upward from skirting board',
   'Plaster blowing, bubbling, or crumbling at low level',
   'Damp patch that does NOT extend above 1.2m',
   'Skirting board rot at base',
   'Musty odour at floor level'
 ],
 ARRAY[
   'horizontal tide mark wall',
   'salt crystals white deposits skirting',
   'peeling paint rising from floor',
   'damp plaster low level',
   'blistering wallpaper base wall'
 ],
 ARRAY['penetrating damp','condensation','plumbing leak'],
 'Rising damp has a clearly defined upper limit (the tide mark) that is approximately horizontal and does not exceed 1–1.2m. Condensation appears on cold surfaces at any height and is often highest near ceilings. Penetrating damp correlates with rain events and appears at variable heights linked to external defects. RICS/Historic England JPS 2022 states moisture meter readings alone are NOT diagnostic — gravimetric (drilled sample) testing to BRE Digest 245 is required to confirm.',
 3, 'urgent',
 'Identify and address the cause: bridge the DPC (reduce ground levels, remove bridging render), install a new chemical injection DPC if absent/failed, hack off contaminated plaster to 1m height, replaster with sand and cement (not gypsum), allow to dry before decorating.',
 ARRAY[
   'Commission gravimetric testing to BRE Digest 245 to confirm diagnosis',
   'Reduce external ground levels if above DPC',
   'Remove bridging render or mortar',
   'Install chemical injection DPC if required (Property Care Association approved contractor)',
   'Hack off salt-contaminated plaster to 300mm above tide mark',
   'Replaster with sand:cement (3:1) render — NOT gypsum (hygroscopic)',
   'Allow minimum 3 months drying before decorating',
   'Monitor with hygrometer for recurrence'
 ],
 800, 4500,
 ARRAY['BRE Digest 245 (2007)','RICS/Historic England JPS 2022','Property Care Association CoP 2022','BS 6576:2005 Chemical DPC'],
 ARRAY['pre-1875','1875-1919','1919-1945'],
 ARRAY['solid-wall','stone','brick-no-dpc'],
 true,
 'Commission PCA-approved specialist for gravimetric testing. Do not accept moisture-meter-only diagnosis.',
 'BRE Digest 245 (2007); RICS/Historic England Joint Position Statement 2022'),

-- 1.2 Penetrating Damp (Walls)
('damp-penetrating-wall', 'damp_moisture', 'Penetrating Damp — Walls',
 ARRAY['lateral damp','wind-driven rain penetration'],
 'Water penetrating horizontally through an external wall, typically driven by wind-driven rain. Indicates either component failure or that the construction is insufficiently robust for the building''s exposure level.',
 'External walls fail to resist moisture ingress when: (1) Mortar joints erode and open, providing capillary pathways; (2) Render cracks or detaches; (3) Cavity wall insulation bridges the cavity acting as a wick; (4) Failed window/door seals or sills allow water to track behind; (5) Cavity tray or lintel flashing omitted or failed. West and south-facing elevations are most exposed in the UK. Solid walls pre-1920 rely on mass and absorption capacity rather than a physical barrier — they can saturate in prolonged rain then dry out.',
 ARRAY[
   'Damp patch on internal wall surface directly corresponding to external defect',
   'Damp appears or worsens during or after sustained rainfall',
   'Damp dries out in dry weather (unlike rising damp)',
   'Staining at variable height — not the horizontal band of rising damp',
   'Map cracking or detached render on external face',
   'Open or eroded mortar joints visible externally',
   'Damp behind window reveals'
 ],
 ARRAY[
   'damp patch internal wall rain correlation',
   'cracked render external wall',
   'open mortar joints brickwork',
   'water stain wall variable height',
   'damp around window frame reveal'
 ],
 ARRAY['rising damp','condensation'],
 'Penetrating damp is weather-dependent and correlates with rain events. It can appear at any height aligned with external defects. Rising damp is limited to ~1.2m and weather-independent. Condensation forms on cold surfaces and correlates with occupancy/temperature not weather.',
 2, 'soon',
 'Identify and repair the external defect causing water entry: repoint mortar joints, repair/renew render, reseal windows, replace failed cavity trays, refix flashings. Consider external masonry water repellent treatment for exposed elevations.',
 ARRAY[
   'Inspect external wall face for eroded mortar joints, cracks, defective render',
   'Check window and door seals and sills for defects',
   'Inspect cavity insulation installation (if fitted) for bridging',
   'Repoint mortar joints with appropriate mortar (matching original specification)',
   'Repair or renew render — use breathable lime render on pre-1920 solid walls',
   'Apply silicone masonry water repellent to exposed elevations',
   'Allow internal surfaces to dry before redecorating',
   'Monitor after next sustained rain event'
 ],
 400, 3500,
 ARRAY['BRE GR5 (2015)','BRE BR466 Understanding Dampness','RICS Home Survey Standard 2021'],
 ARRAY['all'],
 ARRAY['solid-wall','cavity-wall','rendered'],
 false, NULL,
 'BRE GR5 Diagnosing Dampness (2015); BRE BR 466 Understanding Dampness'),

-- 1.3 Penetrating Damp (Roof)
('damp-penetrating-roof', 'damp_moisture', 'Penetrating Damp — Roof',
 ARRAY['roof leak','water ingress from above'],
 'Water entering the building fabric through defects in the roof covering, flashings, or abutments, appearing as ceiling staining or damp at high level.',
 'Roof penetrating damp occurs through: (1) Missing, cracked, or slipped roof tiles/slates; (2) Failed or open flashing at chimney, dormer, parapet, or wall abutments; (3) Blocked gutters backing up water; (4) Cracked or open ridge tiles; (5) Valleys choked with debris. In flat roofs: failed membrane, open joints, ponding water. Water may travel along rafters, joists, or sarking felt before appearing at a remote location on the ceiling — the damp patch often does not directly overlie the defect.',
 ARRAY[
   'Brown or yellow ceiling stain, especially near chimney breast, eaves, or roof edge',
   'Damp plaster or wet insulation in loft',
   'Water drips or staining on rafters in loft inspection',
   'Watermarks on chimney breast internal wall',
   'Tide marks on ceiling after rain',
   'Wet or degraded sarking felt in roof void'
 ],
 ARRAY[
   'ceiling stain brown water mark',
   'damp ceiling near chimney',
   'roof leak staining',
   'wet rafter loft',
   'tide mark ceiling'
 ],
 ARRAY['condensation','internal plumbing leak'],
 'Roof penetrating damp produces staining that correlates with rain, often near chimneys or roof edges. Condensation in lofts appears on cold surfaces (cold roof void) and produces widespread moisture without tide marks. Plumbing leaks are weather-independent.',
 3, 'urgent',
 'Inspect and repair roof covering: replace slipped/missing slates or tiles, rebed/repoint ridge and valley tiles, renew failed flashings (lead or leadflash), clear gutters and downpipes. Flat roof: repair membrane or renew if end-of-life.',
 ARRAY[
   'Access roof (safely) to identify defects — binoculars or drone for initial assessment',
   'Check all flashings, particularly chimney and parapet',
   'Replace missing or cracked tiles/slates like-for-like',
   'Rebed ridge tiles with appropriate mortar or dry-fix system',
   'Renew lead flashings where cracked or open (Code 4 minimum)',
   'Clear all gutters, downpipes, and valley gutters',
   'Inspect and repair flat roof membrane if applicable',
   'Check and repair internal plasterwork after fabric is watertight'
 ],
 300, 8000,
 ARRAY['RICS Home Survey Standard 2021','BRE Digest 312 Flat Roof Design'],
 ARRAY['all'],
 ARRAY['pitched-roof','flat-roof'],
 false,
 'Access to roof required — engage roofing contractor for detailed inspection if unable to inspect safely from ground.',
 'RICS Roof Construction Guidelines; BRE Digest 312'),

-- 1.4 Surface Condensation
('damp-condensation-surface', 'damp_moisture', 'Surface Condensation',
 ARRAY['cold bridging','mould from condensation'],
 'Water vapour in warm air condenses into liquid droplets when it contacts a surface below the dew point temperature. The most common form of damp in modern housing.',
 'Every human activity — cooking, bathing, breathing — produces water vapour. In a well-sealed home with inadequate ventilation or heating, this vapour-laden air migrates to the coldest surfaces (window reveals, corners of external walls, behind furniture) where the temperature falls below the dew point and liquid water deposits. Cold bridges — structural elements that conduct cold inward (steel lintels, wall ties, concrete floor edges, thermal bypass through uninsulated elements) — create localised cold spots. Black mould (Cladosporium, Aspergillus) grows on these persistently damp surfaces within 24–48 hours at relative humidity above 70%. The RICS/Historic England JPS 2022 identifies condensation as vastly more prevalent than true rising damp.',
 ARRAY[
   'Black mould growth at room corners, behind furniture, in cupboards',
   'Black mould around window reveals and frames',
   'Mould and moisture above skirting board level (unlike rising damp which is below)',
   'Condensation on windows, especially single-glazed',
   'Tide marks at ceiling/wall junction (opposite to rising damp)',
   'Damp patches on north-facing external walls',
   'Musty smell associated with occupancy patterns not weather'
 ],
 ARRAY[
   'black mould wall corner',
   'black mould window reveal',
   'condensation on windows',
   'mould growth above skirting',
   'damp corner room ceiling'
 ],
 ARRAY['rising damp','penetrating damp'],
 'Condensation mould appears at the HIGHEST and COLDEST points — corners, ceiling junctions, north-facing walls, behind furniture. Rising damp is restricted to below 1.2m. Condensation is weather-independent but occupancy-dependent (worse in winter/high occupancy). Standard BS EN ISO 13788 governs condensation risk analysis.',
 2, 'soon',
 'Improve ventilation (trickle vents, extractor fans in bathrooms/kitchens), improve heating (eliminate cold spots), upgrade insulation to reduce cold bridging, treat mould with fungicidal wash, investigate thermal bridging.',
 ARRAY[
   'Treat existing mould with diluted bleach or fungicidal wash (allow to dry)',
   'Install/improve mechanical ventilation in bathroom and kitchen',
   'Ensure background trickle ventilation to all habitable rooms',
   'Improve heating to maintain consistent internal temperature (minimum 18°C)',
   'Investigate thermal bridging: thermographic survey recommended',
   'Upgrade window glazing to reduce cold surface temperature',
   'Install positive input ventilation (PIV) system for severe cases'
 ],
 200, 2500,
 ARRAY['BS EN ISO 13788:2012 Condensation Risk','RICS/Historic England JPS 2022','Building Regs Part F Ventilation'],
 ARRAY['all'],
 ARRAY['all'],
 false,
 'Thermographic survey can identify cold bridges causing condensation. Hygrometric (temperature/RH) monitoring over 2 weeks is the most reliable diagnostic method per BRE GR5.',
 'BRE GR5 (2015); BS EN ISO 13788:2012; RICS/Historic England JPS 2022'),

-- 1.5 Interstitial Condensation
('damp-condensation-interstitial', 'damp_moisture', 'Interstitial Condensation',
 ARRAY['fabric condensation','hidden condensation'],
 'Condensation forming WITHIN the building fabric (inside a wall, roof, or floor construction) rather than on a visible surface. Often invisible externally but damages insulation, timber, and masonry from within.',
 'When warm moist air from inside the building migrates outward through the building fabric, its temperature drops progressively. If the temperature reaches the dew point at any layer within the construction, moisture deposits within that layer. This is accelerated by: (1) Retrofitting insulation without vapour control layers; (2) Cold roofs insulated at ceiling level without ventilation above insulation; (3) Over-cladding existing walls without considering vapour profiles. The result is wet insulation (losing thermal performance), timber decay, and masonry deterioration — all hidden. Governed by BS EN ISO 13788 hygrothermal analysis (Glaser method).',
 ARRAY[
   'Wet or compressed loft insulation (without obvious roof leak)',
   'Damp or dark-stained rafters in loft not correlating with tile defects',
   'Cold or damp cavity wall insulation revealed on inspection',
   'Widespread low-level damp in recently insulated properties',
   'Timber decay in concealed positions following insulation retrofit'
 ],
 ARRAY[
   'wet insulation loft',
   'damp rafter no roof leak',
   'moist insulation cavity',
   'condensation building fabric'
 ],
 ARRAY['roof leak','rising damp'],
 'Interstitial condensation is hidden — diagnosis requires specialist hygrothermal modelling. Visible effects mimic other damp types. Key clue: occurs in properties recently retrofitted with insulation.',
 2, 'soon',
 'Install appropriate vapour control layer on warm side of insulation, ventilate cold roof voids, review insulation specification. May require insulation removal and replacement.',
 ARRAY[
   'Commission hygrothermal analysis (BS EN ISO 13788) before any insulation retrofit',
   'Cold roofs: ensure 50mm ventilation gap above insulation, cross-ventilate at eaves',
   'Warm roofs: install vapour control layer on warm (inner) face',
   'Cavity walls: check insulation installation quality via borescope',
   'Remove and replace wet/degraded insulation'
 ],
 500, 5000,
 ARRAY['BS EN ISO 13788:2012','Building Regs Part C','CIBSE Guide A'],
 ARRAY['all'],
 ARRAY['insulated-cavity','insulated-roof','retrofitted'],
 true,
 'Hygrothermal modelling by specialist required. Thermographic survey can help identify problem areas.',
 'BRE GR5 (2015); BS EN ISO 13788:2012'),

-- 1.6 Plumbing Leak (Concealed)
('damp-plumbing-leak', 'damp_moisture', 'Concealed Plumbing Leak',
 ARRAY['burst pipe','leak behind wall'],
 'Damp caused by a leaking water supply or drainage pipe concealed within the building fabric.',
 'Pipes fail through: corrosion (lead, iron), freeze-thaw splitting, joint failure, or damage. Supply pipes are pressurised — even a pinhole leak can saturate a wall or floor rapidly. Waste pipes allow sewer gases and bacterial contamination. The damp patch often does not directly coincide with the pipe location — water travels along joists and cavities before appearing.',
 ARRAY[
   'Random damp patch with no correlation to weather or external elevation',
   'Circular or spreading stain on ceiling, often expanding over days',
   'Damp at floor level or between floors',
   'Sound of running water in walls',
   'Unexplained increase in water meter reading'
 ],
 ARRAY[
   'circular ceiling stain expanding',
   'damp patch no weather correlation',
   'wet floor no explanation'
 ],
 ARRAY['penetrating damp','rising damp'],
 'Plumbing leaks are weather-independent and often progressive. Rising damp and penetrating damp are weather-correlated. Thermal imaging can locate concealed plumbing leaks.',
 3, 'immediate',
 'Locate leak source (thermal camera, acoustic detection), isolate supply, repair or replace failed pipe section, allow to dry, repair plasterwork.',
 ARRAY[
   'Turn off water supply immediately to prevent further damage',
   'Engage plumber to locate and repair leak',
   'Allow structure to dry thoroughly (weeks to months depending on saturation)',
   'Check for timber decay in affected timbers',
   'Repair plasterwork and redecorate'
 ],
 300, 3000,
 ARRAY['Water Supply (Water Fittings) Regulations 1999'],
 ARRAY['all'],
 ARRAY['all'],
 false, NULL,
 'BRE GR5 (2015)');

-- ============================================================
-- CATEGORY 2: TIMBER DECAY
-- ============================================================
INSERT INTO public.building_pathology_knowledge (
  defect_slug, category, name, aka,
  description, why_it_happens,
  visual_indicators, photo_detection_cues, common_misdiagnosis, differential_diagnosis,
  rics_condition_rating, urgency, remediation_summary, remediation_steps,
  cost_range_gbp_min, cost_range_gbp_max,
  regulatory_reference, property_age_risk, construction_type_risk,
  specialist_required, further_investigation, source_authority
) VALUES

-- 2.1 Dry Rot
('timber-dry-rot', 'timber_decay', 'Dry Rot',
 ARRAY['Serpula lacrymans','building cancer'],
 'The most destructive wood-destroying fungus in UK buildings. Serpula lacrymans breaks down the cellulose and hemicellulose in timber, leaving a brown cuboid crumble. Uniquely, it can spread through masonry to reach dry timber remote from the original moisture source.',
 'Dry rot requires: timber moisture content above 20%, poor or no ventilation, temperatures between 7–26°C (optimum 20°C). It typically originates where there has been water ingress — leaking roof, rising damp, burst pipe — in an unventilated space such as a suspended timber floor void or enclosed wall cavity. Once established, the mycelium (fungal root network) can travel through masonry, mortar, and plaster to colonise dry timber far from the moisture source. The fruiting body (sporophore) produces millions of red-brown spores that can remain dormant for years, reactivating when moisture returns.',
 ARRAY[
   'White fluffy cotton-wool mycelium on timber or masonry surfaces',
   'Deep cuboid (cube-shaped) cracking of timber — timber breaks into rectangular blocks',
   'Reddish-brown fruiting body (bracket/pancake shaped) with white margin',
   'Red-brown spore dust on surfaces near fruiting body',
   'Timber is dry, light, and crumbles easily when prodded',
   'Grey-white strands (hyphae) across masonry, plaster, or mortar',
   'Musty, mushroom-like smell'
 ],
 ARRAY[
   'white fluffy fungal growth timber',
   'cuboid cracking brown wood',
   'red-brown fruiting body bracket wall',
   'spore dust reddish powder',
   'crumbling dry wood rectangular cracks'
 ],
 ARRAY['wet rot','efflorescence'],
 'Dry rot timber is DRY and crumbles into rectangular blocks. Wet rot timber is WET and soft, and decays along the grain with longitudinal cracking. Dry rot can spread through masonry — wet rot cannot. Dry rot fruiting body is distinctive orange-red pancake shape with white margin. If in doubt, send a sample to a mycologist.',
 3, 'immediate',
 'Remove all source of moisture. Remove all infected timber with 300–500mm margin into apparently sound timber. Sterilise masonry with fungicide. Provide adequate ventilation to prevent recurrence. Replace with pre-treated timber.',
 ARRAY[
   'Commission specialist mycologist survey — do NOT simply accept contractor diagnosis',
   'Identify and eliminate ALL moisture sources first',
   'Remove infected timber with 500mm margin beyond visible decay',
   'Wire-brush and sterilise masonry with fungicide/boron solution',
   'Improve ventilation: airbricks, sub-floor ventilation',
   'Replace timber with pre-treated (boron) structural timber',
   'Monitor for recurrence — consider installing hygrostats in vulnerable voids'
 ],
 2000, 25000,
 ARRAY['BRE BR 453 (2012) 3rd Ed','RICS Building Pathology APC Guidance','Property Care Association Dry Rot Guidance'],
 ARRAY['pre-1919','1919-1945','1945-1970'],
 ARRAY['suspended-timber-floor','timber-frame'],
 true,
 'Independent mycologist identification strongly recommended before treatment. PCA-affiliated contractor for treatment works.',
 'RICS Journals — How to Identify and Tackle Dry Rot; BRE BR 453 3rd Ed (2012)'),

-- 2.2 Wet Rot
('timber-wet-rot', 'timber_decay', 'Wet Rot',
 ARRAY['Coniophora puteana','cellar fungus','brown rot wet'],
 'Fungal decay of timber where moisture content exceeds 50%. Unlike dry rot, wet rot is localised to the wet zone and does not spread through masonry.',
 'Wet rot fungi (most commonly Coniophora puteana, the cellar fungus) require timber to remain persistently wet — moisture content above 50%. It is typically found where: timber is in direct contact with water (window sills, door cills, flat roof timbers below a failing membrane, floor joists near leaking pipes). Unlike dry rot, wet rot cannot spread through masonry or to dry timber. Once the moisture source is removed, wet rot arrests naturally. Softwood is most susceptible; hardwood more resistant.',
 ARRAY[
   'Soft, spongy timber that probe penetrates easily',
   'Brown/black discolouration of timber',
   'Longitudinal cracking along the grain (not cuboid like dry rot)',
   'Paint blistering or breakdown on timber surfaces (especially window sills, door frames)',
   'Timber may look intact externally but be hollow/soft inside',
   'Localised to the area of moisture — does not spread'
 ],
 ARRAY[
   'soft spongy timber window sill',
   'brown black rotten wood',
   'longitudinal crack wood grain',
   'paint blistering timber frame',
   'soft timber probe penetrates'
 ],
 ARRAY['dry rot'],
 'Wet rot is localised, soft, and wet. Dry rot is dry, crumbles into rectangular blocks, and can spread. If the decay is at a window sill or door bottom in an area of obvious moisture, it is almost certainly wet rot.',
 2, 'soon',
 'Eliminate moisture source, allow timber to dry, cut out and replace decayed sections with pre-treated softwood, prime and repaint to prevent recurrence.',
 ARRAY[
   'Identify and eliminate moisture source (leaking gutter, failed seal, etc.)',
   'Allow timber to dry thoroughly',
   'Cut out all decayed timber — probe to find extent',
   'Replace with pre-treated (tanalised) timber, or use epoxy repair system for minor sections',
   'Prime and repaint all exposed timber surfaces',
   'Monitor regularly'
 ],
 200, 3000,
 ARRAY['BRE BR 453 (2012)'],
 ARRAY['all'],
 ARRAY['timber-frame','traditional'],
 false, NULL,
 'BRE BR 453 Recognising Wood Rot (2012); RICS Building Pathology Competency'),

-- 2.3 Furniture Beetle (Woodworm)
('timber-woodworm', 'timber_decay', 'Furniture Beetle (Woodworm)',
 ARRAY['woodworm','Anobium punctatum','common furniture beetle'],
 'Larvae of the common furniture beetle (Anobium punctatum) tunnel through softwood timbers for 2–5 years before emerging as adult beetles, leaving characteristic 1.5–2mm round exit holes.',
 'Female beetles lay eggs in cracks and end-grain of seasoned softwood. Larvae hatch and tunnel through the sapwood for 2–5 years, feeding on starch and cellulose. Adults emerge in spring/summer (May–August), leaving the characteristic round exit holes. Infestation is most common in pre-1960 properties with untreated softwood roof and floor timbers. Moisture content above 14% increases susceptibility. Structurally significant only if infestation is active and widespread in structural timbers.',
 ARRAY[
   'Round exit holes 1.5–2mm diameter in softwood timber surfaces',
   'Fine, cream-coloured powdery frass (bore dust) below exit holes — fresh if active',
   'Weakened, brittle timber that crumbles under light pressure (severe infestation)',
   'Adult beetles (6–7mm, brown) visible in May–August in severe active infestations',
   'Holes typically in floor boards, roof timbers, joinery — NOT in hardwood structural timbers'
 ],
 ARRAY[
   'round holes wood surface small',
   'woodworm holes timber floor boards',
   'powder dust below wood holes frass',
   'small brown beetle wood'
 ],
 ARRAY['deathwatch beetle','house longhorn beetle'],
 'Furniture beetle holes are 1.5–2mm round. Deathwatch beetle holes are 3mm and oval (found in hardwood only). House longhorn beetle holes are 6–10mm oval (restricted to certain Surrey areas). Fresh (active) infestation shows cream-coloured powdery frass; old infestation shows darker, compacted dust.',
 2, 'soon',
 'Confirm active vs. dormant infestation. If active, apply permethrin-based insecticide by brush or injection. Reduce moisture. Major structural damage requires timber replacement.',
 ARRAY[
   'Assess whether infestation is active (fresh cream frass) or dormant (dark, compacted)',
   'If dormant, monitor only — no treatment required',
   'If active in structural timbers, apply permethrin-based insecticidal fluid',
   'Reduce moisture content to below 14% to discourage re-infestation',
   'Replace structurally compromised sections with pre-treated timber'
 ],
 150, 2000,
 ARRAY['BRE BR 453 (2012)','British Wood Preserving and Damp-Proofing Association (BWPDA)'],
 ARRAY['pre-1919','1919-1945','1945-1960'],
 ARRAY['traditional','suspended-timber-floor'],
 false,
 'Structural engineer assessment if widespread in load-bearing timbers.',
 'BRE BR 453 (2012); RICS On the Lookout for Wood-Boring Insects'),

-- 2.4 Deathwatch Beetle
('timber-deathwatch-beetle', 'timber_decay', 'Deathwatch Beetle',
 ARRAY['Xestobium rufovillosum'],
 'Wood-boring beetle that attacks old hardwood timbers — oak, elm, sweet chestnut — particularly where pre-existing fungal decay has begun softening the wood. Associated with historic and listed buildings.',
 'Deathwatch beetle (Xestobium rufovillosum) preferentially attacks hardwood with existing fungal decay, as the pre-softened wood is easier to consume. Found almost exclusively in pre-1850 buildings with oak structural members — roof trusses, beams, floor joists. Larvae take 4–10 years to complete their life cycle. Adults tap their heads against timber in spring (the "deathwatch" ticking sound used as a mating call). Exit holes are distinctively oval and 3mm in diameter. Can cause serious structural weakening in historic buildings.',
 ARRAY[
   'Oval exit holes 3mm in diameter in hardwood timber',
   'Coarser, gritty frass (bun-shaped pellets) compared to furniture beetle',
   'Ticking sound in spring (March–May) from adult beetles',
   'Found in oak beams, purlins, wall plates in historic buildings',
   'Pre-existing fungal decay often present in same timber'
 ],
 ARRAY[
   'oval holes hardwood timber 3mm',
   'deathwatch beetle oak beam',
   'gritty frass bun shaped pellets hardwood'
 ],
 ARRAY['furniture beetle','dry rot'],
 'Deathwatch: oval 3mm holes, hardwood only, often with fungal decay, historic buildings. Furniture beetle: round 2mm holes, softwood, any age property. Dry rot produces no holes — only surface decay.',
 3, 'urgent',
 'Specialist entomologist and structural engineer assessment required. Address moisture and fungal decay. Permethrin treatment by specialist. Consider micro-boron injection for severe cases.',
 ARRAY[
   'Engage specialist entomologist to confirm identification',
   'Structural engineer assessment to determine load-bearing capacity of affected timbers',
   'Address fungal decay and moisture source first',
   'Specialist insecticidal treatment — permethrin or micro-boron injection',
   'Historic building consent may be required for repair methods on listed buildings',
   'Monitor with timber humidity probes'
 ],
 1500, 20000,
 ARRAY['BRE BR 453 (2012)','Historic England Timber Conservation'],
 ARRAY['pre-1919','pre-1850'],
 ARRAY['historic','timber-frame-medieval'],
 true,
 'Specialist entomologist + structural engineer + (for listed buildings) Historic England specialist.',
 'BRE BR 453 (2012); RICS Journal — Wood-Boring Insects');

-- ============================================================
-- CATEGORY 3: STRUCTURAL CRACKS & MOVEMENT
-- ============================================================
INSERT INTO public.building_pathology_knowledge (
  defect_slug, category, name, aka,
  description, why_it_happens,
  visual_indicators, photo_detection_cues, common_misdiagnosis, differential_diagnosis,
  rics_condition_rating, urgency, remediation_summary, remediation_steps,
  cost_range_gbp_min, cost_range_gbp_max,
  regulatory_reference, property_age_risk, construction_type_risk,
  specialist_required, further_investigation, source_authority
) VALUES

-- 3.1 Subsidence Cracking
('structural-crack-subsidence', 'structural_movement', 'Subsidence Cracking',
 ARRAY['foundation movement','ground subsidence'],
 'Cracking caused by downward movement of the ground beneath the building''s foundations, independent of the building''s own load. The most serious category of structural movement.',
 'Subsidence in the UK is most commonly caused by: (1) Clay shrinkage — the most frequent cause, especially in SE England. Clay soils shrink as they dry in summer/drought, then swell when rewetted. Trees exacerbate this dramatically by extracting moisture from clay within a horizontal distance equal to the tree''s mature height. (2) Tree root damage — clay extraction causing differential settlement. (3) Leaking drains softening ground. (4) Mining subsidence — historic coal mining regions. (5) Made ground — poorly compacted infill beneath the building. (6) Nearby excavation. Subsidence produces diagonal stepped cracking through the mortar joints, typically wider at the top than bottom, concentrated at corners of the building where foundations are first to lose support.',
 ARRAY[
   'Diagonal stepped crack through mortar joints, wider at top than bottom',
   'Crack at corner of building or adjacent to window/door opening',
   'Crack extends to or near ground level on external wall',
   'Internal doors dropping and sticking (frame has racked)',
   'Cracks that re-open after filling (active movement)',
   'Seasonal variation in crack width (clay shrink/swell cycle)',
   'BRE Digest 251 Category 3–5 (5mm–25mm+ width)'
 ],
 ARRAY[
   'diagonal crack brickwork corner building',
   'stepped crack mortar joints wide top',
   'crack door corner window corner',
   'diagonal crack external wall ground level'
 ],
 ARRAY['settlement','thermal movement','lintel failure'],
 'Subsidence cracks are typically wider at the top (corner dropping), diagonal, stepped through mortar joints, and show seasonal variation. Settlement is historical, typically hairline to Category 2, stable. Thermal movement produces vertical cracks at wall junctions or mid-wall. Lintel failure produces a diagonal crack above an opening (but limited to above the opening, not extending to ground).',
 3, 'urgent',
 'Commission structural engineer investigation. Install crack monitors. Investigate ground conditions. Address tree/drain causes. Structural underpinning or raft foundation repair where confirmed.',
 ARRAY[
   'Install crack monitors immediately to determine if movement is active',
   'Commission RICS Level 3 / Structural engineer investigation',
   'Ground investigation — trial pits, borehole, soil analysis',
   'Identify causative factor: trees (distance and species), drains (CCTV survey), clay depth',
   'Address causative factor: tree removal/root barrier, drain repair',
   'Allow 12–18 months monitoring after addressing cause before structural repair',
   'Underpinning or alternative structural solution if movement continues',
   'Notify building insurer — subsidence is an insured peril'
 ],
 5000, 60000,
 ARRAY['BRE Digest 251 (1995 revised)','BRE IP 4/93 Monitoring Building Movement','BS 8004:2015 Foundations'],
 ARRAY['all'],
 ARRAY['all'],
 true,
 'Structural engineer (MICE or MIStructE) + independent ground investigation essential. Notify insurer immediately.',
 'BRE Digest 251 Assessment of Damage in Low-Rise Buildings (1995); Subsidence Forum UK'),

-- 3.2 Settlement Cracking
('structural-crack-settlement', 'structural_movement', 'Settlement Cracking',
 ARRAY['foundation settlement','consolidation cracking'],
 'Gradual downward movement of the ground under the building''s own weight, compressing soil beneath foundations. Typically occurs in the first years after construction and then stabilises.',
 'All new buildings settle to some degree as the soil beneath consolidates under the load of the structure. On good bearing ground, settlement is even and small. On poorer ground or fill material, settlement can be differential (uneven) causing cracking. Historic settlement from decades past is typically stable and produces Category 0–2 cracks. Differential settlement occurs where ground conditions vary under the footprint — e.g. where a building spans made ground and natural ground.',
 ARRAY[
   'Fine to slight cracks (Category 0–2, under 5mm)',
   'Cracks are stable — do not reopen after filling',
   'Typically diagonal but smaller than subsidence',
   'No seasonal variation in crack width',
   'Property is older — movement is historical'
 ],
 ARRAY[
   'hairline crack plaster wall',
   'fine diagonal crack older property stable',
   'small crack wall not growing'
 ],
 ARRAY['subsidence'],
 'Settlement is historical and stable — cracks do not reopen. Subsidence is active and worsening, with seasonal variation and cracks that reopen. Category 1–2 cracks in old properties are almost always historic settlement. Category 3+ cracks should be treated as potential subsidence until proven otherwise.',
 1, 'routine',
 'Monitor for any progression. Fill and redecorate. No structural intervention typically required for historic stable settlement.',
 ARRAY[
   'Fill cracks with flexible filler',
   'Monitor for 6–12 months to confirm stability',
   'Redecorate',
   'If cracks re-open, escalate to structural engineer assessment'
 ],
 50, 500,
 ARRAY['BRE Digest 251 (1995)'],
 ARRAY['all'],
 ARRAY['all'],
 false, NULL,
 'BRE Digest 251 (1995); Survey Hut UK Settlement vs Subsidence Guide'),

-- 3.3 Heave Cracking
('structural-crack-heave', 'structural_movement', 'Heave Cracking',
 ARRAY['ground heave','clay swelling','upward movement'],
 'Upward movement of foundations caused by clay soils swelling as they absorb moisture, or by swelling of sulphate-bearing soils. Often follows tree removal.',
 'Clay soils that shrank during a period of drought or under the influence of tree root extraction will swell when moisture returns. Tree removal is a common trigger: the tree''s moisture extraction ceases, the clay re-wets and expands, lifting the foundations. Heave can also occur from sulphate-bearing fill material below floor slabs. Heave typically produces cracks that are WIDER AT THE BOTTOM (foundations lifting rather than dropping) and can cause internal floors to lift.',
 ARRAY[
   'Diagonal crack through mortar joints, wider at BOTTOM (opposite to subsidence)',
   'Internal floor heaving or cracking (slab lifting)',
   'Doors and windows jamming at the TOP rather than bottom',
   'Cracking following tree removal from close proximity',
   'Can affect entire building section evenly (whole area lifting)'
 ],
 ARRAY[
   'diagonal crack wider bottom brickwork',
   'floor lifting cracking',
   'crack after tree removal'
 ],
 ARRAY['subsidence'],
 'Heave cracks are wider at the BOTTOM (ground pushing up). Subsidence cracks are wider at the TOP (ground dropping). Heave often follows tree removal. Both require structural engineer investigation.',
 3, 'urgent',
 'Structural engineer investigation. Heave is difficult to remediate — flexible isolation joints between foundations and structure may be required. Do not underpin (makes heave worse).',
 ARRAY[
   'Commission structural engineer investigation urgently',
   'Install crack monitors to quantify movement rate',
   'Identify cause: tree removal history, sulphate-bearing fill',
   'Do NOT underpin — underpinning in heave conditions can cause catastrophic failure',
   'Flexible foundation design or isolation joints may be required',
   'Allow time for movement to stabilise (can take years)'
 ],
 8000, 80000,
 ARRAY['BRE Digest 251 (1995)','BRE IP 4/93'],
 ARRAY['all'],
 ARRAY['all'],
 true,
 'Structural engineer (MIStructE) essential. Do NOT underpin without specialist advice.',
 'BRE Digest 251 (1995); IStructE Structural Movement in Buildings'),

-- 3.4 Lintel Failure
('structural-crack-lintel', 'structural_movement', 'Lintel Failure',
 ARRAY['lintel cracking','opening failure','corroded lintel'],
 'Cracking above window or door openings caused by failure, inadequate sizing, or corrosion of the structural lintel spanning the opening.',
 'Lintels carry the load of the wall above an opening (window, door) and transfer it to the supporting walls either side. Failure occurs when: (1) Lintel is undersized for the load; (2) Steel lintel corrodes (pre-1980 lintels often untreated steel — rust causes expansion and spalling); (3) No lintel was installed (common in some older construction); (4) Lintel deflects excessively under load. Cracking radiates from the corners of the opening — typically a diagonal crack at approximately 45° from the corner of the window or door.',
 ARRAY[
   'Diagonal crack at 45° from corner of window or door opening',
   'Crack limited to above the opening — does not extend to ground (unlike subsidence)',
   'Spalling brickwork or bulging at lintel position',
   'Rust staining around steel lintel position',
   'Visible deflection of lintel (bowing)'
 ],
 ARRAY[
   'crack corner window diagonal',
   'crack above door opening',
   'rust stain lintel steel',
   'spalling brick above window'
 ],
 ARRAY['subsidence'],
 'Lintel failure cracks are localised to above the opening and typically 45° from corners. Subsidence cracks extend much further — to ground level — and cover larger wall areas. Rust staining confirms corroded steel lintel.',
 3, 'urgent',
 'Structural engineer assessment. Replace failed or corroded lintel with new galvanised steel or concrete lintel of appropriate size. Repair cracked masonry above.',
 ARRAY[
   'Commission structural engineer assessment to confirm lintel failure',
   'Temporary propping if structural integrity in question',
   'Remove and replace lintel — galvanised steel (Catnic or similar) or pre-stressed concrete',
   'Repoint and rebuild masonry above opening',
   'Address rust staining and treat adjacent masonry'
 ],
 500, 5000,
 ARRAY['BRE Digest 251 (1995)','BS 5977 Lintels','Building Regs Part A Structure'],
 ARRAY['pre-1945','1945-1970'],
 ARRAY['brick','block'],
 true,
 'Structural engineer to specify replacement lintel size and confirm structural adequacy.',
 'BRE Digest 251 (1995); Lawrence & Taylor Chartered Surveyors Crack Guide');

-- ============================================================
-- CATEGORY 4: ROOFING DEFECTS
-- ============================================================
INSERT INTO public.building_pathology_knowledge (
  defect_slug, category, name, aka,
  description, why_it_happens,
  visual_indicators, photo_detection_cues, common_misdiagnosis, differential_diagnosis,
  rics_condition_rating, urgency, remediation_summary, remediation_steps,
  cost_range_gbp_min, cost_range_gbp_max,
  regulatory_reference, property_age_risk, construction_type_risk,
  specialist_required, further_investigation, source_authority
) VALUES

-- 4.1 Slipped/Missing Slates or Tiles
('roof-slipped-tiles', 'roofing', 'Slipped or Missing Roof Tiles/Slates',
 ARRAY['nail sickness','loose slates','missing tiles'],
 'Roof tiles or slates that have slipped from position or are absent, exposing the sarking felt or decking below to weathering and allowing direct water ingress.',
 'Slippage is caused by: (1) Nail sickness — the original iron nails corroding and failing, common in slates fixed before 1950 using cut iron nails. Slates rely entirely on their fixings; (2) Wind lift on exposed pitches; (3) Frost damage cracking tiles; (4) Mechanical damage from foot traffic or falling branches; (5) Mortar bedded ridges and hips drying out and failing. Once the sarking felt is exposed, water ingress follows. Sarking felt degrades in UV over 10–20 years and becomes brittle.',
 ARRAY[
   'Visible gaps in tile or slate covering when viewed from ground',
   'Tiles sitting at an angle or slipped to one side',
   'Water staining on ceiling below missing tile position',
   'Loose or displaced ridge/hip tiles',
   'Broken or cracked tiles visible on roof face',
   'Displaced soakers at abutments'
 ],
 ARRAY[
   'missing tile roof gap',
   'slipped slate roof asymmetric',
   'broken roof tile',
   'loose ridge tile',
   'exposed felt roof'
 ],
 ARRAY['roof condensation'],
 'Direct water ingress from missing tiles is weather-dependent and localised to below the defect (though may travel). Condensation in roof voids is widespread, not localised.',
 3, 'urgent',
 'Replace or re-fix slipped/missing tiles like-for-like. Rebed/repoint ridge and hip tiles. Replace cracked tiles. Consider full re-nail if nail sickness is widespread.',
 ARRAY[
   'Inspect full roof surface with binoculars or from scaffolding',
   'Replace all missing and cracked tiles/slates like-for-like',
   'Re-nail any loose tiles/slates using copper or stainless steel nails',
   'Rebed ridge and hip tiles with mortar or install dry-fix system',
   'Check and replace any degraded sarking felt if accessible',
   'If nail sickness is widespread, budget for full re-slating/re-tiling'
 ],
 300, 15000,
 ARRAY['RICS Home Survey Standard','BS 5534 Slating and Tiling'],
 ARRAY['pre-1950','1950-1970'],
 ARRAY['pitched-roof'],
 false,
 'Full roof inspection from scaffolding recommended if widespread defects suspected.',
 'RICS Roof Construction Guidelines; Peter Barry Surveyors Property Defects Series'),

-- 4.2 Failed Flashings
('roof-failed-flashings', 'roofing', 'Failed Roof Flashings',
 ARRAY['flashing failure','lead failure','chimney flashing'],
 'Flashings are the weatherproof junctions between the roof covering and vertical elements — chimney stacks, dormer walls, parapet walls, abutments. When they fail, water tracks into the structure undetected.',
 'Lead flashings fail through: thermal fatigue — lead expands and contracts significantly with temperature, eventually splitting at stress points; oxidation and work-hardening making lead brittle; inadequate laps and wedges allowing wind-driven rain ingress; mortar-pointed flashings (incorrect) cracking as mortar is too rigid for lead''s thermal movement; over-long lead pieces (must not exceed 1.5m). Soakers beneath plain tile courses at abutments fail when slate-and-lead systems are replaced without soakers. Felt (torch-on) flashings in flat roofs fail at joints from UV degradation.',
 ARRAY[
   'Gap between lead flashing and masonry at chimney or abutment',
   'Open or cracked lead at step or cover flashing position',
   'Mortar pointing cracked or absent from flashing chase',
   'Water staining on chimney breast internal wall',
   'Damp at ceiling level near chimney or roof edge',
   'Visible lifting or displacement of lead'
 ],
 ARRAY[
   'open lead flashing chimney',
   'cracked lead flashing roof abutment',
   'gap chimney stack flashing',
   'damp chimney breast internal'
 ],
 ARRAY['missing tiles','condensation'],
 'Failed flashings produce water ingress localised to the junction — at chimney breast, parapet inner face, or dormer sides. Missing tiles produce ingress below the tile position across a wider area.',
 3, 'urgent',
 'Renew failed lead flashings (Code 4 minimum, Code 5 for exposed locations). Refix with lead tacks and wedges into mortar chase. Do not use mortar pointing alone.',
 ARRAY[
   'Remove all failed flashing material',
   'Cut new chase to 25mm depth in mortar joint',
   'Install Code 4 or Code 5 lead (max 1.5m lengths)',
   'Dress lead into chase, fix with lead tacks',
   'Point chase with mortar (NOT sealant as primary fix)',
   'Ensure minimum 75mm upstand and 150mm cover',
   'Inspect all other roof junctions while accessible'
 ],
 400, 4000,
 ARRAY['BS EN 12588 Lead Sheet','Lead Sheet Association Technical Manual','BS 5534'],
 ARRAY['all'],
 ARRAY['pitched-roof','flat-roof'],
 false, NULL,
 'RICS Roof Construction Guidelines; Lead Sheet Association Technical Manual'),

-- 4.3 Flat Roof Failure
('roof-flat-roof-failure', 'roofing', 'Flat Roof Membrane Failure',
 ARRAY['felt roof failure','flat roof leak','ponding water','EPDM failure'],
 'Failure of the weatherproof membrane on a flat or shallow-pitched roof, typically through UV degradation, thermal splitting, joint failure, or mechanical damage.',
 'Flat roofs have a designed life of 15–25 years depending on the specification. They fail through: (1) UV degradation of felt or EPDM membranes causing hardening and cracking; (2) Thermal movement splitting joints, especially at upstands; (3) Ponding water — flat roofs require a minimum 1:80 fall; deflection of the deck over time causes ponding which accelerates deterioration and can exceed structural capacity; (4) Mechanical damage from foot traffic or building services installation; (5) Blocked outlets flooding the membrane; (6) Blister formation — trapped moisture vaporising under a sealed membrane.',
 ARRAY[
   'Blisters on felt roof surface',
   'Cracked or split membrane at upstands or edges',
   'Standing water (ponding) visible after rain',
   'Water ingress at ceiling below flat roof',
   'Open or lifting membrane laps',
   'Felt membrane that is brittle and cracks when walked on',
   'Green or black algae growth on membrane surface'
 ],
 ARRAY[
   'flat roof blisters membrane',
   'cracked felt roof surface',
   'standing water flat roof ponding',
   'split membrane edge upstand',
   'green algae flat roof'
 ],
 ARRAY['condensation'],
 'Flat roof water ingress is weather-dependent and localised below the roof. Condensation appears on internal cold surfaces unrelated to rain events.',
 3, 'urgent',
 'Repair isolated defects (upstand splits, open laps). If membrane is at end of life, renew with high-performance system (GRP, EPDM, or hot melt). Ensure adequate falls.',
 ARRAY[
   'Assess remaining life of membrane — if over 15 years, budget for full replacement',
   'Clear all roof outlets and check falls',
   'Patch repair open laps and splits with compatible material (short-term)',
   'For full replacement: specify GRP, EPDM, or hot-melt system with 25+ year life',
   'Ensure minimum 1:80 fall to outlets — may require deck overlay',
   'Provide adequate upstand height (minimum 150mm)',
   'Install edge trim to prevent wind uplift'
 ],
 500, 12000,
 ARRAY['BS 6229 Flat Roofs','RICS Flat Roof Survey Guidance','BRE Digest 312'],
 ARRAY['1945-1980','1980-2000'],
 ARRAY['flat-roof'],
 false,
 'If ponding is significant, structural engineer to assess deck capacity.',
 'RICS Roof Construction Guidelines; BRE Digest 312 Flat Roof Design'),

-- 4.4 Chimney Defects
('roof-chimney-defects', 'roofing', 'Chimney Stack Defects',
 ARRAY['chimney spalling','sulphate attack chimney','chimney stack lean'],
 'Deterioration of chimney stacks through sulphate attack on mortar, frost spalling of brickwork, failed flaunching, or structural lean.',
 'Chimneys are uniquely exposed: they project above the roof, receive full weather exposure on four faces, experience thermal cycling from flue gases, and are saturated with acidic flue products. Sulphate attack on Portland cement mortar from sulphate salts in the flue gases causes mortar to expand, crumbling the pointing. Frost action spalls the brickwork face. Flaunching (the mortar at the chimney head bonding the pots) cracks, allowing water into the stack. Chimney stacks can develop a lean from differential weathering or foundation movement. Redundant flues with capped pots can develop severe condensation internally.',
 ARRAY[
   'Spalling brickwork — face of bricks crumbling or detaching on stack',
   'Open or missing mortar joints on chimney',
   'Cracked or missing flaunching at chimney head',
   'Leaning chimney stack (visible lean from ground)',
   'Displaced or missing chimney pots',
   'Horizontal cracking at roof level (where stack meets roof)'
 ],
 ARRAY[
   'spalling brick chimney stack',
   'open mortar joints chimney',
   'cracked flaunching chimney top',
   'leaning chimney stack',
   'missing pot chimney'
 ],
 ARRAY['wall brickwork defects'],
 'Chimney defects are concentrated at the stack itself. Spalling brickwork at other wall positions has different causes (frost damage, salts). Lean at chimney vs. lean of whole building requires different structural responses.',
 3, 'urgent',
 'Repoint all open mortar joints, replace spalled bricks, renew flaunching, rebed pots. Structural investigation for leaning stacks. Consider removing redundant chimney stacks.',
 ARRAY[
   'Inspect from scaffolding or drone — binocular inspection insufficient for detailed assessment',
   'Repoint all eroded mortar joints with appropriate mortar (NOT Portland for old stacks — use NHL lime)',
   'Replace all spalled or frost-damaged bricks like-for-like',
   'Renew flaunching with fresh mortar (minimum 45° slope to shed water)',
   'Check and refix pots',
   'For leaning stack: structural engineer assessment — may require rebuild',
   'Ensure flashings are sound at roof junction'
 ],
 600, 8000,
 ARRAY['BS 5628 Masonry','BS EN 1745'],
 ARRAY['pre-1945'],
 ARRAY['brick'],
 false,
 'Access via scaffolding or cherry-picker essential for safe inspection and repair.',
 'RICS Roof Construction Guidelines; Aspect Surveying Roof Defects Guide');

-- ============================================================
-- CATEGORY 5: MASONRY & WALLS
-- ============================================================
INSERT INTO public.building_pathology_knowledge (
  defect_slug, category, name, aka,
  description, why_it_happens,
  visual_indicators, photo_detection_cues, common_misdiagnosis, differential_diagnosis,
  rics_condition_rating, urgency, remediation_summary, remediation_steps,
  cost_range_gbp_min, cost_range_gbp_max,
  regulatory_reference, property_age_risk, construction_type_risk,
  specialist_required, further_investigation, source_authority
) VALUES

-- 5.1 Wall Tie Failure
('masonry-wall-tie-failure', 'masonry_walls', 'Cavity Wall Tie Failure',
 ARRAY['wall tie corrosion','tie failure','horizontal cracking cavity wall'],
 'Corrosion of the metal ties connecting the inner and outer leaves of cavity walls, causing the ties to expand and force horizontal cracks through the outer leaf, eventually destabilising it.',
 'Cavity walls built before 1981 used mild steel (often butterfly or fish-tail) wall ties. As moisture permeates the cavity, these ties corrode — the rust product occupies up to 3 times the volume of the original steel, exerting enormous pressure on the surrounding mortar bed. This expansion force is transmitted as a horizontal crack running along mortar joints at the height of the tie. As ties fail progressively, the outer leaf loses lateral restraint and can eventually become an independent, unsupported masonry panel — a serious structural safety risk. The BRE classification (BRE 401) rates tie corrosion from class 1 (bright, no problem) to class 9 (very rusty and laminating — urgent).',
 ARRAY[
   'Horizontal stepped cracking running along mortar joints at regular vertical intervals (typically every 5–7 brick courses, ~450mm)',
   'Cracking at mid-to-upper section of external wall',
   'Outer leaf brickwork bulging or ''pillowing'' outward',
   'Cracks running full length of wall elevation',
   'Lifting or displacement of lintels above windows and doors',
   'Cracking that appears at multiple evenly-spaced horizontal levels'
 ],
 ARRAY[
   'horizontal crack mortar joints regular spacing',
   'brickwork bulging outer wall',
   'horizontal cracking regular courses cavity wall',
   'wall pillowing outward brick'
 ],
 ARRAY['thermal movement','sulphate attack','subsidence'],
 'Wall tie failure produces REGULAR HORIZONTAL cracking at tie spacing (~450mm intervals). Sulphate attack produces irregular horizontal cracking following mortar joints. Subsidence produces diagonal cracking. Thermal movement produces vertical cracks at wall ends. Only borescope inspection can definitively confirm tie condition.',
 3, 'urgent',
 'Commission wall tie survey using metal detector and borescope. Replace failed ties with stainless steel remedial ties (resin-fixed). Stitch-repair horizontal cracks with helical bars.',
 ARRAY[
   'Commission specialist wall tie survey — metal detector + borescope inspection',
   'Assess BRE 401 corrosion class for each tie',
   'Install stainless steel remedial wall ties (resin-bonded) per BRE Digest 329',
   'Stitch-crack horizontal cracks with stainless helical bars',
   'Repoint all cracked mortar joints',
   'Do NOT simply fill cracks without tie replacement — outer leaf remains at risk'
 ],
 1500, 12000,
 ARRAY['BRE Digest 329 Wall Tie Corrosion','BRE DG 401','BS 6270 Masonry Repair','Building Regs Part A'],
 ARRAY['1920-1945','1945-1981'],
 ARRAY['cavity-wall'],
 true,
 'Specialist wall tie contractor with metal detector and borescope. CSSW (Certificate in Structural Waterproofing) or equivalent.',
 'BRE DG 401; Brick-Tie Ltd; Property Elite APC Hot Topics'),

-- 5.2 Sulphate Attack on Mortar
('masonry-sulphate-attack', 'masonry_walls', 'Sulphate Attack on Mortar',
 ARRAY['sulphate expansion','mortar crumbling','render blistering'],
 'Chemical reaction between sulphate salts (from brickwork, ground, or flue products) and Portland cement or hydraulic lime in mortar, causing the mortar to expand, crack, and eventually crumble.',
 'Sulphate attack occurs when: (1) Sulphate salts from the ground, from old chimney brickwork (flue products), or from historic gypsum plaster in walls react with the tricalcium aluminate in Portland cement; (2) The mortar is kept persistently wet, accelerating the chemical reaction; (3) The original mortar was too strong (high Portland cement content) which makes it more susceptible. The result is ettringite crystal growth within the mortar matrix, causing volumetric expansion. The mortar expands horizontally along the bed joints, causing them to open, and render to blow away from the wall face. Chimneys are especially vulnerable (acidic sulphurous flue gases + persistent moisture).',
 ARRAY[
   'Horizontal cracking along mortar bed joints — mortar appears to be expanding',
   'Render blistering or detaching from wall in sheets',
   'Mortar crumbling or turning friable and sandy',
   'Map cracking on render surface',
   'Most severe at chimney stacks and parapets',
   'Affected areas often have a damp history',
   'Mortar joints appear to be opening or ''mushrooming'' outward'
 ],
 ARRAY[
   'horizontal crack mortar beds expanding',
   'render blowing off wall',
   'crumbling mortar joints brickwork',
   'map cracking render surface',
   'mortar mushrooming bed joint'
 ],
 ARRAY['wall tie failure','frost damage'],
 'Sulphate attack produces IRREGULAR horizontal cracking following mortar bed joints, often with friable/crumbling mortar. Wall tie failure produces REGULAR horizontal cracking at tie intervals with intact mortar. Frost damage (spalling) affects brick faces not mortar.',
 3, 'urgent',
 'Remove all affected mortar and render. Repoint with sulphate-resistant cement or appropriate lime mortar. Address persistent damp causing the problem.',
 ARRAY[
   'Identify and address source of persistent moisture',
   'Rake out all affected mortar joints to minimum 20mm depth',
   'Repoint with sulphate-resistant mortar (SRPC) or NHL3.5 lime mortar',
   'Remove and replace all affected render with breathable lime render',
   'Do NOT reuse existing render mix — it is contaminated',
   'For chimneys: use lime mortar only — never Portland cement'
 ],
 500, 6000,
 ARRAY['BRE Digest 362 Building Mortars','BS EN 197 Cement','Building Regs Part C'],
 ARRAY['pre-1945','1945-1970'],
 ARRAY['brick','rendered','chimney'],
 false, NULL,
 'BRE Digest 362; Designing Buildings — Defects in Brickwork'),

-- 5.3 Efflorescence and Spalling Brickwork
('masonry-spalling-brickwork', 'masonry_walls', 'Spalling Brickwork',
 ARRAY['frost spalling','face spalling','brick erosion','cryptoflorescence'],
 'Physical deterioration of brick faces through frost action or sub-surface salt crystallisation, causing the brick face to flake, pit, or detach.',
 'Spalling occurs through two mechanisms: (1) Frost action — water penetrates porous brickwork and freezes. Water expands 9% on freezing, generating pressures that exceed the tensile strength of the brick face, causing spalling. Soft, porous bricks are most vulnerable. Occurs mostly on exposed elevations and parapets. (2) Cryptoflorescence — salts crystallise just BELOW the brick surface (not on the surface, unlike efflorescence). The growing crystals exert pressure that detaches the face. Sources: de-icing salts, sea spray, ground salts, cement-based mortars. Spalled brickwork exposes the interior of the brick, which is even more porous, accelerating deterioration.',
 ARRAY[
   'Brick face flaking, pitting, or detaching in layers',
   'Crumbling or friable surface of brick',
   'Exposed soft brick interior visible where face has spalled',
   'White crystalline deposits (efflorescence) on surface preceding spalling',
   'Most severe on exposed (west/south) elevations and parapets',
   'Frost damage typically worst in spring after winter freezing'
 ],
 ARRAY[
   'spalling brick face detaching',
   'pitted eroded brickwork surface',
   'brick face flaking crumbling',
   'white salt deposits brickwork',
   'brick erosion exposed core'
 ],
 ARRAY['sulphate attack'],
 'Spalling: brick face detaches. Sulphate attack: mortar joints crack and expand. Both may occur together. Efflorescence (white surface salts) is usually cosmetic unless progressing to cryptoflorescence.',
 2, 'soon',
 'Replace all spalled bricks with matching bricks of similar porosity specification. Do NOT use hard, impermeable repointing mortar on soft old brickwork — trap moisture and accelerate spalling.',
 ARRAY[
   'Remove all loose and spalled brick material',
   'Replace with matching bricks — porosity, size, and colour should match',
   'Use appropriate lime mortar for pointing — not hard Portland cement',
   'Consider masonry water repellent treatment on exposed elevations',
   'Address sources of salt contamination if identifiable',
   'Ensure cavity drainage is not blocked'
 ],
 300, 5000,
 ARRAY['BS 3921 Bricks','BRE Digest 362','BS 8000-3 Masonry Workmanship'],
 ARRAY['pre-1919','1919-1945'],
 ARRAY['solid-wall','brick'],
 false, NULL,
 'BRE Digest 362; Sussex Damp Experts — White Powder on Brick Walls'),

-- 5.4 Cavity Wall Insulation Failure
('masonry-cwi-failure', 'masonry_walls', 'Cavity Wall Insulation Failure',
 ARRAY['CWI failure','wall insulation damp','cavity insulation bridging'],
 'Cavity wall insulation (mineral fibre, polystyrene beads, or polyurethane foam) that has been poorly installed or has subsequently degraded, allowing moisture to bridge the cavity and penetrate the inner leaf.',
 'CWI is generally suitable for sheltered locations but can cause serious problems when: (1) Installed in a property in an exposed location (Zone 3 or 4 wind-driven rain exposure); (2) Poorly installed with gaps, voids, or slumping; (3) The outer leaf has defects (open joints, cracks) that allow water ingress which is then wicked across to the inner leaf by the insulation; (4) Blown fibre CWI settles over time leaving an uninsulated gap at the top of the wall; (5) The wall was previously dry but CWI installation bridges the DPC. CWI failure affects approximately 700,000 homes in the UK according to consumer groups.',
 ARRAY[
   'Widespread damp patches on inner face of external walls, not localised',
   'Damp appearing after CWI installation that was not present before',
   'Cold spots on inner walls detected by thermal imaging',
   'Damp patches in multiple rooms on external walls',
   'No single external defect explaining widespread internal damp',
   'Property in exposed coastal or upland location with CWI'
 ],
 ARRAY[
   'widespread damp external wall inner face',
   'damp patches multiple walls internal',
   'cold spots thermal imaging wall'
 ],
 ARRAY['penetrating damp','condensation'],
 'CWI failure produces widespread internal damp across external walls without a single identifiable external defect. It is exposure-zone and installation-quality dependent. Borescope of cavity can confirm CWI condition and bridging.',
 3, 'urgent',
 'Commission specialist cavity extraction. Consider CIGA guarantee claim if installed under guarantee. Cavity may need to be left empty or refilled with appropriate specification for exposure zone.',
 ARRAY[
   'Commission borescope survey of cavity to assess insulation condition',
   'Contact CIGA (Cavity Insulation Guarantee Agency) for guarantee claim if applicable',
   'Commission specialist CWI extraction if confirmed as cause',
   'Address any outer leaf defects (repoint, repair render) before cavity re-examination',
   'Consider leaving cavity empty or using appropriate material for exposure zone',
   'Allow internal fabric to dry — may take months'
 ],
 2000, 8000,
 ARRAY['BS 8208 CWI Assessment','CIGA Guarantee Conditions','BRE Digest 236'],
 ARRAY['1970-2010'],
 ARRAY['cavity-wall','insulated'],
 true,
 'CIGA-registered specialist for extraction. BBA-certified materials required for reinstatement.',
 'BRE Digest 236; CIGA — Cavity Insulation Guarantee Agency');

-- ============================================================
-- CATEGORY 6: DRAINAGE
-- ============================================================
INSERT INTO public.building_pathology_knowledge (
  defect_slug, category, name, aka,
  description, why_it_happens,
  visual_indicators, photo_detection_cues, common_misdiagnosis, differential_diagnosis,
  rics_condition_rating, urgency, remediation_summary, remediation_steps,
  cost_range_gbp_min, cost_range_gbp_max,
  regulatory_reference, property_age_risk, construction_type_risk,
  specialist_required, further_investigation, source_authority
) VALUES

-- 6.1 Pitch Fibre Pipe Failure
('drain-pitch-fibre-failure', 'drainage', 'Pitch Fibre Pipe Failure',
 ARRAY['pitch fibre delamination','pitch fibre egg-shape','pitch fibre blistering'],
 'Deterioration and deformation of pitch fibre drainage pipes, used extensively in UK housing from the late 1940s to the 1970s, causing partial or full blockage, collapse, and ground contamination.',
 'Pitch fibre pipes were developed in the 1940s as a lightweight, cheap alternative to clay during post-war housing construction. They consist of wood cellulose fibres impregnated with coal tar pitch. Over decades, exposure to hot water, oils, and fats causes the pipe to soften and delaminate internally (blistering), reducing the internal bore and causing blockages. Ground pressure causes the weakened pipe to deform from round to oval (''egg-shaping'') and eventually collapse. Tree roots can penetrate at joints. The NHBC considers pitch fibre pipes to have reached end of useful life.',
 ARRAY[
   'Slow drainage or recurrent blockages in properties built 1945–1975',
   'Gurgling sounds from drain when water flows',
   'CCTV survey: internal blistering, oval deformation, root ingress at joints',
   'Damp ground or vegetation growth over drain run',
   'Inspection chamber: particles of pitch material visible in flow'
 ],
 ARRAY[
   'slow drain blockage older property',
   'gurgling drain sounds',
   'vegetation growth over drain line'
 ],
 ARRAY['tree root blockage','fat blockage'],
 'Pitch fibre failure is confirmed by CCTV drainage survey showing blistering, deformation, or collapse. CCTV is the only reliable diagnostic method.',
 3, 'urgent',
 'CCTV drainage survey to assess condition. Relay with vitrified clay or PVC-u pipe if significantly deformed or collapsed. Minor defects: drain relining.',
 ARRAY[
   'Commission CCTV drainage survey — essential for diagnosis',
   'Assess condition: if significantly deformed or collapsed, relay is required',
   'Minor defects: consider drain relining (Patch-Liner or continuous slip lining)',
   'Major failure: excavate and relay with vitrified clay or PVC-u',
   'Clear any root ingress before relining',
   'Ensure new connections are properly jointed to avoid future root ingress'
 ],
 500, 8000,
 ARRAY['BS EN 1401 PVC Drainage','NHBC Standards Chapter 5.1'],
 ARRAY['1945-1975'],
 ARRAY['all'],
 true,
 'CCTV drainage survey by specialist drainage contractor. Report required for mortgage lenders on many older properties.',
 'Pitch Fibre Specialists UK; WaterSafe Drainage Guide'),

-- 6.2 Tree Root Ingress
('drain-root-ingress', 'drainage', 'Tree Root Ingress to Drains',
 ARRAY['root blockage','root ingress pipe'],
 'Tree or shrub roots entering drainage pipes through joints or cracks, causing blockages and eventually pipe collapse.',
 'Plant roots actively seek moisture. Drainage pipes carry moisture-laden waste water — any slight imperfection at a pipe joint will allow fine roots to enter. Once inside, roots grow rapidly in the warm, moist, nutrient-rich environment, eventually forming a dense mass that blocks flow. As roots grow, they can fracture the pipe and displace joints. Clay pipes from pre-1970 construction with butt joints are most vulnerable. Roots from trees within 2× the mature tree height from the pipe run are a risk. Willows, poplars, and ash are especially aggressive.',
 ARRAY[
   'Slow drainage or recurrent blockages, especially after rainfall',
   'CCTV: visible roots at joints, root mass in pipe, pipe distortion from root pressure',
   'Subsidence cracking if associated with root damage to foundations',
   'Damp ground above drain run'
 ],
 ARRAY[
   'recurrent drain blockage near trees',
   'slow drainage near trees',
   'root visible inspection chamber'
 ],
 ARRAY['fat/grease blockage','pitch fibre failure'],
 'Root ingress is confirmed by CCTV. It correlates with nearby trees. Fat/grease blockages are at the property outlet, not at pipe joints. Pitch fibre failure produces deformation/blistering, not linear root masses.',
 2, 'soon',
 'CCTV drainage survey. Clear roots mechanically or with high-pressure jetting. Repair/replace affected pipe sections. Consider root-barrier systems near vulnerable pipes.',
 ARRAY[
   'CCTV drainage survey to locate extent of ingress',
   'Clear roots by high-pressure water jetting or mechanical cutting',
   'Repair cracked/displaced joints by relining or pipe replacement',
   'Consider chemical root treatment for persistent minor ingress',
   'If trees are on property: consider removal or root barrier installation',
   'Regular annual maintenance jetting in high-risk locations'
 ],
 300, 5000,
 ARRAY['BS EN 1610 Sewer Construction'],
 ARRAY['pre-1970'],
 ARRAY['all'],
 false, NULL,
 'Express Drainage Surveys; Terrain Surveys UK');

-- ============================================================
-- CATEGORY 7: WINDOWS & DOORS
-- ============================================================
INSERT INTO public.building_pathology_knowledge (
  defect_slug, category, name, aka,
  description, why_it_happens,
  visual_indicators, photo_detection_cues, common_misdiagnosis, differential_diagnosis,
  rics_condition_rating, urgency, remediation_summary, remediation_steps,
  cost_range_gbp_min, cost_range_gbp_max,
  regulatory_reference, property_age_risk, construction_type_risk,
  specialist_required, further_investigation, source_authority
) VALUES

-- 7.1 Failed Double Glazing Unit
('window-failed-double-glazing', 'windows_doors', 'Failed Double Glazed Unit',
 ARRAY['misted double glazing','foggy windows','seal failure IGU'],
 'Failure of the hermetic seal of a sealed insulating glass unit (IGU), allowing moisture ingress between the panes and producing persistent misting or fogging.',
 'Double glazed units consist of two glass panes separated by an aluminium or warm-edge spacer bar containing desiccant, sealed at the perimeter with hot-melt butyl and polysulphide or silicone sealants. The sealed cavity is filled with air or inert gas (argon). Seal failure occurs through: thermal cycling over 15–25 years causing progressive fatigue of the sealant; UV degradation; frame distortion stressing the edge seal; poor original installation with insufficient edge clearance. Once the seal fails, warm moist air enters the cavity, the desiccant saturates, and moisture condenses persistently on the inner glass surfaces — it cannot evaporate back out.',
 ARRAY[
   'Persistent misting or fogging BETWEEN the two panes of glass',
   'Condensation visible between the panes that does not clear',
   'Staining or deposits on inner glass surfaces',
   'Rainbow-effect or iridescence in failed units',
   'Misting worst in cold weather / morning'
 ],
 ARRAY[
   'misted double glazing between panes',
   'foggy glass inside window unit',
   'condensation between glass panes',
   'rainbow iridescence double glazing'
 ],
 ARRAY['surface condensation','single glazing condensation'],
 'Failed IGU: misting is BETWEEN the panes and does not clear. Surface condensation: forms ON the internal glass surface and clears when room is ventilated. Distinguish by touching the glass — if misting is behind the inner pane, the unit has failed.',
 2, 'soon',
 'Replace failed sealed units (not the frame unless also defective). Like-for-like replacement: same size, same spacer type. Argon-filled units preferred.',
 ARRAY[
   'Identify all failed units by visual inspection in cold/humid conditions',
   'Measure unit size precisely (width × height × thickness)',
   'Order replacement units from glass supplier — match existing specification',
   'Remove failed unit from frame and fit replacement with correct glazing packers',
   'Replace any degraded glazing bead or seal'
 ],
 80, 300,
 ARRAY['BS EN 1279 Insulating Glass','Building Regs Part L Energy Efficiency'],
 ARRAY['1980-2010'],
 ARRAY['all'],
 false, NULL,
 'SAM Conveyancing Double Glazing Guide; Surveyor Local Double Glazing'),

-- 7.2 Timber Window Frame Wet Rot
('window-timber-frame-wet-rot', 'windows_doors', 'Timber Window Frame Wet Rot',
 ARRAY['rotting window sill','timber frame decay','rotten window bottom rail'],
 'Wet rot decay of timber window frames, typically at the bottom rail, sill, or glazing bead where water pools and paint protection fails.',
 'Water ingress around glazing and at joints in timber window frames allows moisture content to exceed 50%, initiating wet rot. The bottom rail and sill are most vulnerable — rain runs down the glass and collects at the bottom rail/sill junction. Failed paint or sealant at the glazing bead allows water to penetrate behind the glass and saturate the timber. Poor or absent drainage grooves on sills allow water to pond. Historic properties with original single glazing and timber frames are most affected.',
 ARRAY[
   'Soft, spongy timber at bottom of window frame when probed',
   'Paint breaking down, blistering, or flaking at sill or bottom rail',
   'Brown or dark discolouration of timber at frame base',
   'Visible cracks or splits in painted timber surface',
   'Spring/bounce when pressing sill — hollow underneath',
   'Gap forming between sill and wall below window'
 ],
 ARRAY[
   'paint peeling window sill timber',
   'soft rotten window sill bottom',
   'blistering paint timber frame window',
   'brown discolouration timber window base'
 ],
 ARRAY['dry rot'],
 'Wet rot in windows is localised to the wet zone (usually sill and bottom rail). It does not spread. Dry rot can spread but is far less common in windows and would show white mycelium and cuboid cracking.',
 2, 'soon',
 'Remove all soft decayed timber. For localised decay: epoxy consolidant and filler repair. For extensive decay: replace bottom rail or sill section with pre-treated hardwood. Prime and repaint all bare timber.',
 ARRAY[
   'Probe all timber surfaces to identify extent of decay',
   'Treat minor areas with epoxy consolidant (Ronseal or Timbabuild)',
   'Fill with epoxy wood filler, shape, and sand flush',
   'For extensive decay: cut out and splice in new pre-treated hardwood section',
   'Prime ALL bare timber immediately before moisture re-enters',
   'Apply two coats gloss paint, ensuring all joints are sealed',
   'Check and replace any failed glazing sealant'
 ],
 100, 1500,
 ARRAY['BS EN 335 Timber Durability','BRE BR 453'],
 ARRAY['pre-1980'],
 ARRAY['traditional'],
 false, NULL,
 '1st Associated Surveyors; LABC Warranty Timber Window Failures');

-- ============================================================
-- CATEGORY 8: HAZARDOUS MATERIALS
-- ============================================================
INSERT INTO public.building_pathology_knowledge (
  defect_slug, category, name, aka,
  description, why_it_happens,
  visual_indicators, photo_detection_cues, common_misdiagnosis, differential_diagnosis,
  rics_condition_rating, urgency, remediation_summary, remediation_steps,
  cost_range_gbp_min, cost_range_gbp_max,
  regulatory_reference, property_age_risk, construction_type_risk,
  specialist_required, further_investigation, source_authority
) VALUES

-- 8.1 Asbestos Containing Materials
('hazmat-asbestos', 'hazardous_materials', 'Asbestos Containing Materials (ACM)',
 ARRAY['asbestos','ACM','artex asbestos','asbestos insulating board','AIB'],
 'Asbestos was used extensively in UK building construction until its full ban in 1999. When disturbed, it releases fibres causing mesothelioma and lung cancer. Present in many properties built before 1999.',
 'Asbestos was valued for its fire resistance, insulation properties, and strength. It was incorporated into: textured coatings (Artex pre-1984), ceiling tiles (AIB), floor tiles (vinyl), pipe lagging, roof sheets (corrugated asbestos cement), soffits, garage roofs, boiler flues, and partition boards. It is harmless when undisturbed in good condition (bound asbestos cement). It becomes a serious health risk when drilled, sanded, abraded, or demolished — releasing respirable fibres. The Control of Asbestos Regulations 2012 requires management surveys in commercial premises; domestic properties require survey before major renovation.',
 ARRAY[
   'Textured ceiling coating (Artex-style) in pre-1984 properties',
   'Corrugated grey roof or garage panels (asbestos cement)',
   'Grey fibrous pipe lagging on old boiler flues or heating pipes',
   'Ceiling tiles with fibrous appearance in 1960s–1970s office conversions',
   'Soffit boards (fascia/soffit) on 1960s–1970s properties',
   'Old floor tiles (9×9 inch vinyl square tiles pre-1980)'
 ],
 ARRAY[
   'textured ceiling artex coating',
   'corrugated roof sheet grey garage',
   'pipe lagging grey fibrous old boiler',
   'grey ceiling tiles 1960s',
   'soffit board fibrous 1970s property'
 ],
 ARRAY['ordinary plaster','ordinary roofing'],
 'Asbestos cement panels look like ordinary fibre cement but are grey-white and sound hollow when tapped. Artex-style textured ceilings in pre-1984 properties should be assumed to contain asbestos until tested. Only laboratory analysis of a sample can confirm or exclude asbestos.',
 3, 'immediate',
 'Do not disturb. Commission asbestos survey (management survey or refurbishment survey) by UKAS-accredited surveyor before any works. Encapsulate or remove by licensed contractor if in poor condition.',
 ARRAY[
   'Do NOT drill, sand, cut, or disturb any suspect material',
   'Commission management asbestos survey by UKAS-accredited surveyor',
   'If removal required: licensed asbestos removal contractor (ARCA member)',
   'If encapsulation: apply approved sealant, keep under periodic inspection',
   'Register asbestos location in property asbestos register'
 ],
 300, 15000,
 ARRAY['Control of Asbestos Regulations 2012','HSE L143 Approved Code','BS ISO 16000 Indoor Air'],
 ARRAY['pre-1999','pre-1984','pre-1970'],
 ARRAY['all'],
 true,
 'UKAS-accredited asbestos surveyor for survey. HSE-licensed contractor for removal.',
 'HSE Asbestos Guidance; RICS Building Pathology APC'),

-- 8.2 Japanese Knotweed
('hazmat-japanese-knotweed', 'hazardous_materials', 'Japanese Knotweed',
 ARRAY['Fallopia japonica','knotweed','invasive plant'],
 'Japanese knotweed (Fallopia japonica) is one of the UK''s most invasive plants. It can damage building foundations, drainage systems, and flood defences, and significantly affects mortgage availability and property value.',
 'Japanese knotweed was introduced to the UK as an ornamental plant in the 1850s. It spreads exclusively vegetatively — a fragment of rhizome (underground stem) as small as 10g can regenerate an entire plant. It grows up to 20cm per day in summer. The rhizome system can penetrate concrete, block-paving, and drainage systems, exploiting existing weak points rather than forcing through solid material. Mortgage lenders require a management plan and evidence of professional treatment before lending. It is not illegal to have knotweed on private land, but allowing it to spread to adjacent land is an offence. It is on Schedule 9 of the Wildlife and Countryside Act 1981.',
 ARRAY[
   'Hollow bamboo-like stems with purple-red mottled markings, growing 1–3m tall in summer',
   'Large heart/spade-shaped leaves (up to 120mm) with flat base',
   'Cream/white flowers in late summer (August–September)',
   'Dense thicket or stand of hollow cane-like stems',
   'Orange-red rhizomes visible when excavated',
   'New red shoots in spring, like asparagus in appearance'
 ],
 ARRAY[
   'bamboo-like stems purple mottled',
   'large heart shaped leaves dense stand',
   'hollow cane stems garden',
   'white cream flowers late summer plant',
   'asparagus-like red shoots spring'
 ],
 ARRAY['bamboo','Russian vine','giant knotweed'],
 'Japanese knotweed: hollow purple-mottled stems, heart-shaped leaves with flat base, cream flowers. Bamboo: round smooth green stems. Giant knotweed: similar but larger, on railway lines and riverbanks.',
 3, 'urgent',
 'Engage PCA-accredited knotweed specialist for assessment and management plan. Professional herbicide treatment (3–5 year programme). Obtain 10-year insurance-backed guarantee for mortgage lenders.',
 ARRAY[
   'Commission assessment by PCA-accredited knotweed specialist',
   'Obtain formal management plan — required by most mortgage lenders',
   'Begin herbicide treatment programme (glyphosate-based, 3–5 years)',
   'Obtain 10-year insurance-backed guarantee on treatment',
   'Do NOT excavate or disturb rhizomes without proper containment',
   'Do NOT compost knotweed — it is controlled waste (EA guidance)',
   'Notify neighbours if spread is likely'
 ],
 1500, 12000,
 ARRAY['Wildlife & Countryside Act 1981 Schedule 9','Environmental Protection Act 1990','RICS Japanese Knotweed Guidance 2022'],
 ARRAY['all'],
 ARRAY['all'],
 true,
 'PCA-accredited specialist. 10-year insurance-backed guarantee required by RICS-compliant lenders.',
 'RICS Japanese Knotweed Guidance 2022; Property Care Association');

-- ============================================================
-- CATEGORY 9: ELECTRICAL & SERVICES (Advisory)
-- ============================================================
INSERT INTO public.building_pathology_knowledge (
  defect_slug, category, name, aka,
  description, why_it_happens,
  visual_indicators, photo_detection_cues, common_misdiagnosis, differential_diagnosis,
  rics_condition_rating, urgency, remediation_summary, remediation_steps,
  cost_range_gbp_min, cost_range_gbp_max,
  regulatory_reference, property_age_risk, construction_type_risk,
  specialist_required, further_investigation, source_authority
) VALUES

-- 9.1 Outdated Electrical Installation
('services-outdated-electrical', 'services', 'Outdated Electrical Installation',
 ARRAY['old wiring','pre-1966 wiring','unsafe electrics','no RCD'],
 'Electrical installations that do not comply with current standards (BS 7671), posing fire and electrocution risk. Surveyors report on visual signs only — EICR by electrician required for testing.',
 'UK electrical wiring regulations (BS 7671, the IET Wiring Regulations) are updated every few years. Pre-1966 wiring used rubber or fabric-insulated cable that hardens and cracks over time, posing fire risk. Pre-1947 installations used round-pin sockets. Pre-1980 consumer units often lack RCD (residual current device) protection, which trips in 30 milliseconds to prevent electrocution. Homes without modern consumer units and RCD protection face significantly elevated fire and electrocution risk. EICR (Electrical Installation Condition Report) is the definitive assessment — surveyors only note visual signs.',
 ARRAY[
   'Round-pin sockets (2- or 3-pin) — pre-1947 installation',
   'Older-style square flat-pin sockets without shutters — pre-1966',
   'Rubber or fabric-covered wiring visible at consumer unit or light fittings',
   'Old Wylex consumer unit with ceramic fuses (no MCBs or RCDs)',
   'No RCD button visible on consumer unit',
   'Aluminium wiring (silver-coloured conductors) — 1960s–1970s risk'
 ],
 ARRAY[
   'round pin socket old electrical outlet',
   'old fuse box ceramic fuses',
   'fabric wiring insulation old',
   'no rcd consumer unit'
 ],
 ARRAY[]::text[],
 NULL,
 3, 'immediate',
 'Commission EICR (Electrical Installation Condition Report) from Part P registered electrician immediately. Budget for rewire if pre-1966 installation.',
 ARRAY[
   'Commission EICR from NICEIC or NAPIT registered electrician immediately',
   'If pre-1966 wiring: budget for full rewire (typically £3,500–£6,500 for 3-bed house)',
   'Replace old consumer unit with modern dual RCD or RCBO unit if otherwise acceptable',
   'Ensure all sockets upgraded to shuttered BS 1363 pattern',
   'Test earthing and bonding to current Part P requirements'
 ],
 500, 8000,
 ARRAY['BS 7671 IET Wiring Regulations 18th Ed','Building Regs Part P Electrics','NICEIC Good Practice Guide'],
 ARRAY['pre-1966','pre-1947'],
 ARRAY['all'],
 true,
 'NICEIC or NAPIT registered electrician for EICR. Part P notification for major works.',
 'RICS Home Survey Standard; HomeBuyers Survey Electrical Checks Guide');

-- ============================================================
-- CATEGORY 10: GROUND FLOOR & FOUNDATIONS
-- ============================================================
INSERT INTO public.building_pathology_knowledge (
  defect_slug, category, name, aka,
  description, why_it_happens,
  visual_indicators, photo_detection_cues, common_misdiagnosis, differential_diagnosis,
  rics_condition_rating, urgency, remediation_summary, remediation_steps,
  cost_range_gbp_min, cost_range_gbp_max,
  regulatory_reference, property_age_risk, construction_type_risk,
  specialist_required, further_investigation, source_authority
) VALUES

-- 10.1 Suspended Timber Ground Floor Defects
('floor-suspended-timber-defects', 'ground_floor', 'Suspended Timber Ground Floor Defects',
 ARRAY['rotten floor joists','bouncy floor','inadequate sub-floor ventilation'],
 'Deterioration of suspended timber ground floor construction through inadequate ventilation causing rot, beetle infestation, or structural weakening of joists and boards.',
 'Suspended timber ground floors consist of floor boards over joists spanning between sleeper walls, with a void beneath. The void must be ventilated via airbricks to prevent moisture accumulating and causing wet rot or dry rot. Problems arise when: (1) Airbricks are blocked by debris, raised ground levels, or garden extensions; (2) Sub-floor void is too shallow (post-war housing); (3) Ground beneath was not treated or blinded; (4) DPC to sleeper walls failed. A blocked-up airbrick is the single most common cause of suspended floor rot in the UK. Floor insulation retrofits without vapour control can also trap moisture.',
 ARRAY[
   'Springy or bouncy floor surface indicating weak or decayed joists',
   'Blocked or missing airbricks visible externally at low level',
   'External ground level close to or above DPC/airbrick level',
   'Musty smell at floor level with no obvious damp on walls',
   'Floor boards soft or rotten at perimeter (near walls)',
   'Evidence of dry or wet rot in floor void (if accessible)'
 ],
 ARRAY[
   'blocked airbrick low level external wall',
   'bouncy springy timber floor boards',
   'ground level high near airbrick',
   'missing airbrick external wall base'
 ],
 ARRAY['rising damp'],
 'Suspended floor rot is localised to the floor void and manifests as springy boards or musty smell. Rising damp affects walls. Both may co-exist if DPC is also failed.',
 3, 'urgent',
 'Clear or reinstate airbricks to provide cross-ventilation. Treat or replace decayed joists. Inspect for dry rot — if found, invoke dry rot protocol.',
 ARRAY[
   'Inspect sub-floor void via lifted board or access hatch',
   'Clear all blocked airbricks — provide minimum 150cm² per metre run of wall',
   'Lower external ground levels if above airbrick',
   'Probe joists and boards throughout void for decay',
   'Treat any wet rot with fungicide preservative',
   'Replace structurally compromised joists with pre-treated timber',
   'Inspect for dry rot — if present, invoke full dry rot protocol'
 ],
 300, 8000,
 ARRAY['Building Regs Part C','RICS Domestic Building Surveying'],
 ARRAY['pre-1945','1945-1970'],
 ARRAY['suspended-timber-floor'],
 false,
 'If dry rot found in floor void, commission specialist mycologist survey.',
 'BRE BR 453; RICS Building Pathology Competency APC');

-- ============================================================
-- Grant read access to service role
-- ============================================================
GRANT SELECT ON public.building_pathology_knowledge TO service_role;
GRANT SELECT ON public.building_pathology_knowledge TO anon;
GRANT SELECT ON public.building_pathology_knowledge TO authenticated;
