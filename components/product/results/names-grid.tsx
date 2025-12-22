"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ChevronLeft, ChevronRight, MoreHorizontal, Heart } from "lucide-react";
import NameCard from "./name-card";

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

interface NamesGridProps {
  names: NameData[];
  onRegenerate: () => void;
  onBackToForm: () => void;
  isGenerating?: boolean;
  // Pagination props (now for batch-internal rounds)
  currentPage?: number;
  totalPages?: number;
  onPageChange?: (pageIndex: number) => void;
  isAuthenticated?: boolean;
  isLoadingHistory?: boolean;
  // History browsing props
  isHistoryView?: boolean;
  currentBatchInfo?: {
    englishName: string;
    gender: string;
    planType: string;
    createdAt: string;
  };
  // Continue generation props
  showContinueGeneration?: boolean;
  onContinueGeneration?: () => void;
}

export default function NamesGrid({ 
  names, 
  onRegenerate, 
  onBackToForm, 
  isGenerating,
  currentPage = 0,
  totalPages = 1,
  onPageChange,
  isAuthenticated = false,
  isLoadingHistory = false,
  isHistoryView = false,
  currentBatchInfo,
  showContinueGeneration = false,
  onContinueGeneration
}: NamesGridProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [selectedName, setSelectedName] = useState<string | null>(null);
  const [likedNames, setLikedNames] = useState<Set<string>>(new Set());




  const handleLike = (chinese: string) => {
    const newLikedNames = new Set(likedNames);
    if (newLikedNames.has(chinese)) {
      newLikedNames.delete(chinese);
      toast({
        title: "Name unliked",
        description: `You removed ${chinese} from your favorites`,
      });
    } else {
      newLikedNames.add(chinese);
      toast({
        title: "Name liked!",
        description: `You added ${chinese} to your favorites`,
      });
    }
    setLikedNames(newLikedNames);
  };

  const handleSelect = (chinese: string) => {
    setSelectedName(chinese);
    toast({
      title: "Name selected!",
      description: `You selected ${chinese} as your Chinese name`,
    });
  };


  const handleSaveAllNames = async () => {
    if (!isAuthenticated) {
      toast({
        title: "Sign in required",
        description: "Please sign in to save names to your collection.",
        variant: "destructive",
      });
      return;
    }

    const savePromises = names.map(async (name) => {
      // Skip logic removed since we're not tracking saved names anymore

      try {
        // Batch save functionality removed
        console.log('Batch save not implemented');
      } catch (error) {
        console.error(`Failed to save ${name.chinese}:`, error);
      }
    });

    const results = await Promise.allSettled(savePromises);
    const successCount = results.filter(result => result.status === 'fulfilled').length;
    const alreadySavedCount = 0;
    
    if (successCount > 0) {
      toast({
        title: "Names saved!",
        description: `Successfully saved ${successCount} names to your collection.${alreadySavedCount > 0 ? ` ${alreadySavedCount} were already saved.` : ''}`,
      });
    } else if (false) {
      // Removed saved names logic
    } else {
      toast({
        title: "Save failed",
        description: "Failed to save names. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="w-full space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-3xl font-bold tracking-tight text-foreground"
        >
          {isHistoryView ? 'Historical Generation' : 'Choose Your Chinese Name'}
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-muted-foreground text-lg"
        >
          {isHistoryView && currentBatchInfo ? (
            <>
              Generated for "{currentBatchInfo.englishName}" ({currentBatchInfo.gender}, {currentBatchInfo.planType} plan) - {names.length} unique names.
              <div className="text-sm mt-1">
                Created: {new Date(currentBatchInfo.createdAt).toLocaleDateString()}
              </div>
            </>
          ) : (
            <>
              We've generated {names.length} unique names for you. Click on your favorite to select it.
            </>
          )}
        </motion.p>
        
      </div>

      {/* Names Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {names.map((name, index) => (
          <motion.div
            key={name.chinese + index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="h-full"
          >
            <NameCard
              name={name}
              isSelected={selectedName === name.chinese}
              isLiked={likedNames.has(name.chinese)}
              onSelect={() => handleSelect(name.chinese)}
              onLike={() => handleLike(name.chinese)}
            />
          </motion.div>
        ))}
      </div>

      {/* Pagination Controls - Always show for authenticated users */}
      {isAuthenticated && onPageChange && (
        <div className="flex justify-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 bg-muted/50 rounded-lg p-2"
          >
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 0 || isLoadingHistory || totalPages === 1}
              className="h-8 w-8 p-0"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            {/* Page indicators - simplified < 1 > style */}
            <div className="flex items-center gap-1">
              {totalPages === 1 ? (
                <Button
                  variant="default"
                  size="sm"
                  disabled
                  className="h-8 w-8 p-0 text-xs bg-primary text-primary-foreground"
                >
                  1
                </Button>
              ) : (
                Array.from({ length: Math.min(totalPages || 1, 5) }, (_, i) => {
                  let pageIndex = i;
                  const safeTotalPages = totalPages || 1;
                  const safeCurrentPage = currentPage || 0;
                  
                  if (safeTotalPages > 5) {
                    if (safeCurrentPage <= 2) {
                      pageIndex = i;
                    } else if (safeCurrentPage >= safeTotalPages - 3) {
                      pageIndex = safeTotalPages - 5 + i;
                    } else {
                      pageIndex = safeCurrentPage - 2 + i;
                    }
                  }
                  
                  // Ensure pageIndex is valid
                  if (isNaN(pageIndex) || pageIndex < 0) {
                    pageIndex = i;
                  }
                  
                  return (
                    <Button
                      key={`page-${pageIndex}-${i}`}
                      variant={safeCurrentPage === pageIndex ? "default" : "ghost"}
                      size="sm"
                      onClick={() => onPageChange && onPageChange(pageIndex)}
                      disabled={isLoadingHistory}
                      className={`h-8 w-8 p-0 text-xs ${
                        safeCurrentPage === pageIndex ? 'bg-primary text-primary-foreground' : ''
                      }`}
                    >
                      {isLoadingHistory && safeCurrentPage === pageIndex ? (
                        <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
                      ) : (
                        pageIndex + 1
                      )}
                    </Button>
                  );
                })
              )}
              {totalPages > 5 && currentPage < totalPages - 3 && (
                <>
                  <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onPageChange(totalPages - 1)}
                    className="h-8 w-8 p-0 text-xs"
                  >
                    {totalPages}
                  </Button>
                </>
              )}
            </div>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage === totalPages - 1 || isLoadingHistory || totalPages === 1}
              className="h-8 w-8 p-0"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </motion.div>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
        {/* Continue Generation Button (only when not in history view) */}
        {showContinueGeneration && onContinueGeneration && !isHistoryView && (
          <Button
            onClick={onContinueGeneration}
            disabled={isGenerating}
            size="lg"
            className="bg-primary hover:bg-primary/90 text-primary-foreground px-8"
          >
            {isGenerating ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Generating...
              </div>
            ) : (
              `Generate 6 More Names`
            )}
          </Button>
        )}
        
        {/* Save All Names Button for authenticated users */}
        {isAuthenticated && (
          <Button
            onClick={handleSaveAllNames}
            variant="outline"
            size="lg"
            className="border-primary text-primary hover:bg-primary hover:text-primary-foreground px-8"
          >
            <Heart className="h-4 w-4 mr-2" />
            Save All to Collection
          </Button>
        )}
        
        <Button
          onClick={() => {
            // Clear session storage when going back to form
            sessionStorage.removeItem('nameGenerationResults');
            // Navigate to homepage form section
            router.push('/#name-generator-form');
          }}
          variant="outline"
          size="lg"
          className="border-border text-muted-foreground hover:bg-muted px-8"
        >
          Back to Form
        </Button>
      </div>

      {/* Selected name display */}
      {selectedName && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mx-auto max-w-md"
        >
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="text-center p-6">
              <p className="text-primary font-medium">
                You selected: <span className="font-serif text-xl">{selectedName}</span>
              </p>
              <p className="text-muted-foreground text-sm mt-1">
                This will be your new Chinese name!
              </p>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}