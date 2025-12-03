import React, { useState } from "react";
import { Collapse, Select, DatePicker, Tag, Button } from "@arco-design/web-react";
import { IconDown, IconUp } from "@arco-design/web-react/icon";

const CollapseItem = Collapse.Item;
const Option = Select.Option;

export interface SearchFilterOptions {
  doc_type?: string;
  tags?: string[];
  start_date?: string;
  end_date?: string;
  use_keyword_search?: boolean;
}

interface SearchFiltersProps {
  onFilterChange: (filters: SearchFilterOptions) => void;
  availableTags?: string[];
  availableDocTypes?: string[];
}

export const SearchFilters: React.FC<SearchFiltersProps> = ({
  onFilterChange,
  availableTags = [],
  availableDocTypes = [],
}) => {
  const [filters, setFilters] = useState<SearchFilterOptions>({});
  const [expanded, setExpanded] = useState(false);

  const handleFilterChange = (key: keyof SearchFilterOptions, value: any) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const clearFilters = () => {
    setFilters({});
    onFilterChange({});
  };

  return (
    <div className="mb-4">
      <Collapse
        activeKey={expanded ? ["filters"] : []}
        onChange={(keys) => setExpanded(keys.includes("filters"))}
        expandIconPosition="right"
      >
        <CollapseItem
          header={
            <div className="flex items-center justify-between w-full">
              <span className="text-sm font-medium">高级搜索</span>
              {(filters.doc_type || filters.tags?.length || filters.start_date || filters.end_date) && (
                <Tag color="blue" size="small">
                  已启用
                </Tag>
              )}
            </div>
          }
          name="filters"
        >
          <div className="space-y-4 pt-2">
            {/* 文档类型过滤 */}
            {availableDocTypes.length > 0 && (
              <div>
                <label className="text-sm text-gray-600 mb-1 block">文档类型</label>
                <Select
                  placeholder="选择文档类型"
                  value={filters.doc_type}
                  onChange={(value) => handleFilterChange("doc_type", value)}
                  allowClear
                  style={{ width: "100%" }}
                >
                  {availableDocTypes.map((type) => (
                    <Option key={type} value={type}>
                      {type}
                    </Option>
                  ))}
                </Select>
              </div>
            )}

            {/* 标签过滤 */}
            {availableTags.length > 0 && (
              <div>
                <label className="text-sm text-gray-600 mb-1 block">标签</label>
                <Select
                  mode="multiple"
                  placeholder="选择标签"
                  value={filters.tags}
                  onChange={(value) => handleFilterChange("tags", value)}
                  allowClear
                  style={{ width: "100%" }}
                >
                  {availableTags.map((tag) => (
                    <Option key={tag} value={tag}>
                      {tag}
                    </Option>
                  ))}
                </Select>
              </div>
            )}

            {/* 日期范围过滤 */}
            <div>
              <label className="text-sm text-gray-600 mb-1 block">创建时间</label>
              <div className="flex gap-2">
                <DatePicker
                  placeholder="开始日期"
                  value={filters.start_date}
                  onChange={(date, dateString) =>
                    handleFilterChange("start_date", dateString || undefined)
                  }
                  style={{ flex: 1 }}
                />
                <DatePicker
                  placeholder="结束日期"
                  value={filters.end_date}
                  onChange={(date, dateString) =>
                    handleFilterChange("end_date", dateString || undefined)
                  }
                  style={{ flex: 1 }}
                />
              </div>
            </div>

            {/* 搜索模式 */}
            <div>
              <label className="text-sm text-gray-600 mb-1 block">搜索模式</label>
              <Select
                placeholder="选择搜索模式"
                value={filters.use_keyword_search ? "keyword" : "vector"}
                onChange={(value) =>
                  handleFilterChange("use_keyword_search", value === "keyword")
                }
                style={{ width: "100%" }}
              >
                <Option value="vector">向量搜索（语义理解）</Option>
                <Option value="keyword">关键词搜索</Option>
              </Select>
            </div>

            {/* 清除按钮 */}
            {(filters.doc_type || filters.tags?.length || filters.start_date || filters.end_date) && (
              <Button type="outline" size="small" onClick={clearFilters}>
                清除所有过滤条件
              </Button>
            )}
          </div>
        </CollapseItem>
      </Collapse>
    </div>
  );
};

