"use client";

import { useState, Suspense, Component, ReactNode, memo, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";

import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Shuffle, Bookmark, BookmarkCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@/hooks/use-user";
import NameCard from "@/components/product/results/name-card";

const formSchema = z.object({
  gender: z.enum(["male", "female", "neutral"]),
  style: z.enum([
    "nature-inspired",
    "achievement-focused",
    "elegance-intellectual",
    "celestial-aspiration",
    "harmony-trustworthiness",
    "strength-resilience",
    "traditional"
  ]),
  count: z.enum(["6", "9", "10", "12"]),
  surnameInitial: z.string().optional(),
});

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

// Error Boundary Component
class NameCardErrorBoundary extends Component<
  { children: ReactNode; fallback?: ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: ReactNode; fallback?: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(_: Error) {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('Name card error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <Card className="h-full border-0 shadow-sm border-red-200 bg-red-50">
          <CardContent className="p-4 flex flex-col items-center justify-center text-center min-h-[200px]">
            <div className="text-red-600 mb-2">⚠️</div>
            <div className="text-sm text-red-700 font-medium mb-1">
              Failed to load name
            </div>
            <div className="text-xs text-red-600">
              Please try again
            </div>
          </CardContent>
        </Card>
      );
    }

    return this.props.children;
  }
}

// Detailed Name Card Skeleton Component
function DetailedNameCardSkeleton() {
  return (
    <Card className="h-[300px] border-2 border-gray-100">
      <CardContent className="p-6 h-full flex flex-col">
        {/* Chinese Name */}
        <div className="text-center mb-4">
          <Skeleton className="h-8 w-20 bg-violet-100 mx-auto mb-2" />
          <Skeleton className="h-5 w-32 bg-violet-50 mx-auto" />
        </div>

        <div className="border-t border-gray-100 pt-4 mb-4">
          <Skeleton className="h-4 w-24 bg-gray-100 mb-2" />
          <div className="flex items-center justify-center gap-2 mb-3">
            <Skeleton className="h-6 w-16 bg-gray-100 rounded-full" />
            <Skeleton className="h-6 w-16 bg-gray-100 rounded-full" />
          </div>
        </div>

        <div className="flex-1 space-y-3">
          <Skeleton className="h-4 w-full bg-gray-50" />
          <Skeleton className="h-4 w-3/4 bg-gray-50" />
          <Skeleton className="h-4 w-1/2 bg-gray-50" />
        </div>

        {/* Action Buttons */}
        <div className="flex justify-center gap-3 mt-4">
          <Skeleton className="h-8 w-8 bg-gray-100 rounded" />
          <Skeleton className="h-8 w-8 bg-gray-100 rounded" />
        </div>
      </CardContent>
    </Card>
  );
}

// Loading Grid Component
function LoadingNamesGrid({ count }: { count: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: count }, (_, index) => (
        <motion.div
          key={`skeleton-${index}`}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, delay: index * 0.1 }}
        >
          <DetailedNameCardSkeleton />
        </motion.div>
      ))}
    </div>
  );
}


export default function RandomNameGenerator() {
  const { toast } = useToast();
  const [generatedNames, setGeneratedNames] = useState<NameData[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedName, setSelectedName] = useState<string | null>(null);
  const [likedNames, setLikedNames] = useState<Set<string>>(new Set());

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      gender: "neutral",
      style: "traditional",
      count: "12",
      surnameInitial: "",
    },
  });

  const styleOptions = [
    { value: "traditional", label: "Traditional", description: "Classic Chinese naming traditions" },
    { value: "nature-inspired", label: "Nature-Inspired", description: "Names connected to nature" },
    { value: "achievement-focused", label: "Achievement-Focused", description: "Ambitious and goal-oriented names" },
    { value: "elegance-intellectual", label: "Elegance & Intellectual", description: "Elegant and refined names" },
    { value: "celestial-aspiration", label: "Celestial & Aspiration", description: "Names reaching for the stars" },
    { value: "harmony-trustworthiness", label: "Harmony & Trust", description: "Harmonious and trustworthy names" },
    { value: "strength-resilience", label: "Strength & Resilience", description: "Strong and resilient names" },
  ];

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsGenerating(true);
    setGeneratedNames([]);
    setSelectedName(null);

    try {
      const count = parseInt(values.count);
      let allNames: NameData[] = [];

      // Generate names in batches of 6 (API limitation)
      const batchSize = 6;
      const totalBatches = Math.ceil(count / batchSize);

      for (let batch = 0; batch < totalBatches; batch++) {
        const currentBatchSize = Math.min(batchSize, count - (batch * batchSize));
        
        // Create a synthetic English name based on preferences for random generation
        const syntheticName = `Random${batch + 1}`;
        
        // Create personality traits based on style
        let personalityTraits = "";
        switch (values.style) {
          case "nature-inspired":
            personalityTraits = "Connected to nature, peaceful, appreciates natural beauty";
            break;
          case "achievement-focused":
            personalityTraits = "Ambitious, goal-oriented, determined to succeed";
            break;
          case "elegance-intellectual":
            personalityTraits = "Elegant, refined, values knowledge and wisdom";
            break;
          case "celestial-aspiration":
            personalityTraits = "Visionary, aspiring, reaches for high goals";
            break;
          case "harmony-trustworthiness":
            personalityTraits = "Harmonious, trustworthy, values relationships";
            break;
          case "strength-resilience":
            personalityTraits = "Strong, resilient, overcomes challenges";
            break;
          default:
            personalityTraits = "Well-balanced, traditional values, respects culture";
        }

        // Add surname preference if provided
        let namePreferences = `Style: ${values.style}`;
        if (values.surnameInitial) {
          namePreferences += `, Surname should start with sound similar to "${values.surnameInitial}"`;
        }

        const requestBody = {
          englishName: syntheticName,
          gender: values.gender === "neutral" ? "other" : values.gender,
          personalityTraits,
          namePreferences,
          planType: '1' // Standard plan for random generation
        };

        console.log('Calling API with:', requestBody);

        const response = await fetch('/api/chinese-names/generate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `HTTP ${response.status}: Failed to generate names`);
        }

        const data = await response.json();
        console.log('API response:', data);

        if (data.names && Array.isArray(data.names)) {
          // Update style field to match our form values
          const batchNames = data.names.map((name: NameData) => ({
            ...name,
            style: values.style
          }));
          
          allNames = [...allNames, ...batchNames];
          setGeneratedNames([...allNames]);

          // Show progress toast
          toast({
            title: `Batch ${batch + 1}/${totalBatches} complete!`,
            description: `Generated ${batchNames.length} names (${allNames.length}/${count} total)`,
            duration: 2000,
          });
        } else {
          throw new Error('Invalid response format from API');
        }

        // Add delay between batches to avoid rate limiting
        if (batch < totalBatches - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
      setIsGenerating(false);
      toast({
        title: "Generation complete!",
        description: `Successfully generated ${allNames.length} unique Chinese names!`,
      });

    } catch (error) {
      console.error('Error generating names:', error);
      setIsGenerating(false);
      
      let errorMessage = "Failed to generate names. Please try again.";
      if (error instanceof Error) {
        if (error.message.includes('limit reached')) {
          errorMessage = "Generation limit reached. Please sign in for unlimited access!";
        } else if (error.message.includes('credits')) {
          errorMessage = "Insufficient credits. Please purchase more credits.";
        } else {
          errorMessage = error.message;
        }
      }

      toast({
        title: "Generation failed",
        description: errorMessage,
        variant: "destructive",
      });
    }
  }

  const handleSelectName = useCallback((chinese: string) => {
    setSelectedName(chinese);
    toast({
      title: "Name selected!",
      description: `You selected ${chinese} as your Chinese name`,
    });
  }, [toast]);

  const handleLikeName = useCallback((chinese: string) => {
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
  }, [likedNames, toast]);

  return (
    <div className="space-y-8">
      {/* Generation Settings Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-8"
      >
        <Card className="p-8">
          {/* Title and Description */}
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              ✨ Generation Settings
            </h2>
            <p className="text-gray-600 text-lg">
              Customize generation parameters to get the Chinese names you want
            </p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              {/* Form Fields Row */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {/* Gender Field */}
                <FormField
                  control={form.control}
                  name="gender"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-lg font-semibold">
                        Gender
                      </FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-12">
                            <SelectValue placeholder="Select gender" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="neutral">Neutral</SelectItem>
                          <SelectItem value="male">Male</SelectItem>
                          <SelectItem value="female">Female</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Style Field */}
                <FormField
                  control={form.control}
                  name="style"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-lg font-semibold">
                        Style
                      </FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-12">
                            <SelectValue placeholder="Select style" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {styleOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Count Field */}
                <FormField
                  control={form.control}
                  name="count"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-lg font-semibold">
                        Count
                      </FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-12">
                            <SelectValue placeholder="Select count" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="6">6</SelectItem>
                          <SelectItem value="9">9</SelectItem>
                          <SelectItem value="10">10</SelectItem>
                          <SelectItem value="12">12</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Surname Initial Field */}
                <FormField
                  control={form.control}
                  name="surnameInitial"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-lg font-semibold">
                        Surname Initial
                      </FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="D"
                          className="h-12 text-center text-lg"
                          maxLength={1}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Generate Button */}
              <div className="text-center">
                <Button 
                  type="submit" 
                  size="lg"
                  className="w-full h-16 text-xl bg-violet-600 hover:bg-violet-700"
                  disabled={isGenerating}
                >
                  {isGenerating ? (
                    <div className="flex items-center gap-3">
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Generating Names...
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      🔄 Generate Names
                    </div>
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </Card>
      </motion.div>

      {/* Generated Names Section */}
      {(isGenerating || generatedNames.length > 0) && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="space-y-6"
        >
          <div className="text-center">
            <h3 className="text-2xl font-bold text-gray-900 mb-2">
              Generated Names ({generatedNames.length})
            </h3>
          </div>

          <Suspense fallback={<LoadingNamesGrid count={parseInt(form.watch('count') || '12')} />}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Show generated names */}
              {generatedNames.map((name, index) => (
                <motion.div
                  key={`${name.chinese}-${index}`}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                >
                  <NameCardErrorBoundary>
                    <NameCard
                      name={name}
                      isSelected={selectedName === name.chinese}
                      isLiked={likedNames.has(name.chinese)}
                      onSelect={() => handleSelectName(name.chinese)}
                      onLike={() => handleLikeName(name.chinese)}
                      enableVoicePlayback={false}
                    />
                  </NameCardErrorBoundary>
                </motion.div>
              ))}
              
              {/* Show skeleton cards for remaining slots while generating */}
              {isGenerating && Array.from({ 
                length: Math.max(0, parseInt(form.watch('count') || '12') - generatedNames.length) 
              }, (_, index) => (
                <motion.div
                  key={`skeleton-${generatedNames.length + index}`}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3 }}
                >
                  <DetailedNameCardSkeleton />
                </motion.div>
              ))}
            </div>
          </Suspense>

          {/* Selected Name Summary */}
          {selectedName && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-8 p-6 bg-gradient-to-r from-violet-50 to-purple-50 rounded-xl border border-violet-200 text-center"
            >
              <div className="text-violet-700 font-medium text-lg">
                🎉 Selected Chinese Name: 
                <span className="font-noto-serif text-2xl font-bold text-violet-800 ml-2">
                  {selectedName}
                </span>
              </div>
            </motion.div>
          )}

          {/* Personalized Generator CTA */}
          {generatedNames.length > 0 && !isGenerating && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="mt-8 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200 text-center"
            >
              <div className="text-blue-700 font-medium text-lg mb-4">
                ✨ Want an even more personalized name?
              </div>
              <p className="text-blue-600 text-sm mb-4">
                Our personalized generator creates names based on your English name, personality traits, and preferences
              </p>
              <Button
                onClick={() => window.location.href = '/'}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                Try Personalized Generator
              </Button>
            </motion.div>
          )}
        </motion.div>
      )}

      {/* Empty State */}
      {generatedNames.length === 0 && !isGenerating && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <Shuffle className="h-16 w-16 text-gray-400 mb-6" />
              <h3 className="text-2xl font-medium text-gray-900 mb-3">
                Ready to Generate Names
              </h3>
              <p className="text-gray-500 text-lg mb-6">
                Choose your preferences above and click "Generate Names" to get started
              </p>
              <div className="mt-4 p-4 bg-gradient-to-r from-violet-50 to-purple-50 rounded-xl border border-violet-200">
                <div className="text-sm text-violet-700 mb-3">
                  💡 Want a more personalized experience?
                </div>
                <Button
                  onClick={() => window.location.href = '/'}
                  className="bg-violet-600 hover:bg-violet-700 text-white"
                >
                  Try Our Personalized Generator
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}