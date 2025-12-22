"use client";

import { useState, useEffect, use } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useUser } from "@/hooks/use-user";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowLeft, 
  Calendar, 
  User, 
  Heart, 
  Search, 
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import NameCard from "@/components/product/results/name-card";

interface NameData {
  chinese: string;
  pinyin: string;
  characters: Array<{
    character: string;
    pinyin: string;
    meaning: string;
    explanation: string;
  }>;
  meaning: string;
  culturalNotes: string;
  personalityMatch: string;
  style: string;
}

interface BatchDetails {
  id: string;
  englishName: string;
  gender: string;
  birthYear?: string;
  personalityTraits?: string;
  namePreferences?: string;
  planType: string;
  totalNamesGenerated: number;
  creditsUsed: number;
  createdAt: string;
  updatedAt: string;
}

interface BatchDetailsPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default function BatchDetailsPage({ params }: BatchDetailsPageProps) {
  const router = useRouter();
  const { user, loading } = useUser();
  const { toast } = useToast();
  
  // Unwrap params using React.use()
  const { id } = use(params);
  
  const [batch, setBatch] = useState<BatchDetails | null>(null);
  const [names, setNames] = useState<NameData[]>([]);
  const [currentRound, setCurrentRound] = useState(1);
  const [totalRounds, setTotalRounds] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingRound, setIsLoadingRound] = useState(false);
  const [likedNames, setLikedNames] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!loading && !user) {
      router.push('/sign-in');
      return;
    }
    
    if (user && id) {
      loadBatchDetails();
    }
  }, [user, loading, id, router]);

  const loadBatchDetails = async (round = 1) => {
    setIsLoading(true);
    try {
      const validRound = Math.max(1, Math.floor(round));
      const response = await fetch(`/api/generation-batches/${id}?round=${validRound}`);
      
      if (response.ok) {
        const data = await response.json();
        
        // Validate and set data with safe defaults
        if (data.batch) {
          setBatch(data.batch);
        }
        
        if (data.names && Array.isArray(data.names)) {
          const transformedNames = transformNamesData(data.names);
          setNames(transformedNames);
        } else {
          setNames([]);
        }
        
        // Ensure pagination values are valid integers
        const safeCurrentRound = Math.max(1, data.pagination?.currentRound || 1);
        const safeTotalRounds = Math.max(1, data.pagination?.totalRounds || 1);
        
        setCurrentRound(safeCurrentRound);
        setTotalRounds(safeTotalRounds);
      } else {
        toast({
          title: "Loading Failed",
          description: "Generation record not found",
          variant: "destructive",
        });
        router.push('/profile');
      }
    } catch (error) {
      console.error('Failed to load batch details:', error);
      toast({
        title: "Loading Failed",
        description: "Unable to load generation details. Please try again.",
        variant: "destructive",
      });
      // Set safe defaults on error
      setCurrentRound(1);
      setTotalRounds(1);
      setNames([]);
    } finally {
      setIsLoading(false);
    }
  };

  const transformNamesData = (rawNames: any[]): NameData[] => {
    if (!Array.isArray(rawNames)) {
      console.warn('Invalid names data received:', rawNames);
      return [];
    }
    
    return rawNames
      .filter(name => name && (name.chinese || name.chinese_name)) // Accept both formats
      .map(name => ({
        chinese: name.chinese || name.chinese_name || '',
        pinyin: name.pinyin || '',
        characters: Array.isArray(name.characters) ? name.characters : [],
        meaning: name.meaning || '',
        culturalNotes: name.culturalNotes || name.cultural_notes || '',
        personalityMatch: name.personalityMatch || name.personality_match || '',
        style: name.style || 'Standard'
      }));
  };

  const handleRoundChange = async (round: number) => {
    const safeRound = Math.max(1, Math.min(Math.floor(round), totalRounds));
    
    if (safeRound === currentRound || !batch) return;
    
    setIsLoadingRound(true);
    try {
      const response = await fetch(`/api/generation-batches/${id}?round=${safeRound}`);
      if (response.ok) {
        const data = await response.json();
        
        if (data.names && Array.isArray(data.names)) {
          setNames(transformNamesData(data.names));
          setCurrentRound(Math.max(1, data.pagination?.currentRound || safeRound));
        }
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      console.error('Failed to load round:', error);
      toast({
        title: "Loading Failed",
        description: "Unable to load page content",
        variant: "destructive",
      });
    } finally {
      setIsLoadingRound(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getPlanTypeName = (planType: string) => {
    return planType === '4' ? 'Premium' : 'Standard';
  };

  const getPlanTypeColor = (planType: string) => {
    return planType === '4' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700';
  };




  const handleLike = (chinese: string) => {
    const newLikedNames = new Set(likedNames);
    if (newLikedNames.has(chinese)) {
      newLikedNames.delete(chinese);
      toast({
        title: "Unliked",
        description: `Removed ${chinese} from favorites`,
      });
    } else {
      newLikedNames.add(chinese);
      toast({
        title: "Liked!",
        description: `Added ${chinese} to favorites`,
      });
    }
    setLikedNames(newLikedNames);
  };

  if (loading || isLoading) {
    return (
      <div className="min-h-screen bg-background">
        {/* Header Skeleton */}
        <div className="border-b bg-background/95 backdrop-blur">
          <div className="container px-4 md:px-6 py-4">
            <div className="flex items-center gap-4">
              <div className="w-24 h-8 bg-muted rounded animate-pulse"></div>
              <div className="space-y-2">
                <div className="w-32 h-5 bg-muted rounded animate-pulse"></div>
                <div className="w-48 h-3 bg-muted rounded animate-pulse"></div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Content Skeleton */}
        <div className="container px-4 md:px-6 py-8">
          <div className="max-w-6xl mx-auto space-y-8">
            {/* Batch Info Skeleton */}
            <div className="border rounded-lg p-6 space-y-4">
              <div className="w-48 h-6 bg-muted rounded animate-pulse"></div>
              <div className="space-y-2">
                <div className="w-24 h-5 bg-muted rounded animate-pulse"></div>
                <div className="w-32 h-4 bg-muted rounded animate-pulse"></div>
              </div>
            </div>
            
            {/* Names Grid Skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="border rounded-lg p-4 space-y-3 animate-pulse">
                  <div className="w-20 h-6 bg-muted rounded"></div>
                  <div className="w-full h-4 bg-muted rounded"></div>
                  <div className="w-3/4 h-3 bg-muted rounded"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!user || !batch) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container px-4 md:px-6 py-4">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => router.push('/profile')}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Profile
            </Button>
            <div>
              <h1 className="text-xl font-bold">Generation Details</h1>
              <p className="text-sm text-muted-foreground">
                Chinese name generation results for {batch.englishName}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container px-4 md:px-6 py-8">
        <div className="max-w-6xl mx-auto space-y-8">
          {/* Batch Info Card */}
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <CardTitle className="text-2xl">{batch.englishName}</CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge className={getPlanTypeColor(batch.planType)}>
                      {getPlanTypeName(batch.planType)}
                    </Badge>
                    <Badge variant="outline">
                      {batch.gender === 'male' ? 'Male' : batch.gender === 'female' ? 'Female' : 'Other'}
                    </Badge>
                  </div>
                </div>
                <div className="text-right text-sm text-muted-foreground">
                  <p>Generated</p>
                  <p className="font-medium">{formatDate(batch.createdAt)}</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {batch.birthYear && (
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>Birth Year: {batch.birthYear}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm">
                  <Search className="h-4 w-4 text-muted-foreground" />
                  <span>Generated {batch.totalNamesGenerated} names</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span>Used {batch.creditsUsed} credits</span>
                </div>
              </div>

              {batch.personalityTraits && (
                <div className="bg-muted/50 rounded-lg p-4">
                  <h4 className="font-medium mb-2">Personality Traits</h4>
                  <p className="text-sm text-muted-foreground">{batch.personalityTraits}</p>
                </div>
              )}

              {batch.namePreferences && (
                <div className="bg-muted/50 rounded-lg p-4">
                  <h4 className="font-medium mb-2">Name Preferences</h4>
                  <p className="text-sm text-muted-foreground">{batch.namePreferences}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Names Grid */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Generated Names</h2>
              {totalRounds > 1 && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  Page {currentRound} of {totalRounds}
                </div>
              )}
            </div>

            {/* Pagination Controls */}
            {totalRounds > 1 && (
              <div className="flex justify-center">
                <div className="flex items-center gap-2 bg-muted/50 rounded-lg p-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRoundChange(currentRound - 1)}
                    disabled={currentRound === 1 || isLoadingRound}
                    className="h-8 w-8 p-0"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(totalRounds || 1, 5) }, (_, i) => {
                      let roundIndex = i + 1;
                      if ((totalRounds || 1) > 5) {
                        if (currentRound <= 3) {
                          roundIndex = i + 1;
                        } else if (currentRound >= (totalRounds || 1) - 2) {
                          roundIndex = (totalRounds || 1) - 4 + i;
                        } else {
                          roundIndex = currentRound - 2 + i;
                        }
                      }
                      
                      // Ensure roundIndex is valid
                      if (isNaN(roundIndex) || roundIndex < 1) {
                        roundIndex = i + 1;
                      }
                      
                      return (
                        <Button
                          key={`round-${roundIndex}-${i}`}
                          variant={currentRound === roundIndex ? "default" : "ghost"}
                          size="sm"
                          onClick={() => handleRoundChange(roundIndex)}
                          disabled={isLoadingRound}
                          className="h-8 w-8 p-0 text-xs"
                        >
                          {isLoadingRound && currentRound === roundIndex ? (
                            <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
                          ) : (
                            roundIndex
                          )}
                        </Button>
                      );
                    })}
                  </div>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRoundChange(currentRound + 1)}
                    disabled={currentRound === totalRounds || isLoadingRound}
                    className="h-8 w-8 p-0"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}


            {/* Names Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {names.length === 0 ? (
                <div className="col-span-full text-center py-8">
                  <p className="text-muted-foreground">No names found for this generation.</p>
                </div>
              ) : (
                names.map((name, index) => (
                  <motion.div
                    key={name.chinese + index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="h-full"
                  >
                    <NameCard
                      name={name}
                      isSelected={false}
                      isLiked={likedNames.has(name.chinese)}
                      onSelect={() => {}}
                      onLike={() => handleLike(name.chinese)}
                    />
                  </motion.div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}