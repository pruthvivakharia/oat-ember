import { prisma } from '@/lib/prisma';

export const REWARD_VISITS = 10;

/** Loyalty is derived from the database. Cancelled/rejected orders never earn a visit. */
export async function getRewardStats(userId: string) {
  const [orders, qualifyingOrders] = await Promise.all([
    prisma.order.count({ where: { userId } }),
    prisma.order.count({ where: { userId, status: { notIn: ['CANCELLED', 'REJECTED'] } } }),
  ]);

  const rewardsEarned = Math.floor(qualifyingOrders / REWARD_VISITS);
  const remainder = qualifyingOrders % REWARD_VISITS;
  const currentProgress = qualifyingOrders === 0 ? 0 : remainder === 0 ? REWARD_VISITS : remainder;

  return {
    orders,
    qualifyingOrders,
    visits: qualifyingOrders,
    rewardsEarned,
    currentProgress,
    rewardGoal: REWARD_VISITS,
    visitsUntilNextReward: REWARD_VISITS - (qualifyingOrders % REWARD_VISITS),
  };
}
