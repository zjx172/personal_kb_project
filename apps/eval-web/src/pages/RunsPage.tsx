import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Eye, CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react'
import { evaluationApi, EvaluationRun } from '../api'

export default function RunsPage() {
  const [runs, setRuns] = useState<EvaluationRun[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadRuns()
    // 如果有关运行中的任务，定期刷新
    const interval = setInterval(() => {
      const hasRunning = runs.some(r => r.status === 'running' || r.status === 'pending')
      if (hasRunning) {
        loadRuns()
      }
    }, 3000)
    return () => clearInterval(interval)
  }, [])

  const loadRuns = async () => {
    try {
      setLoading(true)
      const data = await evaluationApi.listRuns()
      setRuns(data)
    } catch (error) {
      console.error('加载运行记录失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-600" />
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-600" />
      case 'running':
        return <Clock className="w-5 h-5 text-blue-600 animate-spin" />
      case 'pending':
        return <Clock className="w-5 h-5 text-yellow-600" />
      default:
        return <AlertCircle className="w-5 h-5 text-gray-600" />
    }
  }

  const getStatusText = (status: string) => {
    const statusMap: { [key: string]: string } = {
      completed: '已完成',
      failed: '失败',
      running: '运行中',
      pending: '等待中',
    }
    return statusMap[status] || status
  }

  if (loading) {
    return <div className="text-center py-8">加载中...</div>
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">评估运行</h2>
      </div>

      {runs.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          还没有评估运行记录
        </div>
      ) : (
        <div className="grid gap-4">
          {runs.map((run) => (
            <div
              key={run.id}
              className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    {getStatusIcon(run.status)}
                    <span className="font-semibold text-gray-900">
                      {getStatusText(run.status)}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600 mb-2">
                    知识库 ID: {run.knowledge_base_id}
                  </div>
                  <div className="text-sm text-gray-600 mb-2">
                    数据集 ID: {run.dataset_id}
                  </div>
                  <div className="text-sm text-gray-500">
                    进度: {run.completed_items} / {run.total_items}
                  </div>
                  {run.metrics && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <div className="text-sm font-medium text-gray-700 mb-2">评估指标：</div>
                      <div className="grid grid-cols-2 gap-2">
                        {Object.entries(run.metrics).map(([key, value]) => (
                          <div key={key} className="text-sm">
                            <span className="text-gray-600">{key}:</span>{' '}
                            <span className="font-semibold">
                              {(value.mean * 100).toFixed(1)}%
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {run.error_message && (
                    <div className="mt-2 text-sm text-red-600">
                      错误: {run.error_message}
                    </div>
                  )}
                  <div className="text-xs text-gray-400 mt-2">
                    创建时间: {new Date(run.created_at).toLocaleString()}
                  </div>
                </div>
                <Link
                  to={`/runs/${run.id}`}
                  className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                  title="查看详情"
                >
                  <Eye className="w-5 h-5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

