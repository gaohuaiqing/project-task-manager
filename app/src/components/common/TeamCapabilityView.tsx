import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Users,
  TrendingUp,
  Star,
  Target,
  Award,
  BarChart3
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Member, MemberCapabilities } from '@/types';
import { CAPABILITY_DIMENSIONS, CAPABILITY_LEVELS } from '@/types';
import RadarChart from './RadarChart';
import { getCapabilityDimensions } from '@/utils/capabilityDimensionManager';

interface TeamCapabilityViewProps {
  members: Member[];
  teamName: string;
  showIndividualMembers?: boolean;
}

// 动态能力维度键
const getCapabilityKeys = (): string[] => {
  const dimensions = getCapabilityDimensions();
  return dimensions.map(d => d.key);
};

const getLevelInfo = (value: number) => {
  for (const [key, level] of Object.entries(CAPABILITY_LEVELS)) {
    if (value >= level.min && value <= level.max) {
      return { key, ...level };
    }
  }
  return { key: 'beginner', ...CAPABILITY_LEVELS.beginner };
};

const getLevelColor = (color: string) => {
  const colorMap: Record<string, string> = {
    emerald: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    blue: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    cyan: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
    yellow: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    orange: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  };
  return colorMap[color] || colorMap.orange;
};

const getLevelBarColor = (color: string) => {
  const colorMap: Record<string, string> = {
    emerald: 'from-emerald-500 to-emerald-400',
    blue: 'from-blue-500 to-blue-400',
    cyan: 'from-cyan-500 to-cyan-400',
    yellow: 'from-yellow-500 to-yellow-400',
    orange: 'from-orange-500 to-orange-400',
  };
  return colorMap[color] || colorMap.orange;
};

const TeamCapabilityView: React.FC<TeamCapabilityViewProps> = ({
  members,
  teamName,
  showIndividualMembers = true,
}) => {
  // 获取动态能力维度
  const capabilityKeys = getCapabilityKeys();
  const capabilityDimensions = getCapabilityDimensions();

  const teamCapabilities = useMemo(() => {
    if (members.length === 0) {
      const result: { [key: string]: number } = {};
      capabilityKeys.forEach(key => result[key] = 0);
      return result;
    }

    const sum: { [key: string]: number } = {};
    capabilityKeys.forEach(key => sum[key] = 0);

    members.forEach(member => {
      capabilityKeys.forEach(key => {
        sum[key] += member.capabilities[key];
      });
    });

    const average: MemberCapabilities = {
      boardDev: Math.round((sum.boardDev / members.length) * 10) / 10,
      firmwareDev: Math.round((sum.firmwareDev / members.length) * 10) / 10,
      componentImport: Math.round((sum.componentImport / members.length) * 10) / 10,
      systemDesign: Math.round((sum.systemDesign / members.length) * 10) / 10,
      driverInterface: Math.round((sum.driverInterface / members.length) * 10) / 10,
    };

    return average;
  }, [members]);

  const overallScore = useMemo(() => {
    const values = Object.values(teamCapabilities);
    return Math.round(values.reduce((sum, val) => sum + val, 0) / values.length * 10) / 10;
  }, [teamCapabilities]);

  const overallLevel = useMemo(() => getLevelInfo(Math.round(overallScore)), [overallScore]);

  const capabilityDistribution = useMemo(() => {
    const distribution: Record<keyof MemberCapabilities, Record<string, number>> = {
      boardDev: {},
      firmwareDev: {},
      componentImport: {},
      systemDesign: {},
      driverInterface: {},
    };

    members.forEach(member => {
      capabilityKeys.forEach(key => {
        const level = getLevelInfo(member.capabilities[key]);
        distribution[key][level.label] = (distribution[key][level.label] || 0) + 1;
      });
    });

    return distribution;
  }, [members]);

  const topPerformers = useMemo(() => {
    const result: Record<keyof MemberCapabilities, Member | null> = {
      boardDev: null,
      firmwareDev: null,
      componentImport: null,
      systemDesign: null,
      driverInterface: null,
    };

    capabilityKeys.forEach(key => {
      let maxScore = 0;
      members.forEach(member => {
        if (member.capabilities[key] > maxScore) {
          maxScore = member.capabilities[key];
          result[key] = member;
        }
      });
    });

    return result;
  }, [members]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <Users className="w-5 h-5 text-blue-400" />
          {teamName} - 团队能力概览
        </h3>
        <div className="flex items-center gap-3">
          <Badge variant="secondary" className="bg-slate-700 text-slate-300">
            {members.length} 名成员
          </Badge>
          <Badge className={cn("text-sm", getLevelColor(overallLevel.color))}>
            团队等级: {overallLevel.label} ({overallScore.toFixed(1)})
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-slate-800/30 border-slate-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-white flex items-center gap-2">
              <Target className="w-4 h-4 text-purple-400" />
              团队能力雷达图
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-center">
            <RadarChart
              capabilities={teamCapabilities as { [key: string]: number }}
              size="large"
              showValues={true}
            />
          </CardContent>
        </Card>

        <Card className="bg-slate-800/30 border-slate-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-white flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-cyan-400" />
              能力维度详情
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {capabilityKeys.map((key) => {
                const value = teamCapabilities[key];
                const levelInfo = getLevelInfo(value);
                const dimensionInfo = CAPABILITY_DIMENSIONS[key];
                const topPerformer = topPerformers[key];

                return (
                  <div key={key} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-white">{dimensionInfo.name}</span>
                        <Badge className={cn("text-xs", getLevelColor(levelInfo.color))}>
                          {levelInfo.label}
                        </Badge>
                      </div>
                      <span className="text-sm font-semibold text-white">{value.toFixed(1)}/10</span>
                    </div>
                    <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                      <div 
                        className={cn(
                          "h-full bg-gradient-to-r rounded-full transition-all duration-500",
                          getLevelBarColor(levelInfo.color)
                        )}
                        style={{ width: `${(value / 10) * 100}%` }}
                      />
                    </div>
                    {topPerformer && (
                      <div className="flex items-center gap-1 text-xs text-slate-400">
                        <Star className="w-3 h-3 text-yellow-400" />
                        <span>最佳: {topPerformer.name} ({topPerformer.capabilities[key]}/10)</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {showIndividualMembers && members.length > 0 && (
        <Card className="bg-slate-800/30 border-slate-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-white flex items-center gap-2">
              <Award className="w-4 h-4 text-yellow-400" />
              成员能力一览
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-700">
                    <th className="text-left py-2 px-3 text-xs font-medium text-slate-400">成员</th>
                    {capabilityKeys.map((key) => (
                      <th key={key} className="text-center py-2 px-3 text-xs font-medium text-slate-400">
                        {CAPABILITY_DIMENSIONS[key].name}
                      </th>
                    ))}
                    <th className="text-center py-2 px-3 text-xs font-medium text-slate-400">综合</th>
                  </tr>
                </thead>
                <tbody>
                  {members.map((member) => {
                    const memberOverall = Object.values(member.capabilities).reduce((sum, val) => sum + val, 0) / 5;
                    const memberLevel = getLevelInfo(Math.round(memberOverall));

                    return (
                      <tr key={member.id} className="border-b border-slate-700/50 hover:bg-slate-700/20">
                        <td className="py-2 px-3">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-slate-600 flex items-center justify-center text-xs text-white">
                              {member.name.slice(0, 1)}
                            </div>
                            <span className="text-sm text-white">{member.name}</span>
                          </div>
                        </td>
                        {capabilityKeys.map((key) => {
                          const value = member.capabilities[key];
                          const level = getLevelInfo(value);
                          return (
                            <td key={key} className="text-center py-2 px-3">
                              <div className="flex items-center justify-center gap-1">
                                <div 
                                  className={cn(
                                    "w-12 h-1.5 rounded-full overflow-hidden bg-slate-600"
                                  )}
                                >
                                  <div 
                                    className={cn(
                                      "h-full rounded-full",
                                      level.key === 'expert' ? 'bg-emerald-500' :
                                      level.key === 'proficient' ? 'bg-blue-500' :
                                      level.key === 'competent' ? 'bg-cyan-500' :
                                      level.key === 'developing' ? 'bg-yellow-500' :
                                      'bg-orange-500'
                                    )}
                                    style={{ width: `${(value / 10) * 100}%` }}
                                  />
                                </div>
                                <span className="text-xs text-slate-300">{value}</span>
                              </div>
                            </td>
                          );
                        })}
                        <td className="text-center py-2 px-3">
                          <Badge className={cn("text-xs", getLevelColor(memberLevel.color))}>
                            {memberOverall.toFixed(1)}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="bg-slate-800/30 border-slate-700">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-white flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-green-400" />
            能力分布统计
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {capabilityKeys.map((key) => {
              const dimensionInfo = CAPABILITY_DIMENSIONS[key];
              const dist = capabilityDistribution[key];

              return (
                <div key={key} className="p-3 rounded-lg bg-slate-700/30 border border-slate-600">
                  <h4 className="text-sm font-medium text-white mb-2">{dimensionInfo.name}</h4>
                  <div className="space-y-1">
                    {Object.entries(CAPABILITY_LEVELS).reverse().map(([levelKey, level]) => {
                      const count = dist[level.label] || 0;
                      const percentage = members.length > 0 ? (count / members.length) * 100 : 0;

                      return (
                        <div key={levelKey} className="flex items-center justify-between">
                          <span className="text-xs text-slate-400">{level.label}</span>
                          <div className="flex items-center gap-1">
                            <div className="w-16 h-1.5 bg-slate-600 rounded-full overflow-hidden">
                              <div 
                                className={cn(
                                  "h-full rounded-full",
                                  levelKey === 'expert' ? 'bg-emerald-500' :
                                  levelKey === 'proficient' ? 'bg-blue-500' :
                                  levelKey === 'competent' ? 'bg-cyan-500' :
                                  levelKey === 'developing' ? 'bg-yellow-500' :
                                  'bg-orange-500'
                                )}
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                            <span className="text-xs text-slate-300 w-4 text-right">{count}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TeamCapabilityView;
