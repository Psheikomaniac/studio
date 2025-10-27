module.exports = {
  ci: {
    collect: {
      startServerCommand: 'npm run build && npm run start',
      url: [
        'http://localhost:3000/',
        'http://localhost:3000/dashboard',
        'http://localhost:3000/players',
        'http://localhost:3000/money'
      ],
      numberOfRuns: 3,
      settings: {
        preset: 'desktop',
        throttling: {
          rttMs: 40,
          throughputKbps: 10240,
          cpuSlowdownMultiplier: 1
        }
      }
    },
    assert: {
      assertions: {
        'categories:performance': ['error', { minScore: 0.9 }],
        'categories:accessibility': ['error', { minScore: 0.9 }],
        'categories:best-practices': ['warn', { minScore: 0.85 }],

        // Performance budgets
        'first-contentful-paint': ['error', { maxNumericValue: 2000 }],
        'largest-contentful-paint': ['error', { maxNumericValue: 2500 }],
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],
        'total-blocking-time': ['error', { maxNumericValue: 300 }],
        'speed-index': ['error', { maxNumericValue: 3000 }],

        // Resource budgets
        'resource-summary:script:size': ['error', { maxNumericValue: 750000 }],
        'resource-summary:total:size': ['warn', { maxNumericValue: 2000000 }],

        // Firebase-specific
        'unused-javascript': ['warn', { minScore: 0.8 }],
        'uses-text-compression': ['error', { minScore: 1 }]
      }
    },
    upload: {
      target: 'temporary-public-storage'
    }
  }
};
