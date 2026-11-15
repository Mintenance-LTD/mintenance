const crypto = require('node:crypto');
/** Called only after bootstrap-e2e validates its disposable loopback database. */
exports.seedReview48 = async function (db, users, env) {
  const property = crypto.randomUUID();
  const check = async (operation) => {
    const result = await operation;
    if (result.error)
      throw new Error('Review 48 fixture: ' + result.error.message);
  };
  await check(
    db.from('properties').insert({
      id: property,
      owner_id: users.homeowner,
      property_name: 'Synthetic review property',
      address: 'Synthetic Street, London',
      property_type: 'residential',
    })
  );
  env.E2E_REVIEW_PROPERTY_ID = property;
  const start = new Date();
  start.setUTCDate(start.getUTCDate() + 2);
  start.setUTCHours(11, 0, 0, 0);
  const end = new Date(start.getTime() + 86400000);
  env.E2E_REVIEW_START = start.toISOString();
  env.E2E_REVIEW_END = end.toISOString();
  const date = start.toISOString().slice(0, 10);
  const signed = new Date(Date.now() - 20 * 86400000).toISOString();
  for (const role of ['homeowner', 'contractor']) {
    const id = crypto.randomUUID();
    env['E2E_REVIEW_' + role.toUpperCase() + '_JOB_ID'] = id;
    await check(
      db.from('jobs').insert({
        id,
        property_id: property,
        homeowner_id: users.homeowner,
        contractor_id: users.contractor,
        title: 'Synthetic schedule ' + role,
        description:
          'Synthetic schedule verification without any charge or real work.',
        status: 'assigned',
        category: 'plumbing',
        urgency: 'medium',
        location: 'London',
        budget: 2.4,
        scheduled_start_date: start.toISOString(),
        scheduled_end_date: end.toISOString(),
      })
    );
    await check(
      db.from('contracts').insert({
        job_id: id,
        homeowner_id: users.homeowner,
        contractor_id: users.contractor,
        amount: 2.4,
        title: 'Synthetic signed agreement',
        status: 'accepted',
        start_date: start.toISOString(),
        end_date: end.toISOString(),
        terms: {
          materials_terms: 'No materials required for this synthetic fixture',
          warranty_terms: 'No additional contractual warranty',
        },
        contractor_signed_at: signed,
        homeowner_signed_at: signed,
        cancellation_deadline: new Date(Date.now() - 86400000).toISOString(),
      })
    );
    await check(
      db.from('appointments').insert({
        job_id: id,
        contractor_id: users.contractor,
        client_id: users.homeowner,
        title: 'Synthetic visit ' + role,
        appointment_date: date,
        start_time: '11:00',
        end_time: '15:00',
        status: 'scheduled',
      })
    );
  }
  const fresh = crypto.randomUUID();
  env.E2E_REVIEW_CONTRACT_JOB_ID = fresh;
  await check(
    db
      .from('jobs')
      .insert({
        id: fresh,
        property_id: property,
        homeowner_id: users.homeowner,
        contractor_id: users.contractor,
        title: 'Synthetic fresh agreement',
        description:
          'Synthetic explicit terms journey, no payment or real work.',
        status: 'assigned',
        category: 'plumbing',
        urgency: 'medium',
        location: 'London',
      })
  );
};
