"use client";

import { useState, useEffect } from "react";
import { useUser } from "@/hooks/use-user";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Heart, Star, Eye, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";

interface SavedName {
  id: string;
  chinese_name: string;
  pinyin: string;
  meaning: string;
  cultural_notes: string;
  personality_match: string;
  characters: Array<{
    character: string;
    pinyin: string;
    meaning: string;
    explanation: string;
  }>;
  is_selected: boolean;
  is_favorite: boolean;
  created_at: string;
}

export function MyNamesCard() {
  const { user } = useUser();
  const { toast } = useToast();
  const [savedNames, setSavedNames] = useState<SavedName[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchSavedNames();
    }
  }, [user]);

  const fetchSavedNames = async () => {
    try {
      const response = await fetch('/api/saved-names');
      if (response.ok) {
        const data = await response.json();
        setSavedNames(data.names || []);
      }
    } catch (error) {
      console.error('Failed to fetch saved names:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectName = async (nameId: string) => {
    try {
      const response = await fetch(`/api/saved-names/${nameId}/select`, {
        method: 'POST',
      });

      if (response.ok) {
        setSavedNames(names => 
          names.map(name => ({
            ...name,
            is_selected: name.id === nameId
          }))
        );
        toast({
          title: "Name selected!",
          description: "This is now your chosen Chinese name.",
        });
      }
    } catch (error) {
      console.error('Failed to select name:', error);
      toast({
        title: "Failed to select name",
        description: "Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteName = async (nameId: string) => {
    try {
      const response = await fetch(`/api/saved-names/${nameId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setSavedNames(names => names.filter(name => name.id !== nameId));
        toast({
          title: "Name deleted",
          description: "The name has been removed from your collection.",
        });
      }
    } catch (error) {
      console.error('Failed to delete name:', error);
      toast({
        title: "Failed to delete name",
        description: "Please try again.",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5" />
            My Chinese Names
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-pulse text-muted-foreground">Loading your names...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (savedNames.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5" />
            My Chinese Names
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 space-y-4">
            <div className="text-muted-foreground">No saved names yet</div>
            <Button onClick={() => window.location.href = '/'}>
              Generate Your First Name
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Heart className="h-5 w-5" />
          My Chinese Names ({savedNames.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4 max-h-96 overflow-y-auto">
          {savedNames.map((name, index) => (
            <motion.div
              key={name.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`border rounded-lg p-4 space-y-3 ${
                name.is_selected ? 'border-primary bg-primary/5' : 'border-border'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-serif text-lg font-semibold text-primary">
                      {name.chinese_name}
                    </h3>
                    {name.is_selected && (
                      <Badge variant="default" className="text-xs">
                        <Star className="h-3 w-3 mr-1" />
                        Selected
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{name.pinyin}</p>
                </div>
                <div className="flex items-center gap-1">
                  {!name.is_selected && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSelectName(name.id)}
                      className="h-8 w-8 p-0"
                    >
                      <Star className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteName(name.id)}
                    className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-2 text-sm">
                <div>
                  <span className="font-medium text-foreground">Meaning: </span>
                  <span className="text-muted-foreground">{name.meaning}</span>
                </div>
                {name.personality_match && (
                  <div>
                    <span className="font-medium text-foreground">Why it suits you: </span>
                    <span className="text-muted-foreground">
                      {name.personality_match.length > 100 
                        ? `${name.personality_match.substring(0, 100)}...` 
                        : name.personality_match
                      }
                    </span>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between pt-2 border-t">
                <div className="text-xs text-muted-foreground">
                  Created {new Date(name.created_at).toLocaleDateString()}
                </div>
                <Button variant="ghost" size="sm" className="text-xs">
                  <Eye className="h-3 w-3 mr-1" />
                  View Details
                </Button>
              </div>
            </motion.div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}