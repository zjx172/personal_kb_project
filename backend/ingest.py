import os
from pathlib import Path

from langchain_community.document_loaders import PyPDFLoader, UnstructuredHTMLLoader, TextLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_chroma import Chroma
from langchain_openai import OpenAIEmbeddings

from config import DOCS_DIR, VECTOR_STORE_DIR, COLLECTION_NAME, OPENAI_API_KEY, OPENAI_BASE_URL


def load_documents():
    docs = []
    root = Path(DOCS_DIR)
    for path in root.rglob("*"):
        suf = path.suffix.lower()
        if suf not in [".pdf", ".html", ".htm", ".md"]:
            continue

        print(f"[*] 加载文档: {path}")

        if suf == ".pdf":
            loader = PyPDFLoader(str(path))
        elif suf in [".html", ".htm"]:
            loader = UnstructuredHTMLLoader(str(path))
        else:
            loader = TextLoader(str(path), autodetect_encoding=True)

        file_docs = loader.load()
        for d in file_docs:
            d.metadata.setdefault("source", str(path))
        docs.extend(file_docs)
    return docs


def split_documents(documents):
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=800,
        chunk_overlap=100,
        separators=["\n\n", "\n", ". ", "。", " ", ""],
    )
    return splitter.split_documents(documents)


def build_vector_store():
    os.makedirs(VECTOR_STORE_DIR, exist_ok=True)
    documents = load_documents()
    if not documents:
        print(f"[!] 在 {DOCS_DIR} 下没有找到可用文档（.pdf/.html/.md）")
        return
    print(f"[*] 原始文档数量: {len(documents)}")
    chunks = split_documents(documents)
    print(f"[*] 切分后的 chunk 数量: {len(chunks)}")


    embeddings = OpenAIEmbeddings(
        api_key=OPENAI_API_KEY,
        base_url=OPENAI_BASE_URL,
        model="text-embedding-3-large",
    )

    vectordb = Chroma(
        collection_name=COLLECTION_NAME,
        embedding_function=embeddings,
        persist_directory=VECTOR_STORE_DIR,
    )

    vectordb.add_documents(chunks)
    vectordb.persist()
    print("[*] 向量库构建完成，已持久化到磁盘。")


if __name__ == "__main__":
    build_vector_store()
