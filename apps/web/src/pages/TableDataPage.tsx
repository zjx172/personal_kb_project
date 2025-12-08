import React, { useEffect, useState, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DataSource,
  getDataSource,
  getDataSourceData,
  DataSourceDataResponse,
} from "../api";
import { useAuth } from "../contexts/AuthContext";
import {
  Loader2,
  ArrowLeft,
  Database,
  FileSpreadsheet,
  Filter,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";

const TableDataPage: React.FC = () => {
  const navigate = useNavigate();
  const { knowledgeBaseId, dataSourceId } = useParams<{
    knowledgeBaseId: string;
    dataSourceId: string;
  }>();
  const { user, loading: authLoading } = useAuth();
  const [dataSource, setDataSource] = useState<DataSource | null>(null);
  const [loading, setLoading] = useState(true);
  const [tableDataResponse, setTableDataResponse] =
    useState<DataSourceDataResponse | null>(null);
  const [loadingData, setLoadingData] = useState(false);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/login");
      return;
    }
    if (user && dataSourceId) {
      loadDataSource();
    }
  }, [user, authLoading, dataSourceId, navigate]);

  const loadDataSource = async () => {
    if (!dataSourceId) return;
    setLoading(true);
    try {
      const data = await getDataSource(dataSourceId);
      setDataSource(data);
    } catch (error: any) {
      console.error("加载数据源失败:", error);
      toast.error(error?.response?.data?.detail || "加载数据源失败");
      navigate(-1);
    } finally {
      setLoading(false);
    }
  };

  // 从后端加载表格数据
  const loadTableData = async () => {
    if (!dataSourceId) return;
    setLoadingData(true);
    try {
      const response = await getDataSourceData(dataSourceId, {
        filters: Object.keys(filters).length > 0 ? filters : undefined,
        page: currentPage,
        page_size: pageSize,
      });
      setTableDataResponse(response);
    } catch (error: any) {
      console.error("加载表格数据失败:", error);
      toast.error(error?.response?.data?.detail || "加载表格数据失败");
    } finally {
      setLoadingData(false);
    }
  };

  // 当数据源、筛选条件、分页设置变化时，重新加载数据
  useEffect(() => {
    if (dataSource && dataSourceId) {
      loadTableData();
    }
  }, [dataSource, filters, currentPage, pageSize, dataSourceId]);

  // 当筛选条件变化时，重置到第一页
  useEffect(() => {
    setCurrentPage(1);
  }, [filters]);

  // 从响应中获取数据
  const tableData = tableDataResponse?.data || [];
  const columns = tableDataResponse?.columns || [];
  const total = tableDataResponse?.total || 0;
  const totalPages = tableDataResponse?.total_pages || 1;

  // 获取每列的唯一值（用于下拉选择）- 从当前数据中提取
  // 注意：这只能获取当前页的唯一值，如果需要所有数据的唯一值，需要额外的API
  const columnUniqueValues = useMemo(() => {
    const uniqueValues: Record<string, Set<string>> = {};
    columns.forEach((col) => {
      const values = new Set<string>();
      tableData.forEach((row) => {
        const value = String(row[col] || "").trim();
        if (value) {
          values.add(value);
        }
      });
      uniqueValues[col] = values;
    });
    return uniqueValues;
  }, [tableData, columns]);

  const config = dataSource?.config || {};

  if (authLoading || loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!dataSource) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">数据源不存在</p>
          <Button onClick={() => navigate(-1)}>返回</Button>
        </div>
      </div>
    );
  }

  const handleFilterChange = (column: string, value: string) => {
    setFilters((prev) => {
      // 使用 "__all__" 作为"全部"的特殊值，因为 Select 不允许空字符串
      if (!value.trim() || value === "__all__") {
        const newFilters = { ...prev };
        delete newFilters[column];
        return newFilters;
      }
      return { ...prev, [column]: value };
    });
  };

  const clearAllFilters = () => {
    setFilters({});
  };

  const activeFilterCount = Object.keys(filters).filter((key) =>
    filters[key]?.trim()
  ).length;

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* 头部 */}
      <div className="border-b bg-card px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
              className="h-8 w-8"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-3">
              {dataSource.type === "database" ? (
                <Database className="h-5 w-5 text-primary" />
              ) : (
                <FileSpreadsheet className="h-5 w-5 text-primary" />
              )}
              <div>
                <h1 className="text-xl font-semibold">{dataSource.name}</h1>
                <p className="text-sm text-muted-foreground">
                  {dataSource.type === "database" ? "数据库" : "Excel"}
                  {config.type === "manual_table" && " (手动创建)"}
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-sm text-muted-foreground">
              显示 {Math.min((currentPage - 1) * pageSize + 1, total)}-
              {Math.min(currentPage * pageSize, total)} / 共 {total} 行，
              {columns.length} 列
              {activeFilterCount > 0 && (
                <span className="ml-2 text-primary">（已筛选）</span>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="h-4 w-4 mr-2" />
              筛选
              {activeFilterCount > 0 && (
                <span className="ml-2 bg-primary text-primary-foreground rounded-full px-2 py-0.5 text-xs">
                  {activeFilterCount}
                </span>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* 筛选面板 */}
      {showFilters && columns.length > 0 && (
        <div className="border-b bg-muted/30 px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold">筛选条件</h3>
            <div className="flex items-center gap-2">
              {activeFilterCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearAllFilters}
                  className="h-7 text-xs"
                >
                  <X className="h-3 w-3 mr-1" />
                  清除全部
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowFilters(false)}
                className="h-7"
              >
                收起
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {columns.map((column) => {
              const uniqueValues = Array.from(columnUniqueValues[column] || [])
                .sort()
                .slice(0, 100); // 限制最多显示100个选项
              const hasManyValues = columnUniqueValues[column]?.size > 100;

              return (
                <div key={column} className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">
                    {column}
                  </label>
                  {uniqueValues.length > 0 && uniqueValues.length <= 20 ? (
                    // 如果唯一值较少，使用下拉选择
                    <Select
                      value={filters[column] || "__all__"}
                      onValueChange={(value) =>
                        handleFilterChange(column, value)
                      }
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder={`选择 ${column}`} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__all__">全部</SelectItem>
                        {uniqueValues.map((value) => (
                          <SelectItem key={value} value={value}>
                            {value}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    // 如果唯一值较多，使用输入框搜索
                    <Input
                      placeholder={`搜索 ${column}...`}
                      value={filters[column] || ""}
                      onChange={(e) =>
                        handleFilterChange(column, e.target.value)
                      }
                      className="h-9"
                    />
                  )}
                  {hasManyValues && (
                    <p className="text-xs text-muted-foreground">
                      共 {columnUniqueValues[column]?.size} 个不同值
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 表格内容 */}
      <div className="flex-1 overflow-auto p-6">
        {loadingData ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : tableData.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <p className="text-muted-foreground mb-2">
                {config.type === "manual_table"
                  ? "暂无数据"
                  : dataSource.type === "database"
                    ? "数据库连接未配置或未查询数据"
                    : "Excel 文件未解析或为空"}
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="border rounded-lg overflow-x-auto bg-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    {columns.map((column, index) => (
                      <TableHead
                        key={index}
                        className="min-w-[150px] bg-muted/50 sticky top-0 z-10"
                      >
                        {column}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tableData.map((row, rowIndex) => (
                    <TableRow key={rowIndex}>
                      {columns.map((column, colIndex) => (
                        <TableCell key={colIndex} className="max-w-[300px]">
                          <div
                            className="truncate"
                            title={String(row[column] || "")}
                          >
                            {String(row[column] || "")}
                          </div>
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {/* 分页控件 */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <div className="text-sm text-muted-foreground">
                  第 {currentPage} / {totalPages} 页
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1 || loadingData}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    上一页
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setCurrentPage((p) => Math.min(totalPages, p + 1))
                    }
                    disabled={currentPage === totalPages || loadingData}
                  >
                    下一页
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default TableDataPage;
