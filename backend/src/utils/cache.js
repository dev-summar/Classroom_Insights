import NodeCache from 'node-cache';

// Standard cache for dashboard metrics - 1 hour TTL by default
const dashboardCache = new NodeCache({ stdTTL: 3600, checkperiod: 600 });

export default dashboardCache;
