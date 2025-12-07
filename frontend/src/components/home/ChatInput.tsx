import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Square, Loader2 } from "lucide-react";

interface ChatInputProps {
  query: string;
  querying: boolean;
  onQueryChange: (value: string) => void;
  onQuery: () => void;
  onStop: () => void;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  query,
  querying,
  onQueryChange,
  onQuery,
  onStop,
}) => {
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onQuery();
    }
  };

  return (
    <div className="border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="w-full max-w-4xl mx-auto px-4 py-4">
        <div className="relative group">
          <Input
            placeholder="问任何问题, /提示"
            value={query}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              onQueryChange(e.target.value)
            }
            onKeyPress={handleKeyPress}
            className="pl-4 pr-24 h-12 text-base focus-visible:shadow-md focus-visible:shadow-primary/10"
            disabled={querying}
          />
          <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center gap-2">
            {querying && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onStop}
                className="h-8"
              >
                <Square className="h-4 w-4 mr-1" />
                停止生成
              </Button>
            )}
            <Button
              onClick={onQuery}
              disabled={querying || !query.trim()}
              size="sm"
              className="h-8"
            >
              {querying ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
