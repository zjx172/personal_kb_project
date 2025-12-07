import React from "react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Bold,
  Italic,
  Strikethrough,
  Code,
  List,
  ListOrdered,
  Quote,
  Link as LinkIcon,
  Eye,
  Edit,
  SplitSquareHorizontal,
  Highlighter,
  Heading1,
} from "lucide-react";

interface MarkdownToolbarProps {
  viewMode: "edit" | "preview" | "both";
  onViewModeChange: (mode: "edit" | "preview" | "both") => void;
  onFormat: (type: string) => void;
}

export const MarkdownToolbar: React.FC<MarkdownToolbarProps> = ({
  viewMode,
  onViewModeChange,
  onFormat,
}) => {
  return (
    <TooltipProvider>
      <div className="border-b bg-card px-4 py-2 flex items-center gap-2 flex-shrink-0">
        <div className="flex items-center gap-1 border-r pr-2 mr-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onFormat("bold")}
                className="h-8 w-8 p-0"
              >
                <Bold className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>粗体</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onFormat("italic")}
                className="h-8 w-8 p-0"
              >
                <Italic className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>斜体</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onFormat("strikethrough")}
                className="h-8 w-8 p-0"
              >
                <Strikethrough className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>删除线</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onFormat("code")}
                className="h-8 w-8 p-0"
              >
                <Code className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>行内代码</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onFormat("highlight")}
                className="h-8 w-8 p-0"
              >
                <Highlighter className="h-4 w-4 text-yellow-600" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>高亮</TooltipContent>
          </Tooltip>
        </div>
        <div className="flex items-center gap-1 border-r pr-2 mr-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onFormat("heading")}
                className="h-8 w-8 p-0"
              >
                <Heading1 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>标题</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onFormat("quote")}
                className="h-8 w-8 p-0"
              >
                <Quote className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>引用</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onFormat("ul")}
                className="h-8 w-8 p-0"
              >
                <List className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>无序列表</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onFormat("ol")}
                className="h-8 w-8 p-0"
              >
                <ListOrdered className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>有序列表</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onFormat("link")}
                className="h-8 w-8 p-0"
              >
                <LinkIcon className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>链接</TooltipContent>
          </Tooltip>
        </div>
        <div className="flex items-center gap-1 ml-auto">
          <Tabs
            value={viewMode}
            onValueChange={(v) =>
              onViewModeChange(v as "edit" | "preview" | "both")
            }
          >
            <TabsList>
              <TabsTrigger value="edit" className="gap-2">
                <Edit className="h-4 w-4" />
                编辑
              </TabsTrigger>
              <TabsTrigger value="preview" className="gap-2">
                <Eye className="h-4 w-4" />
                预览
              </TabsTrigger>
              <TabsTrigger value="both" className="gap-2">
                <SplitSquareHorizontal className="h-4 w-4" />
                分屏
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>
    </TooltipProvider>
  );
};
