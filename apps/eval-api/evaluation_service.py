"""
RAG 评估服务
集成 RAGAS 和 LangSmith 进行 RAG 系统评估
"""
import os
import logging
from typing import List, Dict, Any, Optional
from contextlib import nullcontext

# RAGAS 相关导入
from ragas import evaluate
from ragas.metrics import (
    faithfulness,
    answer_relevancy,
    context_precision,
    context_recall,
)
from datasets import Dataset

# LangSmith 相关导入
from langchain_core.tracers.context import tracing_v2_enabled

from config import (
    LANGCHAIN_API_KEY,
    LANGCHAIN_TRACING_V2,
    LANGCHAIN_PROJECT,
    LANGCHAIN_ENDPOINT,
    OPENAI_API_KEY,
    OPENAI_BASE_URL,
)
from rag_client import rag_client

logger = logging.getLogger(__name__)


class RAGEvaluationService:
    """RAG 评估服务"""
    
    def __init__(self):
        # 配置 OpenAI（RAGAS 需要）
        if OPENAI_API_KEY:
            os.environ["OPENAI_API_KEY"] = OPENAI_API_KEY
            if OPENAI_BASE_URL:
                os.environ["OPENAI_BASE_URL"] = OPENAI_BASE_URL
        
        # 配置 LangSmith（如果启用）
        if LANGCHAIN_TRACING_V2 and LANGCHAIN_API_KEY:
            os.environ["LANGCHAIN_API_KEY"] = LANGCHAIN_API_KEY
            os.environ["LANGCHAIN_TRACING_V2"] = "true"
            os.environ["LANGCHAIN_PROJECT"] = LANGCHAIN_PROJECT
            if LANGCHAIN_ENDPOINT:
                os.environ["LANGCHAIN_ENDPOINT"] = LANGCHAIN_ENDPOINT
            logger.info("LangSmith tracing 已启用")
        else:
            logger.info("LangSmith tracing 未启用（需要配置 LANGCHAIN_API_KEY 和 LANGCHAIN_TRACING_V2）")
    
    def _prepare_evaluation_data(
        self,
        questions: List[str],
        knowledge_base_id: Optional[str] = None,
        ground_truths: Optional[List[str]] = None,
        contexts_list: Optional[List[List[str]]] = None,
    ) -> Dataset:
        """
        准备评估数据
        
        Args:
            questions: 问题列表
            knowledge_base_id: 知识库 ID
            ground_truths: 参考答案列表（可选）
            contexts_list: 上下文列表（可选，如果不提供则从 RAG 服务获取）
        
        Returns:
            RAGAS 格式的 Dataset
        """
        # 如果没有提供上下文，从 RAG 服务获取
        if contexts_list is None:
            contexts_list = []
            for question in questions:
                try:
                    # 检索文档
                    results = rag_client.retrieve(
                        query=question,
                        knowledge_base_id=knowledge_base_id,
                        k=10,
                    )
                    # 提取上下文
                    contexts = [result.get("content", result.get("snippet", "")) for result in results]
                    contexts_list.append(contexts)
                except Exception as e:
                    logger.error(f"检索上下文失败: {str(e)}")
                    contexts_list.append([])
        
        # 如果没有提供参考答案，设置为 None
        if ground_truths is None:
            ground_truths = [None] * len(questions)
        
        # 生成答案
        answers = []
        for question in questions:
            try:
                result = rag_client.query(
                    question=question,
                    knowledge_base_id=knowledge_base_id,
                )
                answers.append(result["answer"])
            except Exception as e:
                logger.error(f"生成答案失败: {str(e)}")
                answers.append("")
        
        # 构建 RAGAS 格式的数据
        data = {
            "question": questions,
            "answer": answers,
            "contexts": contexts_list,
        }
        
        # 如果有参考答案，添加 ground_truth
        if ground_truths and any(gt for gt in ground_truths):
            data["ground_truth"] = ground_truths
        
        return Dataset.from_dict(data)
    
    def evaluate_with_ragas(
        self,
        questions: List[str],
        knowledge_base_id: Optional[str] = None,
        ground_truths: Optional[List[str]] = None,
        contexts_list: Optional[List[List[str]]] = None,
        metrics: Optional[List] = None,
    ) -> Dict[str, Any]:
        """
        使用 RAGAS 进行评估
        
        Args:
            questions: 问题列表
            knowledge_base_id: 知识库 ID
            ground_truths: 参考答案列表（可选）
            contexts_list: 上下文列表（可选）
            metrics: 评估指标列表（可选，默认使用所有指标）
        
        Returns:
            评估结果字典
        """
        try:
            # 准备数据
            dataset = self._prepare_evaluation_data(
                questions=questions,
                knowledge_base_id=knowledge_base_id,
                ground_truths=ground_truths,
                contexts_list=contexts_list,
            )
            
            # 默认评估指标
            if metrics is None:
                metrics = [
                    faithfulness,
                    answer_relevancy,
                    context_precision,
                ]
                # 如果有参考答案，添加 context_recall
                if ground_truths and any(gt for gt in ground_truths):
                    metrics.append(context_recall)
            
            # 执行评估
            logger.info(f"开始 RAGAS 评估，共 {len(questions)} 个问题")
            result = evaluate(
                dataset=dataset,
                metrics=metrics,
            )
            
            # 转换为字典格式
            result_dict = result.to_dict()
            
            # 提取指标摘要
            metrics_summary = {}
            for metric_name, metric_values in result_dict.items():
                if isinstance(metric_values, list):
                    # 计算平均值
                    valid_values = [v for v in metric_values if v is not None]
                    if valid_values:
                        metrics_summary[metric_name] = {
                            "mean": sum(valid_values) / len(valid_values),
                            "min": min(valid_values),
                            "max": max(valid_values),
                            "count": len(valid_values),
                        }
            
            return {
                "success": True,
                "metrics_summary": metrics_summary,
                "detailed_results": result_dict,
                "total_items": len(questions),
            }
        except Exception as e:
            logger.error(f"RAGAS 评估失败: {str(e)}", exc_info=True)
            return {
                "success": False,
                "error": str(e),
                "total_items": len(questions),
            }
    
    def evaluate_single_item(
        self,
        question: str,
        knowledge_base_id: Optional[str] = None,
        ground_truth: Optional[str] = None,
        context_doc_ids: Optional[List[str]] = None,
    ) -> Dict[str, Any]:
        """
        评估单个问题
        
        Args:
            question: 问题
            knowledge_base_id: 知识库 ID
            ground_truth: 参考答案（可选）
            context_doc_ids: 相关文档 ID 列表（用于计算召回率，可选）
        
        Returns:
            评估结果字典
        """
        try:
            # 使用 LangSmith tracing（如果启用）
            with tracing_v2_enabled() if LANGCHAIN_TRACING_V2 else nullcontext():
                # 执行 RAG pipeline
                result = rag_client.query(
                    question=question,
                    knowledge_base_id=knowledge_base_id,
                )
                answer = result["answer"]
                citations = result["citations"]
                
                # 提取上下文
                contexts = [citation.get("snippet", "") for citation in citations]
                
                # 准备评估数据
                data = {
                    "question": [question],
                    "answer": [answer],
                    "contexts": [contexts],
                }
                
                if ground_truth:
                    data["ground_truth"] = [ground_truth]
                
                dataset = Dataset.from_dict(data)
                
                # 选择评估指标
                metrics = [faithfulness, answer_relevancy, context_precision]
                if ground_truth:
                    metrics.append(context_recall)
                
                # 执行评估
                eval_result = evaluate(
                    dataset=dataset,
                    metrics=metrics,
                )
                
                # 提取指标值
                metrics_dict = {}
                result_dict = eval_result.to_dict()
                for metric_name, metric_values in result_dict.items():
                    if isinstance(metric_values, list) and len(metric_values) > 0:
                        metrics_dict[metric_name] = metric_values[0]
                
                return {
                    "success": True,
                    "question": question,
                    "answer": answer,
                    "contexts": contexts,
                    "citations": citations,
                    "metrics": metrics_dict,
                }
        except Exception as e:
            logger.error(f"单项目评估失败: {str(e)}", exc_info=True)
            return {
                "success": False,
                "error": str(e),
                "question": question,
            }
    
    def evaluate_batch(
        self,
        questions: List[str],
        knowledge_base_id: Optional[str] = None,
        ground_truths: Optional[List[str]] = None,
        batch_size: int = 10,
    ) -> List[Dict[str, Any]]:
        """
        批量评估（逐个评估，避免内存问题）
        
        Args:
            questions: 问题列表
            knowledge_base_id: 知识库 ID
            ground_truths: 参考答案列表（可选）
            batch_size: 批处理大小（暂未使用，逐个处理）
        
        Returns:
            评估结果列表
        """
        results = []
        total = len(questions)
        
        for i, question in enumerate(questions):
            logger.info(f"评估进度: {i+1}/{total}")
            ground_truth = ground_truths[i] if ground_truths and i < len(ground_truths) else None
            
            result = self.evaluate_single_item(
                question=question,
                knowledge_base_id=knowledge_base_id,
                ground_truth=ground_truth,
            )
            results.append(result)
        
        return results


# 创建全局评估服务实例
evaluation_service = RAGEvaluationService()

