"use client";

import { useState, useEffect } from "react";
import { useUser } from "@/hooks/use-user";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, TrendingUp, Calendar } from "lucide-react";
import { motion } from "framer-motion";

interface GenerationLog {
  id: string;
  plan_type: string;
  credits_used: number;
  names_generated: number;
  english_name: string;
  gender: string;
  has_personality_traits: boolean;
  has_name_preferences: boolean;
  created_at: string;
}

interface GenerationStats {
  total_generations: number;
  total_credits_used: number;
  total_names_generated: number;
  avg_per_session: number;
}

export function GenerationHistoryCard() {
  const { user } = useUser();
  const [logs, setLogs] = useState<GenerationLog[]>([]);
  const [stats, setStats] = useState<GenerationStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchGenerationHistory();
    }
  }, [user]);

  const fetchGenerationHistory = async () => {
    try {
      const response = await fetch('/api/generation-history');
      if (response.ok) {
        const data = await response.json();
        setLogs(data.logs || []);
        setStats(data.stats || null);
      }
    } catch (error) {
      console.error('Failed to fetch generation history:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getPlanTypeLabel = (planType: string) => {
    return planType === '4' ? 'Premium' : 'Standard';
  };

  const getPlanTypeColor = (planType: string) => {
    return planType === '4' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700';
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Generation History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-pulse text-muted-foreground">Loading history...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Generation History
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Stats Summary */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold text-primary">{stats.total_generations}</div>
              <div className="text-xs text-muted-foreground">Sessions</div>
            </div>
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold text-primary">{stats.total_names_generated}</div>
              <div className="text-xs text-muted-foreground">Names</div>
            </div>
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold text-primary">{stats.total_credits_used}</div>
              <div className="text-xs text-muted-foreground">Credits</div>
            </div>
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold text-primary">{stats.avg_per_session.toFixed(1)}</div>
              <div className="text-xs text-muted-foreground">Avg/Session</div>
            </div>
          </div>
        )}

        {/* Recent Activity */}
        <div className="space-y-4">
          <h3 className="font-medium flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Recent Activity
          </h3>
          
          {logs.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              No generation history yet
            </div>
          ) : (
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {logs.slice(0, 10).map((log, index) => (
                <motion.div
                  key={log.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-8 h-8 bg-primary/10 rounded-full">
                      <span className="text-sm font-bold text-primary">
                        {log.names_generated}
                      </span>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">
                          Generated for "{log.english_name}"
                        </span>
                        <Badge 
                          variant="secondary" 
                          className={`text-xs ${getPlanTypeColor(log.plan_type)}`}
                        >
                          {getPlanTypeLabel(log.plan_type)}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {new Date(log.created_at).toLocaleDateString()}
                        <span>•</span>
                        <span className="capitalize">{log.gender}</span>
                        {log.has_personality_traits && (
                          <>
                            <span>•</span>
                            <span>Personalized</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium">
                      -{log.credits_used} credits
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}