import { StackRouter, StackActions } from '@react-navigation/routers';
it.each([
  ['JobDetails'],
  ['JobsList', 'JobDetails'],
  ['JobsList', 'JobDetails', 'ContractView', 'JobDetails'],
])('returns to the list from %j', (...names: string[]) => {
  const router = StackRouter({ initialRouteName: 'JobsList' });
  const options = {
    routeNames: ['JobsList', 'JobDetails', 'ContractView'],
    routeParamList: {},
    routeGetIdList: {},
  };
  const state = router.getRehydratedState(
    {
      stale: true,
      routes: names.map((name, i) => ({ key: String(i), name })),
      index: names.length - 1,
    },
    options
  );
  const next = router.getStateForAction(
    state,
    StackActions.popTo('JobsList'),
    options
  );
  expect(next?.routes[next.index].name).toBe('JobsList');
  expect(next?.routes.filter((r) => r.name === 'JobDetails')).toHaveLength(0);
});
