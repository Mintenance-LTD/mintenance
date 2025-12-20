module.exports = [
  {
    name: 'Initial Bundle',
    path: '.next/static/chunks/pages/_app-*.js',
    limit: '500 KB',
    webpack: true,
    running: false,
  },
  {
    name: 'Home Page',
    path: '.next/static/chunks/pages/index-*.js',
    limit: '150 KB',
    webpack: true,
    running: false,
  },
  {
    name: 'Jobs Page',
    path: '.next/static/chunks/pages/jobs-*.js',
    limit: '200 KB',
    webpack: true,
    running: false,
  },
  {
    name: 'Dashboard',
    path: '.next/static/chunks/pages/dashboard-*.js',
    limit: '250 KB',
    webpack: true,
    running: false,
  },
  {
    name: 'Shared Chunks',
    path: '.next/static/chunks/*.js',
    limit: '1 MB',
    webpack: true,
    running: false,
  },
];
