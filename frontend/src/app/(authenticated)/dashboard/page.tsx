import QuickActions from "@/component/QuickActions";
import CompetitionsJoined from "@/component/CompetitionsJoined";
export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Dashboard content cards */}
        <div className="bg-[#121633] rounded-2xl p-6 border border-white/10 hover:border-orange-500/50 transition-colors">
          <h3 className="text-white font-semibold mb-2">Active Predictions</h3>
          <p className="text-3xl font-bold text-orange-400">12</p>
          <p className="text-gray-300 text-sm">Currently tracking</p>
        </div>

        <div className="bg-[#121633] rounded-2xl p-6 border border-white/10 hover:border-orange-500/50 transition-colors">
          <h3 className="text-white font-semibold mb-2">Win Rate</h3>
          <p className="text-3xl font-bold text-yellow-400">73%</p>
          <p className="text-gray-300 text-sm">Last 30 days</p>
        </div>

        <div className="bg-[#121633] rounded-2xl p-6 border border-white/10 hover:border-orange-500/50 transition-colors">
          <h3 className="text-white font-semibold mb-2">Leaderboard Rank</h3>
          <p className="text-3xl font-bold text-white">#47</p>
          <p className="text-gray-300 text-sm">Global ranking</p>
        </div>
      </div>

      {/* Competitions Joined Section */}
      <CompetitionsJoined />
      <QuickActions />
      <div className="bg-[#121633] rounded-2xl p-6 border border-white/10">
        <h3 className="text-white font-semibold mb-4">Recent Activity</h3>
        <div className="space-y-3">
          <div className="flex justify-between items-center py-2">
            <span className="text-gray-300">
              Prediction on "Bitcoin Price by EOY"
            </span>
            <span className="text-orange-400 text-sm">Winning</span>
          </div>
          <div className="flex justify-between items-center py-2">
            <span className="text-gray-300">
              Joined "Crypto Predictions" competition
            </span>
            <span className="text-gray-400 text-sm">2 days ago</span>
          </div>
          <div className="flex justify-between items-center py-2">
            <span className="text-gray-300">Claimed 50 XLM reward</span>
            <span className="text-yellow-400 text-sm">Completed</span>
          </div>
        </div>
      </div>
    </div>
  );
}
