const mongoose = require('mongoose');
const leadRepository = require('../repositories/leadRepository');
const { cacheGet, cacheSet, cacheDeletePattern } = require('../config/redis');

class DashboardService {
  async invalidateCache() {
    await cacheDeletePattern('dashboard:stats*');
  }

  async stats(user, assignedAgent) {
    const isAgent = user.role !== 'admin';
    const scope = isAgent
      ? new mongoose.Types.ObjectId(user.id)
      : assignedAgent
        ? new mongoose.Types.ObjectId(assignedAgent)
        : null;
    const shouldCache = !assignedAgent && !isAgent;
    const cacheKey = 'dashboard:stats:admin';
    if (shouldCache) {
      const cached = await cacheGet(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    }

    const now = new Date();
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);
    const startOfTomorrow = new Date(startOfToday);
    startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);
    const sixMonthsAgo = new Date(startOfToday);
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);

    const scopedFilter = (filter = {}) => (scope ? { ...filter, assignedAgent: scope } : filter);
    const count = (filter) => leadRepository.count(scopedFilter(filter));
    const distribution = (field) =>
      leadRepository.aggregate([
        ...(scope ? [{ $match: { assignedAgent: scope } }] : []),
        { $group: { _id: `$${field}`, count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]);

    const [
      total,
      newCount,
      contactedCount,
      siteVisitCount,
      closedCount,
      staleLeads,
      overdueFollowUps,
      todayFollowUps,
      budget,
      pipeline,
      statusDistribution,
      sourceDistribution,
      propertyTypeDistribution,
      leadsOverTime,
    ] = await Promise.all([
      count({}),
      count({ status: 'New' }),
      count({ status: 'Contacted' }),
      count({ status: 'Site Visit' }),
      count({ status: 'Closed' }),
      count({
        status: { $in: ['New', 'Contacted'] },
        $or: [{ updatedAt: { $lt: fourteenDaysAgo } }, { activities: { $size: 0 } }],
      }),
      count({ followUpDate: { $lt: now }, status: { $ne: 'Closed' } }),
      count({ followUpDate: { $gte: startOfToday, $lt: startOfTomorrow } }),
      leadRepository.aggregate([
        ...(scope ? [{ $match: { assignedAgent: scope } }] : []),
        { $group: { _id: null, avgBudget: { $avg: '$budget' } } },
      ]),
      leadRepository.aggregate([
        { $match: scopedFilter({ status: { $ne: 'Closed' } }) },
        { $group: { _id: null, total: { $sum: '$budget' } } },
      ]),
      distribution('status'),
      distribution('source'),
      distribution('propertyType'),
      leadRepository.aggregate([
        { $match: scopedFilter({ createdAt: { $gte: sixMonthsAgo } }) },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
    ]);

    const result = {
      total,
      newCount,
      contactedCount,
      siteVisitCount,
      closedCount,
      staleLeads,
      conversionRate: total ? Number(((closedCount / total) * 100).toFixed(1)) : 0,
      contactRate: total
        ? Number((((contactedCount + siteVisitCount + closedCount) / total) * 100).toFixed(1))
        : 0,
      overdueFollowUps,
      todayFollowUps,
      avgBudget: budget[0]?.avgBudget || 0,
      totalPipeline: pipeline[0]?.total || 0,
      statusDistribution,
      sourceDistribution,
      propertyTypeDistribution,
      leadsOverTime,
    };

    if (shouldCache) await cacheSet(cacheKey, JSON.stringify(result), 60);
    return result;
  }
}

module.exports = new DashboardService();
